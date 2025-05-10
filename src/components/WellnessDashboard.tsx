import React, { useEffect, useState } from 'react';
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';

interface WellnessGoal {
  category: string;
  completed: number;
  total: number;
}

interface SymptomRating {
  symptom: string;
  intensity: number;
}

interface DailyInsight {
  quote: string;
  author: string;
  isLoading: boolean;
}

const WellnessDashboard = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<WellnessGoal[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomRating[]>([]);
  const [insight, setInsight] = useState<DailyInsight>({ 
    quote: "", 
    author: "",
    isLoading: true 
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Calculate overall progress
  const overallProgress = goals.length > 0 
    ? Math.round((goals.reduce((acc, goal) => acc + goal.completed, 0) / goals.reduce((acc, goal) => acc + goal.total, 0)) * 100) 
    : 0;

  // Fetch daily inspirational quote
  useEffect(() => {
    const fetchDailyQuote = async () => {
      try {
        const response = await supabase.functions.invoke('daily-quote');
        
        if (response.error) {
          throw new Error(response.error.message);
        }
        
        if (response.data) {
          setInsight({
            quote: response.data.q,
            author: response.data.a,
            isLoading: false
          });
        }
      } catch (error) {
        console.error("Error fetching daily quote:", error);
        // Set fallback quote if API fails
        setInsight({
          quote: "Your body and mind are in harmony. Reflect on this balance today.",
          author: "MeNova",
          isLoading: false
        });
        toast({
          title: "Could not load daily quote",
          description: "Using a fallback quote for today.",
          variant: "destructive",
        });
      }
    };

    fetchDailyQuote();
  }, [toast]);

  useEffect(() => {
    const fetchWellnessData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Fetch wellness goals
        const { data: goalsData, error: goalsError } = await supabase
          .from('wellness_goals')
          .select('*')
          .eq('user_id', session.user.id);

        if (goalsError) throw goalsError;
        
        if (goalsData && goalsData.length > 0) {
          setGoals(goalsData.map((goal: any) => ({
            category: goal.category,
            completed: goal.completed,
            total: goal.total
          })));
        } else {
          // Provide default data if none exists
          setGoals([
            { category: "Nourish", completed: 2, total: 3 },
            { category: "Centre", completed: 1, total: 1 },
            { category: "Play", completed: 0, total: 2 }
          ]);
          
          // Insert default goals for this user
          const defaultGoals = [
            { category: "Nourish", completed: 2, total: 3, user_id: session.user.id },
            { category: "Centre", completed: 1, total: 1, user_id: session.user.id },
            { category: "Play", completed: 0, total: 2, user_id: session.user.id }
          ];
          
          await supabase.from('wellness_goals').insert(defaultGoals);
        }

        // Fetch symptom data
        const { data: symptomData, error: symptomError } = await supabase
          .from('symptom_tracking')
          .select('*')
          .eq('user_id', session.user.id)
          .order('recorded_at', { ascending: false })
          .limit(3);

        if (symptomError) throw symptomError;
        
        if (symptomData && symptomData.length > 0) {
          setSymptoms([
            { symptom: "Hot Flashes", intensity: symptomData.find((s: any) => s.symptom === 'hot_flashes')?.intensity || 3 },
            { symptom: "Sleep Quality", intensity: symptomData.find((s: any) => s.symptom === 'sleep')?.intensity || 2 },
            { symptom: "Mood", intensity: symptomData.find((s: any) => s.symptom === 'mood')?.intensity || 4 }
          ]);
        } else {
          // Provide default symptom data if none exists
          setSymptoms([
            { symptom: "Hot Flashes", intensity: 3 },
            { symptom: "Sleep Quality", intensity: 2 },
            { symptom: "Mood", intensity: 4 }
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

  const handleAskAboutProgress = () => {
    // Navigate to the new Today's Wellness page
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
          <p className="text-sm text-gray-600 mb-4">Your daily goals and activities</p>
          
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
                  <span className="text-sm font-medium">{goal.category}</span>
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
        
        {/* Symptom Overview Card */}
        <div className="bg-white/90 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-[#7d6285] mb-2">Symptom Overview</h3>
          <p className="text-sm text-gray-600 mb-6">This week's symptom trends</p>
          
          <div className="space-y-6">
            {symptoms.map((symptom, index) => (
              <div key={index} className="flex items-center">
                <div className="w-1/3 text-sm font-medium">{symptom.symptom}</div>
                <div className="w-2/3 flex space-x-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <div 
                      key={rating} 
                      className={`h-6 w-6 rounded-full ${
                        rating <= symptom.intensity
                          ? symptom.symptom === "Hot Flashes" 
                            ? "bg-[#FFDEE2]/80" 
                            : symptom.symptom === "Sleep Quality" 
                              ? "bg-menova-green/80" 
                              : "bg-[#d9b6d9]/80"
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
            
            <Button 
              variant="outline" 
              className="w-full border-menova-green text-menova-green hover:bg-menova-green/10 mt-4"
              onClick={() => navigate('/symptom-tracker')}
            >
              View Full Tracker
            </Button>
          </div>
        </div>
        
        {/* Today's Insight Card - Modified to fetch dynamic quotes */}
        <div className="bg-white/90 rounded-lg shadow-sm p-6 flex flex-col">
          <h3 className="text-lg font-medium text-[#7d6285] mb-2">Today's Insight</h3>
          <p className="text-sm text-gray-600 mb-6">Daily wisdom for your journey</p>
          
          <div className="flex-1 flex flex-col items-center justify-center">
            {insight.isLoading ? (
              <div className="animate-pulse w-full">
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto"></div>
              </div>
            ) : (
              <blockquote className="text-center text-gray-700 italic mb-4">
                <p className="mb-3">"{insight.quote}"</p>
                <footer className="text-sm text-gray-500">— {insight.author}</footer>
              </blockquote>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WellnessDashboard;
