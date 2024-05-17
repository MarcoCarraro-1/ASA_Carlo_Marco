export async function nextMove(myPos, path)
{
    //console.log("Sono in:",myPos);
    try{
        const nextStep = path[1]; //path[0] è la posizione attuale
        var m= new Promise(res => {client.onYou(res)}) //questo + await m serve per aspettare di ricevere le nuove informazioni sulla tua posizione prima di muoverti
        if (nextStep.x < myPos.x) {
            return 'left';
        } else if (nextStep.x > myPos.x) {
            return 'right';
        } else if (nextStep.y < myPos.y) {
            return 'down';
        } else if (nextStep.y > myPos.y) {
            return 'up';
        }
        await m
    } catch (error) {
        return 'same';
    }
}

export async function oneMovePick(){
client.onParcelsSensing( async ( parcels ) => 
    {
        for(let p of parcels)
        {
            if(distance(p, me) == 1 && !p.carriedBy)
            {
                if(me.x<p.x)
                    await client.move('right'); //await serve perchè se no rischio di pickuppare mentre mi sto muovendo =>niente pickup
                else if(me.x>p.x)
                    await client.move('left');
                else if(me.y<p.y)
                    await client.move('up');
                else if(me.y>p.y)
                    await client.move('down');
                client.pickup();
            }
        }
    
    } )
}

export async function move ( direction ) 
{
    await client.move( direction ) 
}

export async function putdown (  ) 
{
    await client.putdown();
    
}