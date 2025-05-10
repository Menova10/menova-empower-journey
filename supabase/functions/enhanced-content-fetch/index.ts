
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

// Get fallback images when Firecrawl is not available
function getFallbackImage(topic: string): string {
  const fallbackImages = {
    'menopause': 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2',
    'perimenopause': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773',
    'wellness': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b',
    'nutrition': 'https://images.unsplash.com/photo-1490645935967-10de6ba17061',
    'mental health': 'https://images.unsplash.com/photo-1493836512294-502baa1986e2',
    'exercise': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
    'meditation': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773',
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
        thumbnail: getFallbackImage(combinedTopic),
        author: {
          name: ["Dr. Sarah Johnson", "Emma Wilson", "Dr. Lisa Chen", "Michael Roberts", "Dr. Jennifer Green"][i % 5],
          avatar: `https://api.dicebear.com/7.x/personas/svg?seed=${i}-${subtopic}`
        },
        category: [topic, subtopic, "Women's Health"],
        duration: undefined
      });
    } else { // video
      const titleTemplate = videoTitles[i % videoTitles.length];
      const descTemplate = videoDescriptions[i % videoDescriptions.length];
      
      content.push({
        id: crypto.randomUUID(),
        title: titleTemplate.replace('{topic}', subtopic),
        description: descTemplate.replace(/{topic}/g, combinedTopic),
        url: `https://example.com/videos/${subtopic.replace(/\s+/g, '-').toLowerCase()}`,
        type: 'video',
        thumbnail: getFallbackImage(combinedTopic),
        author: {
          name: ["Dr. Emma Wilson", "Health Channel", "MenoWellness", "Dr. Robert Chen", "Wellness With Sarah"][i % 5],
          avatar: `https://api.dicebear.com/7.x/personas/svg?seed=video-${i}-${subtopic}`
        },
        category: [topic, subtopic, "Women's Health"],
        duration: `${Math.floor(Math.random() * 10) + 2}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
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
        try {
          const searchQuery = `${processedItem.title} ${contentType === 'video' ? 'video thumbnail' : 'article image'} menopause health`;
          const images = await getImagesFromFirecrawl(searchQuery, 1);
          processedItem.thumbnail = images[0] || getFallbackImage(searchQuery);
        } catch (error) {
          console.error("Error fetching image from Firecrawl:", error);
          processedItem.thumbnail = getFallbackImage(processedItem.title);
        }
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
    
    // Try to get content using Firecrawl first
    try {
      const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
      if (firecrawlApiKey) {
        scrapedContent = await scrapeContentWithFirecrawl(topic, contentType as 'article' | 'video', count);
      } else {
        console.error("FIRECRAWL_API_KEY not found in environment variables");
        throw new Error("Firecrawl API key not configured");
      }
    } catch (error) {
      console.warn("Failed to fetch content with Firecrawl:", error.message);
      console.log("Falling back to generated content");
      
      // Use fallback content generation if Firecrawl fails
      scrapedContent = generateFallbackContent(contentType as 'article' | 'video', topic, count);
    }
    
    // Process and enrich the content (whether from Firecrawl or fallback)
    const processedContent = await processContent(scrapedContent, contentType as 'article' | 'video');
    
    // Return the processed content
    return new Response(JSON.stringify(processedContent), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Error in enhanced-content-fetch:", error);
    
    // Generate fallback content in case of any error
    const fallbackContent = generateFallbackContent(
      'article', 'menopause wellness', 6
    );
    
    return new Response(JSON.stringify(fallbackContent), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
