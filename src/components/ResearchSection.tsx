
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Book, Video, ExternalLink, Calendar, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ApiStatusIndicator from './ApiStatusIndicator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface ResearchItem {
  id: string;
  title: string;
  source: string;
  year: string;
  authors?: string;
  summary: string;
  url: string;
  type: 'research';
}

interface VideoItem {
  id: string;
  title: string;
  channel: string;
  year: string;
  summary: string;
  url: string;
  thumbnail: string;
  type: 'video';
}

type ContentItem = ResearchItem | VideoItem;

interface ResearchSectionProps {
  topic?: string;
  phase?: string;
}

export default function ResearchSection({ topic = 'menopause', phase = 'perimenopause' }: ResearchSectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTopic, setSearchTopic] = useState(topic);
  const [menopausePhase, setMenopausePhase] = useState(phase);
  const [research, setResearch] = useState<ResearchItem[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchResearchData = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-menopause-research', {
        body: { 
          topic: searchTopic, 
          phase: menopausePhase,
          limit: 5
        }
      });

      if (error) throw error;

      if (data) {
        // Only set data if we actually have results
        setResearch(Array.isArray(data.research) && data.research.length > 0 ? data.research : []);
        setVideos(Array.isArray(data.videos) && data.videos.length > 0 ? data.videos : []);
        setLastFetched(new Date());
        
        // Display toast notification with fetch results
        toast({
          title: "Research Updated",
          description: `Found ${data.research.length} research articles ${data.videos.length > 0 ? `and ${data.videos.length} videos` : ''}`,
        });
      } else {
        setResearch([]);
        setVideos([]);
        setFetchError("No content found. Please try again later.");
      }
    } catch (error) {
      console.error('Error fetching research data:', error);
      setFetchError("Failed to fetch content. Please try again later.");
      setResearch([]);
      setVideos([]);
      
      toast({
        title: "Error",
        description: "Failed to fetch research content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger fetch on initial load if we don't have data
  React.useEffect(() => {
    if (research.length === 0 && videos.length === 0) {
      fetchResearchData();
    }
  }, []);

  const formatLastFetched = () => {
    if (!lastFetched) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - lastFetched.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.round(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return lastFetched.toLocaleDateString();
  };

  // Get all content and filter based on active tab
  const allContent: ContentItem[] = [...research, ...videos];
  const filteredContent = activeTab === 'all' 
    ? allContent
    : activeTab === 'research' 
      ? research 
      : videos;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#2e7d32]">Latest Research & Resources</h2>
        <p className="text-muted-foreground">
          Recent publications and educational content about menopause from trusted sources
        </p>
        
        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-muted-foreground">
            Last updated: {formatLastFetched()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchResearchData}
            disabled={isLoading}
            className="bg-transparent border-[#4caf50] text-[#4caf50] hover:bg-[#e8f5e9] hover:text-[#2e7d32]"
          >
            {isLoading ? (
              <span className="flex items-center gap-1">
                <RefreshCw className="h-4 w-4 animate-spin" /> Loading...
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <RefreshCw className="h-4 w-4" /> Refresh Content
              </span>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" onValueChange={setActiveTab}>
        <TabsList className="bg-[#f1f8e9]">
          <TabsTrigger value="all" className="data-[state=active]:bg-[#4caf50] data-[state=active]:text-white">
            All Resources
          </TabsTrigger>
          <TabsTrigger value="research" className="data-[state=active]:bg-[#4caf50] data-[state=active]:text-white">
            Research
          </TabsTrigger>
          <TabsTrigger value="videos" className="data-[state=active]:bg-[#4caf50] data-[state=active]:text-white">
            Videos
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="overflow-hidden backdrop-blur-sm bg-white/90 border border-[#e8f5e9]">
                  <CardHeader>
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredContent.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredContent.map((item) => (
                <Card 
                  key={item.id} 
                  className="overflow-hidden hover:shadow-md transition-shadow backdrop-blur-sm bg-white/90 border border-[#e8f5e9]"
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <CardTitle className="text-lg text-[#1b5e20] line-clamp-2">
                          {item.title}
                        </CardTitle>
                        <div className="flex items-center mt-1 space-x-2">
                          <Badge variant="outline" className={`
                            flex items-center gap-1
                            ${item.type === 'research' 
                              ? 'bg-[#e8f5e9] text-[#2e7d32] border-[#c5e1a5]'
                              : 'bg-[#e3f2fd] text-[#1565c0] border-[#90caf9]'
                            }
                          `}>
                            {item.type === 'research' ? (
                              <>
                                <Book className="h-3 w-3" />
                                <span>{item.source}</span>
                              </>
                            ) : (
                              <>
                                <Video className="h-3 w-3" />
                                <span>{item.channel}</span>
                              </>
                            )}
                          </Badge>
                          
                          <Badge variant="outline" className="flex items-center gap-1 bg-gray-100 text-gray-700">
                            <Calendar className="h-3 w-3" />
                            <span>{item.year}</span>
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {item.type === 'video' && item.thumbnail && (
                      <div className="aspect-video mb-3 rounded-md overflow-hidden bg-gray-100">
                        <img 
                          src={item.thumbnail} 
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <p className="text-gray-600 text-sm line-clamp-3">
                      {item.summary}
                    </p>
                  </CardContent>
                  
                  <CardFooter className="pt-0 flex justify-between">
                    {item.type === 'research' && item.authors && (
                      <div className="flex items-center text-xs text-gray-500 max-w-[70%]">
                        <Users className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{item.authors}</span>
                      </div>
                    )}
                    
                    <Button
                      variant="link"
                      size="sm"
                      className="ml-auto text-[#4caf50] hover:text-[#2e7d32] p-0 h-auto"
                      onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View {item.type === 'research' ? 'Publication' : 'Video'}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border rounded-lg bg-white/90">
              {fetchError ? (
                <Alert variant="warning" className="max-w-lg mx-auto">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>API Connection Issue</AlertTitle>
                  <AlertDescription>
                    <p className="mb-4">{fetchError}</p>
                    <div className="space-y-2">
                      <ApiStatusIndicator showDetails={true} />
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <p className="text-muted-foreground mb-4">
                  No content available for this category.
                </p>
              )}
              <Button 
                onClick={fetchResearchData}
                className="bg-[#4caf50] hover:bg-[#388e3c] mt-4"
              >
                Search for Research
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
