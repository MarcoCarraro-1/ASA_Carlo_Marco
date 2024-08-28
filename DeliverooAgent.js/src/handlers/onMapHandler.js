// Create a promise for the 'map1' variable
import * as utils from '../utilities/utils.js';

export async function onMapHandler(width, height, tiles, structure) {
    utils.parseMap(width, height, tiles, structure);   
}