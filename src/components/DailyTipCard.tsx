import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Lightbulb, RefreshCw, Heart, Sparkles, Clock, ChevronRight, Star } from 'lucide-react';

interface DailyInsight {
  tip: string;
  source: string;
  isLoading: boolean;
}

interface NudgeAction {
  id: string;
  text: string;
  action: () => void;
  icon: React.ReactNode;
  color: string;
}

const DailyTipCard: React.FC = () => {
  const { toast } = useToast();
  const [insight, setInsight] = useState<DailyInsight>({ 
    tip: "", 
    source: "",
    isLoading: true 
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tipOfDay, setTipOfDay] = useState(0);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

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
        
        // Fallback tips array for variety
        const fallbackTips = [
          {
            tip: "Stay hydrated and keep cool. Regular water intake can help manage hot flashes and maintain overall well-being during menopause.",
            source: "MeNova Health"
          },
          {
            tip: "Practice deep breathing exercises. Taking 6-8 slow, deep breaths can help reduce stress and manage hot flash intensity.",
            source: "MeNova Wellness"
          },
          {
            tip: "Consider layering your clothing. Wearing layers allows you to easily adjust your temperature throughout the day.",
            source: "MeNova Tips"
          },
          {
            tip: "Maintain a regular sleep schedule. Going to bed and waking up at the same time can improve sleep quality during menopause.",
            source: "MeNova Sleep Guide"
          }
        ];
        
        const randomTip = fallbackTips[Math.floor(Math.random() * fallbackTips.length)];
        setInsight({
          tip: randomTip.tip,
          source: randomTip.source,
          isLoading: false
        });
      }
    };

    fetchDailyTip();
  }, [tipOfDay]);

  const refreshTip = () => {
    setInsight(prev => ({ ...prev, isLoading: true }));
    setTipOfDay(prev => prev + 1);
    toast({
      title: "Getting fresh wisdom",
      description: "Loading a new tip for you...",
    });
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const nudgeActions: NudgeAction[] = [
    {
      id: 'symptoms',
      text: 'Track your symptoms',
      action: () => window.location.href = '/symptom-tracker',
      icon: <Heart className="h-4 w-4" />,
      color: 'bg-rose-100 text-rose-700 hover:bg-rose-200'
    },
    {
      id: 'wellness',
      text: 'Check wellness goals',
      action: () => window.location.href = '/todays-wellness',
      icon: <Star className="h-4 w-4" />,
      color: 'bg-purple-100 text-purple-700 hover:bg-purple-200'
    },
    {
      id: 'resources',
      text: 'Explore resources',
      action: () => window.location.href = '/resources',
      icon: <Sparkles className="h-4 w-4" />,
      color: 'bg-blue-100 text-blue-700 hover:bg-blue-200'
    }
  ];

  return (
    <div className="relative">
      <Card className="overflow-hidden bg-gradient-to-br from-white via-emerald-50 to-teal-50 border-2 border-emerald-100 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardContent className="p-0">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-20">
              <Lightbulb className="h-16 w-16 transform rotate-12" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">
                    {getGreeting()}! ✨
                  </p>
                  <h3 className="text-xl font-bold mb-1">Today's Wisdom</h3>
                  <p className="text-emerald-100 text-sm">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {currentTime.toLocaleDateString('en-US', { 
                      weekday: 'long',
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <Button
                  onClick={refreshTip}
                  disabled={insight.isLoading}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 rounded-full"
                >
                  <RefreshCw className={`h-4 w-4 ${insight.isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </div>

          {/* Tip Content */}
          <div className="p-6">
            {insight.isLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-emerald-200 rounded w-3/4"></div>
                <div className="h-4 bg-emerald-200 rounded w-1/2"></div>
                <div className="h-4 bg-emerald-200 rounded w-2/3"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Main tip */}
                <div className="bg-white/80 rounded-lg p-4 border border-emerald-100">
                  <div className="flex items-start gap-3">
                    <div className="bg-emerald-500 rounded-full p-2 mt-1">
                      <Lightbulb className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800 leading-relaxed font-medium">
                        {insight.tip}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          {insight.source}
                        </Badge>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Heart className="h-3 w-3 text-rose-400" />
                          Made with care for you
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nudges Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    <p className="text-sm font-semibold text-gray-700">
                      While you're here, why not...
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {nudgeActions.map((nudge, index) => (
                      <Button
                        key={nudge.id}
                        onClick={nudge.action}
                        variant="ghost"
                        size="sm"
                        className={`${nudge.color} border border-current/20 rounded-lg p-3 h-auto flex flex-col items-center gap-2 transition-all duration-200 hover:scale-105`}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        {nudge.icon}
                        <span className="text-xs font-medium text-center leading-tight">
                          {nudge.text}
                        </span>
                        <ChevronRight className="h-3 w-3 opacity-60" />
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Motivational footer */}
                <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-600 italic">
                    "Every step of your journey matters. You're stronger than you know." 💪
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyTipCard; 