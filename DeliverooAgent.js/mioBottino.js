import { default as config } from "./config.js";
import { DeliverooApi, timer } from "@unitn-asa/deliveroo-js-client";
import {createMap, shortestPathBFS, manhattanDist, manhattanDistance, delDistances,
        findClosestParcel, nextMove, delivery, updateCarriedPar,
        getCarriedPar, getCarriedValue, emptyCarriedPar} from "./utils.js";
import { iAmNearer } from "./intentions.js";

const client = new DeliverooApi( config.host, config.token )
client.onConnect( () => console.log( "socket", client.socket.id ) );
client.onDisconnect( () => console.log( "disconnected", client.socket.id ) );

//AGENT_OBSERVATION_DISTANCE = client.config.AGENT_OBSERVATION_DISTANCE;

export let delCells = [];      //celle deliverabili
let myPos = [];         //posizione attuale bot
var closestParcel;      //cella con pacchetto libero più vicina
var targetParcel;       //cella con pacchetto obiettivo
let arrived = false;
let nonCarriedParcels = [];
let otherAgents = [];
let agentsCallback;
export let map = [];
let carriedParNumber;
let carriedParValue;
const directions = ['up', 'down', 'left', 'right'];
var parcels;        //takes in consideration only available parcels
var BFStoParcel;



client.onYou((info) => {
    //console.log("Your name:", info.name);
    //console.log("Your position (x, y):", info.x, ",", info.y);
    myPos = {x: info.x, y: info.y};
    //console.log("mypos: ", myPos.x, myPos.y);
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
    //console.log("Map:", map.length, " x ", map[0].length);

    tiles.forEach(tile => {
        if(tile.delivery){
            let cell = { x: tile.x, y: tile.y};
            delCells.push(cell); //vettore di celle deliverabili
        }
    })
    
})


client.onParcelsSensing((p)=> 
    {
        nonCarriedParcels = p.filter(parcel => parcel.carriedBy === null);
        parcels=nonCarriedParcels;
    }
)


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


async function agentLoop(){
    //while(true){
        while(parcels==undefined){
            await timer( 20 );
        }
        //console.log(parcels);
        while(parcels.length > 0 && targetParcel==null){
            //console.log("Parcels available");
            [closestParcel, BFStoParcel] = findClosestParcel(myPos, parcels);
            //console.log("My path:",BFStoParcel);
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
    //}
}

agentLoop();

/*
async function moveTowardsClosest(myPos, closestCell, where) {
    let dx = closestCell.x - myPos.x;
    let dy = closestCell.y - myPos.y;

    const minDistance = 0.1;

    if(isDel(delCells, myPos)){
        putdown();
    }
    
    if (Math.abs(dx) > minDistance && Number.isInteger(dx)) {
        await move(dx > 0 ? 'right' : 'left');
    }


    if (Math.abs(dy) > minDistance && Number.isInteger(dy)) {
        await move(dy > 0 ? 'up' : 'down');
    }

    if(dx == 0 && dy == 0 && where == "del"){
        putdown();
    }
}*/