let delDists = [];      //distanza da celle deliverabili
let closestDelCell;     //cella deliverabile più vicina
let agentsCallback;
import {agent, client} from "./doubleAgentAlfaFinal.js";
import {iAmNearer, tradeOff} from "./intentions_alfa.js";
import {DEL_CELLS, MAP, BETA_NAME, PDDL, BOND_MESSAGE, setArrivedToTarget, setBetaName, PARCEL_DECADING_INTERVAL, DOUBLE_AGENT, DOUBLE_ID} from "./globals_alfa.js";

export const counter = { countAttempts: 0};

export function createMap (width, height, tiles) 
{
    let map = [];

    for (let i = 0; i < height; i++) {
        map[i] = [];
        for (let j = 0; j < width; j++) {
            map[i][j] = 0;
        }
    }

    // Assegna i valori alle celle della mappa in base alla lista di oggetti
    tiles.forEach(obj => {
        const { x, y, delivery } = obj;
        if (x < height && y < width) {
            map[x][y] = delivery ? 2 : 1;
        }
    });
    // console.log("map", map);
    return map; 
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
        distances.push(Infinity);
    }
    return distances;
}

export function manhattanDistance(pos1, pos2) {    //valuta la manhattan distance tra due celle
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
}

export function delDistances(myPos, delCell){     //valuta la distanza tra posizione attuale e celle deliverabili indicando la più vicina
    delDists = manhattanDist(myPos, delCell) //vettore di distanze
    let minDistance = Math.min(...delDists);
    let closestCellIndex = delDists.indexOf(minDistance); 
    closestDelCell = delCell[closestCellIndex];
    closestDelCell.distance = minDistance; //aggiungo il parametro distance all'oggetto closestDelCell se non ce l'ha

    return closestDelCell;
}


export async function delivery(myPos){                   //calcola il percorso per arrivare alla delivery cell più vicina e muove l'agente
    closestDelCell = delDistances(myPos, DEL_CELLS);
    let shortestPath = shortestPathBFS(myPos.x, myPos.y, closestDelCell.x, closestDelCell.y, MAP);
    let direction = nextMove(myPos,shortestPath);
    
    if(direction === 'same'){
        await agent.putdown();
    } else {
        await agent.move(direction);
    }
}

export function findClosestParcel(myPos, parcels) {    //compute the distance between my position and the closest parcel
    let parcel = null;
    let closestDistance = Infinity;
    let finalPath = null;

    if (!Array.isArray(parcels)) { //if parcels is not an array we make it an array
        parcels = [parcels];
    }
    
    for (let i = 0; i < parcels.length; i++) {
        try{
            let path = shortestPathBFS(myPos.x, myPos.y, parcels[i].x, parcels[i].y, MAP); //breadth-first search distance between my position and the parcel
            
            // we search for the closest parcel
            if ((path.length < closestDistance)) { 
                parcel = parcels[i];
                closestDistance = path.length;
                finalPath = path; //the path to the closest parcel until now
            }
        } catch {
            // console.log("This parcel is not reachable");
        }
    }
    // console.log("Cicle end in findClosestPar");
    return [parcel, finalPath];
}

export function findClosestDelCell(myPos, delCellsArray) {    //evaluate distance between my positon and closest deliverable cell
    let delCell;
    let closestDistance = Infinity
    let finalPath;

    if (!Array.isArray(delCellsArray)) { // if delCells is not an array we make it an array
        DEL_CELLS = [DEL_CELLS];
    }
    
    // console.log("delCells:", delCells)

    for (let i = 0; i < DEL_CELLS.length; i++) {
        //console.log("[i].x", delCell[i].x);
        //console.log("delCell[i].y", delCell[i].y);
        let path = shortestPathBFS(myPos.x, myPos.y, DEL_CELLS[i].x, DEL_CELLS[i].y, MAP);
        try{
            if ((path.length < closestDistance)) {
                delCell = DEL_CELLS[i];
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
    let closestDistance = Infinity;
    let path = null;

    cells.x = Math.floor(cells.x);
    cells.y = Math.floor(cells.y);

    while(checkCondition(myPos, MAP, cells) || path==null){
        //console.log("MAP[",cells.x,"][",cells.y,"]=", MAP[cells.x][cells.y]);
        cells.x--;
        cells.y--;
        
        if(cells.x<0){
            cells.x = MAP.length;
        }
        
        if(cells.y<0){
            cells.y = MAP[0].length;
        }

        path = shortestPathBFS(Math.round(myPos.x), Math.round(myPos.y), cells.x, cells.y, MAP);

        if(counter.countAttempts>50){
            // console.log("Forcing path");
            path = shortestPathBFS(Math.round(myPos.x), Math.round(myPos.y), Math.round(myPos.x), 0, MAP);
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
    try{
        if(path[1]==myPos){
            path.shift();
        }
    }catch{
        console.log("path is empty");
    }
    let direction = nextMove(myPos, path);
    // console.log("next dir: ", direction);
    // console.log("myPos", myPos);
    client.onYou;
    // console.log("myPos new", myPos);
    if(direction === 'same' || direction === undefined){
        //console.log("arrivatooooooooooooooooooooooooooooo");
        setArrivedToTarget(true);
    } else {
        await agent.move(direction);
    }
}

export async function updateCarriedPar(parcel){
    try{
        agent.carriedParcels.push(parcel);
    } catch {
        
    }
}

export function getCarriedPar(){
    return agent.carriedParcels.length;
}

export function getCarriedValue(){
    let totalReward = 0;

    for (const parcel of agent.carriedParcels) {
        totalReward += parcel.reward;
    }

    return totalReward;
}

export function emptyCarriedPar(){
    agent.carriedParcels = [];
}

export function iAmOnDelCell(myPos){
    let iAm = DEL_CELLS.some(cell => cell.x === myPos.x && cell.y === myPos.y);
    return iAm; 
}

export function iAmOnParcel(myPos, parcels){
    if(!Array.isArray(parcels)){
        parcels = [parcels];
    }
    let iAm = parcels.some(cell => cell.x === myPos.x && cell.y === myPos.y);
    return iAm; 
}

export function getMinCarriedValue(){
    let minReward;
    try{
        minReward = agent.carriedParcels.reduce((min, parcel) => {
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
    } while (isAdjacentOrSame(myPos, newOpposite) || checkCondition(myPos,MAP,newOpposite));
    return newOpposite;
}

export function getRandomCoordinate(max) {
    return Math.floor(Math.random() * max);
}

export async function executePddlAction(action) {
    switch(action.action) {
        case "right":
            await agent.move("right");
            break;
        case "left":
            await agent.move("left");
            break;
        case "up":
            await agent.move("up");
            break;
        case "down":
            await agent.move("down");
            break;
        case "pickup":
            await agent.pickup();
            break;
        case "putdown":
            await agent.putdown();
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

//this function connects the agents: one send the message, the other listens and then they connect
export async function bondToDouble(otherAgents, senderName, senderId)
{
    // if it exists an agent named 'beta'
        // verify if it's our beta
        await agent.shout(BOND_MESSAGE)
}

function setAgentsCallback(callback) {
    agentsCallback = callback;
}

export async function findTargetParcel(otherAgents, myPos, closestParcel, firstPath, parcels){
    let BFStoDel;
    let BFStoParcel;
    let targetParcel = null;
    [closestDelCell, BFStoDel] = findClosestDelCell(myPos, DEL_CELLS); //we find the closest delivery cell to our current position
    // if(closestDelCell)
    // {
        // console.log("closestDelCell", closestDelCell);
        // console.log("BFStoDel", BFStoDel);
        // console.log("DELL_CELLS:", DEL_CELLS)
        // console.log("parcels:", parcels);
    // }
    while(parcels.length > 0 && targetParcel==null){ //while there are parcels in our sight and we haven't found a target parcel
        // console.log("inside parcels.length while");
        [closestParcel, BFStoParcel] = findClosestParcel(myPos, parcels); //find closest parcel to us, return it and
                                                                          //the path to reach it
        if(closestParcel==null){
            //empty the parcels array if there are no more parcels
            parcels.length=0;
        }
        
        if(firstPath==null){
            firstPath = BFStoParcel;
            // console.log("firstPath", firstPath);
        }

        setAgentsCallback((agents) => {
            // console.log("Opponents in FOW: ", otherAgents.length);
            // console.log("Opponents ids: ", otherAgents.map(agent => agent.id));
        });

        // if there is a dacading interval and if its worth to go pickup the parcel, the parcel become our target
        if(PARCEL_DECADING_INTERVAL!=Infinity){
            // console.log("inside PARCEL_DECADING_INTERVAL if");
            //we check if it's worth it in term of points to pick up the parcel. If tradeOff is True, it's worth it
            if(!tradeOff(BFStoParcel.length, findClosestDelCell(closestParcel, DEL_CELLS), closestParcel.reward, agent.carriedPar.length)){
                parcels = parcels.filter(parcel => parcel.id !== closestParcel.id); //remove that parcel from the list of parcels to pick up
            }
        }
        if(iAmNearer(otherAgents, closestParcel, BFStoParcel)){
            targetParcel = closestParcel;
            // console.log("target parcel:", targetParcel);
            if(DOUBLE_AGENT){ // if we are in the double agent scenario
                if(doubleShouldPickUp()){
                    //console.log("Double should pick up");
                    await agent.say(DOUBLE_ID, (closestParcel.x, closestParcel.y)); //send to double position of his next target, we will search for another
                    parcels = parcels.filter(parcel => parcel.id !== closestParcel.id); //remove that parcel from the list of parcels to pick up
                }
            }
        } else {
            //console.log("Opponent will steal ", closestParcel.id);
            parcels = parcels.filter(parcel => parcel.id !== closestParcel.id); //remove that parcel from the list of parcels to pick up
        }
    }
    // console.log("returning:", targetParcel, BFStoDel, BFStoParcel, firstPath, parcels);
    return [targetParcel, BFStoDel, BFStoParcel, firstPath, parcels];
}

