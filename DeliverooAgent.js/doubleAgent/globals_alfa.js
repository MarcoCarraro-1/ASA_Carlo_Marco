export let DEL_CELLS = []; //cells where we can deliver
export let ARRIVED_TO_TARGET = false;
export let MAP = [];
export let DELIVERED = true;
export let BETA_ID;
export let BETA_NAME;
export let PDDL = false;
export let PARCEL_DECADING_INTERVAL;

export function setMap(map){
    MAP = map;
    // console.log("MAP", MAP);
}

export function setArrivedToTarget(value) {
    ARRIVED_TO_TARGET = value;
}

export function setDelivered(value) {
    DELIVERED = value;
}

export function setBetaInfo(id, name){
    BETA_ID = id;
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