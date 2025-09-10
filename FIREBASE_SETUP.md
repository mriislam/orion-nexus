# Firebase Analytics Setup Guide

This guide will help you configure Firebase Analytics with Google Service Account authentication to fetch real data from your Firebase project.

## Prerequisites

- A Firebase project with Analytics enabled
- Google Cloud Console access
- Admin access to your Firebase project

## Step 1: Create a Google Service Account

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project (or the associated Google Cloud project)
3. Navigate to **IAM & Admin** > **Service Accounts**
4. Click **Create Service Account**
5. Fill in the service account details:
   - **Name**: `firebase-analytics-service`
   - **Description**: `Service account for Firebase Analytics data access`
6. Click **Create and Continue**

## Step 2: Assign Required Roles

Assign the following roles to your service account:

- **Firebase Analytics Viewer** (`roles/firebase.analyticsViewer`)
- **Google Analytics Viewer** (`roles/analytics.viewer`)
- **Firebase Admin** (`roles/firebase.admin`) - Optional, for broader access

1. In the **Grant this service account access to project** section
2. Add each role listed above
3. Click **Continue** and then **Done**

## Step 3: Generate Service Account Key

1. Find your newly created service account in the list
2. Click on the service account email
3. Go to the **Keys** tab
4. Click **Add Key** > **Create new key**
5. Select **JSON** format
6. Click **Create**
7. Save the downloaded JSON file securely (e.g., `firebase-service-account.json`)

## Step 4: Get Your Firebase Project Information

### Firebase Project ID
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon > **Project settings**
4. Copy the **Project ID**

### Google Analytics 4 Property ID
1. In Firebase Console, go to **Analytics** > **Events**
2. Look for the GA4 property ID in the URL or settings
3. Alternatively, go to [Google Analytics](https://analytics.google.com/)
4. Select your property
5. Go to **Admin** > **Property Settings**
6. Copy the **Property ID** (format: `123456789`)

## Step 5: Configure Environment Variables

Create or update your `.env` file in the backend directory with the following variables:

```bash
# Firebase Configuration
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/firebase-service-account.json
FIREBASE_PROJECT_ID=your-firebase-project-id
GA4_PROPERTY_ID=123456789
```

### Example `.env` file:
```bash
# Firebase Configuration
GOOGLE_APPLICATION_CREDENTIALS=/Users/username/monitoring-portal/backend/config/firebase-service-account.json
FIREBASE_PROJECT_ID=my-awesome-app-12345
GA4_PROPERTY_ID=987654321

# Other existing environment variables...
MONGO_URL=mongodb://localhost:27017/monitoring_portal
# ... rest of your config
```

## Step 6: Place Service Account File

1. Create a `config` directory in your backend folder (if it doesn't exist):
   ```bash
   mkdir -p backend/config
   ```

2. Copy your service account JSON file to this directory:
   ```bash
   cp /path/to/downloaded/firebase-service-account.json backend/config/
   ```

3. Update the `GOOGLE_APPLICATION_CREDENTIALS` path in your `.env` file to match the new location

## Step 7: Verify Configuration

1. Restart your backend server:
   ```bash
   cd backend
   python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. Check the Firebase Analytics configuration endpoint:
   ```bash
   curl http://localhost:8000/api/v1/firebase-analytics/config
   ```

3. Test the connection status:
   ```bash
   curl http://localhost:8000/api/v1/firebase-analytics/status
   ```

4. Fetch sample analytics data:
   ```bash
   curl http://localhost:8000/api/v1/firebase-analytics/overview
   ```

## Step 8: Frontend Verification

1. Navigate to the Firebase Analytics page in your frontend application:
   ```
   http://localhost:3000/firebase-analytics
   ```

2. Check the connection status indicator:
   - **Green dot**: Successfully connected to Firebase Analytics
   - **Yellow dot**: Using mock data (configuration issue)

3. Click the **Refresh Data** button to fetch the latest analytics

## Troubleshooting

### Common Issues

#### 1. "Service account file not found"
- Verify the `GOOGLE_APPLICATION_CREDENTIALS` path is correct
- Ensure the file exists and is readable
- Check file permissions

#### 2. "Permission denied" errors
- Verify the service account has the required roles
- Check that the Firebase project ID is correct
- Ensure the GA4 property ID is valid

#### 3. "Property not found" errors
- Verify the GA4_PROPERTY_ID is correct
- Ensure the property is linked to your Firebase project
- Check that Analytics is enabled in your Firebase project

#### 4. "No data available"
- Ensure your app is sending analytics events
- Check that the date range has data
- Verify Analytics is properly configured in your app

### Debug Commands

```bash
# Check if environment variables are loaded
curl http://localhost:8000/api/v1/firebase-analytics/config

# Test connection
curl http://localhost:8000/api/v1/firebase-analytics/status

# Attempt reconnection
curl -X POST http://localhost:8000/api/v1/firebase-analytics/reconnect
```

### Log Files

Check the backend logs for detailed error messages:
```bash
# In your backend terminal, look for Firebase-related log messages
# Errors will be logged with details about what went wrong
```

## Security Best Practices

1. **Never commit service account files to version control**
   - Add `*.json` to your `.gitignore`
   - Add `config/` directory to `.gitignore`

2. **Restrict service account permissions**
   - Only grant the minimum required roles
   - Regularly review and rotate service account keys

3. **Secure file permissions**
   ```bash
   chmod 600 backend/config/firebase-service-account.json
   ```

4. **Use environment-specific configurations**
   - Different service accounts for development/staging/production
   - Separate Firebase projects for different environments

## API Endpoints

Once configured, the following endpoints will be available:

- `GET /api/v1/firebase-analytics/status` - Connection status
- `GET /api/v1/firebase-analytics/overview` - Overview metrics
- `GET /api/v1/firebase-analytics/top-pages` - Top pages by views
- `GET /api/v1/firebase-analytics/demographics` - User demographics
- `GET /api/v1/firebase-analytics/metrics` - All metrics combined
- `GET /api/v1/firebase-analytics/config` - Configuration status
- `POST /api/v1/firebase-analytics/reconnect` - Reconnect to Firebase

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all environment variables are set correctly
3. Ensure your Firebase project has Analytics enabled
4. Check the backend logs for detailed error messages
5. Test the API endpoints directly using curl or Postman

For additional help, refer to:
- [Firebase Documentation](https://firebase.google.com/docs/analytics)
- [Google Analytics Data API Documentation](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [Google Cloud Service Accounts Documentation](https://cloud.google.com/iam/docs/service-accounts)