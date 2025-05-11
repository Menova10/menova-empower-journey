
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MeNovaLogo from '@/components/MeNovaLogo';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Flower, Leaf, Calendar, Activity, Clock, Filter } from 'lucide-react';

// Symptom definitions with colors
const symptoms = [
  { id: 'hot_flashes', name: 'Hot Flashes', color: 'bg-menova-softpink', tip: 'Try a cooling breath exercise: inhale for 4 seconds, hold for 4, exhale for 6.' },
  { id: 'sleep', name: 'Sleep Quality', color: 'bg-menova-green', tip: 'Create a calming bedtime routine with dim lights and gentle stretching 30 minutes before sleep.' },
  { id: 'mood', name: 'Mood', color: 'bg-[#d9b6d9]', tip: 'Practice mindful breathing for 5 minutes when you feel your mood shifting.' },
  { id: 'energy', name: 'Energy Level', color: 'bg-menova-softpeach', tip: 'Short 10-minute walks in nature can help boost energy levels naturally.' },
  { id: 'anxiety', name: 'Anxiety', color: 'bg-[#b1cfe6]', tip: 'Try the 5-4-3-2-1 grounding technique: acknowledge 5 things you see, 4 you can touch, 3 you hear, 2 you smell, and 1 you taste.' }
];

// Source badges with styling
const sourceBadges = {
  manual: { label: 'SYMPTOM TRACKER', class: 'bg-menova-green text-white' },
  daily_checkin: { label: 'DAILY CHECKIN', class: 'bg-menova-softpink text-gray-800' },
  chat: { label: 'CHAT', class: 'bg-[#d9b6d9] text-gray-800' },
  voice: { label: 'VOICE', class: 'bg-menova-softpeach text-gray-800' },
};

// Time period definitions
const timePeriods = [
  { id: 'daily', name: 'Today', 
    getRange: () => {
      const today = new Date();
      return { start: today, end: today };
    } 
  },
  { id: 'weekly', name: 'This Week',
    getRange: () => {
      const today = new Date();
      return { 
        start: startOfWeek(today, { weekStartsOn: 1 }), 
        end: endOfWeek(today, { weekStartsOn: 1 }) 
      };
    }
  },
  { id: 'monthly', name: 'This Month',
    getRange: () => {
      const today = new Date();
      return { start: startOfMonth(today), end: endOfMonth(today) };
    }
  },
  { id: '3months', name: 'Last 3 Months',
    getRange: () => {
      const today = new Date();
      return { start: subDays(today, 90), end: today };
    }
  }
];

const SymptomTracker = () => {
  const navigate = useNavigate();
  // Form state
  const [ratings, setRatings] = useState<Record<string, number>>(
    symptoms.reduce((acc, symptom) => ({ ...acc, [symptom.id]: 3 }), {})
  );
  const [submitting, setSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [successTip, setSuccessTip] = useState<string | null>(null);
  
  // History and filtering state
  const [symptomHistory, setSymptomHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSymptom, setSelectedSymptom] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('weekly');
  const [chartData, setChartData] = useState<any[]>([]);

  const handleRatingChange = (symptomId: string, value: number[]) => {
    setRatings(prev => ({ ...prev, [symptomId]: value[0] }));
  };
  
  const getWellnessTip = (symptomId: string, intensity: number) => {
    const symptom = symptoms.find(s => s.id === symptomId);
    return symptom?.tip || 'Take a moment for self-care today. Every small step matters.';
  };

  // Fetch symptom history based on filters
  const fetchSymptomHistory = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: "Not logged in",
          description: "Please log in to view symptom history",
          variant: "destructive",
        });
        return;
      }
      
      // Get date range based on selected period
      const period = timePeriods.find(p => p.id === selectedPeriod);
      const { start, end } = period ? period.getRange() : { start: new Date(), end: new Date() };
      
      // Build query
      let query = supabase
        .from('symptom_tracking')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('recorded_at', start.toISOString())
        .lte('recorded_at', end.toISOString())
        .order('recorded_at', { ascending: false });
      
      // Add symptom filter if not "all"
      if (selectedSymptom !== 'all') {
        query = query.eq('symptom', selectedSymptom);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setSymptomHistory(data || []);
      prepareChartData(data || []);
      
    } catch (error) {
      console.error("Error fetching symptom history:", error);
      toast({
        title: "Error",
        description: "Failed to load symptom history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Prepare data for chart visualization
  const prepareChartData = (data: any[]) => {
    // Group by date and symptom, calculate average intensity
    const grouped = data.reduce((acc: any, item) => {
      // Format date based on selected period
      let dateKey;
      const date = new Date(item.recorded_at);
      
      if (selectedPeriod === 'daily') {
        dateKey = format(date, 'HH:mm');
      } else if (selectedPeriod === 'weekly') {
        dateKey = format(date, 'EEE');
      } else {
        dateKey = format(date, 'MMM dd');
      }
      
      if (!acc[dateKey]) {
        acc[dateKey] = {};
      }
      
      if (!acc[dateKey][item.symptom]) {
        acc[dateKey][item.symptom] = {
          sum: 0,
          count: 0,
        };
      }
      
      acc[dateKey][item.symptom].sum += item.intensity;
      acc[dateKey][item.symptom].count += 1;
      
      return acc;
    }, {});
    
    // Convert grouped data to chart format
    const chartData = Object.entries(grouped).map(([date, symptoms]) => {
      const entry: any = { date };
      
      // Calculate average for each symptom
      Object.entries(symptoms as any).forEach(([symptom, { sum, count }]) => {
        entry[symptom] = Math.round((sum as number) / (count as number));
      });
      
      return entry;
    });
    
    // Sort by date
    chartData.sort((a, b) => {
      return a.date.localeCompare(b.date);
    });
    
    setChartData(chartData);
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: "Not logged in",
          description: "Please log in to submit symptoms",
          variant: "destructive",
        });
        navigate('/login');
        return;
      }
      
      // Record all symptom ratings
      const entries = Object.entries(ratings).map(([type, rating]) => ({
        user_id: session.user.id,
        symptom: type,
        intensity: rating,
        source: 'manual',
        recorded_at: new Date().toISOString()
      }));
      
      const { error } = await supabase.from('symptom_tracking').insert(entries);
      
      if (error) throw error;

      // Get a tip for the highest intensity symptom
      const highestRatedSymptomEntry = Object.entries(ratings).reduce(
        (highest, current) => (current[1] > highest[1] ? current : highest),
        ['', 0]
      );
      
      const tip = getWellnessTip(highestRatedSymptomEntry[0], highestRatedSymptomEntry[1]);
      setSuccessTip(tip);
      
      toast({
        title: "Symptoms recorded",
        description: "Your symptoms have been successfully recorded",
      });
      
      // Show confetti effect (simplified)
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      
      // Refresh symptom history
      fetchSymptomHistory();
      
    } catch (error) {
      console.error("Error recording symptoms:", error);
      toast({
        title: "Error",
        description: "Failed to record symptoms",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch symptom history on mount and when filters change
  useEffect(() => {
    fetchSymptomHistory();
  }, [selectedSymptom, selectedPeriod]);

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-menova-beige bg-menova-pattern bg-cover relative overflow-hidden">
        {/* Floral overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-cover bg-center bg-[url('/lovable-uploads/14905dcb-7154-41d0-92c2-f134f2aa1117.png')]" />
        
        {/* Simple confetti effect replacement */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50">
            {[...Array(30)].map((_, i) => (
              <div 
                key={i}
                className="absolute animate-fall"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-${20 + Math.random() * 10}px`,
                  width: `${10 + Math.random() * 10}px`,
                  height: `${10 + Math.random() * 10}px`,
                  backgroundColor: ['#A5D6A7', '#E8F5E9', '#FFDEE2', '#FDE1D3'][Math.floor(Math.random() * 4)],
                  borderRadius: '50%',
                  animationDelay: `${Math.random() * 1.5}s`,
                  animationDuration: `${1 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>
        )}

        {/* Navbar */}
        <nav className="flex justify-between items-center px-6 py-4 bg-white/90 shadow-sm backdrop-blur-sm sticky top-0 z-10">
          <MeNovaLogo />
          <Button
            variant="outline"
            onClick={() => navigate('/welcome')}
            className="border-menova-green text-menova-green hover:bg-menova-green/10"
          >
            Back to Dashboard
          </Button>
        </nav>

        {/* Main Content */}
        <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full p-6 relative z-10">
          <div className="flex items-center mb-6 gap-2">
            <Flower className="text-menova-green h-8 w-8" />
            <h1 className="text-2xl font-bold text-menova-text">Symptom Tracker</h1>
          </div>
          
          {/* Quote */}
          {!successTip && (
            <div 
              className="mb-6 text-center animate-fadeIn"
            >
              <p className="font-['Dancing_Script'],cursive text-lg text-menova-text italic text-shadow">
                "Listening to your body is an act of self-compassion. Each symptom tracked is a step toward better wellness."
              </p>
            </div>
          )}
          
          {/* Success message with personalized tip */}
          {successTip && (
            <div
              className="mb-6 p-4 rounded-lg bg-gradient-to-r from-menova-green/10 to-menova-green/20 backdrop-blur-md border border-menova-green/20 animate-scaleIn"
            >
              <h3 className="font-medium text-menova-text mb-2">Symptoms recorded successfully!</h3>
              <p className="text-sm text-gray-700 mb-3 font-['Dancing_Script'],cursive text-lg italic">
                {successTip}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  size="sm"
                  onClick={() => navigate('/welcome')}
                  className="bg-menova-green hover:bg-menova-green/90 text-white"
                >
                  Back to Dashboard
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/todays-wellness')}
                  className="border-menova-green text-menova-green"
                >
                  Set a Wellness Goal
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/chat')}
                  className="border-menova-green text-menova-green"
                >
                  Talk to MeNova
                </Button>
              </div>
            </div>
          )}
          
          {/* Symptom Rating Card */}
          <div className="animate-fadeIn">
            <Card className="mb-6 backdrop-blur-md bg-white/80 border border-menova-green/20 shadow-sm hover:shadow-md transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="text-menova-green h-5 w-5" />
                  <span>How are you feeling today?</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-6">
                  Rate your symptoms from 1 (minimal) to 5 (severe)
                </p>
                
                <div className="space-y-8">
                  {symptoms.map(symptom => (
                    <div 
                      key={symptom.id} 
                      className="space-y-2 hover:scale-[1.01] transition-transform duration-200"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{symptom.name}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-medium px-2 py-0.5 rounded-full text-white text-sm" style={{ backgroundColor: symptom.color.replace('bg-', '').startsWith('#') ? symptom.color.replace('bg-', '') : '#A5D6A7' }}>
                              {ratings[symptom.id]}/5
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="bg-menova-green text-white border-none shadow-md">
                            <p>{ratings[symptom.id] === 1 ? 'Minimal' : ratings[symptom.id] === 5 ? 'Severe' : 'Moderate'} {symptom.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Slider
                        value={[ratings[symptom.id]]}
                        min={1}
                        max={5}
                        step={1}
                        onValueChange={(value) => handleRatingChange(symptom.id, value)}
                        className="py-4"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Minimal</span>
                        <span>Severe</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div
                  className="w-full mt-8 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  <Button 
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full bg-menova-green hover:bg-menova-green/90"
                    style={{ 
                      animation: submitting ? 'none' : 'pulse 2s infinite'
                    }}
                  >
                    {submitting ? 'Saving...' : 'Save Symptoms'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* History and Trends Section */}
          <div className="animate-fadeIn space-y-6">
            <h2 className="text-xl font-semibold text-menova-text flex items-center gap-2">
              <Activity className="h-5 w-5 text-menova-green" />
              Your Symptom History
            </h2>
            
            {/* Filters */}
            <Card className="backdrop-blur-md bg-white/80 border border-menova-green/20 shadow-sm">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <Filter className="h-4 w-4" /> Symptom
                    </label>
                    <Select 
                      value={selectedSymptom} 
                      onValueChange={setSelectedSymptom}
                    >
                      <SelectTrigger className="border-menova-green/30">
                        <SelectValue placeholder="Select symptom" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Symptoms</SelectItem>
                        {symptoms.map(symptom => (
                          <SelectItem key={symptom.id} value={symptom.id}>
                            {symptom.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <Calendar className="h-4 w-4" /> Time Period
                    </label>
                    <Select 
                      value={selectedPeriod} 
                      onValueChange={setSelectedPeriod}
                    >
                      <SelectTrigger className="border-menova-green/30">
                        <SelectValue placeholder="Select time period" />
                      </SelectTrigger>
                      <SelectContent>
                        {timePeriods.map(period => (
                          <SelectItem key={period.id} value={period.id}>
                            {period.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Charts and Timeline */}
            <Tabs defaultValue="chart">
              <TabsList className="bg-menova-green/10 border border-menova-green/20">
                <TabsTrigger value="chart" className="data-[state=active]:bg-menova-green data-[state=active]:text-white">
                  Trend Chart
                </TabsTrigger>
                <TabsTrigger value="timeline" className="data-[state=active]:bg-menova-green data-[state=active]:text-white">
                  Timeline
                </TabsTrigger>
              </TabsList>
              
              {/* Chart View */}
              <TabsContent value="chart" className="animate-fadeIn">
                <Card className="backdrop-blur-md bg-white/80 border border-menova-green/20 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Symptom Intensity Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="h-64 flex items-center justify-center">
                        <div className="animate-pulse text-menova-green/60">Loading chart data...</div>
                      </div>
                    ) : chartData.length === 0 ? (
                      <div className="h-64 flex items-center justify-center text-center">
                        <div className="text-gray-500">
                          <p className="mb-2">No symptom data available for this period.</p>
                          <p className="text-sm">Try selecting a different time period or log your symptoms.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-64">
                        <ChartContainer 
                          config={{
                            hot_flashes: { color: "#FFDEE2" },
                            sleep: { color: "#A5D6A7" },
                            mood: { color: "#d9b6d9" },
                            energy: { color: "#FDE1D3" },
                            anxiety: { color: "#b1cfe6" }
                          }}
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
                              <XAxis 
                                dataKey="date"
                                tickLine={false}
                                axisLine={{ stroke: '#e5e5e5' }}
                                padding={{ left: 10, right: 10 }}
                              />
                              <YAxis 
                                tickLine={false}
                                axisLine={{ stroke: '#e5e5e5' }}
                                domain={[0, 5]}
                                ticks={[1, 2, 3, 4, 5]}
                                label={{ value: 'Intensity', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                              />
                              <ChartTooltip
                                content={
                                  <ChartTooltipContent formatter={(value, name) => {
                                    const symptom = symptoms.find(s => s.id === name);
                                    return [value, symptom?.name || name];
                                  }} />
                                }
                              />
                              {selectedSymptom === 'all' ? (
                                symptoms.map(symptom => (
                                  <Bar
                                    key={symptom.id}
                                    dataKey={symptom.id}
                                    maxBarSize={50}
                                    radius={[4, 4, 0, 0]}
                                  >
                                    {chartData.map((_, index) => (
                                      <Cell 
                                        key={`cell-${index}`}
                                        fill={symptom.color.replace('bg-', '').startsWith('#') 
                                          ? symptom.color.replace('bg-', '') 
                                          : symptom.id === 'sleep' ? '#A5D6A7' 
                                          : symptom.id === 'hot_flashes' ? '#FFDEE2'
                                          : symptom.id === 'mood' ? '#d9b6d9'
                                          : symptom.id === 'energy' ? '#FDE1D3'
                                          : '#b1cfe6'
                                        }
                                      />
                                    ))}
                                  </Bar>
                                ))
                              ) : (
                                <Bar
                                  dataKey={selectedSymptom}
                                  maxBarSize={50}
                                  radius={[4, 4, 0, 0]}
                                  fill={symptoms.find(s => s.id === selectedSymptom)?.color.replace('bg-', '').startsWith('#') 
                                    ? symptoms.find(s => s.id === selectedSymptom)?.color.replace('bg-', '') 
                                    : '#A5D6A7'
                                  }
                                />
                              )}
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Timeline View */}
              <TabsContent value="timeline" className="animate-fadeIn">
                <Card className="backdrop-blur-md bg-white/80 border border-menova-green/20 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Symptom Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="h-64 flex items-center justify-center">
                        <div className="animate-pulse text-menova-green/60">Loading timeline data...</div>
                      </div>
                    ) : symptomHistory.length === 0 ? (
                      <div className="h-64 flex items-center justify-center text-center">
                        <div className="text-gray-500">
                          <p className="mb-2">No symptom data available for this period.</p>
                          <p className="text-sm">Try selecting a different time period or log your symptoms.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {symptomHistory.map((entry, index) => {
                          const symptom = symptoms.find(s => s.id === entry.symptom);
                          const date = new Date(entry.recorded_at);
                          const source = sourceBadges[entry.source as keyof typeof sourceBadges] || 
                            { label: entry.source.toUpperCase(), class: 'bg-gray-200 text-gray-700' };
                          
                          return (
                            <div 
                              key={entry.id}
                              className="p-3 rounded-lg border border-menova-green/10 bg-white/70 hover:bg-white/90 hover:border-menova-green/30 transition-all animate-fadeIn"
                              style={{ 
                                animationDelay: `${index * 0.1}s`,
                                boxShadow: '0 2px 10px rgba(165, 214, 167, 0.1)'
                              }}
                            >
                              <div className="flex justify-between mb-1 items-center">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{symptom?.name || entry.symptom}</span>
                                  <span 
                                    className={`text-xs font-bold py-0.5 px-2 rounded-full ${source.class}`}
                                  >
                                    {source.label}
                                  </span>
                                </div>
                                <span 
                                  className="rounded-full px-2 py-0.5 text-white text-sm font-medium"
                                  style={{ 
                                    backgroundColor: symptom?.color.replace('bg-', '').startsWith('#') 
                                      ? symptom?.color.replace('bg-', '') 
                                      : '#A5D6A7'
                                  }}
                                >
                                  {entry.intensity}/5
                                </span>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>
                                  {format(date, 'MMM d, yyyy')} at {format(date, 'h:mm a')}
                                </span>
                                {entry.notes && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="underline cursor-help">Notes</span>
                                    </TooltipTrigger>
                                    <TooltipContent className="p-2 max-w-xs">
                                      {entry.notes}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
        
        {/* Add custom styles for the animations */}
        <style>
          {`
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(165, 214, 167, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(165, 214, 167, 0); }
            100% { box-shadow: 0 0 0 0 rgba(165, 214, 167, 0); }
          }
          .text-shadow {
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          }
          @keyframes fall {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(360deg); opacity: 0.2; }
          }
          .animate-fall {
            animation: fall 3s ease-in forwards;
          }
          .animate-fadeIn {
            animation: fadeIn 0.6s ease-out forwards;
          }
          @keyframes fadeIn {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .animate-scaleIn {
            animation: scaleIn 0.3s ease-out forwards;
          }
          @keyframes scaleIn {
            0% { opacity: 0; transform: scale(0.9); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}
        </style>
      </div>
    </TooltipProvider>
  );
};

export default SymptomTracker;
