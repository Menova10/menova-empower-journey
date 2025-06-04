import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, ExternalLink, RefreshCw, ChevronDown, User, Settings, LogOut, AlertCircle, BookOpen, Headphones, Video, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import MeNovaLogo from '@/components/MeNovaLogo';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Resource } from '@/types/resources';
import { fetchResources } from '@/lib/resources';

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

// Update the UserSymptom interface
interface UserSymptom {
  symptom: string;
  intensity: number;
  recorded_at: string;
}

interface SymptomMatch {
  resource: Resource | YouTubeVideo;
  matchScore: number;
}

// Topic color mapping
const getTopicColor = (topic: string): string => {
  const colorMap: { [key: string]: string } = {
    'Menopause health tips': 'bg-emerald-100 text-emerald-800',
    'Perimenopause symptoms': 'bg-blue-100 text-blue-800',
    'Menopause nutrition': 'bg-orange-100 text-orange-800',
    'Postmenopause wellness': 'bg-purple-100 text-purple-800',
    'Perimenopause yoga': 'bg-pink-100 text-pink-800',
    'article': 'bg-blue-100 text-blue-800',
    'video': 'bg-red-100 text-red-800',
    'podcast': 'bg-purple-100 text-purple-800',
    'guide': 'bg-green-100 text-green-800'
  };
  return colorMap[topic] || 'bg-gray-100 text-gray-800';
};

const Resources: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userSymptoms, setUserSymptoms] = useState<UserSymptom[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch user profile and symptoms
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          
          // Fetch user profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (!profileError && profileData) {
            setProfile(profileData);
          }

          // Fetch user symptoms with intensity and timestamp
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const { data: symptomsData, error: symptomsError } = await supabase
            .from('symptom_tracking')
            .select('symptom, intensity, recorded_at')
            .eq('user_id', session.user.id)
            .gte('recorded_at', thirtyDaysAgo.toISOString())
            .order('recorded_at', { ascending: false });

          if (!symptomsError && symptomsData) {
            // Group symptoms by name and get the most recent entry
            const symptomMap = new Map<string, UserSymptom>();
            symptomsData.forEach(symptom => {
              if (!symptomMap.has(symptom.symptom)) {
                symptomMap.set(symptom.symptom, symptom);
              }
            });
            setUserSymptoms(Array.from(symptomMap.values()));
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged out",
        description: "You've been successfully logged out.",
      });
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "An error occurred while logging out.",
        variant: "destructive",
      });
    }
  };

  // Fetch videos from YouTube API
  const fetchYouTubeVideos = async (topic: string): Promise<YouTubeVideo[]> => {
    try {
      const response = await fetch(
        `${YOUTUBE_API_BASE_URL}?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(topic)}&key=${YOUTUBE_API_KEY}`
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

  // Fetch all content
  const fetchAllContent = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch YouTube videos
      const allVideos: YouTubeVideo[] = [];
      for (const topic of SEARCH_TOPICS) {
        const topicVideos = await fetchYouTubeVideos(topic);
        allVideos.push(...topicVideos);
      }
      setVideos(allVideos);

      // Fetch resources from GCP bucket
      const bucketResources = await fetchResources();
      setResources(bucketResources);

      if (allVideos.length === 0 && bucketResources.length === 0) {
        setError('No content found. Please try again later.');
      } else {
        toast({
          title: "Content Updated",
          description: `Found ${allVideos.length + bucketResources.length} resources for you.`,
        });
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      setError('Failed to fetch content. Please try again.');
      toast({
        title: "Error",
        description: "Failed to fetch content.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Refresh content
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllContent();
    setRefreshing(false);
  };

  // Initial load
  useEffect(() => {
    fetchAllContent();
  }, []);

  // Update the calculateSymptomMatchScore function
  const calculateSymptomMatchScore = (resource: Resource | YouTubeVideo): number => {
    if (!userSymptoms.length) return 0;

    let score = 0;
    const now = new Date();

    userSymptoms.forEach(symptom => {
      // Check if the resource is related to this symptom
      const isRelated = 'relatedSymptoms' in resource
        ? resource.relatedSymptoms.includes(symptom.symptom)
        : resource.topic.toLowerCase().includes(symptom.symptom.toLowerCase());

      if (isRelated) {
        // Base score for matching symptom
        score += 1;

        // Add weight based on symptom intensity (0-5 scale)
        score += symptom.intensity * 0.2;

        // Add weight based on recency (more recent = higher score)
        const daysAgo = (now.getTime() - new Date(symptom.recorded_at).getTime()) / (1000 * 60 * 60 * 24);
        score += Math.max(0, (30 - daysAgo) / 30); // Higher score for more recent symptoms
      }
    });

    return score;
  };

  // Update the getFilteredContent function
  const getFilteredContent = () => {
    let filteredResources = resources;
    let filteredVideos = videos;

    if (selectedTopic !== 'all') {
      filteredResources = resources.filter(r => r.tags.includes(selectedTopic));
      filteredVideos = videos.filter(v => v.topic === selectedTopic);
    }

    // If user has symptoms, prioritize and sort content
    if (userSymptoms.length > 0) {
      // Score and sort resources
      const scoredResources: SymptomMatch[] = filteredResources.map(resource => ({
        resource,
        matchScore: calculateSymptomMatchScore(resource)
      }));

      // Score and sort videos
      const scoredVideos: SymptomMatch[] = filteredVideos.map(video => ({
        resource: video,
        matchScore: calculateSymptomMatchScore(video)
      }));

      // Sort by match score (higher scores first)
      scoredResources.sort((a, b) => b.matchScore - a.matchScore);
      scoredVideos.sort((a, b) => b.matchScore - a.matchScore);

      return {
        resources: scoredResources.map(sr => sr.resource as Resource),
        videos: scoredVideos.map(sv => sv.resource as YouTubeVideo)
      };
    }

    return { resources: filteredResources, videos: filteredVideos };
  };

  const { resources: filteredResources, videos: filteredVideos } = getFilteredContent();

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Truncate text
  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // Get icon for resource type
  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case 'article':
        return <BookOpen className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'podcast':
        return <Headphones className="h-4 w-4" />;
      case 'guide':
        return <FileText className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-menova-beige bg-menova-pattern bg-cover">
      {/* Header with Navigation */}
      <header className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-8">
            <MeNovaLogo className="text-[#92D9A9]" />
            
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center text-[#92D9A9] hover:text-[#7bc492] font-medium">
                Explore <ChevronDown className="h-4 w-4 ml-1" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => navigate('/welcome')}>
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/resources')}>
                  Resources
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/community')}>
                  Community
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/symptom-tracker')}>
                  Symptom Tracker
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-50">
              <Avatar className="h-8 w-8">
                <AvatarImage src={`https://avatar.vercel.sh/${user?.email}.png`} alt={user?.email} />
                <AvatarFallback>
                  {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-[#92D9A9]">{profile?.full_name || user?.email?.split('@')[0] || "User"}</span>
              <ChevronDown className="h-4 w-4 text-[#92D9A9]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Breadcrumb Navigation */}
      <div className="bg-menova-beige/80 py-4 px-6 border-b border-menova-beige">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center text-sm">
            <Link to="/welcome" className="text-[#92D9A9] hover:text-[#7bc492]">Dashboard</Link>
            <span className="mx-2 text-gray-400">&gt;</span>
            <span className="text-gray-600">Resources</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-menova-text mb-2">
                Menopause Resources
              </h1>
              <p className="text-gray-600 leading-relaxed">
                Discover evidence-based content for your menopause journey
              </p>
              {userSymptoms.length > 0 && (
                <p className="text-sm text-[#92D9A9] mt-2">
                  Showing personalized content based on your symptoms
                </p>
              )}
            </div>
            <Button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-[#92D9A9] hover:bg-[#7bc492] text-white"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Topic Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedTopic === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedTopic('all')}
              className={selectedTopic === 'all' ? 'bg-[#92D9A9] hover:bg-[#7bc492]' : ''}
            >
              All Content
            </Button>
            {SEARCH_TOPICS.map((topic) => (
              <Button
                key={topic}
                variant={selectedTopic === topic ? 'default' : 'outline'}
                onClick={() => setSelectedTopic(topic)}
                className={selectedTopic === topic ? 'bg-[#92D9A9] hover:bg-[#7bc492]' : ''}
              >
                {topic}
              </Button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="p-0">
                  <Skeleton className="w-full h-48" />
                </CardHeader>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Resources from GCP Bucket */}
        {!loading && filteredResources.length > 0 && (
          <>
            <h2 className="text-xl font-semibold mb-4">
              Resources Suggested for You
              {userSymptoms.length > 0 && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  (Personalized based on {userSymptoms.length} tracked symptoms)
                </span>
              )}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredResources.map((resource) => (
                <Card key={resource.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="p-0 relative">
                    {resource.thumbnail && (
                      <img
                        src={resource.thumbnail}
                        alt={resource.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <Badge className={`absolute top-2 left-2 ${getTopicColor(resource.type)}`}>
                      <div className="flex items-center gap-1">
                        {getResourceTypeIcon(resource.type)}
                        {resource.type}
                      </div>
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4">
                    <CardTitle className="text-sm font-semibold mb-2 line-clamp-2">
                      {resource.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-600 mb-3 line-clamp-3">
                      {resource.description}
                    </CardDescription>
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                      {resource.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    {userSymptoms.length > 0 && resource.relatedSymptoms.some(s => 
                      userSymptoms.some(us => us.symptom === s)
                    ) && (
                      <div className="mt-2 mb-3">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Relevant to your symptoms
                        </Badge>
                      </div>
                    )}
                    
                    <Button
                      onClick={() => window.open(resource.url, '_blank')}
                      className="w-full bg-[#92D9A9] hover:bg-[#7bc492] text-white"
                      size="sm"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Resource
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* YouTube Videos */}
        {!loading && filteredVideos.length > 0 && (
          <>
            <h2 className="text-xl font-semibold mb-4">Related Videos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video) => (
                <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="p-0 relative">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                      <Play className="text-white opacity-0 hover:opacity-100 transition-opacity h-12 w-12" />
                    </div>
                    <Badge className={`absolute top-2 left-2 ${getTopicColor(video.topic)}`}>
                      {video.topic}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4">
                    <CardTitle className="text-sm font-semibold mb-2 line-clamp-2">
                      {truncateText(video.title, 80)}
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-600 mb-3 line-clamp-3">
                      {truncateText(video.description, 120)}
                    </CardDescription>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <span className="font-medium">{video.channelTitle}</span>
                      <span>{formatDate(video.publishedAt)}</span>
                    </div>
                    
                    <Button
                      onClick={() => window.open(video.url, '_blank')}
                      className="w-full bg-[#92D9A9] hover:bg-[#7bc492] text-white"
                      size="sm"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Watch on YouTube
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* No Results */}
        {!loading && !error && filteredResources.length === 0 && filteredVideos.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No content found</h3>
            <p className="text-gray-600 mb-4">Try selecting a different topic or refresh the page.</p>
            <Button onClick={handleRefresh} className="bg-[#92D9A9] hover:bg-[#7bc492] text-white">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Content
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Resources;
