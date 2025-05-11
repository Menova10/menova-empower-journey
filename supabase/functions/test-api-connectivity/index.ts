
// API connectivity testing edge function
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { testFirecrawlConnectivity } from "../_shared/firecrawl.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Test OpenAI API connectivity
async function testOpenAIConnectivity(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openAIApiKey) {
      return {
        success: false,
        message: "OPENAI_API_KEY not found in environment variables"
      };
    }
    
    console.log("Testing OpenAI API connectivity");
    
    // Make a simple request to the OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Test message, please respond with a short greeting." }
        ],
        max_tokens: 20
      })
    });
    
    const data = response.ok ? await response.json() : null;
    
    return {
      success: response.ok,
      message: response.ok ? "OpenAI API connection successful" : `OpenAI API error: ${response.status} ${response.statusText}`,
      details: {
        status: response.status,
        statusText: response.statusText,
        responseData: data
      }
    };
  } catch (error) {
    console.error("Error testing OpenAI connectivity:", error);
    return {
      success: false,
      message: `OpenAI connectivity test error: ${error.message || error}`,
      details: {
        error: error.message || String(error),
        stack: error.stack
      }
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get current timestamp
    const timestamp = new Date().toISOString();
    
    // Test both APIs
    const [firecrawlResult, openaiResult] = await Promise.all([
      testFirecrawlConnectivity(),
      testOpenAIConnectivity()
    ]);
    
    // Get environment information for debugging
    const envInfo = {
      hasFirecrawlKey: Boolean(Deno.env.get("FIRECRAWL_API_KEY")),
      firecrawlKeyFirstChars: Deno.env.get("FIRECRAWL_API_KEY") ? 
        `${Deno.env.get("FIRECRAWL_API_KEY")?.substring(0, 3)}...` : 
        "missing",
      hasOpenAIKey: Boolean(Deno.env.get("OPENAI_API_KEY")),
      timestamp: timestamp,
      deployEnvironment: Deno.env.get("DEPLOY_ENV") || "unknown"
    };
    
    // Combined results
    const results = {
      timestamp,
      firecrawl: firecrawlResult,
      openai: openaiResult,
      environment: envInfo
    };

    return new Response(
      JSON.stringify(results),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
        } 
      }
    );
  } catch (error) {
    console.error('Error in API connectivity test:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to test API connectivity',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
