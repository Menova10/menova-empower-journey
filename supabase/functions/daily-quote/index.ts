import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Zenquotes API endpoint
const ZENQUOTES_API = "https://zenquotes.io/api/today";

// Cache variables
let cachedQuote = null;
let cacheTimestamp = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Check if cache is valid
function isCacheValid() {
  return (
    cachedQuote &&
    cacheTimestamp &&
    Date.now() - cacheTimestamp < CACHE_TTL
  );
}

// Fetch quote from database or API
async function getQuote() {
  try {
    // Check if we have a cached quote in memory
    if (isCacheValid()) {
      console.log("Serving quote from memory cache");
      return cachedQuote;
    }

    // Try to get quote from database
    const { data: dbQuote, error: dbError } = await supabase
      .from("daily_quotes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // If we have a recent quote in the database, use it
    if (dbQuote && Date.now() - new Date(dbQuote.created_at).getTime() < CACHE_TTL) {
      console.log("Serving quote from database");
      cachedQuote = { q: dbQuote.quote, a: dbQuote.author };
      cacheTimestamp = new Date(dbQuote.created_at).getTime();
      return cachedQuote;
    }

    // Otherwise fetch from API
    console.log("Fetching new quote from ZenQuotes API");
    const response = await fetch(ZENQUOTES_API);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Invalid response from ZenQuotes API");
    }
    
    // Cache the quote
    cachedQuote = data[0];
    cacheTimestamp = Date.now();
    
    // Store in database
    await supabase.from("daily_quotes").insert({
      quote: cachedQuote.q,
      author: cachedQuote.a,
      created_at: new Date().toISOString()
    });
    
    return cachedQuote;
  } catch (error) {
    console.error("Error fetching quote:", error);
    
    // Try to get any quote from database as fallback
    try {
      const { data: fallbackQuote } = await supabase
        .from("daily_quotes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
        
      if (fallbackQuote) {
        return { q: fallbackQuote.quote, a: fallbackQuote.author };
      }
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError);
    }
    
    // Ultimate fallback quote
    return {
      q: "Your body and mind are in harmony. Reflect on this balance today.",
      a: "MeNova"
    };
  }
}

// Handle HTTP requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  
  try {
    // Get the quote
    const quote = await getQuote();
    
    // Return the quote
    return new Response(JSON.stringify(quote), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to retrieve quote",
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
