import { default as config } from "./config.js";
import { DeliverooApi, timer } from "@unitn-asa/deliveroo-js-client";
import {createMap, shortestPathBFS, manhattanDist, manhattanDistance, delDistances, findClosestParcel, nextMove, delivery, updateCarriedPar, 
        getCarriedPar, getCarriedValue, emptyCarriedPar, moveTo, arrivedTarget, setArrived, findClosestDelCell, findFurtherPos, iAmOnDelCell,
        iAmOnParcel, setDelivered, delivered, getMinCarriedValue, isAdjacentOrSame, assignNewOpposite, executePddlAction} from "./utils.js";
import { iAmNearer } from "./intentions.js";
import { generatePlanWithPddl } from "./PddlParser.js";

const client = new DeliverooApi( config.host, config.token )
client.onConnect( () => console.log( "socket", client.socket.id ) );
client.onDisconnect( () => console.log( "disconnected", client.socket.id ) );

export let delCells = [];      //celle deliverabili
let myPos = [];         //posizione attuale bot
let myId;
let me;
var closestParcel;      //cella con pacchetto libero più vicina
var targetParcel;       //cella con pacchetto obiettivo
var firstPath;          //path da seguire nel caso in cui non ci sia soluzione ottimale
var closestDelCell;
let nonCarriedParcels = [];
let otherAgents = [];
let agentsCallback;
let parcelsCallback;
export let map = [];
let carriedParNumber;
let carriedParValue;
const directions = ['up', 'down', 'left', 'right'];
var parcels;        //takes in consideration only available parcels
var BFStoParcel;
var BFStoDel;
var BFStoOpposite;
var opposite;
let usePddl = false;



client.onYou((info) => {
    myPos = {x: info.x, y: info.y};
    myId = info.id;

    me = {
        id: myId,
        x: myPos.x,
        y: myPos.y
    };
});

client.onAgentsSensing((agents) => {
    otherAgents = agents;

    if (agentsCallback) {
        agentsCallback(agents);
    }
})

client.onMap((width, height, tiles) => 
{
    map = createMap(width, height, tiles); //map è globale

    tiles.forEach(tile => {
        if(tile.delivery){
            let cell = { x: tile.x, y: tile.y};
            delCells.push(cell); //vettore di celle deliverabili
        }
    })
    
})


client.onParcelsSensing((p)=> {
    parcels = p.filter(parcel => parcel.carriedBy === null);
    if (parcelsCallback) {
        parcelsCallback(p);
    }
})


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

async function callUpdatePar(parcel){
    await updateCarriedPar(parcel);
}

function setAgentsCallback(callback) {
    agentsCallback = callback;
}

function findTargetParcel(){
    [closestDelCell, BFStoDel] = findClosestDelCell(myPos,delCells);
    targetParcel = null;
    while(parcels.length > 0 && targetParcel==null){
        [closestParcel, BFStoParcel] = findClosestParcel(myPos, parcels);
                    
        if(firstPath==null){
            firstPath = BFStoParcel;
        }
                    
        setAgentsCallback((agents) => {
            //console.log("Avversari in vista: ",otherAgents.length);
        });

        if(iAmNearer(otherAgents, closestParcel, BFStoParcel)){
            targetParcel = closestParcel;
        } else {
            //console.log("Opponent is a motherfucker! He'll steal ", closestParcel.id);
            parcels = parcels.filter(parcel => parcel.id !== closestParcel.id);
        }
    }
}

function findTargetParcel_pddl(){
    [closestDelCell, BFStoDel] = findClosestDelCell(myPos,delCells);
    console.log("La closest delCell è", closestDelCell);
    //[closestDelCell, pathToDel] = generatePlanWithPddl(parcels, otherAgents, map, null, me, "findDel")
    //let plan = await generatePlanWithPddl(parcels, otherAgents, map, null, me, "findPar");
    //console.log("Ecco il plan:", plan);
    targetParcel = null;
    while(parcels.length > 0 && targetParcel==null){
        [closestParcel, BFStoParcel] = findClosestParcel(myPos, parcels);
                    
        if(firstPath==null){
            firstPath = BFStoParcel;
        }
                    
        setAgentsCallback((agents) => {
            //console.log("Avversari in vista: ",otherAgents.length);
        });

        if(iAmNearer(otherAgents, closestParcel, BFStoParcel)){
            targetParcel = closestParcel;
        } else {
            //console.log("Opponent is a motherfucker! He'll steal ", closestParcel.id);
            parcels = parcels.filter(parcel => parcel.id !== closestParcel.id);
        }
    }

    console.log("la closest parcel è", closestParcel);
}


async function agentLoop(){
    while(true){
        while(parcels==undefined){
            await timer( 20 );
        }
            
        findTargetParcel();
        
        while(!arrivedTarget){
            
            while(parcels==undefined){
                await timer( 20 );
            }
            
            if(opposite==null){
                opposite = {x:(map.length-1)-myPos.x, y:(map.length-1)-myPos.y};
                if (isAdjacentOrSame(myPos, opposite)) {
                    opposite = assignNewOpposite(myPos, map.length);
                }
            }
            
            if(iAmOnDelCell(myPos)){
                emptyCarriedPar();
                setDelivered(true);
                await putdown();
            }
            
            findTargetParcel();

            if(targetParcel==null){
                
                if(!delivered){
                    await moveTo(myPos,BFStoDel);
                }else{
                    if(iAmOnDelCell(myPos)){
                        emptyCarriedPar();
                        setDelivered(true);
                        await putdown();
                    }
                    [opposite, BFStoOpposite] = findFurtherPos(myPos,opposite);
                    await moveTo(myPos,BFStoOpposite);
                }

            }else{

                if((BFStoDel.length<BFStoParcel.length || BFStoParcel.length>=getMinCarriedValue()) 
                && !delivered && getCarriedPar()!=0 
                && getCarriedPar()!=undefined){
                    await moveTo(myPos,BFStoDel);
                } else {
                    await moveTo(myPos,BFStoParcel);
                }
                
            }

        }

        if(iAmOnParcel(myPos, parcels)){
            await pickup();
            setDelivered(false);
            updateCarriedPar(targetParcel);
        }else if(iAmOnDelCell(myPos)){
            await putdown();
            emptyCarriedPar();
            setDelivered(true);
        }
        setArrived(false);
        
        opposite = {x:(map.length-1)-myPos.x, y:(map.length-1)-myPos.y};
        if (isAdjacentOrSame(myPos, opposite)) {
            opposite = assignNewOpposite(myPos, map.length);
        }
    }
}


async function agentLoop_pddl(){
    while(true){
        console.log("Using PDDL logic");
        while(parcels==undefined || map==undefined){
            await timer(20);
        }
        
        //await findTargetParcel_pddl();

        while(!arrivedTarget){
            //console.log("non sono arrivato al target");
            while(parcels==undefined){
                await timer( 20 );
            }

            if(opposite==null){
                //console.log("nessun opposite");
                opposite = {x:(map.length-1)-myPos.x, y:(map.length-1)-myPos.y};
                if (isAdjacentOrSame(myPos, opposite)) {
                    opposite = assignNewOpposite(myPos, map.length);
                }
                //console.log("generato opposite:", opposite);
            }

            if(iAmOnDelCell(myPos)){
                //console.log("sono in cella delivery");
                emptyCarriedPar();
                setDelivered(true);
                await putdown();
                //let pddlPlan = await generatePlanWithPddl(parcels, otherAgents, map, myPos, me, "putdown");
            }

            //console.log("Cerco il target");
            findTargetParcel_pddl();

            if(targetParcel==null){
                //console.log("non ho un target");
                if(!delivered){
                    //console.log("vado a deliver, no parcel in vista");
                    console.log("La del cell è ", closestDelCell);
                    let pddlPlan = await generatePlanWithPddl(parcels, otherAgents, map, closestDelCell, me, "del");
                    for (let action of pddlPlan) {
                        await executePddlAction(action);
                        
                        if (parcels.length != 0 || targetParcel != null) {
                            //console.log("Found parcels or target", parcels, targetParcel);
                            break;
                        }
                    }
                    emptyCarriedPar();
                    setDelivered(true);
                    await putdown();
                }else{
                    //console.log("ho consegnato todo");
                    if(iAmOnDelCell(myPos)){
                        emptyCarriedPar();
                        setDelivered(true);
                        await putdown();
                    }
                    opposite = {x:Math.round((map.length-1)-myPos.x), y:Math.round((map.length-1)-myPos.y)};
                    if (isAdjacentOrSame(myPos, opposite)) {
                        opposite = assignNewOpposite(myPos, map.length);
                    }
                    //console.log("vado verso opposite:",opposite);
                    let pddlPlan = await generatePlanWithPddl(parcels, otherAgents, map, opposite, me, "opp");
                    for (let action of pddlPlan) {
                        await executePddlAction(action);
                        
                        if (parcels.length != 0 || targetParcel != null) {
                            //console.log("Found parcels or target", parcels, targetParcel);
                            break;
                        }
                    }
                }

            }else{
                //console.log("ho una parcella target", targetParcel);
                if((BFStoDel.length<=BFStoParcel.length || BFStoParcel.length>=getMinCarriedValue()) 
                    && !delivered && getCarriedPar()!=0 
                    && getCarriedPar()!=undefined){
                        //console.log("ma conviene deliverare");
                        //console.log("La del cell è ", closestDelCell);
                        let pddlPlan = await generatePlanWithPddl(parcels, otherAgents, map, closestDelCell, me, "del");
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
                        console.log("conviene andare alla parcel, del: ", BFStoDel.length, " mentre parcel: ", BFStoParcel.length);
                        let pddlPlan = await generatePlanWithPddl(parcels, otherAgents, map, targetParcel, me,"toparcel");
                        console.log("Ohhhhhhhhhhhhhhhh");
                        console.log(pddlPlan);
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
                //console.log("sono sulla parcel");
                await pickup();
                setDelivered(false);
                updateCarriedPar(targetParcel);
            }else if(iAmOnDelCell(myPos)){
                //console.log("sono sulla delivery");
                emptyCarriedPar();
                setDelivered(true);
                await putdown();
            }
            setArrived(false);

            opposite = {x:(map.length-1)-myPos.x, y:(map.length-1)-myPos.y};
            if (isAdjacentOrSame(myPos, opposite)) {
                opposite = assignNewOpposite(myPos, map.length);
            }
        }
        

        if (!pddlPlan || pddlPlan.length === 0) {
            console.log("PDDL plan not found");
            //continue;
            break;
        }
    }
}

function startGame() {
    
    if (process.argv[2] === 'pddl') {
        agentLoop_pddl();
    } else {
        agentLoop();
    }

}

startGame();