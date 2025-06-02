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

interface MenopauseTip {
  tip: string;
  category: string;
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
  const [overallProgress, setOverallProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [menopauseTip, setMenopauseTip] = useState<MenopauseTip>({
    tip: "",
    category: "",
    isLoading: true
  });
  const { toast } = useToast();

  // Menopause tips collection
  const menopauseTips = [
    {
      tip: "Stay hydrated! Drinking plenty of water can help reduce hot flashes and improve overall energy levels.",
      category: "Hydration"
    },
    {
      tip: "Regular exercise can help manage mood swings and improve sleep quality during menopause.",
      category: "Exercise"
    },
    {
      tip: "Include phytoestrogen-rich foods like soy, flaxseeds, and legumes in your diet to help balance hormones naturally.",
      category: "Nutrition"
    },
    {
      tip: "Practice deep breathing exercises during hot flashes to help your body cool down faster.",
      category: "Wellness"
    },
    {
      tip: "Keep your bedroom cool and wear breathable fabrics to improve sleep quality during night sweats.",
      category: "Sleep"
    },
    {
      tip: "Calcium and Vitamin D supplements can help maintain bone health during menopause.",
      category: "Supplements"
    },
    {
      tip: "Stress management through meditation or yoga can significantly reduce menopause symptoms.",
      category: "Mental Health"
    },
    {
      tip: "Layer your clothing so you can easily adjust to temperature changes throughout the day.",
      category: "Comfort"
    },
    {
      tip: "Keep a symptom diary to identify patterns and triggers for your menopause symptoms.",
      category: "Tracking"
    },
    {
      tip: "Don't hesitate to talk to your healthcare provider about hormone therapy options if symptoms are severe.",
      category: "Medical"
    },
    {
      tip: "Join a menopause support group or connect with other women going through similar experiences.",
      category: "Support"
    },
    {
      tip: "Limit caffeine and alcohol intake, as they can trigger hot flashes and disrupt sleep.",
      category: "Lifestyle"
    }
  ];

  // Get daily menopause tip
  const getDailyMenopauseTip = () => {
    setMenopauseTip({ tip: "", category: "", isLoading: true });
    
    // Use date to ensure same tip shows for the whole day
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    const tipIndex = dayOfYear % menopauseTips.length;
    
    setTimeout(() => {
      setMenopauseTip({
        tip: menopauseTips[tipIndex].tip,
        category: menopauseTips[tipIndex].category,
        isLoading: false
      });
    }, 500); // Small delay to show loading state
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
    getDailyMenopauseTip();

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
        
        {/* Menopause Tip Card */}
        <div className="bg-white/90 rounded-lg shadow-sm p-6 flex flex-col">
          <h3 className="text-lg font-medium text-[#7d6285] mb-2">Today's Menopause Tip</h3>
          <p className="text-sm text-gray-600 mb-6">Daily guidance for your menopause journey</p>
          
          <div className="flex-1 flex flex-col items-center justify-center">
            {menopauseTip.isLoading ? (
              <div className="animate-pulse w-full">
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto"></div>
              </div>
            ) : (
              <div className="text-center">
                <div className="bg-menova-green/10 rounded-full px-3 py-1 mb-4 inline-block">
                  <span className="text-xs font-medium text-menova-green">{menopauseTip.category}</span>
                </div>
                <p className="text-gray-700 leading-relaxed mb-4">{menopauseTip.tip}</p>
                <div className="text-sm text-gray-500">💡 MeNova Tip</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WellnessDashboard;
