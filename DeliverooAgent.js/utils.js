function createMap (width, height, tiles) {
    let mappa = [];

    for (let i = 0; i < height; i++) {
        mappa[i] = [];
        for (let j = 0; j < width; j++) {
            mappa[i][j] = 0;
        }
    }
    
    // Assegna i valori alle celle della mappa in base alla lista di oggetti
    tiles.forEach(obj => {
        const { x, y, delivery } = obj;
        if (x < height && y < width) {
            mappa[x][y] = delivery ? 2 : 1;
        }
    });
    
    // Stampa la mappa risultante
    mappa = mappa.map(row => `[${row.join(', ')}]`).join(',\n');
    console.log(`[\n${mappa}\n]`);
    
}

export default createMap;