
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
    const endpoint = Deno.env.get("FIRECRAWL_ENDPOINT") || "https://api.firecrawl.dev/v1/images";
    
    if (!apiKey) {
      console.warn("FIRECRAWL_API_KEY not found in environment variables");
      return getFallbackImages(count);
    }
    
    console.log(`Fetching ${count} images for query: "${query}" from Firecrawl`);
    
    // Make the API request to Firecrawl
    const response = await fetch(`${endpoint}?query=${encodeURIComponent(query)}&limit=${count}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });
    
    if (!response.ok) {
      throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("Firecrawl image response:", JSON.stringify(data).substring(0, 200) + "...");
    
    // Extract image URLs from the response
    if (data && data.images && Array.isArray(data.images)) {
      return data.images.map((img: any) => img.url).slice(0, count);
    }
    
    return getFallbackImages(count);
  } catch (error) {
    console.error(`Error fetching images from Firecrawl: ${error}`);
    return getFallbackImages(count);
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
    const endpoint = Deno.env.get("FIRECRAWL_ENDPOINT") || "https://api.firecrawl.dev/v1/scrape";
    
    if (!apiKey) {
      console.warn("FIRECRAWL_API_KEY not found in environment variables");
      throw new Error("Firecrawl API key not configured");
    }
    
    // Create the search query based on topic and content type
    const query = `${topic} ${contentType === 'video' ? 'video' : 'article'} menopause health`;
    console.log(`Scraping content for query: "${query}" from Firecrawl`);
    
    // Make the API request to Firecrawl
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        limit: count,
        type: contentType
      })
    });
    
    if (!response.ok) {
      console.error(`Firecrawl API responded with status: ${response.status}`);
      const errorText = await response.text();
      console.error(`Error response body: ${errorText}`);
      throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Firecrawl returned ${data.results?.length || 0} results for ${contentType}`);
    
    // Return the scraped content
    return data.results || [];
  } catch (error) {
    console.error(`Error scraping content with Firecrawl: ${error}`);
    throw error;
  }
}

/**
 * Returns fallback image URLs when Firecrawl is unavailable
 */
function getFallbackImages(count: number): string[] {
  const fallbackImages = [
    "https://images.unsplash.com/photo-1559090286-36796926e134",
    "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7",
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352",
    "https://images.unsplash.com/photo-1520206183501-bcd25647c97c",
    "https://images.unsplash.com/photo-1576091160550-2173dba999ef",
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773",
    "https://images.unsplash.com/photo-1559156503-0a0759882389",
    "https://images.unsplash.com/photo-1506126944674-00c6c192e0a3"
  ];
  
  return fallbackImages.slice(0, count);
}
