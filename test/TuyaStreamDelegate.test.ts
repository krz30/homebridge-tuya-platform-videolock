import { describe, expect, jest, test } from '@jest/globals';
import { resolveCameraMaxFPS, TuyaStreamingDelegate } from '../src/util/TuyaStreamDelegate';

describe('resolveCameraMaxFPS', () => {
  test.each([
    [undefined, 15],
    [15, 15],
    [30, 30],
    [60, 15],
    ['30', 15],
  ])('resolves %p to %i fps', (configured, expected) => {
    expect(resolveCameraMaxFPS(configured)).toBe(expected);
  });
});

function createDelegate() {
  const delegate = Object.create(TuyaStreamingDelegate.prototype) as {
    camera: unknown;
    snapshotPromise?: Promise<Buffer>;
    fetchSnapshot: jest.Mock<() => Promise<Buffer>>;
    snapshotRequest: () => Promise<Buffer>;
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

describe('TuyaStreamingDelegate snapshot requests', () => {
  test('deduplicates concurrent snapshot requests', async () => {
    const delegate = createDelegate();
    let resolveSnapshot!: (buffer: Buffer) => void;
    delegate.fetchSnapshot.mockReturnValue(new Promise(resolve => {
      resolveSnapshot = resolve;
    }));

    const first = delegate.snapshotRequest();
    const second = delegate.snapshotRequest();
    resolveSnapshot(Buffer.from('snapshot'));

    await expect(first).resolves.toEqual(Buffer.from('snapshot'));
    await expect(second).resolves.toEqual(Buffer.from('snapshot'));
    expect(delegate.fetchSnapshot).toHaveBeenCalledTimes(1);
  });

  test('requests a new frame after the concurrent request finishes', async () => {
    const delegate = createDelegate();
    delegate.fetchSnapshot
      .mockResolvedValueOnce(Buffer.from('first'))
      .mockResolvedValueOnce(Buffer.from('second'));

    await expect(delegate.snapshotRequest()).resolves.toEqual(Buffer.from('first'));
    await expect(delegate.snapshotRequest()).resolves.toEqual(Buffer.from('second'));
    expect(delegate.fetchSnapshot).toHaveBeenCalledTimes(2);
  });
});
