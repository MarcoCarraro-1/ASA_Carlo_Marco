import { onlineSolver, PddlExecutor, PddlProblem, Beliefset } from "@unitn-asa/pddl-client";
import fs from 'fs';

function readFile ( path ) {
    
    return new Promise( (res, rej) => {

        fs.readFile( path, 'utf8', (err, data) => {
            if (err) rej(err)
            else res(data)
        })

    })

}

async function main () {

    const myBeliefset = new Beliefset();
    myBeliefset.declare( 'switched-off light1' );
    myBeliefset.undeclare( 'switched-on light1' );
    myBeliefset.declare( 'switched-off light2' );

    var pddlProblem = new PddlProblem(
        'lights',
        myBeliefset.objects.join(' '),
        myBeliefset.toPddlString(),
        'and (switched-on light1) (not (switched-on light2))'
    )
    
    let problem = pddlProblem.toPddlString();
    console.log( problem );
    let domain = await readFile('./domain-lights.pddl' );

    var plan = await onlineSolver( domain, problem );
    
    const pddlExecutor = new PddlExecutor( { name: 'lightOn', executor: (l) => console.log('executor lighton '+l) } );
    pddlExecutor.exec( plan );

}

main();