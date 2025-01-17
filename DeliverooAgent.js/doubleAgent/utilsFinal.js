let delDists = [];      //distanza da celle deliverabili
let closestDelCell;     //cella deliverabile più vicina
let agentsCallback;
import {agent, client} from "./doubleAgentFinal.js";
import {iAmNearer, tradeOff, doubleShouldPickUp} from "./parcel_choosing.js";
import {DEL_CELLS, MAP, PDDL, BOND_MESSAGE, setArrivedToTarget, PARCEL_DECADING_INTERVAL, DOUBLE_AGENT, RESPONSE, DOUBLE, setResponse} from "./globals.js";

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

// Define BFS function. It search via BFS the shortest path between two points
export function shortestPathBFS(startX, startY, endX, endY) {
    startX = Math.floor(startX);
    startY = Math.floor(startY);
    let queue = [];
    let visited = Array.from({ length: MAP.length }, () => Array(MAP[0].length).fill(false));
    let prev = Array.from({ length: MAP.length }, () => Array(MAP[0].length));

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
            if (nx >= 0 && nx < MAP.length && ny >= 0 && ny < MAP[0].length && !visited[nx][ny] && MAP[nx][ny] !== 0 && MAP[nx][ny] !== undefined) {
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
    console.log("distances: ", distances);
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
    let shortestPath = shortestPathBFS(myPos.x, myPos.y, closestDelCell.x, closestDelCell.y);
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
            let path = shortestPathBFS(myPos.x, myPos.y, parcels[i].x, parcels[i].y); //breadth-first search distance between my position and the parcel
            
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
        let path = shortestPathBFS(myPos.x, myPos.y, DEL_CELLS[i].x, DEL_CELLS[i].y);
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

        path = shortestPathBFS(Math.round(myPos.x), Math.round(myPos.y), cells.x, cells.y);

        if(counter.countAttempts>50){
            // console.log("Forcing path");
            path = shortestPathBFS(Math.round(myPos.x), Math.round(myPos.y), Math.round(myPos.x), 0);
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

export async function nextMove(myPos, shortestPath){

    shortestPath.shift();
    try{
        const nextStep = shortestPath[0]; //shortestPath[0] is the position to reach now
        // console.log("next step in nextMove:",nextStep);
        if (nextStep.x < myPos.x) {
            return 'left';
        } else if (nextStep.y > myPos.y) {
            return 'up';
        }else if (nextStep.x > myPos.x) {
            return 'right';
        } else if (nextStep.y < myPos.y) {
            return 'down';
        } 
    } catch (error) {
        return 'same';
    }
}

/**
 * Moves the agent from its position to the next cell in the path vector.
 * @param {{x: number, y: number}} myPos - The current position of the agent.
 * @param {{x: number, y: number}[]} path - The path the agent should follow.
 * @returns {Promise<void>}
 */
export async function moveTo(myPos, path)
{

    // console.log("myPos in moveTo",myPos);
    // console.log("path in moveTo", path);
    try{
        // if the next cell on the path is my actual position we
        // remove that cell from the path and we move to the next one on the path
        if(path[1]==myPos)
        { 
            path.shift();
        }
    }catch{
        console.log("path is empty");
    }
    let direction = await nextMove(myPos, path);
    // console.log("next dir: ", direction);
    // console.log("myPos", myPos);
    // console.log("myPos new", myPos);
    if(direction === 'same' || direction === undefined)
    {
        //console.log("arrivatooooooooooooooooooooooooooooo");
        setArrivedToTarget(true);
        // console.log("arrived to target");
    } 
    else 
    {
        await agent.move(direction);
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

export async function emptyCarriedPar(){
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
    // console.log("pos1", pos1);
    let dx = Math.abs(pos1.x - pos2.x);
    let dy = Math.abs(pos1.y - pos2.y);

    if(dx <= 2 && dy <= 2){
        // console.log("Returning True");
        return true;
    } else {
        // console.log("Returning False");
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
    let newx = Math.floor(x);
    let newy = Math.floor(y);
    
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
export async function bondToDouble()
{   
    console.log("inside bondToDouble");
    console.log(agent.name);
    if(agent.name === "alfa")
    {
        console.log("I'm the Alfa, wanting to bond");
        await agent.shout(BOND_MESSAGE);
    }
    if(agent.name === "beta")
    {
        console.log("I'm Beta, wanting to bond");
        await agent.shout(BOND_MESSAGE);
    }
}

// function setAgentsCallback(callback) {
//     agentsCallback = callback;
// }

export async function findTargetParcel(otherAgents, myPos, closestParcel, firstPath, parcels){
    // console.log("inside definition of findTargetParcel");
    let BFStoDel = [];
    let BFStoParcel = [];
    let targetParcel = null;
    if(DOUBLE_AGENT && RESPONSE !== undefined && RESPONSE.includes("target parcel")) // if the double agent has given to this agent a target, we go to pick it up
    {  
        target_info = RESPONSE.split(" ");
        try {
            targetParcel = parcels.filter(parcel => parcel.id === target_info[2])[0]; //we search for the target parcel in the list of parcels
            setResponse("no response");
        } catch {
            moveTo(myPos, shortestPathBFS(myPos.x, myPos.y, target_info[3] ,target_info[4])); //if the target is not in the list of parcels we move to the position of the target
        }
    }
    [closestDelCell, BFStoDel] = findClosestDelCell(myPos, DEL_CELLS); //we find the closest delivery cell to our current position
    // if(closestDelCell)
    // {
    //     console.log("closestDelCell", closestDelCell);
    //     console.log("BFStoDel", BFStoDel);
    //     console.log("DELL_CELLS:", DEL_CELLS)
    //     console.log("parcels:", parcels);
    // }
    while(parcels.length > 0 && targetParcel == null){ //while there are parcels in our sight and we haven't found a target parcel, we search for one
        // console.log("inside parcels.length while");
        [closestParcel, BFStoParcel] = findClosestParcel(myPos, parcels); //find closest parcel to us, return it and
                                                                          //the path to reach it
        if(closestParcel==null){ // empty the parcels array if there are no more parcels
            console.log("closestParcel == null");
            parcels.length=0;
        }
        // console.log("closestParcel", closestParcel);
        
        if(firstPath==null){
            firstPath = BFStoParcel;
            // console.log("firstPath", firstPath);
        }

        // setAgentsCallback((agents) => {
        //     console.log("Opponents in FOW: ", otherAgents.length);
        //     console.log("Opponents ids: ", otherAgents.map(agent => agent.id));
        // });

        // if there is a dacading interval and if its worth to go pickup the parcel, the parcel can become our target
        if(PARCEL_DECADING_INTERVAL!=Infinity)
        {
            // console.log("inside PARCEL_DECADING_INTERVAL if");
            //we check if it's worth it in term of points to pick up the parcel. If tradeOff is True, it's worth it
            if(getCarriedPar() == 0 && !tradeOff(BFStoParcel.length, findClosestDelCell(closestParcel, DEL_CELLS), closestParcel, agent.carriedParcels.length))
            {
                // console.log("parcels before removing:", parcels);
                // parcels = parcels.filter(parcel => parcel.id !== closestParcel.id); //remove that parcel from the list of parcels to pick up
                // console.log("Parcel not worth to pick up:", closestParcel);
                // console.log("parcels after removing:", parcels);
                parcels.sort((a,b) => b.reward - a.reward);
                // console.log("parcels after sorting:", parcels);
            }
        }
        if(iAmNearer((agent.pos.x, agent.pos.y),otherAgents, closestParcel, BFStoParcel))
        {
            // console.log("closest parcel:", closestParcel);
            if(DOUBLE_AGENT){ // if we are in the double agent scenario
                // console.log("Double agent");
                var parcelsCopy = [...parcels]; 
                agent.say(DOUBLE.id, ("do you have a target?")); //ask the double if he has a target
                // console.log("asking double if he has a target");
                if(RESPONSE === "i don't have a target")  //If the double has a target, we won't assign him one
                {      
                    console.log("Double has no target");
                    if(doubleShouldPickUp(parcelsCopy, myPos, DOUBLE.pos, closestParcel, otherAgents))  // if it's convenient for the double to pick up
                    {
                        // console.log("Double should pick up");                                       // we communicate the parcel info to the double and we remove it from our the list of parcels
                        await agent.say(DOUBLE.id, ("pick that " + closestParcel.id + " " + closestParcel.x + " " + closestParcel.y)); //send to double position of his next target, we will search for another
                        parcels = parcels.filter(parcel => parcel.id !== closestParcel.id); //remove that parcel from the list of parcels to pick up
                    } 
                    else 
                    {
                        console.log("Double should not pick up");
                        targetParcel = closestParcel;
                    }
                    setResponse("no response");
                } 
                else 
                {
                    targetParcel = closestParcel;
                }
            } 
            else 
            {
                targetParcel = closestParcel;
                // console.log("targetParcel", targetParcel);
            }
            // targetParcel = closestParcel;
        } 
        else
        {
            //console.log("Opponent will steal ", closestParcel.id);
            parcels = parcels.filter(parcel => parcel.id !== closestParcel.id); //remove that parcel from the list of parcels to pick up
        }
    }
    // console.log("returning:", targetParcel, BFStoDel, BFStoParcel, firstPath, parcels);
    return [targetParcel, BFStoDel, BFStoParcel, firstPath, parcels];
}

export async function blockedByAgent(otherAgents)
{
    if(isAdjacentOrSame(agent.pos, otherAgents[0].pos)){
        // console.log("I'm blocked by an agent");
    }
}

