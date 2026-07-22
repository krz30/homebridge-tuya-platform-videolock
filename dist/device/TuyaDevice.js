"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TuyaDeviceSchemaType = exports.TuyaDeviceSchemaMode = void 0;
var TuyaDeviceSchemaMode;
(function (TuyaDeviceSchemaMode) {
    TuyaDeviceSchemaMode["UNKNOWN"] = "";
    TuyaDeviceSchemaMode["READ_WRITE"] = "rw";
    TuyaDeviceSchemaMode["READ_ONLY"] = "ro";
    TuyaDeviceSchemaMode["WRITE_ONLY"] = "wo";
})(TuyaDeviceSchemaMode || (exports.TuyaDeviceSchemaMode = TuyaDeviceSchemaMode = {}));
var TuyaDeviceSchemaType;
(function (TuyaDeviceSchemaType) {
    TuyaDeviceSchemaType["Boolean"] = "Boolean";
    TuyaDeviceSchemaType["Integer"] = "Integer";
    TuyaDeviceSchemaType["Enum"] = "Enum";
    TuyaDeviceSchemaType["String"] = "String";
    TuyaDeviceSchemaType["Json"] = "Json";
    TuyaDeviceSchemaType["Raw"] = "Raw";
})(TuyaDeviceSchemaType || (exports.TuyaDeviceSchemaType = TuyaDeviceSchemaType = {}));
class TuyaDevice {
    // device
    id;
    uuid;
    name;
    online;
    owner_id; // homeID or assetID
    // product
    product_id;
    product_name;
    icon;
    category;
    unbridged;
    schema;
    // status
    status;
    // location
    ip;
    lat;
    lon;
    time_zone;
    // time
    create_time;
    active_time;
    update_time;
    // ...
    sub;
    parent_id;
    remote_keys;
    constructor(obj) {
        Object.assign(this, obj);
        this.status.sort((a, b) => a.code > b.code ? 1 : -1);
    }
    isVirtualDevice() {
        return this.id.startsWith('vdevo');
    }
    isIRControlHub() {
        return ['wnykq', 'hwktwkq', 'wsdykq']
            .includes(this.category);
    }
    isIRRemoteControl() {
        return this.remote_keys !== undefined;
    }
}
exports.default = TuyaDevice;
//# sourceMappingURL=TuyaDevice.js.map