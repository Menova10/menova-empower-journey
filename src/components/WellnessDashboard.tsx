import React, { useEffect, useState } from 'react';
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Minus, Play, ExternalLink, Video } from 'lucide-react';
import { calculateSymptomTrends } from "@/services/symptomService";
import { ChartDataPoint } from '@/types/symptoms';

interface WellnessGoal {
  category: string;
  completed: number;
  total: number;
}

interface SymptomRating {
  symptom: string;
  intensity: number;
  lastUpdated?: string;
  trend?: 'increasing' | 'decreasing' | 'stable';
}

interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  url: string;
}

interface ResourcesData {
  videos: YouTubeVideo[];
  isLoading: boolean;
}

// YouTube API configuration
const YOUTUBE_API_KEY = 'AIzaSyAuADSwSw95dF4d57eVGHVLDU-OxDg9eos';
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3/search';

// Standardize category names to prevent duplication
const normalizeCategory = (category: string): string => {
  // Convert to lowercase for consistency
  const lowerCategory = category.toLowerCase();
  
  // Map 'centre' to 'center' for consistency
  if (lowerCategory === 'centre') return 'center';
  
  return lowerCategory;
};

const WellnessDashboard = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<WellnessGoal[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomRating[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resourcesData, setResourcesData] = useState<ResourcesData>({
    videos: [],
    isLoading: true
  });
  const { toast } = useToast();

  // Fetch top 5 menopause videos from YouTube
  const fetchTopVideos = async () => {
    setResourcesData({ videos: [], isLoading: true });
    
    try {
      const response = await fetch(
        `${YOUTUBE_API_BASE_URL}?part=snippet&type=video&maxResults=5&q=menopause%20tips%20wellness&key=${YOUTUBE_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      
      const videos: YouTubeVideo[] = data.items?.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title.length > 40 ? item.snippet.title.substring(0, 40) + '...' : item.snippet.title,
        thumbnail: item.snippet.thumbnails.default?.url,
        channelTitle: item.snippet.channelTitle,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`
      })) || [];

      setResourcesData({
        videos,
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching videos:', error);
      setResourcesData({
        videos: [],
        isLoading: false
      });
    }
  };

  // Calculate overall progress
  const calculateOverallProgress = (goals: WellnessGoal[]) => {
    const totalGoals = goals.reduce((sum, goal) => sum + goal.total, 0);
    const completedGoals = goals.reduce((sum, goal) => sum + goal.completed, 0);
    return totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;
  };

  // Format date for display
  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  useEffect(() => {
    fetchTopVideos();

    const fetchWellnessData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        
        // Fetch wellness goals
        const { data: goalsData, error: goalsError } = await supabase
          .from('wellness_goals')
          .select('*')
          .eq('user_id', session.user.id);

        if (goalsError) throw goalsError;

        // Process goals data
        const processedGoals = goalsData?.reduce((acc: WellnessGoal[], goal) => {
          const normalizedCategory = normalizeCategory(goal.category);
          const existingGoal = acc.find(g => g.category === normalizedCategory);
          
          if (existingGoal) {
            existingGoal.total += 1;
            if (goal.completed) existingGoal.completed += 1;
            } else {
            acc.push({
                category: normalizedCategory,
              completed: goal.completed ? 1 : 0,
              total: 1
            });
          }
          return acc;
        }, []) || [];

        setGoals(processedGoals);
        setOverallProgress(calculateOverallProgress(processedGoals));

        // Fetch symptom data for the last 14 days
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const { data: symptomsData, error: symptomsError } = await supabase
          .from('symptom_tracking')
          .select('*')
          .eq('user_id', session.user.id)
          .gte('recorded_at', twoWeeksAgo.toISOString())
          .order('recorded_at', { ascending: false });

        if (symptomsError) throw symptomsError;

        // Process symptoms data
        const symptomMap = new Map();
        symptomsData?.forEach(symptom => {
          if (!symptomMap.has(symptom.symptom)) {
            symptomMap.set(symptom.symptom, {
              symptom: symptom.symptom,
              intensity: symptom.intensity,
              lastUpdated: symptom.recorded_at,
              values: [symptom.intensity],
              dates: [symptom.recorded_at]
            });
          } else {
            const existing = symptomMap.get(symptom.symptom);
            existing.values.push(symptom.intensity);
            existing.dates.push(symptom.recorded_at);
          }
        });

        // Calculate trends and format for display
        const processedSymptoms = Array.from(symptomMap.values()).map(symptom => {
          let trend = undefined;
          if (symptom.values.length >= 3) {
            const recent = symptom.values.slice(0, 3);
            const older = symptom.values.slice(-3);
            const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
            const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
            
            if (recentAvg > olderAvg + 0.5) trend = 'increasing';
            else if (recentAvg < olderAvg - 0.5) trend = 'decreasing';
            else trend = 'stable';
          }

          return {
            symptom: symptom.symptom,
            intensity: symptom.intensity,
            lastUpdated: symptom.lastUpdated,
            trend
          };
        });

        setSymptoms(processedSymptoms.slice(0, 3)); // Show top 3 symptoms
      } catch (error) {
        console.error("Error fetching wellness data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWellnessData();
  }, []);

  // Helper function to get the proper label for a category
  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      "nourish": "Nourish",
      "center": "Center",
      "play": "Play"
    };
    return labels[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Helper function to get trend icon
  const getTrendIcon = (trend?: string) => {
    if (!trend) return null;
    
    switch (trend) {
      case 'increasing':
        return <ArrowUpRight className="text-red-500 h-4 w-4" aria-label="Increasing trend" />;
      case 'decreasing':
        return <ArrowDownRight className="text-green-500 h-4 w-4" aria-label="Decreasing trend" />;
      case 'stable':
        return <Minus className="text-gray-500 h-4 w-4" aria-label="Stable trend" />;
      default:
        return null;
    }
  };

  // Helper function to get symptom color
  const getSymptomColor = (symptomName: string): string => {
    if (symptomName === "Hot Flashes") return "bg-[#E35C78]";
    if (symptomName === "Sleep Quality") return "bg-[#2E8540]";
    if (symptomName === "Mood") return "bg-[#9C27B0]";
    if (symptomName === "Energy") return "bg-[#E65100]";
    if (symptomName === "Anxiety") return "bg-[#0277BD]";
    return "bg-[#795548]";
  };

  const handleAskAboutProgress = () => {
    // Navigate to the Today's Wellness page
    navigate('/todays-wellness');
  };

  return (
    <section>
      <h2 className="text-xl font-semibold text-menova-text mb-4">
        Wellness Progress
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today's Wellness Card */}
        <div className="bg-white/90 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-[#7d6285] mb-2">Today's Wellness</h3>
          <p className="text-sm text-gray-600 mb-4">Daily summary from your wellness plan</p>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Today's Progress</span>
                <span className="text-sm font-medium">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2 bg-gray-100" />
            </div>
            
            {goals.map((goal, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">{getCategoryLabel(goal.category)} Goals</span>
                  <span className="text-sm font-medium">{goal.completed} of {goal.total} done</span>
                </div>
                <Progress 
                  value={(goal.completed / goal.total) * 100} 
                  className={`h-2 ${
                    goal.completed === 0 ? 'bg-gray-100' : ''
                  }`}
                />
              </div>
            ))}
            
            <Button 
              variant="outline" 
              onClick={handleAskAboutProgress}
              className="w-full border-menova-green text-menova-green hover:bg-menova-green/10 mt-4"
            >
              Ask about my progress
            </Button>
          </div>
        </div>
        
        {/* Symptom Overview Card - IMPROVED with trends */}
        <div className="bg-white/90 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-[#7d6285] mb-2">Symptom Overview</h3>
          <p className="text-sm text-gray-600 mb-4">
            This week's symptom trends <span className="text-xs text-gray-500">(based on last 14 days)</span>
          </p>
          
          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center animate-pulse">
                  <div className="w-1/3 h-4 bg-gray-200 rounded"></div>
                  <div className="w-2/3 flex space-x-2">
                    {[1, 2, 3, 4, 5].map(j => (
                      <div key={j} className="h-6 w-6 rounded-full bg-gray-200"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {symptoms.map((symptom, index) => (
                <div key={index} className="flex flex-col">
                  <div className="flex items-center mb-1 justify-between">
                    <div className="text-sm font-medium flex items-center gap-1">
                      {symptom.symptom} 
                      {getTrendIcon(symptom.trend)}
                    </div>
                    <div className="flex space-x-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <div 
                          key={rating} 
                          className={`h-6 w-6 rounded-full ${
                            rating <= symptom.intensity
                              ? getSymptomColor(symptom.symptom)
                              : "bg-gray-200"
                          } transition-all duration-300 ${
                            rating <= symptom.intensity ? "scale-100" : "scale-90"
                          }`}
                          aria-label={
                            rating <= symptom.intensity ? 
                              `${symptom.symptom} rating ${rating} out of 5` : 
                              `Unselected rating ${rating} out of 5`
                          }
                        />
                      ))}
                    </div>
                  </div>
                  {symptom.lastUpdated && (
                    <div className="text-xs text-gray-500">
                      Last updated: {formatLastUpdated(symptom.lastUpdated)}
                      {symptom.trend && (
                        <span className="ml-2">
                          {symptom.trend === 'increasing' ? 'Trending up' : 
                           symptom.trend === 'decreasing' ? 'Trending down' : 
                           'Stable'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              <Button 
                variant="outline" 
                className="w-full border-menova-green text-menova-green hover:bg-menova-green/10 mt-4"
                onClick={() => navigate('/symptom-tracker')}
              >
                Update Symptoms
              </Button>
            </div>
          )}
        </div>
        
        {/* Resources Card */}
        <div className="bg-white/90 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-[#7d6285] mb-2">Resources</h3>
          <p className="text-sm text-gray-600 mb-4">Top 5 videos on menopause</p>
          
          {resourcesData.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                  <div className="h-2 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {resourcesData.videos.map((video, index) => (
                <div key={index} className="group">
                  <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-shrink-0 mt-1">
                      <Video className="h-4 w-4 text-menova-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 leading-tight mb-1">
                        {video.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {video.channelTitle}
                      </p>
                    </div>
                    <button
                      onClick={() => window.open(video.url, '_blank')}
                      className="flex-shrink-0 p-1 text-menova-green hover:bg-menova-green/10 rounded transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
              
              <Button 
                variant="outline" 
                className="w-full border-menova-green text-menova-green hover:bg-menova-green/10 mt-4"
                onClick={() => navigate('/resources')}
              >
                View All Resources
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default WellnessDashboard;
