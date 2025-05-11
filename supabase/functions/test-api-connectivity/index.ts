
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

  try {
    console.log("Testing API connectivity...");
    
    // Test Firecrawl connectivity
    const firecrawlTest = await testFirecrawlConnectivity();
    console.log("Firecrawl test result:", firecrawlTest);
    
    // Test OpenAI connectivity if present
    let openaiTest = { success: false, message: "OPENAI_API_KEY not configured" };
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (openaiApiKey) {
      try {
        console.log("Testing OpenAI API connectivity...");
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "Test" }],
            max_tokens: 5
          })
        });
        
        openaiTest = {
          success: openaiResponse.ok,
          message: openaiResponse.ok 
            ? "OpenAI API connection successful" 
            : `OpenAI API error: ${openaiResponse.status} ${openaiResponse.statusText}`,
          details: {
            status: openaiResponse.status,
            statusText: openaiResponse.statusText
          }
        };
        
        console.log("OpenAI test result:", openaiTest);
      } catch (error) {
        console.error("Error testing OpenAI API:", error);
        openaiTest = {
          success: false,
          message: `OpenAI connectivity error: ${error.message || error}`,
          details: {
            error: error.message || String(error)
          }
        };
      }
    }
    
    // Collect environment info
    const envInfo = {
      hasFirecrawlKey: !!Deno.env.get("FIRECRAWL_API_KEY"),
      hasOpenAIKey: !!Deno.env.get("OPENAI_API_KEY")
    };
    
    // Return test results
    return new Response(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        firecrawl: firecrawlTest,
        openai: openaiTest,
        environment: envInfo
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error("Error in API connectivity test:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || String(error), 
        stack: error.stack,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
