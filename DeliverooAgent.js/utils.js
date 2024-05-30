let delDists = [];      //distanza da celle deliverabili
let closestDelCell;     //cella deliverabile più vicina
import { tradeOff } from "./intentions.js";
import { map, move, putdown, delCells} from "./mioBottino.js";
var carriedPar = [];
export let arrivedTarget = false;
export let delivered = true;

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

    try{
        cells.forEach(cell => {
            let dist = Math.abs(pos.x - cell.x) + Math.abs(pos.y - cell.y);
            distances.push(dist);
        });
    } catch {
        distances.push(10000);
    }
    return distances;
}

export function manhattanDistance(pos1, pos2) {    //valuta la manhattan distance tra due celle
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
}

export function delDistances(myPos, delCells){     //valuta la distanza tra posizione attuale e celle deliverabili indicando la più vicina
    delDists = manhattanDist(myPos, delCells) //vettore di distanze
    let minDistance = Math.min(...delDists);
    let closestCellIndex = delDists.indexOf(minDistance); 
    closestDelCell = delCells[closestCellIndex];
    closestDelCell.distance = minDistance; //aggiungo il parametro distance all'oggetto closestDelCell se non ce l'ha

    return closestDelCell;
}


export function delivery(myPos){                   //calcola il percorso per arrivare alla delivery cell più vicina e muove l'agente
    closestDelCell = delDistances(myPos, delCells);
    let shortestPath = shortestPathBFS(myPos.x, myPos.y, closestDelCell.x, closestDelCell.y, map);
    let direction = nextMove(myPos,shortestPath);
    
    if(direction === 'same'){
        putdown();
    } else {
        move(direction);
    }
}

export function findClosestParcel(myPos, parcels) {    //valuta la distanza tra posizione attuale e pacchetto libero più vicino
    let parcel;
    let closestDistance = 10000;
    let finalPath;

    if (!Array.isArray(parcels)) {
        parcels = [parcels];
    }
    
    for (let i = 0; i < parcels.length; i++) {
        let path = shortestPathBFS(myPos.x, myPos.y, parcels[i].x, parcels[i].y, map);
        
        if ((path.length < closestDistance)) {
            parcel = parcels[i];
            closestDistance = path.length;
            finalPath = path;
        }
    }
    
    return [parcel, finalPath];
}

export function findClosestDelCell(myPos, dellCells) {    //valuta la distanza tra posizione attuale e pacchetto libero più vicino
    let delCell;
    let closestDistance = 10000;
    let finalPath;

    if (!Array.isArray(dellCells)) {
        delCells = [delCells];
    }
    
    for (let i = 0; i < delCells.length; i++) {
        let path = shortestPathBFS(myPos.x, myPos.y, delCells[i].x, delCells[i].y, map);
        
        if ((path.length < closestDistance)) {
            delCell = delCells[i];
            closestDistance = path.length;
            finalPath = path;
        }
    }
    
    return [delCell, finalPath];
}

export function findFurtherPos(myPos, cells) {
    let cell;
    let finalPath;
    let closestDistance = 10000;

    let path = shortestPathBFS(Math.round(myPos.x), Math.round(myPos.y), cells.x, cells.y, map);
    if ((path.length < closestDistance)) {
        cell = cells;
        closestDistance = path.length;
        finalPath = path;
    }

    return [cell, finalPath];
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

export async function moveTo(myPos, path){
    let direction = nextMove(myPos, path);
    if(direction === 'same'){
        arrivedTarget=true;
    } else {
        await move(direction);
    }
}

function isIdAlreadyPresent(id) {
    return carriedPar.some(parcel => parcel.id === id);
}

export async function updateCarriedPar(parcel){
    try{
        carriedPar.push(parcel);
    } catch {
        
    }
}

export function getCarriedPar(){
    return carriedPar.length;
}

export function getCarriedValue(){
    let totalReward = 0;

    for (const parcel of carriedPar) {
        totalReward += parcel.reward;
    }

    return totalReward;
}

export function emptyCarriedPar(){
    carriedPar = [];
}

export function setArrived(cond){
    arrivedTarget=cond;
}

export function iAmOnDelCell(myPos){
    let iAm = delCells.some(cell => cell.x === myPos.x && cell.y === myPos.y);
    return iAm; 
}

export function iAmOnParcel(myPos, parcels){
    let iAm = parcels.some(cell => cell.x === myPos.x && cell.y === myPos.y);
    return iAm; 
}

export function setDelivered(cond){
    delivered=cond;
}

export function getMinCarriedValue(){
    let minReward = carriedPar.reduce((min, parcel) => {
        return parcel.reward < min ? parcel.reward : min;
    }, Infinity);
    
    return minReward;
}

export function isAdjacentOrSame(pos1, pos2) {
    const dx = Math.abs(pos1.x - pos2.x);
    const dy = Math.abs(pos1.y - pos2.y);

    return (dx === 0 && dy === 0) || (dx === 1 && dy === 0) || (dx === 0 && dy === 1) || (dx === 1 && dy === 1);
}

export function assignNewOpposite(myPos, mapLength) {
    let newOpposite;
    do {
        newOpposite = { x: getRandomCoordinate(mapLength), y: getRandomCoordinate(mapLength) };
    } while (isAdjacentOrSame(myPos, newOpposite));
    return newOpposite;
}

function getRandomCoordinate(max) {
    return Math.floor(Math.random() * max);
}