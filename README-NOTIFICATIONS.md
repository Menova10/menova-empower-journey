# MeNova Notifications Implementation

This document provides an overview of the notification system in MeNova, focusing on both Web Push and WhatsApp notifications.

## Overview

MeNova supports two types of notifications:
1. **Browser Push Notifications** - Delivered through the web browser when the user is not actively using the app
2. **WhatsApp Notifications** - Sent via WhatsApp to provide check-in reminders and follow-ups

## Prerequisites

### For Web Push Notifications:
- VAPID public and private keys (set in your environment variables)
- A service worker (`public/sw.js`)
- User permission in the browser

### For WhatsApp Notifications:
- Twilio account with WhatsApp integration
- Environment variables for Twilio credentials
- User's phone number (stored in the profile)

## Phone Number Collection

Phone numbers are collected through the Profile page, where users can add and update their phone number. The phone number must include the international country code (e.g., +1 for US).

### Phone Number Reminders

The app includes reminders to encourage users to add their phone number:

1. **Phone Number Reminder Component** - Shown on the dashboard for users who haven't added a phone number
2. **Interactive Prompts** - When trying to test WhatsApp notifications without a phone number, users are prompted to add one

## Database Structure

### In PostgreSQL (Supabase):

1. **profiles table**:
   - `phone` column (text) - Stores the user's phone number in international format

2. **subscriptions table**:
   - `user_id` (uuid) - User identifier  
   - `subscription` (jsonb) - Web Push subscription data
   - `created_at` (timestamptz) - When the subscription was created
   - `updated_at` (timestamptz) - When the subscription was last updated

## Components

### 1. Frontend Components

- **Notification.js** - Main component for handling web push notification subscriptions and WhatsApp integration
- **PhoneNumberReminder.js** - Alert component to remind users to add their phone number
- **CheckInNotificationTrigger.js** - Component that triggers notifications after check-ins

### 2. Backend Components

- **server.js** - Express server that handles notifications
- **API Routes**:
  - `/api/save-subscription` - Saves web push subscriptions
  - `/api/delete-subscription` - Deletes web push subscriptions
  - `/api/send-test-notification` - Sends a test web push notification
  - `/api/send-whatsapp` - Sends a WhatsApp notification
  - `/api/check-in-webhook` - Processes check-in events and schedules follow-up notifications

## Implementation Details

### Phone Number Format

Phone numbers must be in international format (starting with +) for WhatsApp functionality to work. The UI provides guidance and validation to ensure correct formatting.

### Testing Notifications

Users can test both types of notifications:
1. Web Push - Sends an immediate test notification
2. WhatsApp - Sends a test message to the user's registered WhatsApp number

### Security

- RLS (Row Level Security) ensures users can only access their own subscriptions
- Phone numbers are only visible to the user and authenticated server endpoints

## Troubleshooting

Common issues:
- Missing phone number - Users are prompted to add one in profile
- Incorrect phone format - Must include country code with + prefix
- Notification permissions - Browser must allow notifications
- Service worker registration - Check browser console for errors

## Development & Testing

For local development and testing:
1. The server includes fallback VAPID keys for testing
2. A mock Twilio client works without real credentials
3. Console logs show what would have been sent in production 