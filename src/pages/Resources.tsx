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
import { Play, PlayCircle, Volume2, X } from 'lucide-react';
import { contentApi, apiStatus } from '@/lib/api';
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

// Define symptom tracking interface
interface SymptomTrackingEntry {
  id: string;
  user_id: string;
  symptom: string;
  severity?: number;
  created_at: string;
  // Add any other fields that might be in your table
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
  const [debugInfo, setDebugInfo] = useState<any>({ symptoms: null, profileLoaded: false });
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Fetch user profile and symptoms
  useEffect(() => {
    const fetchUserData = async () => {
      console.log('🔍 Fetching user data and symptoms...');
      try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('👤 User authenticated:', session.user.id);
          
          // Fetch user profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profileError) {
            console.error('❌ Error fetching user profile:', profileError);
          } else {
            console.log('✅ Profile loaded:', profileData ? 'Yes' : 'No');
            setDebugInfo(prev => ({ ...prev, profileLoaded: !!profileData }));
          }
          
          // Fetch user symptoms from the symptom_tracking table
          console.log('🔍 Fetching symptom_tracking data...');
          const { data: symptomData, error: symptomError } = await supabase
            .from('symptom_tracking')
            .select('*')
            .eq('user_id', session.user.id)
            .order('recorded_at', { ascending: false });
          
          if (symptomError) {
            console.error('❌ Error fetching symptom data:', symptomError);
            setUserSymptoms(['Hot Flashes', 'Sleep', 'Anxiety']); // Fallback
            setDebugInfo(prev => ({ ...prev, symptoms: { error: symptomError.message } }));
          } else {
            console.log('📊 Symptom data retrieved:', symptomData);
            setDebugInfo(prev => ({ ...prev, symptoms: { raw: symptomData } }));
            
            if (symptomData && symptomData.length > 0) {
              console.log('🔍 First symptom item for debugging:', symptomData[0]);
              
              // Try various possible field names for symptoms
              const symptoms = symptomData.map(item => {
                // Log the shape of each item to help debug
                console.log('🔍 Symptom item structure:', item);
                
                // Check specifically for the symptom field from Supabase
                if (item.symptom) {
                  // Handle different formats that might be in the database
                  // For example, convert 'hot_flashes' to 'Hot Flashes'
                  const symptom = item.symptom.replace(/_/g, ' ');
                  return symptom.charAt(0).toUpperCase() + symptom.slice(1);
                }
                
                // Fallback to checking other potential field names
                const itemAny = item as any;
                return itemAny.symptom_name || itemAny.name || itemAny.type || 'Unknown';
              }).filter(symptom => symptom !== 'Unknown');
              
              // Use unique symptoms only
              const uniqueSymptoms = [...new Set(symptoms)];
              console.log('📋 Extracted unique symptoms:', uniqueSymptoms);
              setDebugInfo(prev => ({ ...prev, symptoms: { ...prev.symptoms, extracted: uniqueSymptoms } }));
              
              if (uniqueSymptoms.length > 0) {
                // Convert symptom formats to be more searchable
                // e.g., ensure "hot flashes", "Hot Flashes", "hot_flashes" are all recognized
                const normalizedSymptoms = uniqueSymptoms.map(s => {
                  // Common symptom mappings to standardize formats
                  const symptomMap: Record<string, string> = {
                    'hot_flashes': 'Hot Flashes',
                    'hot flashes': 'Hot Flashes',
                    'hotflashes': 'Hot Flashes',
                    'sleep': 'Sleep',
                    'sleep_quality': 'Sleep',
                    'mood': 'Mood',
                    'anxiety': 'Anxiety',
                    'energy': 'Energy',
                    'energy_level': 'Energy'
                  };
                  
                  const lowercaseSymptom = s.toLowerCase();
                  return symptomMap[lowercaseSymptom] || s;
                });
                
                console.log('🧩 Normalized symptoms for content matching:', normalizedSymptoms);
                setUserSymptoms(normalizedSymptoms);
              } else {
                console.warn('⚠️ No symptoms found in data, using fallback');
                setUserSymptoms(['Hot Flashes', 'Sleep', 'Anxiety']); // Fallback
              }
            } else {
              console.warn('⚠️ No symptom tracking entries found, using fallback');
              setUserSymptoms(['Hot Flashes', 'Sleep', 'Anxiety']); // Fallback
            }
          }
        } else {
          console.log('👤 No authenticated user, using demo symptoms');
          setUserSymptoms(['Hot Flashes', 'Sleep', 'Anxiety']);
        }
      } catch (error) {
        console.error('❌ Error in fetchUserData:', error);
        setUserSymptoms(['Hot Flashes', 'Sleep', 'Anxiety']);
      }
    };

    fetchUserData();
  }, []);

  // Fetch content data
  useEffect(() => {
    // Define a new fetchContent function without any mockContent references
    const fetchContent = async () => {
      setLoading(true);
      
      try {
        console.log('🌐 Fetching real content data for symptoms:', userSymptoms);
        
        // Get content from APIs only - no mock data fallback
        const allContent = await contentApi.refreshAllContent(userSymptoms);
        
        if (allContent && allContent.length > 0) {
          console.log('✅ Content loaded successfully:', allContent.length, 'items');
          setContent(allContent);
          
          // Filter for personalized recommendations based on symptoms
          if (userSymptoms.length > 0) {
            // Use local filtering if API personalization fails
            let recommended = await contentApi.getPersonalizedContent(userSymptoms);
            console.log('🎯 API personalized recommendations:', recommended.length, 'items');
            
            // If API personalization returned no results, do local filtering
            if (recommended.length === 0) {
              console.log('⚠️ No API personalized content, doing local filtering');
              recommended = allContent.filter(item => {
                // For each content item, check if any of its categories match any user symptoms
                return item.category.some(category => {
                  return userSymptoms.some(symptom => {
                    const categoryLower = category.toLowerCase();
                    const symptomLower = symptom.toLowerCase();
                    return categoryLower.includes(symptomLower) || symptomLower.includes(categoryLower);
                  });
                });
              });
              console.log('🔍 Local filtering found', recommended.length, 'items');
            }
            
            setRecommendedContent(recommended);
          } else {
            setRecommendedContent([]);
          }
        } else {
          console.warn('⚠️ No content returned from APIs');
          setContent([]);
          setRecommendedContent([]);
        }
      } catch (error) {
        console.error('❌ Error loading content:', error);
        setContent([]);
        setRecommendedContent([]);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch content when we have user symptoms
    if (userSymptoms.length > 0) {
      fetchContent();
    }
  }, [userSymptoms]);

  // Update the API status check to remove useRealApi dependency
  useEffect(() => {
    // Check API status when component mounts
    const checkApiStatus = async () => {
      await apiStatus.checkStatus();
      // Update the UI with API status information
      setDebugInfo(prev => ({ 
        ...prev, 
        apiStatus: {
          available: apiStatus.isAvailable,
          lastCheck: apiStatus.lastCheck,
          error: apiStatus.error
        } 
      }));
    };
    
    checkApiStatus();
  }, []);

  const handleReadContent = (text: string) => {
    // Ensure speak is called with the correct text
    if (speak) {
      // Call the speak function from VapiContext
      console.log("Speaking text:", text);
      speak(text);
    } else {
      console.error("Speak function not available");
      // Fallback to browser's built-in speech synthesis if available
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      }
    }
  };
  
  // Handle article or video click
  const handleContentClick = (item: ContentItem) => {
    if (item.type === 'video') {
      setActiveContent(item);
      setShowVideoModal(true);
    } else {
      // For articles, navigate to article page
      navigate(item.url);
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

  // Update the force refresh function
  const forceRefreshContent = async () => {
    console.log('🔄 Manual content refresh triggered');
    setLoading(true);
    
    try {
      // Get fresh content
      const freshContent = await contentApi.refreshAllContent(userSymptoms);
      console.log('✅ Content loaded:', freshContent.length, 'items');
      console.log('📊 Content breakdown:', 
        freshContent.filter(item => item.type === 'video').length, 'videos and',
        freshContent.filter(item => item.type === 'article').length, 'articles'
      );
      
      setContent(freshContent);
      
      // Filter for personalized recommendations with improved matching
      if (userSymptoms.length > 0) {
        console.log('👤 User has symptoms:', userSymptoms);
        // Get personalized content based on symptoms
        const recommended = await contentApi.getPersonalizedContent(userSymptoms);
        console.log('🎯 Personalized content items:', recommended.length);
        console.log('📊 Personalized breakdown:', 
          recommended.filter(item => item.type === 'video').length, 'videos and',
          recommended.filter(item => item.type === 'article').length, 'articles'
        );
        
        setRecommendedContent(recommended);
      } else {
        console.log('⚠️ No user symptoms found for personalization');
        setRecommendedContent([]);
      }
      
      // Update last refresh timestamp
      setLastRefresh(new Date());
    } catch (error) {
      console.error('❌ Error during refresh:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Add initialization effect that runs only once
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 Initializing Resources component');
      
      // Skip any API checks and immediately load real-time content
      if (userSymptoms.length > 0) {
        console.log('🔄 Loading real-time content for symptoms:', userSymptoms);
        forceRefreshContent();
      }
      
      setIsInitialized(true);
    };
    
    initializeApp();
  }, [userSymptoms]);
  
  // Refresh symptoms and content when user visits page
  useEffect(() => {
    // Set a timer to auto-refresh content after 30 minutes
    const refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        console.log('🔄 Auto-refreshing content after time interval');
        forceRefreshContent();
      }
    }, 30 * 60 * 1000); // 30 minutes
    
    // Clean up on unmount
    return () => clearInterval(refreshInterval);
  }, []);
  
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
    <div className="min-h-screen bg-gradient-to-b from-menova-background to-white pt-6">
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
            <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
            <p className="text-muted-foreground mt-2">
              Discover personalized menopause guides, articles, and videos tailored to your journey
            </p>
          </div>

          {/* AI Recommendations Section */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              Recommended For You
              <Badge variant="outline" className="ml-2 bg-teal-50 text-teal-700 hover:bg-teal-100">
                AI Personalized
              </Badge>
            </h2>
            
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="overflow-hidden">
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
                  <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleContentClick(item)}>
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
                          {item.id.startsWith('openai') && (
                            <Badge variant="outline" className="mt-1 mb-2 bg-blue-50 text-blue-700 hover:bg-blue-100">
                              OpenAI Recommended
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            handleReadContent(item.description);
                          }}
                          title="Read aloud"
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
                      {item.duration && (
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

          <Separator />

          {/* Browse All Content */}
          <section>
            <Tabs defaultValue="all" onValueChange={setActiveTab}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Browse All Resources</h2>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="article">Articles</TabsTrigger>
                  <TabsTrigger value="video">Videos</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value={activeTab}>
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Card key={i} className="overflow-hidden">
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
                      <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleContentClick(item)}>
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
                              {item.id.startsWith('openai') && (
                                <Badge variant="outline" className="mt-1 mb-2 bg-blue-50 text-blue-700 hover:bg-blue-100">
                                  OpenAI Recommended
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent card click
                                handleReadContent(item.description);
                              }}
                              title="Read aloud"
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
                          {item.duration && (
                            <span className="text-xs text-muted-foreground flex items-center">
                              <PlayCircle className="h-3 w-3 mr-1" /> {item.duration}
                            </span>
                          )}
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
                    {/* Use the custom VideoPlayer component instead of iframe */}
                    <VideoPlayer
                      src={activeContent.url || "https://samplelib.com/lib/preview/mp4/sample-5s.mp4"}
                      title={activeContent.title}
                      poster={activeContent.thumbnail}
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-600 mb-4">{activeContent.description}</p>
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
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* API Toggle and Debug Info for development */}
          {import.meta.env.DEV && (
            <div className="mt-8 p-4 bg-gray-100 rounded-md">
              <div className="flex items-center gap-4 mb-3">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={async () => {
                    setLoading(true);
                    try {
                      // Just refresh content directly without testing API first
                      const refreshed = await contentApi.refreshAllContent(userSymptoms);
                      setContent(refreshed);
                      
                      const recommended = refreshed.filter(item => 
                        item.category.some(cat => userSymptoms.includes(cat))
                      );
                      setRecommendedContent(recommended);
                    } catch (e) {
                      console.error('Error refreshing content:', e);
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Refresh Content
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <h4 className="text-sm font-medium mb-1">Symptom Information:</h4>
                  <div className="text-xs bg-gray-800 text-white p-2 rounded overflow-auto max-h-24">
                    <pre>{JSON.stringify(userSymptoms || [], null, 2)}</pre>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">Content Information:</h4>
                  <div className="text-xs bg-gray-800 text-white p-2 rounded overflow-auto max-h-24">
                    <pre>{JSON.stringify({
                      total: content.length,
                      recommended: recommendedContent.length,
                    }, null, 2)}</pre>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Add a visible button to refresh content */}
          <div className="w-full flex justify-center my-8">
            <Button 
              size="lg"
              className="bg-teal-600 hover:bg-teal-700"
              onClick={forceRefreshContent}
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