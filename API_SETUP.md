# OpenAI Content Integration Setup

This document explains how to set up the OpenAI API integration for fetching highly personalized menopause-related content in the MeNova application.

## Environment Variables

Create a `.env` file in the root directory with the following variable:

```
# OpenAI API Key (Required for content retrieval)
VITE_OPENAI_API_KEY="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"

# Supabase Configuration (Required for user accounts)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# NewsAPI Key (Secondary content source)
VITE_EXTERNAL_API_KEY=your_newsapi_key_here
```

## Setting Up OpenAI Integration

1. Go to [OpenAI Platform](https://platform.openai.com/) and create an account
2. Navigate to the API Keys section and create a new API key
3. Add your API key to the `.env` file as `VITE_OPENAI_API_KEY`
4. Restart your application

## How It Works

The application uses multiple content sources in this priority order:

1. **OpenAI API**: Fetches highly relevant menopause resources based on user symptoms
2. **NewsAPI**: Provides supplementary content from news sources about menopause and wellness
3. **Supabase Database**: Stores any previously saved content

Content is automatically refreshed each time the user visits the Resources page.

## Content Personalization

OpenAI provides the following advantages:

- **Highly relevant content**: Resources are specifically chosen for the user's symptoms
- **Quality filtering**: OpenAI selects authoritative health information
- **Dynamic discovery**: Content updates as new research and resources become available
- **Context understanding**: Better connections between symptoms and relevant content

## Real Content Only

The application now uses only real content from APIs:

- No mock data is used in the application
- If all API sources fail, you'll see an empty state with clear error messages
- The debug panel in development mode allows you to check API status and refresh content manually

## Troubleshooting

If you encounter issues with the OpenAI integration:

1. Check the browser console for error messages
2. Verify your API key is correct in the `.env` file 
3. Use the debug panel in development mode to view API status
4. Check if you have sufficient quota in your OpenAI account 