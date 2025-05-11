
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
    console.log("Sending request to OpenAI API for text summarization");
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

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error response:", JSON.stringify(errorData));
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("OpenAI summary successfully generated");
    
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error summarizing with OpenAI:", error);
    return text.length > 200 ? text.substring(0, 200) + "..." : text;
  }
}

// Generate content directly with OpenAI
async function generateContentWithOpenAI(topic: string, contentType: 'article' | 'video', count: number): Promise<any[]> {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!apiKey) {
      console.warn("OpenAI API key not found for content generation");
      return generateFallbackContent(contentType, topic, count);
    }
    
    console.log(`Using OpenAI to generate ${count} ${contentType} items about "${topic}"`);
    
    const systemPrompt = contentType === 'article' 
      ? `You are an expert on menopause and women's health. Create ${count} detailed article summaries about "${topic}" that would be helpful for women experiencing menopause or perimenopause. Each article should have a title, description, author name, and publication source.` 
      : `You are an expert on menopause and women's health. Create ${count} engaging video descriptions about "${topic}" that would be helpful for women experiencing menopause. Each video should have a title, description, channel name, and duration.`;
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Please create ${count} ${contentType === 'article' ? 'articles' : 'videos'} about "${topic}" related to women's health and menopause. Format your response as a JSON array with objects containing: title, description, author, ${contentType === 'article' ? 'publication' : 'channel'}, and other relevant fields. Make the content medically accurate and helpful.`
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      console.error(`OpenAI API error: ${response.status} ${response.statusText}`);
      return generateFallbackContent(contentType, topic, count);
    }

    const data = await response.json();
    let content;
    
    try {
      content = JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      return generateFallbackContent(contentType, topic, count);
    }

    console.log(`Successfully generated ${content.items?.length || 0} items with OpenAI`);
    
    // Process and normalize OpenAI generated content
    if (content && content.items && Array.isArray(content.items)) {
      return content.items.map(item => {
        const uniqueId = crypto.randomUUID();
        const created = new Date();
        created.setDate(created.getDate() - Math.floor(Math.random() * 30)); // Random date in last 30 days
        
        const baseItem = {
          id: uniqueId,
          title: item.title,
          description: item.description,
          url: item.url || (contentType === 'article' 
            ? `https://healthjournal.com/articles/${uniqueId}` 
            : `https://www.youtube.com/watch?v=${uniqueId.substring(0, 11)}`),
          publishedDate: item.publishedDate || created.toISOString(),
          isOpenAIGenerated: true
        };
        
        if (contentType === 'article') {
          return {
            ...baseItem,
            type: 'article',
            image: item.image || getTopicImage(topic),
            author: {
              name: item.author || "Health Expert",
              avatar: `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(item.author || uniqueId)}`
            },
            siteName: item.publication || "Women's Health Today",
            category: item.categories || item.tags || ["Menopause", "Women's Health"]
          };
        } else {
          return {
            ...baseItem,
            type: 'video',
            thumbnail: item.thumbnail || getTopicImage(topic),
            author: {
              name: item.channel || item.author || "Health Channel",
              avatar: `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(item.channel || item.author || uniqueId)}`
            },
            category: item.categories || item.tags || ["Menopause", "Women's Health"],
            duration: item.duration || `${Math.floor(Math.random() * 10) + 3}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
          };
        }
      });
    }
    
    console.log("Failed to generate content with OpenAI, using fallback");
    return generateFallbackContent(contentType, topic, count);
  } catch (error) {
    console.error(`Error generating content with OpenAI: ${error}`);
    return generateFallbackContent(contentType, topic, count);
  }
}

// Get fallback images when Firecrawl is not available
function getTopicImage(topic: string): string {
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
  const topicLower = topic.toLowerCase();
  for (const [key, url] of Object.entries(fallbackImages)) {
    if (topicLower.includes(key)) {
      return url;
    }
  }
  
  return fallbackImages.default;
}

// Generate fallback content when Firecrawl is not available
function generateFallbackContent(contentType: 'article' | 'video', topic: string, count: number): any[] {
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
        type: 'article',
        thumbnail: getTopicImage(combinedTopic),
        author: {
          name: ["Dr. Sarah Johnson", "Emma Wilson", "Dr. Lisa Chen", "Michael Roberts", "Dr. Jennifer Green"][i % 5],
          avatar: `https://api.dicebear.com/7.x/personas/svg?seed=${i}-${subtopic}`
        },
        category: [topic, subtopic, "Women's Health"],
        duration: undefined,
        isStaticFallback: true
      });
    } else { // video
      const titleTemplate = videoTitles[i % videoTitles.length];
      const descTemplate = videoDescriptions[i % videoDescriptions.length];
      
      content.push({
        id: crypto.randomUUID(),
        title: titleTemplate.replace('{topic}', subtopic),
        description: descTemplate.replace(/{topic}/g, combinedTopic),
        url: `https://www.youtube.com/embed/${Math.random().toString(36).substring(2, 10)}`,
        type: 'video',
        thumbnail: getTopicImage(combinedTopic),
        author: {
          name: ["Dr. Emma Wilson", "Health Channel", "MenoWellness", "Dr. Robert Chen", "Wellness With Sarah"][i % 5],
          avatar: `https://api.dicebear.com/7.x/personas/svg?seed=video-${i}-${subtopic}`
        },
        category: [topic, subtopic, "Women's Health"],
        duration: `${Math.floor(Math.random() * 10) + 2}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
        isStaticFallback: true
      });
    }
  }
  
  return content;
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
        duration: contentType === 'video' ? "5:30" : undefined,
        isOpenAIGenerated: item.isOpenAIGenerated || false,
        isStaticFallback: item.isStaticFallback || false
      };
      
      // Get tags/categories from the content
      if (item.keywords) {
        processedItem.category = Array.isArray(item.keywords) ? 
          item.keywords.slice(0, 5) : 
          [item.keywords];
      } else if (item.category) {
        processedItem.category = Array.isArray(item.category) ? 
          item.category : 
          [item.category];
      } else {
        // Default categories related to menopause
        const defaultCategories = ["Menopause", "Women's Health", "Wellness", "Self-care"];
        processedItem.category = defaultCategories.slice(0, Math.floor(Math.random() * 3) + 1);
      }
      
      // Get a thumbnail image using Firecrawl if not provided
      if (!item.thumbnail && !item.image) {
        try {
          const searchQuery = `${processedItem.title} ${contentType === 'video' ? 'video thumbnail' : 'article image'} menopause health`;
          const images = await getImagesFromFirecrawl(searchQuery, 1);
          processedItem.thumbnail = images[0] || getTopicImage(searchQuery);
        } catch (error) {
          console.error("Error fetching image:", error);
          processedItem.thumbnail = getTopicImage(processedItem.title);
        }
      } else {
        processedItem.thumbnail = item.thumbnail || item.image || "";
      }
      
      // Summarize the description if it's an article and description is long
      if (contentType === 'article' && processedItem.description.length > 200) {
        try {
          processedItem.description = await summarizeWithOpenAI(processedItem.description);
        } catch (err) {
          console.error("Error summarizing content:", err);
          // Keep the original description but truncate if needed
          if (processedItem.description.length > 300) {
            processedItem.description = processedItem.description.substring(0, 300) + "...";
          }
        }
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
          contentType = body.params.type || contentType;
          topic = body.params.topic || topic;
          count = parseInt(body.params.count || count);
        }
      } catch (e) {
        console.error("Error parsing request body:", e);
        // Continue with default values or URL parameters
      }
    }
    
    // If not in body, check URL parameters
    if (url.searchParams.has('type')) {
      contentType = url.searchParams.get('type') as 'article' | 'video' || contentType;
    }
    
    if (url.searchParams.has('topic')) {
      topic = url.searchParams.get('topic') || topic;
    }
    
    if (url.searchParams.has('count')) {
      count = parseInt(url.searchParams.get('count') || count.toString());
    }
    
    console.log(`Fetching ${contentType} content about "${topic}"`);
    
    let scrapedContent = [];
    let usedFallback = false;
    let usedOpenAI = false;
    
    // Try to get content using Firecrawl
    try {
      // Using the provided Firecrawl API key from environment
      const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
      if (firecrawlApiKey) {
        console.log("Found Firecrawl API key, attempting to fetch content");
        scrapedContent = await scrapeContentWithFirecrawl(topic, contentType as 'article' | 'video', count);
        console.log(`Successfully fetched ${scrapedContent.length} items from Firecrawl`);
        
        // Check if any OpenAI or fallback content was used
        usedOpenAI = scrapedContent.some((item: any) => item.isOpenAIGenerated);
        usedFallback = scrapedContent.some((item: any) => item.isStaticFallback);
      } else {
        console.error("FIRECRAWL_API_KEY not found in environment variables");
        throw new Error("Firecrawl API key not configured");
      }
    } catch (error) {
      console.warn("Failed to fetch content with Firecrawl:", error.message);
      console.log("Falling back to OpenAI content generation");
      
      // Try OpenAI first, then fall back to static content
      try {
        scrapedContent = await generateContentWithOpenAI(topic, contentType as 'article' | 'video', count);
        usedOpenAI = true;
        usedFallback = scrapedContent.some((item: any) => item.isStaticFallback);
      } catch (openaiError) {
        console.error("OpenAI generation failed:", openaiError);
        scrapedContent = generateFallbackContent(contentType as 'article' | 'video', topic, count);
        usedFallback = true;
      }
    }
    
    // Process and enrich the content
    const processedContent = await processContent(scrapedContent, contentType as 'article' | 'video');
    
    // Log the sources used
    const sourceInfo = usedFallback ? 
      "Using static fallback content" : 
      usedOpenAI ? 
        "Using OpenAI generated content" : 
        "Using Firecrawl content";
    console.log(`Source info: ${sourceInfo}`);
    
    // Add a cache-busting header to ensure fresh content
    const headers = {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'X-Content-Source': usedFallback ? 'fallback' : (usedOpenAI ? 'openai' : 'firecrawl')
    };
    
    // Return the processed content
    return new Response(JSON.stringify(processedContent), { headers });
  } catch (error) {
    console.error("Error in enhanced-content-fetch:", error);
    
    // Generate fallback content in case of any error
    try {
      const openAIContent = await generateContentWithOpenAI('menopause wellness', 'article', 6);
      return new Response(JSON.stringify(openAIContent), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'X-Content-Source': 'openai-fallback'
        }
      });
    } catch (openaiError) {
      console.error("OpenAI generation also failed:", openaiError);
      const fallbackContent = generateFallbackContent('article', 'menopause wellness', 6);
      
      return new Response(JSON.stringify(fallbackContent), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'X-Content-Source': 'static-fallback'
        }
      });
    }
  }
});
