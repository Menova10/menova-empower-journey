
// Supabase Edge Function to set the Firecrawl API key in the function secrets
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { testFirecrawlConnectivity } from "../_shared/firecrawl.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      error: 'Method not allowed' 
    }), { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { apiKey } = await req.json();
    
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
      return new Response(JSON.stringify({ 
        success: false,
        message: 'Invalid API key format' 
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log("Received request to set Firecrawl API key");
    
    // Set the API key in the environment (temporary for this execution)
    Deno.env.set("FIRECRAWL_API_KEY", apiKey);
    
    // Test connectivity with the provided key
    const testResult = await testFirecrawlConnectivity();
    
    if (!testResult.success) {
      console.log("API key validation failed:", testResult.message);
      return new Response(JSON.stringify({ 
        success: false,
        message: 'API key validation failed. Please check that the key is correct.',
        details: testResult
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // The API key is valid, but we can't set secrets directly from edge functions
    return new Response(JSON.stringify({ 
      success: true,
      message: 'API key validated successfully. Please add it to your Supabase Edge Function secrets.',
      details: {
        testResult,
        instructions: "Set this key in your Supabase dashboard under Settings > API > Edge Function Secrets with the key 'FIRECRAWL_API_KEY'"
      }
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ 
      success: false,
      message: 'Error processing request',
      error: error.message || String(error)
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
