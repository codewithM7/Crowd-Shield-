const express = require("express");

const router = express.Router();

// ==========================================
// CROWD THRESHOLDS
// ==========================================
// for this prototype 
// camera changes from LOW -> MEDIUM -> HIGH.
//
// Example:
// 10 people  = LOW
// 11-30      = MEDIUM
// 31+        = HIGH

const CROWD_THRESHOLDS = {
    LOW_MAX: 10,
    MEDIUM_MAX: 15,
    BOTTLENECK_MIN: 13,
    HIGH_MIN: 16
};


function calculateDensity(people) {

    people = Number(people) || 0;

    if (people <= CROWD_THRESHOLDS.LOW_MAX) {
        return "LOW";
    }

    if (people <= CROWD_THRESHOLDS.MEDIUM_MAX) {
        return "MEDIUM";
    }

    return "HIGH";
}

function isBottleneck(people) {

    people = Number(people) || 0;

    return people >= 13;
}


function calculateRisk(people) {

    people = Number(people) || 0;

    if (people <= CROWD_THRESHOLDS.LOW_MAX) {
        return "LOW";
    }

    if (people <= CROWD_THRESHOLDS.MEDIUM_MAX) {
        return "MEDIUM";
    }

    return "HIGH";
}


// =========================
// CAMERA DATA
// =========================

let cameras = [

    // =========================
    // CAMERA 1 - GATE 1
    // =========================

    {
        id: 1,
        name: "Gate 1",
        code: "CCTV-01",
        location: "Entry Gate 1",
        type: "ENTRY",
        status: "ONLINE",

        people: 0,
        density: "LOW",
        movement: "NORMAL",
        risk: "LOW",

        recommendation:
            "Continue normal monitoring.",

        aiRecommendation: {
            recommendedRoute: "Gate 1",
            recommendedGate: "Gate 1",
            action: "MONITOR",
            reason: "Crowd conditions are currently stable.",
            priority: "LOW"
        },

        lastUpdated: new Date()
    },


    // =========================
    // CAMERA 2 - GATE 2
    // =========================

    {
        id: 2,
        name: "Gate 2",
        code: "CCTV-02",
        location: "Entry Gate 2",
        type: "ENTRY",
        status: "ONLINE",

        people: 0,
        density: "LOW",
        movement: "NORMAL",
        risk: "LOW",

        recommendation:
            "Continue normal monitoring.",

        aiRecommendation: {
            recommendedRoute: "Gate 2",
            recommendedGate: "Gate 2",
            action: "MONITOR",
            reason: "Crowd conditions are currently stable.",
            priority: "LOW"
        },

        lastUpdated: new Date()
    },


    // =========================
    // CAMERA 3 - ZONE 1
    // =========================

    {
        id: 3,
        name: "Zone 1",
        code: "CCTV-03",
        location: "Main Area - Zone 1",
        type: "ZONE",
        status: "ONLINE",

        people: 0,
        density: "LOW",
        movement: "NORMAL",
        risk: "LOW",

        recommendation:
            "Continue normal monitoring.",

        aiRecommendation: {
            recommendedRoute: "Zone 1",
            recommendedGate: "None",
            action: "MONITOR",
            reason: "Crowd conditions are currently stable.",
            priority: "LOW"
        },

        lastUpdated: new Date()
    },


    // =========================
    // CAMERA 4 - ZONE 2
    // =========================

    {
        id: 4,
        name: "Zone 2",
        code: "CCTV-04",
        location: "Main Area - Zone 2",
        type: "ZONE",
        status: "ONLINE",

        people: 0,
        density: "LOW",
        movement: "NORMAL",
        risk: "LOW",

        recommendation:
            "Continue normal monitoring.",

        aiRecommendation: {
            recommendedRoute: "Zone 2",
            recommendedGate: "None",
            action: "MONITOR",
            reason: "Crowd conditions are currently stable.",
            priority: "LOW"
        },

        lastUpdated: new Date()
    },


    // =========================
    // CAMERA 5 - ZONE 3
    // =========================

    {
        id: 5,
        name: "Zone 3",
        code: "CCTV-05",
        location: "Main Area - Zone 3",
        type: "ZONE",
        status: "ONLINE",

        people: 0,
        density: "LOW",
        movement: "NORMAL",
        risk: "LOW",

        recommendation:
            "Continue normal monitoring.",

        aiRecommendation: {
            recommendedRoute: "Zone 3",
            recommendedGate: "None",
            action: "MONITOR",
            reason: "Crowd conditions are currently stable.",
            priority: "LOW"
        },

        lastUpdated: new Date()
    },


    // =========================
    // CAMERA 6 - EXIT 1
    // =========================

    {
        id: 6,
        name: "Exit Gate 1",
        code: "CCTV-06",
        location: "Exit Gate 1",
        type: "EXIT",
        status: "ONLINE",

        people: 0,
        density: "LOW",
        movement: "NORMAL",
        risk: "LOW",

        recommendation:
            "Exit Gate 1 is available.",

        aiRecommendation: {
            recommendedRoute: "Exit Gate 1",
            recommendedGate: "Exit Gate 1",
            action: "MONITOR",
            reason: "Exit Gate 1 is currently available.",
            priority: "LOW"
        },

        lastUpdated: new Date()
    },


    // =========================
    // CAMERA 7 - EXIT 2
    // =========================

    {
        id: 7,
        name: "Exit Gate 2",
        code: "CCTV-07",
        location: "Exit Gate 2",
        type: "EXIT",
        status: "ONLINE",

        people: 0,
        density: "LOW",
        movement: "NORMAL",
        risk: "LOW",

        recommendation:
            "Exit Gate 2 is available.",

        aiRecommendation: {
            recommendedRoute: "Exit Gate 2",
            recommendedGate: "Exit Gate 2",
            action: "MONITOR",
            reason: "Exit Gate 2 is currently available.",
            priority: "LOW"
        },

        lastUpdated: new Date()
    }

];


// =========================
// GET ALL CAMERAS
// =========================

router.get("/", (req, res) => {

    res.json(cameras);

});


// =========================
// GET ONE CAMERA
// =========================

router.get("/:id", (req, res) => {

    const camera = cameras.find(
        camera => camera.id === Number(req.params.id)
    );


    if (!camera) {

        return res.status(404).json({
            message: "Camera not found"
        });

    }


    res.json(camera);

});


// =========================
// UPDATE CAMERA DATA
// =========================

router.put("/:id", (req, res) => {

    const camera = cameras.find(
        camera => camera.id === Number(req.params.id)
    );


    if (!camera) {

        return res.status(404).json({
            message: "Camera not found"
        });

    }


    // Update YOLO data

  camera.people =
    req.body.people ??
    camera.people;


// Automatically calculate density
camera.density =
    calculateDensity(camera.people);

    camera.bottleneck =
    isBottleneck(camera.people);

    camera.movement =
        req.body.movement ??
        camera.movement;


    // Automatically calculate risk from the number of people.
    // Do not trust manually supplied risk values for normal
    // camera crowd updates.
    camera.risk =
        calculateRisk(camera.people);


    camera.recommendation =
        req.body.recommendation ??
        camera.recommendation;


    // Update AI recommendation

    if (req.body.aiRecommendation) {

        camera.aiRecommendation =
            req.body.aiRecommendation;

    }


    camera.lastUpdated =
        new Date();


    res.json({

        message: "Camera updated successfully",

        camera

    });

});


module.exports = router;