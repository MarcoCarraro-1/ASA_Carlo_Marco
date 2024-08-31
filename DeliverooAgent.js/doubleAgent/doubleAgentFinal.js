import { default as config } from "./config.js";
import { DeliverooApi, timer } from "@unitn-asa/deliveroo-js-client";
import {createMap, shortestPathBFS, manhattanDist, manhattanDistance, delDistances, findClosestParcel, nextMove, delivery, updateCarriedPar, 
        getCarriedPar, getCarriedValue, emptyCarriedPar, moveTo, findClosestDelCell, findFurtherPos, iAmOnDelCell,
        iAmOnParcel, getMinCarriedValue, isAdjacentOrSame, assignNewOpposite, executePddlAction,
        checkPos, assignOpposite, checkCondition, counter, getRandomCoordinate, isBetaThere} from "./utils_alfa.js";
import { iAmNearer} from "./intentions_alfa.js";
import { generatePlanWithPddl } from "../PddlParser.js";
import {DEL_CELLS, MAP, ARRIVED_TO_TARGET, DELIVERED, setArrivedToTarget, setDelivered} from"./globals_alfa.js";

export const client = new DeliverooApi( config.host, config.token_alfa )
client.onConnect( () => console.log("socket", client.socket.id ) );
client.onDisconnect( () => console.log( "disconnected", client.socket.id ) );

let myPos = [];         //posizione attuale bot
let myId;
let me;
let myName;
var closestParcel;      //cella con pacchetto libero più vicina
var targetParcel;       //cella con pacchetto obiettivo
var firstPath;          //path da seguire nel caso in cui non ci sia soluzione ottimale
var closestDelCell;
//let nonCarriedParcels = [];
let otherAgents = [];
let agentsCallback;
let parcelsCallback;
//let carriedParNumber;
//let carriedParValue;
//const directions = ['up', 'down', 'left', 'right'];
var parcels = [];        //takes in consideration only available parcels
var BFStoParcel;
var BFStoDel;
var BFStoOpposite;
var opposite;
let pddlPlan=undefined;
//let usePddl = false;


client.onYou((info) => {
    myPos = {x: info.x, y: info.y};
    myId = info.id;
    myName = info.name;
    console.log("I am", myName, "with id", myId, "at", myPos);
    me = {
        id: myId,
        x: myPos.x,
        y: myPos.y,
        name: myName
    };
});

export function getAlfaInfo()
{
    return me;
}

client.onAgentsSensing((agents) => {
    otherAgents = agents;

    if (agentsCallback) {
        agentsCallback(agents);
    }
})

client.onMap((width, height, tiles) => 
{
    //avoiding assignment to a constant variable
    MAP.length = 0;
    let map = createMap(width, height, tiles);
    MAP.push(...map);

    tiles.forEach(tile => {
        if(tile.delivery){
            let cell = { x: tile.x, y: tile.y};
            DEL_CELLS.push(cell); //vettore di celle deliverabili
        }
    })
    
})

export async function say(id, msg)
{
    await client.say(id, msg)
}

client.onParcelsSensing((p)=> {
    parcels = p.filter(parcel => parcel.carriedBy === null);
    if (parcelsCallback) {
        parcelsCallback(p);
    }
})

client.onMsg( (id, name, msg, reply) => {
    console.log("new msg received from", id, name+':', msg);
    let answer = 'hello ' + name + ', here is reply.js as ' + me.name + '. Do you need anything?';
    console.log("my reply: ", answer);
    if (reply)
        try { reply(answer) } catch { (error) => console.error(error)}
});

export async function move ( direction ) 
{
    await client.move( direction ) 
}

export async function pickup (  ) 
{
    await client.pickup();
}


export async function putdown (  ) 
{
    await client.putdown();
}

/*async function callUpdatePar(parcel){
    await updateCarriedPar(parcel);
}*/


function setAgentsCallback(callback) {
    agentsCallback = callback;
}

function findTargetParcel(){
    [closestDelCell, BFStoDel] = findClosestDelCell(myPos, DEL_CELLS);
    targetParcel = null;
    while(parcels.length > 0 && targetParcel==null){
        [closestParcel, BFStoParcel] = findClosestParcel(myPos, parcels);

        if(closestParcel==null){
            parcels.length=0;
        }
                    
        if(firstPath==null){
            firstPath = BFStoParcel;
        }
        
        setAgentsCallback((agents) => {
            // console.log("Opponents in FOW: ", otherAgents.length);
            // console.log("Opponents ids: ", otherAgents.map(agent => agent.id));
        });

        if(iAmNearer(otherAgents, closestParcel, BFStoParcel)){
            targetParcel = closestParcel;
            // console.log("target parcel:", targetParcel);
        } else {
            //console.log("Opponent will steal ", closestParcel.id);
            parcels = parcels.filter(parcel => parcel.id !== closestParcel.id);
        }
    }
}

function findTargetParcel_pddl(){
    [closestDelCell, BFStoDel] = findClosestDelCell(myPos, DEL_CELLS);
    //[closestDelCell, pathToDel] = generatePlanWithPddl(parcels, otherAgents, MAP, null, me, "findDel")
    //let plan = await generatePlanWithPddl(parcels, otherAgents, MAP, null, me, "findPar");
    targetParcel = null;
    while(parcels.length > 0 && targetParcel==null){
        [closestParcel, BFStoParcel] = findClosestParcel(myPos, parcels);

        if(closestParcel==null){
            parcels.length=0;
        }

        if(firstPath==null){
            firstPath = BFStoParcel;
        }
                    
        setAgentsCallback((agents) => {
            //console.log("Opponents in FOW: ",otherAgents.length);
        });

        if(iAmNearer(otherAgents, closestParcel, BFStoParcel)){
            targetParcel = closestParcel;
        } else {
            //console.log("Opponent will steal ", closestParcel.id);
            parcels = parcels.filter(parcel => parcel.id !== closestParcel.id);
        }
    }
}


async function agentAlfaLoop(){
    while(true){
        
    }
}


async function agentLoop_pddl(){
    while(true){
        // console.log("Using PDDL logic");
        while(parcels==undefined || MAP==undefined){
            await timer(20);
        }
        
        if(targetParcel==null){
            findTargetParcel_pddl();
        }

        while(!ARRIVED_TO_TARGET){
            while(parcels==undefined){
                await timer( 20 );
            }

            if(opposite==null){
                opposite = assignOpposite(myPos, MAP);
                opposite = {x:(MAP.length-1)-myPos.x, y:(MAP.length-1)-myPos.y};
                if (isAdjacentOrSame(myPos, opposite)) {
                    opposite = assignNewOpposite(myPos, MAP.length);
                }
            }

            if(iAmOnDelCell(myPos)){
                emptyCarriedPar();
                setDelivered(true);
                await putdown();
                await new Promise(resolve => setTimeout(resolve, 100));
                //let pddlPlan = await generatePlanWithPddl(parcels, otherAgents, MAP, myPos, me, "putdown");
            }

            if(targetParcel==null){
                findTargetParcel_pddl();
            }

            if(targetParcel==null){
                if(!DELIVERED ){
                    myPos = checkPos(myPos.x, myPos.y);
                    
                    pddlPlan=undefined;
                    while(pddlPlan==undefined){
                        pddlPlan = await generatePlanWithPddl(parcels, otherAgents, MAP, closestDelCell, me, "del");
                        // console.log("block1");
                    }
                    for (let action of pddlPlan) {
                        await executePddlAction(action);
                        
                        if (parcels.length != 0 || targetParcel != null) {
                            break;
                        }
                    }
                    emptyCarriedPar();
                    setDelivered(true);
                    await putdown();
                    await new Promise(resolve => setTimeout(resolve, 100));
                }else{
                    if(iAmOnDelCell(myPos)){
                        emptyCarriedPar();
                        setDelivered(true);
                        await putdown();
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    //opposite = {x:Math.round((MAP.length-1)-myPos.x), y:Math.round((MAP.length-1)-myPos.y)};
                    opposite.x = Math.floor(opposite.x);
                    opposite.y = Math.floor(opposite.y);
                    if (isAdjacentOrSame(myPos, opposite) || checkCondition(myPos, MAP, opposite)) {
                        opposite = assignNewOpposite(myPos, MAP.length);
                    }
                    //[opposite, BFStoOpposite] = findFurtherPos(myPos,opposite);
                    // console.log("OPPOSITE:", opposite);
                    myPos = checkPos(myPos.x, myPos.y);
                    pddlPlan=undefined;
                    while(pddlPlan==undefined){
                        pddlPlan = await generatePlanWithPddl(parcels, otherAgents, MAP, opposite, me, "opp");
                        // console.log("block2");
                        counter.countAttempts++;
                        // console.log("counter",counter.countAttempts);
                        if(counter.countAttempts>5){
                            // console.log("Forcing opposite");
                            opposite.x=myPos.x;
                            opposite.y=0;
                            counter.countAttempts=0;
                            if(opposite.x==myPos.x && opposite.y==myPos.y){
                                opposite.x=0;
                                opposite.y=myPos.y;
                            }
                            if(opposite.x==myPos.x && opposite.y==myPos.y &&
                                myPos.x==0 && myPos.y==0){
                                opposite.x=getRandomCoordinate(MAP.length);
                                opposite.y=getRandomCoordinate(MAP[0].length);
                            }
                            
                        }
                        if(MAP[opposite.x][opposite.y] != 1){
                            opposite.x=getRandomCoordinate(MAP.length);
                            opposite.y=getRandomCoordinate(MAP[0].length);
                        }
                    }                        
                    // console.log("Mypos:",myPos);
                    // console.log("plan:", pddlPlan);
                    for (let action of pddlPlan) {
                        await executePddlAction(action);
                        
                        if (parcels.length != 0 || targetParcel != null) {
                            break;
                        }
                    }
                }
            
            }else{
                myPos = checkPos(myPos.x, myPos.y);
                if((BFStoDel.length<=BFStoParcel.length || BFStoParcel.length>=getMinCarriedValue()) 
                    && !DELIVERED  && getCarriedPar()!=0 
                    && getCarriedPar()!=undefined){
                        pddlPlan=undefined;
                        while(pddlPlan==undefined){
                            pddlPlan = await generatePlanWithPddl(parcels, otherAgents, MAP, closestDelCell, me, "del");
                            // console.log("block3");
                        }
                        
                        for (let action of pddlPlan) {
                            await executePddlAction(action);
                            
                            if (parcels == undefined || targetParcel == null) {
                                break;
                            }
                        }
                        emptyCarriedPar();
                        setDelivered(true);
                        await putdown();
                } else {
                    try{
                        pddlPlan=undefined;
                        while(pddlPlan==undefined){
                            pddlPlan = await generatePlanWithPddl(parcels, otherAgents, MAP, targetParcel, me,"toparcel");    
                            // console.log("block4");
                        }
                        
                        for (let action of pddlPlan) {
                            await executePddlAction(action);
                            
                            if (parcels == undefined || targetParcel == null) {
                                break;
                            }
                        }
                        setDelivered(false);
                        updateCarriedPar(targetParcel);
                    }catch{
                        
                    }
                }
            }

            if(iAmOnParcel(myPos,parcels)){
                setDelivered(false);
                updateCarriedPar(targetParcel);
                await pickup();
            }else if(iAmOnDelCell(myPos)){
                emptyCarriedPar();
                setDelivered(true);
                await putdown();
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            setArrivedToTarget(false);
            targetParcel=null;

            opposite = {x:(MAP.length-1)-myPos.x, y:(MAP.length-1)-myPos.y};
            if (isAdjacentOrSame(myPos, opposite)) {
                opposite = assignNewOpposite(myPos, MAP.length);
            }
        }
        

        if (!pddlPlan || pddlPlan.length === 0) {
            // console.log("PDDL plan not found");
            //continue;
            break;
        }
    }
}

function startGame() {
    
    counter.countAttempts=0;
    if (process.argv[2] === 'pddl') {
        agentLoop_pddl();
    } else {
        agentLoop();
    }

}

startGame();