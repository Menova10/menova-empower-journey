
// Firecrawl integration for fetching images and content
// This shared module can be used by multiple edge functions

/**
 * Fetches image URLs from Firecrawl based on a search query
 * @param query The search query to find images for
 * @param count Number of images to return
 * @returns Array of image URLs
 */
export async function getImagesFromFirecrawl(query: string, count: number = 3): Promise<string[]> {
  try {
    // Firecrawl credentials from environment variables
    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    
    if (!apiKey) {
      console.warn("FIRECRAWL_API_KEY not found in environment variables");
      return [];
    }
    
    console.log(`Fetching ${count} images for query: "${query}" from Firecrawl with API key: ${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}`);
    
    // Try the new API endpoint structure first
    const response = await fetch("https://api.firecrawl.dev/images/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store"
      },
      body: JSON.stringify({
        query: query,
        limit: count
      })
    });
    
    if (!response.ok) {
      console.error(`Firecrawl images API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Error response body: ${errorText.substring(0, 200)}`);
      return [];
    }
    
    const data = await response.json();
    console.log("Firecrawl image response:", JSON.stringify(data).substring(0, 200) + "...");
    
    // Extract image URLs from the response
    if (data && data.results && Array.isArray(data.results)) {
      const imageUrls = data.results
        .filter(result => result.image && result.image.url)
        .map(result => result.image.url)
        .slice(0, count);
      
      console.log(`Successfully fetched ${imageUrls.length} images from Firecrawl`);
      return imageUrls;
    }
    
    console.log("No images found in Firecrawl response");
    return [];
  } catch (error) {
    console.error(`Error fetching images from Firecrawl: ${error}`);
    return [];
  }
}

/**
 * Scrapes web content related to menopause topics using Firecrawl
 * @param topic The topic to search for
 * @param contentType The type of content to search for ('article' or 'video')
 * @param count Number of content items to return
 * @returns Array of content data objects
 */
export async function scrapeContentWithFirecrawl(
  topic: string, 
  contentType: 'article' | 'video' = 'article', 
  count: number = 3
): Promise<any[]> {
  try {
    // Firecrawl credentials from environment variables
    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    
    if (!apiKey) {
      console.warn("FIRECRAWL_API_KEY not found in environment variables");
      return [];
    }
    
    // Create the search query
    console.log(`Scraping content for query: "${topic}" from Firecrawl with API key: ${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}`);
    
    // Updated to use the correct API endpoint
    let searchEndpoint;
    if (contentType === 'video') {
      searchEndpoint = "https://api.firecrawl.dev/videos/search";
    } else {
      searchEndpoint = "https://api.firecrawl.dev/web/search";
    }
    
    // Define site filters for different content types
    const siteFilters = contentType === 'article' 
      ? ["healthline.com", "mayoclinic.org", "webmd.com", "medicalnewstoday.com"] 
      : contentType === 'video' 
        ? ["youtube.com", "vimeo.com"] 
        : [];
    
    // Prepare request payload
    const payload = {
      query: `${topic} ${contentType === 'video' ? 'video' : ''} menopause health`,
      limit: count
    };
    
    // Only add sites filter if we have defined sites
    if (siteFilters.length > 0) {
      payload["sites"] = siteFilters;
    }
    
    console.log(`Calling Firecrawl API at ${searchEndpoint} with payload:`, JSON.stringify(payload));
    
    // Make the API request to Firecrawl with the updated format
    const response = await fetch(searchEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store"
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      console.error(`Firecrawl API responded with status: ${response.status}`);
      const errorText = await response.text();
      console.error(`Error response body: ${errorText.substring(0, 200)}`);
      return [];
    }
    
    const data = await response.json();
    console.log(`Firecrawl returned ${data.results?.length || 0} results for ${contentType}`);
    
    // Process and normalize the results based on content type
    if (data.results && Array.isArray(data.results) && data.results.length > 0) {
      return data.results.map(result => {
        // Format varies between video and article results
        if (contentType === 'video') {
          return {
            title: result.title || `Video about ${topic}`,
            description: result.description || result.snippet || "",
            thumbnail: result.thumbnail || "",
            url: result.url || "",
            author: result.author || "",
            publishedDate: result.date || new Date().toISOString(),
            duration: result.duration || ""
          };
        } else {
          return {
            title: result.title || `Article about ${topic}`,
            content: result.snippet || result.content || "",
            description: result.description || result.snippet || "",
            image: result.image?.url || "",
            url: result.url || "",
            author: result.author || "",
            siteName: result.siteName || (result.url ? new URL(result.url).hostname : ""),
            publishedDate: result.date || new Date().toISOString()
          };
        }
      });
    }
    
    console.log(`Successfully fetched 0 items from Firecrawl`);
    return [];
  } catch (error) {
    console.error(`Error scraping content with Firecrawl: ${error}`);
    return [];
  }
}

/**
 * Tests the Firecrawl API connectivity
 * @returns Object with test results
 */
export async function testFirecrawlConnectivity(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    
    if (!apiKey) {
      return {
        success: false,
        message: "FIRECRAWL_API_KEY not found in environment variables"
      };
    }
    
    console.log("Testing Firecrawl API connectivity with API key: " + 
      `${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}`);
    
    // Test the image search endpoint
    const imageResponse = await fetch("https://api.firecrawl.dev/images/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: "menopause test",
        limit: 1
      })
    });
    
    // Test the web search endpoint
    const webResponse = await fetch("https://api.firecrawl.dev/web/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: "menopause test",
        limit: 1
      })
    });
    
    const results = {
      imageSearch: {
        status: imageResponse.status,
        statusText: imageResponse.statusText,
        ok: imageResponse.ok
      },
      webSearch: {
        status: webResponse.status,
        statusText: webResponse.statusText,
        ok: webResponse.ok
      }
    };
    
    const success = imageResponse.ok || webResponse.ok;
    
    return {
      success,
      message: success 
        ? "Firecrawl API connection successful" 
        : "Failed to connect to Firecrawl API",
      details: results
    };
  } catch (error) {
    console.error("Error testing Firecrawl connectivity:", error);
    return {
      success: false,
      message: `Firecrawl connectivity test error: ${error.message || error}`,
      details: {
        error: error.message || String(error),
        stack: error.stack
      }
    };
  }
}

