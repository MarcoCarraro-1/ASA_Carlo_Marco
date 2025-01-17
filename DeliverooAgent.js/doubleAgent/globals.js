export let DEL_CELLS = []; //cells where we can deliver
export let ARRIVED_TO_TARGET = false;
export let MAP = [];
export let DELIVERED = true;
export let PDDL = false;
export let PARCEL_DECADING_INTERVAL;
export let BOND_MESSAGE = "I'm the Alfa agent, Beta tell me your id";
export let MESSAGE_RECEIVED = false;
export let DOUBLE_AGENT = false;
export let ATTEMPT_COUNTER = { countAttempts: 0};
export let RESPONSE = "no response";
export let DOUBLE = {id: null, pos: null, parcels: null};

export function setMap(map){
    MAP = map;
    // console.log("MAP", MAP);
}

export function rotateDeliveryCells()
{
    DEL_CELLS = [DEL_CELLS[DEL_CELLS.length-1], ...DEL_CELLS.slice(0, DEL_CELLS.length-1)];
    console.log("rotated DEL_CELLS: ", DEL_CELLS);
}
export function setArrivedToTarget(value) {
    ARRIVED_TO_TARGET = value;
}

export function setDelivered(value) {
    DELIVERED = value;
}

export function setBetaName(name){
    BETA_NAME = name;
}

export function setPDDL(value){
    PDDL = value;
}

export function setParcelDecadingInterval(value){
    switch(value) {
        case "1s":
            PARCEL_DECADING_INTERVAL = 1;
            break;
        case "2s":
            PARCEL_DECADING_INTERVAL = 2;
            break;
        case "5s":
            PARCEL_DECADING_INTERVAL = 5;
            break;
        case "10s":
            PARCEL_DECADING_INTERVAL = 10;
            break;
        case "infinite":
            PARCEL_DECADING_INTERVAL = Infinity;
            break;
        default:
            console.warn("Unknown decaying timer action:", value);
    }
}

export function setMessageReceived(value){
    MESSAGE_RECEIVED = value;
}

export function setDoubleId(value){
    DOUBLE.id = value;
}

export function setDoubleParcels(value){
    DOUBLE.parcels = value;
}

export function setDoublePos(value){
    DOUBLE.pos = value;
}
export function setDoubleAgent(value){
    DOUBLE_AGENT = value;
}

export function setResponse(value){
    RESPONSE = value;
}