const express = require("express");
const router = express.Router();
const pubsubService = require("../services/pubsub_service");

// Get topic name from environment variables (Safety First!)
const TOPIC_NAME = process.env.PUBSUB_TOPIC_ID || "user-activity-events";

// POST /api/events/activity
router.post("/activity", async (req, res) => {
    const { userId, eventType, payload } = req.body;

    // --- 1. Input Validation ---
    // The requirement says: userId (string), eventType (string), payload (object)
    if (!userId || typeof userId !== "string") {
        return res
            .status(400)
            .json({ error: "Invalid or missing userId. Must be a string." });
    }
    if (!eventType || typeof eventType !== "string") {
        return res
            .status(400)
            .json({ error: "Invalid or missing eventType. Must be a string." });
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return res
            .status(400)
            .json({ error: "Invalid or missing payload. Must be an object." });
    }

    try {
        // --- 2. Publish Event ---
        const eventData = { userId, eventType, payload };

        await pubsubService.publishMessage(TOPIC_NAME, eventData);

        // --- 3. Return Success (202 Accepted) ---
        // We return 202 because we accepted the request, but processing happens later.
        res.status(202).json({
            status: "accepted",
            message: "Event received and queued for processing.",
        });
    } catch (error) {
        // --- 4. Error Handling ---
        console.error("API Error:", error);
        res
            .status(500)
            .json({ error: "Internal Server Error. Could not publish event." });
    }
});

module.exports = router;
