let delDists = [];      //distanza da celle deliverabili
let closestDelCell;     //cella deliverabile più vicina
import { tradeOff } from "./intentions_beta.js";
import { map, move, putdown, delCells, pickup, client} from "./doubleAgentBeta.js";
var carriedPar = [];
export let arrivedTarget = false;
export let delivered = true;
export const counter = { countAttempts: 0};

export function createMap (width, height, tiles) 
{
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
            if (nx >= 0 && nx < map.length && ny >= 0 && ny < map[0].length && !visited[nx][ny] && map[nx][ny] !== 0 && map[nx][ny] !== undefined) {
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
    let parcel = null;
    let closestDistance = 10000;
    let finalPath = null;

    if (!Array.isArray(parcels)) {
        parcels = [parcels];
    }
    
    for (let i = 0; i < parcels.length; i++) {
        try{
            let path = shortestPathBFS(myPos.x, myPos.y, parcels[i].x, parcels[i].y, map);
        
            if ((path.length < closestDistance)) {
                parcel = parcels[i];
                closestDistance = path.length;
                finalPath = path;
            }
        } catch {
            // console.log("This parcel is not reachable");
        }
    }

    // console.log("Cicle end in findClosestPar");
    
    return [parcel, finalPath];
}

export function findClosestDelCell(myPos, dellCells) {    //valuta la distanza tra posizione attuale e pacchetto libero più vicino
    let delCell;
    let closestDistance = 10000;
    let finalPath;

    if (!Array.isArray(dellCells)) {
        delCells = [delCells];
    }
    
    // console.log("delCells:", delCells)

    for (let i = 0; i < delCells.length; i++) {
        //console.log("delcells[i].x", delCells[i].x);
        //console.log("delcells[i].y", delCells[i].y);
        let path = shortestPathBFS(myPos.x, myPos.y, delCells[i].x, delCells[i].y, map);
        
        try{
            if ((path.length < closestDistance)) {
                delCell = delCells[i];
                closestDistance = path.length;
                finalPath = path;
                //console.log("save del cell", delCell);
                //console.log("save closest distance", closestDistance);
                //console.log("save path", finalPath);
            }
        } catch {
            // console.log("No possible path to this del cell");
        }
        
    }
    
    return [delCell, finalPath];
}

export function checkCondition(myPos, map, cells) {
    try {
        return map[cells.x][cells.y] != 1 || (cells.x == myPos.x && cells.y == myPos.y);
    } catch (error) {
        // console.error("No possible to move in that cell");
        counter.countAttempts++;
        // console.log("Attempt",counter.countAttempts);
        return true;
    }
}

export function findFurtherPos(myPos, cells) {
    let cell;
    let finalPath;
    let closestDistance = 10000;
    let path = null;

    cells.x = Math.floor(cells.x);
    cells.y = Math.floor(cells.y);

    while(checkCondition(myPos, map, cells) || path==null){
        //console.log("map[",cells.x,"][",cells.y,"]=",map[cells.x][cells.y]);
        cells.x--;
        cells.y--;
        
        if(cells.x<0){
            cells.x = map.length;
        }
        
        if(cells.y<0){
            cells.y = map[0].length;
        }

        path = shortestPathBFS(Math.round(myPos.x), Math.round(myPos.y), cells.x, cells.y, map);

        if(counter.countAttempts>50){
            // console.log("Forcing path");
            path = shortestPathBFS(Math.round(myPos.x), Math.round(myPos.y), Math.round(myPos.x), 0, map);
            counter.countAttempts=0;
        }

        
    }

    
    
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
    shortestPath.shift();
    try{
        const nextStep = shortestPath[0]; //shortestPath[0] è la posizione attuale
        // console.log("next step in nextMove:",nextStep);
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
    // console.log("myPos in moveTo",myPos);
    // console.log("path in moveTo", path);
    if(path[1]==myPos){
        path.shift();
    }
    let direction = nextMove(myPos, path);
    // console.log("next dir: ", direction);
    // console.log("myPos", myPos);
    client.onYou;
    // console.log("myPos new", myPos);
    if(direction === 'same' || direction === undefined){
        //console.log("arrivatooooooooooooooooooooooooooooo");
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
    let minReward;
    try{
        minReward = carriedPar.reduce((min, parcel) => {
            return parcel.reward < min ? parcel.reward : min;
        }, Infinity);
    } catch {
        return Infinity;
    }
    
    return minReward;
}

export function isAdjacentOrSame(pos1, pos2) {
    let dx = Math.abs(pos1.x - pos2.x);
    let dy = Math.abs(pos1.y - pos2.y);

    if(dx <= 2 && dy <= 2){
        return true;
    } else {
        return false;
    }
}

export function assignNewOpposite(myPos, mapLength) {
    let newOpposite;
    do {
        newOpposite = { x: getRandomCoordinate(mapLength), y: getRandomCoordinate(mapLength) };
        // console.log("generating new opposite");

        if(counter.countAttempts>50){
            // console.log("Forcing path");
            newOpposite.x = myPos.x;
            newOpposite.y = 0;
            counter.countAttempts=0;
        }
    } while (isAdjacentOrSame(myPos, newOpposite) || checkCondition(myPos,map,newOpposite));
    return newOpposite;
}

export function getRandomCoordinate(max) {
    return Math.floor(Math.random() * max);
}

export async function executePddlAction(action) {
    switch(action.action) {
        case "right":
            await move("right");
            break;
        case "left":
            await move("left");
            break;
        case "up":
            await move("up");
            break;
        case "down":
            await move("down");
            break;
        case "pickup":
            await pickup();
            break;
        case "putdown":
            await putdown();
            break;
        default:
            console.warn("Unknown PDDL action:", action.name);
    }
}

export function checkPos(x, y){
    let newx = x;
    let newy = y;
    if (!Number.isInteger(x)) {
        newx = Math.floor(x);
    }
    if (!Number.isInteger(y)) {
        newy = Math.floor(y);
    }

    return { x: newx, y: newy };
}

export function assignOpposite(myPos, map){
    const maxX = map.length - 1; // Dimensione massima asse x
    const maxY = map[0].length - 1; // Dimensione massima asse y

    // Direzione opposta rispetto alla posizione corrente
    const directionX = myPos.x > maxX / 2 ? -1 : 1;
    const directionY = myPos.y > maxY / 2 ? -1 : 1;

    // Proviamo a muoverci lungo l'asse x
    let newX = myPos.x + directionX;
    if (newX >= 0 && newX <= maxX && map[newX][myPos.y] === 1) {
        return { x: newX, y: myPos.y };
    }

    // Proviamo a muoverci lungo l'asse y
    let newY = myPos.y + directionY;
    if (newY >= 0 && newY <= maxY && map[myPos.x][newY] === 1) {
        return { x: myPos.x, y: newY };
    }

    // Se non abbiamo trovato nulla nei passi precedenti, proviamo combinazioni
    newX = myPos.x + directionX;
    newY = myPos.y + directionY;

    if (newX >= 0 && newX <= maxX && newY >= 0 && newY <= maxY && map[newX][newY] === 1) {
        return { x: newX, y: newY };
    }

    // Se nessuna delle precedenti opzioni ha funzionato, ritorna la posizione attuale
    return myPos;
}