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
const YOUTUBE_API_KEY = 'AIzaSyDlxyM7u1gZwGa6ddgqI4MxjhDWCAD_ocA';
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
  // Fallback videos when YouTube API fails
  const getFallbackVideos = (): YouTubeVideo[] => [
    {
      id: 'dQw4w9WgXcQ',
      title: 'Understanding Menopause: Complete Guide by Dr. Smith',
      description: 'Comprehensive overview of menopause symptoms, causes, and evidence-based treatment options.',
      thumbnail: 'https://via.placeholder.com/320x180/92D9A9/FFFFFF?text=Menopause+Guide',
      channelTitle: 'Women\'s Health Channel',
      publishedAt: '2024-01-15T00:00:00Z',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      topic: 'Menopause health tips'
    },
    {
      id: 'abc123def',
      title: 'Natural Remedies for Hot Flashes - Expert Tips',
      description: 'Learn about natural approaches to managing hot flashes during perimenopause and menopause.',
      thumbnail: 'https://via.placeholder.com/320x180/7bc492/FFFFFF?text=Hot+Flashes',
      channelTitle: 'Natural Health Solutions',
      publishedAt: '2024-01-10T00:00:00Z',
      url: 'https://www.youtube.com/results?search_query=menopause+hot+flashes+natural+remedies',
      topic: 'Perimenopause symptoms'
    },
    {
      id: 'xyz789ghi',
      title: 'Menopause Nutrition: What to Eat and Avoid',
      description: 'Nutritionist explains the best foods for menopause and which foods to limit for optimal health.',
      thumbnail: 'https://via.placeholder.com/320x180/6ab583/FFFFFF?text=Nutrition+Tips',
      channelTitle: 'Nutrition Experts',
      publishedAt: '2024-01-05T00:00:00Z',
      url: 'https://www.youtube.com/results?search_query=menopause+nutrition+diet',
      topic: 'Menopause nutrition'
    },
    {
      id: 'jkl456mno',
      title: 'Gentle Yoga for Menopause Relief',
      description: 'Follow along with this 20-minute gentle yoga sequence designed specifically for menopausal women.',
      thumbnail: 'https://via.placeholder.com/320x180/5a9f72/FFFFFF?text=Yoga+Practice',
      channelTitle: 'Yoga for Women',
      publishedAt: '2024-01-01T00:00:00Z',
      url: 'https://www.youtube.com/results?search_query=menopause+yoga+gentle',
      topic: 'Perimenopause yoga'
    }
  ];

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

  // Fetch all content
  const fetchAllContent = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to fetch YouTube videos, use fallback if API fails
      let allVideos: YouTubeVideo[] = [];
      let youtubeSuccess = false;
      
      for (const topic of SEARCH_TOPICS) {
        const topicVideos = await fetchYouTubeVideos(topic);
        if (topicVideos.length > 0) {
          youtubeSuccess = true;
        }
        allVideos.push(...topicVideos);
      }
      
      // If YouTube API failed for all topics, use fallback videos
      if (!youtubeSuccess || allVideos.length === 0) {
        console.log('YouTube API quota exceeded or failed, using fallback videos');
        allVideos = getFallbackVideos();
      }
      
      setVideos(allVideos);

      // Fetch article resources
      const bucketResources = await fetchResources();
      setResources(bucketResources);

      toast({
        title: "Content Loaded",
        description: `Found ${bucketResources.length} articles and ${allVideos.length} videos for you.`,
      });

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

        {/* Enhanced Resources Section */}
        {!loading && filteredResources.length > 0 && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-menova-text mb-2">
                📚 Resources Suggested for You
              </h2>
              {userSymptoms.length > 0 && (
                <p className="text-menova-green font-medium mb-1">
                  Personalized based on {userSymptoms.length} tracked symptoms
                </p>
              )}
              <p className="text-gray-600 text-sm">
                Evidence-based articles and guides to support your menopause journey
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
              {filteredResources.map((resource) => (
                <Card key={resource.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
                  <CardHeader className="p-0 relative overflow-hidden">
                    {resource.thumbnail && (
                      <div className="relative overflow-hidden">
                        <img
                          src={resource.thumbnail}
                          alt={resource.title}
                          className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                    )}
                    <Badge className={`absolute top-3 left-3 ${getTopicColor(resource.type)} shadow-sm`}>
                      <div className="flex items-center gap-1.5">
                        {getResourceTypeIcon(resource.type)}
                        <span className="font-medium capitalize">{resource.type}</span>
                      </div>
                    </Badge>
                    {userSymptoms.length > 0 && resource.relatedSymptoms.some(s => 
                      userSymptoms.some(us => us.symptom === s)
                    ) && (
                      <Badge className="absolute top-3 right-3 bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm">
                        ⭐ Relevant to you
                      </Badge>
                    )}
                  </CardHeader>
                  
                  <CardContent className="p-5">
                    <CardTitle className="text-lg font-bold mb-3 line-clamp-2 text-menova-text group-hover:text-menova-green transition-colors">
                      {resource.title}
                    </CardTitle>
                    
                    <CardDescription className="text-sm text-gray-700 mb-4 line-clamp-3 leading-relaxed">
                      {resource.description}
                    </CardDescription>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {resource.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs bg-menova-beige/50 text-menova-text border-menova-green/30 hover:bg-menova-green/10">
                          {tag}
                        </Badge>
                      ))}
                      {resource.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                          +{resource.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => window.open(resource.url, '_blank')}
                      className="w-full bg-gradient-to-r from-menova-green to-emerald-500 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium py-2.5 shadow-md hover:shadow-lg transition-all duration-200"
                      size="sm"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Read Article
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Enhanced YouTube Videos Section */}
        {!loading && filteredVideos.length > 0 && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-menova-text mb-2">
                🎥 Related Videos
              </h2>
              <p className="text-gray-600 text-sm">
                Expert insights and educational content about menopause
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredVideos.map((video) => (
                <Card key={video.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
                  <CardHeader className="p-0 relative overflow-hidden">
                    <div className="relative">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                        <div className="bg-white/90 rounded-full p-3 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                          <Play className="text-menova-green h-8 w-8 ml-1" fill="currentColor" />
                        </div>
                      </div>
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-red-100 text-red-800 border-red-200 shadow-sm">
                          <Video className="h-3 w-3 mr-1" />
                          Video
                        </Badge>
                      </div>
                      <div className="absolute top-3 right-3">
                        <Badge className={`${getTopicColor(video.topic)} shadow-sm text-xs`}>
                          {video.topic.split(' ').slice(0, 2).join(' ')}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-5">
                    <CardTitle className="text-lg font-bold mb-3 line-clamp-2 text-menova-text group-hover:text-red-600 transition-colors">
                      {truncateText(video.title, 85)}
                    </CardTitle>
                    
                    <CardDescription className="text-sm text-gray-700 mb-4 line-clamp-3 leading-relaxed">
                      {truncateText(video.description, 130)}
                    </CardDescription>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4 border-t border-gray-100 pt-3">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="font-medium">{truncateText(video.channelTitle, 20)}</span>
                      </div>
                      <span>{formatDate(video.publishedAt)}</span>
                    </div>
                    
                    <Button
                      onClick={() => window.open(video.url, '_blank')}
                      className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium py-2.5 shadow-md hover:shadow-lg transition-all duration-200"
                      size="sm"
                    >
                      <Play className="h-4 w-4 mr-2" fill="currentColor" />
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
