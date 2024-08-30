
import { consts } from './consts.js';
import { timer } from "@unitn-asa/deliveroo-js-client";
import { onMapHandler } from '../handlers/onMapHandler.js';
import { onMsgHandler } from '../handlers/onMsgHandler.js';
import { onConfigHandler } from '../handlers/onConfigHandler.js';
import { onParcelsHandler } from '../handlers/onParcelsHandler.js';
import { onAgentsHandler } from '../handlers/onAgentsHandler.js';
import { Structure } from '../classes/structure.js';
import * as utils from '../utilities/utils.js';
import * as PDDLUtils from '../utilities/pddl_utils.js';
import * as communication_utils from '../utilities/communication_utils.js';


class Client {
    constructor(deliverooApi, usingPddl, isBoss) {
        this.deliverooApi = deliverooApi;
        this.usingPddl = usingPddl;
        this.isBoss = isBoss; // Tell if he is Boss or Worker
        this.structure = new Structure();
        this.you;
        this.parcels;
        this.agents;
        this.parcelsSet = new Set();
        this.status = consts.possibleStates.EXPLORE_MAP;
        this.completePath = {path: [], moves: [], Infinity}
        this.reachable_delivery_points;
        this.REACHABLE_DELIVERY_POINTS_LEN;
        this.finishToFollowPath = true;
        this.worker = null;
        this.boss = null;   
        this.connectionCompletedWithWorker = false;
        this.connectionCompletedWithBoss = false;    
        this.x_going = null;
        this.y_going = null; 
        this.workerHasToGoToDifferentLocation = false;
    }

    async configure() {
        
        await this.setUpDeliverooAPICallbacks();
        await timer( 1000 ); // wait for the you and agents to be updated
        await communication_utils.sendHandshakeRequest(this);
        await timer( 1000 ); // wait for the you and agents to be updated

        this.reachable_delivery_points = utils.getReachableDeliveryPoints(this.structure.deliveryPoints, this.structure.map, this.you, this.agents);
        this.REACHABLE_DELIVERY_POINTS_LEN = this.reachable_delivery_points.length;
        this.mainLoop();
    }

    async setUpDeliverooAPICallbacks() {
        this.deliverooApi.onConnect( () => console.log( "Connected with this socket id:", this.deliverooApi.socket.id ) );
        this.deliverooApi.onDisconnect( () => console.log( "Disconnected" ));
        this.deliverooApi.onConfig(config => onConfigHandler(config))
        this.deliverooApi.onMap((width, height, tiles) => onMapHandler(width, height, tiles, this.structure))
        this.deliverooApi.onYou(m => this.you = m);
        this.deliverooApi.onParcelsSensing(parcels => onParcelsHandler(parcels, this))
        this.deliverooApi.onAgentsSensing(agents => onAgentsHandler(agents, this))
        this.deliverooApi.onMsg((id, name, msg, reply) => onMsgHandler(id, name, msg, reply, this))
    }
  

    async mainLogic() {
        await this.deliverooApi.pickup(); // spam PickUP action, to improve semplcity of the code

        if (utils.isOverDeliveryPoint(this.you, this.structure.deliveryPoints)) { // spam putdown only if is over delivery point, always to improve simplicity of the code
            var delivered = await this.deliverooApi.putdown();
            if (delivered) {
                this.finishToFollowPath = true
            }
        }

        await communication_utils.exchangeBeliefsWithOtherAllyAgent(this);
        
        await communication_utils.exchangeOrderAndCommands(this);

        // TO avoid, to have float x and y, sometimes happens
        this.you.x = Math.round(this.you.x);
        this.you.y = Math.round(this.you.y);

        // print status name
        if (consts.PRINT_STATUS) consts.printStatus(this.status);

        var taken_parcels = utils.getParcelsByCarrierID(this.you.id, this.parcels);
        var free_parcels = utils.getFreeParcelsNumber(this.parcels);
        
        // each time we have to check if we have to recalculate the path, if the parcels contains new parcels not present in the parcelsSet
        // this only if I did not reach max parcels
        utils.updateParcelsBelief(this, taken_parcels, free_parcels);

        if (!this.isBoss && this.workerHasToGoToDifferentLocation) 
        {
            this.finishToFollowPath = true;
            // have to hide the parcel in x_going, y_going
            var tmpCompletePath = utils.findOptimalPath(this.parcels, this.structure.deliveryPoints, this.structure.map, this.you, this.agents, this.completePath, this.finishToFollowPath, this.REACHABLE_DELIVERY_POINTS_LEN, this)
            this.workerHasToGoToDifferentLocation = false; // update after the path is calculated, to avoid boss's objective
        }

        if (this.finishToFollowPath) {
            var tmpCompletePath = utils.findOptimalPath(this.parcels, this.structure.deliveryPoints, this.structure.map, this.you, this.agents, this.completePath, this.finishToFollowPath, this.REACHABLE_DELIVERY_POINTS_LEN, this)
            
            this.completePath = tmpCompletePath.completePath;
            this.status = tmpCompletePath.status;
            this.finishToFollowPath = false;
            var lastPathValue = this.completePath.path[this.completePath.path.length - 1];
            this.x_going = lastPathValue[0];
            this.y_going = lastPathValue[1];
                
            if (consts.PRINT_PATH) console.log('Complete Path:', this.completePath.path)

            if (this.usingPddl)
            {
                this.completePath = await PDDLUtils.retrieveCompletePathWithPddl(this, lastPathValue[0], lastPathValue[1]);
            }
        }

    

        var tries = 0;
        if (this.completePath == null) {
            console.log('No path found, recalculating...');
            this.finishToFollowPath = true;
            return;
        }
        var move = this.completePath.moves[0]; // Get the first move
        if (move == null) {
            this.finishToFollowPath = true
            return;
        }
        else {
            while (tries < consts.MAX_TRIES_BEFORE_RECALCULATING_PLAN) {
                if (await this.deliverooApi.move(move)) {
                    if (consts.PRINT_MOVES) console.log('MOVE:', move);
                    this.completePath.moves.shift(); // Remove the move only if it was successful
                    break; // Moved, continue
                }
                else{
                    console.log('FAILED MOVE:', move);
                }
                tries++;
            }
            if ( tries >= consts.MAX_TRIES_BEFORE_RECALCULATING_PLAN ) {
                console.log( 'STUCKED: recalculating path...' );
                this.finishToFollowPath = true
            } 
        }
        
    }

    async mainLoop() {
        while ( true ) 
        {
            try {
                await this.mainLogic();
            }
            catch (e) {
                console.log('Error in main loop:', e, 'restarting in 1 second');
                timer( 1000 );
            }
        }
    }
}

export { Client };