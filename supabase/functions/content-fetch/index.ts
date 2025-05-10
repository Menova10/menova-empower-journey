// Content Fetch Edge Function
// This function fetches menopause-related content from various sources using OpenAI and Firecrawl

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Configuration, OpenAIApi } from "https://esm.sh/openai@3.2.1";
import { getImagesFromFirecrawl, scrapeContentWithFirecrawl } from "../_shared/firecrawl.ts";

// Initialize OpenAI API
const configuration = new Configuration({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});
const openai = new OpenAIApi(configuration);

// Initialize Supabase client with environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Specific menopause-related content categories
const MENOPAUSE_TOPICS = [
  "menopause",
  "perimenopause",
  "pre-menopause",
  "mental health and menopause",
  "nutrition and menopause",
  "menopause symptoms",
  "hormone changes",
  "menopause wellness",
  "sleep issues in menopause"
];

// Types for content items
interface ContentItem {
  id: string;
  title: string;
  description: string;
  category: string[];
  type: "article" | "video";
  thumbnail: string;
  url: string;
  duration?: string;
  author?: {
    name: string;
    avatar: string;
  };
  summary?: string;
  source?: string;
  publishedDate?: string;
}

// Function to fetch personalized content based on user symptoms
async function getPersonalizedContent(userSymptoms: string[]): Promise<ContentItem[]> {
  try {
    // Create content collection
    const allContent: ContentItem[] = [];
    
    // For each symptom, find related content
    for (const symptom of userSymptoms) {
      console.log(`Finding content for symptom: ${symptom}`);
      
      // Create search topics combining symptom with menopause
      const searchTopic = `${symptom} menopause`;
      
      // Fetch articles using Firecrawl
      const articles = await scrapeContentWithFirecrawl(searchTopic, 'article', 2);
      
      // Fetch videos using Firecrawl
      const videos = await scrapeContentWithFirecrawl(searchTopic, 'video', 1);
      
      // If we got content, process it
      if (articles.length > 0 || videos.length > 0) {
        // Process and format articles
        for (const article of articles) {
          // Summarize article content using OpenAI
          let summary = "";
          try {
            summary = await summarizeWithOpenAI(article.title, article.content || article.description, 2);
          } catch (err) {
            console.error("Error summarizing with OpenAI:", err);
            summary = article.description || article.summary || `Article about ${symptom} and menopause`;
          }
          
          allContent.push({
            id: crypto.randomUUID(),
            title: article.title,
            description: summary,
            category: [symptom, ...MENOPAUSE_TOPICS.filter(topic => 
              article.title.toLowerCase().includes(topic) || 
              (article.content || "").toLowerCase().includes(topic)
            )],
            type: 'article',
            thumbnail: article.thumbnail || (await getImagesFromFirecrawl(searchTopic, 1))[0],
            url: article.url,
            author: {
              name: article.author || "Health Professional",
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(article.author || "Health Professional")}&background=random`,
            },
            summary,
            source: article.source || new URL(article.url).hostname,
            publishedDate: article.publishedDate || new Date().toISOString()
          });
        }
        
        // Process and format videos
        for (const video of videos) {
          allContent.push({
            id: crypto.randomUUID(),
            title: video.title,
            description: video.description || video.summary || `Video about ${symptom} and menopause`,
            category: [symptom, ...MENOPAUSE_TOPICS.filter(topic => 
              video.title.toLowerCase().includes(topic) || 
              (video.description || "").toLowerCase().includes(topic)
            )],
            type: 'video',
            thumbnail: video.thumbnail || (await getImagesFromFirecrawl(`${symptom} menopause video`, 1))[0],
            url: video.url,
            duration: video.duration || "3:45",
            author: {
              name: video.author || "Health Expert",
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(video.author || "Health Expert")}&background=random`,
            },
            source: video.source || new URL(video.url).hostname
          });
        }
      }
    }
    
    // Return the collected content
    return allContent;
  } catch (error) {
    console.error("Error getting personalized content:", error);
    return [];
  }
}

// Function to fetch general menopause videos from Supabase
async function getGeneralMenopauseVideos(): Promise<ContentItem[]> {
  try {
    // Fetch videos from videos table where type is 'general_menopause'
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('type', 'general_menopause');
    
    if (error) {
      throw new Error(`Error fetching videos: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Format videos to match ContentItem interface
    return data.map(video => ({
      id: video.id || crypto.randomUUID(),
      title: video.title || "Menopause Information Video",
      description: video.description || "General information about menopause",
      category: ["general", "menopause", ...(video.tags || [])],
      type: "video",
      thumbnail: video.thumbnail || "https://images.unsplash.com/photo-1576091160550-2173dba999ef",
      url: video.url,
      duration: video.duration || "4:30",
      author: {
        name: video.author || "MeNova",
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(video.author || "MeNova")}&background=random`,
      }
    }));
  } catch (error) {
    console.error("Error fetching general menopause videos:", error);
    return [];
  }
}

// Function to use OpenAI to summarize content
async function summarizeWithOpenAI(title: string, content: string, sentenceCount: number = 2): Promise<string> {
  try {
    if (!configuration.apiKey) {
      throw new Error("OpenAI API key not configured");
    }
    
    const prompt = `Summarize the following article about menopause in ${sentenceCount} sentences. 
    Make it informative and helpful for women experiencing menopause symptoms.
    
    Title: ${title}
    
    Content: ${content.slice(0, 1500)}`;
    
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt,
      max_tokens: 150,
      temperature: 0.3,
    });
    
    return response.data.choices[0].text?.trim() || 
      "Article provides helpful information about menopause and managing symptoms.";
  } catch (error) {
    console.error(`Error summarizing with OpenAI: ${error}`);
    // Return a generic summary if OpenAI fails
    return "This article discusses menopause symptoms and management strategies for better health and wellbeing.";
  }
}

// Main function to fetch and process content
async function fetchAndStoreContent(userSymptoms: string[] = []) {
  try {
    // Initialize content collection
    let allContent: ContentItem[] = [];
    
    // Get general menopause videos from Supabase
    const generalVideos = await getGeneralMenopauseVideos();
    console.log(`Found ${generalVideos.length} general menopause videos`);
    allContent = [...generalVideos];
    
    // Get personalized content based on user symptoms if provided
    if (userSymptoms && userSymptoms.length > 0) {
      const personalizedContent = await getPersonalizedContent(userSymptoms);
      console.log(`Found ${personalizedContent.length} personalized content items for user symptoms`);
      allContent = [...allContent, ...personalizedContent];
    } else {
      // If no symptoms provided, get content for general menopause topics
      for (const topic of MENOPAUSE_TOPICS) {
        console.log(`Finding content for topic: ${topic}`);
        
        // Get articles
        const articles = await scrapeContentWithFirecrawl(topic, 'article', 1);
        
        // Get videos
        const videos = await scrapeContentWithFirecrawl(topic, 'video', 1);
        
        // Process content like before
        for (const article of articles) {
          let summary = "";
          try {
            summary = await summarizeWithOpenAI(article.title, article.content || article.description, 2);
          } catch (err) {
            summary = article.description || article.summary || `Article about ${topic}`;
          }
          
          allContent.push({
            id: crypto.randomUUID(),
            title: article.title,
            description: summary,
            category: [topic],
            type: 'article',
            thumbnail: article.thumbnail || (await getImagesFromFirecrawl(topic, 1))[0],
            url: article.url,
            author: {
              name: article.author || "Health Professional",
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(article.author || "Health Professional")}&background=random`,
            },
            summary,
            source: article.source || new URL(article.url).hostname,
            publishedDate: article.publishedDate || new Date().toISOString()
          });
        }
        
        for (const video of videos) {
          allContent.push({
            id: crypto.randomUUID(),
            title: video.title,
            description: video.description || video.summary || `Video about ${topic}`,
            category: [topic],
            type: 'video',
            thumbnail: video.thumbnail || (await getImagesFromFirecrawl(`${topic} video`, 1))[0],
            url: video.url,
            duration: video.duration || "3:45",
            author: {
              name: video.author || "Health Expert",
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(video.author || "Health Expert")}&background=random`,
            },
            source: video.source || new URL(video.url).hostname
          });
        }
      }
    }
    
    // Store content in Supabase
    if (allContent.length > 0) {
      const { data, error } = await supabase
        .from('content')
        .upsert(allContent, { onConflict: 'id' });
      
      if (error) {
        throw new Error(`Failed to store content: ${error.message}`);
      }
      
      console.log(`Successfully stored ${allContent.length} content items`);
    }
    
    return allContent;
  } catch (error) {
    console.error(`Error in fetchAndStoreContent: ${error}`);
    throw error;
  }
}

serve(async (req) => {
  try {
    // Enable CORS
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Content-Type": "application/json"
    };
    
    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers, status: 204 });
    }
    
    // Check for valid request method
    if (req.method !== "POST" && req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers,
      });
    }
    
    // Process based on request method
    if (req.method === "POST") {
      // Parse request body for user symptoms
      const requestData = await req.json();
      const userSymptoms = requestData.symptoms || [];
      
      console.log(`Processing content fetch request with symptoms: ${userSymptoms.join(", ")}`);
      
      // Trigger content fetch and update using user symptoms
      const content = await fetchAndStoreContent(userSymptoms);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Fetched and stored ${content.length} content items`,
        count: content.length,
        data: content
      }), {
        status: 200,
        headers,
      });
    } else {
      // GET request - retrieve content from the database
      const { data, error } = await supabase
        .from('content')
        .select('*');
      
      if (error) {
        throw new Error(`Failed to retrieve content: ${error.message}`);
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        data 
      }), {
        status: 200,
        headers,
      });
    }
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Content-Type": "application/json"
      },
    });
  }
}); 