import { boss, worker} from './config.js';
import { Client } from "./classes/client.js";

if (process.argv[2] !== "boss" && process.argv[2] !== "worker") 
{
    console.log("Invalid argument, please use 'boss' or 'worker'");
    process.exit(1);
}

if (process.argv[3] !== "pddl" && process.argv[3] !== "no-pddl") 
{
    console.log("Invalid argument, please use 'pddl' or 'no-pddl'");
    process.exit(1);
}

let isBoss = process.argv[2] === "boss" ? true : false;
let usingPddl = process.argv[3] === "pddl" ? true : false;

let clientApi = boss;
if (!isBoss) 
{
    clientApi = worker;
}
console.log("Loading client with the following configuration:");
console.log("IsBoss: ", isBoss);
console.log("UsingPddl: ", usingPddl);

const client = new Client(clientApi, usingPddl, isBoss);
await client.configure();

export { client }