import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import MeNovaLogo from '@/components/MeNovaLogo';
import { Card, CardContent } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Flower, Smile, Book, Activity, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { fetchSymptomHistory, prepareChartData } from '@/services/symptomService';
import { SymptomEntry, ChartDataPoint } from '@/types/symptoms';
import SymptomForm from '@/components/symptoms/SymptomForm';
import SymptomNotes from '@/components/symptoms/SymptomNotes';
import SymptomChart from '@/components/symptoms/SymptomChart';
import SymptomTimeline from '@/components/symptoms/SymptomTimeline';
import SymptomFilters from '@/components/symptoms/SymptomFilters';
import SuccessMessage from '@/components/symptoms/SuccessMessage';
import ConfettiEffect from '@/components/symptoms/ConfettiEffect';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useVapi } from '@/contexts/VapiContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MeNovaChatButton from '@/components/MeNovaChatButton';

const SymptomTracker = () => {
  const navigate = useNavigate();
  const { speak, sdkLoaded } = useVapi();
  
  // UI state
  const [showConfetti, setShowConfetti] = useState(false);
  const [successTip, setSuccessTip] = useState<string | null>(null);
  
  // History and filtering state
  const [symptomHistory, setSymptomHistory] = useState<SymptomEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSymptom, setSelectedSymptom] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('weekly');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [activeTab, setActiveTab] = useState<string>("today");

  // User state
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  // Handle success after submitting the form
  const handleSubmitSuccess = (tip: string) => {
    setSuccessTip(tip);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  // Fetch symptom history based on filters
  const refreshSymptomHistory = async () => {
    setLoading(true);
    const { data, error } = await fetchSymptomHistory(selectedSymptom, selectedPeriod);
    
    if (!error) {
      setSymptomHistory(data);
      const formattedData = prepareChartData(data, selectedPeriod);
      setChartData(formattedData);
    }
    
    setLoading(false);
  };

  // Fetch symptom history on mount and when filters change
  useEffect(() => {
    refreshSymptomHistory();
  }, [selectedSymptom, selectedPeriod]);

  // Introduce the symptom tracker page with voice when loaded
  useEffect(() => {
    if (sdkLoaded) {
      // Add a short delay to make sure the page is fully rendered
      const timer = setTimeout(() => {
        speak("Welcome to the symptom tracker. Here you can record how you're feeling and track your symptoms over time.");
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [sdkLoaded, speak]);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!error && data) {
          setProfile(data);
        }
      }
    };
    
    fetchUserData();
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged out",
        description: "You've been successfully logged out.",
      });
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "An error occurred while logging out.",
        variant: "destructive",
      });
    }
  };

  // Handle notes submission with detected symptoms
  const handleNotesSubmitted = async (notes: string, detectedSymptoms: { id: string, intensity: number }[]) => {
    try {
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
      
      // If no symptoms were detected, just save the notes as a general entry
      if (detectedSymptoms.length === 0) {
        await supabase.from('symptom_tracking').insert({
          user_id: session.user.id,
          symptom: 'general_notes',
          intensity: 3,
          source: 'notes',
          notes: notes,
          recorded_at: new Date().toISOString()
        });
        
        toast({
          title: "Notes recorded",
          description: "Your notes have been saved",
        });
      } else {
        // Save each detected symptom
        for (const symptom of detectedSymptoms) {
          await supabase.from('symptom_tracking').insert({
            user_id: session.user.id,
            symptom: symptom.id,
            intensity: symptom.intensity,
            source: 'notes',
            notes: notes,
            recorded_at: new Date().toISOString()
          });
        }
        
        toast({
          title: "Symptoms detected and recorded",
          description: `${detectedSymptoms.length} symptom(s) detected in your notes`,
        });
      }
      
      // Show confetti animation
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      
      // Refresh symptom history
      refreshSymptomHistory();
      
    } catch (error) {
      console.error("Error recording symptoms from notes:", error);
      toast({
        title: "Error",
        description: "Failed to record symptoms",
        variant: "destructive",
      });
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-menova-beige bg-menova-pattern bg-cover relative overflow-hidden">
        {/* Floral overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-cover bg-center bg-[url('/lovable-uploads/14905dcb-7154-41d0-92c2-f134f2aa1117.png')]" />
        
        {/* Confetti effect */}
        <ConfettiEffect show={showConfetti} />

        {/* Header with Navigation */}
        <header className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-8">
              <MeNovaLogo className="text-[#92D9A9]" />
              
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center text-[#92D9A9] hover:text-[#7bc492] font-medium">
                  Explore <ChevronDown className="h-4 w-4 ml-1" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => navigate('/welcome')}>
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/resources')}>
                    Resources
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/community')}>
                    Community
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/symptom-tracker')}>
                    Symptom Tracker
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-50">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://avatar.vercel.sh/${user?.email}.png`} alt={user?.email} />
                    <AvatarFallback>
                      {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[#92D9A9]">{profile?.full_name || user?.email?.split('@')[0] || "User"}</span>
                  <ChevronDown className="h-4 w-4 text-[#92D9A9]" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Breadcrumb Navigation */}
        <div className="bg-menova-beige/80 py-4 px-6 border-b border-menova-beige">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center text-sm">
              <Link to="/" className="text-[#92D9A9] hover:text-[#7bc492]">Home</Link>
              <span className="mx-2 text-gray-400">&gt;</span>
              <span className="text-gray-600">Symptom Tracker</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col w-full px-3 md:px-6 lg:px-10 relative z-10">
          <div className="max-w-6xl mx-auto w-full py-4">
            <div className="flex items-center mb-6 gap-2 mt-2">
              <Flower className="text-menova-green h-8 w-8" />
              <h1 className="text-2xl font-bold text-menova-text">Symptom Tracker</h1>
            </div>
            
            {/* Success message with personalized tip */}
            {successTip && (
              <SuccessMessage 
                message={successTip} 
                onClose={() => setSuccessTip(null)} 
              />
            )}
            
            {/* Main Tabs Interface */}
            <Tabs defaultValue="today" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-menova-green/10 border border-menova-green/20 w-full justify-start mb-6">
                <TabsTrigger value="today" className="data-[state=active]:bg-menova-green data-[state=active]:text-white flex gap-2 py-2 px-4">
                  <Smile className="h-4 w-4" /> How are you feeling today?
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-menova-green data-[state=active]:text-white flex gap-2 py-2 px-4">
                  <Book className="h-4 w-4" /> Symptom History
                </TabsTrigger>
              </TabsList>
              
              {/* Today's Symptoms Tab */}
              <TabsContent value="today" className="animate-fadeIn">
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-menova-text flex items-center gap-2">
                    <Smile className="h-5 w-5 text-menova-green" />
                    How are you feeling today?
                  </h2>
                  
                  {/* Success message when symptoms are recorded */}
                  {successTip && (
                    <SuccessMessage 
                      message={successTip} 
                      onClose={() => setSuccessTip(null)} 
                    />
                  )}
                  
                  {/* Symptom rating form */}
                  <SymptomForm 
                    onSubmitSuccess={handleSubmitSuccess}
                    onRefreshHistory={refreshSymptomHistory}
                  />
                  
                  {/* WhatsApp notification info */}
                  <Card className="mb-4 border-[#25D366]/20 bg-[#25D366]/5">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.41 2.59A2 2 0 0 0 20 2H4a2 2 0 0 0-1.41.59A2 2 0 0 0 2 4v12a2 2 0 0 0 .59 1.41A2 2 0 0 0 4 18h2v4l4-4h10a2 2 0 0 0 1.41-.59A2 2 0 0 0 22 16V4a2 2 0 0 0-.59-1.41Z"></path>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-[#128C7E]">WhatsApp Follow-ups Enabled</h4>
                          <p className="text-xs text-gray-600 mt-1">
                            When you save symptoms, a follow-up message will be sent to your WhatsApp in 24 hours to check how you're feeling.
                          </p>
                          <div className="mt-2">
                            <Link 
                              to="/whatsapp-demo" 
                              className="text-xs text-[#25D366] hover:text-[#128C7E] hover:underline inline-flex items-center"
                            >
                              <span>Test WhatsApp notifications</span>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                                <path d="M5 12h14"></path>
                                <path d="m12 5 7 7-7 7"></path>
                              </svg>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Symptom notes with auto-detection */}
                  <SymptomNotes
                    onNotesSubmitted={handleNotesSubmitted}
                  />
                </div>
              </TabsContent>
              
              {/* History Tab */}
              <TabsContent value="history" className="animate-fadeIn">
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-menova-text flex items-center gap-2">
                    <Activity className="h-5 w-5 text-menova-green" />
                    Your Symptom History
                  </h2>
                  
                  {/* Filters */}
                  <SymptomFilters 
                    selectedSymptom={selectedSymptom}
                    setSelectedSymptom={setSelectedSymptom}
                    selectedPeriod={selectedPeriod}
                    setSelectedPeriod={setSelectedPeriod}
                  />
                  
                  {/* Charts and Timeline */}
                  <Card className="backdrop-blur-md bg-white/80 border border-menova-green/20 shadow-sm">
                    <CardContent className="pt-6">
                      <Tabs defaultValue="chart" className="w-full">
                        <TabsList className="bg-menova-green/10 border border-menova-green/20 mb-4">
                          <TabsTrigger value="chart" className="data-[state=active]:bg-menova-green data-[state=active]:text-white">
                            Trend Chart
                          </TabsTrigger>
                          <TabsTrigger value="timeline" className="data-[state=active]:bg-menova-green data-[state=active]:text-white">
                            Timeline
                          </TabsTrigger>
                        </TabsList>
                        
                        {/* Chart View */}
                        <TabsContent value="chart" className="animate-fadeIn">
                          <div className="pt-2">
                            <h3 className="text-lg font-medium mb-2">Symptom Intensity Over Time</h3>
                            <SymptomChart 
                              loading={loading}
                              chartData={chartData}
                              selectedSymptom={selectedSymptom}
                            />
                          </div>
                        </TabsContent>
                        
                        {/* Timeline View */}
                        <TabsContent value="timeline" className="animate-fadeIn">
                          <div className="pt-2">
                            <h3 className="text-lg font-medium mb-2">Symptom Timeline</h3>
                            <SymptomTimeline 
                              loading={loading}
                              symptomHistory={symptomHistory}
                            />
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>
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
