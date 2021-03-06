"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.motionLinxConfig = exports.Tools = void 0;
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
            constructor() {
                this.isFake = true;
            }
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
exports.motionLinxConfig = {
    "alias": 0,
    "position": 0,
    "vendor_id": "0x00000049",
    "product_code": "0x00000491",
    "syncs": [
        {
            "index": 2,
            "watchdog_enabled": true,
            "pdos": [
                {
                    "index": "0x1600",
                    "entries": [
                        {
                            "index": "0x2000",
                            "subindex": "0x00",
                            "size": 8,
                            "name": "MDRCtrlLeft",
                            "add_to_domain": true,
                            "swap_endian": true,
                            "signed": false
                        },
                        {
                            "index": "0x200c",
                            "subindex": "0x00",
                            "size": 8,
                            "name": "MDRCtrlRight",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        },
                        {
                            "index": "0x2001",
                            "subindex": "0x00",
                            "size": 16,
                            "name": "SpeedLeft",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        },
                        {
                            "index": "0x2002",
                            "subindex": "0x00",
                            "size": 16,
                            "name": "SpeedRight",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        },
                        {
                            "index": "0x200f",
                            "subindex": "0x00",
                            "size": 8,
                            "name": "BrakeModeLeft",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        },
                        {
                            "index": "0x2010",
                            "subindex": "0x00",
                            "size": 8,
                            "name": "BrakeModeRight",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        }
                    ]
                },
                {
                    "index": "0x1601",
                    "entries": [
                        {
                            "index": "0x2003",
                            "subindex": "0x00",
                            "size": 16,
                            "name": "AccelLeft",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        },
                        {
                            "index": "0x2004",
                            "subindex": "0x00",
                            "size": 16,
                            "name": "DecelLeft",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        },
                        {
                            "index": "0x2005",
                            "subindex": "0x00",
                            "size": 16,
                            "name": "AccelRight",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        },
                        {
                            "index": "0x2006",
                            "subindex": "0x00",
                            "size": 16,
                            "name": "DecelRight",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        }
                    ]
                },
                {
                    "index": "0x1602",
                    "entries": [
                        {
                            "index": "0x2007",
                            "subindex": "0x00",
                            "size": 16,
                            "name": "ServoCtrl",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        },
                        {
                            "index": "0x2008",
                            "subindex": "0x00",
                            "size": 16,
                            "name": "ServoLeft",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        },
                        {
                            "index": "0x2009",
                            "subindex": "0x00",
                            "size": 16,
                            "name": "ServoRight",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        },
                        {
                            "index": "0x2011",
                            "subindex": "0x00",
                            "size": 8,
                            "name": "WritePin2Output",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        },
                        {
                            "index": "0x2012",
                            "subindex": "0x00",
                            "size": 8,
                            "name": "ClearMotorError",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        }
                    ]
                }
            ]
        },
        {
            "index": 3,
            "watchdog_enabled": false,
            "pdos": [
                {
                    "index": "0x1a00",
                    "entries": [
                        {
                            "index": "0x3000",
                            "subindex": "0x00",
                            "size": 16,
                            "name": "AllSensors",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        },
                        {
                            "index": "0x3001",
                            "subindex": "0x00",
                            "size": 8,
                            "name": "ServoStateL",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        },
                        {
                            "index": "0x3006",
                            "subindex": "0x00",
                            "size": 8,
                            "name": "ServoStateR",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        },
                        {
                            "index": "0x3002",
                            "subindex": "0x00",
                            "size": 16,
                            "name": "PositionLeft",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        },
                        {
                            "index": "0x3003",
                            "subindex": "0x00",
                            "size": 16,
                            "name": "PositionRight",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        }
                    ]
                },
                {
                    "index": "0x1a01",
                    "entries": [
                        {
                            "index": "0x3004",
                            "subindex": "0x00",
                            "size": 16,
                            "name": "DiagnosticLeft",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        },
                        {
                            "index": "0x3005",
                            "subindex": "0x00",
                            "size": 16,
                            "name": "DiagnosticRight",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        },
                        {
                            "index": "0x3013",
                            "subindex": "0x00",
                            "size": 8,
                            "name": "SystemDiagnostic",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        },
                        {
                            "index": "0x3014",
                            "subindex": "0x00",
                            "size": 8,
                            "name": "Reserved1",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        },
                        {
                            "index": "0x3015",
                            "subindex": "0x00",
                            "size": 16,
                            "name": "Reserved2",
                            "add_to_domain": true,
                            "swap_endian": false,
                            "signed": false
                        }
                    ]
                }
            ]
        }
    ]
};
//# sourceMappingURL=tools.js.map