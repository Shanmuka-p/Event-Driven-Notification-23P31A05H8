# Event-Driven Notification Service

This project implements a robust, scalable, event-driven notification service using Google Cloud Pub/Sub and Google Cloud Functions. It demonstrates a decoupled, asynchronous architecture suitable for handling user activity events and triggering downstream actions like notifications.

##  архитектура

The system consists of two core services:

1.  **`api-publisher`**: A Node.js (Express) microservice responsible for receiving user activity events via a REST API. It validates the incoming data, and upon success, publishes it as a message to a Google Cloud Pub/Sub topic.

2.  **`cloud-function-processor`**: A Google Cloud Function that is triggered by new messages on the Pub/Sub topic. It consumes the event message, simulates sending a notification (e.g., a push notification), and persists a record of the event to a MongoDB database for audit and idempotency purposes.

### Core Technologies

*   **API**: Node.js with Express
*   **Asynchronous Messaging**: Google Cloud Pub/Sub
*   **Serverless Processing**: Google Cloud Functions
*   **Database**: MongoDB
*   **Containerization**: Docker & Docker Compose
*   **Testing**: Jest

### Architectural Flow



## Local Development Setup



The entire stack can be run locally using Docker Compose, which simulates the cloud environment.



**Prerequisites:**

*   Docker and Docker Compose installed.



**Steps:**



1.  **Clone the repository.**



2.  **Configure Environment Variables:**



    Create a `.env` file inside the `api-publisher` directory. You can copy the example file:

    ```sh

    cp api-publisher/.env.example api-publisher/.env

    ```

    This file configures the API to connect to the local Pub/Sub emulator.



3.  **Run the Stack:**

    ```sh

    docker-compose up --build

    ```

    This command will:

    *   Build the `api-publisher` Docker image.

    *   Start the `api-publisher` service.

    *   Start a Google Cloud Pub/Sub emulator.

    *   Start a MongoDB database instance.



4.  **Verify Services:**

    *   **API Healthcheck:** Open `http://localhost:3000/health` in your browser or via curl. You should receive an `OK` response.

    *   **Logs:** View the logs from all services using `docker-compose logs -f`.



## Google Cloud (GCP) Deployment



**Prerequisites:**

*   Google Cloud SDK (`gcloud`) installed and authenticated.

*   A GCP project with the Pub/Sub and Cloud Functions APIs enabled.

*   A MongoDB instance (e.g., on MongoDB Atlas) and its connection URI.



### 1. Deploy the Cloud Function (`cloud-function-processor`)



The `deploy.sh` script handles the deployment of the Cloud Function.



**Steps:**



1.  **Set Environment Variables:**

    The script requires the following environment variables to be set in your shell:

    *   `GCP_PROJECT_ID`: Your Google Cloud project ID.

    *   `GCP_REGION`: The region to deploy to (e.g., `us-central1`).

    *   `PUBSUB_TOPIC`: The name of the Pub/Sub topic (e.g., `user-activity-events`).

    *   `MONGODB_URI`: The connection string for your production MongoDB database.



2.  **Create the Pub/Sub Topic:**

    If the topic doesn't exist, create it:

    ```sh

    gcloud pubsub topics create $PUBSUB_TOPIC

    ```



3.  **Run the Deployment Script:**

    From the root of the project, execute the script:

    ```sh

    bash deploy.sh

    ```

    This will deploy the function, linking it to the specified Pub/Sub topic and setting the necessary environment variables.



### 2. Deploy the API Publisher (`api-publisher`)



The `api-publisher` is a standard Node.js application and can be deployed to any container-hosting service like Google Cloud Run, GKE, or App Engine.



**Example using Cloud Run:**



1.  **Build and Push the Docker Image:**

    ```sh

    # Make sure to replace {GCP_PROJECT_ID}

    gcloud builds submit --tag gcr.io/{GCP_PROJECT_ID}/api-publisher ./api-publisher

    ```



2.  **Deploy to Cloud Run:**

    ```sh

    # Make sure to replace {GCP_PROJECT_ID}, {PUBSUB_TOPIC}, and {GCP_REGION}

    gcloud run deploy api-publisher \

      --image gcr.io/{GCP_PROJECT_ID}/api-publisher \

      --platform managed \

      --region {GCP_REGION} \

      --set-env-vars="GCP_PROJECT_ID={GCP_PROJECT_ID}" \

      --set-env-vars="PUBSUB_TOPIC={PUBSUB_TOPIC}" \

      --allow-unauthenticated

    ```



## API Usage



### Health Check



*   **Endpoint:** `GET /health`

*   **Description:** Verifies that the API service is running.

*   **Success Response (200 OK):**

    ```

    OK

    ```



### Publish an Event



*   **Endpoint:** `POST /api/events/activity`

*   **Description:** Validates and publishes a user activity event.

*   **Request Body (JSON):**

    ```json

    {

      "userId": "usr_12345",

      "eventType": "video_view",

      "payload": {

        "videoId": "vid_67890",

        "duration": 120,

        "source": "web"

      }

    }

    ```

*   **Success Response (202 Accepted):**

    The API returns a `202 Accepted` to indicate that the event has been successfully received and queued for processing, but not yet processed.

    ```json

    {

      "status": "success",

      "message": "Event received and published successfully."

    }

    ```

*   **Error Response (400 Bad Request):**

    If validation fails (e.g., missing fields).

    ```json

    {

      "status": "error",

      "message": "Validation failed: \"userId\" is required"

    }

    ```



## Database Schema



The `cloud-function-processor` saves notification records to a MongoDB collection named `notifications`.



*   **`eventId`** (String, Required, Unique): The unique ID from the Pub/Sub message. This is the key for ensuring idempotency.

*   **`userId`** (String): The ID of the user associated with the event.

*   **`eventType`** (String): The type of event (e.g., `signup`, `login`).

*   **`payload`** (Object): The original, unaltered payload from the event.

*   **`timestamp`** (Date): The timestamp from the event payload, or when it was processed.

*   **`status`** (String): The processing status (e.g., `processed`, `failed`).

*   **`message`** (String): A log message from the simulation.

*   **`processedAt`** (Date): The timestamp of when the record was saved.



## Testing



Both services include a suite of automated tests using Jest.



**To run tests for the `api-publisher`:**

```sh

cd api-publisher

npm install

npm test

```



**To run tests for the `cloud-function-processor`:**

```sh

cd cloud-function-processor

npm install

npm test

```

## ✅ Verification Logs
The following logs demonstrate successful local execution using Docker Compose and the Pub/Sub Emulator, confirming the system works as expected.

**1. API Publisher (Self-Healing Topic Creation & Publishing):**
> [DEBUG] Topic "user-activity-events" not found. Creating it now...
> [DEBUG] Topic "user-activity-events" created successfully.
> Message 1 published to topic user-activity-events

**2. Cloud Function (Local Integration Test):**
> --- Starting Local Test ---
> Simulating push notification for user [test_user]...
> --- Verification: Record found in MongoDB! ---
> {
>   eventId: 'unique-event-id-1769189946258',
>   userId: 'test_user',
>   eventType: 'signup',
>   payload: { source: 'web' },
>   status: 'processed',
>   message: 'Simulating push notification for user [test_user] about event [signup]'
> }

