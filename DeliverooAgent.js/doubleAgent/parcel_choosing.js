import { shortestPathBFS, findClosestParcel } from "./utilsFinal.js"
import { MAP, PARCEL_DECADING_INTERVAL, BOND_MESSAGE, DOUBLE, setDoubleId} from "./globals_alfa.js"
import {agent} from "./doubleAgentAlfaFinal.js"
import {timer} from "@unitn-asa/deliveroo-js-client";

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

export function iAmNearer(myPos, otherAgents, position, BFStoPosition) {//check if I am nearer to 'position' than other agents
    let minDistance;
    try{
        minDistance = BFStoPosition.length; //the distance between me and 'position'
        otherAgents.forEach(agent => {
            if(shortestPathBFS(myPos.x, myPos.y, position.x, position.y, MAP).length < minDistance){
                return false; //there is someone nearer than me
            }
        })
    }catch{
        // console.log("No comparison with other agents");
    }
    return true;
}

// this function check if it's convenient that the double pick up my target parcel instead of me
export function doubleShouldPickUp(parcels, myPos, doublePos, myTargetParcel, otherAgents)
{   
    // if we have only one parcel, there are no other candidate target parcels to pick up
    if(parcels.length <= 1){
        return false;
    }
    let closestParcel;
    let BFStoParcel;
    // remove the target parcel from the list of parcels so we can search for another candidate target
    parcels = parcels.filter(parcel => parcel.id !== myTargetParcel.id);
    [closestParcel, BFStoParcel] = findClosestParcel(myPos, parcels, MAP);
    if(closestParcel === null){
        return false;
    }
    if(iAmNearer(otherAgents, closestParcel, BFStoParcel)){ // if I am the nearest to the other parcel i found
        let otherAgentsCopy = [...otherAgents];
        otherAgentsCopy = otherAgentsCopy.filter(oneAgent => oneAgent.id !== agent.id); // i remove myself from the list of enemies
        if(iAmNearer(doublePos, otherAgentsCopy, myTargetParcel, BFStoParcel)){ // if the double is the nearest (except me) to my original 
            return true;                                                       // target parcel he can go pick it up
        }
    }
}

export function messageHandler(senderId, msg)
{
    if(msg === BOND_MESSAGE){ //if Beta receives the bond message from Alfa it aknowledges it. Only Beta can receive this message
        agent.say(senderId, "I am Beta, we are now bonded for eternity", agent.pos.x, agent.pos.y); //Beta's answer
        // console.log("I am Beta. Bonding completed");
        setDoubleId(senderId); //Beta saves Alfa's id
        return "bonded";
    }
    if(msg === "I am Beta, we are now bonded for eternity"){ //if Alfa receives the aknowledgement, it saves Beta's id
        setDoubleId(senderId);
        // console.log("I am Alfa. Bonding completed");
        return "bonded";
    }
    if(msg === "do you have a target?"){ // 
        if(agent.target){
            agent.say(DOUBLE.id, "i have a target");
            return "i have a target";
        }
        else{
            agent.say(DOUBLE.id, "i don't have a target");
            return "i don't have a target";
        }
        
    }
    if(msg.includes("pick that")) { //if one agent receives a message from the double to pick up a parcel
        let parcel_info = msg.split(" ");
        return "target parcel " + parcel_info[2] + " " + parcel_info[3] + " " + parcel_info[4];
    }
    
}
