const express = require("express");

const router = express.Router();

// Temporary incident data
let incidents = [
    {
        id: 1,
        type: "CROWD_SURGE",
        location: "Zone B",
        description: "Crowd density is increasing rapidly.",
        severity: "HIGH",
        status: "ACTIVE",
        createdAt: new Date()
    },
    {
        id: 2,
        type: "MEDICAL_EMERGENCY",
        location: "Gate A",
        description: "Medical assistance required.",
        severity: "MEDIUM",
        status: "ACTIVE",
        createdAt: new Date()
    }
];

// GET all incidents
router.get("/", (req, res) => {
    res.json(incidents);
});

// GET one incident
router.get("/:id", (req, res) => {

    const incident = incidents.find(
        incident => incident.id === Number(req.params.id)
    );

    if (!incident) {
        return res.status(404).json({
            message: "Incident not found"
        });
    }

    res.json(incident);
});

// CREATE a new incident
router.post("/", (req, res) => {

    const {
        type,
        location,
        description,
        severity
    } = req.body;

    if (!type || !location || !severity) {
        return res.status(400).json({
            message: "Type, location and severity are required"
        });
    }

    const newIncident = {
        id: incidents.length + 1,
        type,
        location,
        description: description || "",
        severity,
        status: "ACTIVE",
        createdAt: new Date()
    };

    incidents.push(newIncident);

    res.status(201).json({
        message: "Incident created successfully",
        incident: newIncident
    });
});

// UPDATE incident status
router.put("/:id/status", (req, res) => {

    const incident = incidents.find(
        incident => incident.id === Number(req.params.id)
    );

    if (!incident) {
        return res.status(404).json({
            message: "Incident not found"
        });
    }

    const { status } = req.body;

    if (!["ACTIVE", "INVESTIGATING", "RESOLVED"].includes(status)) {
        return res.status(400).json({
            message: "Invalid incident status"
        });
    }

    incident.status = status;

    res.json({
        message: "Incident status updated",
        incident
    });
});

module.exports = router;