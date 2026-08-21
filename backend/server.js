require("dotenv").config();
const express = require("express");
const cors = require("cors");


// Route engine
const {
    findRoute,
    findSafestDestination
} = require("./routeEngine");

const crowdRoutes = require("./routes/crowd");
const zonesRoutes = require("./routes/zones");
const gatesRoutes = require("./routes/gates");
const incidentsRoutes = require("./routes/incidents");
const camerasRoutes = require("./routes/cameras");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/crowd", crowdRoutes);
app.use("/api/zones", zonesRoutes);
app.use("/api/gates", gatesRoutes);
app.use("/api/incidents", incidentsRoutes);
app.use("/api/cameras", camerasRoutes);

// ==========================================
// SHARED ACCESS CONTROL STATE
// ==========================================
// Access status is controlled here and can be read by
// both the admin dashboard and the citizen app.

const accessControl = new Map();


// Sync the currently connected CCTV cameras.
// This means Entry Gates, Zones and Exit Gates are
// created automatically from /api/cameras data.
app.post("/api/access-control/sync", (req, res) => {

    const cameras = Array.isArray(req.body.cameras)
        ? req.body.cameras
        : [];

    cameras.forEach((camera) => {

        if (!camera || camera.id == null) return;

        const id = Number(camera.id);

        const existing = accessControl.get(id);

        accessControl.set(id, {

            id,

            name:
                camera.name ||
                `Camera ${id}`,

            code:
                camera.code ||
                `CCTV-${String(id).padStart(2, "0")}`,

            type:
                camera.type ||
                "CAMERA",

            people:
                camera.people ?? 0,

            density:
                camera.density ?? "LOW",

            risk:
                camera.risk ?? "LOW",

            // Keep a manually selected status when
            // the camera data is refreshed.
            controlStatus:
                existing?.controlStatus ||
                "OPEN",

            updatedAt:
                existing?.updatedAt ||
                new Date().toISOString()

        });

    });

    res.json({
        success: true,
        accessControl:
            Array.from(accessControl.values())
    });

});


// Get all Access Control locations.
app.get("/api/access-control", (req, res) => {

    res.json(
        Array.from(
            accessControl.values()
        )
    );

});


// Change OPEN / RESTRICTED / CLOSED.
app.put(
    "/api/access-control/:id/status",
    (req, res) => {

        const id =
            Number(req.params.id);

        const allowedStatuses = [
            "OPEN",
            "RESTRICTED",
            "CLOSED"
        ];

        const status =
            String(
                req.body.status || ""
            ).toUpperCase();


        if (!allowedStatuses.includes(status)) {

            return res.status(400).json({

                success: false,

                message:
                    "Status must be OPEN, RESTRICTED, or CLOSED."

            });

        }


        const item =
            accessControl.get(id);


        if (!item) {

            return res.status(404).json({

                success: false,

                message:
                    "Access-control location not found."

            });

        }


        item.controlStatus =
            status;

        item.updatedAt =
            new Date().toISOString();


        accessControl.set(
            id,
            item
        );


        console.log(
            `Access Control: ${item.name} → ${status}`
        );


        res.json({

            success: true,

            message:
                `${item.name} is now ${status}.`,

            item

        });

    }
);


// Public endpoint for the citizen app.
// It exposes the same access status used by the
// admin dashboard.
app.get(
    "/api/citizen/access-status",
    (req, res) => {

        res.json({

            success: true,

            updatedAt:
                new Date().toISOString(),

            locations:
                Array.from(
                    accessControl.values()
                )

        });

    }
);



const { generateRecommendation } = require("./services/aiRecommendation");
app.get("/", (req, res) => {
    res.json({
        message: "CrowdShield Backend is running!"
    });
});


// =========================
// AI RECOMMENDATION
// =========================

app.post("/api/ai/recommend", async (req, res) => {

    try {

        const data = req.body;

        const currentLocation =
            data.currentLocation;


        // =====================================
        // COLLECT AVAILABLE CAMERAS
        // =====================================

        const cameras = [

            ...(data.gates || []),

            ...(data.zones || []),

            ...(data.exits || [])

        ];


        // =====================================
        // DETERMINE DESTINATIONS
        // =====================================

        let destinations = [];


        if (data.purpose === "ENTRY") {

            destinations =
                (data.gates || [])
                    .map(gate => gate.name)
                    .filter(
                        name =>
                            name !== currentLocation
                    );

        }


        else if (data.purpose === "EXIT") {

            destinations =
                (data.exits || [])
                    .map(exit => exit.name)
                    .filter(
                        name =>
                            name !== currentLocation
                    );

        }


        // =====================================
        // FIND SAFEST ROUTE
        // =====================================

        let routeDecision = null;


        if (
            currentLocation &&
            destinations.length > 0
        ) {

            routeDecision =
                findSafestDestination(
                    currentLocation,
                    destinations,
                    cameras
                );

        }


        // =====================================
        // ADD ROUTE ENGINE RESULT
        // TO THE AI DATA
        // =====================================

        const aiInput = {

            ...data,

            routeEngineDecision:
                routeDecision
                    ? {

                        destination:
                            routeDecision.destination,

                        route:
                            routeDecision.route,

                        people:
                            routeDecision.people,

                        density:
                            routeDecision.density,

                        risk:
                            routeDecision.risk

                    }
                    : null

        };


        console.log(
            "Route engine decision:",
            routeDecision
        );


        // =====================================
        // SEND COMPLETE DATA TO GEMINI
        // =====================================

        const recommendation =
            await generateRecommendation(
                aiInput
            );


        // =====================================
        // RETURN TO FRONTEND
        // =====================================

        res.json({

            success: true,

            recommendation

        });


    } catch (error) {

        console.error(
            "AI recommendation failed:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "AI recommendation failed"

        });

    }

});


// =========================
// START SERVER
// =========================

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`CrowdShield server running on port ${PORT}`);
});