import * as React from 'react';
import { useEffect, useState } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { Database } from '../types/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Volume2 } from 'lucide-react';

type ContentItem = Database['public']['Tables']['content_hub']['Row'];

export default function ContentHub() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [userSymptoms, setUserSymptoms] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('articles');
  const [speaking, setSpeaking] = useState(false);

  const supabase = useSupabaseClient<Database>();
  const user = useUser();

  useEffect(() => {
    fetchContent();
    if (user) {
      fetchUserSymptoms();
    }
  }, [user]);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('content_hub')
        .select('*');

      if (error) throw error;
      setContent(data || []);
    } catch (error) {
      console.error('Error fetching content:', error);
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

  const isContentPersonalized = (item: ContentItem) => {
    if (!user || !userSymptoms.length || !item.related_symptoms) return false;
    return item.related_symptoms.some(symptom => 
      userSymptoms.includes(symptom.toLowerCase())
    );
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
    activeTab === 'articles' ? item.content_type === 'article' : item.content_type === 'video'
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
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
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Content Hub</h2>
        <p className="text-muted-foreground">
          Discover personalized articles and videos to support your menopause journey.
        </p>
      </div>

      <Tabs defaultValue="articles" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-4">
          {filteredContent.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{item.title}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => speakContent(item.description || item.title)}
                  >
                    <Volume2 className={speaking ? 'text-primary' : ''} />
                  </Button>
                </div>
                {isContentPersonalized(item) && (
                  <Badge variant="secondary" className="w-fit">
                    Personalized for you
                  </Badge>
                )}
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {item.tags?.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="videos" className="space-y-4">
          {filteredContent.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                {isContentPersonalized(item) && (
                  <Badge variant="secondary" className="w-fit">
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
                  {item.tags?.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
} 