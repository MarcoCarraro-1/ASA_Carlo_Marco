
import { Message } from '../classes/message.js';
import { consts } from '../classes/consts.js';

async function onMsgHandler(
    id,
    name,
    msg,
    replyFunction,
    client,
) {
    console.log("received message from ", id, " with content: ", msg);
    if (client.isBoss)
        {
            if (client.worker == null) {
                // FARE IL SETUP
                if (msg.topic == "HANDSHAKE-REQUEST") {
                    client.worker = id;
                    console.log("Found Worker: ", client.worker);
                
                    // now it has to message the worker to tell him that he is the worker
                    await client.deliverooApi.say(
                        client.worker,
                        new Message(
                            consts.possibleMessages.HANDSHAKE_REPLY,
                            consts.SECRET_KEY,
                        ),
                    );
                }
            }
            else
            {
                if (client.connectionCompletedWithWorker == false) {
                    if (msg.topic == consts.possibleMessages.HANDSHAKE_FINAL && msg.val == consts.SECRET_KEY) {
                        console.log("Connection with worker completed");
                        client.connectionCompletedWithWorker = true;
                    }
                }
                else
                {
                    if (msg.topic == consts.possibleMessages.SENDING_DATA && id == client.worker) {
                        console.log("Received message from worker:", id, ", msg:",msg);
                        updateAgentsAndParcels(client, msg.val);
                    }
                    
                }
            }
        }
    else
    {
        if (client.boss == null) {
            if (msg.topic == consts.possibleMessages.HANDSHAKE_REPLY && msg.val == consts.SECRET_KEY) {
                client.boss = id;
                client.connectionCompletedWithBoss = true; // si puo togliere
                console.log("Found Boss: ", client.boss);

                await client.deliverooApi.say(
                    client.boss,
                    new Message(
                        consts.possibleMessages.HANDSHAKE_FINAL,
                        consts.SECRET_KEY,
                    ),
                );
            }
        }
        else
        {
            if (client.connectionCompletedWithBoss == true && id == client.boss) {
                // update client.parcels, to add only the not already present parcels by id
                if (msg.topic == consts.possibleMessages.SENDING_DATA) 
                {
                    console.log("Received message from boss:", id, ", msg:",msg);
                    updateAgentsAndParcels(client, msg.val);
                }
                else if (msg.topic == consts.possibleMessages.ASK_LOCATION) 
                {
                    console.log("Received message from boss asking for location:", id, ", msg:",msg);
                    var reply = await client.deliverooApi.say (
                        client.boss,
                        new Message(
                            consts.possibleMessages.SEND_LOCATION,
                            {x: client.x_going, y: client.y_going},
                        ),
                    );
                    console.log(client.x_going, client.y_going);
                    replyFunction(
                        new Message(
                            consts.possibleMessages.SEND_LOCATION,
                            {x: client.x_going, y: client.y_going},
                    ),  );
                }

                else if (msg.topic == consts.possibleMessages.GO_TO_DIFFERENT_LOCATION)
                {
                    console.log("Received message from boss asking to go to different location", id, ", msg:",msg);
                    var message = msg.val;
                    client.workerHasToGoToDifferentLocation = true;
                    consts.proibited_going_x = message.x;
                    consts.proibited_going_y = message.y;
                }
            }
        }
    }
}

function updateAgentsAndParcels(client, receivedData) {
    var parcels = receivedData.parcels;
    var agents = receivedData.agents;
    var position = receivedData.position;

    // update client.parcels, to add only the not already present parcels by id
    for (let i = 0; i < parcels.length; i++) {
        if (!client.parcels.some(p => p.id === parcels[i].id)) {
            client.parcels.push(parcels[i]);
        }
    }

    // update client.agents, to add only the not already present agents by id
    for (let i = 0; i < agents.length; i++) {
        if (!client.agents.some(a => a.id === agents[i].id)) {
            client.agents.push(agents[i]);
        }
    }
}

export { onMsgHandler };
