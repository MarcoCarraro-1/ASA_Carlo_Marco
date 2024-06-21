import { default as config } from "./config.js";
import { DeliverooApi, timer } from "@unitn-asa/deliveroo-js-client";
import {createMap, shortestPathBFS, manhattanDist, manhattanDistance, delDistances,
        findClosestParcel, nextMove, delivery, updateCarriedPar,
        getCarriedPar, getCarriedValue, emptyCarriedPar, moveTo, arrivedTarget,
        setArrived, findClosestDelCell,
        findFurtherPos,
        iAmOnDelCell,
        iAmOnParcel, setDelivered, delivered,
        getMinCarriedValue, isAdjacentOrSame, assignNewOpposite} from "./utils.js";
import { iAmNearer } from "./intentions.js";

const client = new DeliverooApi( config.host, config.token )
client.onConnect( () => console.log( "socket", client.socket.id ) );
client.onDisconnect( () => console.log( "disconnected", client.socket.id ) );

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
var opposite;



client.onYou((info) => {
    myPos = {x: info.x, y: info.y};
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

async function pickup (  ) 
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


async function agentLoop(){
    while(true){
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

agentLoop();