# Secure API Key Setup

## IMPORTANT: API Key Security Notice

API keys should **never** be:
- Shared in messages or chat
- Committed to your Git repository 
- Exposed in client-side code
- Included in screenshots or logs

## Proper API Key Setup

1. Create a `.env` file in your project root (this file should be listed in `.gitignore`)
2. Add your OpenAI API key:
   ```
   VITE_OPENAI_API_KEY="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""
   ```
3. Restart your development server after adding the key

## Getting a New OpenAI API Key

If you need to revoke a potentially exposed key:

1. Go to the [OpenAI API Dashboard](https://platform.openai.com/api-keys)
2. Click "Revoke" next to the exposed key
3. Create a new API key by clicking "Create new secret key"
4. Give it a descriptive name like "MeNova App"
5. Copy the new key immediately (you won't be able to see it again)
6. Paste it in your `.env` file

## Checking Your API Key Setup

In the Resources section of the MeNova app:

1. Use the "Test API Connection" button to verify your API key is working
2. If successful, use "Load Content Now" to fetch real-time content
3. If you see an error, check the developer console for detailed messages

## Environment Variables Used in This App

```
# Required
VITE_OPENAI_API_KEY=your_openai_api_key_here

# Optional
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_EXTERNAL_API_KEY=your_newsapi_key_here
``` 