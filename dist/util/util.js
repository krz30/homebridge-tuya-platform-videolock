"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remap = remap;
exports.limit = limit;
function remap(value, srcStart, srcEnd, dstStart, dstEnd) {
    const percent = (value - srcStart) / (srcEnd - srcStart);
    const result = percent * (dstEnd - dstStart) + dstStart;
    return result;
}
function limit(value, start, end) {
    let result = value;
    result = Math.min(end, result);
    result = Math.max(start, result);
    return result;
}
//# sourceMappingURL=util.js.map