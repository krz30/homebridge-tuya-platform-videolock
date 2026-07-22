/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable max-len */

import {
  AudioStreamingCodecType,
  AudioStreamingSamplerate,
  CameraController,
  CameraControllerOptions,
  CameraRecordingOptions,
  CameraStreamingDelegate,
  CameraStreamingOptions,
  EventTriggerOption,
  HAP,
  H264Level,
  H264Profile,
  MediaContainerType,
  PrepareStreamCallback,
  PrepareStreamRequest,
  Resolution,
  SnapshotRequest,
  SnapshotRequestCallback,
  SRTPCryptoSuites,
  StreamingRequest,
  StreamRequestCallback,
  PrepareStreamResponse,
  StartStreamRequest,
} from 'homebridge';

import {
  defaultFfmpegPath,
  reservePorts,
} from '@homebridge/camera-utils';

import BaseAccessory from '../accessory/BaseAccessory';

import {
  TuyaRecordingDelegate,
} from './TuyaRecordingDelegate';
import { spawn } from 'child_process';
import { createSocket, Socket } from 'dgram';
import { FfmpegStreamingProcess, StreamingDelegate as FfmpegStreamingDelegate } from './FfmpegStreamingProcess';

interface SessionInfo {
    address: string; // address of the HAP controller
    addressVersion: 'ipv4' | 'ipv6';

    videoPort: number;
    videoIncomingPort: number;
    videoCryptoSuite: SRTPCryptoSuites; // should be saved if multiple suites are supported
    videoSRTP: Buffer; // key and salt concatenated
    videoSSRC: number; // rtp synchronisation source

    audioPort: number;
    audioIncomingPort: number;
    audioCryptoSuite: SRTPCryptoSuites;
    audioSRTP: Buffer;
    audioSSRC: number;

    preparedAt: number;
    rtspUrlPromise: Promise<{ url: string } | { error: Error }>;
}

type ActiveSession = {
    mainProcess?: FfmpegStreamingProcess;
    returnProcess?: FfmpegStreamingProcess;
    timeout?: NodeJS.Timeout;
    socket?: Socket;
};

/*
interface SampleRateEntry {
    type: AudioRecordingCodecType;
    bitrateMode: number;
    samplerate: AudioRecordingSamplerate[];
    audioChannels: number;
}
*/

export class TuyaStreamingDelegate implements CameraStreamingDelegate, FfmpegStreamingDelegate {
  public readonly controller: CameraController;

  private pendingSessions: { [index: string]: SessionInfo } = {};
  private ongoingSessions: { [index: string]: ActiveSession } = {};

  private snapshotCache?: { buffer: Buffer; createdAt: number };
  private snapshotPromise?: Promise<Buffer>;

  private static readonly SNAPSHOT_CACHE_MAX_AGE = 30 * 1000;
  private static readonly SNAPSHOT_STALE_MAX_AGE = 5 * 60 * 1000;
  private static readonly SNAPSHOT_TIMEOUT = 12 * 1000;

  private readonly camera: BaseAccessory;
  private readonly hap: HAP;
  constructor(camera: BaseAccessory) {
    this.camera = camera;
    this.hap = camera.platform.api.hap;

    // this.recordingDelegate = new TuyaRecordingDelegate();

    const resolutions: Resolution[] = [
      [320, 180, 15],
      [320, 240, 15],
      [480, 270, 15],
      [480, 360, 15],
      [640, 360, 15],
      [640, 480, 15],
      [1280, 720, 15],
      [1280, 960, 15],
      [1920, 1080, 15],
      [1600, 1200, 15],
    ];

    const streamingOptions: CameraStreamingOptions = {
      supportedCryptoSuites: [SRTPCryptoSuites.AES_CM_128_HMAC_SHA1_80],
      video: {
        codec: {
          profiles: [H264Profile.BASELINE, H264Profile.MAIN, H264Profile.HIGH],
          levels: [H264Level.LEVEL3_1, H264Level.LEVEL3_2, H264Level.LEVEL4_0],
        },
        resolutions: resolutions,
      },
      audio: {
        twoWayAudio: false,
        codecs: [
          {
            type: AudioStreamingCodecType.AAC_ELD,
            samplerate: AudioStreamingSamplerate.KHZ_16,
          },
        ],
      },
    };

    const recordingOptions: CameraRecordingOptions = {
      overrideEventTriggerOptions: [
        EventTriggerOption.MOTION,
        EventTriggerOption.DOORBELL,
      ],
      prebufferLength: 4 * 1000, // prebufferLength always remains 4s ?
      mediaContainerConfiguration: [
        {
          type: MediaContainerType.FRAGMENTED_MP4,
          fragmentLength: 4000,
        },
      ],
      video: {
        parameters: {
          profiles: [
            H264Profile.BASELINE,
            H264Profile.MAIN,
            H264Profile.HIGH,
          ],
          levels: [
            H264Level.LEVEL3_1,
            H264Level.LEVEL3_2,
            H264Level.LEVEL4_0,
          ],
        },
        resolutions: resolutions,
        type: this.hap.VideoCodecType.H264,
      },
      audio: {
        codecs: [
          {
            samplerate: this.hap.AudioRecordingSamplerate.KHZ_32,
            type: this.hap.AudioRecordingCodecType.AAC_LC,
          },
        ],
      },
    };

    const options: CameraControllerOptions = {
      delegate: this,
      streamingOptions: streamingOptions,
      // recording: {
      // options: recordingOptions,
      // delegate: this.recordingDelegate
      // }
    };

    this.controller = new this.hap.CameraController(options);
  }

  stopStream(sessionId: string): void {
    const session = this.ongoingSessions[sessionId];

    if (session) {
      if (session.timeout) {
        clearTimeout(session.timeout);
      }

      try {
        session.socket?.close();
      } catch (error) {
        this.camera.log.error(`Error occurred closing socket: ${error}`);
      }

      try {
        session.mainProcess?.stop();
      } catch (error) {
        this.camera.log.error(`Error occurred terminating main FFmpeg process: ${error}`);
      }

      try {
        session.returnProcess?.stop();
      } catch (error) {
        this.camera.log.error(`Error occurred terminating two-way FFmpeg process: ${error}`);
      }

      delete this.ongoingSessions[sessionId];

      this.camera.log.info('Stopped video stream.');
    }
  }

  forceStopStream(sessionId: string) {
    this.controller.forceStopStreamingSession(sessionId);
  }

  async handleSnapshotRequest(
    request: SnapshotRequest,
    callback: SnapshotRequestCallback,
  ) {
    try {
      this.camera.log.debug(`Snapshot requested: ${request.width} x ${request.height}`);

      const snapshot = await this.getSnapshot();

      this.camera.log.debug('Sending snapshot');

      callback(undefined, snapshot);
    } catch (error) {
      callback(error as Error);
    }
  }

  /**
   * Starts fetching a fresh frame before HomeKit asks for the doorbell preview.
   * A concurrent HomeKit snapshot request reuses this same promise.
   */
  prewarmSnapshot() {
    if (!this.camera.device.online) {
      return;
    }

    void this.getSnapshot(true)
      .then(() => this.camera.log.debug('Doorbell snapshot prewarmed.'))
      .catch(error => this.camera.log.warn(`Unable to prewarm doorbell snapshot: ${error}`));
  }

  async prepareStream(
    request: PrepareStreamRequest,
    callback: PrepareStreamCallback,
  ) {
    const videoIncomingPort = await reservePorts({
      count: 1,
    });
    const videoSSRC = this.hap.CameraController.generateSynchronisationSource();

    const audioIncomingPort = await reservePorts({
      count: 1,
    });
    const audioSSRC = this.hap.CameraController.generateSynchronisationSource();

    const sessionInfo: SessionInfo = {
      address: request.targetAddress,
      addressVersion: request.addressVersion,

      audioCryptoSuite: request.audio.srtpCryptoSuite,
      audioPort: request.audio.port,
      audioSRTP: Buffer.concat([request.audio.srtp_key, request.audio.srtp_salt]),
      audioSSRC: audioSSRC,
      audioIncomingPort: audioIncomingPort[0],

      videoCryptoSuite: request.video.srtpCryptoSuite,
      videoPort: request.video.port,
      videoSRTP: Buffer.concat([request.video.srtp_key, request.video.srtp_salt]),
      videoSSRC: videoSSRC,
      videoIncomingPort: videoIncomingPort[0],

      preparedAt: Date.now(),
      // Allocate the cloud stream while HomeKit completes its prepare/start handshake.
      rtspUrlPromise: this.retrieveDeviceRTSP('live stream')
        .then(url => ({ url }))
        .catch(error => ({
          error: error instanceof Error ? error : new Error(String(error)),
        })),
    };

    const response: PrepareStreamResponse = {
      video: {
        port: sessionInfo.videoIncomingPort,
        ssrc: videoSSRC,
        srtp_key: request.video.srtp_key,
        srtp_salt: request.video.srtp_salt,
      },
      audio: {
        port: sessionInfo.audioIncomingPort,
        ssrc: audioSSRC,
        srtp_key: request.audio.srtp_key,
        srtp_salt: request.audio.srtp_salt,
      },
    };

    this.pendingSessions[request.sessionID] = sessionInfo;
    callback(undefined, response);
  }

  async handleStreamRequest(
    request: StreamingRequest,
    callback: StreamRequestCallback,
  ) {
    switch (request.type) {
      case this.hap.StreamRequestTypes.START: {
        this.camera.log.debug(`Start stream requested: ${request.video.width}x${request.video.height}, ${request.video.fps} fps, ${request.video.max_bit_rate} kbps`);

        await this.startStream(request, callback);
        break;
      }

      case this.hap.StreamRequestTypes.RECONFIGURE: {
        this.camera.log.debug(`Reconfigure stream requested: ${request.video.width}x${request.video.height}, ${request.video.fps} fps, ${request.video.max_bit_rate} kbps (Ignored)`);

        callback();
        break;
      }

      case this.hap.StreamRequestTypes.STOP: {
        this.camera.log.debug('Stop stream requested');

        this.stopStream(request.sessionID);
        callback();
        break;
      }
    }
  }

  private async retrieveDeviceRTSP(purpose: string): Promise<string> {
    const startedAt = Date.now();
    const data = await this.camera.deviceManager.api.post(
      `/v1.0/devices/${this.camera.device.id}/stream/actions/allocate`,
      {
        type: 'rtsp',
      },
    );

    const elapsed = (Date.now() - startedAt) / 1000;
    this.camera.log.debug(`Tuya allocated ${purpose} source in ${elapsed.toFixed(3)} seconds.`);

    if (!data.success || !data.result?.url) {
      throw new Error(`Tuya did not allocate a ${purpose} source.`);
    }

    return data.result.url;
  }

  private async startStream(request: StartStreamRequest, callback: StreamRequestCallback) {
    const sessionInfo = this.pendingSessions[request.sessionID];

    if (!sessionInfo) {
      this.camera.log.error('Error finding session information.');
      callback(new Error('Error finding session information'));
      return;
    }

    const vcodec = 'libx264';
    const mtu = 1316; // request.video.mtu is not used

    const fps = request.video.fps;
    const videoBitrate = request.video.max_bit_rate;

    const source = await sessionInfo.rtspUrlPromise;
    if ('error' in source) {
      delete this.pendingSessions[request.sessionID];
      callback(source.error);
      return;
    }
    const rtspUrl = source.url;

    const ffmpegArgs: string[] = [
      '-hide_banner',
      '-loglevel', 'verbose',
      '-i', rtspUrl,
      '-an', '-sn', '-dn',
      '-r', fps.toString(),
      '-codec:v', vcodec,
      '-pix_fmt', 'yuv420p',
      '-color_range', 'mpeg',
      '-f', 'rawvideo',
    ];

    const encoderOptions = '-preset ultrafast -tune zerolatency';

    if (encoderOptions) {
      ffmpegArgs.push(...encoderOptions.split(/\s+/));
    }

    if (videoBitrate > 0) {
      ffmpegArgs.push('-b:v', `${videoBitrate}k`);
    }

    // Video Stream

    ffmpegArgs.push(
      '-payload_type', `${request.video.pt}`,
      '-ssrc', `${sessionInfo.videoSSRC}`,
      '-f', 'rtp',
      '-srtp_out_suite', 'AES_CM_128_HMAC_SHA1_80',
      '-srtp_out_params', sessionInfo.videoSRTP.toString('base64'),
      `srtp://${sessionInfo.address}:${sessionInfo.videoPort}?rtcpport=${sessionInfo.videoPort}&pkt_size=${mtu}`,
    );

    // Setting up audio

    if (
      request.audio.codec === AudioStreamingCodecType.OPUS ||
            request.audio.codec === AudioStreamingCodecType.AAC_ELD
    ) {
      ffmpegArgs.push('-vn', '-sn', '-dn');

      if (request.audio.codec === AudioStreamingCodecType.OPUS) {
        ffmpegArgs.push('-acodec', 'libopus', '-application', 'lowdelay');
      } else {
        ffmpegArgs.push('-acodec', 'libfdk_aac', '-profile:a', 'aac_eld');
      }

      ffmpegArgs.push(
        '-flags', '+global_header',
        '-f', 'null',
        '-ar', `${request.audio.sample_rate}k`,
        '-b:a', `${request.audio.max_bit_rate}k`,
        '-ac', `${request.audio.channel}`,
        '-payload_type', `${request.audio.pt}`,
        '-ssrc', `${sessionInfo.audioSSRC}`,
        '-f', 'rtp',
        '-srtp_out_suite', 'AES_CM_128_HMAC_SHA1_80',
        '-srtp_out_params', sessionInfo.audioSRTP.toString('base64'),
        `srtp://${sessionInfo.address}:${sessionInfo.audioPort}?rtcpport=${sessionInfo.audioPort}&pkt_size=188`,
      );
    } else {
      this.camera.log.error(`Unsupported audio codec requested: ${request.audio.codec}`);
    }

    ffmpegArgs.push('-progress', 'pipe:1');

    const activeSession: ActiveSession = {};

    activeSession.socket = createSocket(sessionInfo.addressVersion === 'ipv6' ? 'udp6' : 'udp4');

    activeSession.socket.on('error', (err: Error) => {
      this.camera.log.error('Socket error: ' + err.message);
      this.stopStream(request.sessionID);
    });

    activeSession.socket.on('message', () => {
      if (activeSession.timeout) {
        clearTimeout(activeSession.timeout);
      }
      activeSession.timeout = setTimeout(() => {
        this.camera.log.info('Device appears to be inactive. Stopping stream.');
        this.controller.forceStopStreamingSession(request.sessionID);
        this.stopStream(request.sessionID);
      }, request.video.rtcp_interval * 5 * 1000);
    });

    activeSession.socket.bind(sessionInfo.videoIncomingPort);

    activeSession.mainProcess = new FfmpegStreamingProcess(
      request.sessionID,
      defaultFfmpegPath,
      ffmpegArgs,
      this.camera.log,
      this,
      callback,
      sessionInfo.preparedAt,
    );

    this.ongoingSessions[request.sessionID] = activeSession;
    delete this.pendingSessions[request.sessionID];
  }

  private cachedSnapshot(maxAge: number): Buffer | undefined {
    if (this.snapshotCache && Date.now() - this.snapshotCache.createdAt <= maxAge) {
      return this.snapshotCache.buffer;
    }
    return undefined;
  }

  private snapshotRequest(): Promise<Buffer> {
    if (!this.snapshotPromise) {
      const request: Promise<Buffer> = this.fetchSnapshot()
        .then(buffer => {
          this.snapshotCache = { buffer, createdAt: Date.now() };
          return buffer;
        })
        .finally(() => {
          if (this.snapshotPromise === request) {
            this.snapshotPromise = undefined;
          }
        });
      this.snapshotPromise = request;
    } else {
      this.camera.log.debug('Reusing in-flight snapshot request.');
    }

    return this.snapshotPromise;
  }

  private async getSnapshot(forceRefresh = false): Promise<Buffer> {
    if (!forceRefresh) {
      const freshSnapshot = this.cachedSnapshot(TuyaStreamingDelegate.SNAPSHOT_CACHE_MAX_AGE);
      if (freshSnapshot) {
        this.camera.log.debug('Serving cached snapshot.');
        return freshSnapshot;
      }

      const staleSnapshot = this.cachedSnapshot(TuyaStreamingDelegate.SNAPSHOT_STALE_MAX_AGE);
      if (staleSnapshot) {
        this.camera.log.debug('Serving the last cached frame while refreshing it in the background.');
        void this.snapshotRequest()
          .catch(error => this.camera.log.warn(`Background snapshot refresh failed: ${error}`));
        return staleSnapshot;
      }
    }

    try {
      return await this.snapshotRequest();
    } catch (error) {
      const staleSnapshot = this.cachedSnapshot(TuyaStreamingDelegate.SNAPSHOT_STALE_MAX_AGE);
      if (staleSnapshot) {
        this.camera.log.warn('Snapshot refresh failed; serving the last cached frame.');
        return staleSnapshot;
      }
      throw error;
    }
  }

  private async fetchSnapshot(): Promise<Buffer> {
    if (!this.camera.device.online) {
      this.camera.log.debug('Device is currently offline.');
      throw new Error('Device is currently offline.');
    }

    const startedAt = Date.now();
    const rtspUrl = await this.retrieveDeviceRTSP('snapshot');

    const ffmpegArgs = [
      '-i', rtspUrl,
      '-frames:v', '1',
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'image2',
      '-',
    ];

    return new Promise((resolve, reject) => {

      this.camera.log.debug('Starting snapshot FFmpeg process.');

      const ffmpeg = spawn(
        defaultFfmpegPath,
        ffmpegArgs.map(x => x.toString()),
        { env: process.env },
      );

      let errors: string[] = [];

      let snapshotBuffer = Buffer.alloc(0);
      let settled = false;

      const finish = (error?: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        if (error) {
          reject(error);
        } else {
          const elapsed = (Date.now() - startedAt) / 1000;
          this.camera.log.debug(`Snapshot captured in ${elapsed.toFixed(3)} seconds.`);
          resolve(snapshotBuffer);
        }
      };

      const timeout = setTimeout(() => {
        ffmpeg.kill('SIGKILL');
        finish(new Error('Snapshot timed out waiting for a video frame.'));
      }, TuyaStreamingDelegate.SNAPSHOT_TIMEOUT);

      ffmpeg.stdout.on('data', (data) => {
        snapshotBuffer = Buffer.concat([snapshotBuffer, data]);
      });

      ffmpeg.on('error', (error) => {
        finish(new Error(`FFmpeg snapshot process failed: ${error.message}`));
      });

      ffmpeg.stderr.on('data', (data) => {
        errors = errors.slice(-5);
        errors.push(data.toString().replace(/(\r\n|\n|\r)/gm, ' '));
      });

      ffmpeg.on('close', () => {
        if (snapshotBuffer.length > 0) {
          finish();
        } else {
          if (errors.length > 0) {
            this.camera.log.debug(errors.join(' - '));
          }
          finish(new Error('Snapshot source closed before returning a video frame.'));
        }
      });
    });
  }
}
