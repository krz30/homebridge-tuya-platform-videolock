"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureEnergyUsage = configureEnergyUsage;
function configureEnergyUsage(api, accessory, service, currentSchema, powerSchema, voltageSchema, totalSchema) {
    if (currentSchema) {
        const amperes = createAmperesCharacteristic(api);
        if (!service.testCharacteristic(amperes)) {
            service.addCharacteristic(amperes);
        }
        service.getCharacteristic(amperes).onGet(createStatusGetter(accessory, currentSchema, isUnit(currentSchema, 'mA') ? 1000 : 0));
    }
    if (powerSchema) {
        const watts = createWattsCharacteristic(api);
        if (!service.testCharacteristic(watts)) {
            service.addCharacteristic(watts);
        }
        service.getCharacteristic(watts).onGet(createStatusGetter(accessory, powerSchema));
    }
    if (voltageSchema) {
        const volts = createVoltsCharacteristic(api);
        if (!service.testCharacteristic(volts)) {
            service.addCharacteristic(volts);
        }
        service.getCharacteristic(volts).onGet(createStatusGetter(accessory, voltageSchema));
    }
    if (totalSchema) {
        const kwh = createKilowattHourCharacteristic(api);
        if (!service.testCharacteristic(kwh)) {
            service.addCharacteristic(kwh);
        }
        service.getCharacteristic(kwh).onGet(createStatusGetter(accessory, totalSchema));
    }
}
function isUnit(schema, ...units) {
    return units.includes(schema.property.unit);
}
function createStatusGetter(accessory, schema, divisor = 1) {
    const property = schema.property;
    divisor *= Math.pow(10, property.scale);
    return () => {
        const status = accessory.getStatus(schema.code);
        return status.value / divisor;
    };
}
function createAmperesCharacteristic(api) {
    return class Amperes extends api.hap.Characteristic {
        static UUID = 'E863F126-079E-48FF-8F27-9C2605A29F52';
        constructor() {
            super('Amperes', Amperes.UUID, {
                format: "float" /* api.hap.Formats.FLOAT */,
                perms: ["ev" /* api.hap.Perms.NOTIFY */, "pr" /* api.hap.Perms.PAIRED_READ */],
                unit: 'A',
            });
        }
    };
}
function createWattsCharacteristic(api) {
    return class Watts extends api.hap.Characteristic {
        static UUID = 'E863F10D-079E-48FF-8F27-9C2605A29F52';
        constructor() {
            super('Consumption', Watts.UUID, {
                format: "float" /* api.hap.Formats.FLOAT */,
                perms: ["ev" /* api.hap.Perms.NOTIFY */, "pr" /* api.hap.Perms.PAIRED_READ */],
                unit: 'W',
            });
        }
    };
}
function createVoltsCharacteristic(api) {
    return class Volts extends api.hap.Characteristic {
        static UUID = 'E863F10A-079E-48FF-8F27-9C2605A29F52';
        constructor() {
            super('Volts', Volts.UUID, {
                format: "float" /* api.hap.Formats.FLOAT */,
                perms: ["ev" /* api.hap.Perms.NOTIFY */, "pr" /* api.hap.Perms.PAIRED_READ */],
                unit: 'V',
            });
        }
    };
}
function createKilowattHourCharacteristic(api) {
    return class KilowattHour extends api.hap.Characteristic {
        static UUID = 'E863F10C-079E-48FF-8F27-9C2605A29F52';
        constructor() {
            super('Total Consumption', KilowattHour.UUID, {
                format: "float" /* api.hap.Formats.FLOAT */,
                perms: ["ev" /* api.hap.Perms.NOTIFY */, "pr" /* api.hap.Perms.PAIRED_READ */],
                unit: 'kWh',
            });
        }
    };
}
//# sourceMappingURL=EnergyUsage.js.map