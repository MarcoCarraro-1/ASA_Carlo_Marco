import { manhattanDistance } from "./utils.js"

export function tradeOff (distanceToPar, distanceToDel, nearestDelDist, parcelVal, carriedPar)
{
    let rewordWhenPicked =  parcelVal - distanceToPar; //il valore della parcel quando viene presa 
                                                //ipotizzando che ogni passo ci impieghi 1 secondo 
    if(rewordWhenPicked <= 0){
        console.log("Rewardwhenpicked <0");
        return false;
    }
        
    let rewordWhenDelivered = rewordWhenPicked - distanceToDel; //il valore della parcel quando viene consegnata
                                                            //nella deliveryCell più vicina ad essa
    if(rewordWhenDelivered <= 0){
        console.log("Rewardwhendelivered <0");
        return false;         
    }
        
    let carriedParLoss = (carriedPar.length * (distanceToPar + distanceToDel)) - rewordWhenDelivered; //il valore perso per ogni parcel già trasportata
                                                                                //se andiamo a prendere la parcel
    if(carriedParLoss < carriedPar.length * nearestDelDist)
        return true; //se la perdita per prendere la nuova parcel è minore della 
                //perdita per consegnare quelle già trasportate, va a prenderla
}

function iAmNearer(myPos, otherAgents, parcelPos) //se un altro agente è più vicino alla parcel
{                                           //lascio perdere la parcel

    let meToParcel = manhattanDistance(myPos, parcelPos);
    let minDistance = meToParcel;
    otherAgents.forEach(agent => {
        let agentPos = {x: agent.x, y: agent.y};
        if(manhattanDistance(agentPos, parPos) < minDistance)
            return false;
        })  
    return true;
}



