
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { Database } from '../types/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Volume2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type ContentItem = Database['public']['Tables']['content_hub']['Row'];

interface FetchedContentItem {
  id: string;
  title: string;
  description: string;
  url: string;
  type: 'article' | 'video';
  thumbnail: string;
  author?: {
    name: string | object;
    avatar: string;
  };
  category: string[];
  duration?: string;
}

export default function ContentHub() {
  const [content, setContent] = useState<FetchedContentItem[]>([]);
  const [userSymptoms, setUserSymptoms] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('articles');
  const [speaking, setSpeaking] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const supabase = useSupabaseClient<Database>();
  const user = useUser();

  useEffect(() => {
    fetchContent();
    if (user) {
      fetchUserSymptoms();
    }
  }, [user]);

  const fetchContent = async () => {
    setIsLoading(true);
    try {
      // Use the enhanced-content-fetch edge function
      const { data: articleData, error: articleError } = await supabase.functions.invoke('enhanced-content-fetch', {
        body: { 
          params: {
            type: 'article', 
            topic: userSymptoms.length > 0 
              ? `menopause ${userSymptoms[0].toLowerCase()}`
              : 'menopause wellness',
            count: 6
          }
        }
      });

      if (articleError) throw articleError;

      // Get videos too
      const { data: videoData, error: videoError } = await supabase.functions.invoke('enhanced-content-fetch', {
        body: {
          params: {
            type: 'video',
            topic: userSymptoms.length > 0 
              ? `menopause ${userSymptoms[0].toLowerCase()}`
              : 'menopause wellness',
            count: 3
          }
        }
      });

      if (videoError) throw videoError;

      // Combine and set the content
      const combinedContent = [...(articleData || []), ...(videoData || [])];
      setContent(combinedContent);
      setLastRefreshed(new Date());
      
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Failed to fetch content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserSymptoms = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('symptom_tracking')
        .select('symptom')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setUserSymptoms(data.map(item => item.symptom));
    } catch (error) {
      console.error('Error fetching user symptoms:', error);
    }
  };

  const isContentPersonalized = (item: FetchedContentItem) => {
    if (!user || !userSymptoms.length || !item.category) return false;
    return item.category.some(category => 
      userSymptoms.some(symptom => 
        category.toLowerCase().includes(symptom.toLowerCase()) ||
        symptom.toLowerCase().includes(category.toLowerCase())
      )
    );
  };

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

  const speakContent = async (text: string) => {
    if (!window.speechSynthesis) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const filteredContent = content.filter(item => 
    activeTab === 'articles' ? item.type === 'article' : item.type === 'video'
  );

  const formatRefreshTime = () => {
    if (!lastRefreshed) return 'Never refreshed';
    
    const now = new Date();
    const diffMs = now.getTime() - lastRefreshed.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden backdrop-blur-sm bg-white/90 border border-[#e8f5e9]">
            <CardHeader>
              <Skeleton className="h-4 w-2/3 mb-2" />
              <Skeleton className="h-3 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#2e7d32]">Content Hub</h2>
          <p className="text-muted-foreground">
            Discover personalized articles and videos to support your menopause journey.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Updated: {formatRefreshTime()}
          </span>
          <Button 
            variant="outline" 
            size="sm"
            className="bg-transparent border-[#4caf50] text-[#4caf50] hover:bg-[#e8f5e9] hover:text-[#2e7d32]"
            onClick={fetchContent}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="articles" onValueChange={setActiveTab}>
        <TabsList className="bg-[#f1f8e9]">
          <TabsTrigger value="articles" className="data-[state=active]:bg-[#4caf50] data-[state=active]:text-white">Articles</TabsTrigger>
          <TabsTrigger value="videos" className="data-[state=active]:bg-[#4caf50] data-[state=active]:text-white">Videos</TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-4">
          {filteredContent.length > 0 ? filteredContent.map((item) => (
            <Card key={item.id} className="overflow-hidden backdrop-blur-sm bg-white/90 border border-[#e8f5e9] hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      <CardTitle className="text-lg text-[#1b5e20]">{item.title}</CardTitle>
                    </a>
                    {isContentPersonalized(item) && (
                      <Badge variant="secondary" className="w-fit bg-[#e8f5e9] text-[#2e7d32] mt-1">
                        Personalized for you
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => speakContent(item.description || item.title)}
                    className="text-[#4caf50] hover:text-[#2e7d32] hover:bg-[#e8f5e9]"
                  >
                    <Volume2 className={speaking ? 'text-primary' : ''} />
                  </Button>
                </div>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {item.category?.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="bg-[#f1f8e9] text-[#388e3c] border-[#c5e1a5]">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-[#e8f5e9] flex items-center justify-center mr-2 text-xs font-medium text-[#2e7d32]">
                      {getAuthorInitial(item.author)}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {typeof item.author?.name === 'string' ? item.author.name : 'Health Expert'}
                    </span>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-[#4caf50] hover:text-[#2e7d32] p-0 h-auto"
                    onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                  >
                    Read More
                  </Button>
                </div>
              </CardContent>
            </Card>
          )) : (
            <Card className="p-6 text-center bg-white/90">
              <p className="text-muted-foreground mb-2">No articles found.</p>
              <Button 
                onClick={fetchContent}
                className="bg-[#4caf50] hover:bg-[#388e3c]"
              >
                Try Again
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="videos" className="space-y-4">
          {filteredContent.length > 0 ? filteredContent.map((item) => (
            <Card key={item.id} className="overflow-hidden backdrop-blur-sm bg-white/90 border border-[#e8f5e9] hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-lg text-[#1b5e20]">{item.title}</CardTitle>
                {isContentPersonalized(item) && (
                  <Badge variant="secondary" className="w-fit bg-[#e8f5e9] text-[#2e7d32]">
                    Personalized for you
                  </Badge>
                )}
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                  <iframe
                    src={item.url}
                    title={item.title}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
                <div className="flex gap-2 flex-wrap mt-4">
                  {item.category?.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="bg-[#f1f8e9] text-[#388e3c] border-[#c5e1a5]">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-[#e8f5e9] flex items-center justify-center mr-2 text-xs font-medium text-[#2e7d32]">
                      {getAuthorInitial(item.author)}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {typeof item.author?.name === 'string' ? item.author.name : 'Health Expert'}
                    </span>
                  </div>
                  {item.duration && (
                    <span className="text-xs text-muted-foreground">
                      Duration: {item.duration}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )) : (
            <Card className="p-6 text-center bg-white/90">
              <p className="text-muted-foreground mb-2">No videos found.</p>
              <Button 
                onClick={fetchContent}
                className="bg-[#4caf50] hover:bg-[#388e3c]"
              >
                Try Again
              </Button>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
