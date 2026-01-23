const { PubSub } = require("@google-cloud/pubsub");

// Initialize the Pub/Sub client
// If PUBSUB_EMULATOR_HOST is set in docker-compose, this client automatically uses it.
const pubsub = new PubSub({
    projectId: process.env.GCP_PROJECT_ID || "test-project",
});

/**
 * Publishes a message to a specific topic.
 * @param {string} topicName - The name of the topic (e.g., 'user-activity-events')
 * @param {object} data - The JSON data to send
 */
async function publishMessage(topicName, data) {
    try {
        // 1. Get a reference to the topic
        const topic = pubsub.topic(topicName);

        // 2. Pub/Sub requires the data to be a Buffer (binary), not raw JSON
        const dataBuffer = Buffer.from(JSON.stringify(data));

        // 3. Publish the message
        // The client returns the message ID upon success
        const messageId = await topic.publishMessage({ data: dataBuffer });

        console.log(`Message ${messageId} published to topic ${topicName}`);
        return messageId;
    } catch (error) {
        console.error(`Error publishing to ${topicName}:`, error);
        throw error; // Re-throw so the API route knows something went wrong
    }
}

module.exports = { publishMessage };
