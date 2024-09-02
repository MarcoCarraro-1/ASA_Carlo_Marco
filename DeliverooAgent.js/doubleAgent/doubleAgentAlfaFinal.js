import { default as config } from "./config.js";
import { DeliverooApi, timer } from "@unitn-asa/deliveroo-js-client";
import {createMap, updateCarriedPar, getCarriedPar, emptyCarriedPar, moveTo, findFurtherPos, iAmOnDelCell,
        iAmOnParcel, getMinCarriedValue, isAdjacentOrSame, assignNewOpposite, executePddlAction,
        checkPos, assignOpposite, checkCondition, counter, getRandomCoordinate, findTargetParcel} from "./utilsFinal.js";
import { generatePlanWithPddl } from "../PddlParser.js";
import {DEL_CELLS, MAP, ARRIVED_TO_TARGET, DELIVERED, setMap, setArrivedToTarget, setDelivered, setParcelDecadingInterval} from"./globals_alfa.js";
import {Agent} from './classAgent.js';

export const client = new DeliverooApi( config.host, config.token_alfa )
client.onConnect( () => console.log("socket", client.socket.id ) );
client.onDisconnect( () => console.log( "disconnected", client.socket.id ) );
export const agent = new Agent(client)

var closestParcel;      //cella con pacchetto libero più vicina
var targetParcel = null;       //cella con pacchetto obiettivo
var firstPath = null;    //path da seguire nel caso in cui non ci sia soluzione ottimale
var closestDelCell;
let agentsCallback;
let otherAgents = [];
let parcelsCallback;
var parcels;
var BFStoParcel;
var BFStoDel;
var BFStoOpposite;
var opposite;
let pddlPlan=undefined;

//get name, id and position of the agent
agent.assignOnYouInfo();

client.onConfig((configInfo) => {
    // console.log("config", configInfo);
    setParcelDecadingInterval(configInfo.PARCEL_DECADING_INTERVAL);
});

client.onAgentsSensing((agents) => {
    otherAgents = agents;
    if (agentsCallback) {
        agentsCallback(agents);
    }
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
    if (parcelsCallback) {
        parcelsCallback(p);
        }
    })

client.onMsg( (id, name, msg, reply) => {
    console.log("new msg received from", id, name+':', msg);
    let answer = 'hello ' + name + ', here is reply.js as ' + me.name + '. Do you need anything?';
    console.log("my reply: ", answer);
    if (reply)
        try { reply(answer) } catch { (error) => console.error(error)}
});

async function agentLoop(){

    while(true){
        while(parcels==undefined){ //wait for the vector of parcels seen on the map to be set
            await timer( 20 );
        }

        await agent.pickup(); //spamming pickup
        
        // we search for a parcel to pickup between the ones we see
        if(targetParcel==null){
            // console.log("look for target");
            // console.log("here7");

            [targetParcel, BFStoDel, BFStoParcel, firstPath, parcels] = findTargetParcel(otherAgents, agent.pos, closestParcel, firstPath, parcels);
            console.log("first findTargetParcel()");
            console.log("returned targetParcel: ", targetParcel); 
            console.log("returned BFStoDel: ", BFStoDel)
            console.log("returned BFStoParcel: ", BFStoParcel) 
            console.log("returned firstPath: ", firstPath)
            console.log("returned parcels: ", parcels);
        }
        
        //
        while(!ARRIVED_TO_TARGET){
            // console.log("inside !ARRIVED_TO_TARGET-while");
            while(parcels==undefined){
                // console.log("inside parcels==undefined-while");
                await timer(20);
            }
            // console.log("MAP_:", MAP);

            if(opposite==null){
                // console.log("MAP OPPOSITE:", MAP);
                opposite = assignOpposite(agent.pos, MAP);
                opposite = {x:(MAP.length-1)-agent.pos.x, y:(MAP.length-1)-agent.pos.y};
                if (isAdjacentOrSame(agent.pos, opposite)) {
                    opposite = assignNewOpposite(agent.pos, MAP.length);
                }
            }
            
            if(iAmOnDelCell(agent.pos)){
                await agent.putdown();
                emptyCarriedPar(); 
                setDelivered(true);
                // console.log("have to put");
                // await new Promise(resolve => setTimeout(resolve, 50));
                // console.log("done it");
            }
            
            // console.log("look for target 2");
            // console.log("initial target:", targetParcel);
            if(targetParcel==null){
                [targetParcel, BFStoDel, BFStoParcel, firstPath, parcels] = findTargetParcel(otherAgents, agent.pos, closestParcel, firstPath, parcels);
                // console.log("second findTargetParcel()");
                // console.log("targetParcel: ", targetParcel); 
                // console.log("\n BFStoDel: ", BFStoDel)
                // console.log("\n BFStoParcel: ", BFStoParcel) 
                // console.log("\n firstPath: ", firstPath)
                // console.log( "\n parcels: ", parcels);
            }

            if(targetParcel==null){
                // console.log("no target parcel");
                if(!DELIVERED ){
                    // console.log("go to del subitooooo");
                    agent.pos = checkPos(agent.pos.x, agent.pos.y);
                    await moveTo(agent.pos, BFStoDel);
                }else{
                    // console.log("già deliveratoooooooo");
                    if(iAmOnDelCell(agent.pos)){
                        emptyCarriedPar();
                        setDelivered(true);
                        try{
                            // console.log("have to put2");
                            await agent.putdown();
                            // await new Promise(resolve => setTimeout(resolve, 50));
                        } catch {

                        }
                        // console.log("have to put3");
                        await agent.putdown();
                        // await new Promise(resolve => setTimeout(resolve, 50));
                    }
                    opposite.x = Math.floor(opposite.x);
                    opposite.y = Math.floor(opposite.y);
                    [opposite, BFStoOpposite] = findFurtherPos(agent.pos,opposite);
                    // console.log("here2");
                    agent.pos = checkPos(agent.pos.x, agent.pos.y);
                    await moveTo(agent.pos, BFStoOpposite);
                }

            }else{
                // console.log("yes target");
                agent.pos = checkPos(agent.pos.x, agent.pos.y);
                if((BFStoDel.length<BFStoParcel.length || BFStoParcel.length>=getMinCarriedValue()) 
                && !DELIVERED  && getCarriedPar()!=0 
                && getCarriedPar()!=undefined){
                    // console.log("go to del");
                    await moveTo(agent.pos, BFStoDel);
                } else {
                    // console.log("go to par");
                    // console.log("bfstoparcel:",BFStoParcel);
                    try{
                        await moveTo(agent.pos, BFStoParcel);
                        // console.log("moved");
                    }catch{
                        // console.log("error in moving");
                    }
                }
                
            }
            // console.log("checking arrived:",ARRIVED_TO_TARGET);
        }

        if(iAmOnParcel(agent.pos, parcels)){
            setDelivered(false);
            updateCarriedPar(targetParcel);
            // console.log("here5");
            await agent.pickup();
        }else if(iAmOnDelCell(agent.pos)){
            // console.log("have to put4");
            await agent.putdown();
            // await new Promise(resolve => setTimeout(resolve, 50));
            emptyCarriedPar();
            setDelivered(true);
        }
        setArrivedToTarget(false);
        targetParcel=null;
        //console.log("SETTO A FALSEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE");
        
        opposite = {x:(MAP.length-1)-agent.pos.x, y:(MAP.length-1)-agent.pos.y};
        if (isAdjacentOrSame(agent.pos, opposite)) {
            opposite = assignNewOpposite(agent.pos, MAP.length);
        }
    }
}


async function agentLoop_pddl(){
    while(true){
        // console.log("Using PDDL logic");
        while(parcels==undefined || MAP==undefined){
            await timer(20);
        }
        
        if(targetParcel==null){
            targetParcel = findTargetParcel_pddl();
        }

        while(!ARRIVED_TO_TARGET){
            while(parcels==undefined){
                await timer( 20 );
            }

            if(opposite==null){
                opposite = assignOpposite(agent.pos, MAP);
                opposite = {x:(MAP.length-1)-agent.pos.x, y:(MAP.length-1)-agent.pos.y};
                if (isAdjacentOrSame(agent.pos, opposite)) {
                    opposite = assignNewOpposite(agent.pos, MAP.length);
                }
            }

            if(iAmOnDelCell(agent.pos)){
                emptyCarriedPar();
                setDelivered(true);
                await agent.putdown();
                // await new Promise(resolve => setTimeout(resolve, 50));
                //let pddlPlan = await generatePlanWithPddl(parcels, otherAgents, MAP, agent.pos, me, "putdown");
            }

            if(targetParcel==null){
                targetParcel = findTargetParcel_pddl();
            }

            if(targetParcel==null){
                if(!DELIVERED ){
                    agent.pos = checkPos(agent.pos.x, agent.pos.y);
                    
                    pddlPlan=undefined;
                    while(pddlPlan==undefined){
                        pddlPlan = await generatePlanWithPddl(parcels, otherAgents, MAP, closestDelCell, me, "del");
                        // console.log("block1");
                    }
                    for (let action of pddlPlan) {
                        await executePddlAction(action);
                        
                        if (parcels.length != 0 || targetParcel != null) {
                            break;
                        }
                    }
                    emptyCarriedPar();
                    setDelivered(true);
                    await agent.putdown();
                    // await new Promise(resolve => setTimeout(resolve, 50));
                }else{
                    if(iAmOnDelCell(agent.pos)){
                        emptyCarriedPar();
                        setDelivered(true);
                        await agent.putdown();
                        // await new Promise(resolve => setTimeout(resolve, 50));
                    }
                    //opposite = {x:Math.round((MAP.length-1)-agent.pos.x), y:Math.round((MAP.length-1)-agent.pos.y)};
                    opposite.x = Math.floor(opposite.x);
                    opposite.y = Math.floor(opposite.y);
                    if (isAdjacentOrSame(agent.pos, opposite) || checkCondition(agent.pos, MAP, opposite)) {
                        opposite = assignNewOpposite(agent.pos, MAP.length);
                    }
                    //[opposite, BFStoOpposite] = findFurtherPos(agent.pos,opposite);
                    // console.log("OPPOSITE:", opposite);
                    agent.pos = checkPos(agent.pos.x, agent.pos.y);
                    pddlPlan=undefined;
                    while(pddlPlan==undefined){
                        pddlPlan = await generatePlanWithPddl(parcels, otherAgents, MAP, opposite, me, "opp");
                        // console.log("block2");
                        counter.countAttempts++;
                        // console.log("counter",counter.countAttempts);
                        if(counter.countAttempts>5){
                            // console.log("Forcing opposite");
                            opposite.x=agent.pos.x;
                            opposite.y=0;
                            counter.countAttempts=0;
                            if(opposite.x==agent.pos.x && opposite.y==agent.pos.y){
                                opposite.x=0;
                                opposite.y=agent.pos.y;
                            }
                            if(opposite.x==agent.pos.x && opposite.y==agent.pos.y &&
                                agent.pos.x==0 && agent.pos.y==0){
                                opposite.x=getRandomCoordinate(MAP.length);
                                opposite.y=getRandomCoordinate(MAP[0].length);
                            }
                            
                        }
                        if(MAP[opposite.x][opposite.y] != 1){
                            opposite.x=getRandomCoordinate(MAP.length);
                            opposite.y=getRandomCoordinate(MAP[0].length);
                        }
                    }                        
                    // console.log("agent.pos:", agent.pos);
                    // console.log("plan:", pddlPlan);
                    for (let action of pddlPlan) {
                        await executePddlAction(action);
                        
                        if (parcels.length != 0 || targetParcel != null) {
                            break;
                        }
                    }
                }
            
            }else{
                agent.pos = checkPos(agent.pos.x, agent.pos.y);
                if((BFStoDel.length<=BFStoParcel.length || BFStoParcel.length>=getMinCarriedValue()) 
                    && !DELIVERED  && getCarriedPar()!=0 
                    && getCarriedPar()!=undefined){
                        pddlPlan=undefined;
                        while(pddlPlan==undefined){
                            pddlPlan = await generatePlanWithPddl(parcels, otherAgents, MAP, closestDelCell, me, "del");
                            // console.log("block3");
                        }
                        
                        for (let action of pddlPlan) {
                            await executePddlAction(action);
                            
                            if (parcels == undefined || targetParcel == null) {
                                break;
                            }
                        }
                        emptyCarriedPar();
                        setDelivered(true);
                        await agent.putdown();
                } else {
                    try{
                        pddlPlan=undefined;
                        while(pddlPlan==undefined){
                            pddlPlan = await generatePlanWithPddl(parcels, otherAgents, MAP, targetParcel, me,"toparcel");    
                            // console.log("block4");
                        }
                        
                        for (let action of pddlPlan) {
                            await executePddlAction(action);
                            
                            if (parcels == undefined || targetParcel == null) {
                                break;
                            }
                        }
                        setDelivered(false);
                        updateCarriedPar(targetParcel);
                    }catch{
                        
                    }
                }
            }

            if(iAmOnParcel(agent.pos, parcels)){
                setDelivered(false);
                updateCarriedPar(targetParcel);
                await agent.pickup();
            }else if(iAmOnDelCell(agent.pos)){
                emptyCarriedPar();
                setDelivered(true);
                await agent.putdown();
                // await new Promise(resolve => setTimeout(resolve, 50));
            }
            setArrivedToTarget(false);
            targetParcel=null;

            opposite = {x:(MAP.length-1)-agent.pos.x, y:(MAP.length-1)-agent.pos.y};
            if (isAdjacentOrSame(agent.pos, opposite)) {
                opposite = assignNewOpposite(agent.pos, MAP.length);
            }
        }
        

        if (!pddlPlan || pddlPlan.length === 0) {
            // console.log("PDDL plan not found");
            //continue;
            break;
        }
    }
}

function startGame() {
    
    counter.countAttempts=0;
    if (process.argv[2] === 'pddl') {
        agentLoop_pddl();
    } else {
        agentLoop();
    }

}

startGame();
// Your code here