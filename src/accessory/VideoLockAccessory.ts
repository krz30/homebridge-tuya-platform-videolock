import { TuyaDeviceStatus } from '../device/TuyaDevice';
import { TuyaStreamingDelegate } from '../util/TuyaStreamDelegate';
import BaseAccessory from './BaseAccessory';

// Tuya's `videolock` category: a lock with an integrated camera/peephole.
// Combines LockMechanism (from LockAccessory) + Doorbell + Camera (from CameraAccessory)
// on a single accessory, since HomeKit only allows the Doorbell service
// alongside a CameraController on the same accessory.
const SCHEMA_CODE = {
  LOCK_CURRENT_STATE: ['open_close', 'closed_opened', 'lock_motor_state'],
  LOCK_TARGET_STATE: ['lock_motor_state'],
  DOOR_CONTACT_STATE: ['open_close', 'closed_opened'],
  DOOR_OPEN_EVENT: [
    'door_opened',
    'open_inside',
    'unlock_fingerprint',
    'unlock_password',
    'unlock_temporary',
    'unlock_dynamic',
    'unlock_card',
    'unlock_face',
    'unlock_hand',
    'unlock_phone_remote',
    'unlock_key',
    'unlock_app',
    'unlock_remote',
    'unlock_voice_remote',
    'unlock_eye',
    'unlock_finger_vein',
    'unlock_ble',
    'unlock_special',
    'unlock_access_control',
  ],
  DOORBELL_RING: ['doorbell', 'doorbell_call'],
};

export default class VideoLockAccessory extends BaseAccessory {

  private stream: TuyaStreamingDelegate | undefined;
  private doorOpenTimer?: NodeJS.Timeout;

  requiredSchema() {
    return [SCHEMA_CODE.LOCK_CURRENT_STATE];
  }

  configureServices() {
    this.configureLockCurrentState();
    this.configureLockTargetState();
    this.configureDoorContactState();
    this.configureDoorOpenEvent();
    this.configureDoorbell();
    this.configureCamera();
  }

  mainService() {
    return this.accessory.getService(this.Service.LockMechanism)
      || this.accessory.addService(this.Service.LockMechanism);
  }

  configureLockCurrentState() {
    const schema = this.getSchema(...SCHEMA_CODE.LOCK_CURRENT_STATE);
    if (!schema) {
      return;
    }

    const { UNSECURED, SECURED } = this.Characteristic.LockCurrentState;
    this.mainService().getCharacteristic(this.Characteristic.LockCurrentState)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return (status.value as boolean) ? UNSECURED : SECURED;
      });
  }

  configureLockTargetState() {
    const schema = this.getSchema(...SCHEMA_CODE.LOCK_TARGET_STATE);
    if (!schema) {
      return;
    }

    const { UNSECURED, SECURED } = this.Characteristic.LockTargetState;
    this.mainService().getCharacteristic(this.Characteristic.LockTargetState)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return (status.value as boolean) ? UNSECURED : SECURED;
      })
      .onSet(async value => {
        const res = await this.deviceManager.getLockTemporaryKey(this.device.id);
        if (!res.success) {
          return;
        }
        await this.deviceManager.sendLockCommands(this.device.id, res.result.ticket_id, (value === UNSECURED));
      });
  }

  configureDoorContactState() {
    const schema = this.getSchema(...SCHEMA_CODE.DOOR_CONTACT_STATE);
    if (!schema) {
      const redundantLockContact = this.accessory.services.find(service =>
        service.UUID === this.Service.ContactSensor.UUID && service.subtype !== 'door-open-event');
      if (redundantLockContact) {
        this.accessory.removeService(redundantLockContact);
      }
      return;
    }

    const service = this.accessory.getService(this.Service.ContactSensor)
      || this.accessory.addService(this.Service.ContactSensor);
    const { CONTACT_NOT_DETECTED, CONTACT_DETECTED } = this.Characteristic.ContactSensorState;

    service.getCharacteristic(this.Characteristic.ContactSensorState)
      .onGet(() => {
        const status = this.getStatus(schema.code)!;
        return (status.value as boolean) ? CONTACT_NOT_DETECTED : CONTACT_DETECTED;
      });
  }

  configureDoorOpenEvent() {
    const legacyMotionService = this.accessory.getServiceById(this.Service.MotionSensor, 'door-open-event');
    if (legacyMotionService) {
      this.accessory.removeService(legacyMotionService);
    }

    const schemas = SCHEMA_CODE.DOOR_OPEN_EVENT
      .map(code => this.getSchema(code))
      .filter(schema => schema !== undefined);
    if (schemas.length === 0) {
      return;
    }

    this.getDoorOpenEventService()
      .setCharacteristic(
        this.Characteristic.ContactSensorState,
        this.Characteristic.ContactSensorState.CONTACT_DETECTED,
      );
  }

  getDoorOpenEventService() {
    return this.accessory.getServiceById(this.Service.ContactSensor, 'door-open-event')
      || this.accessory.addService(
        this.Service.ContactSensor,
        `${this.device.name} Door Opened`,
        'door-open-event',
      );
  }

  configureDoorbell() {
    const schema = this.getSchema(...SCHEMA_CODE.DOORBELL_RING);
    if (!schema) {
      return;
    }
    // Real HomeKit Doorbell service (not downgraded to StatelessProgrammableSwitch)
    // because this accessory also exposes a CameraController below.
    this.getDoorbellService().getCharacteristic(this.Characteristic.ProgrammableSwitchEvent)
      .setProps({ minValue: 0, maxValue: 0 }); // single press only
  }

  configureCamera() {
    if (this.stream !== undefined || this.device.isVirtualDevice()) {
      return;
    }
    this.stream = new TuyaStreamingDelegate(this);
    this.accessory.configureController(this.stream.controller);
  }

  getDoorbellService() {
    return this.accessory.getService(this.Service.Doorbell)
      || this.accessory.addService(this.Service.Doorbell);
  }

  async onDeviceStatusUpdate(status: TuyaDeviceStatus[]) {
    super.onDeviceStatusUpdate(status);

    const doorOpenStatus = status.find(_status =>
      SCHEMA_CODE.DOOR_OPEN_EVENT.includes(_status.code) && this.getSchema(_status.code));
    if (doorOpenStatus) {
      const isEvent = typeof doorOpenStatus.value !== 'boolean' || doorOpenStatus.value === true;
      if (isEvent && this.intialized) {
        this.log.info('Door opening detected.');
        const characteristic = this.getDoorOpenEventService()
          .getCharacteristic(this.Characteristic.ContactSensorState);
        characteristic.sendEventNotification(
          this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED,
        );

        this.doorOpenTimer && clearTimeout(this.doorOpenTimer);
        this.doorOpenTimer = setTimeout(() => characteristic.updateValue(
          this.Characteristic.ContactSensorState.CONTACT_DETECTED,
        ), 30 * 1000);
      }
    }

    const doorbellSchema = this.getSchema(...SCHEMA_CODE.DOORBELL_RING);
    if (!doorbellSchema) {
      return;
    }
    const doorbellStatus = status.find(_status => _status.code === doorbellSchema.code);
    if (doorbellStatus && doorbellStatus.value === true && this.intialized) {
      this.log.info('Doorbell ring detected.');
      this.getDoorbellService().getCharacteristic(this.Characteristic.ProgrammableSwitchEvent)
        .updateValue(0); // SINGLE_PRESS
    }
  }

}
