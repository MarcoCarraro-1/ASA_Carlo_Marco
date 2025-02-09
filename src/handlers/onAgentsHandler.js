
export async function onAgentsHandler(agents, client) {
    // for each agent we have to Math.round the x and y
    for (let i = 0; i < agents.length; i++) {
        agents[i].x = Math.round(agents[i].x);
        agents[i].y = Math.round(agents[i].y);
    } 
    client.agents = agents;
}