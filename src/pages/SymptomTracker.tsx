
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import VapiAssistant from '@/components/VapiAssistant';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

// Common symptom options
const SYMPTOM_OPTIONS = [
  "Hot flashes",
  "Night sweats",
  "Sleep problems",
  "Mood changes",
  "Anxiety",
  "Depression",
  "Fatigue",
  "Brain fog",
  "Headaches",
  "Joint pain",
  "Vaginal dryness",
  "Decreased libido",
  "Weight gain",
  "Heart palpitations"
];

interface SymptomEntry {
  id: string;
  symptom: string;
  intensity: number;
  notes: string | null;
  recorded_at: string;
  source: string;
}

const SymptomTracker = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [symptomEntries, setSymptomEntries] = useState<SymptomEntry[]>([]);
  
  // Form state
  const [symptom, setSymptom] = useState("");
  const [intensity, setIntensity] = useState(3);
  const [notes, setNotes] = useState("");

  // Check if user is logged in
  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Access denied",
        description: "Please log in to view the symptom tracker.",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }
    
    loadSymptoms();
  }, [isAuthenticated, navigate, user]);
  
  const loadSymptoms = async () => {
    try {
      setLoading(true);
      
      if (!user) return;
      
      const { data, error } = await supabase
        .from('symptom_tracker')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(10);
        
      if (error) {
        throw error;
      }
      
      setSymptomEntries(data || []);
    } catch (error) {
      console.error('Error loading symptoms:', error);
      toast({
        title: "Error",
        description: "Failed to load your symptoms. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async () => {
    if (!symptom) {
      toast({
        title: "Missing information",
        description: "Please select a symptom to log.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setSubmitting(true);
      
      const newSymptom = {
        user_id: user?.id,
        symptom,
        intensity,
        notes: notes || null,
        source: 'manual'
      };
      
      const { error } = await supabase
        .from('symptom_tracker')
        .insert(newSymptom);
        
      if (error) {
        throw error;
      }
      
      toast({
        title: "Symptom logged",
        description: "Your symptom has been recorded successfully.",
      });
      
      // Reset form
      setSymptom("");
      setIntensity(3);
      setNotes("");
      
      // Refresh symptom list
      loadSymptoms();
      
    } catch (error) {
      console.error('Error logging symptom:', error);
      toast({
        title: "Error",
        description: "Failed to log your symptom. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-menova-text">Symptom Tracker</h1>
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="border-menova-green text-menova-green hover:bg-menova-green/10"
          >
            Back to Dashboard
          </Button>
        </div>
      
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Log New Symptom Card */}
          <Card>
            <CardHeader>
              <CardTitle>Log a New Symptom</CardTitle>
              <CardDescription>
                Track your menopause symptoms to identify patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="symptom">Symptom</Label>
                <Select value={symptom} onValueChange={setSymptom}>
                  <SelectTrigger id="symptom">
                    <SelectValue placeholder="Select a symptom" />
                  </SelectTrigger>
                  <SelectContent>
                    {SYMPTOM_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="intensity">Intensity</Label>
                  <span className="text-sm text-gray-500">{intensity}/5</span>
                </div>
                <Slider
                  id="intensity"
                  min={1}
                  max={5}
                  step={1}
                  value={[intensity]}
                  onValueChange={(values) => setIntensity(values[0])}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Mild</span>
                  <span>Moderate</span>
                  <span>Severe</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any details about this symptom..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSubmit}
                className="w-full bg-menova-green hover:bg-menova-green/90"
                disabled={submitting}
              >
                {submitting ? "Logging..." : "Log Symptom"}
              </Button>
            </CardFooter>
          </Card>
          
          {/* Recent Symptoms Card */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Symptoms</CardTitle>
              <CardDescription>
                Your most recently logged symptoms
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-6 text-gray-500">
                  Loading your symptoms...
                </div>
              ) : symptomEntries.length > 0 ? (
                <div className="space-y-4">
                  {symptomEntries.map((entry) => (
                    <div 
                      key={entry.id}
                      className="p-4 border rounded-lg bg-white/80"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{entry.symptom}</h3>
                          <p className="text-xs text-gray-500">
                            {formatDate(entry.recorded_at)}
                            {entry.source !== 'manual' && (
                              <span className="ml-1 text-menova-green">
                                • Auto-detected from {entry.source}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                          Intensity: {entry.intensity}/5
                        </div>
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-gray-600 mt-2 border-t pt-2">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>No symptoms recorded yet</p>
                  <p className="text-sm mt-2">
                    Use the form to log your first symptom, or chat with MeNova
                    to automatically detect and log symptoms.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Info Cards */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-menova-text mb-4">Symptom Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Why Track Symptoms?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Tracking helps identify triggers, patterns, and effective management strategies
                  unique to your menopause journey.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Talk to MeNova</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Discuss your symptoms with MeNova to get personalized insights and
                  automatically log symptoms mentioned in your conversations.
                </p>
                <Button 
                  className="mt-4 bg-menova-green hover:bg-menova-green/90"
                  onClick={() => navigate('/chat')}
                >
                  Start a Conversation
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Understand Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Over time, your symptom data will reveal patterns related to time of day, 
                  activities, diet, and stress levels.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      {/* Fixed chatbot button */}
      <div className="fixed bottom-6 right-6 z-50">
        <VapiAssistant />
      </div>
    </div>
  );
};

export default SymptomTracker;
