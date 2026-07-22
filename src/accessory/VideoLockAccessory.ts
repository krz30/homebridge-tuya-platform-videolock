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
  DOORBELL_RING: ['doorbell', 'doorbell_call'],
};

export default class VideoLockAccessory extends BaseAccessory {

  private stream: TuyaStreamingDelegate | undefined;

  requiredSchema() {
    return [SCHEMA_CODE.LOCK_CURRENT_STATE];
  }

  configureServices() {
    this.configureLockCurrentState();
    this.configureLockTargetState();
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
