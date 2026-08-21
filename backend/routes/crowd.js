const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
    res.json({
        totalCrowd: 8420,
        highRiskZones: 2,
        activeIncidents: 4,
        overallStatus: "SAFE"
    });
});

module.exports = router;