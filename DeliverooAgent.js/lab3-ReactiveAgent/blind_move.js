import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

const client = new DeliverooApi(
    'http://localhost:8080',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA5ZmQ2NDllNzZlIiwibmFtZSI6Im1hcmNvIiwiaWF0IjoxNjc5OTk3Njg2fQ.6_zmgL_C_9QgoOX923ESvrv2i2_1bgL_cWjMw4M7ah4'
)

function distance( {x:x1, y:y1}, {x:x2, y:y2}) {
    const dx = Math.abs( Math.round(x1) - Math.round(x2) )
    const dy = Math.abs( Math.round(y1) - Math.round(y2) )
    return dx + dy;
}



/**
 * @type {Map<x,Map<y,{x,y,delivery}>}
 */
const map = new Map()

client.onTile( ( x, y, delivery ) => {
    if ( ! map.has(x) )
        map.set(x, new Map)    
    map.get(x).set(y, {x, y, delivery})
} );



const me = {};

await new Promise( res => { //qua await serve perchè così aspetto che le mie info siano settate
    client.onYou( ( {id, name, x, y, score} ) => {
        me.id = id
        me.name = name
        me.x = x
        me.y = y
        me.score = score
        // console.log( 'me:', me.x, me.y );
        res()
    } )
} );



const target ={
    x : process.argv[2], 
    y : process.argv[3]
}
console.log('go from', me.x, me.y, 'to', target.x, target.y);


while ( me.x != target.x || me.y != target.y ) //fa muovere l'agente a zig zag verso la parcel
{
    var m= new Promise(res => {client.onYou(res)}) //questo più await m serve per aspettare di ricevere le nuove informazioni sulla tua posizione prima di muoverti
    if ( me.x < target.x )
        await client.move('right')
    else if ( me.x > target.x )
        await client.move('left')
    if ( me.y < target.y )
        await client.move('up')
    else if ( me.y > target_y )
        await client.move('down')
    await m   

}