export class Tools {
    static STATE: {[key: string | number]: string | number} = {
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
    }

    static convertState(stateNumber: number | string) {
        const state = Tools.STATE[stateNumber];
        return state ||  `UNKNOWN:${stateNumber}`;
    }

    static testBit(integer: number, bitPosition: number) {
        return ((integer >> bitPosition) % 2 !== 0) ? 1 : 0;
    }

    static setBit(integer: number, bitPosition: number) {
        return integer | (1 << bitPosition);
    }

    static clearBit(integer: number, bitPosition: number) {
        return integer & ~(1 << bitPosition);
    }

    static fakeEthercat() {
        class Fake {
            constructor() {}
            on() {}
            start() {}
        }

        return Fake
    }
}