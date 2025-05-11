
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
    
    console.log(`Fetching ${count} images for query: "${query}" from Firecrawl`);
    
    // Updated API endpoint and request format based on Firecrawl v1 API
    const response = await fetch("https://api.firecrawl.dev/v1/search/images", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store"
      },
      body: JSON.stringify({
        text: query,
        limit: count
      })
    });
    
    if (!response.ok) {
      throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("Firecrawl image response:", JSON.stringify(data).substring(0, 200) + "...");
    
    // Extract image URLs from the response
    if (data && data.results && Array.isArray(data.results)) {
      const imageUrls = data.results
        .filter(result => result.image && result.image.url)
        .map(result => result.image.url)
        .slice(0, count);
      
      // Only return images if we actually got some
      if (imageUrls.length > 0) {
        return imageUrls;
      }
    }
    
    // Return empty array instead of fallback images if no results
    return [];
  } catch (error) {
    console.error(`Error fetching images from Firecrawl: ${error}`);
    return []; // Return empty array instead of fallback images
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
      return []; // Return empty array instead of throwing
    }
    
    // Create the search query
    console.log(`Scraping content for query: "${topic}" from Firecrawl`);
    
    // Updated to use the correct API endpoint and request format based on Firecrawl v1 API
    const searchEndpoint = contentType === 'video' 
      ? "https://api.firecrawl.dev/v1/search/videos"
      : "https://api.firecrawl.dev/v1/search/web";
    
    // Define site filters for different content types
    const siteFilters = contentType === 'article' 
      ? ["healthline.com", "mayoclinic.org", "webmd.com", "medicalnewstoday.com"] 
      : contentType === 'video' 
        ? ["youtube.com", "vimeo.com"] 
        : [];
    
    // Make the API request to Firecrawl with the updated format
    const response = await fetch(searchEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store"
      },
      body: JSON.stringify({
        text: `${topic} ${contentType === 'video' ? 'video' : ''} menopause health`,
        limit: count,
        sites: siteFilters.length > 0 ? siteFilters : undefined
      })
    });
    
    if (!response.ok) {
      console.error(`Firecrawl API responded with status: ${response.status}`);
      const errorText = await response.text();
      console.error(`Error response body: ${errorText}`);
      return []; // Return empty array instead of throwing
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
            siteName: result.siteName || new URL(result.url).hostname,
            publishedDate: result.date || new Date().toISOString()
          };
        }
      });
    }
    
    // Return empty array if no results instead of fallback data
    return [];
  } catch (error) {
    console.error(`Error scraping content with Firecrawl: ${error}`);
    return []; // Return empty array instead of throwing
  }
}

// Remove the fallback images function since we don't want to show dummy data
