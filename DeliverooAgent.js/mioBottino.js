import { default as config } from "./config.js";
import { DeliverooApi, timer } from "@unitn-asa/deliveroo-js-client";
import {default as createMap} from "./utils.js";

const client = new DeliverooApi( config.host, config.token )
client.onConnect( () => console.log( "socket", client.socket.id ) );
client.onDisconnect( () => console.log( "disconnected", client.socket.id ) );

//AGENT_OBSERVATION_DISTANCE = client.config.AGENT_OBSERVATION_DISTANCE;

let delCells = [];      //celle deliverabili
let delCellsLength = 0; //lunghezza delCells
let myPos = [];         //posizione attuale bot
let delDists = [];      //distanza da celle deliverabili
let closestDelCell;     //cella deliverabile più vicina
let closestParcel;      //cella con pacchetto libero più vicina
let arrived = false;
let nonCarriedParcels = [];

/*client.onTile((x,y,delivery) => 
{
    console.log( 'tile', x, y, delivery );
})*/

function manhattanDist(pos, cells) {       //valuta la manhattan distance tra posizione attuale e insieme di celle
    let distances = [];

    cells.forEach(cell => {
        let dist = Math.abs(pos.x - cell.x) + Math.abs(pos.y - cell.y);
        distances.push(dist);
    });

    return distances;
}

function manhattanDistance(pos1, pos2) {    //valuta la manhattan distance tra due celle
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
}

function delDistances(myPos, delCells){     //valuta la distanza tra posizione attuale e celle deliverabili indicando la più vicina
    delDists = manhattanDist(myPos, delCells)
    //console.log("Distances from delivery cells: ", delDists);

    let minDistance = Math.min(...delDists);
    let closestCellIndex = delDists.indexOf(minDistance);
    closestDelCell = delCells[closestCellIndex];
    closestDelCell.distance = minDistance;

    //console.log("Closest delivery cell position (x, y):", closestDelCell.x, ",", closestDelCell.y);
    //console.log("Distance to closest delivery cell:", closestDelCell.distance);
}

function findClosestParcel(myPos, parcels) {    //valuta la distanza tra posizione attuale e pacchetto libero più vicino
    if (parcels.length === 0) {
        return null;
    }

    let closestParcel = parcels[0];
    let closestDistance = manhattanDistance(myPos, { x: closestParcel.x, y: closestParcel.y });

    for (let i = 1; i < parcels.length; i++) {
        let distance = manhattanDistance(myPos, { x: parcels[i].x, y: parcels[i].y });
        if (distance < closestDistance) {
            closestParcel = parcels[i];
            closestDistance = distance;
        }
    }

    return closestParcel;
}

function isDel(delCellsList, pos) {
    for (let i = 0; i < delCellsLength; i++) {
        if (delCellsList[i].x == pos.x && delCellsList[i].y == pos.y) {
            return true; // Found a matching object
        }
    }
    return false; // No matching object found
}


client.onYou((info) => {
    //console.log("Your name:", info.name);
    //console.log("Your position (x, y):", info.x, ",", info.y);
    myPos = {x: info.x, y: info.y};
    //console.log("Your position (x, y):", myPos);
    //console.log("Your score:", info.score);
    delDistances(myPos, delCells);
});


client.onMap((width, height, tiles) => 
{
    createMap(width, height, tiles);
    tiles.forEach(tile => {
        if(tile.delivery){
            let cell = { x: tile.x, y: tile.y};
            delCells.push(cell); //vettore di celle deliverabili
            delCellsLength = delCellsLength + 1;
        }
    });
    //console.log(delCells);
    //console.log( 'map', width, height, tiles );
    //console.log('delivery', width, height, tiles.delivery );
})

//const dist = (a1, a2) => Math.abs(a1.x - a2.x) + Math.abs(a1.y - a2.y); //manhattan distance, si può comparare
                                                                        //con AGENT_OBSERVATION_DISTANCE per vedere qualcosa

client.onParcelsSensing( ( parcels ) =>
{
    //console.log( "parcels sensing", parcel );
    nonCarriedParcels = parcels.filter(parcel => parcel.carriedBy === null);
    //closestParcel = findClosestParcel(myPos, nonCarriedParcels);

    if (nonCarriedParcels.length > 0) {
        closestParcel = findClosestParcel(myPos, nonCarriedParcels);
        //console.log("Closest parcel:", closestParcel);
        //console.log("Distance to closest parcel:", manhattanDistance(myPos, closestParcel));
        
        if (closestParcel !== null) {
            moveTowardsClosest(myPos, closestParcel, "par");
            pickup();

        }
    } else {
        console.log("No parcel available");
        moveTowardsClosest(myPos, closestDelCell, "del");
        if(arrived){ //arrived è globale
            console.log("Entro e putto");
            putdown();
            arrived = false;
        }
    }
    
})

async function move ( direction ) 
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

async function putdown (  ) 
{
    await client.putdown();
    
}

async function moveTowardsClosest(myPos, closestCell, where) {
    let dx = closestCell.x - myPos.x;
    let dy = closestCell.y - myPos.y;

    const minDistance = 0.1;

    if(isDel(delCells, myPos)){
        putdown();
    }
    
    //console.log("LA dx è ", dx);
    //console.log("LA dy è ", dy);
    
    if (Math.abs(dx) > minDistance /*&& Number.isInteger(dx)*/) {
        await move(dx > 0 ? 'right' : 'left');
    }

if (Math.abs(dy) > minDistance /*&& Number.isInteger(dy)*/) {
        await move(dy > 0 ? 'up' : 'down');
    }

    if(dx == 0 && dy == 0 /*&& where == "del"*/){
        arrived = true;
        putdown();
    }
}



//move('down');
//pickup();
//moveTowardsClosestParcel(myPos, closestParcel);