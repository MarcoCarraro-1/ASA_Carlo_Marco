import { manhattanDistance } from "./utils";

function tradeOff (distanceToPar, distanceToDel, nearestDelDist, parcelVal, carriedPar)
{
    let rewordWhenPicked =  parcelVal - distanceToPar; //il valore della parcel quando viene presa 
                                                //ipotizzando che ogni passo ci impieghi 1 secondo 
    if(rewordWhenPicked <= 0)
        return false;
    let rewordWhenDelivered = rewordWhenPicked - distanceToDel; //il valore della parcel quando viene consegnata
                                                            //nella deliveryCell più vicina ad essa
    if(rewordWhenDelivered <= 0)
        return false;         
    let carriedParLoss = (carriedPar.length * (distanceToPar + distanceToDel)) - rewordWhenDelivered; //il valore perso per ogni parcel già trasportata
                                                                                //se andiamo a prendere la parcel
    if(carriedParLoss < carriedPar.length * nearestDelDist)
        return true; //se la perdita per prendere la nuova parcel è minore della 
                //perdita per consegnare quelle già trasportate, va a prenderla
}

function skipParcel(myPos, agentPos, parPos) //se un altro agente è più vicino alla parcel
{                                           //lascio perdere la parcel
    let meToPar = manhattanDistance(myPos, parPos);
    let agentToPar = manhattanDistance(agentPos, parPos);
    if(meToPar < agentToPar)
        return true;
    return false;  
}



