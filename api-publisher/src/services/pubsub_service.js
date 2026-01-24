const { PubSub } = require("@google-cloud/pubsub");

// 1. Initialize Pub/Sub Client
// We use a fallback 'test-project' just in case the env var is missing locally
const projectId = process.env.GCP_PROJECT_ID || 'test-project';
const pubsub = new PubSub({ projectId });

async function publishMessage(topicName, data) {
    try {
        console.log(`[DEBUG] Preparing to publish to topic: ${topicName}`);
        
        const topic = pubsub.topic(topicName);

        // --- SELF-HEALING LOGIC ---
        // Check if the topic exists. If not, create it automatically.
        // This prevents "Topic Not Found" errors when the emulator resets.
        const [exists] = await topic.exists();
        if (!exists) {
            console.log(`[DEBUG] Topic "${topicName}" not found. Creating it now...`);
            await topic.create();
            console.log(`[DEBUG] Topic "${topicName}" created successfully.`);
        }

        // Publish the message
        const dataBuffer = Buffer.from(JSON.stringify(data));
        const messageId = await topic.publishMessage({ data: dataBuffer });

        console.log(`Message ${messageId} published to topic ${topicName}`);
        return messageId;
    } catch (error) {
        console.error("PUBSUB ERROR >>>", error);
        throw error;
    }
}

module.exports = { publishMessage };