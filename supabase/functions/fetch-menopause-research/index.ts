
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getImagesFromFirecrawl, scrapeContentWithFirecrawl } from "../_shared/firecrawl.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic = "menopause", phase = "perimenopause", limit = 5 } = await req.json();
    
    // Combine the search terms
    const searchTerm = `${topic} ${phase} menopause women health`;
    
    // Fetch data from multiple sources using Firecrawl
    console.log(`Fetching research data for: ${searchTerm}`);
    
    // Check for API keys
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    console.log(`Firecrawl API key available: ${firecrawlApiKey ? 'Yes' : 'No'}`);
    
    // Fetch research articles using Firecrawl
    const researchPromise = fetchResearchWithFirecrawl(searchTerm, limit);
    
    // Fetch videos using Firecrawl
    const videosPromise = fetchVideosWithFirecrawl(searchTerm, limit);
    
    // Wait for both promises to resolve
    const [research, videos] = await Promise.all([researchPromise, videosPromise]);
    
    console.log(`Found ${research.length} research articles and ${videos.length} videos`);

    return new Response(
      JSON.stringify({
        research,
        videos
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Research-Source': research.some(item => item.isOpenAIGenerated) ? 'openai' : 'firecrawl',
          'X-Videos-Source': videos.some(item => item.isOpenAIGenerated) ? 'openai' : 'firecrawl'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching research data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Fetch research articles using Firecrawl
async function fetchResearchWithFirecrawl(searchTerm: string, limit: number) {
  try {
    // Use Firecrawl to fetch research articles from medical sources with updated API format
    console.log(`Fetching research articles for: ${searchTerm}`);
    
    // Use the updated scrapeContentWithFirecrawl helper from _shared/firecrawl.ts
    const scrapedArticles = await scrapeContentWithFirecrawl(searchTerm, 'article', limit);
    
    // If Firecrawl returns results, process them
    if (scrapedArticles && Array.isArray(scrapedArticles) && scrapedArticles.length > 0) {
      console.log(`Firecrawl returned ${scrapedArticles.length} research articles`);
      return scrapedArticles.map(article => {
        const year = article.publishedDate 
          ? new Date(article.publishedDate).getFullYear().toString()
          : new Date().getFullYear().toString();
          
        return {
          id: article.id || article.url?.split('/').pop() || crypto.randomUUID().substring(0, 8),
          title: article.title || 'Research Article',
          source: article.siteName || getDomainFromUrl(article.url),
          year: year,
          authors: article.author || 'Health Researchers',
          summary: article.description || article.title,
          url: article.url,
          type: 'research',
          isOpenAIGenerated: article.isOpenAIGenerated || false,
          isStaticFallback: article.isStaticFallback || false
        };
      });
    } else {
      console.log('No research articles returned from Firecrawl, trying OpenAI');
    }
    
    // Try OpenAI for research generation
    const openaiResearch = await generateResearchWithOpenAI(searchTerm, limit);
    
    // If OpenAI returns results, use them
    if (openaiResearch && openaiResearch.length > 0) {
      console.log(`Generated ${openaiResearch.length} research articles with OpenAI`);
      return openaiResearch;
    }
    
    // If no results from OpenAI either, try PubMed and Semantic Scholar APIs as final fallback
    console.log("No OpenAI results, trying PubMed and Semantic Scholar APIs");
    const [pubmedData, semanticScholarData] = await Promise.all([
      fetchPubMedData(searchTerm, Math.ceil(limit / 2)),
      fetchSemanticScholarData(searchTerm, Math.ceil(limit / 2))
    ]);
    
    const combinedResults = [...pubmedData, ...semanticScholarData];
    console.log(`Alternative APIs returned ${combinedResults.length} research items`);
    
    return combinedResults;
  } catch (error) {
    console.error('Error fetching research with Firecrawl:', error);
    
    // Try OpenAI for research generation
    try {
      const openaiResearch = await generateResearchWithOpenAI(searchTerm, limit);
      
      // If OpenAI returns results, use them
      if (openaiResearch && openaiResearch.length > 0) {
        console.log(`Generated ${openaiResearch.length} research articles with OpenAI after Firecrawl error`);
        return openaiResearch;
      }
    } catch (openaiError) {
      console.error('Error generating research with OpenAI:', openaiError);
    }
    
    // Try other APIs as last resort
    console.log('Trying alternative research APIs after errors');
    const [pubmedData, semanticScholarData] = await Promise.all([
      fetchPubMedData(searchTerm, Math.ceil(limit / 2)),
      fetchSemanticScholarData(searchTerm, Math.ceil(limit / 2))
    ]);
    
    const combinedResults = [...pubmedData, ...semanticScholarData];
    console.log(`Alternative APIs returned ${combinedResults.length} research items after error`);
    
    return combinedResults;
  }
}

// Use OpenAI to generate research article listings
async function generateResearchWithOpenAI(searchTerm: string, limit: number): Promise<any[]> {
  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiApiKey) {
      console.warn("OPENAI_API_KEY not found in environment variables");
      return [];
    }
    
    console.log(`Generating research articles about "${searchTerm}" using OpenAI`);
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: `You are an expert on women's health, particularly menopause and perimenopause. Create ${limit} detailed research article listings about "${searchTerm}". Each should include title, summary, source (medical journal or institution), authors, year (between 2020-2024), and URL. Make them scientifically accurate, focusing on recent findings and clinical relevance.` 
          },
          { 
            role: "user", 
            content: `Please generate ${limit} recent research article listings related to "${searchTerm}" in the context of women's health and menopause. Format as JSON array with objects containing: id, title, source, year, authors, summary, and url fields. Make them realistic, as if from actual medical journals.` 
          }
        ],
        response_format: { type: "json_object" }
      })
    });
    
    if (!response.ok) {
      console.error(`OpenAI API error: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    let articles;
    
    try {
      articles = JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      return [];
    }
    
    console.log(`Successfully generated ${articles.articles?.length || 0} research articles with OpenAI`);
    
    if (articles && articles.articles && Array.isArray(articles.articles)) {
      return articles.articles.map(article => ({
        id: article.id || crypto.randomUUID().substring(0, 8),
        title: article.title,
        source: article.source,
        year: article.year,
        authors: article.authors,
        summary: article.summary,
        url: article.url || `https://doi.org/${crypto.randomUUID().substring(0, 8)}`,
        type: 'research',
        isOpenAIGenerated: true
      }));
    }
    
    return [];
  } catch (error) {
    console.error(`Error generating research with OpenAI: ${error}`);
    return [];
  }
}

// Fetch videos using Firecrawl
async function fetchVideosWithFirecrawl(searchTerm: string, limit: number) {
  try {
    // Use Firecrawl to fetch YouTube videos with updated API format
    console.log(`Fetching videos for: ${searchTerm}`);
    
    // Use the updated scrapeContentWithFirecrawl helper from _shared/firecrawl.ts with type 'video'
    const scrapedVideos = await scrapeContentWithFirecrawl(searchTerm, 'video', limit);
    
    // If Firecrawl returns results, process them
    if (scrapedVideos && Array.isArray(scrapedVideos) && scrapedVideos.length > 0) {
      console.log(`Firecrawl returned ${scrapedVideos.length} videos`);
      return scrapedVideos.map(video => {
        const year = video.publishedDate 
          ? new Date(video.publishedDate).getFullYear().toString()
          : new Date().getFullYear().toString();
          
        return {
          id: video.id || video.url?.split('v=')[1] || crypto.randomUUID().substring(0, 8),
          title: video.title || 'Video on Menopause',
          channel: video.author || getDomainFromUrl(video.url),
          year: year,
          summary: video.description || video.title,
          url: video.url,
          thumbnail: video.thumbnail || "",
          type: 'video',
          isOpenAIGenerated: video.isOpenAIGenerated || false,
          isStaticFallback: video.isStaticFallback || false
        };
      });
    } else {
      console.log('No videos returned from Firecrawl, trying OpenAI');
    }
    
    // Try to generate video listings with OpenAI
    const openaiVideos = await generateVideosWithOpenAI(searchTerm, limit);
    
    console.log(`Generated ${openaiVideos.length} videos with OpenAI`);
    return openaiVideos;
  } catch (error) {
    console.error('Error fetching videos with Firecrawl:', error);
    
    // Try to generate video listings with OpenAI as fallback
    try {
      const openaiVideos = await generateVideosWithOpenAI(searchTerm, limit);
      console.log(`Generated ${openaiVideos.length} videos with OpenAI after Firecrawl error`);
      return openaiVideos;
    } catch (openaiError) {
      console.error('Error generating videos with OpenAI:', openaiError);
      // Return empty array - no other fallbacks for videos
      return [];
    }
  }
}

// Use OpenAI to generate video listings
async function generateVideosWithOpenAI(searchTerm: string, limit: number): Promise<any[]> {
  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiApiKey) {
      console.warn("OPENAI_API_KEY not found in environment variables");
      return [];
    }
    
    console.log(`Generating video listings about "${searchTerm}" using OpenAI`);
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: `You are an expert on women's health, particularly menopause and perimenopause. Create ${limit} realistic YouTube video listings about "${searchTerm}". Each should include title, channel name, summary description, publication year (between 2020-2024), and a plausible YouTube URL. Make them informative and educational.` 
          },
          { 
            role: "user", 
            content: `Please generate ${limit} educational video listings related to "${searchTerm}" in the context of women's health and menopause. Format as JSON array with objects containing: id, title, channel, year, summary, url, and thumbnail fields. Make them realistic, as if from actual YouTube videos by medical experts.` 
          }
        ],
        response_format: { type: "json_object" }
      })
    });
    
    if (!response.ok) {
      console.error(`OpenAI API error: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    let videos;
    
    try {
      videos = JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      return [];
    }
    
    console.log(`Successfully generated ${videos.videos?.length || 0} video listings with OpenAI`);
    
    if (videos && videos.videos && Array.isArray(videos.videos)) {
      // Get topic images for thumbnails
      const thumbnailPromises = videos.videos.map(async (video) => {
        if (!video.thumbnail) {
          try {
            const images = await getImagesFromFirecrawl(`${video.title} menopause`, 1);
            return images[0] || getTopicImage(searchTerm);
          } catch (e) {
            return getTopicImage(searchTerm);
          }
        }
        return video.thumbnail;
      });
      
      const thumbnails = await Promise.all(thumbnailPromises);
      
      return videos.videos.map((video, index) => ({
        id: video.id || `video_${crypto.randomUUID().substring(0, 8)}`,
        title: video.title,
        channel: video.channel,
        year: video.year,
        summary: video.summary,
        url: video.url || `https://www.youtube.com/watch?v=${crypto.randomUUID().substring(0, 11)}`,
        thumbnail: thumbnails[index],
        type: 'video',
        isOpenAIGenerated: true
      }));
    }
    
    return [];
  } catch (error) {
    console.error(`Error generating videos with OpenAI: ${error}`);
    return [];
  }
}

// Helper to extract domain from URL
function getDomainFromUrl(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
  } catch (e) {
    return 'Source';
  }
}

// Helper to get topic image when needed
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
    'research': 'https://images.unsplash.com/photo-1532094349884-543bc11b234d',
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

// Fetch data from PubMed using eUtils API
async function fetchPubMedData(searchTerm: string, limit: number) {
  try {
    console.log(`Fetching PubMed data for: ${searchTerm}, limit: ${limit}`);
    // First, search for IDs
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(searchTerm)}&retmode=json&retmax=${limit}&sort=date`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    if (!searchData.esearchresult?.idlist?.length) {
      console.log('No PubMed IDs found');
      return [];
    }
    
    // Then, get details for those IDs
    const ids = searchData.esearchresult.idlist.join(',');
    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids}&retmode=json`;
    
    const summaryResponse = await fetch(summaryUrl);
    const summaryData = await summaryResponse.json();
    
    if (!summaryData.result) {
      console.log('No PubMed summary data found');
      return [];
    }
    
    // Filter out the UID key
    const results = Object.keys(summaryData.result)
      .filter(key => key !== 'uids')
      .map(id => {
        const article = summaryData.result[id];
        const pubDate = article.pubdate;
        const pubYear = typeof pubDate === 'string' ? pubDate.split(' ')[0] : 'Unknown';
        
        return {
          id,
          title: article.title,
          source: 'PubMed',
          year: pubYear,
          authors: article.authors?.map(author => author.name).join(', ') || 'Unknown',
          summary: article.title,
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          type: 'research'
        };
      });
    
    console.log(`PubMed returned ${results.length} articles`);
    return results;
  } catch (error) {
    console.error('Error fetching PubMed data:', error);
    return [];
  }
}

// Fetch data from Semantic Scholar
async function fetchSemanticScholarData(searchTerm: string, limit: number) {
  try {
    console.log(`Fetching Semantic Scholar data for: ${searchTerm}, limit: ${limit}`);
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(searchTerm)}&limit=${limit}&fields=title,authors,year,url,abstract`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      console.log('No Semantic Scholar data found');
      return [];
    }
    
    const results = data.data.map(paper => {
      return {
        id: paper.paperId,
        title: paper.title,
        source: 'Semantic Scholar',
        year: paper.year?.toString() || 'Unknown',
        authors: paper.authors?.map(author => author.name).join(', ') || 'Unknown',
        summary: paper.abstract?.slice(0, 150) + '...' || paper.title,
        url: paper.url,
        type: 'research'
      };
    });
    
    console.log(`Semantic Scholar returned ${results.length} articles`);
    return results;
  } catch (error) {
    console.error('Error fetching Semantic Scholar data:', error);
    return [];
  }
}
