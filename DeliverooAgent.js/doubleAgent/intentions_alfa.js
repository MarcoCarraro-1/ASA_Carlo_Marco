import { shortestPathBFS } from "./utilsFinal.js"
import { MAP, PARCEL_DECADING_INTERVAL, DOUBLE_ID, BOND_MESSAGE, setDoubleId} from "./globals_alfa.js"
import {agent} from "./doubleAgentAlfaFinal.js"

//we check if it's worth in term of points to pick one parcel
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



export function handleMessage(senderId, msg)
{
    if(msg === BOND_MESSAGE){ //if Beta receives the bond message from Alfa it aknowledges it. Only Beta can receive this message
        agent.say(senderId, "I am Beta, we are now bonded for eternity"); //Beta's answer
        setDoubleId(senderId); //Beta saves Alfa's id
    }
    if(msg === "I am Beta, we are now bonded for eternity"){ //if Alfa receives the aknowledgement, it saves Beta's id
        setDoubleId(senderId);
    }

}

