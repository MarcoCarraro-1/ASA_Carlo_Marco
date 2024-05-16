export function nextMove(myPos, path)
{
    //console.log("Sono in:",myPos);
    try{
        const nextStep = path[1]; //path[0] è la posizione attuale
    
        if (nextStep.x < myPos.x) {
            return 'left';
        } else if (nextStep.x > myPos.x) {
            return 'right';
        } else if (nextStep.y < myPos.y) {
            return 'down';
        } else if (nextStep.y > myPos.y) {
            return 'up';
        }
    } catch (error) {
        return 'same';
    }
}

export oneMovePick(){
client.onParcelsSensing( async ( parcels ) => 
    {
        
        const pretty = Array.from(parcels)
            .map( ( {id,x,y,carriedBy,reward} ) => {
                return reward; //`(${x},${y},${reward})`
            } )
            .join( ' ' )
        console.log( pretty )
    
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