export let DEL_CELLS = []; //cells where we can deliver
export let ARRIVED_TO_TARGET = false;
export let MAP = [];
export let PDDL = false;
export let PARCEL_DECADING_INTERVAL;
export let DOUBLE_AGENT = false;
export let ATTEMPT_COUNTER = { countAttempts: 0}; //counter for the number of attempts to do a single movement
export let BOND_MESSAGE = "I'm the Alfa agent, Beta tell me your id";
export let I_GOT_TARGET_RESPONSE = false;
export let TARGET_RESPONSE = "no target";
export let BLOCKED_RESPONSE = false;
export let DOUBLE = {id: null, pos: null, parcels: null};

export function setMap(map){
    MAP = map;
    // console.log("MAP", MAP);
}

export function rotateDeliveryCells()
{
    DEL_CELLS = [DEL_CELLS[DEL_CELLS.length-1], ...DEL_CELLS.slice(0, DEL_CELLS.length-1)];
    // console.log("rotated DEL_CELLS: ", DEL_CELLS);
}
export function setArrivedToTarget(value) {
    ARRIVED_TO_TARGET = value;
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
    // console.log("Response in setResponse: ", value);
    if(value !== undefined && value.includes("target parcel"))
    {
        TARGET_RESPONSE = value;
    }
    else if(value !== undefined && value.includes("blocked"))
    {
        BLOCKED_RESPONSE = value;
    }
    else
    {
        switch(value) 
        {
            case "i have a target":
                I_GOT_TARGET_RESPONSE = true;
                break;
            case "i don't have a target":
                I_GOT_TARGET_RESPONSE = false;
                break;
            case "no target assigned":
                TARGET_RESPONSE = "no target assigned";
                break;
            case "sblocked":
                BLOCKED_RESPONSE = false;
                break;
            case "bonded":
                break;
            default:
                console.warn("Error in response:", value);
        }
    }
}