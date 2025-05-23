
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Leaf } from 'lucide-react';
import { symptoms } from '@/types/symptoms';

interface SymptomFormProps {
  onSubmitSuccess: (tip: string) => void;
  onRefreshHistory: () => void;
}

const SymptomForm = ({ onSubmitSuccess, onRefreshHistory }: SymptomFormProps) => {
  const navigate = useNavigate();
  const [ratings, setRatings] = useState<Record<string, number>>(
    symptoms.reduce((acc, symptom) => ({ ...acc, [symptom.id]: 3 }), {})
  );
  const [submitting, setSubmitting] = useState(false);
  
  const handleRatingChange = (symptomId: string, value: number[]) => {
    setRatings(prev => ({ ...prev, [symptomId]: value[0] }));
  };
  
  const getWellnessTip = (symptomId: string, intensity: number) => {
    const symptom = symptoms.find(s => s.id === symptomId);
    return symptom?.tip || 'Take a moment for self-care today. Every small step matters.';
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
      onSubmitSuccess(tip);
      
      toast({
        title: "Symptoms recorded",
        description: "Your symptoms have been successfully recorded",
      });
      
      // Refresh symptom history
      onRefreshHistory();
      
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
                <TooltipProvider>
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
                </TooltipProvider>
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
  );
};

export default SymptomForm;
