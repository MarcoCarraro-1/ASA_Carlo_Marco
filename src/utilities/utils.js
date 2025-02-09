import { consts } from '../classes/consts.js';

export function findOptimalPath(parcels, delivery_points, map, you, agents, originalPath, finishToFollowPath, REACHABLE_DELIVERY_POINTS, client) 
{
    // if there are parcels on me, I have to deliver them if they are more than consts.MAX_PARCELS_ON_YOU
    var parcelsOnMe = getParcelsByCarrierID(you.id, parcels);
    if (parcelsOnMe.length >= consts.MAX_PARCELS_ON_YOU) 
    {
        var closest_delivery_point = getCloserDeliveryPoint(you, delivery_points, map, agents);
        return { completePath:getCompletePath(map, [you.x, you.y], [closest_delivery_point.point.x, closest_delivery_point.point.y], agents), status: consts.possibleStates.REACH_CLOSER_DELIVERY_POINT};
    }
    
    var freeParcels = getFreeParcelsNumber(parcels);

    if (freeParcels > 0) // AVAILABLE PARCELS TO BE TAKEN 
    {  
        // TODO: check if its better to go to the closest parcel or to the closest delivery point, because parcels on me could expire
        // if there is a closer parcel we have to take it and then we deliver all the parcels at once
        var closest_parcel = getCloserParcel(you, parcels, map, agents, client);
        if (closest_parcel.point != null) {
            return { completePath:getCompletePath(map, [you.x, you.y], [closest_parcel.point.x, closest_parcel.point.y], agents), status: consts.possibleStates.REACH_CLOSER_PARCEL};
        }
    }
    else // NO AVAILABLE PARCELS TO BE TAKEN
    {
        if (parcelsOnMe.length > 0) // I HAVE PARCELS ON ME, I HAVE TO DELIVER THEM
        {
            var closest_delivery_point = getCloserDeliveryPoint(you, delivery_points, map, agents);
            return { completePath:getCompletePath(map, [you.x, you.y], [closest_delivery_point.point.x, closest_delivery_point.point.y], agents), status: consts.possibleStates.REACH_CLOSER_DELIVERY_POINT};
        }
    }
    // if there is only one reachable delivery point, I have to explore the map, 
    // this is to avoid bugs in maps with only one delivery point
    if (REACHABLE_DELIVERY_POINTS<=1) 
    {
        var randomPoint = getRandomReachablePointOnMap(map, you, agents);
        return { completePath:getCompletePath(map, [you.x, you.y], [randomPoint.x, randomPoint.y], agents), status: consts.possibleStates.EXPLORE_MAP};
    }
    var random_delivery_point = getRandomReachableDeliveryPoint(delivery_points, map, you, agents);
    return { completePath:getCompletePath(map, [you.x, you.y], [random_delivery_point.x, random_delivery_point.y], agents), status: consts.possibleStates.EXPLORE_MAP };
    // if we reach this point, we have to explore the map, because we cannot take any parcel or deliver any parcel
}

export function calculateEuristicAfterNSteps(reward, steps) {
    if (steps === 0) {
        return reward;
    }
    if (!consts.isDecayingActive()) {
        return reward;
    }
    if (consts.PARCEL_DECADING_INTERVAL === "infinite") {
        return reward;
    }
    let secondsPassing = (steps / consts.MOVEMENT_STEPS) * (consts.MOVEMENT_DURATION / 1000);
    switch (consts.PARCEL_DECADING_INTERVAL) {
        case "1s":
            return reward - Math.round(secondsPassing);
        case "2s":
            return reward - Math.round(secondsPassing / 2);
        case "5s":
            return reward - Math.round(secondsPassing / 5);
        case "10s":
            return reward - Math.round(secondsPassing / 10);
    }
}

export function isOverDeliveryPoint(you, deliveryPoints) {
    var over = false;
    deliveryPoints.forEach(point => {
        if (point.x === you.x && point.y === you.y) {
            over = true;
        }
    });
    return over;
}

export function getShortestPathUsingAStar(map, start, end, agents) {
    const rows = map.length;
    const cols = map[0].length;

    // Define directions: up, down, left, right
    const dx = [-1, 1, 0, 0];
    const dy = [0, 0, -1, 1];

    // Calculate the heuristic cost (Manhattan distance)
    function heuristic(a, b) {
        return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    }

    // Initialize open and closed sets
    const openSet = new Set();
    const closedSet = new Set();
    
    // Store the cost of each node
    const gScore = Array(rows).fill().map(() => Array(cols).fill(Infinity));
    const fScore = Array(rows).fill().map(() => Array(cols).fill(Infinity));
    
    // Store the parent of each node for path reconstruction
    const cameFrom = Array(rows).fill().map(() => Array(cols).fill(null));
    
    // Initialize the start node
    openSet.add(start.toString());
    gScore[start[0]][start[1]] = 0;
    fScore[start[0]][start[1]] = heuristic(start, end);
    
    // Priority queue based on fScore
    const priorityQueue = [{ position: start, fScore: fScore[start[0]][start[1]] }];

    while (priorityQueue.length > 0) {
        // Get the node with the lowest fScore
        priorityQueue.sort((a, b) => a.fScore - b.fScore);
        const { position } = priorityQueue.shift();
        
        const [currentRow, currentCol] = position;

        // If we reached the end, reconstruct the path
        if (position[0] === end[0] && position[1] === end[1]) {
            const path = [];
            let node = end;
            while (node !== null) {
                path.unshift(node);
                node = cameFrom[node[0]][node[1]];
            }
            return path;
        }

        // Add current node to closed set
        closedSet.add(position.toString());

        // Explore neighboring cells
        for (let i = 0; i < 4; i++) {
            const newRow = currentRow + dx[i];
            const newCol = currentCol + dy[i];

            // Check if new position is within bounds, walkable, and not occupied by an agent
            const isWalkable = newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols;
            const isNotOccupiedByAgent = agents.every(agent => agent.x !== newRow || agent.y !== newCol);
            if (isWalkable && map[newRow][newCol] !== 0 && !closedSet.has([newRow, newCol].toString()) && isNotOccupiedByAgent) {
                const tentativeGScore = gScore[currentRow][currentCol] + 1;
                
                if (!openSet.has([newRow, newCol].toString())) {
                    openSet.add([newRow, newCol].toString());
                } else if (tentativeGScore >= gScore[newRow][newCol]) {
                    continue;
                }

                // Update scores and path
                cameFrom[newRow][newCol] = position;
                gScore[newRow][newCol] = tentativeGScore;
                fScore[newRow][newCol] = gScore[newRow][newCol] + heuristic([newRow, newCol], end);
                priorityQueue.push({ position: [newRow, newCol], fScore: fScore[newRow][newCol] });
            }
        }
    }

    // No path found
    return [];
}

export function getCompletePath(map, start, end, agents) {
    var path = getShortestPathUsingAStar(map, start, end, agents);
    var moves = convertPathToMoves(path);
    if (path.length === 0) {
        return { path: [], moves: [], length: Infinity };
    }
    if (path.length - moves.length !== 1) {
        throw new Error('Path and moves are not consistent');
    }
    return { path: path, moves: moves, length: path.length };
}

export function convertPathToMoves(path) {
    const moves = [];
    if (path.length === 0) {
        return moves;
    }
    for (let i = 1; i < path.length; i++) {
        const prev = path[i - 1];
        const curr = path[i];
        if (curr[0] < prev[0]) {
            moves.push('left');
        } else if (curr[0] > prev[0]) {
            moves.push('right');
        } else if (curr[1] < prev[1]) {
            moves.push('down');
        } else if (curr[1] > prev[1]) {
            moves.push('up');
        }
    }
    return moves;
}

export function getCloserParcel(you, parcels, map, agents, client) {
    var minDistance = Infinity;
    var closestPoint = null;

    // Initialize variables outside the loop
    var path = [];
    var moves = [];

    parcels.forEach(parcel => {
        if (parcel.carriedBy !== null) {
            return;
        }
        // check if this parcel is not in prohibited parcels, this is done to avoid the worker going to the same parcel of the boss
        if (!client.isBoss && client.workerHasToGoToDifferentLocation && parcel.x === consts.proibited_going_x && parcel.y === consts.proibited_going_y) 
        {
            return;
        }
        var curr = getCompletePath(map, [you.x, you.y], [parcel.x, parcel.y], agents);
        // if the path is empty, we can't reach the parcel
        if (curr.path.length == 0) {
            return;
        }
        var euristic = calculateEuristicAfterNSteps(parcel.reward, curr.length);
        if (euristic < minDistance && euristic >= 0) { // if the euristic is lower than 0, the parcel is not reachable, because it will expire once we reach it
            minDistance = euristic;
            closestPoint = parcel;
            path = curr.path;
            moves = curr.moves;
        }
    });

    // Return the closest delivery point and associated data
    return { point: closestPoint, path: path, moves: moves, distance: minDistance };
}

export function getCloserDeliveryPoint(you, deliveryPoints, map, agents) {
    var minDistance = Infinity;
    var closestPoint = null;

    // Initialize variables outside the loop
    var path = [];
    var moves = [];

    deliveryPoints.forEach(point => {
        // Destructure inside the loop
        var curr = getCompletePath(map, [you.x, you.y], [point.x, point.y], agents);

        if (curr.length < minDistance) {
            minDistance = curr.length;
            closestPoint = point;
            path = curr.path;
            moves = curr.moves;
        }
    });

    // Return the closest delivery point and associated data
    return { point: closestPoint, path: path, moves: moves, distance: minDistance };
}

export function getReachableDeliveryPoints(deliveryPoints, map, you, agents) {
    return deliveryPoints.filter(point => {
        var curr = getCompletePath(map, [you.x, you.y], [point.x, point.y], agents);
        return curr.path.length !== 0;
    });
}

export function getRandomReachableDeliveryPoint(deliveryPoints, map, you, agents) {
    var reachablePoints = getReachableDeliveryPoints(deliveryPoints, map, you, agents);
    if (reachablePoints.length === 0) {
        return null;
    }
    var randomIndex = Math.floor(Math.random() * reachablePoints.length);
    return reachablePoints[randomIndex];
}

export function getRandomReachablePointOnMap(map, you, agents) {
    var reachablePoints = [];
    for (var x = 0; x < map.length; x++) {
        for (var y = 0; y < map[x].length; y++) {
            if (map[x][y] === 1 || map[x][y] === 2) {
                var curr = getCompletePath(map, [you.x, you.y], [x, y], agents);
                if (curr.path.length !== 0) {
                    reachablePoints.push({ x: x, y: y });
                }
            }
        }
    }
    if (reachablePoints.length === 0) {
        return null; // No reachable points marked with 1 or 2
    }
    var randomIndex = Math.floor(Math.random() * reachablePoints.length);
    return reachablePoints[randomIndex];
}

export function getParcelsByCarrierID(ID, parcels) {
    var taken = [];
    parcels.forEach(parcel => {
        if (parcel.carriedBy === ID) {
            taken.push(parcel);
        }
    });
    return taken;
}

export function getFreeParcelsNumber (parcels) {
    var free = 0;
    parcels.forEach(parcel => {
        if (parcel.carriedBy === null) {
            free++;
        }
    });
    return free;
}

export function parseMap(width, height, tiles, structure) {

    // Initialize the map with zeros
    for (let i = 0; i < height; i++) {
        structure.map.push(Array(width).fill(0));
    }

    // Fill in the map with the provided points
    tiles.forEach(point => {
        const { x, y } = point;
        if (point.delivery === true) {
            structure.map[x][y] = 2;
            structure.deliveryPoints.push({ x, y });
        } else {
            structure.map[x][y] = point.parcelSpawner ? 1 : 3; 
        }
    });

    // Function to generate a random uppercase string, this is needed for the PDDL planner
    function generateRandomString(length = 4) {
        const characters = 'abcdefghijklmnopqrstuvwxyz';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    // Initialize the mapIDs array
    structure.mapIDs = [];

    // Initialize a set to keep track of used IDs
    const usedIDs = new Set();

    // Fill in the mapIDs with unique random uppercase strings
    for (let i = 0; i < height; i++) {
        structure.mapIDs.push([]);
        for (let j = 0; j < width; j++) {
            let uniqueID;
            // Ensure uniqueness
            do {
                uniqueID = generateRandomString();
            } while (usedIDs.has(uniqueID));

            usedIDs.add(uniqueID);
            structure.mapIDs[i][j] = uniqueID;
        }
    }
}

export function updateParcelsBelief(client, taken_parcels, free_parcels) {
    if (client.status != consts.possibleStates.REACH_CLOSER_PARCEL && taken_parcels < consts.MAX_PARCELS_ON_YOU && free_parcels > 0) {
        client.parcels.forEach(parcel => {
            if (!client.parcelsSet.has(parcel.id)) {
                client.parcelsSet.add(parcel.id);
                if (client.parcelsSet.size <= consts.MAX_PARCELS_ON_YOU) {
                    client.finishToFollowPath = true;
                }
            }
        });

        // remove the parcels that are not present in the parcels array
        client.parcelsSet.forEach(parcelId => {
            if (!client.parcels.some(parcel => parcel.id === parcelId)) {
                client.parcelsSet.delete(parcelId);
            }
        });
    }
}



// TODO: remove old code

// export function getFarthestDeliveryPoint(you, deliveryPoints, map, agents) {
//     var maxDistance = -Infinity;
//     var farthestPoint = null;

//     // Initialize variables outside the loop
//     var path = [];
//     var moves = [];

//     deliveryPoints.forEach(point => {
//         // Destructure inside the loop
//         var curr = getCompletePath(map, [you.x, you.y], [point.x, point.y], agents);

//         // console.log('point:', point);
//         // console.log('path:', curr.path);
//         // console.log('moves:', curr.moves);
//         // console.log('distance:', curr.length);

//         if (curr.length > maxDistance) {
//             maxDistance = curr.length;
//             farthestPoint = point;
//             path = curr.path;
//             moves = curr.moves;
//         }
//     });

//     // Return the farthest delivery point and associated data
//     return { point: farthestPoint, path: path, moves: moves, distance: maxDistance };
// }

// export function getCloserParcelManhattan(you, parcels) {
//     let minDistance = Infinity;
//     let closestPoint = null;

//     parcels.forEach(point => {
//         if (point.carriedBy !== null) {
//             return; // Skip parcels that are already carried by another agent
//         }

//         // Calculate Manhattan distance from your current position to the parcel
//         const distance = manhattanDistance([you.x, you.y], [point.x, point.y]);

//         // Update if this parcel is closer
//         if (distance < minDistance) {
//             minDistance = distance;
//             closestPoint = point;
//         }
//     });

//     // Return the closest parcel and the Manhattan distance
//     return { point: closestPoint, distance: minDistance };
// }

// export function shortestPathBFS(map, start, end, agents) {
//     const rows = map.length;
//     const cols = map[0].length;
    
//     // Define directions: up, down, left, right
//     const dx = [-1, 1, 0, 0];
//     const dy = [0, 0, -1, 1];
    
//     // Visited array to keep track of visited cells and path
//     const visited = Array(rows).fill().map(() => Array(cols).fill(false));
//     visited[start[0]][start[1]] = true;
    
//     // Queue for BFS
//     const queue = [{ position: start, path: [start] }];
    
//     while (queue.length > 0) {
//         const { position, path } = queue.shift();
        
//         if (position[0] === end[0] && position[1] === end[1]) {
//             return path; // Return the shortest path
//         }
        
//         // Explore neighboring cells
//         for (let i = 0; i < 4; i++) {
//             const newRow = position[0] + dx[i];
//             const newCol = position[1] + dy[i];
            
//             // Check if new position is within bounds, walkable, and not occupied by an agent
//             const isWalkable = newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols;
//             const isNotOccupiedByAgent = agents.every(agent => agent.x !== newRow || agent.y !== newCol);
//             if (isWalkable && map[newRow][newCol] !== 0 && !visited[newRow][newCol] && isNotOccupiedByAgent) {
//                 const newPath = [...path, [newRow, newCol]]; // Update the path
//                 queue.push({ position: [newRow, newCol], path: newPath });
//                 visited[newRow][newCol] = true;
//             }
//         }
//     }
    
//     // No path found
//     return [];
// }

// function manhattanDistance(pointA, pointB) {
//     return Math.abs(pointA[0] - pointB[0]) + Math.abs(pointA[1] - pointB[1]);
// }

// export function getOnYouPromise(client) {
//     return new Promise((resolve, reject) => {
//         client.onYou(({ id, name, x, y, score }) => {
//             resolve({ id, name, x, y, score });
//         });
//     });
// }

// export function getParcelsPromise(client) {
//     return new Promise((resolve, reject) => {
//         client.onParcelsSensing((parcels) => {
//             resolve(parcels);
//         });
//     });
// }


// export function getStatus2(you, parcels, map, deliveryPoints) {
//     if (parcels.length == 0) {
//         return consts.possibleStates.EXPLORE_MAP;
//     }
//     var taken = takenParcels(you.id, parcels);
//     if (taken.length > 0) {
//         return consts.possibleStates.REACH_CLOSER_DELIVERY_POINT;
//     }
//     return consts.possibleStates.REACH_CLOSER_PARCEL;
// }
// export function getStatus(you, parcels, map, deliveryPoints) {
//     if (parcels.length == 0) {
//         return consts.possibleStates.EXPLORE_MAP;
//     }
//     var taken = takenParcels(you.id, parcels);
//     if (taken.length > 0) {
//         if (isOverDeliveryPoint(you, deliveryPoints)) {
//             return consts.possibleStates.DELIVER_PARCELS;
//         }
//         return consts.possibleStates.REACH_CLOSER_DELIVERY_POINT;
//     }

//     if (isOverParcel(you, parcels)){
//         return consts.possibleStates.GRAB_PARCEL;
//     }
//     return consts.possibleStates.REACH_CLOSER_PARCEL;
// }

// export function isOverParcel(you, parcels) {
//     var over = false;
//     parcels.forEach(parcel => {
//         if (parcel.x === you.x && parcel.y === you.y) {
//             over = true;
//         }
//     }
//     );
//     return over;
// }