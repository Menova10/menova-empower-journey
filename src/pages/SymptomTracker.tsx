
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MeNovaLogo from '@/components/MeNovaLogo';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Flower, Leaf } from 'lucide-react';

// Symptom definitions with colors
const symptoms = [
  { id: 'hot_flashes', name: 'Hot Flashes', color: 'bg-menova-softpink', tip: 'Try a cooling breath exercise: inhale for 4 seconds, hold for 4, exhale for 6.' },
  { id: 'sleep', name: 'Sleep Quality', color: 'bg-menova-green', tip: 'Create a calming bedtime routine with dim lights and gentle stretching 30 minutes before sleep.' },
  { id: 'mood', name: 'Mood', color: 'bg-[#d9b6d9]', tip: 'Practice mindful breathing for 5 minutes when you feel your mood shifting.' },
  { id: 'energy', name: 'Energy Level', color: 'bg-menova-softpeach', tip: 'Short 10-minute walks in nature can help boost energy levels naturally.' },
  { id: 'anxiety', name: 'Anxiety', color: 'bg-[#b1cfe6]', tip: 'Try the 5-4-3-2-1 grounding technique: acknowledge 5 things you see, 4 you can touch, 3 you hear, 2 you smell, and 1 you taste.' }
];

const SymptomTracker = () => {
  const navigate = useNavigate();
  const [ratings, setRatings] = useState<Record<string, number>>(
    symptoms.reduce((acc, symptom) => ({ ...acc, [symptom.id]: 3 }), {})
  );
  const [submitting, setSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [successTip, setSuccessTip] = useState<string | null>(null);

  const handleRatingChange = (symptomId: string, value: number[]) => {
    setRatings(prev => ({ ...prev, [symptomId]: value[0] }));
  };
  
  const getWellnessTip = (symptomId: string, intensity: number) => {
    const symptom = symptoms.find(s => s.id === symptomId);
    return symptom?.tip || 'Take a moment for self-care today. Every small step matters.';
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
      
      // Show confetti
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      
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
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-menova-beige bg-menova-pattern bg-cover relative overflow-hidden">
        {/* Floral overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-cover bg-center bg-[url('/lovable-uploads/14905dcb-7154-41d0-92c2-f134f2aa1117.png')]" />
        
        {showConfetti && <Confetti recycle={false} numberOfPieces={200} colors={['#A5D6A7', '#E8F5E9', '#FFDEE2', '#FDE1D3']} />}

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
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-6 text-center"
            >
              <p className="font-['Dancing_Script'],cursive text-lg text-menova-text italic text-shadow">
                "Listening to your body is an act of self-compassion. Each symptom tracked is a step toward better wellness."
              </p>
            </motion.div>
          )}
          
          {/* Success message with personalized tip */}
          {successTip && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-lg bg-gradient-to-r from-menova-green/10 to-menova-green/20 backdrop-blur-md border border-menova-green/20"
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
            </motion.div>
          )}
          
          {/* Symptom Rating Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
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
                    <motion.div 
                      key={symptom.id} 
                      className="space-y-2"
                      whileHover={{ scale: 1.01 }}
                      transition={{ duration: 0.2 }}
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
                    </motion.div>
                  ))}
                </div>
                
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full mt-8"
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
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </main>
        
        {/* Add custom styles for the pulse animation */}
        <style jsx>
          {`
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(165, 214, 167, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(165, 214, 167, 0); }
            100% { box-shadow: 0 0 0 0 rgba(165, 214, 167, 0); }
          }
          .text-shadow {
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          }
        `}
        </style>
      </div>
    </TooltipProvider>
  );
};

export default SymptomTracker;
