# MeNova Notification System Setup Guide

This guide will help you set up web push notifications and WhatsApp notifications for your MeNova application.

## Prerequisites

- Node.js (v14+) and npm installed
- Supabase account and project set up
- Twilio account for WhatsApp notifications

## Setup Steps

### 1. Generate VAPID Keys

VAPID keys are used to authenticate your server with push notification services.

```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys
```

This will output a public key and a private key. Save these for the next steps.

### 2. Set Up Environment Variables

Copy the `env.example` file to a new file named `.env`:

```bash
cp env.example .env
```

Fill in the values in `.env`:

```bash
# Supabase details from your Supabase dashboard
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# VAPID keys from the previous step
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key
WEB_PUSH_CONTACT=mailto:your-email@example.com

# Twilio credentials from your Twilio dashboard
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_NUMBER=your-twilio-whatsapp-number
```

### 3. Create Database Tables

Execute the Supabase migration to create the required tables:

```bash
# Using Supabase CLI
supabase migration up

# OR manually run the SQL from the migration file in the Supabase SQL Editor
```

### 4. Install Dependencies

Install the required npm packages:

```bash
# Server dependencies
npm install express cors web-push @supabase/supabase-js twilio dotenv

# For production
npm install -D nodemon
```

### 5. Add Notification Component to Your App

Add the `NotificationComponent` to a suitable page in your app:

```jsx
import NotificationComponent from '@/components/Notification';

// Within your component's render method
<NotificationComponent />
```

### 6. Add Check-In Notification Trigger to Your Form

Add the `CheckInNotificationTrigger` component to your symptom check-in form:

```jsx
import CheckInNotificationTrigger from '@/components/CheckInNotificationTrigger';

// Within your form component
const [submitted, setSubmitted] = useState(false);
const [symptoms, setSymptoms] = useState([]);

// Form submission handler
const handleSubmit = (e) => {
  e.preventDefault();
  // Your form submission logic here
  
  // Set submitted to true after successful submission
  setSubmitted(true);
};

// Include the notification trigger component
<CheckInNotificationTrigger submitted={submitted} symptoms={symptoms} />
```

### 7. Start the Server

Start the Express server for handling notifications:

```bash
# Development mode
node server.js

# OR with nodemon
nodemon server.js
```

### 8. Enable HTTPS for Local Testing

Web Push notifications require HTTPS. For local development, you can:

1. Use a service like ngrok to expose your localhost over HTTPS:
   ```bash
   ngrok http 3000
   ```

2. Use a local certificate with a tool like mkcert:
   ```bash
   mkcert -install
   mkcert localhost
   ```

### 9. Deploy to Production

For production deployment on Vercel:

1. Add all the environment variables to your Vercel project
2. Deploy your frontend React app to Vercel
3. Deploy the Express server to a service like Railway, Render, or Heroku

## Populating with Demo Data

To pre-populate your Supabase database with demo data:

```sql
-- Sample symptoms for demo users
INSERT INTO public.symptoms (user_id, symptom, created_at)
VALUES 
  ('your-user-id', 'hot flashes', NOW() - interval '1 day'),
  ('your-user-id', 'mood swings', NOW() - interval '2 days'),
  ('your-user-id', 'insomnia', NOW() - interval '3 days');

-- Make sure to add a phone number to your profile
UPDATE public.profiles
SET phone = '+1234567890'
WHERE id = 'your-user-id';
```

## Testing Notifications

1. Subscribe to notifications using the Subscribe button in the UI
2. Use the "Test Browser Notification" button to test web push notifications
3. Use the "Test WhatsApp Notification" button to test WhatsApp messages
4. Submit a check-in form to test the automatic notification workflow

## Troubleshooting

- **Push notifications not working**: Check if your browser supports Push API and if you've granted notification permissions
- **WhatsApp messages not sending**: Verify your Twilio sandbox setup and that your test number is registered
- **Service worker not registering**: Make sure sw.js is in the public directory and the path is correct
- **CORS errors**: Verify your CORS configuration in the Express server

## Additional Resources

- [Web Push Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Twilio WhatsApp API](https://www.twilio.com/docs/whatsapp/api)
- [Supabase Documentation](https://supabase.io/docs) 