import { default as config } from "./config.js";
import { DeliverooApi, timer } from "@unitn-asa/deliveroo-js-client";
import {Agent} from './classAgent.js';

const client = new DeliverooApi(config.host, config.token_prova);
let agent = new Agent(client)

agent.assignOnYouInfo();
await agent.move("up");
await agent.move("right");
console.log("I am", agent.name, "with id", agent.id, "at", agent.pos);

