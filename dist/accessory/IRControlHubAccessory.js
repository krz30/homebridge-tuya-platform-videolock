"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BaseAccessory_1 = __importDefault(require("./BaseAccessory"));
const CurrentRelativeHumidity_1 = require("./characteristic/CurrentRelativeHumidity");
const CurrentTemperature_1 = require("./characteristic/CurrentTemperature");
const SCHEMA_CODE = {
    CURRENT_TEMP: ['va_temperature'],
    CURRENT_HUMIDITY: ['va_humidity', 'humidity_value'],
};
class IRControlHubAccessory extends BaseAccessory_1.default {
    requiredSchema() {
        return [];
    }
    configureServices() {
        (0, CurrentTemperature_1.configureCurrentTemperature)(this, undefined, this.getSchema(...SCHEMA_CODE.CURRENT_TEMP));
        (0, CurrentRelativeHumidity_1.configureCurrentRelativeHumidity)(this, undefined, this.getSchema(...SCHEMA_CODE.CURRENT_HUMIDITY));
    }
    getSubAccessories() {
        return this.platform.accessoryHandlers.filter(accessory => accessory.device.parent_id === this.device.id);
    }
    async onDeviceStatusUpdate(status) {
        super.onDeviceStatusUpdate(status);
        // Trigger sub device update temperature & humidity from parent device.
        for (const subAccessory of this.getSubAccessories()) {
            await subAccessory.updateAllValues();
        }
    }
}
exports.default = IRControlHubAccessory;
//# sourceMappingURL=IRControlHubAccessory.js.map