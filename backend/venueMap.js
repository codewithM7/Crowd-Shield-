const venueMap = {

    // Entry gates
    "Gate 1": {
        type: "ENTRY",
        connections: ["Zone 1"]
    },

    "Gate 2": {
        type: "ENTRY",
        connections: ["Zone 2"]
    },


    // Main zones
    "Zone 1": {
        type: "ZONE",
        connections: [
            "Gate 1",
            "Zone 2",
            "Zone 3",
            "Exit Gate 1"
        ]
    },

    "Zone 2": {
        type: "ZONE",
        connections: [
            "Gate 2",
            "Zone 1",
            "Zone 3",
            "Exit Gate 2"
        ]
    },

    "Zone 3": {
        type: "ZONE",
        connections: [
            "Zone 1",
            "Zone 2",
            "Exit Gate 1",
            "Exit Gate 2"
        ]
    },


    // Exits
    "Exit Gate 1": {
        type: "EXIT",
        connections: [
            "Zone 1",
            "Zone 3"
        ]
    },

    "Exit Gate 2": {
        type: "EXIT",
        connections: [
            "Zone 2",
            "Zone 3"
        ]
    }

};


module.exports = venueMap;