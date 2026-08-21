const venueMap = require("./venueMap");


// Find the shortest reachable route
function findRoute(start, destination) {

    if (
        !venueMap[start] ||
        !venueMap[destination]
    ) {
        return null;
    }


    const queue = [
        {
            location: start,
            route: [start]
        }
    ];


    const visited = new Set([start]);


    while (queue.length > 0) {

        const current = queue.shift();


        if (
            current.location === destination
        ) {

            return current.route;

        }


        const connections =
            venueMap[current.location]
                .connections || [];


        for (
            const next of connections
        ) {

            if (
                !visited.has(next)
            ) {

                visited.add(next);

                queue.push({

                    location: next,

                    route: [
                        ...current.route,
                        next
                    ]

                });

            }

        }

    }


    return null;

}


// Find the safest available destination
function findSafestDestination(
    start,
    destinations,
    cameras
) {

    const candidates = [];


    for (
        const destination of destinations
    ) {

        const camera =
            cameras.find(
                camera =>
                    camera.name === destination
            );


        if (!camera) {
            continue;
        }


        // Never select unavailable locations
        if (
            camera.status !== "ONLINE"
        ) {
            continue;
        }


        // Never select high/critical risk
        if (
            camera.risk === "HIGH" ||
            camera.risk === "CRITICAL"
        ) {
            continue;
        }


        const route =
            findRoute(
                start,
                destination
            );


        if (!route) {
            continue;
        }


        candidates.push({

            destination,

            route,

            people:
                Number(camera.people || 0),

            density:
                camera.density,

            risk:
                camera.risk,

            routeLength:
                route.length

        });

    }


    if (candidates.length === 0) {
        return null;
    }


    // Lower crowd is preferred
    candidates.sort(
        (a, b) => {

            if (
                a.people !== b.people
            ) {

                return (
                    a.people -
                    b.people
                );

            }


            // If crowd is similar,
            // prefer shorter route
            return (
                a.routeLength -
                b.routeLength
            );

        }
    );


    return candidates[0];

}


module.exports = {

    findRoute,

    findSafestDestination

};