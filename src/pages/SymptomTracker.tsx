
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MeNovaLogo from '@/components/MeNovaLogo';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

const symptoms = [
  { id: 'hot_flashes', name: 'Hot Flashes', color: 'bg-menova-softpink' },
  { id: 'sleep', name: 'Sleep Quality', color: 'bg-menova-green' },
  { id: 'mood', name: 'Mood', color: 'bg-[#d9b6d9]' },
  { id: 'energy', name: 'Energy Level', color: 'bg-menova-softpeach' },
  { id: 'anxiety', name: 'Anxiety', color: 'bg-[#b1cfe6]' }
];

const SymptomTracker = () => {
  const navigate = useNavigate();
  const [ratings, setRatings] = useState<Record<string, number>>(
    symptoms.reduce((acc, symptom) => ({ ...acc, [symptom.id]: 3 }), {})
  );
  const [submitting, setSubmitting] = useState(false);

  const handleRatingChange = (symptomId: string, value: number[]) => {
    setRatings(prev => ({ ...prev, [symptomId]: value[0] }));
  };
  
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
        type,
        rating,
        created_at: new Date().toISOString()
      }));
      
      const { error } = await supabase.from('symptom_tracking').insert(entries);
      
      if (error) throw error;
      
      toast({
        title: "Symptoms recorded",
        description: "Your symptoms have been successfully recorded",
      });
      
      navigate('/welcome');
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

  return (
    <div className="min-h-screen flex flex-col bg-menova-beige bg-menova-pattern bg-cover">
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
      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full p-6">
        <h1 className="text-2xl font-bold text-menova-text mb-6">Symptom Tracker</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>How are you feeling today?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-6">
              Rate your symptoms from 1 (minimal) to 5 (severe)
            </p>
            
            <div className="space-y-8">
              {symptoms.map(symptom => (
                <div key={symptom.id} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">{symptom.name}</span>
                    <span>{ratings[symptom.id]}/5</span>
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
            
            <Button 
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full mt-8 bg-menova-green hover:bg-menova-green/90"
            >
              {submitting ? 'Saving...' : 'Save Symptoms'}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SymptomTracker;
