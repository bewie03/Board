# OAuth Setup Guide for BoneBoard

This guide explains how to set up Twitter and Discord OAuth authentication for project verification in BoneBoard.

## Overview

The OAuth implementation allows users to verify their Twitter and Discord accounts when creating projects, preventing impersonation and scams. Users will be redirected to the actual Twitter/Discord login pages to authenticate.

## Setup Instructions

### 1. Twitter OAuth Setup

1. **Create a Twitter Developer Account**
   - Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
   - Apply for a developer account if you don't have one
   - Create a new project/app

2. **Configure OAuth Settings**
   - In your Twitter app settings, go to "Authentication settings"
   - Enable "OAuth 2.0" 
   - Set the callback URL to: `http://localhost:5173/auth/twitter/callback` (for development)
   - For production, use: `https://yourdomain.com/auth/twitter/callback`
   - Set the website URL to your domain
   - Enable "Request email address from users" if needed

3. **Get Your Credentials**
   - Copy your "Client ID" from the app dashboard
   - Add it to your `.env` file as `REACT_APP_TWITTER_CLIENT_ID`

### 2. Discord OAuth Setup

1. **Create a Discord Application**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application" and give it a name
   - Go to the "OAuth2" section

2. **Configure OAuth Settings**
   - Add redirect URI: `http://localhost:5173/auth/discord/callback` (for development)
   - For production, use: `https://yourdomain.com/auth/discord/callback`
   - Select scopes: `identify` (to get basic user info)

3. **Get Your Credentials**
   - Copy your "Client ID" from the OAuth2 section
   - Add it to your `.env` file as `REACT_APP_DISCORD_CLIENT_ID`

### 3. Environment Configuration

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Update your `.env` file with your OAuth credentials:**
   ```env
   # OAuth Configuration
   REACT_APP_TWITTER_CLIENT_ID=your_actual_twitter_client_id
   REACT_APP_DISCORD_CLIENT_ID=your_actual_discord_client_id
   ```

## How It Works

### Authentication Flow

1. **User clicks "Connect with Twitter/Discord"**
   - A popup window opens with the OAuth provider's login page
   - User logs in with their actual Twitter/Discord credentials

2. **OAuth Provider Redirects**
   - After successful login, the provider redirects to our callback URL
   - The callback page extracts the authorization code and user info

3. **Verification Complete**
   - The popup sends the user data back to the parent window
   - The user's account is now verified and displayed in the form

### Security Features

- **State Parameter**: Prevents CSRF attacks by verifying the OAuth state
- **Popup Window**: Keeps the main application secure and provides better UX
- **Origin Verification**: Only accepts messages from the same origin
- **Session Storage**: Temporarily stores OAuth state for verification

## Testing

### Development Testing

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to Create Project page:**
   - Go to `http://localhost:5173/create-project`
   - Try clicking the "Connect with Twitter" or "Connect with Discord" buttons

3. **Expected Behavior:**
   - Without OAuth credentials: Will show popup blocked error or redirect to placeholder URLs
   - With OAuth credentials: Will open actual Twitter/Discord login pages

### Production Considerations

1. **Update Redirect URIs**: Change callback URLs to your production domain
2. **HTTPS Required**: OAuth providers require HTTPS in production
3. **Backend Integration**: Consider implementing a backend service to handle token exchange
4. **Token Storage**: Implement secure token storage for persistent authentication

## Troubleshooting

### Common Issues

1. **Popup Blocked**
   - Ensure popups are allowed for your domain
   - Some browsers block popups by default

2. **Invalid Redirect URI**
   - Ensure the redirect URI in your OAuth app matches exactly
   - Include the protocol (http/https) and port number

3. **CORS Issues**
   - OAuth providers handle CORS automatically
   - Ensure your callback pages are accessible

4. **State Mismatch**
   - Clear browser storage if you encounter state verification errors
   - Ensure sessionStorage is working properly

### Debug Mode

The implementation includes console logging for debugging. Check the browser console for detailed error messages during OAuth flows.

## Future Enhancements

1. **Backend Token Exchange**: Implement server-side token handling for better security
2. **Refresh Tokens**: Add support for token refresh to maintain long-term authentication
3. **Additional Providers**: Add support for GitHub, LinkedIn, or other platforms
4. **Account Linking**: Allow users to link multiple social accounts
5. **Verification Badges**: Display verification status throughout the application
