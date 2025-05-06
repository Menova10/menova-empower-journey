
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MeNovaLogo from '@/components/MeNovaLogo';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { MessageCircle, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import VapiAssistant from '@/components/VapiAssistant';
import WellnessDashboard from '@/components/WellnessDashboard';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Welcome = () => {
  const navigate = useNavigate();
  const vapiRef = useRef(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      {/* Navbar with User Dropdown */}
      <nav className="flex justify-between items-center px-6 py-4 bg-white/90 shadow-sm backdrop-blur-sm sticky top-0 z-10">
        <MeNovaLogo />
        <div className="flex items-center space-x-2">
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
