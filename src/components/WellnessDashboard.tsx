
import React, { useEffect, useState } from 'react';
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import VapiAssistant from './VapiAssistant';
import { useRef } from 'react';

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
}

const WellnessDashboard = () => {
  const [goals, setGoals] = useState<WellnessGoal[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomRating[]>([]);
  const [insight, setInsight] = useState<DailyInsight>({ quote: "" });
  const [loading, setLoading] = useState(true);
  const vapiRef = useRef(null);

  // Calculate overall progress
  const overallProgress = goals.length > 0 
    ? Math.round((goals.reduce((acc, goal) => acc + goal.completed, 0) / goals.reduce((acc, goal) => acc + goal.total, 0)) * 100) 
    : 0;

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

        // Fetch daily insight
        const { data: insightData, error: insightError } = await supabase
          .from('daily_insights')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (insightError) throw insightError;
        
        if (insightData && insightData.length > 0) {
          setInsight({ quote: insightData[0].quote });
        } else {
          // Provide default insight if none exists
          const defaultQuote = "Your body is transitioning, but your spirit remains steadfast. Honor both with kindness today.";
          setInsight({ quote: defaultQuote });
          
          // Insert a default insight for this user
          await supabase.from('daily_insights').insert({
            user_id: session.user.id,
            quote: defaultQuote
          });
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
    if (vapiRef.current) {
      const message = `You've completed ${overallProgress}% of your daily goals. ${
        goals.map(goal => `For ${goal.category}, you've completed ${goal.completed} out of ${goal.total} activities.`).join(' ')
      }`;
      
      // @ts-ignore - The vapiRef.current.speak method exists but TypeScript doesn't recognize it
      vapiRef.current.speak(message);
    }
  };

  const handleTalkToMeNova = () => {
    if (vapiRef.current) {
      // @ts-ignore - The vapiRef.current.speak method exists but TypeScript doesn't recognize it
      vapiRef.current.speak("Hello! I'm MeNova, your wellness companion. How can I help you today?");
    }
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
              onClick={() => window.location.href = '/symptom-tracker'}
            >
              View Full Tracker
            </Button>
          </div>
        </div>
        
        {/* Today's Insight Card */}
        <div className="bg-white/90 rounded-lg shadow-sm p-6 flex flex-col">
          <h3 className="text-lg font-medium text-[#7d6285] mb-2">Today's Insight</h3>
          <p className="text-sm text-gray-600 mb-6">MeNova's wisdom for you</p>
          
          <div className="flex-1 flex flex-col items-center justify-center">
            <blockquote className="text-center text-gray-700 italic mb-8">
              "{insight.quote}"
            </blockquote>
            
            <Button 
              className="w-full bg-[#d9b6d9] hover:bg-[#d9b6d9]/80 text-white mb-4"
              onClick={handleTalkToMeNova}
            >
              Talk to MeNova
            </Button>
            
            <VapiAssistant ref={vapiRef} />
            <span className="text-sm text-gray-500 mt-2">Speak to MeNova</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WellnessDashboard;
