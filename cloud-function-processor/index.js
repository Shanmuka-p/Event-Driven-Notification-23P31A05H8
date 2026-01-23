const mongoose = require('mongoose');

// Define the schema for our Notification Record
// We use a flexible 'payload' field to store whatever data comes in
const notificationSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true }, // Critical for Idempotency
  userId: String,
  eventType: String,
  payload: Object,
  timestamp: Date,
  status: String,
  message: String,
  processedAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

// Cache the database connection to reuse it across function invocations
// This is a "Cold Start" optimization best practice
let dbConnection = null;

const connectDB = async () => {
  if (dbConnection) return;
  
  // In production, this comes from environment variables
  // For local docker testing, we point to the mongo service
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/notifications';
  
  try {
    dbConnection = await mongoose.connect(uri);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error; // If DB fails, we must throw so Pub/Sub retries the message
  }
};

/**
 * Triggered from a message on a Cloud Pub/Sub topic.
 *
 * @param {object} event The Cloud Functions event.
 * @param {object} context The event metadata.
 */
exports.processUserActivityEvent = async (event, context) => {
  // 1. Decode the Pub/Sub message
  // The data comes in as a base64 encoded string
  const pubsubMessage = event.data
    ? Buffer.from(event.data, 'base64').toString()
    : '{}';
  
  console.log(`Processing event ID: ${context.eventId}`);
  
  try {
    const eventData = JSON.parse(pubsubMessage);
    const { userId, eventType, payload } = eventData;

    await connectDB();

    // --- IDEMPOTENCY CHECK ---
    // Pub/Sub guarantees "at-least-once" delivery. This means a message *could* arrive twice.
    // We check if we've already processed this specific event ID.
    const existing = await Notification.findOne({ eventId: context.eventId });
    if (existing) {
      console.log(`Event ${context.eventId} already processed. Skipping.`);
      return; // Exit successfully so Pub/Sub stops retrying
    }

    // 2. Simulate Notification
    const simulationMessage = `Simulating push notification for user [${userId}] about event [${eventType}]`;
    console.log(simulationMessage);

    // 3. Persist to Database
    const record = new Notification({
      eventId: context.eventId, // Use the unique Pub/Sub ID
      userId,
      eventType,
      payload,
      timestamp: payload.timestamp || new Date(),
      status: 'processed',
      message: simulationMessage
    });

    await record.save();
    console.log(`Successfully saved record for event ${context.eventId}`);

  } catch (error) {
    console.error('Error processing message:', error);
    // Rethrowing the error tells Pub/Sub: "I failed, please try sending this message again later."
    throw error;
  }
};