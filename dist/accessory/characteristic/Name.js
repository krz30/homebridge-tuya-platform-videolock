"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureName = configureName;
function configureName(accessory, service, name) {
    service.setCharacteristic(accessory.Characteristic.Name, name);
    if (!service.testCharacteristic(accessory.Characteristic.ConfiguredName)) {
        service.addOptionalCharacteristic(accessory.Characteristic.ConfiguredName); // silence warning
        service.setCharacteristic(accessory.Characteristic.ConfiguredName, name); // only add once
    }
}
//# sourceMappingURL=Name.js.map