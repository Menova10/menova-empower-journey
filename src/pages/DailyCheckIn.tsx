
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BreadcrumbTrail } from '@/components/BreadcrumbTrail';
import { ScrollableContent } from '@/components/wellness/ScrollableContent';
import MeNovaLogo from '@/components/MeNovaLogo';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { normalizeCategory } from '@/types/wellness';
import { useVapi } from '@/contexts/VapiContext';
import { Brain, ActivitySquare, Apple } from 'lucide-react';

// Mood options with emojis
const moodOptions = [
  { emoji: '😊', value: 'happy', label: 'Happy' },
  { emoji: '😌', value: 'calm', label: 'Calm' },
  { emoji: '😓', value: 'tired', label: 'Tired' },
  { emoji: '😟', value: 'anxious', label: 'Anxious' },
  { emoji: '😢', value: 'sad', label: 'Sad' },
  { emoji: '😡', value: 'frustrated', label: 'Frustrated' }
];

// Symptoms commonly associated with menopause
const symptomOptions = [
  { value: 'hot_flashes', label: 'Hot Flashes' },
  { value: 'night_sweats', label: 'Night Sweats' },
  { value: 'sleep_issues', label: 'Sleep Issues' },
  { value: 'mood_swings', label: 'Mood Swings' },
  { value: 'brain_fog', label: 'Brain Fog' },
  { value: 'fatigue', label: 'Fatigue' },
  { value: 'joint_pain', label: 'Joint Pain' },
  { value: 'headaches', label: 'Headaches' },
  { value: 'other', label: 'Other' }
];

const DailyCheckIn = () => {
  const navigate = useNavigate();
  const { speak } = useVapi();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedSymptom, setSelectedSymptom] = useState<string | null>(null);
  const [symptomIntensity, setSymptomIntensity] = useState<number>(3);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [pastCheckIns, setPastCheckIns] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Fetch past check-ins
  useEffect(() => {
    fetchPastCheckIns();
  }, []);
  
  const fetchPastCheckIns = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }
      
      // Fetch the last 5 check-ins
      const { data, error } = await supabase
        .from('symptom_tracking')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('source', 'check-in') // Filter by source="check-in" for daily check-ins
        .order('recorded_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('Error fetching check-ins:', error);
        toast({
          title: "Error",
          description: "Failed to load past check-ins",
          variant: "destructive"
        });
      } else if (data) {
        setPastCheckIns(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMood || !selectedSymptom) {
      toast({
        title: "Missing information",
        description: "Please select both a mood and symptom before submitting",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }
      
      // Create the check-in record in the symptom_tracking table
      const { error } = await supabase
        .from('symptom_tracking')
        .insert({
          user_id: session.user.id,
          symptom: selectedSymptom,
          intensity: symptomIntensity,
          notes: `Mood: ${selectedMood}${notes ? ` | Notes: ${notes}` : ''}`,
          source: 'check-in' // Mark this as coming from a daily check-in
        });
      
      if (error) {
        throw error;
      }
      
      // Update the profile's last_check_in time
      await supabase
        .from('profiles')
        .update({ last_check_in: new Date().toISOString() })
        .eq('id', session.user.id);
      
      toast({
        title: "Check-in recorded",
        description: "Thank you for checking in today! Your wellness journey matters.",
      });
      
      // Optional voice feedback
      speak("Thank you for checking in today! Your wellness journey matters.");
      
      // Reset form
      setSelectedMood(null);
      setSelectedSymptom(null);
      setSymptomIntensity(3);
      setNotes('');
      
      // Refresh past check-ins
      fetchPastCheckIns();
      
    } catch (error: any) {
      console.error('Error submitting check-in:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit your check-in",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMoodEmoji = (moodValue: string) => {
    const mood = moodOptions.find(m => m.value === moodValue);
    return mood ? `${mood.emoji} ${mood.label}` : moodValue;
  };
  
  const getFormattedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Extract mood from notes field
  const extractMoodFromNotes = (notes: string | null): string => {
    if (!notes) return 'Unknown';
    
    const moodMatch = notes.match(/Mood: (\w+)/);
    return moodMatch ? moodMatch[1] : 'Unknown';
  };
  
  return (
    <div className="min-h-screen bg-menova-beige bg-menova-pattern bg-cover flex flex-col">
      {/* Navigation header */}
      <nav className="flex justify-between items-center px-6 py-4 bg-white/90 shadow-sm backdrop-blur-sm sticky top-0 z-10">
        <div onClick={() => navigate('/')} className="cursor-pointer">
          <MeNovaLogo />
        </div>
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => navigate('/welcome')} 
            variant="ghost"
            className="text-menova-green hover:bg-menova-green/10"
          >
            Dashboard
          </Button>
        </div>
      </nav>
      
      {/* Breadcrumb */}
      <div className="px-6 pt-4 max-w-4xl mx-auto w-full">
        <BreadcrumbTrail currentPath={'/check-in'} />
      </div>
      
      {/* Main content */}
      <main className="flex-1 flex flex-col space-y-8 px-6 py-4 max-w-4xl mx-auto w-full">
        {/* Header section */}
        <section className="bg-white/90 p-6 rounded-lg shadow-sm backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-menova-text bg-gradient-to-r from-menova-green to-green-400 bg-clip-text text-transparent">
            Daily Check-In
          </h1>
          <p className="text-gray-600 mt-1">
            Take a moment to reflect on how you're feeling today. Your check-ins help us tailor your wellness journey.
          </p>
        </section>
        
        {/* Form section */}
        <section className="bg-white/90 p-6 rounded-lg shadow-sm backdrop-blur-sm">
          <form onSubmit={handleSubmit}>
            {/* Mood selector */}
            <div className="mb-6">
              <h2 className="text-lg font-medium text-menova-text mb-3">How are you feeling today?</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {moodOptions.map((mood) => (
                  <Button
                    key={mood.value}
                    type="button"
                    variant="outline"
                    className={`flex flex-col items-center h-auto py-3 ${selectedMood === mood.value ? 'border-menova-green bg-green-50 text-menova-text' : 'border-gray-200'}`}
                    onClick={() => setSelectedMood(mood.value)}
                  >
                    <span className="text-2xl mb-1">{mood.emoji}</span>
                    <span className="text-sm">{mood.label}</span>
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Symptom selector */}
            <div className="mb-6">
              <h2 className="text-lg font-medium text-menova-text mb-3">Are you experiencing any symptoms?</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {symptomOptions.map((symptom) => (
                  <Button
                    key={symptom.value}
                    type="button"
                    variant="outline"
                    className={`justify-start h-auto py-3 ${selectedSymptom === symptom.value ? 'border-menova-green bg-green-50 text-menova-text' : 'border-gray-200'}`}
                    onClick={() => setSelectedSymptom(symptom.value)}
                  >
                    {symptom.label}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Intensity slider - only show if symptom is selected */}
            {selectedSymptom && (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-menova-text mb-3">How intense is this symptom?</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">Mild</span>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={symptomIntensity}
                      onChange={(e) => setSymptomIntensity(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-menova-green"
                    />
                    <span className="text-sm text-gray-500">Severe</span>
                  </div>
                  <div className="flex justify-between px-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <span 
                        key={num} 
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs 
                          ${symptomIntensity === num ? 'bg-menova-green text-white' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {num}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Notes textarea */}
            <div className="mb-6">
              <h2 className="text-lg font-medium text-menova-text mb-3">Additional notes</h2>
              <Textarea
                placeholder="Share more details about how you're feeling... (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-[120px] border-gray-200 focus-visible:ring-menova-green"
              />
            </div>
            
            {/* Submit button */}
            <div className="flex justify-center">
              <Button 
                type="submit"
                disabled={isSubmitting || !selectedMood || !selectedSymptom}
                className="bg-menova-green hover:bg-menova-green/90 text-white px-8 py-2"
              >
                {isSubmitting ? 'Submitting...' : 'Record Check-In'}
              </Button>
            </div>
          </form>
        </section>
        
        {/* Past check-ins timeline */}
        <section className="bg-white/90 p-6 rounded-lg shadow-sm backdrop-blur-sm">
          <h2 className="text-xl font-medium text-menova-text mb-4">Your Recent Check-Ins</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading your past check-ins...</p>
            </div>
          ) : pastCheckIns.length > 0 ? (
            <ScrollableContent maxHeight="400px">
              <div className="relative pl-4">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-menova-green/30 rounded-full"></div>
                <div className="space-y-4">
                  {pastCheckIns.map((checkIn) => (
                    <div key={checkIn.id} className="relative pl-6">
                      <div className="absolute left-[-4px] w-3 h-3 bg-menova-green rounded-full border-2 border-white"></div>
                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-md">
                              {extractMoodFromNotes(checkIn.notes)}
                            </CardTitle>
                            <CardDescription>{getFormattedDate(checkIn.recorded_at)}</CardDescription>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <span className="text-sm font-medium">Symptom:</span>
                              <span className="text-sm ml-2">
                                {symptomOptions.find(s => s.value === checkIn.symptom)?.label || checkIn.symptom}
                                {checkIn.intensity && ` (${checkIn.intensity}/5)`}
                              </span>
                            </div>
                            {checkIn.notes && (
                              <div>
                                <span className="text-sm font-medium">Notes:</span>
                                <p className="text-sm text-gray-600 mt-1">
                                  {checkIn.notes.replace(/Mood: \w+\s*\|?\s*/, '')}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollableContent>
          ) : (
            <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500">You haven't recorded any check-ins yet.</p>
              <p className="text-gray-500 mt-1">Start by filling out the form above!</p>
            </div>
          )}
        </section>
        
        {/* Wellness suggestions */}
        <section className="bg-white/90 p-6 rounded-lg shadow-sm backdrop-blur-sm mb-8">
          <h2 className="text-xl font-medium text-menova-text mb-4">Continue Your Wellness Journey</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Apple className="text-orange-500" size={20} />
                  <span>Daily Goals</span>
                </CardTitle>
                <CardDescription>Set wellness goals for today</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/todays-wellness')}
                  className="w-full border-menova-green text-menova-green hover:bg-menova-green/10"
                >
                  Go to Today's Wellness
                </Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Brain className="text-teal-500" size={20} />
                  <span>Chat with MeNova</span>
                </CardTitle>
                <CardDescription>Get personalized wellness support</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/chat')}
                  className="w-full border-menova-green text-menova-green hover:bg-menova-green/10"
                >
                  Start Chat
                </Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ActivitySquare className="text-red-500" size={20} />
                  <span>Track Symptoms</span>
                </CardTitle>
                <CardDescription>Monitor your menopause symptoms</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/symptom-tracker')}
                  className="w-full border-menova-green text-menova-green hover:bg-menova-green/10"
                >
                  Go to Symptom Tracker
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DailyCheckIn;
