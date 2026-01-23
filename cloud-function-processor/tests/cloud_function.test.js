const { processUserActivityEvent } = require('../index');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let mongoUri;

// Mock console methods to prevent logging during tests
// and to allow us to spy on them.
const jestConsole = {
  log: jest.spyOn(console, 'log').mockImplementation(() => {}),
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
};


describe('Cloud Function: processUserActivityEvent', () => {
  // Setup in-memory MongoDB server before all tests
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri; // Point the function to the in-memory DB
  });

  // Disconnect and close server after all tests
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Clear the database before each test to ensure isolation
  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
    // Clear any mock history before each test
    jest.clearAllMocks();
  });
  
  // Test 1: Successful processing of a new event
  it('should process a new event, simulate a notification, and save it to the database', async () => {
    const userId = 'user-123';
    const eventType = 'login';
    const mockPayload = { source: 'mobile' };
    
    // Base64 encode the payload, just like Pub/Sub does
    const data = Buffer.from(JSON.stringify({ userId, eventType, payload: mockPayload })).toString('base64');
    
    const mockEvent = { data };
    const mockContext = { eventId: 'unique-event-id-1' };

    await processUserActivityEvent(mockEvent, mockContext);

    // Verify it was logged
    expect(jestConsole.log).toHaveBeenCalledWith(expect.stringContaining(`Simulating push notification for user [${userId}]`));
    
    // Verify it was saved to the database
    const Notification = mongoose.model('Notification');
    const savedRecord = await Notification.findOne({ eventId: mockContext.eventId });
    
    expect(savedRecord).not.toBeNull();
    expect(savedRecord.userId).toBe(userId);
    expect(savedRecord.eventType).toBe(eventType);
    expect(savedRecord.status).toBe('processed');
  });

  // Test 2: Idempotency check for duplicate events
  it('should skip processing if the event has already been processed', async () => {
    const eventId = 'duplicate-event-id-2';
    const Notification = mongoose.model('Notification');

    // 1. First, manually create a record to simulate a previous run
    await new Notification({ eventId, status: 'processed', message: 'Already done' }).save();
    
    // 2. Now, try to process the *same* event again
    const mockEvent = { data: Buffer.from(JSON.stringify({})).toString('base64') };
    const mockContext = { eventId }; // Same eventId

    await processUserActivityEvent(mockEvent, mockContext);

    // Verify the function logged that it was skipping
    expect(jestConsole.log).toHaveBeenCalledWith(expect.stringContaining(`Event ${eventId} already processed. Skipping.`));

    // Verify that no new database records were created
    const count = await Notification.countDocuments({ eventId });
    expect(count).toBe(1);
    
    // Verify no "simulation" log was made this time
    expect(jestConsole.log).not.toHaveBeenCalledWith(expect.stringContaining('Simulating push notification'));

  // Test 3: Graceful failure on invalid JSON
  it('should throw an error and not crash if the Pub/Sub message is invalid JSON', async () => {
    const mockEvent = { data: Buffer.from('this-is-not-json').toString('base64') };
    const mockContext = { eventId: 'invalid-json-event' };

    // We expect the function to throw an error, which is the correct behavior
    // to signal to Pub/Sub that the message is malformed and should be retried or dead-lettered.
    await expect(processUserActivityEvent(mockEvent, mockContext)).rejects.toThrow();
    
    // Verify an error was logged
    expect(jestConsole.error).toHaveBeenCalledWith('Error processing message:', expect.any(Error));

    // Verify nothing was saved to the database
    const Notification = mongoose.model('Notification');
    const count = await Notification.countDocuments();
    expect(count).toBe(0);
  });

  // Test 4: Handling of database connection failures
  it('should throw an error if the database connection fails', async () => {
    // Temporarily point to a non-existent database
    process.env.MONGODB_URI = 'mongodb://localhost:9999/unreachable';
    // We need to disconnect from the in-memory one for this test
    await mongoose.disconnect();

    const mockEvent = { data: Buffer.from(JSON.stringify({})).toString('base64') };
    const mockContext = { eventId: 'db-fail-event' };

    await expect(processUserActivityEvent(mockEvent, mockContext)).rejects.toThrow();

    // Verify the specific error was logged
    expect(jestConsole.error).toHaveBeenCalledWith('Database connection failed:', expect.any(Error));
    
    // Restore the correct URI for other tests
    process.env.MONGODB_URI = mongoUri;
  });

  // Test 5: General error is re-thrown to trigger Pub/Sub retry
  it('should re-throw any unexpected error during processing', async () => {
    const mockEvent = { data: Buffer.from(JSON.stringify({})).toString('base64') };
    const mockContext = { eventId: 'unexpected-error-event' };
    const errorMessage = 'Something broke!';

    // Mock the `save` method to throw a custom error
    const saveSpy = jest.spyOn(mongoose.Model.prototype, 'save').mockImplementationOnce(() => {
      throw new Error(errorMessage);
    });

    await expect(processUserActivityEvent(mockEvent, mockContext)).rejects.toThrow(errorMessage);
    
    // Verify the error was logged
    expect(jestConsole.error).toHaveBeenCalledWith('Error processing message:', expect.any(Error));

    saveSpy.mockRestore(); // Clean up the mock
  });
});
