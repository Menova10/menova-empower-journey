import React, { useEffect, useState, useCallback } from 'react';
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Minus, Play, ExternalLink, Video, RefreshCw } from 'lucide-react';
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
  const location = useLocation();
  const [goals, setGoals] = useState<WellnessGoal[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomRating[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resourcesData, setResourcesData] = useState<ResourcesData>({
    videos: [],
    isLoading: true
  });
  const { toast } = useToast();

  // Fetch top 3 menopause videos from YouTube with thumbnails
  const fetchTopVideos = async () => {
    setResourcesData({ videos: [], isLoading: true });
    
    try {
      const response = await fetch(
        `${YOUTUBE_API_BASE_URL}?part=snippet&type=video&maxResults=3&q=menopause%20tips%20wellness&key=${YOUTUBE_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      
      const videos: YouTubeVideo[] = data.items?.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title.length > 35 ? item.snippet.title.substring(0, 35) + '...' : item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        channelTitle: item.snippet.channelTitle.length > 20 ? item.snippet.channelTitle.substring(0, 20) + '...' : item.snippet.channelTitle,
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

  // Dynamic data fetching function
  const fetchWellnessData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Get today's date for filtering
      const today = new Date().toISOString().split('T')[0];
        
      // Fetch today's daily goals with more detailed information
      const { data: goalsData, error: goalsError } = await supabase
        .from('daily_goals')
        .select(`
          id,
          category,
          completed,
          goal,
          created_at
        `)
        .eq('user_id', session.user.id)
        .eq('date', today)
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      // Process goals data by category with improved accuracy
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

      // Ensure all categories are represented
      const categories = ['nourish', 'center', 'play'];
      categories.forEach(category => {
        if (!processedGoals.find(g => g.category === category)) {
          processedGoals.push({
            category,
            completed: 0,
            total: 0
          });
        }
      });

      // Debug logging for goal tracking
      console.log('Fetched daily goals:', {
        date: today,
        rawGoals: goalsData,
        processedGoals,
        totalGoals: goalsData?.length || 0,
        completedGoals: goalsData?.filter(g => g.completed)?.length || 0
      });

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

      setSymptoms(processedSymptoms.slice(0, 4)); // Show top 4 symptoms
      
      if (showRefreshIndicator) {
        toast({
          title: "Data refreshed!",
          description: "Your wellness progress has been updated.",
        });
        }
      } catch (error) {
        console.error("Error fetching wellness data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch wellness data. Please try again.",
        variant: "destructive"
      });
      } finally {
        setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  // Manual refresh function
  const handleRefresh = () => {
    fetchWellnessData(true);
  };

  useEffect(() => {
    fetchTopVideos();
    fetchWellnessData();
  }, [fetchWellnessData]);

  // Re-fetch data when returning to this route
  useEffect(() => {
    const handleFocus = () => {
      fetchWellnessData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchWellnessData]);

  // Re-fetch when location changes (navigation)
  useEffect(() => {
    fetchWellnessData();
  }, [location.pathname, fetchWellnessData]);

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

  // Helper function to get symptom color with improved visual appeal
  const getSymptomColor = (symptomName: string): string => {
    // Normalize symptom name for consistent matching
    const normalizedName = symptomName.toLowerCase().replace(/[_\s-]/g, '');
    
    // Hot flashes - warm red/coral
    if (normalizedName.includes('hotflash') || normalizedName.includes('hotflushes')) {
      return "bg-gradient-to-r from-red-400 to-pink-500";
    }
    
    // Headache - deep purple
    if (normalizedName.includes('headache') || normalizedName.includes('head')) {
      return "bg-gradient-to-r from-purple-500 to-indigo-600";
    }
    
    // Brain fog - yellow/orange (representing mental cloudiness/confusion)
    if (normalizedName.includes('brainfog') || normalizedName.includes('cognitive') || normalizedName.includes('memory')) {
      return "bg-gradient-to-r from-yellow-400 to-orange-500";
    }
    
    // Sleep related - deep teal/green
    if (normalizedName.includes('sleep') || normalizedName.includes('insomnia')) {
      return "bg-gradient-to-r from-teal-500 to-emerald-600";
    }
    
    // Mood related - warm purple/pink
    if (normalizedName.includes('mood') || normalizedName.includes('irritab') || normalizedName.includes('depression')) {
      return "bg-gradient-to-r from-violet-500 to-purple-600";
    }
    
    // Anxiety - calming blue
    if (normalizedName.includes('anxiety') || normalizedName.includes('stress') || normalizedName.includes('panic')) {
      return "bg-gradient-to-r from-blue-500 to-cyan-600";
    }
    
    // Energy/Fatigue - golden orange
    if (normalizedName.includes('energy') || normalizedName.includes('fatigue') || normalizedName.includes('tired')) {
      return "bg-gradient-to-r from-amber-500 to-orange-600";
    }
    
    // Joint/Physical pain - warm brown/red
    if (normalizedName.includes('joint') || normalizedName.includes('pain') || normalizedName.includes('ache')) {
      return "bg-gradient-to-r from-rose-500 to-red-600";
    }
    
    // Weight related - earth tones
    if (normalizedName.includes('weight') || normalizedName.includes('bloat')) {
      return "bg-gradient-to-r from-stone-500 to-amber-600";
    }
    
    // Default - gentle gradient
    return "bg-gradient-to-r from-gray-500 to-slate-600";
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
        {/* Today's Wellness Card - ENHANCED with Dynamic Circular Progress */}
        <div className="bg-white/90 rounded-lg shadow-sm p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium text-[#7d6285]">Today's Wellness</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 w-8 p-0 hover:bg-menova-green/10"
            >
              <RefreshCw className={`h-4 w-4 text-menova-green ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mb-6">Daily summary from your wellness plan</p>
          
          <div className="flex flex-col items-center space-y-4 flex-1">
            {/* Circular Progress Visualization - More Compact */}
            <div className="relative w-32 h-32">
              {/* Main circular progress */}
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                {/* Background circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#f3f4f6"
                  strokeWidth="6"
                />
                
                {/* Progress circle with gradient */}
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#6ee7b7" />
                  </linearGradient>
                </defs>
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="url(#progressGradient)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(overallProgress / 100) * 314} 314`}
                  className="transition-all duration-1000 ease-out"
                  style={{
                    filter: 'drop-shadow(0 1px 3px rgba(16, 185, 129, 0.3))'
                  }}
                />
                
                {/* Individual goal segments */}
                {goals.map((goal, index) => {
                  const colors = [
                    { stroke: '#f59e0b', shadow: 'rgba(245, 158, 11, 0.3)' }, // amber for nourish
                    { stroke: '#8b5cf6', shadow: 'rgba(139, 92, 246, 0.3)' }, // violet for center  
                    { stroke: '#ef4444', shadow: 'rgba(239, 68, 68, 0.3)' }    // red for play
                  ];
                  const color = colors[index % colors.length];
                  const segmentLength = 60; // shorter segments
                  const startOffset = index * 110; // spacing between segments
                  const progress = (goal.completed / goal.total) * segmentLength;
                  
                  return (
                    <circle
                      key={index}
                      cx="60"
                      cy="60"
                      r="37"
                      fill="none"
                      stroke={color.stroke}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${progress} ${segmentLength}`}
                      strokeDashoffset={-startOffset}
                      className="transition-all duration-1000 ease-out"
                      style={{
                        filter: `drop-shadow(0 1px 2px ${color.shadow})`
                      }}
                    />
                  );
                })}
              </svg>
              
              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-xl font-bold text-[#7d6285] animate-pulse">
                  {overallProgress}%
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  Overall
                </div>
              </div>
              
              {/* Floating achievement indicator */}
              {overallProgress >= 80 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                  <span className="text-white text-xs">✨</span>
                </div>
              )}
            </div>
            
            {/* Goal Legend with Progress - More Compact */}
            <div className="w-full space-y-2 flex-1">
              {goals.map((goal, index) => {
                const colors = ['text-amber-600', 'text-violet-600', 'text-red-600'];
                const bgColors = ['bg-amber-50', 'bg-violet-50', 'bg-red-50'];
                const colorClass = colors[index % colors.length];
                const bgClass = bgColors[index % bgColors.length];
                const percentage = Math.round((goal.completed / goal.total) * 100);
                
                return (
                  <div key={index} className={`flex items-center justify-between p-2 rounded-lg ${bgClass} border border-opacity-20`}>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${colorClass.replace('text-', 'bg-')}`}></div>
                      <span className="text-xs font-medium text-gray-700">
                        {getCategoryLabel(goal.category)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-600">
                        {goal.completed}/{goal.total}
                      </span>
                      <span className={`text-xs font-bold ${colorClass}`}>
                        {percentage}%
                      </span>
                    </div>
                </div>
                );
              })}
              </div>
          </div>
          
          {/* Button pushed to bottom */}
          <div className="mt-6">
            <Button 
              variant="outline" 
              onClick={handleAskAboutProgress}
              className="w-full border-menova-green text-menova-green hover:bg-menova-green/10 transition-all duration-300 text-sm py-2"
            >
              Ask about my progress
            </Button>
          </div>
        </div>
        
        {/* Symptom Overview Card - IMPROVED with trends and better space utilization */}
        <div className="bg-white/90 rounded-lg shadow-sm p-6 h-full flex flex-col">
          <h3 className="text-lg font-medium text-[#7d6285] mb-2">Symptom Overview</h3>
          <p className="text-sm text-gray-600 mb-6">
            Recent trends <span className="text-xs text-gray-500">(14 days)</span>
          </p>
          
          {loading ? (
            <div className="space-y-4 flex-1">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center animate-pulse">
                  <div className="w-1/3 h-4 bg-gray-200 rounded"></div>
                  <div className="w-2/3 flex space-x-2 ml-3">
                    {[1, 2, 3, 4, 5].map(j => (
                      <div key={j} className="h-4 w-4 rounded-full bg-gray-200"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              {symptoms.map((symptom, index) => (
                <div key={index} className="flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <span className="truncate max-w-[100px]">{symptom.symptom}</span>
                      {getTrendIcon(symptom.trend)}
                    </div>
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <div 
                          key={rating} 
                          className={`h-4 w-4 rounded-full ${
                            rating <= symptom.intensity
                              ? getSymptomColor(symptom.symptom)
                              : "bg-gray-200"
                          } transition-all duration-300`}
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
                    <div className="text-xs text-gray-500 mb-1">
                      {formatLastUpdated(symptom.lastUpdated)}
                      {symptom.trend && (
                        <span className="ml-2">
                          • {symptom.trend === 'increasing' ? '↗ Trending up' : 
                             symptom.trend === 'decreasing' ? '↘ Trending down' : 
                             '→ Stable'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-6">
            <Button 
              variant="outline" 
              className="w-full border-menova-green text-menova-green hover:bg-menova-green/10 py-2"
              onClick={() => navigate('/symptom-tracker')}
            >
              Update Symptoms
            </Button>
          </div>
        </div>
        
        {/* Resources Card - Better space utilization */}
        <div className="bg-white/90 rounded-lg shadow-sm p-6 h-full flex flex-col">
          <h3 className="text-lg font-medium text-[#7d6285] mb-2">Resources</h3>
          <p className="text-sm text-gray-600 mb-6">Top menopause videos</p>
          
          {resourcesData.isLoading ? (
            <div className="space-y-3 flex-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex gap-3">
                  <div className="w-16 h-12 bg-gray-200 rounded flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-2 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
              </div>
            ) : (
            <div className="space-y-3 flex-1">
              {resourcesData.videos.map((video, index) => (
                <div key={index} className="group">
                  <div 
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-menova-green/20"
                    onClick={() => window.open(video.url, '_blank')}
                  >
                    {/* Video Thumbnail - Compact */}
                    <div className="relative flex-shrink-0">
                      <img 
                        src={video.thumbnail} 
                        alt={video.title}
                        className="w-14 h-10 object-cover rounded bg-gray-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      {/* Fallback thumbnail */}
                      <div className="hidden w-14 h-10 bg-gray-200 rounded flex items-center justify-center">
                        <Video className="h-5 w-5 text-gray-400" />
                      </div>
                      {/* Play button overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="h-3 w-3 text-white fill-white" />
                      </div>
                    </div>
                    
                    {/* Video Info - Compact */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 leading-tight mb-1 group-hover:text-menova-green transition-colors line-clamp-2">
                        {video.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {video.channelTitle}
                      </p>
                    </div>
                    
                    {/* External link indicator */}
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="h-4 w-4 text-menova-green" />
                    </div>
                  </div>
                </div>
              ))}
              </div>
            )}
          
          <div className="mt-6">
            <Button 
              variant="outline" 
              className="w-full border-menova-green text-menova-green hover:bg-menova-green/10 py-2"
              onClick={() => navigate('/resources')}
            >
              View All Resources
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WellnessDashboard;
