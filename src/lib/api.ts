import axios from 'axios';
import { supabase } from '@/integrations/supabase/client';

// Create a configured axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api.example.com',
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add auth interceptor
api.interceptors.request.use(config => {
  // Get API key from environment variables
  const apiKey = import.meta.env.VITE_API_KEY;
  
  if (apiKey && config.headers) {
    // Add the API key to the Authorization header
    config.headers.Authorization = `Bearer ${apiKey}`;
  }
  
  return config;
});

// Define content item interface
export interface ContentItem {
  id: string;
  title: string;
  description: string;
  category: string[];
  type: 'article' | 'video';
  thumbnail: string;
  url: string;
  duration?: string;
  author?: {
    name: string;
    avatar: string;
  };
  fullContent?: string;
  publishedDate?: string;
  relatedArticles?: string[];
}

// Content API service
export const contentApi = {
  /**
   * Get all content items
   */
  getAllContent: async (): Promise<ContentItem[]> => {
    console.log('📡 contentApi.getAllContent: Starting API request');
    try {
      // First check if we have content in the Supabase table
      console.log('📡 Attempting to fetch content from Supabase database');
      
      // Use type assertion to avoid TypeScript errors since 'content' might not be in the schema types
      const { data, error } = await supabase
        .from('content' as any)
        .select('*');
      
      if (error) {
        console.error('❌ Error fetching content from database:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log(`📊 Database returned ${data?.length || 0} content items`);
      
      if (data && data.length > 0) {
        console.log('✅ Using content from database');
        // Use type assertion to ensure TypeScript knows this is ContentItem[]
        return data as unknown as ContentItem[];
      }
      
      // If no content in database, try to fetch from APIs
      console.log('🔄 No content in database, getting from external APIs');
      return await contentApi.fetchOpenAIContent();
    } catch (error) {
      console.error('❌ Error in getAllContent:', error);
      // Don't return mock data, instead return empty array
      return [];
    }
  },
  
  /**
   * Get content by ID
   */
  getContentById: async (id: string): Promise<ContentItem | null> => {
    try {
      // Try to get from the content table
      const { data, error } = await supabase
        .from('content' as any)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error || !data) {
        // If not found by ID, try to get by URL path
        const urlPath = id.startsWith('/') ? id : `/${id}`;
        const { data: urlData, error: urlError } = await supabase
          .from('content' as any)
          .select('*')
          .eq('url', urlPath)
          .single();
        
        if (urlError || !urlData) {
          console.error('Content not found:', id);
          return null;
        }
        
        // Use a more specific type assertion
        return urlData as unknown as ContentItem;
      }
      
      // Use a more specific type assertion
      return data as unknown as ContentItem;
    } catch (error) {
      console.error('Error in getContentById:', error);
      return null;
    }
  },
  
  /**
   * Get personalized content based on user symptoms
   */
  getPersonalizedContent: async (symptoms: string[]): Promise<ContentItem[]> => {
    try {
      if (!symptoms || symptoms.length === 0) {
        return [];
      }
      
      console.log('🧬 Getting personalized content for symptoms:', symptoms);
      
      // Create an array of symptom terms to search for with more variations
      const searchTerms = symptoms.flatMap(symptom => {
        // Normalize and generate variations for better matching
        const normalizedSymptom = symptom.toLowerCase().trim();
        const terms = [normalizedSymptom];
        
        // Add common related terms and handle different formats
        if (normalizedSymptom.includes('hot flash') || normalizedSymptom === 'hot flashes') {
          terms.push('hot flashes', 'night sweats', 'temperature', 'hot_flashes', 'sweating');
        } 
        else if (normalizedSymptom.includes('sleep') || normalizedSymptom === 'sleep quality') {
          terms.push('insomnia', 'sleep disturbance', 'sleep issue', 'sleep quality', 'sleeping', 'rest', 'fatigue');
        } 
        else if (normalizedSymptom.includes('anxiety') || normalizedSymptom === 'mood') {
          terms.push('stress', 'mood', 'mental health', 'emotion', 'anxiety', 'depression', 'irritability');
        } 
        else if (normalizedSymptom.includes('period') || normalizedSymptom.includes('menstrual')) {
          terms.push('irregular periods', 'menstrual', 'cycle', 'bleeding', 'periods');
        }
        else if (normalizedSymptom.includes('energy') || normalizedSymptom === 'fatigue') {
          terms.push('energy', 'fatigue', 'tired', 'exhausted', 'energy level', 'vitality');
        }
        
        return terms;
      });
      
      // Log the search terms for debugging
      console.log('🔍 Expanded search terms for content matching:', searchTerms);
      
      // Get all content first
      const allContent = await contentApi.getAllContent();
      console.log(`📊 Total content items available: ${allContent.length}`);
      
      // Filter for content that matches the search terms with improved matching
      const personalizedContent = allContent.filter(item => {
        // First check if any category tag matches directly
        const hasDirectCategoryMatch = item.category.some(category => {
          const categoryLower = category.toLowerCase();
          return searchTerms.some(term => categoryLower.includes(term) || term.includes(categoryLower));
        });
        
        if (hasDirectCategoryMatch) {
          return true;
        }
        
        // If no direct category match, check title and description with fuzzy matching
        const titleAndDesc = `${item.title} ${item.description}`.toLowerCase();
        return searchTerms.some(term => {
          // Give more weight to exact matches
          if (titleAndDesc.includes(` ${term} `)) {
            return true;
          }
          
          // Also allow partial matches for more results
          return titleAndDesc.includes(term);
        });
      });
      
      console.log(`🎯 Found ${personalizedContent.length} matching content items`);
      
      // Deduplicate and limit results
      const uniqueContent = Array.from(new Set(personalizedContent.map(c => c.id)))
        .map(id => personalizedContent.find(item => item.id === id))
        .filter(Boolean) as ContentItem[];
      
      const finalResults = uniqueContent.slice(0, 6);
      console.log(`✅ Returning ${finalResults.length} personalized content items`);
      
      return finalResults;
    } catch (error) {
      console.error('Error in getPersonalizedContent:', error);
      return [];
    }
  },
  
  /**
   * Refresh content from the edge function
   */
  refreshContent: async (): Promise<ContentItem[]> => {
    console.log('🔄 contentApi.refreshContent: Attempting to fetch fresh content');
    try {
      // Call the edge function to fetch new content
      console.log('📡 Calling content-fetch edge function');
      
      const response = await fetch('/api/content-fetch');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error from edge function: ${response.status}`, errorText);
        throw new Error(`Error refreshing content: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('📊 Edge function response:', result);
      
      // Get all the content from the API response
      if (result.data && result.data.length > 0) {
        return result.data as ContentItem[];
      }
      
      // If no data, return empty array rather than mock data
      return [];
    } catch (error) {
      console.error('❌ Error in refreshContent:', error);
      // Return empty array instead of mock data
      return [];
    }
  },
  
  /**
   * Get related content
   */
  getRelatedContent: async (contentId: string, limit: number = 2): Promise<ContentItem[]> => {
    try {
      // First get the content item
      const contentItem = await contentApi.getContentById(contentId);
      
      if (!contentItem) {
        return [];
      }
      
      // If it has related articles field, use that
      if (contentItem.relatedArticles && contentItem.relatedArticles.length > 0) {
        const relatedItems = await Promise.all(
          contentItem.relatedArticles.map(id => contentApi.getContentById(id))
        );
        
        return relatedItems.filter(Boolean) as ContentItem[];
      }
      
      // Otherwise, find related content based on categories
      const allContent = await contentApi.getAllContent();
      
      const related = allContent
        .filter(item => 
          item.id !== contentId && // Not the same item
          item.category.some(cat => contentItem.category.includes(cat)) // Has matching category
        )
        .sort(() => Math.random() - 0.5) // Shuffle results
        .slice(0, limit);
      
      return related;
    } catch (error) {
      console.error('Error in getRelatedContent:', error);
      return [];
    }
  },
  
  /**
   * Fetch content from external APIs
   */
  fetchExternalContent: async (topics: string[] = []): Promise<ContentItem[]> => {
    console.log('🌍 Fetching content from external APIs for topics:', topics);
    
    try {
      // Use environment variables for API keys
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_EXTERNAL_API_KEY;
      
      if (!apiKey) {
        console.error('❌ No API key found in environment variables');
        throw new Error('API key is required for external content retrieval');
      }
      
      // Default topics if none provided
      const searchTopics = topics.length > 0 
        ? topics 
        : ['menopause', 'perimenopause', 'women health', 'nutrition', 'wellness', 'hormones'];
      
      console.log('🔍 Using search topics:', searchTopics);
      
      // Make request to external news/content API
      // Using NewsAPI.org as an example, but you can replace with any preferred API
      const topicQuery = searchTopics.join(' OR ');
      const apiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(topicQuery)}&language=en&sortBy=relevancy&pageSize=10`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`External API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log(`📊 Retrieved ${data.articles?.length || 0} articles from external API`);
      
      // Transform the API response to our ContentItem format
      const contentItems: ContentItem[] = (data.articles || []).map((article: any, index: number) => ({
        id: `ext-${index}-${Date.now()}`,
        title: article.title,
        description: article.description || 'No description available',
        category: extractCategories(article.title, article.description, searchTopics),
        type: article.urlToImage ? 'article' : 'video', // Assuming articles with images
        thumbnail: article.urlToImage || 'https://via.placeholder.com/300x200?text=Menopause+Resource',
        url: article.url,
        author: {
          name: article.author || 'Unknown Author',
          avatar: 'https://randomuser.me/api/portraits/women/44.jpg', // Placeholder
        },
        publishedDate: article.publishedAt,
        fullContent: article.content
      }));
      
      // Store in local storage for caching if needed
      localStorage.setItem('external_content_cache', JSON.stringify({
        timestamp: new Date().toISOString(),
        items: contentItems
      }));
      
      return contentItems;
    } catch (error) {
      console.error('❌ Error fetching external content:', error);
      
      // Try to get from cache if available
      const cachedContent = localStorage.getItem('external_content_cache');
      if (cachedContent) {
        const parsed = JSON.parse(cachedContent);
        console.log('⚠️ Using cached content from:', parsed.timestamp);
        return parsed.items;
      }
      
      return [];
    }
  },
  
  /**
   * Fetch content using OpenAI API or fallback to static content
   */
  fetchOpenAIContent: async (symptoms: string[] = []): Promise<ContentItem[]> => {
    console.log('🧠 Attempting to fetch content for symptoms:', symptoms);
    
    try {
      // Get OpenAI API key from environment variables
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      // If no API key, silently use fallback content instead of showing errors
      if (!apiKey) {
        console.log('No API key configured, using fallback content');
        return getStaticMenopauseContent(symptoms);
      }
      
      // Format the prompt based on the user's symptoms
      const userSymptoms = symptoms.length > 0 
        ? symptoms.join(', ') 
        : 'menopause in general';
      
      const prompt = `Find 5 high-quality articles or videos about menopause that would be helpful for someone experiencing: ${userSymptoms}.
The response must be a valid JSON object with the following exact structure:
{
  "resources": [
    {
      "title": "Article or Video Title",
      "description": "Brief description of the content",
      "url": "https://example.com/url-to-content",
      "content_type": "article",
      "categories": ["Category1", "Category2"],
      "author_name": "Author Name"
    },
    ...more resources
  ]
}

Each resource should include all the required fields as shown in the example. 
Make sure urls, titles, and descriptions are reasonable and directly relate to menopause and the symptoms provided.
Make sure categories are relevant to menopause symptoms.`;

      console.log('🔍 Using OpenAI to find personalized content');
      
      // Make request to OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo-0125", // Specifically using the JSON-optimized model
          messages: [
            { role: "system", content: "You are a helpful assistant that finds high-quality health information about menopause and returns it in the exact JSON format specified." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3 // Lower temperature for more consistent output
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ OpenAI API error:', errorData);
        throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }
      
      const data = await response.json();
      console.log('✅ Raw OpenAI response:', data);
      
      // Log and parse the content
      const contentText = data.choices[0].message.content;
      console.log('📄 OpenAI content text:', contentText);
      
      let content;
      try {
        content = JSON.parse(contentText);
        console.log('✅ Parsed OpenAI content:', content);
      } catch (parseError) {
        console.error('❌ Error parsing OpenAI response:', parseError);
        console.error('Response was:', contentText);
        throw new Error('Failed to parse OpenAI response');
      }
      
      // Make sure we have the expected structure
      if (!content.resources || !Array.isArray(content.resources)) {
        console.error('❌ Unexpected OpenAI response structure:', content);
        throw new Error('OpenAI response missing resources array');
      }
      
      // Transform to ContentItem format
      const contentItems: ContentItem[] = content.resources.map((item: any, index: number) => ({
        id: `openai-${index}-${Date.now()}`,
        title: item.title || 'Untitled Resource',
        description: item.description || 'No description available',
        category: Array.isArray(item.categories) ? item.categories : [userSymptoms],
        type: item.content_type?.toLowerCase() === 'video' ? 'video' : 'article',
        thumbnail: `https://source.unsplash.com/featured/?${encodeURIComponent(item.categories?.[0] || 'menopause')},health`,
        url: item.url || '#',
        author: {
          name: item.author_name || 'Health Expert',
          avatar: 'https://randomuser.me/api/portraits/women/44.jpg', // Placeholder
        },
        isOpenAIGenerated: true
      }));
      
      console.log('📊 Transformed to ContentItems:', contentItems);
      
      // Store in local storage for caching
      localStorage.setItem('openai_content_cache', JSON.stringify({
        timestamp: new Date().toISOString(),
        items: contentItems,
        symptoms: userSymptoms
      }));
      
      return contentItems;
    } catch (error) {
      console.error('Error fetching content:', error);
      // Use fallback content on error
      return getStaticMenopauseContent(symptoms);
    }
  },
  
  /**
   * Refresh all content, including external APIs
   */
  refreshAllContent: async (topics: string[] = []): Promise<ContentItem[]> => {
    try {
      console.log('🔄 Refreshing real-time content for topics:', topics);
      
      // Build search terms based on user symptoms
      const searchTerms = topics.length > 0 
        ? topics.map(t => t.toLowerCase()).join(" OR ") + " AND menopause"
        : "menopause OR perimenopause";
        
      console.log('🔍 Using search terms:', searchTerms);
      
      // Use NewsAPI to get real-time content
      const newsApiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchTerms)}&language=en&sortBy=publishedAt&pageSize=15`;
      
      console.log('📡 Fetching real-time data from NewsAPI...');
      
      const response = await fetch(newsApiUrl, {
        headers: {
          // Use free NewsAPI key for demo
          'X-Api-Key': '0b39a59ff7cd4391aa39f84738350e8c',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`NewsAPI error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`📊 Retrieved ${data.articles?.length || 0} real-time articles`);
      
      // Transform the API response to our ContentItem format
      const articles: ContentItem[] = (data.articles || []).map((article: any, index: number) => {
        // Extract categories from title and description
        const categories = extractCategories(article.title, article.description, topics);
        
        return {
          id: `news-${index}-${Date.now()}`,
          title: article.title || 'Untitled Article',
          description: article.description || 'No description available',
          category: categories,
          type: 'article',
          thumbnail: article.urlToImage || `https://source.unsplash.com/featured/?menopause,health&sig=${index}`,
          url: article.url,
          author: {
            name: article.author || article.source?.name || 'Health Source',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(article.author || 'Health Source')}&background=random`,
          },
          publishedDate: article.publishedAt
        };
      });
      
      // Add some video content from YouTube using a separate fetch
      const videoSearchTerm = topics.length > 0 
        ? `${topics[0]} menopause` 
        : "menopause health";
        
      console.log('🎬 Fetching real-time video content for:', videoSearchTerm);
      
      try {
        // Use the YouTube search endpoint to get real videos
        const youtubeResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&q=${encodeURIComponent(videoSearchTerm)}&type=video&key=AIzaSyDJMIejJulE-MTPBCUGVlRpOBdNI2VaU08`
        );
        
        if (youtubeResponse.ok) {
          const youtubeData = await youtubeResponse.json();
          
          if (youtubeData.items && youtubeData.items.length > 0) {
            console.log(`📺 Retrieved ${youtubeData.items.length} YouTube videos`);
            
            const videos: ContentItem[] = youtubeData.items.map((item: any, index: number) => {
              const categories = [...topics, 'Video Guide', 'Menopause'];
              
              return {
                id: `yt-${item.id.videoId}`,
                title: item.snippet.title || 'Menopause Video Guide',
                description: item.snippet.description || 'A video guide about menopause health and wellness',
                category: categories,
                type: 'video',
                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                duration: '5:30', // YouTube API doesn't provide duration in search results
                author: {
                  name: item.snippet.channelTitle || 'Health Expert',
                  avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.snippet.channelTitle || 'Health Expert')}&background=random`,
                }
              };
            });
            
            // Add videos to our content
            return [...articles, ...videos];
          }
        }
      } catch (videoError) {
        console.error('❌ Error fetching YouTube content, continuing with articles only:', videoError);
      }
      
      // If we have articles but no videos successfully fetched
      if (articles.length > 0) {
        console.log('✅ Returning real-time articles');
        return articles;
      }
      
      // If everything fails, use static content as fallback
      console.log('⚠️ Real-time content fetch failed, using fallback content');
      return getStaticMenopauseContent(topics);
    } catch (error) {
      console.error('❌ Error in refreshAllContent:', error);
      // Use fallback content on error
      return getStaticMenopauseContent(topics);
    }
  },

  // Add a testApiConnection function
  /**
   * Test the API connection
   */
  testApiConnection: async (): Promise<{ success: boolean, message: string, details?: any }> => {
    console.log('🧪 Testing API connection...');
    
    try {
      // First check if API key is configured
      const apiKey = checkApiKey();
      if (!apiKey) {
        return { 
          success: false, 
          message: 'OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.' 
        };
      }
      
      // Check network connectivity
      if (!navigator.onLine) {
        return { 
          success: false, 
          message: 'You appear to be offline. Please check your internet connection.' 
        };
      }
      
      // Make a minimal request to OpenAI API
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Check if the response is successful
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: 'OpenAI API connection successful!',
          details: {
            status: response.status,
            modelsAvailable: data.data?.length || 0
          }
        };
      } else {
        // Handle API error
        const errorData = await response.json();
        return {
          success: false,
          message: `OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`,
          details: errorData
        };
      }
    } catch (error) {
      // Handle network or other errors
      logApiError('testApiConnection', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error
      };
    }
  }
};

// Helper function to extract categories
function extractCategories(title: string, description: string, searchTopics: string[]): string[] {
  const combinedText = `${title} ${description}`.toLowerCase();
  
  // Extract categories based on keywords
  const foundCategories = searchTopics.filter(topic => 
    combinedText.includes(topic.toLowerCase())
  );
  
  // Add some default categories if none found
  if (foundCategories.length === 0) {
    if (combinedText.includes('hot flash') || combinedText.includes('night sweat')) {
      foundCategories.push('Hot Flashes');
    }
    if (combinedText.includes('sleep') || combinedText.includes('insomnia')) {
      foundCategories.push('Sleep');
    }
    if (combinedText.includes('mood') || combinedText.includes('anxiety') || combinedText.includes('depression')) {
      foundCategories.push('Mood');
    }
    if (combinedText.includes('nutrition') || combinedText.includes('diet') || combinedText.includes('food')) {
      foundCategories.push('Nutrition');
    }
  }
  
  // Always add at least one category
  if (foundCategories.length === 0) {
    foundCategories.push('Menopause');
  }
  
  return foundCategories;
}

// API status monitoring
export const apiStatus = {
  lastCheck: null as Date | null,
  isAvailable: false as boolean,
  error: null as string | null,
  
  /**
   * Check if the API is available and responding
   */
  checkStatus: async (): Promise<boolean> => {
    try {
      console.log('🔍 Checking API status...');
      
      // Try to fetch from static mock file first (for development)
      const response = await fetch('/api/content-fetch');
      
      if (!response.ok) {
        apiStatus.isAvailable = false;
        apiStatus.error = `API returned status: ${response.status}`;
        console.error('❌ API check failed:', apiStatus.error);
        return false;
      }
      
      // Parse the response
      const result = await response.json();
      
      // Update status
      apiStatus.isAvailable = true;
      apiStatus.error = null;
      apiStatus.lastCheck = new Date();
      
      console.log('✅ API is available:', { 
        timestamp: apiStatus.lastCheck,
        dataCount: result.data?.length || 0
      });
      
      return true;
    } catch (error) {
      apiStatus.isAvailable = false;
      apiStatus.error = error instanceof Error ? error.message : String(error);
      apiStatus.lastCheck = new Date();
      
      console.error('❌ API check error:', apiStatus.error);
      return false;
    }
  }
};

// Add these helper functions for better error handling

/**
 * Log a detailed API error
 */
function logApiError(source: string, error: any) {
  console.error(`❌ Error in ${source}:`, error);
  
  // Log additional info if it's a fetch error
  if (error instanceof Error) {
    console.error(`Error name: ${error.name}`);
    console.error(`Error message: ${error.message}`);
    console.error(`Error stack: ${error.stack}`);
  }
  
  // Check for network errors
  if (!navigator.onLine) {
    console.error("Network appears to be offline");
  }
}

/**
 * Check if the API key is configured
 */
function checkApiKey(): string | null {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ No OpenAI API key found in environment variables!');
    console.error('Please add VITE_OPENAI_API_KEY to your .env file');
    
    // Add this for better debugging
    console.log('Environment variables available:', Object.keys(import.meta.env)
      .filter(key => key.startsWith('VITE_'))
      .map(key => `${key}: ${key.includes('KEY') ? '[REDACTED]' : import.meta.env[key]}`));
      
    return null;
  }
  
  return apiKey;
}

// Add a helper function for static content that doesn't require API keys
function getStaticMenopauseContent(symptoms: string[] = []): ContentItem[] {
  console.log('📚 Using high-quality static menopause content');
  
  // Create a collection of quality content about menopause
  const allContent: ContentItem[] = [
    // Articles
    {
      id: 'static-1',
      title: 'Understanding Hot Flashes During Menopause',
      description: 'Learn about the causes of hot flashes and effective strategies to manage this common symptom.',
      category: ['Hot Flashes', 'Symptoms', 'Management'],
      type: 'article',
      thumbnail: 'https://images.unsplash.com/photo-1559090286-36796926e134',
      url: 'https://www.mayoclinic.org/diseases-conditions/hot-flashes/symptoms-causes/syc-20352790',
      author: {
        name: 'Mayo Clinic',
        avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      }
    },
    {
      id: 'static-2',
      title: 'Sleep Problems and Menopause: What Can You Do?',
      description: 'Discover practical tips for managing sleep disturbances during the menopausal transition.',
      category: ['Sleep', 'Insomnia', 'Wellness'],
      type: 'article',
      thumbnail: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55',
      url: 'https://www.sleepfoundation.org/women-sleep/menopause-and-sleep',
      author: {
        name: 'Sleep Foundation',
        avatar: 'https://randomuser.me/api/portraits/women/22.jpg',
      }
    },
    {
      id: 'static-3',
      title: 'Nutrition and Dietary Changes for Menopause',
      description: 'Learn about important nutritional considerations and dietary changes that can help manage menopause symptoms.',
      category: ['Nutrition', 'Diet', 'Wellness'],
      type: 'article',
      thumbnail: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352',
      url: 'https://www.nia.nih.gov/health/managing-menopause-symptoms-nutrition',
      author: {
        name: 'National Institute on Aging',
        avatar: 'https://randomuser.me/api/portraits/women/67.jpg',
      }
    },
    {
      id: 'static-4',
      title: 'Managing Mood Changes During Menopause',
      description: 'Strategies for handling anxiety, depression, and mood swings that can occur during menopause.',
      category: ['Mood', 'Mental Health', 'Anxiety'],
      type: 'article',
      thumbnail: 'https://images.unsplash.com/photo-1493836512294-502baa1986e2',
      url: 'https://www.womenshealth.gov/menopause/menopause-mental-health',
      author: {
        name: 'Office on Women\'s Health',
        avatar: 'https://randomuser.me/api/portraits/women/32.jpg',
      }
    },
    {
      id: 'static-5',
      title: 'Exercise Recommendations for Menopausal Women',
      description: 'The best types of physical activity to maintain health and manage symptoms during menopause.',
      category: ['Exercise', 'Fitness', 'Wellness'],
      type: 'article',
      thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
      url: 'https://www.health.harvard.edu/womens-health/exercise-and-menopause',
      author: {
        name: 'Harvard Health',
        avatar: 'https://randomuser.me/api/portraits/women/12.jpg',
      }
    },
    {
      id: 'static-6',
      title: 'Understanding Hormone Replacement Therapy',
      description: 'A comprehensive overview of HRT options, benefits, and risks for menopausal symptom management.',
      category: ['Treatment', 'HRT', 'Medical'],
      type: 'article',
      thumbnail: 'https://images.unsplash.com/photo-1579154341098-e4e158cc7f55',
      url: 'https://www.menopause.org/for-women/menopause-treatment',
      author: {
        name: 'North American Menopause Society',
        avatar: 'https://randomuser.me/api/portraits/women/59.jpg',
      }
    },
    {
      id: 'static-7',
      title: 'Coping with Brain Fog During Menopause',
      description: 'Practical strategies for dealing with cognitive changes that can occur during the menopausal transition.',
      category: ['Brain Fog', 'Cognitive', 'Memory'],
      type: 'article',
      thumbnail: 'https://images.unsplash.com/photo-1551076805-e1869033e561',
      url: 'https://www.health.harvard.edu/blog/what-is-menopausal-brain-fog-and-what-can-you-do-about-it-202209262819',
      author: {
        name: 'Harvard Health',
        avatar: 'https://randomuser.me/api/portraits/women/18.jpg',
      }
    },
    {
      id: 'static-8',
      title: 'Vaginal Dryness and Painful Sex During Menopause',
      description: 'How to address common intimate symptoms that can affect quality of life during perimenopause and menopause.',
      category: ['Vaginal Dryness', 'Intimate Health', 'Discomfort'],
      type: 'article',
      thumbnail: 'https://images.unsplash.com/photo-1591343395082-e120087004b4',
      url: 'https://www.menopause.org/for-women/sexual-health-menopause-online/sexual-problems-at-midlife/vaginal-dryness',
      author: {
        name: 'North American Menopause Society',
        avatar: 'https://randomuser.me/api/portraits/women/62.jpg',
      }
    },
    
    // Videos
    {
      id: 'static-video-1',
      title: 'Managing Hot Flashes - Expert Video Guide',
      description: 'Watch this expert video on understanding and managing hot flashes during menopause with practical tips and strategies.',
      category: ['Hot Flashes', 'Symptoms', 'Management', 'Video Guide'],
      type: 'video',
      thumbnail: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef',
      url: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4',
      duration: '3:45',
      author: {
        name: 'Dr. Sarah Johnson',
        avatar: 'https://randomuser.me/api/portraits/women/36.jpg',
      }
    },
    {
      id: 'static-video-2',
      title: 'Sleep Better During Menopause',
      description: 'A comprehensive video guide to improving sleep quality during perimenopause and menopause.',
      category: ['Sleep', 'Insomnia', 'Wellness', 'Video Guide'],
      type: 'video',
      thumbnail: 'https://images.unsplash.com/photo-1455642305367-68834a1f2d6b',
      url: 'https://samplelib.com/lib/preview/mp4/sample-10s.mp4',
      duration: '5:20',
      author: {
        name: 'Sleep Science Institute',
        avatar: 'https://randomuser.me/api/portraits/women/79.jpg',
      }
    },
    {
      id: 'static-video-3',
      title: 'Anxiety Management Techniques',
      description: 'Learn effective breathing and mindfulness techniques to manage anxiety and mood swings during menopause.',
      category: ['Anxiety', 'Mental Health', 'Wellness', 'Video Guide'],
      type: 'video',
      thumbnail: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773',
      url: 'https://samplelib.com/lib/preview/mp4/sample-15s.mp4',
      duration: '7:15',
      author: {
        name: 'Dr. Emma Roberts',
        avatar: 'https://randomuser.me/api/portraits/women/51.jpg',
      }
    },
    {
      id: 'static-video-4',
      title: 'Strength Training for Menopause',
      description: 'Key exercises to maintain bone density and muscle mass during and after menopause.',
      category: ['Exercise', 'Fitness', 'Bone Health', 'Video Guide'],
      type: 'video',
      thumbnail: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438',
      url: 'https://samplelib.com/lib/preview/mp4/sample-20s.mp4',
      duration: '12:30',
      author: {
        name: 'Fitness Over Fifty',
        avatar: 'https://randomuser.me/api/portraits/women/29.jpg',
      }
    },
    {
      id: 'static-video-5',
      title: 'Nutrition Tips for Managing Menopause',
      description: 'Learn about the best foods and dietary approaches to help manage menopause symptoms naturally.',
      category: ['Nutrition', 'Diet', 'Natural Remedies', 'Video Guide'],
      type: 'video',
      thumbnail: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
      url: 'https://samplelib.com/lib/preview/mp4/sample-30s.mp4',
      duration: '8:45',
      author: {
        name: 'Nutrition for Women',
        avatar: 'https://randomuser.me/api/portraits/women/33.jpg',
      }
    },
    {
      id: 'static-video-6',
      title: 'Understanding Hormone Replacement Therapy (HRT)',
      description: 'A doctor explains the benefits, risks and latest research on hormone replacement therapy for menopause.',
      category: ['HRT', 'Treatment', 'Medical', 'Video Guide'],
      type: 'video',
      thumbnail: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c',
      url: 'https://samplelib.com/lib/preview/mp4/sample-15s.mp4',
      duration: '14:20',
      author: {
        name: 'Dr. Michelle Chang',
        avatar: 'https://randomuser.me/api/portraits/women/56.jpg',
      }
    },
    {
      id: 'static-video-7',
      title: 'Yoga for Menopause Symptom Relief',
      description: 'Gentle yoga poses specifically designed to help with hot flashes, mood swings, and sleep disruption.',
      category: ['Yoga', 'Exercise', 'Relaxation', 'Video Guide'],
      type: 'video',
      thumbnail: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773',
      url: 'https://samplelib.com/lib/preview/mp4/sample-20s.mp4',
      duration: '18:30',
      author: {
        name: 'Yoga for Midlife',
        avatar: 'https://randomuser.me/api/portraits/women/89.jpg',
      }
    },
    {
      id: 'static-video-8',
      title: 'Managing Energy Levels During Menopause',
      description: 'Practical strategies for boosting energy and combating fatigue that often comes with perimenopause and menopause.',
      category: ['Energy', 'Fatigue', 'Vitality', 'Video Guide'],
      type: 'video',
      thumbnail: 'https://images.unsplash.com/photo-1483546416237-76fd26bbcdd1',
      url: 'https://samplelib.com/lib/preview/mp4/sample-10s.mp4',
      duration: '9:15',
      author: {
        name: 'Wellness Energetics',
        avatar: 'https://randomuser.me/api/portraits/women/42.jpg',
      }
    }
  ];
  
  console.log(`📊 Static content includes ${allContent.filter(item => item.type === 'video').length} videos and ${allContent.filter(item => item.type === 'article').length} articles`);
  
  // If there are symptoms specified, filter content to match them
  if (symptoms && symptoms.length > 0) {
    // Convert symptoms to lowercase for case-insensitive matching
    const lowerSymptoms = symptoms.map(s => s.toLowerCase());
    console.log('🔍 Filtering content for symptoms:', symptoms);
    
    // Filter content based on matching categories to symptoms with more flexible matching
    const matchedContent = allContent.filter(item => {
      const lowerCategories = item.category.map(c => c.toLowerCase());
      
      // Check if any symptom matches any category (or vice versa)
      return lowerSymptoms.some(symptom => 
        lowerCategories.some(category => 
          category.includes(symptom) || 
          symptom.includes(category) ||
          symptomAlternativeMatches(symptom, category)
        )
      );
    });
    
    console.log(`📊 Matched ${matchedContent.length} items based on symptoms`);
    console.log(`📊 Matched content breakdown: ${matchedContent.filter(item => item.type === 'video').length} videos and ${matchedContent.filter(item => item.type === 'article').length} articles`);
    
    // Always ensure we have at least 3 items with a mix of videos and articles
    if (matchedContent.length < 3) {
      console.log('⚠️ Not enough matched content, including additional relevant items');
      // Add some generally relevant items from the main collection
      const additionalItems = allContent
        .filter(item => !matchedContent.some(matched => matched.id === item.id))
        .slice(0, 6 - matchedContent.length);
      
      const finalContent = [...matchedContent, ...additionalItems];
      console.log(`📊 Final content count: ${finalContent.length} (${finalContent.filter(item => item.type === 'video').length} videos, ${finalContent.filter(item => item.type === 'article').length} articles)`);
      return finalContent;
    }
    
    return matchedContent;
  }
  
  // If no symptoms or no matches, return all content
  console.log(`📊 Returning all content: ${allContent.length} items`);
  return allContent;
}

// Helper function to match alternative symptom names
function symptomAlternativeMatches(symptom: string, category: string): boolean {
  // Map common symptom variations for more flexible matching
  const symptomMap: Record<string, string[]> = {
    'hot flash': ['hot flashes', 'night sweats', 'temperature', 'overheating'],
    'sleep': ['insomnia', 'sleep quality', 'rest', 'fatigue', 'tired'],
    'mood': ['anxiety', 'depression', 'irritability', 'mental health'],
    'memory': ['brain fog', 'concentration', 'cognitive', 'forgetfulness'],
    'energy': ['fatigue', 'tired', 'exhaustion', 'vitality'],
    'anxiety': ['stress', 'worry', 'mood', 'mental health'],
    'vaginal': ['dryness', 'intimate health', 'discomfort', 'painful sex']
  };
  
  // Check if any mapped terms match
  for (const [key, alternatives] of Object.entries(symptomMap)) {
    if (symptom.includes(key) || key.includes(symptom)) {
      if (alternatives.some(alt => category.includes(alt) || alt.includes(category))) {
        return true;
      }
    }
  }
  
  return false;
}

export default api; 