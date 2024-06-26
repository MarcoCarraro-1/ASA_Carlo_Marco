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



const {x: init_x, y: init_y} = await new Promise( res => client.onYou( res ) );
const target_x = process.argv[2], target_y = process.argv[3];
console.log('go from', init_x, init_y, 'to', target_x, target_y);


var x = init_x, y = init_y, step = 0;

while ( x != target_x || y != target_y ) {
    
    let begin_step = step;

    if ( target_x > x )
        if( map.get(x+1).get(y) ) console.log(step++, 'move right', ++x, y)
    
    else if ( target_x < x )
        if( map.get(x-1).get(y) ) console.log(step++, 'move left', --x, y)

    if ( target_y > y )
        if( map.get(x).get(y+1) ) console.log(step++, 'move up', x, ++y)
    else if ( target_y < y )
        if( map.get(x).get(y-1) ) console.log(step++, 'move down', x, --y)
    
    if ( begin_step == step ) {
        console.log('stucked')
        break;
    }
    
}

if ( x == target_x && y == target_y ) {
    console.log('target reached')
}