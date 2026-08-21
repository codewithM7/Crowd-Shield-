const express = require("express");
const { calculateRisk } = require("../services/riskEngine");

const router = express.Router();

const zones = [
    {
        id: 1,
        name: "Zone A",
        people: 850,
        density: 1.8
    },
    {
        id: 2,
        name: "Zone B",
        people: 2340,
        density: 4.1
    },
    {
        id: 3,
        name: "Zone C",
        people: 1120,
        density: 3.0
    }
];

// Get all zones
router.get("/", (req, res) => {

    const updatedZones = zones.map(zone => {

        const risk = calculateRisk(zone.density);

        return {
            ...zone,
            risk: risk.level,
            riskScore: risk.score
        };
    });

    res.json(updatedZones);
});

// Get one zone
router.get("/:id", (req, res) => {

    const zone = zones.find(
        zone => zone.id === Number(req.params.id)
    );

    if (!zone) {
        return res.status(404).json({
            message: "Zone not found"
        });
    }

    const risk = calculateRisk(zone.density);

    res.json({
        ...zone,
        risk: risk.level,
        riskScore: risk.score
    });
});

module.exports = router;