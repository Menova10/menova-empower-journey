import React, { useState, useEffect } from 'react';
import { Play, ExternalLink } from 'lucide-react';

interface SimpleYouTubeVideosProps {
  maxVideos?: number;
}

// YouTube API configuration  
const YOUTUBE_API_KEY = 'AIzaSyAuADSwSw95dF4d57eVGHVLDU-OxDg9eos';
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3/search';

// Search topics for menopause-related content
const SEARCH_TOPICS = [
  'Menopause health tips',
  'Perimenopause symptoms',
  'Menopause nutrition',
  'Postmenopause wellness',
  'Perimenopause yoga'
];

// Video interface
interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  url: string;
  topic: string;
}

const SimpleYouTubeVideos: React.FC<SimpleYouTubeVideosProps> = ({ maxVideos = 3 }) => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch videos from YouTube API
  const fetchYouTubeVideos = async (topic: string): Promise<YouTubeVideo[]> => {
    try {
      const response = await fetch(
        `${YOUTUBE_API_BASE_URL}?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(topic)}&key=${YOUTUBE_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.items?.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        topic: topic
      })) || [];
    } catch (error) {
      console.error(`Error fetching videos for topic "${topic}":`, error);
      return [];
    }
  };

  // Fetch all videos on component mount
  useEffect(() => {
    const fetchAllVideos = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const allVideos: YouTubeVideo[] = [];
        
        // Fetch videos for each topic
        for (const topic of SEARCH_TOPICS) {
          const topicVideos = await fetchYouTubeVideos(topic);
          allVideos.push(...topicVideos);
        }
        
        // Remove duplicates and limit results
        const uniqueVideos = allVideos.filter((video, index, self) => 
          index === self.findIndex(v => v.id === video.id)
        );
        
        setVideos(uniqueVideos.slice(0, maxVideos));
      } catch (err) {
        console.error('Error loading videos:', err);
        setError('Failed to load videos');
      } finally {
        setLoading(false);
      }
    };

    fetchAllVideos();
  }, [maxVideos]);

  // Helper function to truncate text
  const truncateText = (text: string, maxLength: number): string => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(maxVideos)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-gray-200 h-12 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No videos available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {videos.map((video) => (
        <div key={video.id} className="group">
          <div 
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-menova-green/20"
            onClick={() => window.open(video.url, '_blank')}
          >
            {/* Video Thumbnail */}
            <div className="relative flex-shrink-0">
              <img 
                src={video.thumbnail} 
                alt={video.title}
                className="w-16 h-12 object-cover rounded bg-gray-200"
              />
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="h-4 w-4 text-white fill-white" />
              </div>
            </div>
            
            {/* Video Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 leading-tight mb-2 group-hover:text-menova-green transition-colors line-clamp-2">
                {truncateText(video.title, 80)}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {video.channelTitle}
              </p>
            </div>
            
            {/* External link indicator */}
            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="h-4 w-4 text-menova-green" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SimpleYouTubeVideos; 