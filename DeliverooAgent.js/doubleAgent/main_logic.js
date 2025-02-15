import { default as config } from "./config.js";
import { DeliverooApi, timer } from "@unitn-asa/deliveroo-js-client";
import {createMap, getCarriedPar, emptyCarriedPar, moveTo, shortestPathBFS, iAmOnDelCell,
        iAmOnParcel, executePddlAction, checkPos, findTargetParcel, 
        findTargetParcel_pddl, bondToDouble} from "./utils.js";
import { generatePlanWithPddl } from "../PddlParser.js";
import { messageHandler } from "./parcel_choosing.js";
import {DEL_CELLS, MAP, ARRIVED_TO_TARGET, DOUBLE_AGENT,rotateDeliveryCells, setMap, 
        setArrivedToTarget, setParcelDecadingInterval, setDoubleAgent, setResponse} from"./globals.js";
import {Agent} from './class_agent.js';

var closestParcel;      //cella con pacchetto libero più vicina
var targetParcel = null;      //cella con pacchetto obiettivo
var firstPath = null;    //path da seguire nel caso in cui non ci sia soluzione ottimale
var closestDelCell;
let otherAgents = [];
var parcels;            //vettore di parcelle viste
var BFStoTargetParcel;  //path da seguire per raggiungere la cella con il pacchetto obiettivo
let pddlPlan=undefined;
let token;

if (process.argv[2] === 'alfa'){
    setDoubleAgent(true);
    console.log("I'm agent ALfa");
    token = config.token_alfa;
} else if (process.argv[2] === 'beta'){
    setDoubleAgent(true);
    console.log("I'm agent Beta");
    token = config.token_beta;
} else {
    setDoubleAgent(false);
    console.log("I'm single agent");
    token = config.token_alfa;
}

export const client = new DeliverooApi( config.host, token);
client.onConnect( () => console.log("socket", client.socket.id ) );
client.onDisconnect( () => console.log( "disconnected", client.socket.id ) );
export const agent = new Agent(client)

//get name, id and position of the agent
agent.assignOnYouInfo();
agent.assignCarriedParcels();

client.onConfig((configInfo) => {
    // console.log("config", configInfo);
    setParcelDecadingInterval(configInfo.PARCEL_DECADING_INTERVAL);
});

client.onAgentsSensing((agents) => {
    otherAgents = agents;
})

client.onMap((width, height, tiles) => {
    let map = createMap(width, height, tiles);
    setMap(map); //assign map to global MAP
    // console.log("MAP:", MAP);
    tiles.forEach(tile => {
        if(tile.delivery){
            let cell = { x: tile.x, y: tile.y};
            DEL_CELLS.push(cell); //vettore di celle deliverabili
        }
    });
});

client.onParcelsSensing((p)=> {
    parcels = p.filter(parcel => parcel.carriedBy === null);
    })

client.onMsg( (senderId, senderName, msg) => {
    // console.log("new msg received from", senderId, senderName + ':', msg);
    let response = messageHandler(senderId, msg);
    setResponse(response);
})


// if we are in the double agent mode we bond to the other agent
if(DOUBLE_AGENT){  
    // console.log(DOUBLE_AGENT);
    await timer(100);
    await bondToDouble();
}

await timer(100); // wait for everything to be set

// the main logic. Everything happens here
async function agentLoop(){

    while(parcels==undefined) //wait for the vector of parcels seen on the map to be set
    { 
        await timer( 20 );
    }
    let BFStoDel = [];
    while(true)
    {
        // console.log("top of the cycle");
        agent.pickup(); //spamming pickup
        
        if(iAmOnDelCell(agent.pos)) // we putdown every time we are on a delivery cell
        {  
            // console.log("have to put");
            await agent.putdown();
            await emptyCarriedPar(); 
            // console.log("done it");
        }

        // we constantly search for a parcel to pickup between the ones we see if we don't have a target
        agent.assignTarget(targetParcel);
        if(targetParcel==null)
        {
            // console.log("starting target is null");
            [targetParcel, BFStoDel, BFStoTargetParcel, firstPath, parcels] = await findTargetParcel(otherAgents, agent.pos, closestParcel, firstPath, parcels);
            // console.log("first findTargetParcel()");
            // console.log("first returned targetParcel: ", targetParcel); 
            // console.log("returned BFStoDel: ", BFStoDel)
            // console.log("returned BFStoTargetParcel: ", BFStoTargetParcel) 
            // console.log("returned firstPath: ", firstPath)
            // console.log("returned parcels: ", parcels, parcels.length);
        }
        agent.assignTarget(targetParcel);

        // if we have to reach the cell of the target parcel 
        while(!ARRIVED_TO_TARGET)
        {
            // console.log("inside !ARRIVED_TO_TARGET-while: ", ARRIVED_TO_TARGET);
            while(parcels==undefined){ // wait for the vector of the seen parcels to be ready
                // console.log("inside parcels==undefined-while");
                await timer(20);
            }
            if(iAmOnDelCell(agent.pos)){ // another putdown inside here just to be sure
                // console.log("have to put");
                await agent.putdown();
                await emptyCarriedPar(); 
                // console.log("done it");
            }

            // console.log("MAP_:", MAP);
            // console.log("look for target 2");
            // console.log("initial target:", targetParcel);
            // if we don't have a target and we are not carrying a lot of parcels, we look for one between the parcels we see
            if(getCarriedPar() < 5 && targetParcel==null)
            {
                agent.assignTarget(targetParcel);
                // console.log("no target parcel");
                [targetParcel, BFStoDel, BFStoTargetParcel, firstPath, parcels] = await findTargetParcel(otherAgents, agent.pos, closestParcel, firstPath, parcels);
                // console.log("second findTargetParcel()");
                // console.log("targetParcel of second findTargetParcel: ", targetParcel); 
                // console.log("\n BFStoDel: ", BFStoDel);
                // console.log("\n BFStoTargetParcel: ", BFStoTargetParcel);
                // console.log("\n firstPath: ", firstPath);
                // console.log( "\n parcels: ", parcels);
                agent.pickup(); //spamming pickup
                agent.assignTarget(targetParcel);
            }
            // console.log("outside second findTargetParcel()");
            // if we still don't have a target (no parcel is seen or is pickable) or we are carrying a lot of parcels we see if we explore or we deliver
            if(getCarriedPar() > 5 || targetParcel==null)
            {
                targetParcel = null
                // console.log("inside getCarriedPar() > 4 || targetParcel==null");
                agent.assignTarget(targetParcel);
                // console.log("no target parcel");

                // If we are carrying something and there are no targets we go deliver
                if((getCarriedPar() != 0 && getCarriedPar() != undefined))
                {
                    // console.log("going to deliver");
                    if(DOUBLE_AGENT)
                        setResponse("I have a target"); // we are busy with the delivery, so we can't take targets from the other agent
                    agent.pos = checkPos(agent.pos.x, agent.pos.y); // checkPos round the non integer values of pos coordinates
                    agent.pickup(); //spamming pickup
                    await moveTo(agent.pos, BFStoDel);
                    if(iAmOnDelCell(agent.pos)) // we putdown every time we are on a delivery cell
                    {  
                        // console.log("have to put");
                        await agent.putdown();
                        await emptyCarriedPar(); 
                        // console.log("done it");
                    }
                }
                // target is null and we have nothing to deliver:
                // we start exploring the map going in the direction of the delivery cells
                // searching for parcels
                else 
                { 
                    // console.log("exploring");
                    if(iAmOnDelCell(agent.pos)) // for robustness
                    { // another putdown inside here just to be sure
                        // console.log("have to put");
                        await agent.putdown();
                        await emptyCarriedPar(); 
                        // console.log("done it");
                    }
                    // console.log("Carried Parcels inside exploring: ", agent.carriedParcels);
                    // find the path to the first delivery cell of the vector
                    let BFS_toExplore = shortestPathBFS(agent.pos.x, agent.pos.y, DEL_CELLS[0].x, DEL_CELLS[0].y);
                    // console.log("BFS_toExplore:", BFS_toExplore);
                    // rotate to the right the vector DEL_CELLS so next time we pick a different delivery cell
                    // console.log("DEL_CELLS[0]:", DEL_CELLS[0]);
                    let dist = Math.abs(agent.pos.x - DEL_CELLS[0].x) + Math.abs(agent.pos.y - DEL_CELLS[0].y);
                    // console.log("dist:", dist);
                    // remove the last 3 elements of the path so we stop a little before
                    BFS_toExplore.splice(-3,3)
                    // console.log("BFS_toExplore:", BFS_toExplore);
                    if(dist <= 3)
                        rotateDeliveryCells();
                    else
                        await moveTo(agent.pos, BFS_toExplore);
                }
            } 
            // if we have a target parcel
            else
            {
                agent.assignTarget(targetParcel);
                // console.log("yes target");
                // console.log("\n BFStoTargetParcel: ", BFStoTargetParcel);
                agent.pos = checkPos(agent.pos.x, agent.pos.y);  // checkPos round the non integer values of pos coordinates
                try{
                    await moveTo(agent.pos, BFStoTargetParcel);
                    // console.log("moved");
                }catch{
                    // console.log("error in moving");
                }
            }
            // console.log("checking arrived:",ARRIVED_TO_TARGET);
        }

        if(iAmOnParcel(agent.pos, parcels))
        {
            await agent.pickup(); // if we are on parcel we pickup
            // console.log("here5");
        }
        if(iAmOnDelCell(agent.pos)) // we putdown every time we are on a delivery cell
        {  
            // console.log("have to put");
            await agent.putdown();
            await emptyCarriedPar(); 
            // console.log("done it");
        }
        setArrivedToTarget(false);
        targetParcel=null;
        agent.assignTarget(targetParcel);
        await agent.pickup(); //spamming pickup
    }
}


async function agentLoop_pddl(){

    while(parcels==undefined || MAP==undefined){
        await timer(20);
    }

    while(true){
        // console.log("Using PDDL logic");
        // console.log("top of the cycle");
        agent.pickup(); //spamming pickup
        if(iAmOnDelCell(agent.pos)) // we putdown every time we are on a delivery cell
        {  
            // console.log("have to put");
            await agent.putdown();
            await emptyCarriedPar(); 
            // console.log("done it");
        }
        agent.assignTarget(targetParcel);
        if(targetParcel==null)
        {
            [targetParcel, BFStoDel, BFStoTargetParcel, firstPath, parcels] = findTargetParcel_pddl(otherAgents, agent.pos, closestParcel, firstPath, parcels);
            // console.log("first findTargetParcel()");
            // console.log("first returned targetParcel: ", targetParcel); 
            // console.log("returned BFStoDel: ", BFStoDel)
            // console.log("returned BFStoTargetParcel: ", BFStoTargetParcel) 
            // console.log("returned firstPath: ", firstPath)
            // console.log("returned parcels: ", parcels, parcels.length);
        }
        agent.assignTarget(targetParcel);

        while(!ARRIVED_TO_TARGET){
            while(parcels==undefined){
                await timer(20);
            }
            if(iAmOnDelCell(agent.pos)){
                await agent.putdown();
                await emptyCarriedPar();
            }

            if(getCarriedPar() < 5 && targetParcel==null)
            {
                agent.assignTarget(targetParcel);
                [targetParcel, BFStoDel, BFStoTargetParcel, firstPath, parcels] = findTargetParcel_pddl(otherAgents, agent.pos, closestParcel, firstPath, parcels);
                agent.assignTarget(targetParcel);
                agent.pickup(); //spamming pickup
            }

            if(getCarriedPar() > 5 || targetParcel==null)
            {
                targetParcel = null
                agent.assignTarget(targetParcel);
                // If we are carrying something and there are no targets we go deliver
                if((getCarriedPar() != 0 && getCarriedPar() != undefined))
                {
                    agent.pos = checkPos(agent.pos.x, agent.pos.y); // checkPos round the non integer values of pos coordinates
                    
                    pddlPlan=undefined;
                    while(pddlPlan==undefined){
                        pddlPlan = await generatePlanWithPddl(parcels, otherAgents, MAP, closestDelCell, agent, "del");
                        // console.log("block1");
                    }
                    for (let action of pddlPlan) {
                        await executePddlAction(action);
                        
                        if (parcels.length != 0 || targetParcel != null) {
                            break;
                        }
                    }
                }
                // target is null and we have nothing to deliver:
                // we start exploring the map going in the direction of the delivery cells
                // searching for parcels
                else
                {
                    if(iAmOnDelCell(agent.pos)){
                        await agent.putdown();
                        await emptyCarriedPar();
                        // await new Promise(resolve => setTimeout(resolve, 50));
                    }
                    let dist = Math.abs(agent.pos.x - DEL_CELLS[0].x) + Math.abs(agent.pos.y - DEL_CELLS[0].y);
                    if(dist <= 3)
                        rotateDeliveryCells();
                    else
                    {
                        agent.pos = checkPos(agent.pos.x, agent.pos.y); // checkPos round the non integer values of pos coordinates
                        pddlPlan=undefined;
                        while(pddlPlan==undefined)
                        {
                            pddlPlan = await generatePlanWithPddl(parcels, otherAgents, MAP, DEL_CELLS[0], agent, "opp");
                        }
                        for (let action of pddlPlan) 
                            {
                                await executePddlAction(action);
                                
                                if (parcels.length != 0 || targetParcel != null) 
                                    break;
                            }
                         // console.log("block2");
                        // console.log("agent.pos:", agent.pos);
                        // console.log("plan:", pddlPlan);
                    } 
                }
            
            }
            else
            {
                agent.pos = checkPos(agent.pos.x, agent.pos.y); // checkPos round the non integer values of pos coordinates
                agent.assignTarget(targetParcel);
                if(iAmOnDelCell(agent.pos))
                { // another putdown inside here just to be sure
                    // console.log("have to put");
                    await agent.putdown();
                    await emptyCarriedPar(); 
                    // console.log("done it");
                }
                try{
                        pddlPlan=undefined;
                        while(pddlPlan==undefined)
                        {
                            pddlPlan = await generatePlanWithPddl(parcels, otherAgents, MAP, targetParcel, agent, "toparcel");
                            // console.log("block3");
                        }
                        
                        for (let action of pddlPlan) 
                        {
                            await executePddlAction(action);
                            
                            if (parcels == undefined || targetParcel == null) 
                                break;
                        }
                        
                        await agent.putdown();
                        await emptyCarriedPar();
                }
                catch{
                    console.log("error in moving");
                }
            }

            if(iAmOnParcel(agent.pos, parcels)){
                await agent.pickup();
            }else 
            if(iAmOnDelCell(agent.pos)){
                await agent.putdown();
                await emptyCarriedPar();
            }
            setArrivedToTarget(false);
            targetParcel=null;
            agent.assignTarget(targetParcel);
            agent.pickup();
        }
        
        if (!pddlPlan || pddlPlan.length === 0) {
            // console.log("PDDL plan not found");
            //continue;
            break;
        }
    }
}

function startGame() {
    if (process.argv[2] === 'pddl') {
        agentLoop_pddl();
    } else {
        agentLoop();
    }
}

startGame();
