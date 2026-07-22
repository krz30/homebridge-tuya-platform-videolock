"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = __importDefault(require("events"));
const TuyaOpenMQ_1 = __importDefault(require("../core/TuyaOpenMQ"));
const Logger_1 = require("../util/Logger");
const TuyaDevice_1 = __importStar(require("./TuyaDevice"));
var Events;
(function (Events) {
    Events["DEVICE_ADD"] = "DEVICE_ADD";
    Events["DEVICE_INFO_UPDATE"] = "DEVICE_INFO_UPDATE";
    Events["DEVICE_STATUS_UPDATE"] = "DEVICE_STATUS_UPDATE";
    Events["DEVICE_DELETE"] = "DEVICE_DELETE";
})(Events || (Events = {}));
var TuyaMQTTProtocol;
(function (TuyaMQTTProtocol) {
    TuyaMQTTProtocol[TuyaMQTTProtocol["DEVICE_STATUS_UPDATE"] = 4] = "DEVICE_STATUS_UPDATE";
    TuyaMQTTProtocol[TuyaMQTTProtocol["DEVICE_INFO_UPDATE"] = 20] = "DEVICE_INFO_UPDATE";
})(TuyaMQTTProtocol || (TuyaMQTTProtocol = {}));
class TuyaDeviceManager extends events_1.default {
    api;
    debug;
    static Events = Events;
    mq;
    ownerIDs = [];
    devices = [];
    log;
    constructor(api, debug = false) {
        super();
        this.api = api;
        this.debug = debug;
        const log = this.api.log.log;
        this.log = new Logger_1.PrefixLogger(log, TuyaDeviceManager.name, debug);
        this.mq = new TuyaOpenMQ_1.default(api, log);
        this.mq.addMessageListener(this.onMQTTMessage.bind(this));
    }
    getDevice(deviceID) {
        return Array.from(this.devices).find(device => device.id === deviceID);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async updateDevices(ownerIDs) {
        return [];
    }
    async updateDevice(deviceID) {
        const res = await this.getDeviceInfo(deviceID);
        if (!res.success) {
            return null;
        }
        const device = new TuyaDevice_1.default(res.result);
        device.schema = await this.getDeviceSchema(deviceID);
        const oldDevice = this.getDevice(deviceID);
        if (oldDevice) {
            this.devices.splice(this.devices.indexOf(oldDevice), 1);
        }
        this.devices.push(device);
        return device;
    }
    async getDeviceInfo(deviceID) {
        const res = await this.api.get(`/v1.0/devices/${deviceID}`);
        return res;
    }
    async getDeviceListInfo(deviceIDs = []) {
        const res = await this.api.get('/v1.0/devices', { 'device_ids': deviceIDs.join(',') });
        return res;
    }
    async getDeviceSchema(deviceID) {
        // const res = await this.api.get(`/v1.2/iot-03/devices/${deviceID}/specification`);
        const res = await this.api.get(`/v1.0/devices/${deviceID}/specifications`);
        if (res.success === false) {
            this.log.warn('Get device specification failed. devId = %s, code = %s, msg = %s', deviceID, res.code, res.msg);
            return [];
        }
        // Combine functions and status together, as it used to be.
        const schemas = new Map();
        for (const { code, type, values } of [...res.result.status, ...res.result.functions]) {
            if (schemas[code]) {
                continue;
            }
            const read = (res.result.status).find(schema => schema.code === code) !== undefined;
            const write = (res.result.functions).find(schema => schema.code === code) !== undefined;
            let mode = TuyaDevice_1.TuyaDeviceSchemaMode.UNKNOWN;
            if (read && write) {
                mode = TuyaDevice_1.TuyaDeviceSchemaMode.READ_WRITE;
            }
            else if (read && !write) {
                mode = TuyaDevice_1.TuyaDeviceSchemaMode.READ_ONLY;
            }
            else if (!read && write) {
                mode = TuyaDevice_1.TuyaDeviceSchemaMode.WRITE_ONLY;
            }
            let property;
            try {
                property = JSON.parse(values);
                schemas[code] = { code, mode, type, property };
            }
            catch (error) {
                // ignore infrared remote's invalid schema because it's not used.
            }
        }
        return Object.values(schemas).sort((a, b) => a.code > b.code ? 1 : -1);
    }
    async getInfraredRemotes(infraredID) {
        const res = await this.api.get(`/v2.0/infrareds/${infraredID}/remotes`);
        return res;
    }
    async getInfraredKeys(infraredID, remoteID) {
        const res = await this.api.get(`/v2.0/infrareds/${infraredID}/remotes/${remoteID}/keys`);
        return res;
    }
    async getInfraredACStatus(infraredID, remoteID) {
        const res = await this.api.get(`/v2.0/infrareds/${infraredID}/remotes/${remoteID}/ac/status`);
        return res;
    }
    async getInfraredDIYKeys(infraredID, remoteID) {
        const res = await this.api.get(`/v2.0/infrareds/${infraredID}/remotes/${remoteID}/learning-codes`);
        return res;
    }
    async updateInfraredRemotes(allDevices) {
        const irDevices = allDevices.filter(device => device.isIRControlHub());
        for (const irDevice of irDevices) {
            const res = await this.getInfraredRemotes(irDevice.id);
            if (!res.success) {
                this.log.warn('Get infrared remotes failed. deviceId = %d, code = %s, msg = %s', irDevice.id, res.code, res.msg);
                continue;
            }
            for (const { category_id, remote_id } of res.result) {
                const subDevice = allDevices.find(device => device.id === remote_id);
                if (!subDevice) {
                    continue;
                }
                subDevice.parent_id = irDevice.id;
                subDevice.schema = [];
                const res = await this.getInfraredKeys(irDevice.id, subDevice.id);
                if (!res.success) {
                    this.log.warn('Get infrared remote keys failed. deviceId = %d, code = %s, msg = %s', subDevice.id, res.code, res.msg);
                    continue;
                }
                subDevice.remote_keys = res.result;
                if (subDevice.category === 'infrared_ac') { // AC Device
                    const res = await this.getInfraredACStatus(irDevice.id, subDevice.id);
                    if (!res.success) {
                        this.log.warn('Get infrared ac status failed. deviceId = %d, code = %s, msg = %s', subDevice.id, res.code, res.msg);
                        continue;
                    }
                    subDevice.status = Object.entries(res.result).map(([key, value]) => ({ code: key, value }));
                }
                else if (category_id === 999) { // DIY Device
                    const res = await this.getInfraredDIYKeys(irDevice.id, subDevice.id);
                    if (!res.success) {
                        this.log.warn('Get infrared diy keys failed. deviceId = %d, code = %s, msg = %s', subDevice.id, res.code, res.msg);
                        continue;
                    }
                    const key_list = subDevice.remote_keys?.key_list || [];
                    for (const key of key_list) {
                        const item = res.result.find(item => item['id'] === key.key_id && item['key'] === key.key);
                        if (!item) {
                            continue;
                        }
                        this.log.debug('learning_code:', item['code']);
                        key.learning_code = item['code'];
                    }
                }
            }
        }
    }
    async sendInfraredCommands(infraredID, remoteID, category_id, remote_index, key, key_id) {
        const res = await this.api.post(`/v2.0/infrareds/${infraredID}/remotes/${remoteID}/raw/command`, {
            category_id, remote_index, key, key_id,
        });
        return res;
    }
    async sendInfraredACCommands(infraredID, remoteID, power, mode, temp, wind) {
        const commands = (power === 1) ? { power, mode, temp, wind } : { power };
        const res = await this.api.post(`/v2.0/infrareds/${infraredID}/air-conditioners/${remoteID}/scenes/command`, commands);
        if (!res.success) {
            this.log.info('Send AC command failed. code = %d, msg = %s', res.code, res.msg);
        }
        return res;
    }
    async sendInfraredDIYCommands(infraredID, remoteID, code) {
        const res = await this.api.post(`/v2.0/infrareds/${infraredID}/remotes/${remoteID}/learning-codes`, { code });
        return res;
    }
    async getLockTemporaryKey(deviceID) {
        // const res = await this.api.post(`/v1.0/smart-lock/devices/${deviceID}/door-lock/password-ticket`);
        const res = await this.api.post(`/v1.0/smart-lock/devices/${deviceID}/password-ticket`);
        if (res.success === false) {
            this.log.warn('Get Temporary Pass failed. devID = %s, code = %s, msg = %s', deviceID, res.code, res.msg);
        }
        return res;
    }
    async sendLockCommands(deviceID, ticketID, open) {
        const res = await this.api.post(`/v1.0/smart-lock/devices/${deviceID}/password-free/door-operate`, {
            device_id: deviceID,
            ticket_id: ticketID,
            open,
        });
        return res;
    }
    async sendCommands(deviceID, commands) {
        const res = await this.api.post(`/v1.0/devices/${deviceID}/commands`, { commands });
        return res.result;
    }
    async onMQTTMessage(topic, protocol, message) {
        switch (protocol) {
            case TuyaMQTTProtocol.DEVICE_STATUS_UPDATE: {
                const { devId, status } = message;
                const device = this.getDevice(devId);
                if (!device) {
                    return;
                }
                for (const item of device.status) {
                    const _item = status.find(_item => _item.code === item.code);
                    if (!_item) {
                        continue;
                    }
                    item.value = _item.value;
                }
                this.emit(Events.DEVICE_STATUS_UPDATE, device, status);
                break;
            }
            case TuyaMQTTProtocol.DEVICE_INFO_UPDATE: {
                const { bizCode, bizData, devId } = message;
                if (bizCode === 'bindUser') {
                    const { ownerId } = bizData;
                    if (!this.ownerIDs.includes(ownerId)) {
                        this.log.warn('Update devId = %s not included in your ownerIDs. Skip.', devId);
                        return;
                    }
                    // TODO failed if request to quickly
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    const device = await this.updateDevice(devId);
                    if (!device) {
                        return;
                    }
                    this.mq.start(); // Force reconnect, unless new device status update won't get received
                    this.emit(Events.DEVICE_ADD, device);
                }
                else if (bizCode === 'nameUpdate') {
                    const { name } = bizData;
                    const device = this.getDevice(devId);
                    if (!device) {
                        return;
                    }
                    device.name = name;
                    this.emit(Events.DEVICE_INFO_UPDATE, device, bizData);
                }
                else if (bizCode === 'online' || bizCode === 'offline') {
                    const device = this.getDevice(devId);
                    if (!device) {
                        return;
                    }
                    device.online = (bizCode === 'online') ? true : false;
                    this.emit(Events.DEVICE_INFO_UPDATE, device, bizData);
                }
                else if (bizCode === 'delete') {
                    const { ownerId } = bizData;
                    if (!this.ownerIDs.includes(ownerId)) {
                        this.log.warn('Remove devId = %s not included in your ownerIDs. Skip.', devId);
                        return;
                    }
                    const device = this.getDevice(devId);
                    if (!device) {
                        return;
                    }
                    this.devices.splice(this.devices.indexOf(device), 1);
                    this.emit(Events.DEVICE_DELETE, devId);
                }
                else if (bizCode === 'event_notify') {
                    // doorbell event
                }
                else if (bizCode === 'p2pSignal') {
                    // p2p signal
                }
                else {
                    this.log.warn('Unhandled mqtt message: bizCode = %s, bizData = %o', bizCode, bizData);
                }
                break;
            }
            default:
                this.log.warn('Unhandled mqtt message: protocol = %s, message = %o', protocol, message);
                break;
        }
    }
}
exports.default = TuyaDeviceManager;
//# sourceMappingURL=TuyaDeviceManager.js.map