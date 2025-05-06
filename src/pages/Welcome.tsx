
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MeNovaLogo from '@/components/MeNovaLogo';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { MessageCircle, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import VapiAssistant from '@/components/VapiAssistant';
import WellnessDashboard from '@/components/WellnessDashboard';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { BreadcrumbTrail } from '@/components/BreadcrumbTrail';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Welcome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const vapiRef = useRef(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [isExploreFeaturesOpen, setIsExploreFeaturesOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Handle voice navigation with announcements
  const handleVoiceNavigation = (sectionName: string, path: string) => {
    if (vapiRef.current) {
      (vapiRef.current as any).speak(`Navigating to ${sectionName}`);
    }
    
    // Close all menus
    setIsExploreOpen(false);
    setIsExploreFeaturesOpen(false);
    setIsMobileMenuOpen(false);
    
    // Navigate after a short delay to allow the voice to be heard
    setTimeout(() => {
      navigate(path);
    }, 500);
  };
  
  // Voice prompts for menu sections
  const handleExplorePrompt = () => {
    if (vapiRef.current) {
      (vapiRef.current as any).speak('Say Explore to view more options');
    }
  };

  const handleExploreFeaturesPrompt = () => {
    if (vapiRef.current) {
      (vapiRef.current as any).speak('Say Explore Features to view more options');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-menova-beige flex flex-col">
        <nav className="flex justify-between items-center px-6 py-4 bg-white/90 shadow-sm backdrop-blur-sm sticky top-0 z-10">
          <MeNovaLogo />
        </nav>
        <div className="flex-1 flex items-center justify-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-menova-beige bg-menova-pattern bg-cover">
      {/* Navbar with expanded menus */}
      <nav className="flex justify-between items-center px-6 py-4 bg-white/90 shadow-sm backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <MeNovaLogo />
          
          {/* Desktop Menu Items */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Explore Menu */}
            <DropdownMenu open={isExploreOpen} onOpenChange={setIsExploreOpen}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="text-menova-green hover:bg-menova-green/10"
                  onMouseEnter={handleExplorePrompt}
                >
                  Explore <ChevronDown size={16} className="ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-white border-menova-green/20">
                <DropdownMenuItem onClick={() => handleVoiceNavigation('Symptom Tracker', '/symptom-tracker')} className="cursor-pointer">
                  Symptom Tracker
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleVoiceNavigation('Wellness Plan', '/wellness-plan')} className="cursor-pointer">
                  Wellness Plan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleVoiceNavigation('Community', '/community')} className="cursor-pointer">
                  Community
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Explore Features Menu - New */}
            <DropdownMenu open={isExploreFeaturesOpen} onOpenChange={setIsExploreFeaturesOpen}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="text-menova-green hover:bg-menova-green/10"
                  onMouseEnter={handleExploreFeaturesPrompt}
                >
                  Explore Features <ChevronDown size={16} className="ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-white border-menova-green/20">
                <DropdownMenuItem onClick={() => handleVoiceNavigation('Feature 1', '/features/feature1')} className="cursor-pointer">
                  Feature 1
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleVoiceNavigation('Feature 2', '/features/feature2')} className="cursor-pointer">
                  Feature 2
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleVoiceNavigation('Feature 3', '/features/feature3')} className="cursor-pointer">
                  Feature 3
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Mobile Menu Toggle */}
        <Button 
          variant="ghost" 
          size="sm"
          className="md:hidden text-menova-green"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          )}
        </Button>
        
        {/* User Dropdown */}
        <div className="hidden md:flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="border-menova-green text-menova-green hover:bg-menova-green/10 flex items-center gap-2"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png"
                    alt="Profile"
                  />
                  <AvatarFallback className="bg-menova-green text-white">
                    {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline">
                  {profile?.full_name || user?.email?.split('@')[0]}
                </span>
                <ChevronDown size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white border-menova-green/20">
              <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
      
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white/95 p-4 shadow-md animate-in fade-in slide-in-from-top">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-menova-green">Explore</p>
              <div className="pl-2 space-y-1 border-l-2 border-menova-green/20">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-menova-text"
                  onClick={() => handleVoiceNavigation('Symptom Tracker', '/symptom-tracker')}
                >
                  Symptom Tracker
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-menova-text"
                  onClick={() => handleVoiceNavigation('Wellness Plan', '/wellness-plan')}
                >
                  Wellness Plan
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-menova-text"
                  onClick={() => handleVoiceNavigation('Community', '/community')}
                >
                  Community
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-menova-green">Explore Features</p>
              <div className="pl-2 space-y-1 border-l-2 border-menova-green/20">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-menova-text"
                  onClick={() => handleVoiceNavigation('Feature 1', '/features/feature1')}
                >
                  Feature 1
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-menova-text"
                  onClick={() => handleVoiceNavigation('Feature 2', '/features/feature2')}
                >
                  Feature 2
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-menova-text"
                  onClick={() => handleVoiceNavigation('Feature 3', '/features/feature3')}
                >
                  Feature 3
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-menova-green">Account</p>
              <div className="pl-2 space-y-1 border-l-2 border-menova-green/20">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-menova-text"
                  onClick={() => navigate('/profile')}
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-menova-text"
                  onClick={() => navigate('/settings')}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-menova-text"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Breadcrumb Navigation */}
      <div className="px-6 pt-4 max-w-6xl mx-auto w-full">
        <BreadcrumbTrail currentPath={location.pathname} />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col space-y-8 px-6 py-8 max-w-6xl mx-auto w-full">
        {/* Welcome Section */}
        <section className="bg-white/90 p-6 rounded-lg shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-menova-green">
              <img
                src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png"
                alt="MeNova Character"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-menova-text">
                Welcome, {profile?.full_name || user?.email.split('@')[0]}!
              </h1>
              <p className="text-gray-600">It's great to see you today</p>
            </div>
          </div>

          <p className="text-gray-600 leading-relaxed mb-4">
            How are you feeling today? MeNova is here to support you through your journey.
          </p>
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
                  onClick={() => navigate('/mood-check')}
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

      {/* Fixed floating chatbot */}
      <div className="fixed bottom-20 right-6 z-40">
        <button 
          onClick={() => navigate('/chat')}
          className="bg-menova-green hover:bg-menova-green/90 text-white rounded-full py-3 px-4 shadow-lg cursor-pointer flex items-center justify-center gap-2"
        >
          <MessageCircle size={18} />
          <span className="text-sm font-medium">Text Chat</span>
        </button>
      </div>

      {/* Floating Voice Assistant */}
      <div className="fixed bottom-6 right-6 z-50">
        <VapiAssistant ref={vapiRef} />
      </div>
    </div>
  );
};

export default Welcome;
