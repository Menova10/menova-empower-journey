
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getImagesFromFirecrawl, scrapeContentWithFirecrawl } from "../_shared/firecrawl.ts";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle OpenAI API requests for summarization
async function summarizeWithOpenAI(text: string): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  
  if (!apiKey) {
    console.warn("OpenAI API key not found");
    return text.length > 200 ? text.substring(0, 200) + "..." : text;
  }
  
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that summarizes text about menopause, wellness, and women's health into 2-3 concise, informative sentences."
          },
          {
            role: "user",
            content: `Please summarize the following text into 2-3 sentences: ${text}`
          }
        ],
        max_tokens: 150
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error("OpenAI API error:", data.error);
      return text.length > 200 ? text.substring(0, 200) + "..." : text;
    }
    
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error summarizing with OpenAI:", error);
    return text.length > 200 ? text.substring(0, 200) + "..." : text;
  }
}

// Process and enrich content with thumbnails and summaries
async function processContent(content: any[], contentType: 'article' | 'video'): Promise<any[]> {
  const processed = [];
  
  for (const item of content) {
    try {
      // Create a basic processed item
      const processedItem = {
        id: crypto.randomUUID(),
        title: item.title || "Untitled",
        description: item.description || item.snippet || "",
        url: item.url || "",
        type: contentType,
        thumbnail: "",
        author: {
          name: item.author || "Health Expert",
          avatar: `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(item.author || "expert")}`
        },
        category: [],
        duration: contentType === 'video' ? "5:30" : undefined
      };
      
      // Get tags/categories from the content
      if (item.keywords) {
        processedItem.category = Array.isArray(item.keywords) ? 
          item.keywords.slice(0, 5) : 
          [item.keywords];
      } else {
        // Default categories related to menopause
        const defaultCategories = ["Menopause", "Women's Health", "Wellness", "Self-care"];
        processedItem.category = defaultCategories.slice(0, Math.floor(Math.random() * 3) + 1);
      }
      
      // Get a thumbnail image using Firecrawl if not provided
      if (!item.thumbnail && !item.image) {
        const searchQuery = `${processedItem.title} ${contentType === 'video' ? 'video thumbnail' : 'article image'} menopause health`;
        const images = await getImagesFromFirecrawl(searchQuery, 1);
        processedItem.thumbnail = images[0] || "https://images.unsplash.com/photo-1506126613408-eca07ce68773";
      } else {
        processedItem.thumbnail = item.thumbnail || item.image || "";
      }
      
      // Summarize the description if it's an article and description is long
      if (contentType === 'article' && processedItem.description.length > 200) {
        processedItem.description = await summarizeWithOpenAI(processedItem.description);
      }
      
      processed.push(processedItem);
    } catch (error) {
      console.error("Error processing content item:", error);
    }
  }
  
  return processed;
}

// Main handler for the edge function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let contentType = 'article';
    let topic = 'menopause wellness';
    let count = 6;
    
    // Check if we have parameters in the body or in the URL
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        
        if (body && body.params) {
          contentType = body.params.type || 'article';
          topic = body.params.topic || 'menopause wellness';
          count = parseInt(body.params.count || '6');
        }
      } catch (e) {
        console.error("Error parsing request body:", e);
        // Continue with default values or URL parameters
      }
    }
    
    // If not in body, check URL parameters
    if (contentType === 'article' && url.searchParams.has('type')) {
      contentType = url.searchParams.get('type') as 'article' | 'video';
    }
    
    if (topic === 'menopause wellness' && url.searchParams.has('topic')) {
      topic = url.searchParams.get('topic') || topic;
    }
    
    if (count === 6 && url.searchParams.has('count')) {
      count = parseInt(url.searchParams.get('count') || '6');
    }
    
    console.log(`Fetching ${contentType} content about "${topic}"`);
    
    // Scrape content using Firecrawl
    const scrapedContent = await scrapeContentWithFirecrawl(topic, contentType as 'article' | 'video', count);
    
    // Process and enrich the scraped content
    const processedContent = await processContent(scrapedContent, contentType as 'article' | 'video');
    
    // Return the processed content
    return new Response(JSON.stringify(processedContent), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Error in enhanced-content-fetch:", error);
    
    return new Response(JSON.stringify({ 
      error: error.message || "An error occurred while fetching content" 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
