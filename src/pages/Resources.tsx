
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useVapi } from '@/contexts/VapiContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, PlayCircle, Volume2, X, Link as LinkIcon, Book, Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import VideoPlayer from '@/components/VideoPlayer';
import MeNovaLogo from '@/components/MeNovaLogo';
import { BreadcrumbTrail } from '@/components/BreadcrumbTrail';
import CompleteSymptomProfile from '@/components/CompleteSymptomProfile';

// Define content item interface
interface ContentItem {
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
  isOpenAIGenerated?: boolean;
}

interface ContentFetchOptions {
  type?: 'article' | 'video' | 'all';
  topic?: string;
  count?: number;
}

const Resources: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { speak } = useVapi();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [content, setContent] = useState<ContentItem[]>([]);
  const [recommendedContent, setRecommendedContent] = useState<ContentItem[]>([]);
  const [userSymptoms, setUserSymptoms] = useState<string[]>([]);
  const [activeContent, setActiveContent] = useState<ContentItem | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [topics] = useState<string[]>([
    'menopause',
    'perimenopause',
    'nutrition women health',
    'wellness women',
    'menopause exercise',
    'mental health women',
    'meditation women'
  ]);

  // Fetch user profile and symptoms
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Fetch user symptoms from the symptom_tracking table
          const { data: symptomData, error: symptomError } = await supabase
            .from('symptom_tracking')
            .select('*')
            .eq('user_id', session.user.id)
            .order('recorded_at', { ascending: false });
          
          if (symptomError) {
            console.error('Error fetching symptom data:', symptomError);
            setUserSymptoms(['Hot Flashes', 'Sleep', 'Anxiety']); // Fallback
          } else {
            if (symptomData && symptomData.length > 0) {
              // Extract and normalize symptoms
              const symptoms = symptomData
                .map(item => {
                  if (item.symptom) {
                    const symptom = item.symptom.replace(/_/g, ' ');
                    return symptom.charAt(0).toUpperCase() + symptom.slice(1);
                  }
                  return null;
                })
                .filter(Boolean);
              
              // Use unique symptoms only
              const uniqueSymptoms = [...new Set(symptoms)];
              
              if (uniqueSymptoms.length > 0) {
                setUserSymptoms(uniqueSymptoms);
              } else {
                setUserSymptoms(['Hot Flashes', 'Sleep', 'Anxiety']); // Fallback
              }
            } else {
              setUserSymptoms(['Hot Flashes', 'Sleep', 'Anxiety']); // Fallback
            }
          }
        } else {
          setUserSymptoms(['Hot Flashes', 'Sleep', 'Anxiety']);
        }
      } catch (error) {
        console.error('Error in fetchUserData:', error);
        setUserSymptoms(['Hot Flashes', 'Sleep', 'Anxiety']);
      }
    };

    fetchUserData();
  }, []);

  // Function to fetch content from our enhanced edge function
  const fetchEnhancedContent = async (options: ContentFetchOptions = {}) => {
    const { type = 'all', topic, count = 6 } = options;
    
    try {
      setLoading(true);
      
      // Build the URL for the edge function with query parameters
      const params = new URLSearchParams();
      if (type !== 'all') params.append('type', type);
      if (topic) params.append('topic', topic);
      params.append('count', count.toString());
      
      // Call the edge function
      const { data, error } = await supabase.functions.invoke('enhanced-content-fetch', {
        query: params
      });
      
      if (error) {
        console.error('Edge function error:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching enhanced content:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch content based on user symptoms and topics
  const fetchAllContent = async () => {
    setLoading(true);
    
    try {
      // Combine user symptoms with general topics
      const relevantTopics = [
        ...userSymptoms.map(symptom => `menopause ${symptom.toLowerCase()}`),
        ...topics
      ];
      
      // Get a random selection of topics to fetch
      const selectedTopics = relevantTopics
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
      
      // Fetch articles and videos for each selected topic
      const allContentPromises = selectedTopics.flatMap(topic => [
        fetchEnhancedContent({ type: 'article', topic, count: 4 }),
        fetchEnhancedContent({ type: 'video', topic, count: 4 })
      ]);
      
      const results = await Promise.all(allContentPromises);
      
      // Flatten and shuffle the results
      const allContent = results
        .flat()
        .sort(() => 0.5 - Math.random());
      
      setContent(allContent);
      
      // Create personalized recommendations based on user symptoms
      const personalizedContent = allContent.filter(item => 
        userSymptoms.some(symptom => 
          item.category.some(category => 
            category.toLowerCase().includes(symptom.toLowerCase()) ||
            symptom.toLowerCase().includes(category.toLowerCase())
          )
        )
      );
      
      // If we don't have enough personalized content, add some general content
      if (personalizedContent.length < 3) {
        const additionalContent = allContent
          .filter(item => !personalizedContent.includes(item))
          .slice(0, 3 - personalizedContent.length);
        
        setRecommendedContent([...personalizedContent, ...additionalContent]);
      } else {
        setRecommendedContent(personalizedContent.slice(0, 6));
      }
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching all content:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch content when the component mounts or when user symptoms change
  useEffect(() => {
    if (userSymptoms.length > 0) {
      fetchAllContent();
    }
  }, [userSymptoms]);

  // Handle read aloud functionality
  const handleReadContent = (text: string) => {
    if (speak) {
      speak(text);
    } else if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };
  
  // Handle article or video click
  const handleContentClick = (item: ContentItem) => {
    if (item.type === 'video') {
      setActiveContent(item);
      setShowVideoModal(true);
    } else {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };
  
  // Close video modal
  const handleCloseVideoModal = () => {
    setShowVideoModal(false);
    setActiveContent(null);
  };

  const filteredContent = activeTab === 'all' 
    ? content 
    : content.filter(item => item.type === activeTab);
  
  // Format refresh time
  const formatRefreshTime = (date: Date | null) => {
    if (!date) return 'Not refreshed yet';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f9fdf3] to-white pt-6">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex justify-between items-center mb-6">
          <MeNovaLogo />
          <div className="flex space-x-2">
            {/* Add any header buttons/actions here */}
          </div>
        </div>
        
        <BreadcrumbTrail currentPath={location.pathname} />
        
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#2e7d32]">Resources</h1>
            <p className="text-muted-foreground mt-2">
              Discover personalized menopause guides, articles, and videos tailored to your journey
            </p>
          </div>

          {/* AI Recommendations Section */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <span className="text-[#388e3c]">Recommended For You</span>
              <Badge variant="outline" className="ml-2 bg-[#e8f5e9] text-[#2e7d32] hover:bg-[#c8e6c9]">
                AI Personalized
              </Badge>
            </h2>
            
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="overflow-hidden backdrop-blur-sm bg-white/90 border border-[#e8f5e9] hover:shadow-lg transition-all duration-300">
                    <Skeleton className="h-[180px] w-full" />
                    <CardHeader>
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-full" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recommendedContent.length > 0 ? recommendedContent.map((item) => (
                  <Card 
                    key={item.id} 
                    className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer backdrop-blur-sm bg-white/90 border border-[#e8f5e9] hover:shadow-lg transition-all duration-300" 
                    onClick={() => handleContentClick(item)}
                  >
                    <div className="relative h-[180px] overflow-hidden">
                      <img 
                        src={item.thumbnail} 
                        alt={item.title} 
                        className="w-full h-full object-cover"
                      />
                      {item.type === 'video' && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <PlayCircle className="w-12 h-12 text-white" />
                        </div>
                      )}
                    </div>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{item.title}</CardTitle>
                          <div className="flex items-center mt-1 mb-2">
                            {item.type === 'article' ? (
                              <Badge variant="outline" className="flex items-center gap-1 bg-[#e8f5e9] text-[#2e7d32]">
                                <Book size={12} />
                                Article
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="flex items-center gap-1 bg-[#e3f2fd] text-[#1565c0]">
                                <Video size={12} />
                                Video
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            handleReadContent(item.description);
                          }}
                          title="Read aloud"
                          className="text-[#4caf50] hover:text-[#2e7d32] hover:bg-[#e8f5e9]"
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-between pt-0">
                      <div className="flex items-center">
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarImage src={item.author?.avatar} />
                          <AvatarFallback>{item.author?.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">{item.author?.name}</span>
                      </div>
                      {item.type === 'video' && item.duration && (
                        <span className="text-xs text-muted-foreground flex items-center">
                          <PlayCircle className="h-3 w-3 mr-1" /> {item.duration}
                        </span>
                      )}
                    </CardFooter>
                  </Card>
                )) : (
                  <div className="col-span-3">
                    <CompleteSymptomProfile className="max-w-2xl mx-auto" />
                    {loading ? (
                      <p className="text-center mt-4 text-muted-foreground">Loading personalized content...</p>
                    ) : (
                      <p className="text-center mt-4 text-muted-foreground">
                        No content found. Please check your internet connection or try again later.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          <Separator className="bg-[#e8f5e9]" />

          {/* Browse All Content */}
          <section>
            <Tabs defaultValue="all" onValueChange={setActiveTab}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-[#388e3c] flex items-center">
                  Browse All Resources
                  <span className="text-xs text-gray-500 ml-2">
                    {lastRefresh ? `Last updated: ${formatRefreshTime(lastRefresh)}` : ''}
                  </span>
                </h2>
                <TabsList className="bg-[#f1f8e9]">
                  <TabsTrigger value="all" className="data-[state=active]:bg-[#4caf50] data-[state=active]:text-white">All</TabsTrigger>
                  <TabsTrigger value="article" className="data-[state=active]:bg-[#4caf50] data-[state=active]:text-white">Articles</TabsTrigger>
                  <TabsTrigger value="video" className="data-[state=active]:bg-[#4caf50] data-[state=active]:text-white">Videos</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value={activeTab}>
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Card key={i} className="overflow-hidden backdrop-blur-sm bg-white/90 border border-[#e8f5e9]">
                        <Skeleton className="h-[180px] w-full" />
                        <CardHeader>
                          <Skeleton className="h-4 w-3/4 mb-2" />
                          <Skeleton className="h-3 w-full" />
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {filteredContent.length > 0 ? filteredContent.map((item) => (
                      <Card 
                        key={item.id} 
                        className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer backdrop-blur-sm bg-white/90 border border-[#e8f5e9] hover:shadow-lg transition-all duration-300" 
                        onClick={() => handleContentClick(item)}
                      >
                        <div className="relative h-[180px] overflow-hidden">
                          <img 
                            src={item.thumbnail} 
                            alt={item.title} 
                            className="w-full h-full object-cover"
                          />
                          {item.type === 'video' && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <PlayCircle className="w-12 h-12 text-white" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2">
                            {item.type === 'article' ? (
                              <Badge className="bg-[#e8f5e9] text-[#2e7d32] border-none">
                                <Book size={12} className="mr-1" /> Article
                              </Badge>
                            ) : (
                              <Badge className="bg-[#e3f2fd] text-[#1565c0] border-none">
                                <Video size={12} className="mr-1" /> Video
                              </Badge>
                            )}
                          </div>
                        </div>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">{item.title}</CardTitle>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent card click
                                handleReadContent(item.description);
                              }}
                              title="Read aloud"
                              className="text-[#4caf50] hover:text-[#2e7d32] hover:bg-[#e8f5e9]"
                            >
                              <Volume2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <CardDescription>{item.description}</CardDescription>
                          
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.category.slice(0, 3).map((category, idx) => (
                              <Badge 
                                key={idx} 
                                variant="outline" 
                                className="text-xs bg-[#f1f8e9] text-[#388e3c] border-[#c5e1a5]"
                              >
                                {category}
                              </Badge>
                            ))}
                          </div>
                        </CardHeader>
                        <CardFooter className="flex justify-between pt-0">
                          <div className="flex items-center">
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarImage src={item.author?.avatar} />
                              <AvatarFallback>{item.author?.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">{item.author?.name}</span>
                          </div>
                          <div className="flex items-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-xs text-[#4caf50] hover:text-[#2e7d32] hover:bg-[#e8f5e9] p-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(item.url, '_blank', 'noopener,noreferrer');
                              }}
                            >
                              <LinkIcon className="h-3 w-3 mr-1" /> Source
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    )) : loading ? (
                      <p className="col-span-3 text-center py-8 text-muted-foreground">Loading content...</p>
                    ) : (
                      <p className="col-span-3 text-center py-8 text-muted-foreground">
                        No content available. Please check your internet connection or try refreshing.
                      </p>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </section>
          
          {/* Video Modal */}
          {showVideoModal && activeContent && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                  <h3 className="text-lg font-semibold">{activeContent.title}</h3>
                  <Button variant="ghost" size="icon" onClick={handleCloseVideoModal}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex-1 overflow-auto">
                  <div className="aspect-video bg-black">
                    <VideoPlayer
                      src={activeContent.url}
                      title={activeContent.title}
                      poster={activeContent.thumbnail}
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-600 mb-4">{activeContent.description}</p>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage src={activeContent.author?.avatar} />
                          <AvatarFallback>{activeContent.author?.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{activeContent.author?.name}</p>
                          {activeContent.duration && (
                            <p className="text-xs text-muted-foreground">{activeContent.duration}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[#4caf50] border-[#4caf50] hover:bg-[#e8f5e9] hover:text-[#2e7d32]"
                        onClick={() => window.open(activeContent.url, '_blank', 'noopener,noreferrer')}
                      >
                        <LinkIcon className="h-4 w-4 mr-1" /> Open Original
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Content Refresh Button */}
          <div className="w-full flex justify-center my-8">
            <Button 
              size="lg"
              className="bg-[#4caf50] hover:bg-[#388e3c] text-white shadow-md hover:shadow-lg transition-all duration-300"
              onClick={fetchAllContent}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">⟳</span> Loading...
                </span>
              ) : (
                <span className="flex items-center">
                  ↻ Refresh Content
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Resources;
