import { default as config } from "./config.js";
import { DeliverooApi, timer } from "@unitn-asa/deliveroo-js-client";
import {createMap, shortestPathBFS, manhattanDist, manhattanDistance, delDistances, findClosestParcel, nextMove, delivery, updateCarriedPar, 
        getCarriedPar, getCarriedValue, emptyCarriedPar, moveTo, arrivedTarget, setArrived, findClosestDelCell, findFurtherPos, iAmOnDelCell,
        iAmOnParcel, setDelivered, delivered, getMinCarriedValue, isAdjacentOrSame, assignNewOpposite, executePddlAction,
        checkPos, assignOpposite} from "./utils.js";
import { iAmNearer } from "./intentions.js";
import { generatePlanWithPddl } from "./PddlParser.js";

export const client = new DeliverooApi( config.host, config.token )
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
//let nonCarriedParcels = [];
let otherAgents = [];
let agentsCallback;
let parcelsCallback;
export let map = [];
//let carriedParNumber;
//let carriedParValue;
//const directions = ['up', 'down', 'left', 'right'];
var parcels;        //takes in consideration only available parcels
var BFStoParcel;
var BFStoDel;
var BFStoOpposite;
var opposite;
//let usePddl = false;



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

/*async function callUpdatePar(parcel){
    await updateCarriedPar(parcel);
}*/

function setAgentsCallback(callback) {
    agentsCallback = callback;
}

function findTargetParcel(){
    [closestDelCell, BFStoDel] = findClosestDelCell(myPos,delCells);
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
            console.log("target parcel:", targetParcel);
        } else {
            //console.log("Opponent will steal ", closestParcel.id);
            parcels = parcels.filter(parcel => parcel.id !== closestParcel.id);
        }
    }
}

function findTargetParcel_pddl(){
    [closestDelCell, BFStoDel] = findClosestDelCell(myPos,delCells);
    
    //[closestDelCell, pathToDel] = generatePlanWithPddl(parcels, otherAgents, map, null, me, "findDel")
    //let plan = await generatePlanWithPddl(parcels, otherAgents, map, null, me, "findPar");
    targetParcel = null;
    while(parcels.length > 0 && targetParcel==null){
        [closestParcel, BFStoParcel] = findClosestParcel(myPos, parcels);
                    
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


async function agentLoop(){
    while(true){
        while(parcels==undefined){
            await timer( 20 );
        }
        
        if(targetParcel==null){
            console.log("look for target");
            console.log("here7");
            findTargetParcel();
        }

        if(targetParcel==null){
            console.log("NO TARGET PARCEL");
        }
        
        
        while(!arrivedTarget){
            while(parcels==undefined){
                await timer( 20 );
            }
            
            if(opposite==null){
                opposite = assignOpposite(myPos, map);
                opposite = {x:(map.length-1)-myPos.x, y:(map.length-1)-myPos.y};
                if (isAdjacentOrSame(myPos, opposite)) {
                    opposite = assignNewOpposite(myPos, map.length);
                }
            }
            
            if(iAmOnDelCell(myPos)){
                emptyCarriedPar();
                setDelivered(true);
                console.log("have to put");
                await putdown();
                await new Promise(resolve => setTimeout(resolve, 100));
                console.log("done it");
            }
            
            console.log("look for target 2");
            console.log("initial target:", targetParcel);
            if(targetParcel==null){
                findTargetParcel();
            }

            if(targetParcel==null){
                console.log("no target parcel");
                if(!delivered){
                    console.log("go to del subitooooo");
                    myPos = checkPos(myPos.x, myPos.y);
                    await moveTo(myPos,BFStoDel);
                }else{
                    console.log("già deliveratoooooooo");
                    if(iAmOnDelCell(myPos)){
                        emptyCarriedPar();
                        setDelivered(true);
                        try{
                            console.log("have to put2");
                            await putdown();
                            await new Promise(resolve => setTimeout(resolve, 100));
                        } catch {

                        }
                        console.log("have to put3");
                        await putdown();
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                    opposite.x = Math.floor(opposite.x);
                    opposite.y = Math.floor(opposite.y);
                    [opposite, BFStoOpposite] = findFurtherPos(myPos,opposite);
                    console.log("here2");
                    myPos = checkPos(myPos.x, myPos.y);
                    await moveTo(myPos,BFStoOpposite);
                }

            }else{
                console.log("yes target");
                myPos = checkPos(myPos.x, myPos.y);
                if((BFStoDel.length<BFStoParcel.length || BFStoParcel.length>=getMinCarriedValue()) 
                && !delivered && getCarriedPar()!=0 
                && getCarriedPar()!=undefined){
                    console.log("go to del");
                    await moveTo(myPos,BFStoDel);
                } else {
                    console.log("go to par");
                    console.log("bfstoparcel:",BFStoParcel);
                    try{
                        await moveTo(myPos,BFStoParcel);
                        console.log("moved");
                    }catch{
                        console.log("error in moving");
                    }
                }
                
            }
            console.log("checking arrived:",arrivedTarget);
        }

        

        if(iAmOnParcel(myPos, parcels)){
            setDelivered(false);
            updateCarriedPar(targetParcel);
            console.log("here5");
            await pickup();
        }else if(iAmOnDelCell(myPos)){
            console.log("have to put4");
            await putdown();
            await new Promise(resolve => setTimeout(resolve, 100));
            emptyCarriedPar();
            setDelivered(true);
        }
        setArrived(false);
        targetParcel=null;
        //console.log("SETTO A FALSEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE");
        
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
                //let pddlPlan = await generatePlanWithPddl(parcels, otherAgents, map, myPos, me, "putdown");
            }

            findTargetParcel_pddl();

            if(targetParcel==null){
                if(!delivered){
                    let pddlPlan = await generatePlanWithPddl(parcels, otherAgents, map, closestDelCell, me, "del");
                    for (let action of pddlPlan) {
                        await executePddlAction(action);
                        
                        if (parcels.length != 0 || targetParcel != null) {
                            break;
                        }
                    }
                    emptyCarriedPar();
                    setDelivered(true);
                    await putdown();
                }else{
                    if(iAmOnDelCell(myPos)){
                        emptyCarriedPar();
                        setDelivered(true);
                        await putdown();
                    }
                    opposite = {x:Math.round((map.length-1)-myPos.x), y:Math.round((map.length-1)-myPos.y)};
                    if (isAdjacentOrSame(myPos, opposite)) {
                        opposite = assignNewOpposite(myPos, map.length);
                    }
                    let pddlPlan = await generatePlanWithPddl(parcels, otherAgents, map, opposite, me, "opp");
                    for (let action of pddlPlan) {
                        await executePddlAction(action);
                        
                        if (parcels.length != 0 || targetParcel != null) {
                            break;
                        }
                    }
                }

            }else{
                if((BFStoDel.length<=BFStoParcel.length || BFStoParcel.length>=getMinCarriedValue()) 
                    && !delivered && getCarriedPar()!=0 
                    && getCarriedPar()!=undefined){
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
                        let pddlPlan = await generatePlanWithPddl(parcels, otherAgents, map, targetParcel, me,"toparcel");
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