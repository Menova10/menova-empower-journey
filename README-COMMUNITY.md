# MeNova Community Page Setup

This guide explains how to set up and test the new MeNova Community page feature.

## Required Dependencies

Before implementing the Community page, make sure to install these dependencies:

```bash
npm install @supabase/supabase-js axios
```

These packages are required for the Supabase database connectivity and API requests.

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```
# Firecrawl API for community scraping
VITE_FIRECRAWL_API_KEY=your_firecrawl_api_key

# Supabase credentials
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# API proxy URL (default is /api/proxy)
VITE_API_PROXY_URL=/api/proxy
```

Replace the placeholders with your actual API keys.

## Local Development Setup

1. Install dependencies (as mentioned above)

2. Start the development server:
   ```
   npm run dev
   ```

3. The Community page will be available at: `/community`

## Testing Voice Interactions

The Community page integrates with your existing VapiAssistant component. When opened:

1. MeNova will speak an introduction about available communities
2. Users can respond with voice commands like "Explore Reddit" or "Notify me"
3. The conversation is displayed in the chat window
4. Email notifications are saved to Supabase

## CORS and API Proxy

The Firecrawl API calls might encounter CORS issues in browser environments. This implementation includes:

1. A proxy endpoint (`/api/proxy.js`) to route requests through your backend
2. Fallback descriptions if API calls fail
3. Static community data for Facebook and Peanut that don't rely on scraping

## Deployment in Lovable

1. Add environment variables in Lovable settings
2. Connect your GitHub repository
3. Deploy your project
4. Test on mobile devices to verify responsive design

## Background Design

The Community page features a gradient background using MeNova's brand colors:
- Dew Leaf (`#D2E3D3`) to Sage Green (`#A8C1A0`)
- This gradient provides a calming aesthetic while ensuring text remains readable
- If you prefer the original floral background, modify the CSS in the component

## Accessibility Features

The page includes:
- ARIA attributes for screen readers
- Responsive design for all screen sizes
- Keyboard navigation support
- Text alternatives for visual elements

## Troubleshooting

- If Firecrawl scraping fails, the page will still work with fallback descriptions
- If voice functionality doesn't work, users can still use text input
- For persistent issues, check browser console errors and API responses