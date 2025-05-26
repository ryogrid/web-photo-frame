# OneDrive Integration Setup Guide

This guide will help you set up OneDrive integration for the Web Photo Frame application.

## Prerequisites

1. An Azure account (free tier is sufficient)
2. Microsoft OneDrive account
3. The Web Photo Frame application

## Step 1: Create an Azure App Registration

1. Go to the [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Fill in the registration details:
   - **Name**: `Web Photo Frame OneDrive Integration`
   - **Supported account types**: Select "Accounts in any organizational directory and personal Microsoft accounts (e.g. Skype, Xbox)"
   - **Redirect URI**: Select "Single-page application (SPA)" and enter:
     - For development: `http://localhost:5173`
     - For production: `https://your-domain.com` (replace with your actual domain)

5. Click **Register**

## Step 2: Configure API Permissions

1. In your newly created app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add the following permissions:
   - `Files.Read`
   - `Files.Read.All`
   - `User.Read`
6. Click **Add permissions**
7. Click **Grant admin consent for [Your Directory]** (if you're an admin) or ask an admin to do this

## Step 3: Get Your Client ID

1. In your app registration, go to **Overview**
2. Copy the **Application (client) ID**
3. This will be your `VITE_AZURE_CLIENT_ID`

## Step 4: Configure Environment Variables

1. In your Web Photo Frame project root, create a `.env` file (or rename `.env.example`)
2. Add your Azure client ID:

```env
VITE_AZURE_CLIENT_ID=your-application-client-id-here
```

Replace `your-application-client-id-here` with the actual client ID from Step 3.

## Step 5: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open the application in your browser
3. Click **Connect OneDrive** button
4. Sign in with your Microsoft account
5. Grant the requested permissions
6. Browse and select folders from your OneDrive

## Features

### Authentication
- OAuth 2.0 authentication with Microsoft
- Secure token handling with MSAL (Microsoft Authentication Library)
- Automatic token refresh

### Folder Selection
- Browse OneDrive folder structure
- Navigate through subfolders
- Select any folder containing images
- View folder contents and image count

### Image Loading
- Automatic image filtering (supports: .jpg, .jpeg, .png, .gif, .bmp, .webp)
- Thumbnail generation via Microsoft Graph API
- Direct image streaming from OneDrive
- Seamless integration with existing slideshow features

### Session Management
- Images persist during browser session
- Easy switching between OneDrive and local images
- User information display
- One-click logout

## Usage

1. **Connect to OneDrive**: Click the "Connect OneDrive" button and sign in
2. **Browse Folders**: Use the "Browse OneDrive" button to explore your folders
3. **Select Images**: Choose a folder containing images
4. **View Images**: Images will load into the photo frame slideshow
5. **Switch Sources**: Use "Switch to Local Images" to return to local photo sets

## Troubleshooting

### "Authentication Failed"
- Check that your Azure client ID is correct
- Verify that the redirect URI matches your current domain
- Ensure API permissions are properly granted

### "No Images Found"
- Make sure the selected folder contains supported image formats
- Check that you have read permissions for the folder
- Try selecting a different folder

### "Failed to Load Images"
- Check your internet connection
- Verify that your Microsoft account has access to OneDrive
- Try refreshing the page and reconnecting

## Security Notes

- The application only requests read permissions for your files
- No images are stored locally on the server
- Authentication tokens are managed securely by MSAL
- All communication with Microsoft Graph API is encrypted

## Production Deployment

When deploying to production:

1. Update your Azure app registration redirect URI to match your production domain
2. Set the `VITE_AZURE_CLIENT_ID` environment variable in your production environment
3. Ensure HTTPS is enabled for your production domain (required by Microsoft)

## Support

For issues related to:
- Azure setup: Check [Microsoft Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- OneDrive API: See [Microsoft Graph Documentation](https://docs.microsoft.com/en-us/graph/api/resources/onedrive)
- Application issues: Check the browser console for error messages
