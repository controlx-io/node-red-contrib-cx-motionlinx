"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tools = void 0;
class Tools {
    static convertState(stateNumber) {
        const state = Tools.STATE[stateNumber];
        return state || `UNKNOWN:${stateNumber}`;
    }
    static testBit(integer, bitPosition) {
        return ((integer >> bitPosition) % 2 !== 0) ? 1 : 0;
    }
    static setBit(integer, bitPosition) {
        return integer | (1 << bitPosition);
    }
    static clearBit(integer, bitPosition) {
        return integer & ~(1 << bitPosition);
    }
    static fakeEthercat() {
        class Fake {
            constructor() { }
            on() { }
            start() { }
        }
        return Fake;
    }
}
exports.Tools = Tools;
Tools.STATE = {
    1: "INIT",
    INIT: 1,
    2: "PREOP",
    PREOP: 2,
    4: "SAFEOP",
    SAFEOP: 4,
    8: "OP",
    OP: 8,
    998: "READY",
    READY: 998,
    999: "ERROR",
    ERROR: 999,
};
//# sourceMappingURL=tools.js.map