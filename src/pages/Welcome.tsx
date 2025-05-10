import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MeNovaLogo from '@/components/MeNovaLogo';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { MessageCircle, User, Settings, LogOut, ChevronDown, Apple, Brain, ActivitySquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import WellnessDashboard from '@/components/WellnessDashboard';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { BreadcrumbTrail } from '@/components/BreadcrumbTrail';
import MeNovaChatButton from '@/components/MeNovaChatButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Welcome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [categoryProgress, setCategoryProgress] = useState({
    nourish: 0,
    center: 0,
    play: 0
  });

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
      await fetchCategoryProgress();
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

  // Fetch category progress
  const fetchCategoryProgress = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const { data, error } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('date', today);

      if (error) {
        console.error('Error fetching category progress:', error);
        return;
      }

      if (data) {
        // Calculate percentage for each category
        const calculatePercentage = (category: string) => {
          const categoryGoals = data.filter(g => g.category === category);
          const completed = categoryGoals.filter(g => g.completed).length;
          const total = categoryGoals.length;
          return total > 0 ? Math.round((completed / total) * 100) : 0;
        };
        
        setCategoryProgress({
          nourish: calculatePercentage('nourish'),
          center: calculatePercentage('center'),
          play: calculatePercentage('play')
        });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Handle voice navigation with announcements
  const handleVoiceNavigation = (sectionName: string, path: string) => {
    // Close all menus
    setIsExploreOpen(false);
    setIsMobileMenuOpen(false);
    
    // Navigate immediately
    navigate(path);
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

  // Create a CategoryProgressRing component
  const CategoryProgressRing = ({ 
    category, 
    percentage, 
    icon: Icon, 
    color 
  }: { 
    category: string; 
    percentage: number; 
    icon: React.ElementType; 
    color: string; 
  }) => {
    const size = 80;
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    return (
      <div className="flex flex-col items-center">
        <div className="relative hover:category-scale">
          <svg height={size} width={size} className="category-progress-ring">
            {/* Background circle */}
            <circle 
              stroke="#e9e9e9" 
              fill="transparent"
              strokeWidth={strokeWidth}
              r={radius}
              cx={size / 2}
              cy={size / 2}
            />
            {/* Progress circle */}
            <circle
              stroke={color}
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              r={radius}
              cx={size / 2}
              cy={size / 2}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center category-icon">
            <Icon size={32} color={color} />
          </div>
        </div>
        <span className="mt-2 text-sm font-medium capitalize">{category}</span>
        <span className="text-xs text-gray-500">{percentage}% complete</span>
      </div>
    );
  };

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
                >
                  Explore <ChevronDown size={16} className="ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-white border-menova-green/20">
                <DropdownMenuItem onClick={() => handleVoiceNavigation('Symptom Tracker', '/symptom-tracker')} className="cursor-pointer">
                  Symptom Tracker
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleVoiceNavigation('Resources', '/resources')} className="cursor-pointer">
                  Resources
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleVoiceNavigation('Content Hub', '/content-hub')} className="cursor-pointer">
                  Content Hub
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleVoiceNavigation('Wellness Plan', '/wellness-plan')} className="cursor-pointer">
                  Wellness Plan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleVoiceNavigation('Community', '/community')} className="cursor-pointer">
                  Community
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
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white shadow-md z-20">
          <div className="flex flex-col space-y-1 p-4">
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
              onClick={() => handleVoiceNavigation('Resources', '/resources')}
            >
              Resources
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-menova-text"
              onClick={() => handleVoiceNavigation('Content Hub', '/content-hub')}
            >
              Content Hub
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
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-menova-text"
              onClick={() => handleVoiceNavigation('Chat', '/chat')}
            >
              Chat with MeNova
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-menova-text"
              onClick={handleLogout}
            >
              Logout
            </Button>
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
        <section className="bg-white/90 p-6 rounded-lg shadow-sm backdrop-blur-sm bg-gradient-to-br from-white to-green-50">
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

        {/* Today's Categories Progress */}
        <section className="bg-white/90 p-6 rounded-lg shadow-sm backdrop-blur-sm bg-gradient-to-br from-white to-green-50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-menova-text">Today's Wellness Categories</h2>
            <Button 
              variant="outline" 
              onClick={() => navigate('/todays-wellness')}
              className="border-menova-green text-menova-green hover:bg-menova-green/10"
            >
              View All
            </Button>
          </div>
          
          <div className="flex flex-wrap justify-around gap-8 my-6">
            <CategoryProgressRing 
              category="nourish" 
              percentage={categoryProgress.nourish} 
              icon={Apple} 
              color="#f97316" // orange-500
            />
            <CategoryProgressRing 
              category="center" 
              percentage={categoryProgress.center} 
              icon={Brain} 
              color="#14b8a6" // teal-500
            />
            <CategoryProgressRing 
              category="play" 
              percentage={categoryProgress.play} 
              icon={ActivitySquare} 
              color="#ea384c" // red-500
            />
          </div>
          
          <div className="mt-4 flex justify-center">
            <Button 
              onClick={() => navigate('/todays-wellness')}
              className="bg-menova-green hover:bg-menova-green/90 text-white"
            >
              Add Today's Goals
            </Button>
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
