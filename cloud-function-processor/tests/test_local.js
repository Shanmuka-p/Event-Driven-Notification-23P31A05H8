const { processUserActivityEvent } = require('../index');
const mongoose = require('mongoose');

// Mock data simulating a Pub/Sub message
// "eyJ..." is Base64 for {"userId":"test_user","eventType":"signup","payload":{}}
const mockEvent = {
    data: 'eyJ1c2VySWQiOiJ0ZXN0X3VzZXIiLCJldmVudFR5cGUiOiJzaWdudXAiLCJwYXlsb2FkIjp7InNvdXJjZSI6IndlYiJ9fQ=='
};

const mockContext = {
    eventId: 'unique-event-id-' + Date.now()
};

async function runTest() {
    try {
        console.log('--- Starting Local Test ---');

        // We need to point to the local MongoDB we started in Docker
        // NOTE: If you are running this script from your host machine (not inside Docker),
        // you simply use localhost:27017
        process.env.MONGODB_URI = 'mongodb://localhost:27017/notifications';

        await processUserActivityEvent(mockEvent, mockContext);

        console.log('--- Test Passed: Logic executed without error ---');

        // Verify it actually saved
        const saved = await mongoose.model('Notification').findOne({ eventId: mockContext.eventId });
        if (saved) {
            console.log('--- Verification: Record found in MongoDB! ---');
            console.log(saved);
        } else {
            console.error('--- Verification Failed: Record not found ---');
        }

        process.exit(0);
    } catch (error) {
        console.error('--- Test Failed ---', error);
        process.exit(1);
    }
}

runTest();