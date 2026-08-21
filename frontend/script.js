let previousCameraData = {};
let previousDensityData = {};
let aiRequestInProgress = false;

// =========================
// CROWD/RISK CALCULATION HELPERS
// =========================

function applyDensityRisk(camera) {
    const density = String(camera.density || "LOW").toUpperCase();

    if (density === "CRITICAL") {
        camera.risk = "CRITICAL";
        camera.riskScore = 100;
    } else if (density === "HIGH") {
        camera.risk = "HIGH";
        camera.riskScore = 75;
    } else if (density === "MEDIUM") {
        camera.risk = "MEDIUM";
        camera.riskScore = 40;
    } else {
        camera.risk = "LOW";
        camera.riskScore = 15;
    }

    return camera;
}

function calculateOverallStatus(cameras) {
    if (!cameras || cameras.length === 0) {
        return "SAFE";
    }

    const riskValues = {
        LOW: 1,
        MEDIUM: 2,
        HIGH: 3,
        CRITICAL: 4
    };

    const total = cameras.reduce((sum, camera) => {
        const risk = String(camera.risk || "LOW").toUpperCase();
        return sum + (riskValues[risk] || 1);
    }, 0);

    const average = total / cameras.length;

    if (average < 1.5) return "SAFE";
    if (average < 2.5) return "CAUTION";
    if (average < 3.5) return "HIGH RISK";
    return "CRITICAL";
}

// =========================
// LOAD DASHBOARD DATA
// =========================

async function loadDashboard() {

    try {

        // =========================
        // LIVE CAMERA DATA
        // =========================

        const cameraResponse = await fetch(
            "http://localhost:5000/api/cameras"
        );

        const rawCameras = await cameraResponse.json();

        const cameras = rawCameras.map(camera =>
            applyDensityRisk({ ...camera })
        );

        // Total people detected by all connected CCTV cameras
        const totalCrowd = cameras.reduce(
            (sum, camera) =>
                sum + Number(camera.people || 0),
            0
        );

        // High-risk locations are driven by density/risk
        const highRiskZones = cameras.filter(camera => {

            const risk =
                String(camera.risk || "LOW").toUpperCase();

            return (
                risk === "HIGH" ||
                risk === "CRITICAL"
            );

        }).length;

        // =========================
        // ACTIVE INCIDENTS
        // =========================

        let activeIncidents = 0;

        try {

            const incidentResponse = await fetch(
                "http://localhost:5000/api/incidents"
            );

            if (incidentResponse.ok) {

                const incidents =
                    await incidentResponse.json();

                if (Array.isArray(incidents)) {

                    activeIncidents =
                        incidents.filter(incident => {

                            const status =
                                String(
                                    incident.status || ""
                                ).toUpperCase();

                            return (
                                status !== "RESOLVED" &&
                                status !== "CLOSED"
                            );

                        }).length;

                }

            }

        } catch (incidentError) {

            console.warn(
                "Incident data unavailable:",
                incidentError
            );

        }

        // =========================
        // UPDATE DASHBOARD CARDS
        // =========================

        const crowdElement =
            document.getElementById("crowd");

        if (crowdElement) {

            crowdElement.textContent =
                totalCrowd.toLocaleString();

        }


        const riskZonesElement =
            document.getElementById("riskZones");

        if (riskZonesElement) {

            riskZonesElement.textContent =
                highRiskZones;

        }


        const incidentsElement =
            document.getElementById("incidents");

        if (incidentsElement) {

            incidentsElement.textContent =
                activeIncidents;

        }


        const statusElement =
            document.getElementById("status");

        if (statusElement) {

            statusElement.textContent =
                calculateOverallStatus(cameras);

            statusElement.classList.remove(
                "safe",
                "caution",
                "high",
                "critical"
            );

            const overall =
                calculateOverallStatus(cameras);

            if (overall === "SAFE") {
                statusElement.classList.add("safe");
            } else if (overall === "CAUTION") {
                statusElement.classList.add("caution");
            } else if (overall === "HIGH RISK") {
                statusElement.classList.add("high");
            } else {
                statusElement.classList.add("critical");
            }

        }


        // =========================
        // ZONE DATA / MAP
        // =========================

        const zonesResponse = await fetch(
            "http://localhost:5000/api/zones"
        );

        const zones = await zonesResponse.json();


        zones.forEach((zone) => {

            const zoneElement =
                document.getElementById(`zone-${zone.id}`);

            if (!zoneElement) return;

            zoneElement.innerHTML =
                `${zone.name}<br>${zone.risk}`;

            zoneElement.classList.remove(
                "low",
                "medium",
                "high",
                "critical"
            );

            zoneElement.classList.add(
                String(zone.risk || "LOW").toLowerCase()
            );

        });


    } catch (error) {

        console.error(
            "Failed to load CrowdShield data:",
            error
        );

    }
}

// =========================
// ACCESS CONTROL
// CAMERA-DRIVEN
// =========================

let accessControlData = [];

async function loadAccessControl() {

    try {

        // Get CCTV camera data
        const cameraResponse = await fetch(
            "http://localhost:5000/api/cameras"
        );

        const rawCameras = await cameraResponse.json();

        const cameras = rawCameras.map(camera =>
            applyDensityRisk({ ...camera })
        );

        // Sync cameras with Access Control backend
        await fetch(
            "http://localhost:5000/api/access-control/sync",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    cameras: cameras
                })
            }
        );

        // Get Access Control data
        const response = await fetch(
            "http://localhost:5000/api/access-control"
        );

        accessControlData = await response.json();

        renderAccessControl(accessControlData);

    } catch (error) {

        console.error(
            "Failed to load Access Control:",
            error
        );

        const container =
            document.getElementById(
                "accessControlList"
            );

        if (container) {

            container.innerHTML = `
                <div class="access-error">
                    Unable to connect to Access Control service.
                </div>
            `;

        }

    }
}


function renderAccessControl(items) {

    const container =
        document.getElementById(
            "accessControlList"
        );

    if (!container) return;

    container.innerHTML = "";

    // Separate cameras
    const entries = items.filter(
        item => item.type === "ENTRY"
    );

    const zones = items.filter(
        item => item.type === "ZONE"
    );

    const exits = items.filter(
        item => item.type === "EXIT"
    );


    // Update top counters
    const entryCount =
        document.getElementById(
            "entryControlCount"
        );

    const zoneCount =
        document.getElementById(
            "zoneControlCount"
        );

    const exitCount =
        document.getElementById(
            "exitControlCount"
        );


    if (entryCount)
        entryCount.textContent =
            entries.length;

    if (zoneCount)
        zoneCount.textContent =
            zones.length;

    if (exitCount)
        exitCount.textContent =
            exits.length;


    // Sections
    const sections = [

        {
            title: "Entry Gates",
            subtitle:
                "Control visitor entry points",
            icon: "🚪",
            items: entries,
            empty:
                "No entry-gate cameras detected."
        },

        {
            title: "Zones",
            subtitle:
                "Control access to monitored venue zones",
            icon: "📍",
            items: zones,
            empty:
                "No zone cameras detected."
        },

        {
            title: "Exit Gates",
            subtitle:
                "Control visitor exit points",
            icon: "🚪",
            items: exits,
            empty:
                "No exit-gate cameras detected."
        }

    ];


    sections.forEach(section => {

        const sectionElement =
            document.createElement("div");

        sectionElement.className =
            "access-group";


        sectionElement.innerHTML = `
            <div class="access-group-header">

                <div>
                    <h2>
                        ${section.icon}
                        ${section.title}
                    </h2>

                    <p>
                        ${section.subtitle}
                    </p>
                </div>

                <span class="access-group-count">
                    ${section.items.length}
                </span>

            </div>

            <div class="access-grid"></div>
        `;


        const grid =
            sectionElement.querySelector(
                ".access-grid"
            );


        if (!section.items.length) {

            grid.innerHTML = `
                <div class="access-empty">
                    ${section.empty}
                </div>
            `;

        } else {

            section.items.forEach(item => {

                grid.appendChild(
                    createAccessCard(item)
                );

            });

        }


        container.appendChild(
            sectionElement
        );

    });

}


function createAccessCard(item) {

    const card =
        document.createElement("article");


    const status =
        String(
            item.controlStatus || "OPEN"
        ).toUpperCase();


    const risk =
        String(
            item.risk || "LOW"
        ).toUpperCase();


    const statusClass =
        status.toLowerCase();


    const riskClass =
        risk.toLowerCase();


    card.className =
        `access-card ${statusClass}`;


    card.innerHTML = `

        <div class="access-card-top">

            <div>

                <span class="access-camera-code">
                    ${item.code ||
                    `CCTV-${String(item.id)
                        .padStart(2, "0")}`}
                </span>

                <h3>
                    ${item.name}
                </h3>

                <p>
                    ${
                        item.type === "ENTRY"
                            ? "Entry Gate"
                            : item.type === "EXIT"
                                ? "Exit Gate"
                                : "Venue Zone"
                    }
                </p>

            </div>

            <span
                class="access-status ${statusClass}">
                ${status}
            </span>

        </div>


        <div class="access-metrics">

            <div>
                <span>People</span>

                <strong>
                    ${Number(
                        item.people || 0
                    ).toLocaleString()}
                </strong>
            </div>


            <div>
                <span>Density</span>

                <strong>
                    ${String(
                        item.density || "LOW"
                    ).toUpperCase()}
                </strong>
            </div>


            <div>
                <span>Risk</span>

                <strong class="risk-${riskClass}">
                    ${risk}
                </strong>
            </div>

        </div>


        <div class="access-actions">

            <button
                class="access-btn open-btn"
                onclick="
                    changeAccessStatus(
                        ${item.id},
                        'OPEN'
                    )
                ">
                Open
            </button>


            <button
                class="access-btn restrict-btn"
                onclick="
                    changeAccessStatus(
                        ${item.id},
                        'RESTRICTED'
                    )
                ">
                Restrict
            </button>


            <button
                class="access-btn close-btn"
                onclick="
                    changeAccessStatus(
                        ${item.id},
                        'CLOSED'
                    )
                ">
                Close
            </button>

        </div>

    `;


    return card;

}


async function changeAccessStatus(
    cameraId,
    newStatus
) {

    try {

        const response = await fetch(
            `http://localhost:5000/api/access-control/${cameraId}/status`,
            {
                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    status: newStatus
                })
            }
        );


        const data =
            await response.json();


        console.log(
            "Access status updated:",
            data
        );


        // Reload Access Control
        loadAccessControl();


    } catch (error) {

        console.error(
            "Failed to change Access Control status:",
            error
        );

    }

}

// =========================
// LOAD GATE DATA
// =========================

async function loadGates() {

    try {

        const response = await fetch(
            "http://localhost:5000/api/gates"
        );

        const gates = await response.json();


        const gateList =
            document.getElementById("gateList");


        // If gate page is not currently in HTML
        if (!gateList) return;


        gateList.innerHTML = "";


        gates.forEach((gate) => {

            const statusClass =
                gate.status.toLowerCase();


            const gateRow =
                document.createElement("div");


            gateRow.className =
                "gate-row";


            gateRow.innerHTML = `

                <div>

                    <strong>
                        ${gate.name}
                    </strong>

                    <br>

                    <small>
                        ${gate.queueSize}
                        people in queue
                    </small>

                </div>


                <div>

                    <span
                        class="status ${statusClass}">
                        ${gate.status}
                    </span>


                    <button
                        class="gate-control"
                        onclick="changeGateStatus(
                            ${gate.id},
                            'OPEN'
                        )">

                        Open

                    </button>


                    <button
                        class="gate-control"
                        onclick="changeGateStatus(
                            ${gate.id},
                            'RESTRICTED'
                        )">

                        Restrict

                    </button>


                    <button
                        class="gate-control close-btn"
                        onclick="changeGateStatus(
                            ${gate.id},
                            'CLOSED'
                        )">

                        Close

                    </button>

                </div>

            `;


            gateList.appendChild(
                gateRow
            );

        });


    } catch (error) {

        console.error(
            "Failed to load gate data:",
            error
        );

    }
}



// =========================
// CHANGE GATE STATUS
// =========================

async function changeGateStatus(
    gateId,
    newStatus
) {

    try {

        const response = await fetch(

            `http://localhost:5000/api/gates/${gateId}/status`,

            {
                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    status: newStatus

                })

            }

        );


        const data =
            await response.json();


        console.log(data);


        // Reload gate information
        loadGates();


    } catch (error) {

        console.error(
            "Failed to change gate status:",
            error
        );

    }
}

// =========================
// ANALYTICS - LAST 5 SNAPSHOTS
// =========================

let analyticsHistory = [];
let analyticsLastSnapshotTime = 0;

try {

    const savedAnalytics =
        localStorage.getItem(
            "crowdshieldAnalyticsHistory"
        );

    if (savedAnalytics) {
        analyticsHistory =
            JSON.parse(savedAnalytics);
    }

} catch (error) {

    console.warn(
        "Could not restore analytics history:",
        error
    );

    analyticsHistory = [];

}


function calculateOverallDensity(cameras) {

    const densities =
        cameras.map(camera =>
            String(
                camera.density || "LOW"
            ).toUpperCase()
        );


    if (
        densities.includes("CRITICAL") ||
        densities.includes("HIGH")
    ) {
        return "HIGH";
    }


    if (
        densities.includes("MEDIUM")
    ) {
        return "MEDIUM";
    }


    return "LOW";

}


function createAnalyticsSnapshot(cameras) {

    const totalCrowd =
        cameras.reduce(
            (sum, camera) =>
                sum + Number(
                    camera.people || 0
                ),
            0
        );


    const riskZones =
        cameras.filter(camera => {

            const risk =
                String(
                    camera.risk || "LOW"
                ).toUpperCase();

            return (
                risk === "HIGH" ||
                risk === "CRITICAL"
            );

        }).length;


    return {

        timestamp: Date.now(),

        time:
            new Date().toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            ),

        totalCrowd,

        density:
            calculateOverallDensity(
                cameras
            ),

        riskZones

    };

}


function saveAnalyticsHistory() {

    try {

        localStorage.setItem(
            "crowdshieldAnalyticsHistory",
            JSON.stringify(
                analyticsHistory
            )
        );

    } catch (error) {

        console.warn(
            "Could not save analytics history:",
            error
        );

    }

}


function renderAnalyticsHistory() {

    const container =
        document.getElementById(
            "analyticsHistory"
        );


    if (!container) return;


    if (!analyticsHistory.length) {

        container.innerHTML = `
            <div class="analytics-empty">
                Collecting CCTV data...
            </div>
        `;

        return;

    }


    container.innerHTML = "";


    analyticsHistory.forEach(
        (snapshot, index) => {

            const density =
                String(
                    snapshot.density || "LOW"
                ).toLowerCase();


            const row =
                document.createElement(
                    "div"
                );


            row.className =
                `analytics-row ${
                    index === 0
                        ? "latest"
                        : ""
                }`;


            row.innerHTML = `

                <div class="analytics-row-top">

                    <span class="analytics-time">
                        ${snapshot.time}
                    </span>

                    ${
                        index === 0
                            ? `
                                <span class="analytics-latest">
                                    LATEST DATA
                                </span>
                              `
                            : ""
                    }

                </div>


                <div class="analytics-metrics">

                    <div class="analytics-metric">

                        <span>
                            Total Crowd
                        </span>

                        <strong>
                            ${
                                Number(
                                    snapshot.totalCrowd || 0
                                ).toLocaleString()
                            }
                        </strong>

                    </div>


                    <div class="analytics-metric">

                        <span>
                            Density
                        </span>

                        <strong
                            class="analytics-density ${density}">
                            ${
                                String(
                                    snapshot.density || "LOW"
                                ).toUpperCase()
                            }
                        </strong>

                    </div>


                    <div class="analytics-metric">

                        <span>
                            Risk Zones
                        </span>

                        <strong
                            class="analytics-risk-count ${
                                snapshot.riskZones > 0
                                    ? "high"
                                    : "low"
                            }">

                            ${snapshot.riskZones}

                        </strong>

                    </div>

                </div>

            `;


            container.appendChild(row);

        }
    );

}


async function updateAnalytics() {

    try {

        const response =
            await fetch(
                "http://localhost:5000/api/cameras"
            );


        if (!response.ok) return;


        const rawCameras =
            await response.json();


        const cameras =
            rawCameras.map(camera =>
                typeof applyDensityRisk === "function"
                    ? applyDensityRisk({
                        ...camera
                    })
                    : {
                        ...camera
                    }
            );


        const now =
            Date.now();


        if (
            analyticsHistory.length === 0 ||
            now -
                analyticsLastSnapshotTime
                >=
                5 * 60 * 1000
        ) {

            const snapshot =
                createAnalyticsSnapshot(
                    cameras
                );


            analyticsHistory.unshift(
                snapshot
            );


            // Maximum 5 results
            analyticsHistory =
                analyticsHistory.slice(
                    0,
                    5
                );


            analyticsLastSnapshotTime =
                now;


            saveAnalyticsHistory();

        }


        renderAnalyticsHistory();


    } catch (error) {

        console.error(
            "Failed to update analytics:",
            error
        );

    }

}

// =========================
// PAGE SWITCHING
// =========================

function showPage(
    pageId,
    button
) {


    // =========================
    // HIDE ALL PAGES
    // =========================

    document
        .querySelectorAll(".page-section")
        .forEach(page => {

            page.style.display =
                "none";

        });


    // =========================
    // SHOW SELECTED PAGE
    // =========================

    const selectedPage =
        document.getElementById(pageId);


    if (selectedPage) {

        selectedPage.style.display =
            "block";

    }


    // =========================
    // REMOVE ACTIVE
    // FROM ALL BUTTONS
    // =========================

    document
        .querySelectorAll(".nav button")
        .forEach(btn => {

            btn.classList.remove(
                "active"
            );

        });


    // =========================
    // ADD ACTIVE TO CLICKED
    // BUTTON
    // =========================

    if (button) {

        button.classList.add(
            "active"
        );

    }


    // =========================
    // LOAD PAGE-SPECIFIC DATA
    // =========================

    if (pageId === "gateManagement") {

        loadAccessControl();

    }

    if (pageId === "analyticsPage") {
    updateAnalytics();
}

}



// =========================
// START APPLICATION
// =========================
// =========================
// LOAD CAMERA DATA
// =========================

async function loadCameras() {

    try {

        const response = await fetch(
            "http://localhost:5000/api/cameras"
        );

        const rawCameras = await response.json();

        const cameras = rawCameras.map(camera =>
            applyDensityRisk({ ...camera })
        );

        loadRiskManagement(cameras);

        const cameraGrid =
            document.getElementById("cameraGrid");

        if (!cameraGrid) return;

        cameraGrid.innerHTML = "";


        cameras.forEach((camera) => {

            // Risk class
            const riskClass =
                String(camera.risk || "LOW").toLowerCase();


            // Density
            const densityText =
                String(camera.density || "LOW").toUpperCase();

            const densityClass =
                densityText.toLowerCase();


            // Camera type
            let cameraType = "CAMERA";

            if (camera.type === "ENTRY") {
                cameraType = "ENTRY GATE";
            }
            else if (camera.type === "ZONE") {
                cameraType = "ZONE";
            }
            else if (camera.type === "EXIT") {
                cameraType = "EXIT";
            }


            // AI recommendation
          


            const cameraCard =
                document.createElement("div");

            cameraCard.className =
                "camera-card";


            cameraCard.innerHTML = `

                <div class="camera-header">

                    <div>

                        <strong>
                            Camera ${camera.id}
                            — ${camera.name}
                        </strong>

                        <small>
                            ${camera.code} · ${cameraType}
                        </small>

                    </div>


                    <span class="camera-online">
                        ● ${camera.status}
                    </span>

                </div>


                <div class="camera-stats">

                    <div class="camera-stat">

                        <span>
                            People
                        </span>

                        <strong>
                            ${Number(camera.people || 0).toLocaleString()}
                        </strong>

                    </div>


                    <div class="camera-stat">

                        <span>
                            Density
                        </span>

                        <strong class="density-${densityClass}">
                            ${densityText}
                        </strong>

                    </div>


                    <div class="camera-stat">

                        <span>
                            Movement
                        </span>

                        <strong>
                            ${camera.movement || "NORMAL"}
                        </strong>

                    </div>


                    <div class="camera-stat">

                        <span>
                            Risk
                        </span>

                        <strong class="risk-${riskClass}">
                            ${camera.risk || "LOW"}
                        </strong>

                    </div>

                </div>


                <!-- Normal recommendation -->

                <div class="
                    recommendation
                    ${riskClass === "low" ||
                      riskClass === "medium"
                        ? "safe-recommendation"
                        : ""}
                ">

                    <strong>
                        Recommendation
                    </strong>

                    <p>
                        ${camera.recommendation || "Continue monitoring."}
                    </p>

                </div>


              


                <div class="camera-footer">

                    Last updated:

                    <span>
                        ${new Date(
                            camera.lastUpdated
                        ).toLocaleTimeString()}
                    </span>

                </div>

            `;


            cameraGrid.appendChild(
                cameraCard
            );

        });


    } catch (error) {

        console.error(
            "Failed to load camera data:",
            error
        );

    }
}

// ==========================================
// RISK CLASS HELPER
// ==========================================

function getRiskClass(camera) {

    const risk =
        String(camera.risk || "LOW")
            .toUpperCase();

    if (risk === "CRITICAL") {
        return "critical";
    }

    if (risk === "HIGH") {
        return "high";
    }

    if (risk === "MEDIUM") {
        return "medium";
    }

    return "low";
}


function getRiskScore(camera) {

    const density =
        String(camera.density || "LOW")
            .toUpperCase();

    if (density === "CRITICAL") {
        return 100;
    }

    if (density === "HIGH") {
        return 75;
    }

    if (density === "MEDIUM") {
        return 40;
    }

    return 15;
}

function loadRiskManagement(cameras) {

    const highRiskAreas =
        document.getElementById("highRiskAreas");

    const highRiskCount =
        document.getElementById("highRiskCount");

    const riskLocations =
        document.getElementById("riskLocations");


    if (
        !highRiskAreas ||
        !highRiskCount ||
        !riskLocations
    ) {
        return;
    }


    // =====================================
    // CALCULATE RISK SCORE
    // =====================================

    // =====================================
    // HIGH RISK LOCATIONS
    // =====================================

    const highRiskCameras =
        cameras.filter(camera => {

            const density =
                String(camera.density || "")
                    .toUpperCase();

            return (
                density === "HIGH" ||
                density === "CRITICAL"
            );

        });


    highRiskCount.textContent =
        highRiskCameras.length;


    if (highRiskCameras.length === 0) {

        highRiskAreas.innerHTML = `

            <div class="risk-empty">

                No high-risk areas detected.

            </div>

        `;

    }
    else {

        highRiskAreas.innerHTML =
            highRiskCameras
                .map(camera => {

                    const risk =
                        String(
                            camera.risk || "LOW"
                        ).toUpperCase();


                    const score =
                        getRiskScore(camera);


                    const riskClass =
                        getRiskClass(camera);

                    return `

                        <div class="
                            risk-location-card
                            risk-${riskClass}
                        ">

                            <div class="
                                location-header
                            ">

                                <div class="
                                    camera-title
                                ">

                                    <div class="
                                        camera-icon
                                    ">
                                        CCTV
                                    </div>

                                    <div>
                                        <h3>
                                            ${camera.name}
                                        </h3>

                                        <span>
                                            ${camera.code || ""}
                                        </span>
                                    </div>

                                </div>

                                <span class="
                                    risk-badge
                                    risk-${riskClass}
                                ">
                                    ${risk}
                                </span>

                            </div>

                            <div class="
                                location-metrics
                            ">

                                <div>
                                    <span>People</span>
                                    <strong>
                                        ${Number(
                                            camera.people || 0
                                        ).toLocaleString()}
                                    </strong>
                                </div>

                                <div>
                                    <span>Density</span>
                                    <strong class="
                                        density-${String(
                                            camera.density || "LOW"
                                        ).toLowerCase()}
                                    ">
                                        ${String(
                                            camera.density || "LOW"
                                        ).toUpperCase()}
                                    </strong>
                                </div>

                                <div>
                                    <span>Movement</span>
                                    <strong>
                                        ${camera.movement || "NORMAL"}
                                    </strong>
                                </div>

                            </div>

                            <div class="score-row">
                                <span>Risk Score</span>
                                <strong>${score}/100</strong>
                            </div>

                            <div class="risk-progress">
                                <div
                                    class="
                                        risk-progress-bar
                                        risk-${riskClass}
                                    "
                                    style="width: ${score}%"
                                ></div>
                            </div>

                            <div class="location-footer">
                                <span>Status</span>
                                <strong>
                                    <i class="status-dot"></i>
                                    ${camera.status || "ONLINE"}
                                </strong>
                            </div>

                        </div>

                    `;

                })
                .join("");

    }

// ==========================================
// NORMAL / SAFE LOCATIONS
// ==========================================

// Only show locations that are NOT high or critical
const normalCameras =
    cameras.filter(camera => {

        const density =
            String(
                camera.density || "LOW"
            ).toUpperCase();

        return (
            density !== "HIGH" &&
            density !== "CRITICAL"
        );

    });


// ==========================================
// SHOW NORMAL LOCATIONS AT THE BOTTOM
// ==========================================

if (normalCameras.length === 0) {

    riskLocations.innerHTML = `

        <div class="risk-empty">

            <strong>
                All monitored locations
                currently require attention.
            </strong>

        </div>

    `;

}
else {

    riskLocations.innerHTML =
        normalCameras
            .map(camera => {

                const risk =
                    String(
                        camera.risk || "LOW"
                    ).toUpperCase();


                const riskClass =
                    getRiskClass(camera);


                const score =
                    getRiskScore(camera);


                return `

                    <div class="
                        risk-location-card
                        risk-${riskClass}
                    ">

                        <div class="
                            location-header
                        ">

                            <div class="
                                camera-title
                            ">

                                <div class="
                                    camera-icon
                                ">
                                    CCTV
                                </div>

                                <div>

                                    <h3>
                                        ${camera.name}
                                    </h3>

                                    <span>
                                        ${camera.code || ""}
                                    </span>

                                </div>

                            </div>


                            <span class="
                                risk-badge
                                risk-${riskClass}
                            ">

                                ${risk}

                            </span>

                        </div>


                        <div class="
                            location-metrics
                        ">

                            <div>

                                <span>
                                    People
                                </span>

                                <strong>
                                    ${Number(
                                        camera.people || 0
                                    ).toLocaleString()}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    Density
                                </span>

                                <strong>
                                    ${camera.density || "LOW"}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    Movement
                                </span>

                                <strong>
                                    ${camera.movement || "NORMAL"}
                                </strong>

                            </div>

                        </div>


                        <div class="
                            score-row
                        ">

                            <span>
                                Risk Score
                            </span>

                            <strong>
                                ${score}/100
                            </strong>

                        </div>


                        <div class="
                            risk-progress
                        ">

                            <div
                                class="
                                    risk-progress-bar
                                    risk-${riskClass}
                                "
                                style="
                                    width: ${score}%;
                                "
                            ></div>

                        </div>


                        <div class="
                            location-footer
                        ">

                            <span>
                                Status
                            </span>

                            <strong>

                                <i class="status-dot"></i>

                                ${camera.status || "ONLINE"}

                            </strong>

                        </div>

                    </div>

                `;

            })
            .join("");

}
}
async function checkCrowdTrends() {

    try {

        const response = await fetch(
            "http://localhost:5000/api/cameras"
        );

        const rawCameras = await response.json();

        const cameras = rawCameras.map(camera =>
            applyDensityRisk({ ...camera })
        );

        for (const camera of cameras) {

            const currentPeople =
                Number(camera.people || 0);

            const previousPeople =
                previousCameraData[camera.id];


            // First time seeing this camera
            if (previousPeople === undefined) {

                previousCameraData[camera.id] =
                    currentPeople;

                continue;
            }


            const increase =
                currentPeople - previousPeople;


            const percentageIncrease =
                previousPeople > 0
                    ? (increase / previousPeople) * 100
                    : 0;


            /*
             * Detect sudden crowd increase.
             *
             * Example:
             * 50 → 65 = +15 people = 30%
             *
             * This will trigger.
             */

 const density =
    String(
        camera.density || "LOW"
    ).toUpperCase();


// =====================================
// BOTTLENECK APPROACHING: 13–14 PEOPLE
// =====================================

if (
    currentPeople >= 13 &&
    currentPeople < 15 &&
    previousPeople < 13
) {

    console.log(
        `BOTTLENECK APPROACHING at ${camera.name}`
    );

    console.log(
        `Previous people: ${previousPeople}`
    );

    console.log(
        `Current people: ${currentPeople}`
    );


    if (!aiRequestInProgress) {

        await generateAIRecommendation(
            camera,
            previousPeople,
            increase,
            "APPROACHING"
        );

    }

}


// =====================================
// BOTTLENECK / HIGH: 15+ PEOPLE
// =====================================

if (
    currentPeople >= 15 &&
    previousPeople < 15
) {

    console.log(
        `BOTTLENECK DETECTED at ${camera.name}`
    );

    console.log(
        `Previous people: ${previousPeople}`
    );

    console.log(
        `Current people: ${currentPeople}`
    );


    if (!aiRequestInProgress) {

        await generateAIRecommendation(
            camera,
            previousPeople,
            increase,
            "HIGH"
        );

    }

}


// =====================================
// SAVE CURRENT PEOPLE
// =====================================

previousCameraData[camera.id] =
    currentPeople;

        }

    } catch (error) {

        console.error(
            "Crowd trend detection failed:",
            error
        );

    }

}

async function generateAIRecommendation(
    changedCamera,
    previousPeople,
    increase,
    alertLevel = "HIGH"
) {

    aiRequestInProgress = true;

    try {

        // Get all 7 cameras
        const response = await fetch(
            "http://localhost:5000/api/cameras"
        );

        const rawCameras = await response.json();

        const cameras = rawCameras.map(camera =>
            applyDensityRisk({ ...camera })
        );


        let payload;


        // =====================================
        // ENTRY GATE
        // =====================================

        if (changedCamera.type === "ENTRY") {

            const gates = cameras
                .filter(camera =>
                    camera.type === "ENTRY"
                )
                .map(camera => ({

                    name: camera.name,
                    people: camera.people,
                    density: camera.density,
                    movement: camera.movement,
                    risk: camera.risk,
                    status: camera.status

                }));


            const zones = cameras
                .filter(camera =>
                    camera.type === "ZONE"
                )
                .map(camera => ({

                    name: camera.name,
                    people: camera.people,
                    density: camera.density,
                    risk: camera.risk

                }));


          payload = {

    purpose: "ENTRY",

    alertLevel:
        alertLevel,

    currentLocation:
        changedCamera.name,

    currentCrowd: {

        people:
            changedCamera.people,

        previousPeople:
            previousPeople,

        increase:
            increase,

        density:
            changedCamera.density,

        movement:
            changedCamera.movement,

        risk:
            changedCamera.risk,

        trend: "INCREASING"

    },

    gates,
    zones

};

        }


        // =====================================
        // EXIT GATE
        // =====================================

        else if (changedCamera.type === "EXIT") {

            const exits = cameras
                .filter(camera =>
                    camera.type === "EXIT"
                )
                .map(camera => ({

                    name: camera.name,
                    people: camera.people,
                    density: camera.density,
                    movement: camera.movement,
                    risk: camera.risk,
                    status: camera.status

                }));


            const zones = cameras
                .filter(camera =>
                    camera.type === "ZONE"
                )
                .map(camera => ({

                    name: camera.name,
                    people: camera.people,
                    density: camera.density,
                    risk: camera.risk

                }));


            payload = {

                purpose: "EXIT",

                alertLevel:
                 alertLevel,

                currentLocation:
                    changedCamera.name,

                currentCrowd: {

                    people:
                        changedCamera.people,

                    previousPeople:
                        previousPeople,

                    increase:
                        increase,

                    density:
                        changedCamera.density,

                    movement:
                        changedCamera.movement,

                    risk:
                        changedCamera.risk,

                    trend: "INCREASING"

                },

                exits,
                zones

            };

        }


        // =====================================
        // ZONE CROWD SPIKE
        // =====================================

        else {

            const exits = cameras
                .filter(camera =>
                    camera.type === "EXIT"
                )
                .map(camera => ({

                    name: camera.name,
                    people: camera.people,
                    density: camera.density,
                    risk: camera.risk,
                    status: camera.status

                }));


            const zones = cameras
                .filter(camera =>
                    camera.type === "ZONE"
                )
                .map(camera => ({

                    name: camera.name,
                    people: camera.people,
                    density: camera.density,
                    risk: camera.risk

                }));


            payload = {

                purpose: "ZONE",

                alertLevel:
                 alertLevel,

                currentLocation:
                    changedCamera.name,

                currentCrowd: {

                    people:
                        changedCamera.people,

                    previousPeople:
                        previousPeople,

                    increase:
                        increase,

                    density:
                        changedCamera.density,

                    movement:
                        changedCamera.movement,

                    risk:
                        changedCamera.risk,

                    trend: "INCREASING"

                },

                exits,
                zones

            };

        }


     
       

// =====================================
// AI ALERT INSTRUCTION
// =====================================

payload.alertInstruction =
    alertLevel === "APPROACHING"
        ? "Bottleneck is approaching. Advise citizens NOT to enter this location. If they are already inside, tell them to stay calm and move safely."
        : "High crowd density reached. Recommend the safest nearby location of the SAME TYPE.";


     // =====================================
    // SEND TO GEMINI THROUGH BACKEND
    // =====================================

    const aiResponse = await fetch(
        "http://localhost:5000/api/ai/recommend",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(payload)
        }
    );


    console.log(
        "AI HTTP STATUS:",
        aiResponse.status
    );


    const responseText =
        await aiResponse.text();


    console.log(
        "AI RAW RESPONSE:",
        responseText
    );


    let data;

    try {

        data = JSON.parse(responseText);

    } catch (error) {

        console.error(
            "AI response is not valid JSON:",
            error
        );

        return;

    }


    console.log(
        "AI RESPONSE:",
        data
    );


    if (
        data.success &&
        data.recommendation
    ) {

        showDashboardAIAlert(
            changedCamera,
            previousPeople,
            increase,
            data.recommendation,
             alertLevel
        );

    }


} catch (error) {

    console.error(
        "AI recommendation failed:",
        error
    );

}


aiRequestInProgress = false;

}

function showDashboardAIAlert(
    camera,
    previousPeople,
    increase,
    recommendation,
    alertLevel
) {

    // =====================================
    // AI RECOMMENDATION BOX
    // =====================================

    const recommendationBox =
        document.getElementById(
            "dashboardAIRecommendation"
        );


    if (recommendationBox) {

        recommendationBox.innerHTML = `

            <strong>
                Crowd change detected at ${camera.name}
            </strong>

            <p>
                Crowd increased from
                <strong>${previousPeople}</strong>
                to
                <strong>${camera.people}</strong>
                people.
            </p>

            <p>
                <strong>Route:</strong>
                ${recommendation.recommendedRoute}
            </p>

            <p>
                <strong>Recommended Gate/Exit:</strong>
                ${recommendation.recommendedGate}
            </p>

            <p>
                <strong>Action:</strong>
                ${recommendation.action}
            </p>

           <p>
    <strong>Reason:</strong>
    ${
        alertLevel === "APPROACHING"
            ? `Bottleneck is approaching at ${camera.name}. Crowd density is increasing toward the bottleneck threshold.`
            : recommendation.reason
    }
</p>

            <p>
                <strong>Priority:</strong>
                ${recommendation.priority}
            </p>

        `;

    }


    // =====================================
    // ALERT HISTORY
    // =====================================

    const alertContainer =
        document.getElementById(
            "aiAlerts"
        );


    if (!alertContainer) {
        return;
    }


    const alert =
        document.createElement("div");

    alert.className = "alert";


    alert.innerHTML = `

        <strong>
    ${
        alertLevel === "APPROACHING"
            ? `⚠️ Bottleneck Approaching — ${camera.name}`
            : `🔴 Bottleneck Detected — ${camera.name}`
    }
</strong>

        <p>
            ${previousPeople} → ${camera.people}
            people
            (+${increase})
        </p>

        <p>
            <strong>AI:</strong>
            ${recommendation.recommendedRoute}
        </p>

        <p>
            <strong>Action:</strong>
            ${recommendation.action}
        </p>

        <p>
        <strong>Security:</strong>
         ${recommendation.securityAction || "MONITOR"}
        </p>

        <small>
            ${new Date().toLocaleTimeString()}
        </small>

    `;


    // Newest alert at top
    alertContainer.prepend(alert);


    // Keep only last 5 alerts
    while (
        alertContainer.children.length > 5
    ) {

        alertContainer.removeChild(
            alertContainer.lastElementChild
        );

    }

}

loadDashboard();
loadCameras();
loadAccessControl();

setInterval(() => {

    loadDashboard();
    loadCameras();
    loadAccessControl();
    checkCrowdTrends();
    updateAnalytics();

}, 3000);

window.showPage = showPage;
window.changeAccessStatus = changeAccessStatus;