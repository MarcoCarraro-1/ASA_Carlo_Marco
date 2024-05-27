import { default as config } from "./config.js";
import { DeliverooApi, timer } from "@unitn-asa/deliveroo-js-client";
import {createMap, shortestPathBFS, manhattanDist, manhattanDistance, delDistances,
        findClosestParcel, nextMove, delivery, updateCarriedPar,
        getCarriedPar, getCarriedValue, emptyCarriedPar, moveTo, arrivedTarget,
        setArrived, findClosestDelCell,
        findFurtherPos} from "./utils.js";
import { iAmNearer } from "./intentions.js";

const client = new DeliverooApi( config.host, config.token )
client.onConnect( () => console.log( "socket", client.socket.id ) );
client.onDisconnect( () => console.log( "disconnected", client.socket.id ) );

//AGENT_OBSERVATION_DISTANCE = client.config.AGENT_OBSERVATION_DISTANCE;

export let delCells = [];      //celle deliverabili
let myPos = [];         //posizione attuale bot
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
let delivered=true;
var opposite;



client.onYou((info) => {
    myPos = {x: info.x, y: info.y};
});

client.onAgentsSensing((agents) => {
    otherAgents = agents;
    //console.log("Other agents:", otherAgents);
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

async function pickup (  ) 
{
    while(true)
    {
        await client.pickup();
    }
}


export async function putdown (  ) 
{
    await client.putdown();
    
}

function setAgentsCallback(callback) {
    agentsCallback = callback;
}

function setParcelsCallback(callback) {
    parcelsCallback = callback;
}


async function agentLoop(){
    while(true){
        while(!arrivedTarget){
            while(parcels==undefined){
                await timer( 20 );
            }
            if(opposite==null){
                opposite = {x:29-myPos.x, y:29-myPos.y};
            }
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
                    console.log("Nearer to ", closestParcel);
                    targetParcel = closestParcel;
                } else {
                    console.log("Opponent is a motherfucker! He'll steal ", closestParcel.id);
                    parcels = parcels.filter(parcel => parcel.id !== closestParcel.id);
                }
            }

            if(targetParcel==null){
                console.log("No target parcel!");
                [closestDelCell, BFStoDel] = findClosestDelCell(myPos,delCells);
                if(!delivered){
                    console.log("Going to delivery!");
                    moveTo(myPos,BFStoDel);
                    await timer(500);
                }else{
                    putdown();
                    delivered=true;
                    console.log("Moving opposite!");
                    [opposite, BFStoOpposite] = findFurtherPos(myPos,opposite);
                    moveTo(myPos,BFStoOpposite);
                    await timer(500);
                }   
            }else{
                moveTo(myPos,BFStoParcel);
                await timer(500);
            }
        }
        if(delivered){
            pickup();
            delivered=false;
        }else{
            putdown();
            delivered=true;
        }
        await timer(200);
        setArrived(false);
        opposite = {x:29-myPos.x, y:29-myPos.y};
    }
}

agentLoop();