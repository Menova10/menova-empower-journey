
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import VapiAssistant from '@/components/VapiAssistant';

interface Symptom {
  name: string;
  count: number;
  lastRecorded: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [topSymptoms, setTopSymptoms] = useState<Symptom[]>([]);
  const [wellnessScore, setWellnessScore] = useState(65); // Mock score

  // Check if user is logged in
  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Access denied",
        description: "Please log in to view your dashboard.",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }
    
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Fetch profile
        if (user) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (!profileError) {
            setProfile(profileData);
          }
          
          // Fetch symptoms
          const { data: symptomsData, error: symptomsError } = await supabase
            .from('symptom_tracker')
            .select('symptom, recorded_at')
            .eq('user_id', user.id)
            .order('recorded_at', { ascending: false });
            
          if (!symptomsError && symptomsData) {
            // Process symptoms to get top 3
            const symptomMap: Record<string, { count: number; lastRecorded: string }> = {};
            symptomsData.forEach(item => {
              if (!symptomMap[item.symptom]) {
                symptomMap[item.symptom] = { count: 0, lastRecorded: item.recorded_at };
              }
              symptomMap[item.symptom].count += 1;
            });
            
            const symptoms: Symptom[] = Object.entries(symptomMap)
              .map(([name, data]) => ({ name, count: data.count, lastRecorded: data.lastRecorded }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 3);
              
            setTopSymptoms(symptoms);
          }
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user, isAuthenticated, navigate]);
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-menova-text mb-2">
              Welcome, {profile?.full_name || user?.email?.split('@')[0] || 'there'}
            </h1>
            <p className="text-gray-600">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <Button
            onClick={() => navigate('/symptom-tracker')}
            className="mt-4 md:mt-0 bg-menova-green hover:bg-menova-green/90"
          >
            Log Symptoms
          </Button>
        </div>
      
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Wellness Score Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Today's Wellness</CardTitle>
              <CardDescription>Your wellness score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center my-4">
                <div className="text-4xl font-bold text-menova-green mb-2">{wellnessScore}%</div>
                <Progress value={wellnessScore} className="h-2 bg-gray-200" />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="text-center p-2 bg-gray-50 rounded-md">
                  <div className="text-sm text-gray-500">Physical</div>
                  <div className="font-medium">{wellnessScore - 10}%</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-md">
                  <div className="text-sm text-gray-500">Emotional</div>
                  <div className="font-medium">{wellnessScore + 5}%</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Top Symptoms Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Recent Symptoms</CardTitle>
              <CardDescription>What you've been experiencing</CardDescription>
            </CardHeader>
            <CardContent>
              {topSymptoms.length > 0 ? (
                <div className="space-y-4">
                  {topSymptoms.map((symptom, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{symptom.name}</div>
                        <div className="text-xs text-gray-500">
                          Last recorded: {formatDate(symptom.lastRecorded)}
                        </div>
                      </div>
                      <div className="bg-menova-green/10 text-menova-green px-2 py-1 rounded-full text-xs">
                        {symptom.count} times
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>No symptoms recorded yet</p>
                  <Button 
                    variant="link" 
                    onClick={() => navigate('/symptom-tracker')}
                    className="mt-2 text-menova-green"
                  >
                    Start tracking symptoms
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Today's Insight */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Today's Insight</CardTitle>
              <CardDescription>Wisdom for your journey</CardDescription>
            </CardHeader>
            <CardContent>
              <blockquote className="italic text-gray-600 border-l-4 border-menova-green/50 pl-4 py-2">
                "Menopause is not an ending, but a new beginning—embrace the journey with strength and grace."
              </blockquote>
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  className="w-full border-menova-green text-menova-green hover:bg-menova-green/10"
                  onClick={() => navigate('/chat')}
                >
                  Talk to MeNova
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Journey Continuation Section */}
        <h2 className="text-xl font-semibold text-menova-text mt-8 mb-4">Continue Your Journey</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/symptom-tracker')}>
            <CardHeader>
              <CardTitle className="text-lg">Symptom Tracker</CardTitle>
              <CardDescription>Monitor your menopause symptoms</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Track patterns in your symptoms to identify triggers and find effective management strategies.
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/chat')}>
            <CardHeader>
              <CardTitle className="text-lg">AI Assistant</CardTitle>
              <CardDescription>Get personalized support</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Chat with MeNova to get evidence-based information and emotional support for your menopause journey.
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/resources')}>
            <CardHeader>
              <CardTitle className="text-lg">Resource Library</CardTitle>
              <CardDescription>Evidence-based information</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Access articles, videos, and guides about menopause symptoms, treatment options, and lifestyle adjustments.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* Fixed chatbot button */}
      <div className="fixed bottom-6 right-6 z-50">
        <VapiAssistant />
      </div>
    </div>
  );
};

export default Dashboard;
