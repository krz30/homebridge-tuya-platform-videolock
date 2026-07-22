import { describe, expect, jest, test } from '@jest/globals';
import { TuyaStreamingDelegate } from '../src/util/TuyaStreamDelegate';

function createDelegate() {
  const delegate = Object.create(TuyaStreamingDelegate.prototype) as {
    camera: unknown;
    snapshotCache?: { buffer: Buffer; createdAt: number };
    snapshotPromise?: Promise<Buffer>;
    fetchSnapshot: jest.Mock<() => Promise<Buffer>>;
    snapshotRequest: () => Promise<Buffer>;
    getSnapshot: (forceRefresh?: boolean) => Promise<Buffer>;
  };

  delegate.camera = {
    log: {
      debug: jest.fn(),
      warn: jest.fn(),
    },
  };
  delegate.fetchSnapshot = jest.fn<() => Promise<Buffer>>();
  return delegate;
}

describe('TuyaStreamingDelegate snapshot cache', () => {
  test('deduplicates concurrent snapshot requests', async () => {
    const delegate = createDelegate();
    let resolveSnapshot!: (buffer: Buffer) => void;
    delegate.fetchSnapshot.mockReturnValue(new Promise(resolve => {
      resolveSnapshot = resolve;
    }));

    const first = delegate.getSnapshot();
    const second = delegate.getSnapshot();
    resolveSnapshot(Buffer.from('snapshot'));

    await expect(first).resolves.toEqual(Buffer.from('snapshot'));
    await expect(second).resolves.toEqual(Buffer.from('snapshot'));
    expect(delegate.fetchSnapshot).toHaveBeenCalledTimes(1);
  });

  test('serves a fresh cached snapshot without opening a stream', async () => {
    const delegate = createDelegate();
    delegate.snapshotCache = {
      buffer: Buffer.from('cached'),
      createdAt: Date.now(),
    };

    await expect(delegate.getSnapshot()).resolves.toEqual(Buffer.from('cached'));
    expect(delegate.fetchSnapshot).not.toHaveBeenCalled();
  });

  test('falls back to a recent cached snapshot after refresh failure', async () => {
    const delegate = createDelegate();
    delegate.snapshotCache = {
      buffer: Buffer.from('fallback'),
      createdAt: Date.now() - 60 * 1000,
    };
    delegate.fetchSnapshot.mockRejectedValue(new Error('cloud unavailable'));

    await expect(delegate.getSnapshot(true)).resolves.toEqual(Buffer.from('fallback'));
  });

  test('serves a stale snapshot immediately while refreshing in the background', async () => {
    const delegate = createDelegate();
    delegate.snapshotCache = {
      buffer: Buffer.from('stale'),
      createdAt: Date.now() - 60 * 1000,
    };
    let resolveSnapshot!: (buffer: Buffer) => void;
    delegate.fetchSnapshot.mockReturnValue(new Promise(resolve => {
      resolveSnapshot = resolve;
    }));

    await expect(delegate.getSnapshot()).resolves.toEqual(Buffer.from('stale'));
    expect(delegate.fetchSnapshot).toHaveBeenCalledTimes(1);
    const refresh = delegate.snapshotPromise!;
    resolveSnapshot(Buffer.from('refreshed'));
    await expect(refresh).resolves.toEqual(Buffer.from('refreshed'));
  });

  test('does not serve a cache entry older than five minutes', async () => {
    const delegate = createDelegate();
    delegate.snapshotCache = {
      buffer: Buffer.from('expired'),
      createdAt: Date.now() - 6 * 60 * 1000,
    };
    delegate.fetchSnapshot.mockRejectedValue(new Error('cloud unavailable'));

    await expect(delegate.getSnapshot(true)).rejects.toThrow('cloud unavailable');
  });
});
