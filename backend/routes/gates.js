const express = require("express");

const router = express.Router();

// Temporary gate data
let gates = [
    {
        id: 1,
        name: "Gate A",
        status: "OPEN",
        peopleEntering: 120,
        peopleExiting: 80,
        queueSize: 150
    },
    {
        id: 2,
        name: "Gate B",
        status: "RESTRICTED",
        peopleEntering: 250,
        peopleExiting: 90,
        queueSize: 650
    },
    {
        id: 3,
        name: "Gate C",
        status: "OPEN",
        peopleEntering: 70,
        peopleExiting: 110,
        queueSize: 60
    }
];

// GET all gates
router.get("/", (req, res) => {
    res.json(gates);
});

// GET one gate
router.get("/:id", (req, res) => {

    const gate = gates.find(
        gate => gate.id === Number(req.params.id)
    );

    if (!gate) {
        return res.status(404).json({
            message: "Gate not found"
        });
    }

    res.json(gate);
});

// CHANGE gate status
router.put("/:id/status", (req, res) => {

    const gate = gates.find(
        gate => gate.id === Number(req.params.id)
    );

    if (!gate) {
        return res.status(404).json({
            message: "Gate not found"
        });
    }

    const { status } = req.body;

    if (!["OPEN", "CLOSED", "RESTRICTED"].includes(status)) {
        return res.status(400).json({
            message: "Invalid gate status"
        });
    }

    gate.status = status;

    res.json({
        message: `${gate.name} status updated`,
        gate: gate
    });
});

module.exports = router;