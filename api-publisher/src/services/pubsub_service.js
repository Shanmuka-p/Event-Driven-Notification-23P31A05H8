const { PubSub } = require("@google-cloud/pubsub");
const { GoogleAuth } = require("google-auth-library");

const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/pubsub"],
});

const pubsub = new PubSub({
    projectId: process.env.GCP_PROJECT_ID,
    auth,
});

/**
 * Publishes a message to a specific topic.
 * @param {string} topicName - The name of the topic (e.g., 'user-activity-events')
 * @param {object} data - The JSON data to send
 */
async function publishMessage(topicName, data) {
    try {
        // 1. Get a reference to the topic
        //const topic = pubsub.topic(topicName);
        const topic = pubsub.topic(`projects/${process.env.GCP_PROJECT_ID}/topics/${topicName}`);


        // 2. Pub/Sub requires the data to be a Buffer (binary), not raw JSON
        const dataBuffer = Buffer.from(JSON.stringify(data));

        // 3. Publish the message
        // The client returns the message ID upon success
        const messageId = await topic.publishMessage({ data: dataBuffer });

        console.log(`Message ${messageId} published to topic ${topicName}`);
        return messageId;
    } catch (error) {
        console.error("PUBSUB ERROR >>>", error);
        throw error;
    }

}

module.exports = { publishMessage };
