import { onlineSolver } from "@unitn-asa/pddl-client";
import { consts } from '../classes/consts.js';
import fs from 'fs';


export async function retrieveCompletePathWithPddl(client, x, y) {
    let me_x = client.you.x;
    let me_y = client.you.y;

    // setting pddl plan
    let problemString = await buildPDDLString(client.structure, [me_x, me_y], [x,y], client.agents);
    let domainString = fs.readFileSync('./src/pddl_files/deliverooJS.pddl', 'utf8').replace(/\r?\n|\r/g, '').replace(/\s\s+/g, ' ');

    if (consts.PRINT_PDDL_DOMAIN_AND_PROBLEM) {console.log("\n\n\nDomainString: ", domainString, "\n\n\nProblemString: ", problemString);}

    let plan = await onlineSolver(domainString, problemString);
    if (plan == null) {
        return null;
    }
    var completePath = parsePDDLresult(plan, me_x, me_y);          
    return completePath;
}

function parsePDDLresult(completePath, x, y) 
{
    var x = x;
    var y = y;
    let moves = []
    let path = []
    path.push([x, y])
    for (let i = 0; i < completePath.length; i++) {
        var array = completePath[i];
        var action = array['action'];
        switch (action) {
            case 'move_up':
                moves.push('up');
                y += 1;
                path.push([x, y])
                break;
            case 'move_right':
                moves.push('right');
                x += 1;
                path.push([x, y])
                break;
            case 'move_down':
                moves.push('down');
                y -= 1;
                path.push([x, y])
                break;
            case 'move_left':
                moves.push('left');
                x -= 1;
                path.push([x, y])
                break;    
        }
    }
    return {moves: moves, path: path}
}

async function buildPDDLString(structure, from, to, otherAgents) {
    let problem_definition = '(define (problem deliverooProblem) '
    let pddl_domain = '(:domain deliverooJS) ';
    // create the map
    var updatedMap = getUpdatedMap(structure.map, otherAgents);
    let { relationList: relationList, idToTileMap: idToTileMap } = await convertMapToRelations(updatedMap, structure.mapIDs);
    var start = structure.mapIDs[from[0]][from[1]];
    var goal = structure.mapIDs[to[0]][to[1]];
    // add start
    relationList.push(`(at ${start})`);
    // add the objects
    let object_definition = '(:objects ';
    for (let id of idToTileMap) {
        object_definition += ` ${id} - Tile `;
    }
    object_definition += `) `;
    object_definition = object_definition;
    let initialState = '(:init ';
    // add all initial states
    for (let statement of relationList) {
        initialState += `${statement} `;
    }
    initialState += ') ';
    initialState = initialState;
    // add goal
    let goalState = `(:goal (at ${goal})) )`;
    return problem_definition + pddl_domain + object_definition + initialState + goalState;
}

function getUpdatedMap(map, otherAgents) {
    // if there are no other agents, return the map as it is, NO NEED TO UPDATE
    if (otherAgents === undefined || otherAgents.length === 0) {
        return map;
    }
    // make a hard copy of the map
    let newMap = [];
    for (let i = 0; i < map.length; i++) {
        newMap.push([...map[i]]);
    }
    
    // update the newmap adding walls where there are agents, so that the pddl solver will not pass through them and remain stuck
    // do a classic for loop to avoid the map being updated multiple times
    for (let i = 0; i < otherAgents.length; i++) {
        newMap[otherAgents[i].x][otherAgents[i].y] = 0;
    }

    return newMap;
}


async function convertMapToRelations(map, mapIDs) {
    let relationList = []; // contains all of the statements
    let idToTileMap = new Set();

    // explore the map and build the statements
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            if (map[y][x] !== 0) {
                const nodeId = mapIDs[y][x];
                // Check up neighbor
                if (x - 1 >= 0 && map[y][x - 1] !== 0) {
                    const leftId = mapIDs[y][x - 1];
                    idToTileMap.add(leftId);
                    relationList.push(`(up_of ${nodeId} ${leftId})`);
                }
                // Check right neighbor
                if (y - 1 >= 0 && map[y - 1][x] !== 0) {
                    const upId = mapIDs[y - 1][x];
                    idToTileMap.add(upId);
                    relationList.push(`(right_of ${nodeId} ${upId})`);
                }
                // Check down neighbor
                if (x + 1 < map[y].length && map[y][x + 1] !== 0) {
                    const rightId = mapIDs[y][x + 1];
                    idToTileMap.add(rightId);
                    relationList.push(`(down_of ${nodeId} ${rightId})`);
                }
                // Check left neighbor
                if (y + 1 < map.length && map[y + 1][x] !== 0) {
                    const downId = mapIDs[y + 1][x];
                    idToTileMap.add(downId);
                    relationList.push(`(left_of ${nodeId} ${downId})`);
                }
            }
        }
    }
    return { relationList: relationList, idToTileMap: idToTileMap    };    
}

