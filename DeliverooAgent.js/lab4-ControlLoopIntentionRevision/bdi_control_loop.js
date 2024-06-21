import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

const client = new DeliverooApi(
    'http://localhost:8080',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA5ZmQ2NDllNzZlIiwibmFtZSI6Im1hcmNvIiwiaWF0IjoxNjc5OTk3Njg2fQ.6_zmgL_C_9QgoOX923ESvrv2i2_1bgL_cWjMw4M7ah4'
)

function distance( {x:x1, y:y1}, {x:x2, y:y2}) {
    const dx = Math.abs( Math.round(x1) - Math.round(x2) )
    const dy = Math.abs( Math.round(y1) - Math.round(y2) )
    return dx + dy;
}



/**
 * Belief revision function
 */

const me = {};
client.onYou( ( {id, name, x, y, score} ) => {
    me.id = id
    me.name = name
    me.x = x
    me.y = y
    me.score = score
} )
const parcels = new Map();
client.onParcelsSensing( async ( perceived_parcels ) => {
    for (const p of perceived_parcels) {
        parcels.set( p.id, p)
    }
} )



/**
 * BDI loop
 */

function agentLoop() {
    
    /**
     * Options
     */

    /**
     * Select best intention
     */

    /**
     * Revise/queue intention 
     */

}
client.onParcelsSensing( agentLoop )
// client.onAgentsSensing( agentLoop )
// client.onYou( agentLoop )



/**
 * Intention revision / execution loop
 */
class Agent {

    intention_queue = new Array();

    async intentionLoop ( ) {
        while ( true ) { //questo while è non blocking perchè c'è await new Promise 
            const intention = this.intention_queue.shift();
            if ( intention )
                await intention.achieve(); //questo postpone parte del codice
            await new Promise( res => setImmediate( res ) ); //ogni volta che raggiungo quest aparte di codice postpongo il resto del codice alla prossima iterazione del node loop
        }                                               //ogni volta che vengo qui lascio processare al node loop tutti gli input/output events (ad es perception)
    }

    async queue ( desire, ...args ) {
        const last = this.intention_queue.at( this.intention_queue.length - 1 );
        const current = new Intention( desire, ...args )
        this.intention_queue.push( current );
    }

    async stop ( ) {
        console.log( 'stop agent queued intentions');
        for (const intention of this.intention_queue) {
            intention.stop();
        }
    }

}
const myAgent = new Agent();
myAgent.intentionLoop();

// client.onYou( () => myAgent.queue( 'go_to', {x:11, y:6} ) )

// client.onParcelsSensing( parcels => {
//     for (const {x, y, carriedBy} of parcels) {
//         if ( ! carriedBy )
//             myAgent.queue( 'go_pick_up', {x, y} );
//     }
// } )



/**
 * Intention
 */
class Intention extends Promise {

    #current_plan;
    stop () {
        console.log( 'stop intention and current plan');
        this.#current_plan.stop();
    }

    #desire;
    #args;

    #resolve;
    #reject;

    constructor ( desire, ...args ) {
        var resolve, reject;
        super( async (res, rej) => {
            resolve = res; reject = rej;
        } )
        this.#resolve = resolve
        this.#reject = reject
        this.#desire = desire;
        this.#args = args;
    }

    #started = false;
    async achieve () {
        if(this.#started) return this;
        this.#started = true;

        //plan selection
        let best_plan;
        let best_plan_Score = Number.MIN_VALUE;
        for (const plan of plans) {
            if ( plan.isApplicableTo( this.#desire ) ) {
                const score = plan.score( this.#desire, ...this.#args );
                if ( score > best_plan_Score ) {
                    this.#current_plan = plan;
                    console.log('achieving desire: ', this.#desire, ...this.#args, 'with plan: ', plan)
                }
                await plan.execute(); //il metodo execute ritorna una promise. Achieve aspetta che la promise venga mantenuta
            }
        }
    }

}

/**
 * Plan library
 */
const plans = [];

class Plan {

    stop () {
        console.log( 'stop plan and all sub intentions');
        for ( const i of this.#sub_intentions ) {
            i.stop();
        }
    }

    #sub_intentions = [];

    async subIntention ( desire, ...args ) {
        const sub_intention = new Intention( desire, ...args );
        this.#sub_intentions.push(sub_intention);
        return await sub_intention.achieve();
    }

}

class GoPickUp extends Plan {

    isApplicableTo ( desire ) {
    }

    async execute ( {x, y} ) {
    }

}

class BlindMove extends Plan {

    isApplicableTo ( desire ) {
    }

    async execute ( {x, y} ) {

    }
}

plans.push( new GoPickUp() )
plans.push( new BlindMove() )
