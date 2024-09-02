import { shortestPathBFS } from "./utilsFinal.js"
import { MAP, PARCEL_DECADING_INTERVAL } from "./globals_alfa.js"

export function tradeOff (distanceToParcel, parcelDistanceToDel, nearestDelDistToMe, parcelVal, carriedParLength)
{
    let valueWhenPicked =  parcelVal - (distanceToParcel * PARCEL_DECADING_INTERVAL); //the value of the parcel when picked up
                                                                                    //assuming every step take 1 unit of value 
    if(valueWhenPicked <= 0){
        //console.log("value when picked <0");
        return false;
    }
    
    let valueWhenDelivered = valueWhenPicked - parcelDistanceToDel; //the value of the parcel when delivered to its nearest delivery cell
    if(valueWhenDelivered <= 0){
        //console.log("value when delivered <0");
        return false;         
    }
    
    let carriedParLoss = (carriedParLength * (distanceToParcel + parcelDistanceToDel)) - valueWhenDelivered; //the value loss for the 
                                                                                                //carried parcels if we go pickup 
                                                                                                //and deliver this parcel
    if(carriedParLoss < carriedParLength * nearestDelDistToMe)
        return true; //if the loss to deliver the new parcel is counterbalanced by its value we go to pick up and deliver it
}

export function iAmNearer(otherAgents, position, BFStoPosition) {//check if I am nearer to 'position' than other agents
    let minDistance;
    try{
        minDistance = BFStoPosition.length; //the distance between me and 'position'
        otherAgents.forEach(agent => {
            if(shortestPathBFS(agent.x, agent.y, position.x, position.y, MAP).length < minDistance){
                return false; //there is someone nearer than me
            }
        })
    }catch{
        // console.log("No comparison with other agents");
    }
    return true;
}

export function msgCreator( )
{

}

