export class Agent {
    constructor(client) {
        this.client = client;
        this.name = null;
        this.pos = null;
        this.carriedParcels = [];
        this.doubleId = null;
        this.target = null;
        this.failedMovement = 0;
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

    assignTarget(target)
    {
        this.target = target;
    }

    async move ( direction ) 
    {
        if(await this.client.move(direction) == false)
        {
            console.log("Failed to move");
            this.failedMovement++;
            if(this.failedMovement >= 3) 
            {
                console.log("Failed to move 3 times in a row"); // if the agent fails to move 3 times in a row it will try to move in another direction
                if(direction == "up")
                {
                    await this.client.move("right");
                }
                else if(direction == "right")
                {
                    await this.client.move("down");
                }
                else if(direction == "down")
                {
                    await this.client.move("left");
                }
                else if(direction == "left")
                {
                    await this.client.move("up");
                }
                return false;
            }
        }
        else
        {
            this.failedMovement = 0; 
        }  
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
        // console.log("putdown");
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

