export class Agent {
    constructor(client) {
        this.client = client;
        this.name = null;
        this.pos = null;
        this.carriedParcels = [];
        this.doubleId = null;
        this.delCellsDists = [] //distances from the delivery cells
        this.closestDelCell = null; //position of the closest delivery cell
    }
    assignOnYouInfo(){
        this.client.onYou((info) => {
        this.pos = {x: info.x, y: info.y};
        this.id = info.id;
        this.name = info.name;
        console.log("I am", this.name, "with id", this.id, "at", this.pos);
        });
    }
    async move ( direction ) 
    {
        await this.client.move( direction ) 
    }
    
    async pickup (  ) 
    {
        await clientAlfa.pickup();
    }

    async putdown (  ) 
    {
        await clientAlfa.putdown();
    }

    async say(id, msg)
    {
        await clientAlfa.say(id, msg)
    }

}

