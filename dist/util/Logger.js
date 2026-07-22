"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrefixLogger = void 0;
class PrefixLogger {
    log;
    prefix;
    debugMode;
    constructor(log, prefix, debugMode = false) {
        this.log = log;
        this.prefix = prefix;
        this.debugMode = debugMode;
        this.debugMode = this.debugMode || process.argv.includes('-D') || process.argv.includes('--debug');
    }
    debug(message, ...args) {
        if (this.debugMode) {
            this.log.info((this.prefix ? `[${this.prefix}] ` : '') + message, ...args);
        }
        else {
            this.log.debug((this.prefix ? `[${this.prefix}] ` : '') + message, ...args);
        }
    }
    info(message, ...args) {
        this.log.info((this.prefix ? `[${this.prefix}] ` : '') + message, ...args);
    }
    warn(message, ...args) {
        this.log.warn((this.prefix ? `[${this.prefix}] ` : '') + message, ...args);
    }
    error(message, ...args) {
        this.log.error((this.prefix ? `[${this.prefix}] ` : '') + message, ...args);
    }
}
exports.PrefixLogger = PrefixLogger;
//# sourceMappingURL=Logger.js.map