"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureCurrentTemperature = configureCurrentTemperature;
const util_1 = require("../../util/util");
function configureCurrentTemperature(accessory, service, schema) {
    if (!schema) {
        return;
    }
    if (!service) {
        service = accessory.accessory.getService(accessory.Service.TemperatureSensor)
            || accessory.accessory.addService(accessory.Service.TemperatureSensor);
    }
    const property = schema.property;
    const multiple = Math.pow(10, property ? property.scale : 0);
    const props = {
        minValue: Math.max(-270, property.min / multiple),
        maxValue: Math.min(100, property.max / multiple),
        minStep: Math.max(0.1, property.step / multiple),
    };
    accessory.log.debug('Set props for CurrentTemperature:', props);
    service.getCharacteristic(accessory.Characteristic.CurrentTemperature)
        .onGet(() => {
        const status = accessory.getStatus(schema.code);
        return (0, util_1.limit)(status.value / multiple, props.minValue, props.maxValue);
    })
        .setProps(props);
}
//# sourceMappingURL=CurrentTemperature.js.map