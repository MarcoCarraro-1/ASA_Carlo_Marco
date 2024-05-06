import { default as config } from "./config.js";
import { DeliverooApi, timer } from "@unitn-asa/deliveroo-js-client";
import {createMap, shortestPathBFS, manhattanDist, manhattanDistance, delDistances,
        findClosestParcel, nextMove, delivery, updateCarriedPar,
        getCarriedPar, getCarriedValue, emptyCarriedPar} from "./utils.js";

const client = new DeliverooApi( config.host, config.token )
client.onConnect( () => console.log( "socket", client.socket.id ) );
client.onDisconnect( () => console.log( "disconnected", client.socket.id ) );

//AGENT_OBSERVATION_DISTANCE = client.config.AGENT_OBSERVATION_DISTANCE;

let delCells = [];      //celle deliverabili
let myPos = [];         //posizione attuale bot
let closestParcel;      //cella con pacchetto libero più vicina
let arrived = false;
let nonCarriedParcels = [];
export let map = [];
let carriedParNumber;
let carriedParValue;


client.onYou((info) => {
    //console.log("Your name:", info.name);
    //console.log("Your position (x, y):", info.x, ",", info.y);
    myPos = {x: info.x, y: info.y};
    //console.log("mypos: ", myPos.x, myPos.y);
    //console.log("Your position (x, y):", myPos);
    //console.log("Your score:", info.score);
    delDistances(myPos, delCells);

    for (const del of delCells) {
        if (del.x === myPos.x && del.y === myPos.y) {
            putdown();
            emptyCarriedPar();
            carriedParNumber = 0;
            carriedParValue = 0;
        }
    }
});


client.onMap((width, height, tiles) => 
{
    map = createMap(width, height, tiles); //map è globale
    //console.log("Map:", map.length, " x ", map[0].length);

    tiles.forEach(tile => {
        if(tile.delivery){
            let cell = { x: tile.x, y: tile.y};
            delCells.push(cell); //vettore di celle deliverabili
        }
    });
    
})


client.onParcelsSensing( ( parcels ) =>
{
    nonCarriedParcels = parcels.filter(parcel => parcel.carriedBy === null);

    if (nonCarriedParcels.length > 0) {
        closestParcel = findClosestParcel(myPos, nonCarriedParcels);
        //console.log("Closest parcel:", closestParcel);
        
        if (closestParcel !== null) {
            let shortestPath = shortestPathBFS(myPos.x, myPos.y, closestParcel.x, closestParcel.y, map);
            //console.log("Shortest Path:");
            //shortestPath.forEach(({ x, y }) => console.log(`(${x}, ${y})`));
            let direction = nextMove(myPos,shortestPath);
            if(direction === 'same'){
                pickup();
                updateCarriedPar(closestParcel);
                carriedParNumber = getCarriedPar();
                carriedParValue = getCarriedValue();
                //console.log("WE ARE CARRYING: ", carriedParNumber, " PARCELS");
                //console.log("OUR TOTAL REWARD: ", carriedParValue);
            } else {
                move(direction);
            }
        }
    } else {
        //console.log("No parcel available");
        delDistances(myPos,delCells);
        delivery(myPos);
        //moveTowardsClosest(myPos, closestDelCell, "del");
        if(arrived){ 
            putdown();
            emptyCarriedPar();
            carriedParNumber = 0;
            carriedParValue = 0;
            arrived = false;
        }
    }

    //map = map.map(row => `[${row.join(', ')}]`).join(',\n'); //stampa la mappa in formato leggibile
    //console.log(`[\n${map}\n]`);
    
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