export class Agent {
    constructor(client) {
        this.client = client;
        this.name = null;
        this.pos = null;
        this.carriedParcels = [];
        this.doubleId = null;
    }
    assignOnYouInfo()
    {
        this.client.onYou((info) => {
        this.pos = {x: info.x, y: info.y};
        this.id = info.id;
        this.name = info.name;
        // console.log("Assigned info");
        });
    }
    assignCarriedParcels()
    {
        this.client.onCarryParcel((info) => {
        this.carriedParcels.push(info);
        // console.log("Assigned carried parcels");
        });
    }
    async move ( direction ) 
    {
        // console.log("move direction: ", direction);
        await this.client.move( direction ) 
    }
    
    async pickup (  ) 
    {
        let picked = await this.client.pickup();
        // console.log("pickup");
        if(picked.length > 0)
        {
            this.carriedParcels.push(picked[0]);
        }
    }

    async putdown (  ) 
    {
        console.log("putdown");
        await this.client.putdown();
    }

    async say(id, msg)
    {
        await this.client.say(id, msg)
    }

    async shout(message)
    {
        await this.client.shout(message)
    }
}

