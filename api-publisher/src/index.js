require("dotenv").config(); // Load env vars for local dev (if running without docker)
const express = require("express");
const bodyParser = require("body-parser");
const eventRoutes = require("./routes/event_routes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Health Check Endpoint (Required by instructions)
app.get("/health", (req, res) => {
    res.status(200).send("OK");
});

// Mount the Event Routes
// This maps our routes file to /api/events
app.use("/api/events", eventRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`API Publisher running on port ${PORT}`);
    console.log(`Targeting Pub/Sub Topic: ${process.env.PUBSUB_TOPIC_ID}`);
});
