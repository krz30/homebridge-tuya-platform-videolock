"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util/util");
const BaseAccessory_1 = __importDefault(require("./BaseAccessory"));
const CurrentTemperature_1 = require("./characteristic/CurrentTemperature");
const TemperatureDisplayUnits_1 = require("./characteristic/TemperatureDisplayUnits");
const Light_1 = require("./characteristic/Light");
const SCHEMA_CODE = {
    ON: ['powerswitch'],
    CURRENT_TEMP: ['currtemp', 'settemp'],
    TARGET_TEMP: ['settemp'],
    TEMP_UNIT_CONVERT: ['temp_unit_convert', 'c_f'],
    LIGHT: ['lightswitch'],
    LED: ['ledswitch'],
    // TIMER: ['settime'], // Not currently supppored by homekit
};
class SaunaAccessory extends BaseAccessory_1.default {
    requiredSchema() {
        return [SCHEMA_CODE.CURRENT_TEMP, SCHEMA_CODE.TARGET_TEMP];
    }
    configureServices() {
        this.configureCurrentState();
        this.configureTargetState();
        (0, CurrentTemperature_1.configureCurrentTemperature)(this, this.mainService(), this.getSchema(...SCHEMA_CODE.CURRENT_TEMP));
        this.configureTargetTemp();
        (0, TemperatureDisplayUnits_1.configureTempDisplayUnits)(this, this.mainService(), this.getSchema(...SCHEMA_CODE.TEMP_UNIT_CONVERT));
        this.configureLight();
    }
    mainService() {
        return this.accessory.getService(this.Service.Thermostat)
            || this.accessory.addService(this.Service.Thermostat);
    }
    configureCurrentState() {
        const { OFF, HEAT } = this.Characteristic.CurrentHeatingCoolingState;
        this.mainService().getCharacteristic(this.Characteristic.CurrentHeatingCoolingState)
            .onGet(() => {
            const on = this.getStatus('powerswitch');
            if (on && on.value === false) {
                return OFF;
            }
            else {
                return HEAT;
            }
        });
    }
    configureTargetState() {
        const { OFF, HEAT } = this.Characteristic.TargetHeatingCoolingState;
        this.mainService().getCharacteristic(this.Characteristic.TargetHeatingCoolingState)
            .onGet(() => {
            const on = this.getStatus('powerswitch');
            if (on && on.value === false) {
                return OFF;
            }
            else {
                return HEAT;
            }
        })
            .onSet(async (value) => {
            const commands = [];
            if (value === OFF) {
                commands.push({
                    code: 'powerswitch',
                    value: false,
                });
            }
            else if (value === HEAT) {
                commands.push({
                    code: 'powerswitch',
                    value: true,
                });
            }
            if (commands.length !== 0) {
                await this.sendCommands(commands);
            }
        })
            .setProps({ validValues: [OFF, HEAT] });
    }
    configureTargetTemp() {
        const schema = this.getSchema(...SCHEMA_CODE.TARGET_TEMP);
        if (!schema) {
            this.log.warn('TargetTemperature not supported.');
            return;
        }
        const property = schema.property;
        let multiple = Math.pow(10, property.scale);
        let props = {
            minValue: Math.max(30, property.min / multiple),
            maxValue: Math.min(90, property.max / multiple),
            minStep: Math.max(0.1, property.step / multiple),
        };
        if (props.maxValue <= props.minValue) {
            this.log.warn('Invalid schema: %o, props will be reset to the default value.', schema);
            multiple = 1;
            props = { minValue: 30, maxValue: 90, minStep: 1 };
        }
        this.log.debug('Set props for TargetTemperature:', props);
        this.mainService().getCharacteristic(this.Characteristic.TargetTemperature)
            .onGet(() => {
            const status = this.getStatus(schema.code);
            if (!status || typeof status.value !== 'number') {
                this.log.debug('No valid settemp available, returning default.');
                return props.minValue; // or any fallback value like 45
            }
            const temp = status.value / multiple;
            return (0, util_1.limit)(temp, props.minValue, props.maxValue);
        })
            .onSet(async (value) => {
            await this.sendCommands([{
                    code: schema.code,
                    value: value * multiple,
                }]);
        })
            .setProps(props);
    }
    configureLight() {
        const lightswitchSchema = this.getSchema('lightswitch');
        const ledswitchSchema = this.getSchema('ledswitch');
        const light1Service = this.accessory.getService('Sauna Main Light') ||
            this.accessory.addService(this.Service.Lightbulb, 'Sauna Main Light', 'lightswitch');
        const light2Service = this.accessory.getService('Sauna LED Light') ||
            this.accessory.addService(this.Service.Lightbulb, 'Sauna LED Light', 'ledswitch');
        if (lightswitchSchema) {
            (0, Light_1.configureLight)(this, light1Service, lightswitchSchema);
        }
        if (ledswitchSchema) {
            (0, Light_1.configureLight)(this, light2Service, ledswitchSchema);
        }
    }
}
exports.default = SaunaAccessory;
//# sourceMappingURL=SaunaAccessory.js.map