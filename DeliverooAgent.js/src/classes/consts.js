class Consts {
    constructor() {

        this.DEBUG = false;
        this.PRINT_PATH = false && this.DEBUG;
        this.PRINT_MOVES = false && this.DEBUG;
        this.PRINT_STATUS = false && this.DEBUG;
        this.PRINT_PDDL_DOMAIN_AND_PROBLEM = false && this.DEBUG;    
        this.PRINT_PDDL_PLAN = false && this.DEBUG;
         
        this.SECRET_KEY = "ebrFarbsvw99Fi7Gd9lF5nYto0ClVXdE";

        this.MAX_TRIES_BEFORE_RECALCULATING_PLAN = 4;
        this.MAX_PARCELS_ON_YOU = 4;
        this.TIMER_FOR_SENDING_AGENTS_AND_PARCELS = 2000;
        this.TIMER_FOR_SENDING_COMMANDS_AND_ORDERS = 2000;

        this.PARCEL_DECADING_INTERVAL;
        this.MOVEMENT_DURATION;
        this.MOVEMENT_STEPS;
        this.CLOCK;
        
        this.lastTimeMessageWasSent = Date.now();
        this.lastTimeCommandAndOrderWereSent = Date.now();

        this.proibited_going_x = -1;
        this.proibited_going_y = -1;

        this.possibleStates = {
            EXPLORE_MAP: 0,
            REACH_CLOSER_PARCEL: 1,
            REACH_CLOSER_DELIVERY_POINT: 2,
        }

        this.possibleMessages = {
            ASK_LOCATION: "ASK-LOCATION",
            SEND_LOCATION: "SEND-LOCATION",
            SENDING_DATA: "SENDING-DATA",
            GO_TO_DIFFERENT_LOCATION: "GO-TO-DIFFERENT-LOCATION",
            DO_NOT_CHANGE_LOCATION: "DO-NOT-CHANGE-LOCATION",
            HANDSHAKE_REQUEST: "HANDSHAKE-REQUEST",
            HANDSHAKE_REPLY: "HANDSHAKE-REPLY",
            HANDSHAKE_FINAL: "HANDSHAKE-FINAL",

        }
    }
    printStatus(status) {
        for (let [key, value] of Object.entries(this.possibleStates)) {
            if (value === status) {
                console.log(`STATUS: ${key} (${value})`);
                return;
            }
        }
        console.log('Unknown status:', status);
    }
    isDecayingActive() {
        return this.PARCEL_DECADING_INTERVAL !== "infinite";
    }
    
}

let consts = new Consts();
export { consts };
