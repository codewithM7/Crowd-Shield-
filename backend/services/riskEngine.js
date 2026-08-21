function calculateRisk(density) {

    if (density > 5) {
        return {
            level: "CRITICAL",
            score: 90
        };
    }

    if (density > 3.5) {
        return {
            level: "HIGH",
            score: 70
        };
    }

    if (density > 2) {
        return {
            level: "MEDIUM",
            score: 40
        };
    }

    return {
        level: "LOW",
        score: 15
    };
}

module.exports = {
    calculateRisk
};