
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
      return await getImagesFromOpenAI(query, count);
    }
    
    console.log(`Fetching ${count} images for query: "${query}" from Firecrawl with API key: ${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}`);
    
    // Use the correct API endpoint for Firecrawl
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
      console.log(`Falling back to OpenAI for image query: "${query}"`);
      return await getImagesFromOpenAI(query, count);
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
    
    console.log("No images found in Firecrawl response, falling back to OpenAI");
    return await getImagesFromOpenAI(query, count);
  } catch (error) {
    console.error(`Error fetching images from Firecrawl: ${error}`);
    console.log(`Falling back to OpenAI for images due to error`);
    return await getImagesFromOpenAI(query, count);
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
      return await getContentFromOpenAI(topic, contentType, count);
    }
    
    // Create the search query
    console.log(`Scraping content for query: "${topic}" from Firecrawl with API key: ${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}`);
    
    // Corrected endpoint URLs based on Firecrawl API docs
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
    const payload: any = {
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
      console.log(`Falling back to OpenAI for content about: "${topic}"`);
      return await getContentFromOpenAI(topic, contentType, count);
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
    
    console.log(`Successfully fetched 0 items from Firecrawl, falling back to OpenAI`);
    return await getContentFromOpenAI(topic, contentType, count);
  } catch (error) {
    console.error(`Error scraping content with Firecrawl: ${error}`);
    console.log(`Falling back to OpenAI for content due to error`);
    return await getContentFromOpenAI(topic, contentType, count);
  }
}

/**
 * Use OpenAI to generate content about a topic when Firecrawl API fails
 */
async function getContentFromOpenAI(topic: string, contentType: 'article' | 'video', count: number): Promise<any[]> {
  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiApiKey) {
      console.warn("OPENAI_API_KEY not found in environment variables");
      return generateFallbackContent(topic, contentType, count);
    }
    
    console.log(`Generating ${contentType} content about "${topic}" using OpenAI`);
    
    const systemPrompt = contentType === 'video' 
      ? `Generate ${count} realistic YouTube video listings about "${topic}" related to menopause and women's health. Include title, description, author/channel name, and view count. Make them informative and medically accurate.` 
      : `Generate ${count} realistic article listings about "${topic}" related to menopause and women's health. Include title, description, author name, publication, and publish date. Make them informative and medically accurate.`;
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `I need ${count} high-quality ${contentType} listings about "${topic}" related to menopause. Format as JSON array with title, description, url, author, and other relevant fields.` }
        ],
        response_format: { type: "json_object" }
      })
    });
    
    if (!response.ok) {
      console.error(`OpenAI API error: ${response.status} ${response.statusText}`);
      return generateFallbackContent(topic, contentType, count);
    }
    
    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);
    
    console.log(`Generated ${content.items?.length || 0} items using OpenAI`);
    
    if (content && content.items && Array.isArray(content.items)) {
      // Process and normalize OpenAI generated content
      return content.items.map(item => {
        const id = crypto.randomUUID();
        const currentYear = new Date().getFullYear();
        const randomDate = new Date(Date.now() - Math.floor(Math.random() * 10000000000));
        
        if (contentType === 'video') {
          return {
            id,
            title: item.title,
            description: item.description,
            thumbnail: item.thumbnail || getTopicImage(topic),
            url: item.url || `https://www.youtube.com/watch?v=${id.substring(0, 11)}`,
            author: item.author || item.channel || "Health Expert",
            publishedDate: item.publishedDate || randomDate.toISOString(),
            duration: item.duration || `${Math.floor(Math.random() * 10) + 3}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
            isOpenAIGenerated: true
          };
        } else {
          return {
            id,
            title: item.title,
            content: item.content || item.description,
            description: item.description,
            image: item.image || getTopicImage(topic),
            url: item.url || `https://healthjournal.com/articles/${id}`,
            author: item.author || "Medical Writer",
            siteName: item.siteName || item.publication || "Women's Health Journal",
            publishedDate: item.publishedDate || randomDate.toISOString(),
            isOpenAIGenerated: true
          };
        }
      });
    }
    
    return generateFallbackContent(topic, contentType, count);
  } catch (error) {
    console.error(`Error generating content with OpenAI: ${error}`);
    return generateFallbackContent(topic, contentType, count);
  }
}

/**
 * Use OpenAI to generate images when Firecrawl API fails
 */
async function getImagesFromOpenAI(query: string, count: number = 3): Promise<string[]> {
  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiApiKey) {
      console.warn("OPENAI_API_KEY not found in environment variables");
      return getFallbackImages(query, count);
    }
    
    console.log(`Generating ${count} images for "${query}" using OpenAI`);
    
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: `Create a medical illustration about ${query} relevant to women's health and menopause. The image should be informative, respectful, and suitable for a health education context.`,
        n: count,
        size: "1024x1024"
      })
    });
    
    if (!response.ok) {
      console.error(`OpenAI image API error: ${response.status} ${response.statusText}`);
      return getFallbackImages(query, count);
    }
    
    const data = await response.json();
    console.log(`Generated ${data.data?.length || 0} images using OpenAI`);
    
    if (data && data.data && Array.isArray(data.data)) {
      return data.data.map(item => item.url);
    }
    
    return getFallbackImages(query, count);
  } catch (error) {
    console.error(`Error generating images with OpenAI: ${error}`);
    return getFallbackImages(query, count);
  }
}

/**
 * Generate hardcoded fallback content when both Firecrawl and OpenAI fail
 */
function generateFallbackContent(topic: string, contentType: 'article' | 'video', count: number): any[] {
  console.log(`Generating fallback ${contentType} content for ${topic}`);
  
  const content = [];
  const topics = ['menopause symptoms', 'hormone therapy', 'natural remedies', 'nutrition', 'exercise', 
                 'mental health', 'sleep management', 'hot flashes', 'mood changes', 'wellness'];
  
  // Article content templates
  const articleTitles = [
    "Understanding {topic}: A Comprehensive Guide",
    "How {topic} Affects Women's Health and Wellbeing",
    "5 Essential Facts About {topic} You Should Know",
    "Managing {topic}: Expert Advice and Tips",
    "The Science Behind {topic} and Hormonal Changes",
    "Navigating {topic} with Confidence: A Practical Approach",
    "Natural Solutions for {topic} Management",
    "Latest Research on {topic} and Treatment Options",
    "How Lifestyle Changes Can Improve {topic} Symptoms",
    "A Holistic Approach to {topic} Care"
  ];
  
  const articleDescriptions = [
    "This comprehensive article explores the various aspects of {topic}, providing evidence-based information to help women understand and manage their symptoms effectively. Learn about the latest research and treatment options available.",
    "Understanding {topic} is crucial for maintaining health and wellbeing during menopause. This article discusses common challenges and practical solutions based on medical research and expert opinions.",
    "Women experiencing {topic} often have questions about what's normal and what requires medical attention. This guide provides clear answers and practical advice for navigating this important transition.",
    "This article presents a holistic approach to managing {topic}, combining medical treatments with lifestyle modifications, nutritional guidance, and self-care practices for optimal wellness.",
    "Recent studies have revealed new insights into {topic} management. This article summarizes key findings and translates them into actionable steps for improving quality of life during menopause.",
    "Navigating {topic} can feel overwhelming, but this comprehensive resource provides a roadmap for understanding symptoms, treatment options, and lifestyle adjustments that can make a significant difference.",
    "This evidence-based guide examines how {topic} affects both physical and emotional health, offering strategies for maintaining balance and wellbeing throughout the menopausal transition.",
    "From hormonal shifts to lifestyle factors, this article explores the multifaceted nature of {topic} and provides practical strategies for symptom relief and improved quality of life.",
    "Menopause specialists share their top recommendations for managing {topic} effectively, including both conventional and complementary approaches tailored to individual needs.",
    "This informative article breaks down complex information about {topic} into practical, actionable advice that can help women make informed decisions about their health."
  ];
  
  // Video content templates
  const videoTitles = [
    "{topic} Explained: What You Need to Know",
    "Expert Interview: Understanding {topic}",
    "Managing {topic}: Practical Tips and Demonstrations",
    "Live Q&A Session on {topic} with Dr. Jennifer Green",
    "The Truth About {topic}: Separating Fact from Fiction",
    "{topic} Management: Daily Routines That Make a Difference",
    "Real Stories: Women Share Their {topic} Experiences",
    "Medical Update: Latest Treatments for {topic}",
    "Mind-Body Connection: How {topic} Affects Your Wellbeing",
    "Wellness Workshop: Holistic Approaches to {topic}"
  ];
  
  const videoDescriptions = [
    "This informative video provides a clear explanation of {topic}, helping viewers understand the underlying processes and effective management strategies for menopausal symptoms.",
    "Dr. Sarah Johnson, a leading menopause specialist, discusses the latest research and treatment options for {topic}, offering expert insights and practical advice.",
    "This practical video demonstrates effective techniques for managing {topic}, with step-by-step guidance that viewers can immediately implement in their daily routines.",
    "In this popular Q&A session, Dr. Jennifer Green answers common questions about {topic}, addressing concerns and providing evidence-based recommendations for symptom management.",
    "This educational video separates myths from facts about {topic}, helping viewers make informed decisions about their health and wellbeing during the menopausal transition.",
    "Wellness coach Emma Wilson shares daily practices that can significantly improve {topic} symptoms, featuring simple lifestyle adjustments that yield meaningful results.",
    "Women from diverse backgrounds share their personal experiences with {topic}, offering insights, coping strategies, and words of encouragement for others on similar journeys.",
    "Medical expert Dr. Robert Chen discusses breakthrough treatments for {topic}, explaining how recent advances are changing the landscape of menopause management.",
    "This thoughtful exploration of the mind-body connection reveals how {topic} affects both physical and emotional wellbeing, with practical strategies for maintaining balance.",
    "Holistic health practitioner Maya Patel leads this comprehensive workshop on natural approaches to {topic}, combining traditional wisdom with contemporary research."
  ];
  
  // Generate content based on type and topic
  for (let i = 0; i < count; i++) {
    const subtopic = topics[Math.floor(Math.random() * topics.length)];
    const combinedTopic = `${topic} ${subtopic}`.trim();
    
    if (contentType === 'article') {
      const titleTemplate = articleTitles[i % articleTitles.length];
      const descTemplate = articleDescriptions[i % articleDescriptions.length];
      
      content.push({
        id: crypto.randomUUID(),
        title: titleTemplate.replace('{topic}', subtopic),
        description: descTemplate.replace(/{topic}/g, combinedTopic),
        url: `https://example.com/articles/${subtopic.replace(/\s+/g, '-').toLowerCase()}`,
        image: getTopicImage(combinedTopic),
        author: ["Dr. Sarah Johnson", "Emma Wilson", "Dr. Lisa Chen", "Michael Roberts", "Dr. Jennifer Green"][i % 5],
        siteName: ["MenoWellness", "Women's Health Today", "Medical News Journal", "Health & Wellness Magazine", "MenoPower"][i % 5],
        publishedDate: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString(),
        isStaticFallback: true
      });
    } else {
      const titleTemplate = videoTitles[i % videoTitles.length];
      const descTemplate = videoDescriptions[i % videoDescriptions.length];
      
      content.push({
        id: crypto.randomUUID(),
        title: titleTemplate.replace('{topic}', subtopic),
        description: descTemplate.replace(/{topic}/g, combinedTopic),
        url: `https://www.youtube.com/embed/${Math.random().toString(36).substring(2, 10)}`,
        thumbnail: getTopicImage(combinedTopic),
        author: ["Dr. Emma Wilson", "Health Channel", "MenoWellness", "Dr. Robert Chen", "Wellness With Sarah"][i % 5],
        publishedDate: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString(),
        duration: `${Math.floor(Math.random() * 10) + 2}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
        isStaticFallback: true
      });
    }
  }
  
  return content;
}

/**
 * Get fallback images when both Firecrawl and OpenAI fail
 */
function getFallbackImages(query: string, count: number): string[] {
  const images = [];
  
  for (let i = 0; i < count; i++) {
    images.push(getTopicImage(query));
  }
  
  return images;
}

/**
 * Get a fallback image URL based on the topic
 */
function getTopicImage(topic: string): string {
  const topicLower = topic.toLowerCase();
  const fallbackImages = {
    'menopause': 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
    'perimenopause': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773',
    'wellness': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b',
    'nutrition': 'https://images.unsplash.com/photo-1490645935967-10de6ba17061',
    'mental health': 'https://images.unsplash.com/photo-1493836512294-502baa1986e2',
    'exercise': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
    'meditation': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773',
    'hot flashes': 'https://images.unsplash.com/photo-1584936965809-4d4c36255d44',
    'sleep': 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55',
    'anxiety': 'https://images.unsplash.com/photo-1604881991720-f91add269bed',
    'energy': 'https://images.unsplash.com/photo-1593476123561-9516f2097158',
    'mood': 'https://images.unsplash.com/photo-1590697442725-214aa5f61fe8',
    'default': 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2'
  };
  
  // Find the best matching image based on topic
  for (const [key, url] of Object.entries(fallbackImages)) {
    if (topicLower.includes(key)) {
      return url;
    }
  }
  
  return fallbackImages.default;
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
    
    // Test the image search endpoint with updated paths
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
    
    // Test the web search endpoint with updated paths
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
