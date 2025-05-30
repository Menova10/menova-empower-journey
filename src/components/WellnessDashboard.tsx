import React, { useEffect, useState } from 'react';
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
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

interface DailyInsight {
  tip: string;
  source: string;
  isLoading: boolean;
}

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
  const [insight, setInsight] = useState<DailyInsight>({ 
    tip: "", 
    source: "",
    isLoading: true 
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Calculate overall progress
  const overallProgress = goals.length > 0 
    ? Math.round((goals.reduce((acc, goal) => acc + goal.completed, 0) / goals.reduce((acc, goal) => acc + goal.total, 0)) * 100) 
    : 0;

  // Fetch daily menopause tip
  useEffect(() => {
    const fetchDailyTip = async () => {
      try {
        const response = await supabase.functions.invoke('daily-menopause-tip');
        
        if (response.error) {
          throw new Error(response.error.message);
        }
        
        if (response.data) {
          setInsight({
            tip: response.data.tip,
            source: response.data.source || 'MeNova Health',
            isLoading: false
          });
        }
      } catch (error) {
        console.error("Error fetching daily tip:", error);
        // Set fallback tip if API fails
        setInsight({
          tip: "Stay hydrated and keep cool. Regular water intake can help manage hot flashes and maintain overall well-being during menopause.",
          source: "MeNova Health",
          isLoading: false
        });
        toast({
          title: "Could not load daily tip",
          description: "Using a helpful tip from our database.",
          variant: "destructive",
        });
      }
    };

    fetchDailyTip();
  }, [toast]);

  // Format date for display
  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  useEffect(() => {
    const fetchWellnessData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        console.log("Fetching wellness goals...");
        
        // Fetch wellness goals directly from wellness_goals table
        const { data: goalsData, error: goalsError } = await supabase
          .from('wellness_goals')
          .select('*')
          .eq('user_id', session.user.id);

        if (goalsError) {
          console.error("Error fetching wellness goals:", goalsError);
          throw goalsError;
        }
        
        console.log("Goals data:", goalsData);
        
        if (goalsData && goalsData.length > 0) {
          // Process goals data to merge any duplicate categories
          const normalizedGoals = new Map<string, WellnessGoal>();
          
          goalsData.forEach((goal: any) => {
            const normalizedCategory = normalizeCategory(goal.category);
            
            if (normalizedGoals.has(normalizedCategory)) {
              // If we already have this category, combine the values
              const existingGoal = normalizedGoals.get(normalizedCategory)!;
              normalizedGoals.set(normalizedCategory, {
                category: normalizedCategory,
                completed: existingGoal.completed + goal.completed,
                total: existingGoal.total + goal.total
              });
            } else {
              // Otherwise add it to our map
              normalizedGoals.set(normalizedCategory, {
                category: normalizedCategory,
                completed: goal.completed,
                total: goal.total
              });
            }
          });
          
          // Convert map back to array
          setGoals(Array.from(normalizedGoals.values()));
          
          // Log the normalized goals
          console.log("Normalized goals:", Array.from(normalizedGoals.values()));
        } else {
          console.log("No wellness goals found, creating defaults...");
          
          // If no wellness_goals data, create and store default goals
          const defaultGoals = [
            { category: "nourish", completed: 0, total: 3, user_id: session.user.id },
            { category: "center", completed: 0, total: 3, user_id: session.user.id },
            { category: "play", completed: 0, total: 3, user_id: session.user.id }
          ];
          
          // Insert default goals
          const { error: insertError } = await supabase
            .from('wellness_goals')
            .insert(defaultGoals);
          
          if (insertError) {
            console.error("Error inserting default wellness goals:", insertError);
            throw insertError;
          }
          
          // Use the default goals for display
          setGoals(defaultGoals.map(g => ({
            category: g.category,
            completed: g.completed,
            total: g.total
          })));
        }

        // Fetch symptom data - IMPROVED to get the most recent entries for each symptom type
        console.log("Fetching symptom data for user:", session.user.id);
        const today = new Date();
        const start = new Date();
        start.setDate(today.getDate() - 30); // Increased to last 30 days for better trend visibility
        
        const { data: symptomData, error: symptomError } = await supabase
          .from('symptom_tracking')
          .select('*')
          .eq('user_id', session.user.id)
          .gte('recorded_at', start.toISOString())
          .order('recorded_at', { ascending: false }); // Changed to descending to get most recent first

        if (symptomError) throw symptomError;

        // Log the raw symptom data to help debugging
        console.log("User symptoms data:", symptomData);
        
        if (symptomData && symptomData.length > 0) {
          // Group symptoms by type and get the most recent entry for each
          const latestSymptoms = new Map();
          symptomData.forEach((entry: any) => {
            if (!latestSymptoms.has(entry.symptom) || 
                new Date(entry.recorded_at) > new Date(latestSymptoms.get(entry.symptom).recorded_at)) {
              latestSymptoms.set(entry.symptom, entry);
            }
          });

          // Calculate trends using all data points
          const chartDataPoints: ChartDataPoint[] = symptomData.reduce((points: ChartDataPoint[], entry: any) => {
            const date = new Date(entry.recorded_at);
            const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
            
            // Find if we already have a point for this date
            let point = points.find(p => p.date === dateString);
            
            if (!point) {
              point = { date: dateString, rawDate: date };
              points.push(point);
            }
            
            // Add symptom data to point
            point[entry.symptom] = entry.intensity;
            
            return points;
          }, []);
          
          // Sort by date
          chartDataPoints.sort((a, b) => 
            (a.rawDate?.getTime() || 0) - (b.rawDate?.getTime() || 0)
          );
          
          // Calculate trends
          const trends = calculateSymptomTrends(chartDataPoints);
          console.log("Calculated symptom trends:", trends);
          
          // Create a Map to store the most recent entry for each symptom type
          const displaySymptoms: SymptomRating[] = [
            latestSymptoms.get('Hot Flashes') || { symptom: 'Hot Flashes', intensity: 0 },
            latestSymptoms.get('Sleep Quality') || { symptom: 'Sleep Quality', intensity: 0 },
            latestSymptoms.get('Mood') || { symptom: 'Mood', intensity: 0 }
          ];
          
          setSymptoms(displaySymptoms);
        } else {
          // Provide default symptom data if none exists
          setSymptoms([
            { symptom: "Hot Flashes", intensity: 0 },
            { symptom: "Sleep Quality", intensity: 0 },
            { symptom: "Mood", intensity: 0 }
          ]);
        }
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
        Your Wellness Dashboard
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today's Wellness Card */}
        <div className="bg-white/90 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-[#7d6285] mb-2">Today's Wellness</h3>
          <p className="text-sm text-gray-600 mb-4">Daily summary from your wellness plan</p>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm font-medium">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2 bg-gray-100" />
            </div>
            
            {goals.map((goal, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">{getCategoryLabel(goal.category)}</span>
                  <span className="text-sm font-medium">{goal.completed}/{goal.total}</span>
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
        
        {/* Today's Insight Card */}
        <div className="bg-white/90 rounded-lg shadow-sm p-6 flex flex-col">
          <h3 className="text-lg font-medium text-[#7d6285] mb-2">Today's Menopause Tip</h3>
          <p className="text-sm text-gray-600 mb-6">Daily wisdom for your menopause journey</p>
          
          <div className="flex-1 flex flex-col items-center justify-center">
            {insight.isLoading ? (
              <div className="animate-pulse w-full">
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto"></div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-700 mb-4">{insight.tip}</p>
                <footer className="text-sm text-gray-500">Source: {insight.source}</footer>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WellnessDashboard;
