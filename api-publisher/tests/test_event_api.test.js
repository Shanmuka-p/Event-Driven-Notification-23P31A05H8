const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const eventRoutes = require('../src/routes/event_routes');
const pubsubService = require('../src/services/pubsub_service');

// --- Mock the Pub/Sub Service ---
// We don't want to actually hit Google Cloud during unit tests.
jest.mock('../src/services/pubsub_service');

// --- Setup a test app ---
const app = express();
app.use(bodyParser.json());
app.use('/api/events', eventRoutes);

describe('POST /api/events/activity', () => {

    // Test 1: Successful Event Submission
    it('should return 202 and publish message for valid input', async () => {
        // Mock the publishMessage function to resolve successfully
        pubsubService.publishMessage.mockResolvedValue('msg-id-123');

        const res = await request(app)
            .post('/api/events/activity')
            .send({
                userId: 'user_123',
                eventType: 'click',
                payload: { page: 'home' }
            });

        expect(res.statusCode).toEqual(202);
        expect(res.body.status).toEqual('accepted');
        // Verify our code actually called the publish service
        expect(pubsubService.publishMessage).toHaveBeenCalledTimes(1);
    });

    // Test 2: Missing userId
    it('should return 400 if userId is missing', async () => {
        const res = await request(app)
            .post('/api/events/activity')
            .send({
                eventType: 'click',
                payload: {}
            });
        expect(res.statusCode).toEqual(400);
        expect(res.body.error).toContain('userId');
    });

    // Test 3: Missing eventType
    it('should return 400 if eventType is missing', async () => {
        const res = await request(app)
            .post('/api/events/activity')
            .send({
                userId: 'user_123',
                payload: {}
            });
        expect(res.statusCode).toEqual(400);
        expect(res.body.error).toContain('eventType');
    });

    // Test 4: Invalid Payload (not an object)
    it('should return 400 if payload is not an object', async () => {
        const res = await request(app)
            .post('/api/events/activity')
            .send({
                userId: 'user_123',
                eventType: 'click',
                payload: "this is a string not an object"
            });
        expect(res.statusCode).toEqual(400);
    });

    // Test 5: Pub/Sub Failure Handling
    it('should return 500 if Pub/Sub publishing fails', async () => {
        // Mock the service to throw an error
        pubsubService.publishMessage.mockRejectedValue(new Error('Pub/Sub error'));

        const res = await request(app)
            .post('/api/events/activity')
            .send({
                userId: 'user_123',
                eventType: 'click',
                payload: {}
            });

        expect(res.statusCode).toEqual(500);
        expect(res.body.error).toEqual('Internal Server Error. Could not publish event.');
    });
});