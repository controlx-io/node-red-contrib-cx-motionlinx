import {Node, NodeRedApp} from "node-red";
import {Tools} from "./tools";
import * as path from "path";

const isDev = !!process.env["DEV"];
const configPath = isDev ?
    path.resolve(__dirname + "../tests/slaves.json") : process.cwd() + '/slaves.json';


interface IMotionLinxValue {
    value: number;
    position: number;
    subindex: number;
    index: number;

}

interface IPdoListener {
    counter: number,
    value?: number
}

interface INodeConfig {
    name: string;

}

interface IGetSetConfig {
    controller: number;
}

interface IDeviceStatusConfig {
    name: string;
    controller: number;
    index: string;
    device: string;
}

module.exports = function (RED: NodeRedApp) {

    let doesEtherCatExist = false;
    try {
        require.resolve("etherlab-nodejs");
        doesEtherCatExist = true;
    } catch (e) {
        console.log("NO 'etherlab-nodejs' module, using fake one.");
    }

    const __etherlab = doesEtherCatExist ? require('etherlab-nodejs') : Tools.fakeEthercat();
    const frequency_Hz = 5000;

    const ecatMaster = new __etherlab(configPath, frequency_Hz);
    let currentMasterState: string | number = "";
    const dataListeners: {[slavePdoId: string]: IPdoListener } = {};


    ecatMaster.on('state', setMasterState);
    ecatMaster.on("data", onData);
    ecatMaster.on('ready', () => setMasterState(Tools.STATE.READY));
    ecatMaster.on('error', (error: Error) => {
        setMasterState(Tools.STATE.ERROR);
        console.error(error);
    });

    ecatMaster.start();


    function onData(data: IMotionLinxValue[]) {
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

    function setMasterState(stateInt: number | string) {
        currentMasterState = Tools.convertState(stateInt);

        if (isDev) console.log("Master's state", currentMasterState);
        ecatMaster.emit("__M_STATE__", currentMasterState);
    }

    function setMasterStateToNode(node: Node) {
        node.status({
            shape: "dot",
            fill: "red",
            text: currentMasterState.toString()
        })
    }

    function isMasterValidState() {
        return currentMasterState === Tools.STATE[Tools.STATE.OP] ||
            currentMasterState === Tools.STATE[Tools.STATE.READY]
    }

    async function getValueFromSlave(positionId: number, slaveIndex: number) {
        try {
            const data = await ecatMaster.getValues();
            const io = data.find((io: IMotionLinxValue) => io.position === positionId && io.index === slaveIndex);
            return io ? io.value : undefined;
        } catch (e) {
            return e.message || e
        }
    }


    /**
     *
     *  ========== Motor Run Node ===========
     *
     */

    function motorRun(config: INodeConfig) {
        // @ts-ignore
        RED.nodes.createNode(this, config);
        const node = this;


        function handleIncomingMessage(msg: any) {
            if (!Array.isArray(msg.payload)) msg.payload = [msg.payload];

            let status = ""
            for (const command of msg.payload) {
                status += controlMotor(command) + ' | ';
            }
            return status.slice(0, -3);
        }


        function controlMotor(payload: any) {
            const positionId = parsePositiveInteger(payload.controller, "controller");
            const isMotorRight = isRightMotor(payload.motor);
            const motorSide = isMotorRight ? "R" : "L";

            const isRunRequest = payload.run;

            if (isMasterValidState()) {
                const runIndex = isMotorRight ? 0x200c : 0x2000;
                const speedIndex = isMotorRight ? 0x2002 : 0x2001;

                if ((typeof isRunRequest === "boolean" && !isRunRequest) || payload.speed === 0) {
                    let ret = ecatMaster.write(positionId, runIndex, 0, 0);
                    if (ret === -1) throw new Error(`'Run' was NOT written correctly to ` +
                        `${positionId}@0x${runIndex.toString(16)}`);

                    ret = ecatMaster.write(positionId, speedIndex, 0, 0);
                    if (ret === -1) throw new Error(`'Speed' was NOT written correctly to ` +
                        `${positionId}@0x${speedIndex.toString(16)}`);

                    return `${positionId}${motorSide}:S`;
                }

                const speedSetpoint = parseInteger(payload.speed, "speed");
                const speedValue = Math.abs(speedSetpoint);


                let ret = ecatMaster.write(positionId, speedIndex, 0, speedValue);
                if (ret === -1) throw new Error(`'Speed' was NOT written correctly to ` +
                    `${positionId}@0x${speedIndex.toString(16)}`);

                // set to RUN
                let val = 1;
                // set DIRECTION: CW or CCW
                if (speedSetpoint < 0) val = Tools.setBit(val, 1);
                else val = Tools.clearBit(val, 1);

                ret = ecatMaster.write(positionId, runIndex, 0, val);
                if (ret === -1) throw new Error(`'Run' was NOT written correctly to ` +
                    `${positionId}@0x${runIndex.toString(16)}`);

                return `${positionId}${motorSide}:${speedSetpoint}R`;
            } else {
                let sts = "";

                if ((typeof isRunRequest === "boolean" && !isRunRequest) || payload.speed === 0) {
                    sts = `${positionId}${motorSide}:S`;
                } else sts = `${positionId}${motorSide}:${payload.speed}R`;

                node.warn(sts + " unsuccessful. Master is NOT ready (" + currentMasterState + ")");
                // setMasterStateToNode(node);
                if (isDev) console.log("node:", config.name || node.id, JSON.stringify(payload));
                return sts
            }
        }

        node.on("input", (msg: any) => {
            try {
                const nodeStatus = handleIncomingMessage(msg);
                if (nodeStatus) node.status({text: nodeStatus});
            } catch (e) {
                node.warn("ERROR: " + e.message);
            }
        });
    }



    /**
     *
     *  ========== Get/Set Param ===========
     *
     */


    function getSetParam(config: IGetSetConfig) {
        // @ts-ignore
        RED.nodes.createNode(this, config);
        const node = this;


        async function handleInputMessage(msg: any) {

            const param = parsePositiveInteger(msg.payload.param, "param");
            const positionId = msg.payload.controller ?
                parsePositiveInteger(msg.payload.controller, "payload.controller") :
                parsePositiveInteger(config.controller, "config.controller");

            let value;

            if (msg.payload.method === "get") {
                if (isMasterValidState()) {
                    value = await getValueFromSlave(positionId, param);
                } else {
                    node.warn("Master is not in READY state, got " + currentMasterState);
                    // setMasterStateToNode(node)
                }

                node.status({text: `GET ${positionId}:0x${param.toString(16)}`});
                return value;

            } else if (msg.payload.method === "set") {

                const value = parseInteger(msg.payload.value, "value");

                if (isMasterValidState()) {
                    const ret = ecatMaster.write(positionId, param, 0, value);
                    if (ret === -1) throw new Error("Error on writing to Slave");
                } else {
                    node.warn("Master is not in READY state, got " + currentMasterState);
                    // setMasterStateToNode(node)
                }

                node.status({text: `SET ${positionId}:0x${param.toString(16)}:${value}`});
                return value;
            } else {
                throw new Error("unsuported method, must be 'get' or 'set', got " + msg.payload.method);
            }
        }



        node.on("input", async (msg: any) => {
            try {
                node.send({
                    payload: await handleInputMessage(msg),
                    topic: msg.topic
                })
            } catch (e) {
                node.warn("ERROR: " + e.message);
            }
        });

        // node.on('close', done => {
        //     if (isDev) console.log("Closing node:", config.name || node.id)
        //     done();
        // });
    }


    function deviceStatus(config: IDeviceStatusConfig) {
        // @ts-ignore
        RED.nodes.createNode(this, config);
        const node: Node = this;
        const deviceType = {
            master: "master",
            controller: "controller"
        }
        let slavePdoId = "";


        if (config.device === deviceType.master) {
            ecatMaster.on('__M_STATE__', masterStatus);
        } else if (config.device === deviceType.controller) {
            try {
                const pdoId = config.index + ":0";
                const positionId = parsePositiveInteger(config.controller, "config.controller");
                slavePdoId = positionId + ":" + pdoId;

                if (!dataListeners[slavePdoId]) dataListeners[slavePdoId] = {counter: 1};
                else dataListeners[slavePdoId].counter++;

                console.log(slavePdoId, dataListeners);

                ecatMaster.on("__DATA__" + slavePdoId, deviceData);
            } catch (e) {
                node.warn("ERROR: " + e.message);
            }
        }

        function masterStatus(status: string) {
            node.status({text: status})
            node.send({
                payload: status,
                topic: "master"
            })
        }

        function deviceData(data: number) {
            node.send({
                payload: data,
                topic: slavePdoId
            })
        }


        node.on('close', (done: () => void) => {
            if (isDev) console.log("Closing node:", config.name || node.id)

            if (config.device === deviceType.master) {
                ecatMaster.removeListener('__M_STATE__', masterStatus);
            } else if (config.device === deviceType.controller) {
                dataListeners[slavePdoId].counter--;
                ecatMaster.removeListener('__DATA__', deviceData);
            }
            done();
        });
    }




    // @ts-ignore
    RED.nodes.registerType("motionlinx_run", motorRun);
    // @ts-ignore
    RED.nodes.registerType("motionlinx_param", getSetParam);
    // @ts-ignore
    RED.nodes.registerType("motionlinx_status", deviceStatus);
};




function isRightMotor(motor: number): boolean {
    if (![0, 1].includes(motor)) throw new Error("'motor' prop must be 0 or 1, got " + motor);
    return !!motor
}

function parsePositiveInteger(position: number, propName: string): number {
    const positionId = Number(position);
    if (!Number.isInteger(positionId) || positionId < 0) throw new Error(`'${propName}' prop must be 0 or positive ` +
        "number, got " + position);
    return positionId
}

function parseInteger(value: number, propName: string): number {
    const setValue = Number(value);
    if (!Number.isInteger(setValue)) throw new Error(`'${propName}' prop must be an integer, ` +
        "got " + value);
    return setValue
}
