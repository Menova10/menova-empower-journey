import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import MeNovaLogo from '@/components/MeNovaLogo';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { MessageCircle, User, ChevronDown, Apple, Brain, Settings, LogOut, Lightbulb, Sparkles, RefreshCw } from 'lucide-react';
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

// Menopause tips data
const menopauseTips = [
  {
    tip: "Start your day with a glass of cool water to help manage hot flashes and stay hydrated.",
    category: "Hydration",
    icon: "💧"
  },
  {
    tip: "Regular exercise can help manage mood swings and improve sleep quality during menopause.",
    category: "Exercise",
    icon: "🏃‍♀️"
  },
  {
    tip: "Include phytoestrogen-rich foods like soy, flaxseeds, and legumes in your diet to help balance hormones naturally.",
    category: "Nutrition",
    icon: "🌱"
  },
  {
    tip: "Practice deep breathing exercises during hot flashes to help your body cool down faster.",
    category: "Wellness",
    icon: "🧘‍♀️"
  },
  {
    tip: "Keep your bedroom cool and wear breathable fabrics to improve sleep quality during night sweats.",
    category: "Sleep",
    icon: "😴"
  },
  {
    tip: "Calcium and Vitamin D supplements can help maintain bone health during menopause.",
    category: "Supplements",
    icon: "💊"
  },
  {
    tip: "Stress management through meditation or yoga can significantly reduce menopause symptoms.",
    category: "Mental Health",
    icon: "🕯️"
  },
  {
    tip: "Layer your clothing so you can easily adjust to temperature changes throughout the day.",
    category: "Comfort",
    icon: "👗"
  },
  {
    tip: "Keep a symptom diary to identify patterns and triggers for your menopause symptoms.",
    category: "Tracking",
    icon: "📝"
  },
  {
    tip: "Join a menopause support group or connect with other women going through similar experiences.",
    category: "Support",
    icon: "🤝"
  }
];

// Helper function to normalize category names for consistency
const normalizeCategory = (category: string): string => {
  // Convert to lowercase for consistency
  const lowerCategory = category.toLowerCase();
  
  // Map 'centre' to 'center' for consistency
  if (lowerCategory === 'centre') return 'center';
  
  return lowerCategory;
};

interface MenopauseTip {
  tip: string;
  category: string;
  icon: string;
  isLoading: boolean;
}

const Welcome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [menopauseTip, setMenopauseTip] = useState<MenopauseTip>({ 
    tip: "", 
    category: "", 
    icon: "",
    isLoading: true 
  });
  const { startAssistant, stopAssistant, isSpeaking, speak, vapiRef, isListening, sdkLoaded } = useVapi();
  
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

  // Initialize daily tip
  useEffect(() => {
    getDailyMenopauseTip();
  }, []);

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
    console.log("MeNova avatar clicked!", { isSpeaking, isListening, sdkLoaded });
    
    if (!sdkLoaded) {
      console.error("SDK not loaded yet");
      toast({
        title: "Voice Assistant Not Ready",
        description: "Please wait a moment for the voice assistant to initialize.",
        variant: "destructive",
      });
      return;
    }
    
    if (isSpeaking || isListening) {
      console.log("Stopping assistant...");
      stopAssistant();
    } else {
      console.log("Starting assistant...");
      startAssistant();
    }
  };

  // Get daily menopause tip
  const getDailyMenopauseTip = () => {
    setMenopauseTip({ tip: "", category: "", icon: "", isLoading: true });
    
    // Use date to ensure same tip shows for the whole day
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    const tipIndex = dayOfYear % menopauseTips.length;
    
    setTimeout(() => {
      setMenopauseTip({
        tip: menopauseTips[tipIndex].tip,
        category: menopauseTips[tipIndex].category,
        icon: menopauseTips[tipIndex].icon,
        isLoading: false
      });
    }, 800); // Small delay to show loading state
  };

  const refreshTip = () => {
    setMenopauseTip({ tip: "", category: "", icon: "", isLoading: true });
    
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * menopauseTips.length);
      setMenopauseTip({
        tip: menopauseTips[randomIndex].tip,
        category: menopauseTips[randomIndex].category,
        icon: menopauseTips[randomIndex].icon,
        isLoading: false
      });
    }, 500);
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
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-menova-text mb-2">
                Welcome, {profile?.full_name || user?.email.split('@')[0]}!
              </h1>
              <p className="text-gray-600 leading-relaxed mb-4">
                How are you feeling today, {profile?.full_name?.split(' ')[0] || user?.email.split('@')[0]}? MeNova is here to support you every step of the way.
              </p>
              
              {/* Today's Menopause Tip */}
              <div className="bg-gradient-to-r from-menova-green/10 to-teal-50 rounded-lg p-4 border border-menova-green/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1">
                        <Sparkles className="h-4 w-4 text-menova-green" />
                        <span className="text-sm font-semibold text-menova-green">Today's Wellness Nudge</span>
                      </div>
                      {!menopauseTip.isLoading && (
                        <div className="flex items-center gap-1 bg-white/80 px-2 py-1 rounded-full">
                          <span className="text-xs">{menopauseTip.icon}</span>
                          <span className="text-xs text-gray-600 font-medium">{menopauseTip.category}</span>
                        </div>
                      )}
                    </div>
                    
                    {menopauseTip.isLoading ? (
                      <div className="space-y-2">
                        <div className="h-4 bg-menova-green/20 rounded animate-pulse"></div>
                        <div className="h-4 bg-menova-green/20 rounded animate-pulse w-3/4"></div>
                      </div>
                    ) : (
                      <p className="text-gray-700 leading-relaxed text-sm">
                        {menopauseTip.tip}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshTip}
                    className="h-8 w-8 p-0 text-menova-green hover:bg-menova-green/10 flex-shrink-0"
                    disabled={menopauseTip.isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${menopauseTip.isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
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
                  <p className="font-medium">
                    {!sdkLoaded ? 'Initializing...' : 
                     (isSpeaking || isListening ? 'Click to Stop' : 'Talk to MeNova')}
                  </p>
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

        {/* Featured Videos Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-menova-text">
              🎥 Featured Videos for You
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/resources')}
              className="border-menova-green text-menova-green hover:bg-menova-green/10"
            >
              View All Videos
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Video 1 - Menopause Guide */}
            <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
              <CardHeader className="p-0 relative overflow-hidden">
                <div className="relative">
                  <img
                    src="https://via.placeholder.com/320x180/92D9A9/FFFFFF?text=Menopause+Guide"
                    alt="Understanding Menopause Complete Guide"
                    className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                    <div className="bg-white/90 rounded-full p-2 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                      <MessageCircle className="text-menova-green h-6 w-6" />
                    </div>
                  </div>
                  <div className="absolute top-2 left-2">
                    <span className="bg-red-100 text-red-800 border-red-200 px-2 py-1 rounded text-xs font-medium">
                      📹 Video
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <CardTitle className="text-sm font-bold mb-2 line-clamp-2 text-menova-text group-hover:text-red-600 transition-colors">
                  Understanding Menopause: Complete Guide
                </CardTitle>
                <CardDescription className="text-xs text-gray-700 mb-3 line-clamp-2">
                  Comprehensive overview of menopause symptoms, causes, and evidence-based treatment options.
                </CardDescription>
                <Button
                  onClick={() => window.open('https://www.youtube.com/results?search_query=understanding+menopause+complete+guide', '_blank')}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs py-2"
                  size="sm"
                >
                  ▶ Watch Now
                </Button>
              </CardContent>
            </Card>

            {/* Video 2 - Hot Flashes */}
            <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
              <CardHeader className="p-0 relative overflow-hidden">
                <div className="relative">
                  <img
                    src="https://via.placeholder.com/320x180/7bc492/FFFFFF?text=Hot+Flashes"
                    alt="Natural Remedies for Hot Flashes"
                    className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                    <div className="bg-white/90 rounded-full p-2 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                      <MessageCircle className="text-menova-green h-6 w-6" />
                    </div>
                  </div>
                  <div className="absolute top-2 left-2">
                    <span className="bg-red-100 text-red-800 border-red-200 px-2 py-1 rounded text-xs font-medium">
                      📹 Video
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <CardTitle className="text-sm font-bold mb-2 line-clamp-2 text-menova-text group-hover:text-red-600 transition-colors">
                  Natural Remedies for Hot Flashes
                </CardTitle>
                <CardDescription className="text-xs text-gray-700 mb-3 line-clamp-2">
                  Learn effective natural approaches to managing hot flashes during perimenopause and menopause.
                </CardDescription>
                <Button
                  onClick={() => window.open('https://www.youtube.com/results?search_query=menopause+hot+flashes+natural+remedies', '_blank')}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs py-2"
                  size="sm"
                >
                  ▶ Watch Now
                </Button>
              </CardContent>
            </Card>

            {/* Video 3 - Yoga */}
            <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
              <CardHeader className="p-0 relative overflow-hidden">
                <div className="relative">
                  <img
                    src="https://via.placeholder.com/320x180/5a9f72/FFFFFF?text=Yoga+Practice"
                    alt="Gentle Yoga for Menopause Relief"
                    className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                    <div className="bg-white/90 rounded-full p-2 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                      <MessageCircle className="text-menova-green h-6 w-6" />
                    </div>
                  </div>
                  <div className="absolute top-2 left-2">
                    <span className="bg-red-100 text-red-800 border-red-200 px-2 py-1 rounded text-xs font-medium">
                      📹 Video
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <CardTitle className="text-sm font-bold mb-2 line-clamp-2 text-menova-text group-hover:text-red-600 transition-colors">
                  Gentle Yoga for Menopause Relief
                </CardTitle>
                <CardDescription className="text-xs text-gray-700 mb-3 line-clamp-2">
                  Follow along with this gentle yoga sequence designed specifically for menopausal women.
                </CardDescription>
                <Button
                  onClick={() => window.open('https://www.youtube.com/results?search_query=menopause+yoga+gentle', '_blank')}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs py-2"
                  size="sm"
                >
                  ▶ Watch Now
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Floating MeNova Chat Button */}
      <MeNovaChatButton variant="floating" />
    </div>
  );
};

export default Welcome;
