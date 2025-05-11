import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useVapi } from '@/contexts/VapiContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, PlayCircle, Volume2, X, Link as LinkIcon, Book, Video, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import VideoPlayer from '@/components/VideoPlayer';
import MeNovaLogo from '@/components/MeNovaLogo';
import { BreadcrumbTrail } from '@/components/BreadcrumbTrail';
import CompleteSymptomProfile from '@/components/CompleteSymptomProfile';
import ResearchSection from '@/components/ResearchSection';
import { useToast } from '@/components/ui/use-toast';
import ApiStatusIndicator from '@/components/ApiStatusIndicator';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

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
    name: string | object;
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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [recommendedContent, setRecommendedContent] = useState<ContentItem[]>([]);
  const [userSymptoms, setUserSymptoms] = useState<string[]>([]);
  const [activeContent, setActiveContent] = useState<ContentItem | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topics] = useState<string[]>([
    'menopause',
    'perimenopause',
    'nutrition women health',
    'wellness women',
    'menopause exercise',
    'mental health women',
    'meditation women'
  ]);

  // Helper function to safely get author initials
  const getAuthorInitial = (author: any): string => {
    if (!author || !author.name) return '?';
    
    // Check if name is a string
    if (typeof author.name === 'string') {
      return author.name.charAt(0) || '?';
    }
    
    // If name is an object or something else, return a safe fallback
    return '?';
  };

  // Fetch user profile and symptoms from Supabase
  useEffect(() => {
    const fetchUserSymptoms = async () => {
      try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log("Fetching symptom data for user:", session.user.id);
          
          // Fetch user symptoms from the symptom_tracking table
          const { data: symptomData, error: symptomError } = await supabase
            .from('symptom_tracking')
            .select('symptom, intensity')
            .eq('user_id', session.user.id)
            .order('recorded_at', { ascending: false });
          
          if (symptomError) {
            console.error('Error fetching symptom data:', symptomError);
            setUserSymptoms(['Hot Flashes', 'Sleep', 'Anxiety']); // Fallback
          } else {
            if (symptomData && symptomData.length > 0) {
              console.log("User symptoms data:", symptomData);
              
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
                console.log("Using tracked symptoms from database:", uniqueSymptoms);
                setUserSymptoms(uniqueSymptoms);
                
                toast({
                  title: "Personalized Content",
                  description: `Showing content based on your tracked symptoms: ${uniqueSymptoms.join(', ')}`,
                });
              } else {
                console.log("No symptoms found, using default");
                setUserSymptoms(['Hot Flashes', 'Sleep', 'Anxiety']); // Fallback
              }
            } else {
              console.log("No symptom data found, using default");
              setUserSymptoms(['Hot Flashes', 'Sleep', 'Anxiety']); // Fallback
            }
          }
        } else {
          console.log("No user session, using default symptoms");
          setUserSymptoms(['Hot Flashes', 'Sleep', 'Anxiety']);
        }
      } catch (error) {
        console.error('Error in fetchUserSymptoms:', error);
        setUserSymptoms(['Hot Flashes', 'Sleep', 'Anxiety']);
      }
    };

    fetchUserSymptoms();
  }, [toast]);

  // Function to fetch content from our enhanced edge function
  const fetchEnhancedContent = async (options: ContentFetchOptions = {}) => {
    const { type = 'all', topic, count = 6 } = options;
    
    try {
      setLoading(true);
      console.log(`Fetching ${type} content about "${topic}" (count: ${count})`);
      
      // Build params object
      const params = {
        type: type !== 'all' ? type : undefined,
        topic: topic,
        count: count
      };
      
      // Call the edge function with correct parameters
      const { data, error } = await supabase.functions.invoke('enhanced-content-fetch', {
        body: { params }
      });
      
      if (error) {
        console.error('Edge function error:', error);
        return [];
      }
      
      if (data && Array.isArray(data) && data.length > 0) {
        console.log(`Successfully fetched ${data.length} ${type} items about "${topic}"`);
      } else {
        console.log(`No ${type} content found for "${topic}"`);
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
    setError(null);
    
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
      
      console.log("Selected topics for content fetch:", selectedTopics);
      
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
      
      console.log(`Total content items fetched: ${allContent.length}`);
      
      if (allContent.length === 0) {
        console.warn("No content returned from API - showing error state");
        setError("We couldn't fetch any content at this time. This may be due to API connectivity issues. Please try again later.");
        toast({
          title: "Content Fetch Failed",
          description: "We couldn't load any content. This may be due to API connectivity issues.",
          variant: "destructive"
        });
      } else {
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
        
        console.log(`Found ${personalizedContent.length} content items matching user symptoms`);
        
        // If we don't have enough personalized content, add some general content
        if (personalizedContent.length < 3) {
          console.log("Not enough personalized content, adding general content");
          const additionalContent = allContent
            .filter(item => !personalizedContent.includes(item))
            .slice(0, 3 - personalizedContent.length);
          
          setRecommendedContent([...personalizedContent, ...additionalContent]);
        } else {
          setRecommendedContent(personalizedContent.slice(0, 6));
        }
        
        setLastRefresh(new Date());
        
        toast({
          title: "Content Updated",
          description: `Loaded ${allContent.length} content items, including ${personalizedContent.length} personalized for your symptoms`,
        });
      }
    } catch (error) {
      console.error('Error fetching all content:', error);
      setError("An error occurred while fetching content. Please try again.");
      toast({
        title: "Error",
        description: "Failed to fetch content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch content when the component mounts or when user symptoms change
  useEffect(() => {
    if (userSymptoms.length > 0) {
      console.log("Fetching content with symptoms:", userSymptoms);
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

  const handleDebugCheck = async () => {
    toast({
      title: "API Status Check",
      description: "Checking API connection status...",
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('test-api-connectivity', {});
      
      if (error) {
        console.error("API connectivity check error:", error);
        toast({
          title: "API Check Failed",
          description: "Failed to connect to the API testing endpoint.",
          variant: "destructive"
        });
        return;
      }
      
      console.log("=== API CONNECTIVITY TEST RESULTS ===", data);
      
      if (data) {
        toast({
          title: "API Status",
          description: `Firecrawl API: ${data.firecrawl.success ? 'Connected ✅' : 'Failed ❌'}`,
          duration: 5000,
        });
      }
    } catch (err) {
      console.error("Error running API connectivity test:", err);
      toast({
        title: "Error",
        description: "Failed to run API connectivity test",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f9fdf3] to-white">
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <MeNovaLogo />
          <div className="flex space-x-2">
            <ApiStatusIndicator compact={true} />
          </div>
        </div>
        
        <BreadcrumbTrail currentPath={location.pathname} />
        
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-[#2e7d32] mb-2">Resources</h1>
            <p className="text-lg text-muted-foreground">
              Discover personalized menopause guides, articles, and videos tailored to your journey
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-8 mb-10 border border-[#e8f5e9]">
            <ResearchSection topic="menopause wellness" phase={userSymptoms[0] || "perimenopause"} />
          </div>
          
          <Separator className="my-10 bg-[#e8f5e9]" />

          {/* Recommended For You Section - Tabular Format */}
          <section className="mb-10 bg-white rounded-xl shadow-sm p-8 border border-[#e8f5e9]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold flex items-center">
                <span className="text-[#388e3c]">Recommended For You</span>
                <Badge variant="outline" className="ml-2 bg-[#e8f5e9] text-[#2e7d32] hover:bg-[#c8e6c9]">
                  Based on Your Symptoms
                </Badge>
              </h2>
            </div>
            
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="w-full">
                {recommendedContent.length > 0 ? (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader className="bg-[#f1f8e9]">
                        <TableRow>
                          <TableHead className="font-semibold text-[#2e7d32] w-[25%]">Thumbnail</TableHead>
                          <TableHead className="font-semibold text-[#2e7d32] w-[45%]">Content</TableHead>
                          <TableHead className="font-semibold text-[#2e7d32] w-[15%]">Author</TableHead>
                          <TableHead className="font-semibold text-[#2e7d32] w-[15%] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recommendedContent.map((item) => (
                          <TableRow key={item.id} className="hover:bg-[#f9fbf6]" onClick={() => handleContentClick(item)}>
                            <TableCell className="align-middle cursor-pointer">
                              <div className="relative h-24 w-full rounded overflow-hidden">
                                <img 
                                  src={item.thumbnail} 
                                  alt={item.title} 
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = 'https://placehold.co/600x400/e8f5e9/2e7d32?text=MeNova';
                                  }}
                                />
                                {item.type === 'video' && (
                                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                    <PlayCircle className="w-8 h-8 text-white" />
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="align-top cursor-pointer">
                              <div>
                                <h3 className="font-medium text-[#1b5e20] mb-1">{item.title}</h3>
                                <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                                <div className="mt-2">
                                  {item.type === 'article' ? (
                                    <Badge variant="outline" className="flex items-center gap-1 bg-[#e8f5e9] text-[#2e7d32] inline-flex">
                                      <Book size={12} />
                                      Article
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="flex items-center gap-1 bg-[#e3f2fd] text-[#1565c0] inline-flex">
                                      <Video size={12} />
                                      Video {item.duration && `• ${item.duration}`}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="align-middle">
                              <div className="flex items-center">
                                <Avatar className="h-6 w-6 mr-2">
                                  <AvatarImage src={item.author?.avatar} />
                                  <AvatarFallback>{getAuthorInitial(item.author)}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                  {typeof item.author?.name === 'string' ? item.author.name : 'Author'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right align-middle">
                              <div className="flex items-center justify-end space-x-2">
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
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(item.url, '_blank', 'noopener,noreferrer');
                                  }}
                                  title="Open in new tab"
                                  className="text-[#4caf50] hover:text-[#2e7d32] hover:bg-[#e8f5e9]"
                                >
                                  <LinkIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="col-span-3">
                    {error ? (
                      <div className="bg-white/90 rounded-lg p-8 text-center border border-amber-200 shadow">
                        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Content Unavailable</h3>
                        <p className="text-gray-500 mb-4">{error}</p>
                        <Button
                          onClick={fetchAllContent}
                          className="bg-[#4caf50] hover:bg-[#388e3c]"
                        >
                          Try Again
                        </Button>
                      </div>
                    ) : (
                      <CompleteSymptomProfile className="max-w-2xl mx-auto" />
                    )}
                  </div>
                )}
              </div>
            )}
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
                          <AvatarFallback>{getAuthorInitial(activeContent.author)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {typeof activeContent.author?.name === 'string' ? activeContent.author.name : 'Author'}
                          </p>
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
          <div className="w-full flex justify-center mt-8 mb-12">
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
