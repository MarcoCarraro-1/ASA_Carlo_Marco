import * as action from "./newActions.js";
import {isInEyesight} from "./newUtils.js";

//avendo il percorso per la parcel più vicina, va a prenderla
export function goPickParcel (path) 
{     
    let direction = action.nextMove(myPos,path);
    if(direction === 'same')
    {
        pickup();
        updateCarriedPar(closestParcel);
        carriedParNumber = getCarriedPar();
        carriedParValue = getCarriedValue();
    } 
    else 
    {
        move(direction);
    }
}

//calcola il percorso per arrivare alla delivery più vicina e muove l'agente
export async function goDelivery(myPos, delCells){  
    let closestDeliveryCell = delDistances(myPos, delCells);
    let shortestPath = shortestPathBFS(myPos.x, myPos.y, closestDeliveryCell.x, closestDelCell.y, map);
    let direction = action.nextMove(myPos,shortestPath);
    if(direction === 'same'){
        action.putdown();
    } 
    else 
    {
        action.move(direction);
    }
}

//esplora la mappa quando non ci sono parcel da prendere dirigendosi verso una del cell,
//quando questaentra nel suo campo visivo si dirige alla prossima
export function explore(myPos,delCells, parcelObservationDistance)
{
    for(let i = 0; i < delCells.length; i++)
    {
        let shortestPath = shortestPathBFS(myPos.x, myPos.y, delCells[i].x, delCells[i].y, map);
        let direction = nextMove(myPos,shortestPath);
    
        if(isInEyesight(myPos,delCells[i],parcelObservationDistance)){
            continue;
        } 
        else 
        {
            move(direction);
        }
    }
}
