import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import MeNovaLogo from '@/components/MeNovaLogo';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { MessageCircle, User, ChevronDown, Apple, Brain, Settings, LogOut } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import WellnessDashboard from '@/components/WellnessDashboard';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { BreadcrumbTrail } from '@/components/BreadcrumbTrail';
import MeNovaChatButton from '@/components/MeNovaChatButton';
import PhoneNumberReminder from '@/components/PhoneNumberReminder.jsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useVapi } from '@/contexts/VapiContext';

// Helper function to normalize category names for consistency
const normalizeCategory = (category: string): string => {
  // Convert to lowercase for consistency
  const lowerCategory = category.toLowerCase();
  
  // Map 'centre' to 'center' for consistency
  if (lowerCategory === 'centre') return 'center';
  
  return lowerCategory;
};

const Welcome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { startAssistant, stopAssistant, isSpeaking, speak, vapiRef, isListening } = useVapi();
  
  // Check if user is logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast({
          title: "Access denied",
          description: "Please log in to view this page.",
          variant: "destructive",
        });
        navigate('/login');
        return;
      }
      
      setUser(session.user);
      await fetchProfile(session.user.id);
    };
    
    checkUser();
  }, [navigate]);

  // Fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleMeNovaClick = () => {
    if (isSpeaking || isListening) {
      stopAssistant();
    } else {
      startAssistant();
      // Wait a short moment for the assistant to initialize
      setTimeout(() => {
        speak("Hello! I'm MeNova, your companion through menopause. How are you feeling today?");
      }, 500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-menova-beige flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-menova-beige bg-menova-pattern bg-cover">
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
            <span className="text-gray-600">Welcome</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col space-y-8 px-6 py-8 max-w-6xl mx-auto w-full">
        {/* Phone Number Reminder Alert */}
        <PhoneNumberReminder />
        
        {/* Welcome Section */}
        <section className="bg-white/90 p-6 rounded-lg shadow-sm backdrop-blur-sm bg-gradient-to-br from-white to-green-50">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-menova-text mb-2">
                Welcome, {profile?.full_name || user?.email.split('@')[0]}!
              </h1>
              <p className="text-gray-600 leading-relaxed">
                How are you feeling today, {profile?.full_name?.split(' ')[0] || user?.email.split('@')[0]}? MeNova is here to support you every step of the way.
              </p>
            </div>

            <div className="flex justify-center relative">
              <div className="relative">
                <div 
                  onClick={handleMeNovaClick}
                  className="rounded-full overflow-visible w-64 h-64 border-4 border-white shadow-lg cursor-pointer relative bg-white"
                >
                  <img
                    src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png"
                    alt="MeNova Assistant"
                    className="w-full h-full object-cover rounded-full"
                  />
                  
                  {/* Audio visualizer effect */}
                  {(isSpeaking || isListening) && (
                    <>
                      {/* Rotating ring effect */}
                      <div className="absolute -inset-4">
                        <div className="absolute inset-0 border-4 border-menova-green/30 rounded-full animate-ring-rotate" 
                             style={{ filter: 'blur(2px)' }} 
                        />
                        <div className="absolute inset-0 border-4 border-menova-green/30 rounded-full animate-ring-rotate" 
                             style={{ 
                               filter: 'blur(2px)',
                               animationDelay: '1s'
                             }} 
                        />
                        <div className="absolute inset-0 border-4 border-menova-green/30 rounded-full animate-ring-rotate" 
                             style={{ 
                               filter: 'blur(2px)',
                               animationDelay: '2s'
                             }} 
                        />
                      </div>
                      {/* Subtle glow effect */}
                      <div className="absolute -inset-1 rounded-full border-2 border-menova-green/20 shadow-[0_0_10px_rgba(146,217,169,0.3)]" />
                    </>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 bg-white px-4 py-2 rounded-2xl text-menova-text shadow-md z-30">
                  <p className="font-medium">{isSpeaking || isListening ? 'Click to Stop' : 'Talk to MeNova'}</p>
                  <div className="absolute bottom-8 right-4 transform rotate-45 w-4 h-4 bg-white"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* New Wellness Dashboard Section */}
        <WellnessDashboard />

        {/* Quick Links Section */}
        <section>
          <h2 className="text-xl font-semibold text-menova-text mb-4">
            Your Wellness Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Symptom Tracker</CardTitle>
                <CardDescription>Monitor your menopause symptoms</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full border-menova-green text-menova-green hover:bg-menova-green/10"
                  onClick={() => navigate('/symptom-tracker')}
                >
                  Track Now
                </Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Daily Check-In</CardTitle>
                <CardDescription>How are you feeling today?</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full border-menova-green text-menova-green hover:bg-menova-green/10"
                  onClick={() => navigate('/check-in')}
                >
                  Check In
                </Button>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Resources</CardTitle>
                <CardDescription>Evidence-based information</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full border-menova-green text-menova-green hover:bg-menova-green/10"
                  onClick={() => navigate('/resources')}
                >
                  Explore
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Welcome;
