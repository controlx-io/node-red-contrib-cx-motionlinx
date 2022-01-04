"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const tools_1 = require("./tools");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const isDev = !!process.env["DEV"];
const configPath = isDev ?
    path.resolve(__dirname + "/../tests/slaves.json") : process.cwd() + '/slaves.json';
module.exports = function (RED) {
    let doesEtherCatExist = false;
    let currentMasterState = "";
    try {
        require.resolve("etherlab-nodejs");
        doesEtherCatExist = true;
    }
    catch (e) {
        console.log("NO 'etherlab-nodejs' module, using fake one.");
    }
    if (!fs.existsSync(configPath)) {
        const message = "NO 'slaves.json' file found in the Node-RED project directory." +
            "Create the json file and restart Node-RED.";
        currentMasterState = message;
        console.log(message);
        doesEtherCatExist = false;
    }
    const __etherlab = doesEtherCatExist ? require('etherlab-nodejs') : tools_1.Tools.fakeEthercat();
    const frequency_Hz = 5000;
    const ecatMaster = new __etherlab(configPath, frequency_Hz);
    const dataListeners = {};
    ecatMaster.on('state', setMasterState);
    ecatMaster.on("data", onData);
    ecatMaster.on('ready', () => setMasterState(tools_1.Tools.STATE.READY));
    ecatMaster.on('error', (error) => {
        setMasterState(tools_1.Tools.STATE.ERROR);
        console.error(error);
    });
    ecatMaster.start();
    function onData(data) {
        for (const pdoIn of data) {
            const pdoId = "0x" + pdoIn.index.toString(16) + ":" + pdoIn.subindex;
            const slavePdoId = pdoIn.position + ":" + pdoId;
            const listener = dataListeners[slavePdoId];
            if (listener && listener.counter && listener.value !== pdoIn.value) {
                listener.value = pdoIn.value;
                ecatMaster.emit("__DATA__" + slavePdoId, listener.value);
            }
        }
    }
    function setMasterState(stateInt) {
        currentMasterState = tools_1.Tools.convertState(stateInt);
        if (isDev)
            console.log("Master's state", currentMasterState);
        ecatMaster.emit("__M_STATE__", currentMasterState);
    }
    function setMasterStateToNode(node) {
        node.status({
            shape: "dot",
            fill: "red",
            text: currentMasterState.toString()
        });
    }
    function isMasterValidState() {
        return currentMasterState === tools_1.Tools.STATE[tools_1.Tools.STATE.OP] ||
            currentMasterState === tools_1.Tools.STATE[tools_1.Tools.STATE.READY];
    }
    function getValueFromSlave(positionId, slaveIndex) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield ecatMaster.getValues();
                const io = data.find((io) => io.position === positionId && io.index === slaveIndex);
                return io ? io.value : undefined;
            }
            catch (e) {
                return e.message || e;
            }
        });
    }
    function motorRun(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        function handleIncomingMessage(msg) {
            if (!Array.isArray(msg.payload))
                msg.payload = [msg.payload];
            let status = "";
            for (const command of msg.payload) {
                status += controlMotor(command) + ' | ';
            }
            return status.slice(0, -3);
        }
        function controlMotor(payload) {
            const positionId = parsePositiveInteger(payload.controller, "controller");
            const isMotorRight = isRightMotor(payload.motor);
            const motorSide = isMotorRight ? "R" : "L";
            const isRunRequest = payload.run;
            if (isMasterValidState()) {
                const runIndex = isMotorRight ? 0x200c : 0x2000;
                const speedIndex = isMotorRight ? 0x2002 : 0x2001;
                if ((typeof isRunRequest === "boolean" && !isRunRequest) || payload.speed === 0) {
                    let ret = ecatMaster.write(positionId, runIndex, 0, 0);
                    if (ret === -1)
                        throw new Error(`'Run' was NOT written correctly to ` +
                            `${positionId}@0x${runIndex.toString(16)}`);
                    ret = ecatMaster.write(positionId, speedIndex, 0, 0);
                    if (ret === -1)
                        throw new Error(`'Speed' was NOT written correctly to ` +
                            `${positionId}@0x${speedIndex.toString(16)}`);
                    return `${positionId}${motorSide}:S`;
                }
                const speedSetpoint = parseInteger(payload.speed, "speed");
                const speedValue = Math.abs(speedSetpoint);
                let ret = ecatMaster.write(positionId, speedIndex, 0, speedValue);
                if (ret === -1)
                    throw new Error(`'Speed' was NOT written correctly to ` +
                        `${positionId}@0x${speedIndex.toString(16)}`);
                let val = 1;
                if (speedSetpoint < 0)
                    val = tools_1.Tools.setBit(val, 1);
                else
                    val = tools_1.Tools.clearBit(val, 1);
                ret = ecatMaster.write(positionId, runIndex, 0, val);
                if (ret === -1)
                    throw new Error(`'Run' was NOT written correctly to ` +
                        `${positionId}@0x${runIndex.toString(16)}`);
                return `${positionId}${motorSide}:${speedSetpoint}R`;
            }
            else {
                let sts = "";
                if ((typeof isRunRequest === "boolean" && !isRunRequest) || payload.speed === 0) {
                    sts = `${positionId}${motorSide}:S`;
                }
                else
                    sts = `${positionId}${motorSide}:${payload.speed}R`;
                node.warn(sts + " unsuccessful. Master is NOT ready (" + currentMasterState + ")");
                if (isDev)
                    console.log("node:", config.name || node.id, JSON.stringify(payload));
                return sts;
            }
        }
        node.on("input", (msg) => {
            try {
                const nodeStatus = handleIncomingMessage(msg);
                if (nodeStatus)
                    node.status({ text: nodeStatus });
            }
            catch (e) {
                node.warn("ERROR: " + e.message);
            }
        });
    }
    function getSetParam(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        function handleInputMessage(msg) {
            return __awaiter(this, void 0, void 0, function* () {
                const param = parsePositiveInteger(msg.payload.param, "param");
                const positionId = msg.payload.controller ?
                    parsePositiveInteger(msg.payload.controller, "payload.controller") :
                    parsePositiveInteger(config.controller, "config.controller");
                let value;
                if (msg.payload.method === "get") {
                    if (isMasterValidState()) {
                        value = yield getValueFromSlave(positionId, param);
                    }
                    else {
                        node.warn("Master is not in READY state, got " + currentMasterState);
                    }
                    node.status({ text: `GET ${positionId}:0x${param.toString(16)}` });
                    return value;
                }
                else if (msg.payload.method === "set") {
                    const value = parseInteger(msg.payload.value, "value");
                    if (isMasterValidState()) {
                        const ret = ecatMaster.write(positionId, param, 0, value);
                        if (ret === -1)
                            throw new Error("Error on writing to Slave");
                    }
                    else {
                        node.warn("Master is not in READY state, got " + currentMasterState);
                    }
                    node.status({ text: `SET ${positionId}:0x${param.toString(16)}:${value}` });
                    return value;
                }
                else {
                    throw new Error("unsuported method, must be 'get' or 'set', got " + msg.payload.method);
                }
            });
        }
        node.on("input", (msg) => __awaiter(this, void 0, void 0, function* () {
            try {
                node.send({
                    payload: yield handleInputMessage(msg),
                    topic: msg.topic
                });
            }
            catch (e) {
                node.warn("ERROR: " + e.message);
            }
        }));
    }
    function deviceStatus(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const deviceType = {
            master: "master",
            controller: "controller"
        };
        let slavePdoId = "";
        if (config.device === deviceType.master) {
            ecatMaster.on('__M_STATE__', masterStatus);
        }
        else if (config.device === deviceType.controller) {
            try {
                const pdoId = config.index + ":0";
                const positionId = parsePositiveInteger(config.controller, "config.controller");
                slavePdoId = positionId + ":" + pdoId;
                if (!dataListeners[slavePdoId])
                    dataListeners[slavePdoId] = { counter: 1 };
                else
                    dataListeners[slavePdoId].counter++;
                console.log(slavePdoId, dataListeners);
                ecatMaster.on("__DATA__" + slavePdoId, deviceData);
            }
            catch (e) {
                node.warn("ERROR: " + e.message);
            }
        }
        function masterStatus(status) {
            node.status({ text: status });
            node.send({
                payload: status,
                topic: "master"
            });
        }
        function deviceData(data) {
            node.send({
                payload: data,
                topic: slavePdoId
            });
        }
        node.on('close', (done) => {
            if (isDev)
                console.log("Closing node:", config.name || node.id);
            if (config.device === deviceType.master) {
                ecatMaster.removeListener('__M_STATE__', masterStatus);
            }
            else if (config.device === deviceType.controller) {
                dataListeners[slavePdoId].counter--;
                ecatMaster.removeListener('__DATA__', deviceData);
            }
            done();
        });
    }
    RED.nodes.registerType("motionlinx_run", motorRun);
    RED.nodes.registerType("motionlinx_param", getSetParam);
    RED.nodes.registerType("motionlinx_status", deviceStatus);
};
function isRightMotor(motor) {
    if (![0, 1].includes(motor))
        throw new Error("'motor' prop must be 0 or 1, got " + motor);
    return !!motor;
}
function parsePositiveInteger(position, propName) {
    const positionId = Number(position);
    if (!Number.isInteger(positionId) || positionId < 0)
        throw new Error(`'${propName}' prop must be 0 or positive ` +
            "number, got " + position);
    return positionId;
}
function parseInteger(value, propName) {
    const setValue = Number(value);
    if (!Number.isInteger(setValue))
        throw new Error(`'${propName}' prop must be an integer, ` +
            "got " + value);
    return setValue;
}
//# sourceMappingURL=cx_motionlinx.js.map