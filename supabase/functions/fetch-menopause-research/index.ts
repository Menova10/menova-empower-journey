
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    
    // Fetch data from multiple sources concurrently
    const [pubmedData, semanticScholarData, youtubeData] = await Promise.all([
      fetchPubMedData(searchTerm, limit),
      fetchSemanticScholarData(searchTerm, limit),
      fetchYoutubeVideos(searchTerm, limit)
    ]);

    return new Response(
      JSON.stringify({
        research: [...pubmedData, ...semanticScholarData],
        videos: youtubeData
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

// Fetch videos from YouTube (simulated/mocked - need YouTube API key for actual implementation)
async function fetchYoutubeVideos(searchTerm: string, limit: number) {
  try {
    // NOTE: In a real implementation, you would call the YouTube API using an API key
    // Since this is a demo, we're using a proxy/mock approach
    
    // Simple API using SerpAPI alternative or proxy
    const url = `https://serpapi.com/search.json?engine=youtube&search_query=${encodeURIComponent(searchTerm)}&api_key=mock_key`;
    
    // Since we don't have a real API key, mock the response
    // In production, you would replace this with an actual fetch call:
    // const response = await fetch(url);
    // const data = await response.json();
    
    // Mock data structure similar to what YouTube API would return
    const mockVideos = [
      {
        id: 'video1',
        title: 'Understanding Perimenopause: Latest Research',
        channel: 'Mayo Clinic',
        year: '2023',
        summary: 'Experts discuss the latest research on managing perimenopause symptoms.',
        url: 'https://www.youtube.com/watch?v=example1',
        thumbnail: 'https://i.ytimg.com/vi/example1/mqdefault.jpg',
        type: 'video'
      },
      {
        id: 'video2',
        title: 'Hormone Therapy Options in Menopause',
        channel: 'Cleveland Clinic',
        year: '2022',
        summary: 'A detailed look at hormone therapy options for menopause based on recent clinical trials.',
        url: 'https://www.youtube.com/watch?v=example2',
        thumbnail: 'https://i.ytimg.com/vi/example2/mqdefault.jpg',
        type: 'video'
      },
      {
        id: 'video3',
        title: 'Mental Health Through Menopause Transition',
        channel: 'North American Menopause Society',
        year: '2023',
        summary: 'Strategies for maintaining mental wellness during menopause based on new research.',
        url: 'https://www.youtube.com/watch?v=example3',
        thumbnail: 'https://i.ytimg.com/vi/example3/mqdefault.jpg',
        type: 'video'
      }
    ];
    
    return mockVideos.slice(0, limit);
  } catch (error) {
    console.error('Error fetching YouTube data:', error);
    return [];
  }
}
