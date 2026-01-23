# 1. Set your project ID
export GCP_PROJECT_ID="your-project-id"
export TOPIC_NAME="user-activity-events"
export REGION="us-central1"

# 2. Create the Pub/Sub Topic
echo "Creating Pub/Sub Topic..."
gcloud pubsub topics create $TOPIC_NAME --project=$GCP_PROJECT_ID

# 3. Deploy the Cloud Function
# Note: We pass the MongoDB URI as an environment variable.
echo "Deploying Cloud Function..."
gcloud functions deploy processUserActivityEvent \
  --gen2 \
  --runtime=nodejs20 \
  --region=$REGION \
  --source=./cloud-function-processor \
  --entry-point=processUserActivityEvent \
  --trigger-topic=$TOPIC_NAME \
  --set-env-vars MONGODB_URI="mongodb+srv://<user>:<pass>@cluster.mongodb.net/notifications" \
  --allow-unauthenticated