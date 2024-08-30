export let DEL_CELLS = []; //cells where we can deliver
export let ARRIVED_TO_TARGET = false;
export let MAP = [];
export let DELIVERED = true;
export let BETA_ID;
export let BETA_NAME;

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