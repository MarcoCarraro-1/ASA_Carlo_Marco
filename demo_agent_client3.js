import { default as config } from "./config.js";
import { DeliverooApi, timer } from "@unitn-asa/deliveroo-js-client";
import * as utils from './utils/utils.js';

const client = new DeliverooApi( config.host, config.token )
client.onConnect( () => console.log( "socket", client.socket.id ) );
client.onDisconnect( () => console.log( "disconnected", client.socket.id ) );

var finishToFollowPath = false
var deliveredAllParcels = true
const MAX_PARCELS_ON_YOU = 4

var you;
client.onYou(m => you = m);

var parcels;
client.onParcelsSensing(p => parcels=p)

var agents;
client.onAgentsSensing(a => agents=a)

var status = utils.possibleStates.EXPLORE_MAP;


// Create a promise for the 'map1' variable
var mapPromise = new Promise((resolve, reject) => {
    client.onMap((width, height, tiles) => {
        resolve({ width, height, tiles });
    });
});
var map1 = await mapPromise;

const { map: MAP, deliveryPoints: DELIVERY_POINTS } = utils.parseMap(map1)
var completePath = {path: [], moves: [], Infinity}

await timer( 1000 ); // wait for the you and agents to be updated
var reachable_delivery_points = utils.getReachableDeliveryPoints(DELIVERY_POINTS, MAP, you, agents);
const REACHABLE_DELIVERY_POINTS = reachable_delivery_points.length;
console.log('REACHABLE DELIVERY POINTS:', REACHABLE_DELIVERY_POINTS);

async function agentLoop () {

    while ( true ) {
        //var youPromise = createYouPromise(client);
        await timer( 10 );
        await client.pickup(); // spam pickup

        if (utils.isOverDeliveryPoint(you, DELIVERY_POINTS)) { // spam putdown only if is over delivery point
            // console.log('OVER DELIVERY POINT'); 
            var delivered = await client.putdown();
            if (delivered) {
                finishToFollowPath = true
                deliveredAllParcels = true
            }
        }

        // console.log('AGENTS:', agents)
        // continue;

        // if you.x or you.y is not int you are in middle so continue
        if (you.x % 1 != 0 || you.y % 1 != 0) {
            console.log('YOU ARE IN THE MIDDLE');
            console.log('YOU:', you);
            continue;
        }


        // Wait for the 'you' promise to be resolved again
        // var [you, parcels] = await Promise.all([youPromise, parcelsPromise]);
        //const startTime = Date.now();

        var tmpCompletePath = selectBestPath2(parcels, DELIVERY_POINTS, MAP, you, agents, completePath)
        // Record the end time
        //const endTime = Date.now();
        // Print the time taken
        //console.log(`Time taken selectBestPath2: ${endTime - startTime} milliseconds`);
        
        completePath = tmpCompletePath.completePath;
        status = tmpCompletePath.status;

        

        // Now 'updatedYou' contains the latest 'you' data
        // console.log('YOU:', you);
        // console.log('PARCELS:', parcels);
        // console.log('Complete Path:', completePath.path)
        console.log('Target:', completePath.path[completePath.path.length - 1], 'Status:', utils.statusNames[status], 'ID:', status);

        var tries = 0;

        var move = completePath.moves[0]; // Get the first move
        if (move == undefined) {
            finishToFollowPath = true
            continue;
        }
        else {
            while (tries < 4) {
                if (await client.move(move)) {
                    // haveToMove = true;
                    console.log('move:', move);
                    //console.log('REMAINING MOVES:', completePath.moves)
                    completePath.moves.shift(); // Remove the move only if it was successful
                    
                    break; // Moved, continue
                }
                else{
                    console.log('FAILED MOVE:', move);
                    // log in console like an error
                }
                tries++;
            }
            if ( tries >= 4 ) {
                console.log( 'stucked' );
                // haveToMove = true;
                finishToFollowPath = true
                await client.timer(10); // stucked, wait 1 sec and retry
            } 
        }
    }
}

agentLoop()