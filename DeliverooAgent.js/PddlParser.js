import fs from 'fs';
import { PddlProblem, Beliefset, onlineSolver } from '@unitn-asa/pddl-client';

async function readDomain() {
    let domain = await new Promise((resolve, reject) => {
        fs.readFile('board-domain.pddl', 'utf8', function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });

    return domain;
}

async function saveToFile(encodedProblem) {
    var path = 'personalProblem.pddl';

    return new Promise((res, rej) => {
        fs.writeFile(path, encodedProblem, (err) => {
            if (err) {
                rej(err);
            } else {
                res(path);
            }
        });
    });
}

function addMapToBeliefSet(beliefs, map) {
    for (let i = 0; i < map.length; i++) {
        for (let j = 0; j < map.length; j++) {
            beliefs.addObject(`tile_${i}-${j}`);
        }
    }
}

function addParcelsToBeliefSet(beliefs, parcels) {
    for (const parcel of parcels.values()) {
        beliefs.addObject(`parcel_${parcel.id}`);
    }
}

function addMyselfToBeliefSet(beliefs, me) {
    beliefs.addObject(`me_${me.id}`);
}

function addAgentsToBeliefSet(beliefs, agents) {
    if (agents.size === 1) {
        return;
    }

    for (const agent of agents.values()) {
        beliefs.addObject(`agent_${agent.id}`);
    }
}

function assignTileType(beliefsSet, map) {
    const height = map.length;
    const width = map[0].length;
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            if (map[i][j] === 0) {
                beliefsSet.declare(`wall tile_${i}-${j}`);
            } else if (map[i][j] === 1) {
                beliefsSet.declare(`tile tile_${i}-${j}`);
            } else if (map[i][j] === 2) {
                beliefsSet.declare(`tile tile_${i}-${j}`);
                beliefsSet.declare(`delivery tile_${i}-${j}`);
            }
     
            if (i < width-1 && i >= 0) {
                beliefsSet.declare(`right tile_${i}-${j} tile_${i+1}-${j}`);
            }
            if (i < width && i > 0) {
                beliefsSet.declare(`left tile_${i}-${j} tile_${i-1}-${j}`);
            }
            if (j < height-1 && j >= 0) {
                beliefsSet.declare(`up tile_${i}-${j} tile_${i}-${j+1}`);
            }
            if (j < height && j > 0) {
                beliefsSet.declare(`down tile_${i}-${j} tile_${i}-${j-1}`);
            }
        }
    }
}

function declareParcels(beliefsSet, parcels) {
    for (const parcel of parcels.values()) {
        beliefsSet.declare(`parcel parcel_${parcel.id}`);
    }
}

function declareMyself(beliefsSet, me) {
    beliefsSet.declare(`me me_${me.id}`);
}

function declareAgents(beliefsSet, agents) {
    if (agents.size === 1) {
        return;
    }

    for (const agent of agents.values()) {
        beliefsSet.declare(`agent agent_${agent.id}`);
    }
}

function specifyParcelsState(beliefsSet, parcels, me) {
    
    for (const parcel of parcels.values()) {
        if (parcel.carriedBy !== null && parcel.carriedBy !== me.id) {
            beliefsSet.declare(
                `carriedBy parcel_${parcel.id} agent_${parcel.carriedBy}`
            );
        } else if (parcel.carriedBy === null) {
            beliefsSet.declare(
                `at parcel_${parcel.id} tile_${parcel.x}-${parcel.y}`
            );
        }
    }
}

function specifyAgentsState(beliefsSet, agents) {
    if (agents.size === 1) {
        return;
    }

    for (const agent of agents.values()) {
        beliefsSet.declare(`at agent_${agent.id} tile_${agent.x}-${agent.y}`);
    }
}

function specifyMyState(beliefsSet, me) {
    beliefsSet.declare(`at me_${me.id} tile_${me.x}-${me.y}`);
}


function specifyGoal(destinationTile, me, sit) {
    let goal = '';
    switch(sit){
        case "putdown":
            goal = `and (at parcel_${destinationTile.id} tile_${destinationTile.x}-${destinationTile.y}) (not (carriedBy parcel_${destinationTile.id} me_${me.id}))`;
            break;
        case "opp":
            goal = `at me_${me.id} tile_${destinationTile.x}-${destinationTile.y}`;
            break;
        case "del":
            goal = `at me_${me.id} tile_${destinationTile.x}-${destinationTile.y}`;
            break;
        case "toparcel":
            goal = `carriedBy parcel_${destinationTile.id} me_${me.id}`;
            break;
    }
    console.log("This goal:", goal);
    return goal;
}

async function generatePlanWithPddl(parcels, agents, map, destinationTile, me, sit) {
    let beliefs = new Beliefset();

    // objects declaration ((:objects) clouse in the PDDL problem file)
    addMapToBeliefSet(beliefs, map);
    addParcelsToBeliefSet(beliefs, parcels);
    addMyselfToBeliefSet(beliefs, me);
    addAgentsToBeliefSet(beliefs, agents);
    
    
    // init state declaration ((:init) clouse in the PDDL problem file)

    // declare what the objects actually are
    assignTileType(beliefs, map);
    declareParcels(beliefs, parcels);
    declareMyself(beliefs, me);
    declareAgents(beliefs, agents);
    

    // specify the state of the objects
    specifyParcelsState(beliefs, parcels, me);
    specifyAgentsState(beliefs, agents);
    specifyMyState(beliefs, me);
    
    // final state declaration ((:goal) clouse in the PDDL problem file)
    let encodedGoal = specifyGoal(destinationTile, me, sit);

    //Create the PDDL problem (adapted from lab5)
    let pddlProblem = new PddlProblem(
        'board',
        beliefs.objects.join(' '),
        beliefs.toPddlString(),
        encodedGoal
    );

    let domain = await readDomain();
    let encodedProblem = pddlProblem.toPddlString();

    //await saveToFile(encodedProblem); // helps to see if the problem is correctly defined

    let plan;

    try{
        plan = await onlineSolver(domain, encodedProblem);
    }catch(err){
        console.log("Error in calling online solver");
    }

    console.log("plan in pddlparser:",plan);
    if(plan==undefined){
        try{
            plan = await onlineSolver(domain, encodedProblem);
        }catch(err){
            console.log("Error in calling online solver");
        }
    }
    if (!plan) {
        console.log('ERROR GENERATING PLAN INSIDE PDDLParser.js');
    }

    return plan;
}

export { generatePlanWithPddl };