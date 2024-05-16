import { nextMove } from "./newActions.js";

//avendo il percorso per la parcel più vicina, va a prenderla
export function goPickParcel (path) 
{     
    //console.log("Shortest Path:");
    //shortestPath.forEach(({ x, y }) => console.log(`(${x}, ${y})`));
    let direction = nextMove(myPos,path);
    if(direction === 'same')
    {
        pickup();
        updateCarriedPar(closestParcel);
        carriedParNumber = getCarriedPar();
        carriedParValue = getCarriedValue();
        //console.log("WE ARE CARRYING: ", carriedParNumber, " PARCELS");
        //console.log("OUR TOTAL REWARD: ", carriedParValue);
    } 
    else 
    {
        move(direction);
    }
}

//calcola il percorso per arrivare alla delivery più vicina e muove l'agente
export function goDelivery(myPos, delCells){  
    let closestDeliveryCell = delDistances(myPos, delCells);
    //console.log("distanza da mia posizione a celle deliverabili: ", delDists);
    let shortestPath = shortestPathBFS(myPos.x, myPos.y, closestDeliveryCell.x, closestDelCell.y, map);
    //console.log("Shortest Path:");
    //shortestPath.forEach(({ x, y }) => console.log(`(${x}, ${y})`));
    let direction = nextMove(myPos,shortestPath);
    if(direction === 'same'){
        putdown();
    } 
    else 
    {
        move(direction);
    }
}
