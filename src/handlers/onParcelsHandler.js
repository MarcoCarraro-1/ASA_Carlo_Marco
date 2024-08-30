
export async function onParcelsHandler(parcels, client) {
    // for each parcel we have to Math.round the x and y
    for (let i = 0; i < parcels.length; i++) {
        parcels[i].x = Math.round(parcels[i].x);
        parcels[i].y = Math.round(parcels[i].y);
    } 
    client.parcels = parcels;
}