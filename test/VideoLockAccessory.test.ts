/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { API, PlatformAccessory } from 'homebridge';
import VideoLockAccessory from '../src/accessory/VideoLockAccessory';
import TuyaDevice, { TuyaDeviceSchemaMode, TuyaDeviceSchemaType } from '../src/device/TuyaDevice';
import { TuyaPlatform } from '../src/platform';

jest.mock('../src/util/TuyaStreamDelegate', () => ({
  TuyaStreamingDelegate: jest.fn().mockImplementation(() => ({ controller: {} })),
}));

describe('VideoLockAccessory', () => {
  let mockPlatform: any;
  let mockAccessory: any;
  let mockDeviceManager: any;

  const serviceTypes = {
    AccessoryInformation: 'AccessoryInformation',
    Battery: 'Battery',
    LockMechanism: 'LockMechanism',
    ContactSensor: 'ContactSensor',
    MotionSensor: 'MotionSensor',
    Doorbell: 'Doorbell',
  };

  const characteristicTypes = {
    Manufacturer: 'Manufacturer',
    Model: 'Model',
    Name: 'Name',
    ConfiguredName: 'ConfiguredName',
    SerialNumber: 'SerialNumber',
    LockCurrentState: { UNSECURED: 0, SECURED: 1 },
    LockTargetState: { UNSECURED: 0, SECURED: 1 },
    ContactSensorState: { CONTACT_DETECTED: 0, CONTACT_NOT_DETECTED: 1 },
    MotionDetected: 'MotionDetected',
    ProgrammableSwitchEvent: 'ProgrammableSwitchEvent',
  };

  beforeEach(() => {
    const device = new TuyaDevice({
      id: 'test-device-id',
      uuid: 'test-uuid',
      name: 'Test Video Lock',
      online: true,
      owner_id: 'owner-1',
      product_id: 'videolock-product',
      product_name: 'Video Lock',
      category: 'videolock',
      schema: [{
        code: 'open_close',
        mode: TuyaDeviceSchemaMode.READ_ONLY,
        type: TuyaDeviceSchemaType.Boolean,
        property: {},
      }],
      status: [{ code: 'open_close', value: false }],
    });

    mockDeviceManager = {
      getDevice: jest.fn(() => device),
      getLockTemporaryKey: jest.fn(),
      sendLockCommands: jest.fn(),
    };

    mockPlatform = {
      api: {
        hap: {
          Service: serviceTypes,
          Characteristic: characteristicTypes,
        },
      } as unknown as API,
      log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      },
      options: { debug: false, debugLevel: '' },
      deviceManager: mockDeviceManager,
      getDeviceSchemaConfig: jest.fn(() => undefined),
    } as unknown as TuyaPlatform;

    mockAccessory = {
      context: { deviceID: 'test-device-id' },
      services: [],
      getService: jest.fn((serviceType: string) =>
        mockAccessory.services.find((service: any) => service.type === serviceType)),
      getServiceById: jest.fn((serviceType: string, subtype: string) =>
        mockAccessory.services.find((service: any) => service.type === serviceType && service.subtype === subtype)),
      addService: jest.fn((serviceType: string, name?: string, subtype?: string) => {
        const characteristics = new Map<any, any>();
        const service: any = {
          type: serviceType,
          name,
          subtype,
          characteristics: [],
          getCharacteristic: jest.fn((characteristicType: any) => {
            if (!characteristics.has(characteristicType)) {
              const characteristic = {
                UUID: characteristicType,
                value: undefined,
                getHandler: undefined as undefined | (() => unknown),
                onGet: jest.fn((handler: () => unknown) => {
                  characteristic.getHandler = handler;
                  return characteristic;
                }),
                onSet: jest.fn().mockReturnThis(),
                setProps: jest.fn().mockReturnThis(),
                updateValue: jest.fn().mockReturnThis(),
                sendEventNotification: jest.fn().mockReturnThis(),
              };
              characteristics.set(characteristicType, characteristic);
              service.characteristics.push(characteristic);
            }
            return characteristics.get(characteristicType);
          }),
          setCharacteristic: jest.fn().mockReturnThis(),
        };
        mockAccessory.services.push(service);
        return service;
      }),
      configureController: jest.fn(),
    } as unknown as PlatformAccessory;
  });

  test('exposes a contact sensor that reports closed and open states', async () => {
    const videoLock = new VideoLockAccessory(mockPlatform, mockAccessory);
    videoLock.configureServices();

    const contactService = mockAccessory.getService(serviceTypes.ContactSensor);
    expect(contactService).toBeDefined();

    const contactState = contactService.getCharacteristic(characteristicTypes.ContactSensorState);
    const getContactState = contactState.onGet.mock.calls[0][0];
    expect(getContactState()).toBe(characteristicTypes.ContactSensorState.CONTACT_DETECTED);

    videoLock.device.status.find(status => status.code === 'open_close')!.value = true;
    expect(getContactState()).toBe(characteristicTypes.ContactSensorState.CONTACT_NOT_DETECTED);

    await videoLock.onDeviceStatusUpdate([{ code: 'open_close', value: true }]);
    await Promise.resolve();
    expect(contactState.updateValue)
      .toHaveBeenCalledWith(characteristicTypes.ContactSensorState.CONTACT_NOT_DETECTED);
  });

  test('uses lock_motor_state as a contact sensor fallback', () => {
    const device = mockDeviceManager.getDevice();
    device.schema[0].code = 'lock_motor_state';
    device.status[0].code = 'lock_motor_state';

    const videoLock = new VideoLockAccessory(mockPlatform, mockAccessory);
    videoLock.configureServices();

    const contactService = mockAccessory.getService(serviceTypes.ContactSensor);
    const contactState = contactService.getCharacteristic(characteristicTypes.ContactSensorState);
    const getContactState = contactState.onGet.mock.calls[0][0];
    expect(getContactState()).toBe(characteristicTypes.ContactSensorState.CONTACT_DETECTED);

    device.status[0].value = true;
    expect(getContactState()).toBe(characteristicTypes.ContactSensorState.CONTACT_NOT_DETECTED);
  });

  test('pulses a motion sensor when the door is opened without changing the lock state', async () => {
    jest.useFakeTimers();
    const device = mockDeviceManager.getDevice();
    device.schema.push({
      code: 'open_inside',
      mode: TuyaDeviceSchemaMode.READ_ONLY,
      type: TuyaDeviceSchemaType.Boolean,
      property: {},
    });
    device.status.push({ code: 'open_inside', value: false });

    const videoLock = new VideoLockAccessory(mockPlatform, mockAccessory);
    videoLock.configureServices();
    videoLock.intialized = true;

    const motionService = mockAccessory.getServiceById(serviceTypes.MotionSensor, 'door-open-event');
    const motionDetected = motionService.getCharacteristic(characteristicTypes.MotionDetected);

    await videoLock.onDeviceStatusUpdate([{ code: 'open_inside', value: true }]);
    expect(motionDetected.sendEventNotification).toHaveBeenCalledWith(true);

    jest.advanceTimersByTime(30 * 1000);
    expect(motionDetected.updateValue).toHaveBeenCalledWith(false);
    jest.useRealTimers();
  });

  test('pulses on repeated fingerprint unlock records while the lock remains open', async () => {
    jest.useFakeTimers();
    const device = mockDeviceManager.getDevice();
    device.status[0].value = true;
    device.schema.push({
      code: 'unlock_fingerprint',
      mode: TuyaDeviceSchemaMode.READ_ONLY,
      type: TuyaDeviceSchemaType.Integer,
      property: { min: 0, max: 999, scale: 0, step: 1, unit: '' },
    });
    device.status.push({ code: 'unlock_fingerprint', value: 1 });

    const videoLock = new VideoLockAccessory(mockPlatform, mockAccessory);
    videoLock.configureServices();
    videoLock.intialized = true;

    const motionService = mockAccessory.getServiceById(serviceTypes.MotionSensor, 'door-open-event');
    const motionDetected = motionService.getCharacteristic(characteristicTypes.MotionDetected);

    await videoLock.onDeviceStatusUpdate([{ code: 'unlock_fingerprint', value: 1 }]);
    jest.advanceTimersByTime(30 * 1000);
    await videoLock.onDeviceStatusUpdate([{ code: 'unlock_fingerprint', value: 1 }]);

    expect(motionDetected.sendEventNotification).toHaveBeenCalledTimes(2);
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
});
