
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
      return scrapedArticles.map(article => {
        const year = article.publishedDate 
          ? new Date(article.publishedDate).getFullYear().toString()
          : new Date().getFullYear().toString();
          
        return {
          id: article.url.split('/').pop() || crypto.randomUUID().substring(0, 8),
          title: article.title || 'Research Article',
          source: article.siteName || getDomainFromUrl(article.url),
          year: year,
          authors: article.author || 'Health Researchers',
          summary: article.description || article.title,
          url: article.url,
          type: 'research'
        };
      });
    }
    
    // If no results from Firecrawl, try PubMed and Semantic Scholar APIs
    const [pubmedData, semanticScholarData] = await Promise.all([
      fetchPubMedData(searchTerm, Math.ceil(limit / 2)),
      fetchSemanticScholarData(searchTerm, Math.ceil(limit / 2))
    ]);
    
    const combinedResults = [...pubmedData, ...semanticScholarData];
    
    // Return actual API data or empty array, not fallback data
    return combinedResults;
  } catch (error) {
    console.error('Error fetching research with Firecrawl:', error);
    // Try other APIs
    const [pubmedData, semanticScholarData] = await Promise.all([
      fetchPubMedData(searchTerm, Math.ceil(limit / 2)),
      fetchSemanticScholarData(searchTerm, Math.ceil(limit / 2))
    ]);
    
    const combinedResults = [...pubmedData, ...semanticScholarData];
    
    // Return actual API data or empty array, not fallback data
    return combinedResults;
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
      return scrapedVideos.map(video => {
        const year = video.publishedDate 
          ? new Date(video.publishedDate).getFullYear().toString()
          : new Date().getFullYear().toString();
          
        return {
          id: video.url.split('v=')[1] || crypto.randomUUID().substring(0, 8),
          title: video.title || 'Video on Menopause',
          channel: video.author || getDomainFromUrl(video.url),
          year: year,
          summary: video.description || video.title,
          url: video.url,
          thumbnail: video.thumbnail || "",
          type: 'video'
        };
      });
    }
    
    // Return empty array - no fallbacks
    return [];
  } catch (error) {
    console.error('Error fetching videos with Firecrawl:', error);
    // Return empty array instead of fallback data
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

// Fetch data from PubMed using eUtils API
async function fetchPubMedData(searchTerm: string, limit: number) {
  try {
    // First, search for IDs
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(searchTerm)}&retmode=json&retmax=${limit}&sort=date`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    if (!searchData.esearchresult?.idlist?.length) {
      return [];
    }
    
    // Then, get details for those IDs
    const ids = searchData.esearchresult.idlist.join(',');
    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids}&retmode=json`;
    
    const summaryResponse = await fetch(summaryUrl);
    const summaryData = await summaryResponse.json();
    
    if (!summaryData.result) {
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
    
    return results;
  } catch (error) {
    console.error('Error fetching PubMed data:', error);
    return [];
  }
}

// Fetch data from Semantic Scholar
async function fetchSemanticScholarData(searchTerm: string, limit: number) {
  try {
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(searchTerm)}&limit=${limit}&fields=title,authors,year,url,abstract`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }
    
    return data.data.map(paper => {
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
  } catch (error) {
    console.error('Error fetching Semantic Scholar data:', error);
    return [];
  }
}
