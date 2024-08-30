import { Message } from "../classes/message.js";
import {consts} from "../classes/consts.js";

export async function exchangeBeliefsWithOtherAllyAgent(client) 
{
    if ((client.isBoss && client.connectionCompletedWithAlly) || (!client.isBoss && client.connectionCompletedWithBoss))
    {
        const now = new Date();
        // Check if TIMER_FOR_SENDING_AGENTS_AND_PARCELS seconds have passed since the last message
        if (now - consts.lastTimeMessageWasSent >= consts.TIMER_FOR_SENDING_AGENTS_AND_PARCELS) {
            consts.lastTimeMessageWasSent = now; // Update the last time message was sent
            //console.log('PRE PARCELS:', client.parcels);
            await exchangeAgentsAndParcels(client);
            //console.log('POST PARCELS:', client.parcels);
        }
    }
}

export async function exchangeOrderAndCommands(client)
{
    const now = new Date();
        // Check if TIMER_FOR_SENDING_AGENTS_AND_PARCELS seconds have passed since the last message
        if (now - consts.lastTimeCommandAndOrderWereSent >= consts.TIMER_FOR_SENDING_COMMANDS_AND_ORDERS) {
            consts.lastTimeCommandAndOrderWereSent = now; // Update the last time message was sent
        
        if (client.isBoss && client.connectionCompletedWithWorker)
        {
            await makeSureWorkerGoesOnADifferentLocation(client);
        }
        else if (!client.isBoss && client.connectionCompletedWithBoss)
        {
            await conctactBossToGoOnCorrectParcel(client);
        }
    }
}

export async function makeSureWorkerGoesOnADifferentLocation(client)
{
    // STEP 1: Ask to the worker the parcel he is going to
    var reply = await client.deliverooApi.ask (
        client.worker,
        new Message(
            consts.possibleMessages.ASK_LOCATION,
            "",
        ),
    );
    var location = reply.val;
    var x_going_worker = location.x;
    var y_going_worker = location.y;
    // STEP 2: Check if the parcel is the same as the one the boss is going to
    if (x_going_worker == client.x_going && y_going_worker == client.y_going)
    {
        // STEP 3: If it is the same, ask the worker to go to a different location
        await client.deliverooApi.say(
            client.worker,
            new Message(
                consts.possibleMessages.GO_TO_DIFFERENT_LOCATION,
                {value: true, x: client.x_going, y: client.y_going},
            ),
        );
        console.log("LOG: Worker is going to same location as boss, telling him to go to a different location");
    }
    else
    {
        // STEP 4: If it is not the same, say to proceed
        await client.deliverooApi.say(
            client.worker,
            new Message(
                consts.possibleMessages.DO_NOT_CHANGE_LOCATION,
                "",
            ),
        );
        console.log("LOG: Worker is going to a different location, proceeding");

        // 
    }



}

export async function conctactBossToGoOnCorrectParcel(client, x_going, y_going)
{
    // STEP 1: reply to the boss with the parcel the worker is going to
    await client.deliverooApi.say(
        client.boss,
        new Message(
            consts.possibleMessages.SEND_LOCATION,
            {x: x_going, y: y_going},
        ),
    );

}


export async function sendHandshakeRequest(client) {
    if (!client.isBoss) // if Worker
    {
        await client.deliverooApi.shout(
            new Message(
                "HANDSHAKE-REQUEST",
                "",
            ),
        );
    }
} 

async function exchangeAgentsAndParcels(client) 
{
    if ((client.connectionCompletedWithAlly) || (!client.isBoss && client.connectionCompletedWithBoss))
    {
        var position = {id: client.you.id, name: client.you.name, x: client.you.x, y: client.you.y};
        var massageData = {position: position, agents: client.agents, parcels: client.parcels};

        var receiverId = client.isBoss ? client.worker : client.boss;
        await client.deliverooApi.say(
            receiverId,
            new Message(
                "SENDING-DATA",
                massageData,
            ),
        );
    }
}

