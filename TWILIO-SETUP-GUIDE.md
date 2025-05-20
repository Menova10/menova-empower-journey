# Twilio Free Tier Setup Guide for MeNova

This guide will help you set up Twilio's free tier to enable WhatsApp notifications in your MeNova application.

## Step 1: Create a Twilio Account

1. Go to [Twilio's website](https://www.twilio.com/) and sign up for a free account
2. Complete the verification process (email and phone verification)
3. You'll receive free trial credit (typically $15-20) to test the services

## Step 2: Set Up WhatsApp Sandbox

1. In your Twilio dashboard, navigate to **Messaging** > **Try it Out** > **Send a WhatsApp Message**
2. You'll see instructions to join your WhatsApp sandbox:
   - Send a WhatsApp message to the provided Twilio number (typically +14155238886)
   - Use the given join code (e.g., "join example-word")
3. After sending this message, your phone will be connected to the sandbox

## Step 3: Get Your Twilio Credentials

From your Twilio dashboard, collect the following:
- **Account SID**: Found on the dashboard main page
- **Auth Token**: Click on "Show" to reveal it
- **WhatsApp Number**: The sandbox number provided (typically +14155238886)

## Step 4: Update Your Environment Variables

Add these variables to your project's `.env` file:

```
# Twilio credentials for WhatsApp
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=+14155238886
```

Replace the placeholder values with your actual credentials.

## Step 5: Restart Your Server

After updating your environment variables, restart your development server:

```
npm run dev
```

## Step 6: Test Your WhatsApp Integration

1. Log into your MeNova app
2. Ensure your phone number is added to your profile (in international format, e.g., +1234567890)
3. Navigate to the Notifications section
4. Subscribe to notifications
5. Click "Test WhatsApp Notification"
6. You should receive a WhatsApp message on your phone

## Limitations of Twilio's Free Tier

1. **Limited credit**: The free trial comes with limited credit (typically $15-20)
2. **Sandbox restrictions**: 
   - You can only send messages to verified numbers (ones that have joined your sandbox)
   - Template messages only (pre-approved formats)
   - The WhatsApp number will be shared (Twilio's sandbox number)

## Transitioning to Production

When you're ready to move beyond testing:
1. Apply for a WhatsApp Business Profile through Twilio
2. Get your own dedicated WhatsApp number
3. Create message templates for approval
4. Set up billing information

## Troubleshooting

- **Message not received**: Ensure you've completed the sandbox join process
- **Error 21608**: This means the recipient hasn't joined your sandbox
- **Error 63032**: Rate limit exceeded - wait 24 hours and try again
- **Invalid phone format**: Ensure all phone numbers use international format (e.g., +1234567890)

For more assistance, check Twilio's [WhatsApp API documentation](https://www.twilio.com/docs/whatsapp/api). 