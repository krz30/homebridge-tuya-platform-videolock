"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SwitchAccessory_1 = __importDefault(require("./SwitchAccessory"));
class OutletAccessory extends SwitchAccessory_1.default {
    mainService() {
        return this.Service.Outlet;
    }
}
exports.default = OutletAccessory;
//# sourceMappingURL=OutletAccessory.js.map