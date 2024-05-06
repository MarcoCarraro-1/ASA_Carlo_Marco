let delDists = [];      //distanza da celle deliverabili
let closestDelCell;     //cella deliverabile più vicina
import { map, move, putdown } from "./mioBottino.js";

export function createMap (width, height, tiles) {
    let mappa = [];

    for (let i = 0; i < height; i++) {
        mappa[i] = [];
        for (let j = 0; j < width; j++) {
            mappa[i][j] = 0;
        }
    }
    
    // Assegna i valori alle celle della mappa in base alla lista di oggetti
    tiles.forEach(obj => {
        const { x, y, delivery } = obj;
        if (x < height && y < width) {
            mappa[x][y] = delivery ? 2 : 1;
        }
    });
    
    // Stampa la mappa risultante
    return mappa; 
}

// Define directions for movement: up, down, left, right
const dx = [-1, 1, 0, 0];
const dy = [0, 0, -1, 1];

// Define BFS function
export function shortestPathBFS(startX, startY, endX, endY, map) {
    startX = Math.floor(startX);
    startY = Math.floor(startY);
    let queue = [];
    let visited = Array.from({ length: map.length }, () => Array(map[0].length).fill(false));
    let prev = Array.from({ length: map.length }, () => Array(map[0].length));

    // Push the starting point to the queue
    queue.push({ x: startX, y: startY });
    visited[startX][startY] = true;

    // BFS traversal
    while (queue.length > 0) {
        const { x, y } = queue.shift();

        // Check if reached the destination
        if (x === endX && y === endY) {
            // Reconstruct the shortest path
            const shortestPath = [];
            let currX = endX;
            let currY = endY;
            while (currX !== startX || currY !== startY) {
                shortestPath.unshift({ x: currX, y: currY });
                const { prevX, prevY } = prev[currX][currY];
                currX = prevX;
                currY = prevY;
            }
            shortestPath.unshift({ x: startX, y: startY });
            return shortestPath;
        }
        // Explore neighboring cells
        for (let i = 0; i < 4; i++) {
            const nx = x + dx[i];
            const ny = y + dy[i];

            // Check if the neighboring cell is within bounds and not visited
            if (nx >= 0 && nx < map.length && ny >= 0 && ny < map[0].length && !visited[nx][ny] && map[nx][ny] !== 0) {
                queue.push({ x: nx, y: ny });
                visited[nx][ny] = true;
                prev[nx][ny] = { prevX: x, prevY: y };
            }
        }
    }

    // If the destination is unreachable
    return null;
}

export function manhattanDist(pos, cells) {       //valuta la manhattan distance tra posizione attuale e insieme di celle
    let distances = [];

    cells.forEach(cell => {
        let dist = Math.abs(pos.x - cell.x) + Math.abs(pos.y - cell.y);
        distances.push(dist);
    });

    return distances;
}

export function manhattanDistance(pos1, pos2) {    //valuta la manhattan distance tra due celle
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
}

export function delDistances(myPos, delCells){     //valuta la distanza tra posizione attuale e celle deliverabili indicando la più vicina
    delDists = manhattanDist(myPos, delCells)
    //console.log("Distances from delivery cells: ", delDists);
    console.log("delDists: ", delDists);

    let minDistance = Math.min(...delDists);
    let closestCellIndex = delDists.indexOf(minDistance);
    closestDelCell = delCells[closestCellIndex];
    console.log("closestDelCell: ", closestDelCell);
    closestDelCell.distance = minDistance;

    console.log("Closest delivery cell position (x, y):", closestDelCell.x, ",", closestDelCell.y);
    console.log("Distance to closest delivery cell:", closestDelCell.distance);
}


export function delivery(myPos){                   //calcola il percorso per arrivare alla delivery cell più vicina e muove l'agente
    let shortestPath = shortestPathBFS(myPos.x, myPos.y, closestDelCell.x, closestDelCell.y, map);
    console.log("Shortest Path:");
    shortestPath.forEach(({ x, y }) => console.log(`(${x}, ${y})`));
    let direction = nextMove(myPos,shortestPath);
    if(direction === 'same'){
        putdown();
    } else {
        move(direction);
    }
}

export function findClosestParcel(myPos, parcels) {    //valuta la distanza tra posizione attuale e pacchetto libero più vicino
    if (parcels.length === 0) {
        return null;
    }

    let closestParcel = parcels[0];
    let closestDistance = manhattanDistance(myPos, { x: closestParcel.x, y: closestParcel.y });

    // Trova la parcel più vicina nel vettore di parcel
    for (let i = 1; i < parcels.length; i++) {
        let distance = manhattanDistance(myPos, { x: parcels[i].x, y: parcels[i].y });
        if (distance < closestDistance) {
            closestParcel = parcels[i];
            closestDistance = distance;
        }
    }

    return closestParcel;
}

export function isDel(delCellsList, pos) {
    for (let i = 0; i < delCellsLength; i++) {
        if (delCellsList[i].x == pos.x && delCellsList[i].y == pos.y) {
            return true; // Found a matching object
        }
    }
    return false; // No matching object found
}

export function nextMove(myPos, shortestPath){
    console.log("Sono in:",myPos);
    try{
        const nextStep = shortestPath[1]; //shortestPath[0] è la posizione attuale
    
        if (nextStep.x < myPos.x) {
            return 'left';
        } else if (nextStep.x > myPos.x) {
            return 'right';
        } else if (nextStep.y < myPos.y) {
            return 'down';
        } else if (nextStep.y > myPos.y) {
            return 'up';
        }
    } catch (error) {
        return 'same';
    }
}