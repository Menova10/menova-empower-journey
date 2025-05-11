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
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

interface ResearchItem {
  id: string;
  title: string;
  source: string;
  year: string;
  authors?: string;
  summary: string;
  url: string;
  type: 'research';
  isOpenAIGenerated?: boolean;
  isStaticFallback?: boolean;
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
  isOpenAIGenerated?: boolean;
  isStaticFallback?: boolean;
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
        
        // Determine which APIs were used based on the data
        const usedOpenAI = data.research?.some(item => item.isOpenAIGenerated) || 
                           data.videos?.some(item => item.isOpenAIGenerated);
        const usedStaticFallback = data.research?.some(item => item.isStaticFallback) || 
                                   data.videos?.some(item => item.isStaticFallback);
        
        // Generate appropriate message based on data source
        let sourceMessage = "";
        if (usedOpenAI && !usedStaticFallback) {
          sourceMessage = " (sourced via OpenAI)";
        } else if (usedStaticFallback) {
          sourceMessage = " (using backup content)";
        }
        
        // Display toast notification with fetch results
        toast({
          title: "Research Updated",
          description: `Found ${data.research.length} research articles${data.videos.length > 0 ? ` and ${data.videos.length} videos` : ''}${sourceMessage}`,
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
            <div className="w-full">
              <Skeleton className="h-64 w-full" />
            </div>
          ) : filteredContent.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-[#f1f8e9]">
                  <TableRow>
                    <TableHead className="font-semibold text-[#2e7d32] w-1/2">Title & Description</TableHead>
                    <TableHead className="font-semibold text-[#2e7d32]">Type</TableHead>
                    <TableHead className="font-semibold text-[#2e7d32]">Year</TableHead>
                    <TableHead className="font-semibold text-[#2e7d32]">Source</TableHead>
                    <TableHead className="font-semibold text-[#2e7d32] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContent.map((item) => (
                    <TableRow key={item.id} className="hover:bg-[#f9fbf6]">
                      <TableCell className="align-top">
                        <div>
                          <div className="font-medium text-[#1b5e20]">{item.title}</div>
                          <div className="text-sm text-gray-600 line-clamp-2 mt-1">{item.summary}</div>
                          {item.type === 'research' && item.authors && (
                            <div className="flex items-center text-xs text-gray-500 mt-2">
                              <Users className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{item.authors}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        {item.type === 'research' ? (
                          <Badge variant="outline" className="flex items-center gap-1 bg-[#e8f5e9] text-[#2e7d32] border-[#c5e1a5]">
                            <Book className="h-3 w-3" />
                            <span>Article</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="flex items-center gap-1 bg-[#e3f2fd] text-[#1565c0] border-[#90caf9]">
                            <Video className="h-3 w-3" />
                            <span>Video</span>
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1 text-gray-500" />
                          <span>{item.year}</span>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        {item.type === 'research' ? item.source : item.channel}
                      </TableCell>
                      <TableCell className="text-right align-top">
                        <Button
                          variant="link"
                          size="sm"
                          className="text-[#4caf50] hover:text-[#2e7d32] p-0 h-auto"
                          onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 border rounded-lg bg-white/90">
              {fetchError ? (
                <Alert variant="default" className="max-w-lg mx-auto">
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
