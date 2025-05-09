import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import VapiAssistant from '@/components/VapiAssistant';
import MeNovaLogo from '@/components/MeNovaLogo';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/components/ui/use-toast';
import { MessageCircle, User, Settings, LogOut, ChevronDown, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useVapi } from '@/contexts/VapiContext';

// Environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://kiuaitdfimlmgvkybuxx.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpdWFpdGRmaW1sbWd2a3lidXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyODQ3MDksImV4cCI6MjA2MTg2MDcwOX0.01zqSXUecTwOjTYn9qn9g_kzVOlUc-RsL99VboaJ6M8';

// Community page component
const Community = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [communities, setCommunities] = useState<Array<{ name: string; description: string; url: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { speak, sdkLoaded } = useVapi();
  const vapiRef = useRef(null);
  const [communityDialogOpen, setCommunityDialogOpen] = useState(false);
  const [currentChatMessages, setCurrentChatMessages] = useState<Array<{ text: string, sender: 'user' | 'ai', timestamp: Date }>>([]);
  const [chatInputText, setChatInputText] = useState('');
  const [showFollowUps, setShowFollowUps] = useState(false);
  const [currentCommunity, setCurrentCommunity] = useState('');
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Community icons mapping
  const communityIcons = {
    'Reddit': '/lovable-uploads/reddit-icon.png',
    'HealthUnlocked': '/lovable-uploads/health-icon.png',
    'Geneva': '/lovable-uploads/geneva-icon.png',
    'Facebook Groups': '/lovable-uploads/facebook-icon.png',
    'Peanut App': '/lovable-uploads/peanut-icon.png'
  };

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

  // Introduce the community page with voice when loaded
  useEffect(() => {
    if (!loading && sdkLoaded) {
      // Add a short delay to make sure the page is fully rendered
      const timer = setTimeout(() => {
        speak("Welcome to the community page. Here you can find supportive communities for women on this journey.");
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [loading, sdkLoaded, speak]);

  // Handle voice navigation with announcements
  const handleVoiceNavigation = (sectionName: string, path: string) => {
    speak(`Navigating to ${sectionName}`);
    
    // Close all menus
    setIsExploreOpen(false);
    setIsMobileMenuOpen(false);
    
    // Navigate after a short delay to allow the voice to be heard
    setTimeout(() => {
      navigate(path);
    }, 500);
  };

  // Fetch community data
  useEffect(() => {
    const fetchCommunityData = async () => {
      if (!user) return; // Only fetch data if user is authenticated
      
      try {
        // Skip API calls for now and use static data
        const communities = [
          { name: 'Reddit', description: 'A supportive community on Reddit.', url: 'https://www.reddit.com/r/Menopause/' },
          { name: 'HealthUnlocked', description: 'A supportive community on HealthUnlocked.', url: 'https://healthunlocked.com/menopause' },
          { name: 'Geneva', description: 'A supportive community on Geneva.', url: 'https://www.geneva.com/' },
          { name: 'Facebook Groups', description: 'Curated list of private support spaces', url: 'https://www.facebook.com/groups/' },
          { name: 'Peanut App', description: 'Social support for women over 40', url: 'https://www.peanut-app.io/' },
        ];
        
        setCommunities(communities);
      } catch (err) {
        setError('Failed to load community data. Please try again later.');
      }
    };

    fetchCommunityData();
  }, [user]);

  // Handle community navigation - direct link to community
  const handleCommunityNavigation = (name: string, url: string) => {
    try {
      speak(`Opening ${name} for you.`);
      
      // Log for debugging
      console.log(`Attempting to open URL: ${url}`);
      
      // Force the window.open to happen within a user gesture handler
      const newWindow = window.open(url, '_blank');
      
      // Check if popup was blocked
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        console.error('Popup was blocked or failed to open');
        toast({
          title: "Popup Blocked",
          description: `Please allow popups for this site to visit ${name}.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      // Fallback method - create an anchor element and simulate a click
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Handle notification sign-up
  const handleNotifySignUp = async () => {
    if (!notifyEmail) {
      toast({
        title: "Email Required",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    try {
      const { error } = await supabase
        .from('waitlist')
        .insert({ 
          email: notifyEmail,
          full_name: 'Community Subscriber', // Default name for notifications
          reason: 'Interested in MeNova community'
        });
      if (error) throw error;
      toast({
        title: "Success",
        description: "Thank you! We'll notify you when the MeNova community is ready.",
      });
      setNotifyEmail('');
    } catch (err) {
      toast({
        title: "Error",
        description: "There was an error. Please try again later.",
        variant: "destructive",
      });
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

  // Scroll to bottom when chat messages update
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentChatMessages]);

  // Load chat history from local storage when dialog opens
  useEffect(() => {
    if (communityDialogOpen) {
      const savedMessages = localStorage.getItem('menova-community-chat');
      if (savedMessages) {
        try {
          // Convert stored string timestamps back to Date objects
          const parsedMessages = JSON.parse(savedMessages).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          
          if (parsedMessages.length > 0) {
            setCurrentChatMessages(parsedMessages);
            // Check last AI message to determine if we should show follow-ups
            const lastAiMsg = [...parsedMessages].reverse().find(m => m.sender === 'ai');
            if (lastAiMsg) {
              // Check if the last message was about a specific community
              const communityMatch = Object.keys(communityIcons).find(
                comm => lastAiMsg.text.toLowerCase().includes(comm.toLowerCase())
              );
              setCurrentCommunity(communityMatch || '');
              setShowFollowUps(!!communityMatch);
            }
          } else {
            // If no saved messages, set the initial greeting
            initializeChat();
          }
        } catch (e) {
          console.error('Error parsing saved chat messages:', e);
          initializeChat();
        }
      } else {
        initializeChat();
      }
      
      // Focus on input after a short delay
      setTimeout(() => chatInputRef.current?.focus(), 300);
    }
  }, [communityDialogOpen]);

  // Save chat messages to local storage when they change
  useEffect(() => {
    if (currentChatMessages.length > 0) {
      localStorage.setItem('menova-community-chat', JSON.stringify(currentChatMessages));
    }
  }, [currentChatMessages]);

  // Initialize chat with welcome message
  const initializeChat = () => {
    setCurrentChatMessages([{
      text: "I can help you find supportive communities for women on this menopause journey. Would you like me to tell you more about any of the communities listed on this page?",
      sender: 'ai',
      timestamp: new Date()
    }]);
    setShowFollowUps(false);
    setCurrentCommunity('');
  };

  // Handle sending a custom message
  const handleSendChatMessage = () => {
    if (!chatInputText.trim()) return;
    
    // Add user message
    const userMessage = {
      text: chatInputText,
      sender: 'user' as const,
      timestamp: new Date()
    };
    
    setCurrentChatMessages(prev => [...prev, userMessage]);
    setChatInputText('');
    setShowFollowUps(false);
    
    // Detect if the message is asking about a specific community
    const communityMatch = Object.keys(communityIcons).find(
      comm => chatInputText.toLowerCase().includes(comm.toLowerCase())
    );
    
    if (communityMatch) {
      // If asking about a specific community, use the community response
      handleCommunityChat(communityMatch, false);
    } else {
      // Generic response for other questions
      setTimeout(() => {
        const aiMessage = {
          text: "I'm focused on helping with community resources. Would you like to know about Reddit, HealthUnlocked, Geneva, Facebook Groups, or the Peanut App?",
          sender: 'ai' as const,
          timestamp: new Date()
        };
        
        setCurrentChatMessages(prev => [...prev, aiMessage]);
        speak(aiMessage.text);
      }, 1000);
    }
  };

  // Handle sending a chat message about a community
  const handleCommunityChat = (communityName: string, isButtonClick = true) => {
    // If it's a button click, add the user message
    if (isButtonClick) {
      const userMessage = {
        text: `Tell me about ${communityName}`,
        sender: 'user' as const,
        timestamp: new Date()
      };
      
      setCurrentChatMessages(prev => [...prev, userMessage]);
    }
    
    // Set the current community for follow-ups
    setCurrentCommunity(communityName);
    
    // Simulate AI response delay
    setTimeout(() => {
      let response = "";
      
      switch (communityName) {
        case 'Reddit':
          response = "Reddit has a vibrant menopause community at r/Menopause with over 40,000 members. It's a supportive space where women share experiences, advice, and resources. The community is moderated to ensure respectful discussions. You'll find posts about symptom management, treatment options, and emotional support.";
          break;
        case 'HealthUnlocked':
          response = "HealthUnlocked hosts a menopause community moderated by healthcare professionals. It's more clinically focused with evidence-based discussions. Members can ask questions about treatments and get reliable information. The platform also offers resources verified by medical experts.";
          break;
        case 'Geneva':
          response = "Geneva offers private chat groups for menopause support. These smaller communities provide more intimate conversation and connection. Members can share in a more confidential setting, and the platform supports both text and voice discussions.";
          break;
        case 'Facebook Groups':
          response = "There are several private Facebook groups dedicated to menopause support. These groups provide community moderation and privacy settings. Popular ones include 'Menopause Support Group' and 'Menopause Chicks'. They offer a mix of peer support and expert guidance.";
          break;
        case 'Peanut App':
          response = "The Peanut App has a dedicated space for women over 40 experiencing menopause. It uses a match-making approach to connect women with similar experiences. The app focuses on creating meaningful connections rather than just forum discussions.";
          break;
        default:
          response = "I'd be happy to tell you more about community options for menopause support. Would you like to know about a specific platform?";
      }
      
      const aiMessage = {
        text: response,
        sender: 'ai' as const,
        timestamp: new Date()
      };
      
      setCurrentChatMessages(prev => [...prev, aiMessage]);
      setShowFollowUps(true);
      
      // Also speak the response
      speak(response);
    }, 1000);
  };

  // Handle follow-up questions
  const handleFollowUp = (question: string) => {
    // Add user message
    const userMessage = {
      text: question,
      sender: 'user' as const,
      timestamp: new Date()
    };
    
    setCurrentChatMessages(prev => [...prev, userMessage]);
    setShowFollowUps(false);
    
    // Simulate AI response delay
    setTimeout(() => {
      let response = "";
      
      if (question.includes("how to join")) {
        switch (currentCommunity) {
          case 'Reddit':
            response = "To join r/Menopause on Reddit, visit reddit.com and create an account. Then search for 'r/Menopause' and click 'Join'. You can then read posts, leave comments, and share your own experiences.";
            break;
          case 'HealthUnlocked':
            response = "To join HealthUnlocked's menopause community, visit healthunlocked.com, create an account, and search for 'menopause' in the communities section. Click 'Join' on the menopause community page to become a member.";
            break;
          case 'Geneva':
            response = "To join a Geneva group, download the Geneva app from your app store and create an account. Search for menopause-related groups or get an invite link from a current member to join a private group.";
            break;
          case 'Facebook Groups':
            response = "To join Facebook menopause groups, log into your Facebook account, search for 'menopause support', and request to join any groups that interest you. Admins will typically ask a few questions before approving your membership.";
            break;
          case 'Peanut App':
            response = "To join Peanut, download the app from your app store, create a profile, and select your interests related to menopause. The app will then match you with women with similar experiences.";
            break;
          default:
            response = "Each community has a simple sign-up process. Which one would you like to join?";
        }
      } else if (question.includes("benefits")) {
        switch (currentCommunity) {
          case 'Reddit':
            response = "Reddit benefits include anonymity, a vast global community, searchable archives of past discussions, and 24/7 activity. The voting system helps highlight quality content and advice.";
            break;
          case 'HealthUnlocked':
            response = "HealthUnlocked benefits include medically-reviewed content, healthcare professional participation, a focus on evidence-based discussions, and organized resources for different symptoms and treatments.";
            break;
          case 'Geneva':
            response = "Geneva benefits include smaller, more intimate group sizes, better privacy, real-time chat capabilities, and voice meeting options for those who prefer speaking to typing.";
            break;
          case 'Facebook Groups':
            response = "Facebook Groups benefits include using your existing Facebook account, easy photo sharing, events coordination for local meetups, and customized privacy settings.";
            break;
          case 'Peanut App':
            response = "Peanut App benefits include a modern interface designed specifically for women, AI-powered matching with similar users, a focus on making meaningful one-on-one connections, and a clean, ad-free experience.";
            break;
          default:
            response = "Each community offers unique benefits. The best one depends on your communication style and specific needs.";
        }
      } else {
        response = "I'm happy to answer more questions about menopause communities. Is there something specific about " + (currentCommunity || "these platforms") + " you'd like to know?";
      }
      
      const aiMessage = {
        text: response,
        sender: 'ai' as const,
        timestamp: new Date()
      };
      
      setCurrentChatMessages(prev => [...prev, aiMessage]);
      setShowFollowUps(true);
      
      // Also speak the response
      speak(response);
    }, 1000);
  };

  // Handle closing the chat dialog and optionally reset history
  const handleCloseChat = (resetHistory = false) => {
    setCommunityDialogOpen(false);
    if (resetHistory) {
      setCurrentChatMessages([]);
      localStorage.removeItem('menova-community-chat');
    }
  };

  // Handle clear chat history
  const handleClearChat = () => {
    initializeChat();
    localStorage.removeItem('menova-community-chat');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-menova-beige bg-menova-pattern bg-cover flex flex-col">
        <nav className="flex justify-between items-center px-6 py-4 bg-white/90 shadow-sm backdrop-blur-sm sticky top-0 z-10">
          <MeNovaLogo />
        </nav>
        <div className="flex-1 flex items-center justify-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-menova-beige bg-menova-pattern bg-cover flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-menova-beige bg-menova-pattern bg-cover">
      {/* Navbar with expanded menus - Same as Welcome page */}
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
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white">
              <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                <User size={16} className="mr-2" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                <Settings size={16} className="mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut size={16} className="mr-2" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            onClick={() => {
              // Open the community dialog instead of navigating
              setCommunityDialogOpen(true);
              setCurrentChatMessages([{
                text: "I can help you find supportive communities for women on this menopause journey. Would you like me to tell you more about any of the communities listed on this page?",
                sender: 'ai',
                timestamp: new Date()
              }]);
            }}
            className="bg-menova-green text-white hover:bg-menova-green/90 rounded-full flex items-center gap-2"
          >
            <MessageCircle size={16} />
            <span className="hidden md:inline">Chat with MeNova</span>
          </Button>
        </div>
      </nav>
      
      {/* Mobile Menu (Dropdown) */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-menova-green/20 py-2 px-4">
          <div className="flex flex-col space-y-2">
            <Button variant="ghost" onClick={() => handleVoiceNavigation('Symptom Tracker', '/symptom-tracker')} className="justify-start">
              Symptom Tracker
            </Button>
            <Button variant="ghost" onClick={() => handleVoiceNavigation('Wellness Plan', '/wellness-plan')} className="justify-start">
              Wellness Plan
            </Button>
            <Button variant="ghost" onClick={() => handleVoiceNavigation('Community', '/community')} className="justify-start">
              Community
            </Button>
            <Button variant="ghost" onClick={() => navigate('/profile')} className="justify-start">
              <User size={16} className="mr-2" /> Profile
            </Button>
            <Button variant="ghost" onClick={() => navigate('/settings')} className="justify-start">
              <Settings size={16} className="mr-2" /> Settings
            </Button>
            <Button variant="ghost" onClick={handleLogout} className="justify-start text-red-500">
              <LogOut size={16} className="mr-2" /> Logout
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col space-y-8 px-6 py-8 max-w-6xl mx-auto w-full">
        {/* Introduction Card */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-menova-green">
              <img
                src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png"
                alt="MeNova Avatar"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23A5D6A7"/><text x="50%" y="50%" font-family="Arial" font-size="14" fill="white" text-anchor="middle" dominant-baseline="middle">MeNova</text></svg>';
                }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-menova-green text-center md:text-left">
                Connect with a Community
              </h1>
              <p className="text-gray-600 text-center md:text-left">
                You're not alone. There are many safe and empowering communities for women on this journey. I've found a few you might like to explore.
              </p>
            </div>
          </div>
        </section>

        {/* Recommended Community Links */}
        <section>
          <h2 className="text-xl font-semibold text-menova-text mb-4">
            Explore Communities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {communities.map((community, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm p-6 flex flex-col items-start hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => handleCommunityNavigation(community.name, community.url)}
              >
                <div className="flex items-center gap-3 mb-2 w-full">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src={communityIcons[community.name as keyof typeof communityIcons] || '/lovable-uploads/community-icon.png'}
                      alt={community.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = '/lovable-uploads/community-icon.png';
                      }}
                    />
                  </div>
                  <h3 className="text-lg font-medium text-menova-green">
                    {community.name}
                  </h3>
                </div>
                <p className="text-gray-600 mb-4">
                  {community.description}
                </p>
                <Button 
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the parent div's click event
                    handleCommunityNavigation(community.name, community.url);
                  }}
                  variant="outline"
                  className="border-menova-green text-menova-green hover:bg-menova-green/10 rounded-full group-hover:bg-menova-green/5"
                >
                  Take me there
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Future Teaser Section */}
        <section className="bg-menova-softpink/30 p-6 rounded-lg shadow-sm text-center">
          <h2 className="text-xl font-semibold text-menova-text mb-4">
            Your MeNova Community is Coming Soon
          </h2>
          <p className="text-gray-600 mb-4">
            A private, voice-supported space just for you.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-2 max-w-md mx-auto">
            <input
              type="email"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full sm:flex-1 border border-menova-green rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-menova-green"
              aria-label="Email for notification"
            />
            <Button
              onClick={handleNotifySignUp}
              className="w-full sm:w-auto bg-menova-green hover:bg-menova-green/90 text-white rounded-full mt-2 sm:mt-0"
            >
              Notify Me
            </Button>
          </div>
        </section>
      </main>

      {/* Community Chat Dialog */}
      <Dialog open={communityDialogOpen} onOpenChange={setCommunityDialogOpen}>
        <DialogContent className="bg-white max-w-md mx-auto rounded-lg p-0 overflow-hidden">
          <div className="bg-menova-green/10 p-4">
            <DialogHeader>
              <DialogTitle className="text-menova-green text-xl">Chat with MeNova</DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="flex justify-center -mt-10">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-md">
              <img
                src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png"
                alt="MeNova"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          {/* Chat messages */}
          <div className="max-h-60 overflow-y-auto px-4 py-2 mt-2">
            {currentChatMessages.map((message, index) => (
              <div 
                key={index} 
                className={`mb-3 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}
              >
                {message.sender === 'ai' && (
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full overflow-hidden mr-2 mt-1 flex-shrink-0 border border-menova-green/30">
                      <img
                        src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png"
                        alt="MeNova"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div 
                      className="inline-block max-w-[75%] rounded-lg px-4 py-2 bg-menova-lightgreen text-menova-text"
                    >
                      <p>{message.text}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )}
                
                {message.sender === 'user' && (
                  <div className="flex items-start justify-end">
                    <div 
                      className="inline-block max-w-[75%] rounded-lg px-4 py-2 bg-menova-green text-white"
                    >
                      <p>{message.text}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatMessagesEndRef} />
          </div>
          
          {/* Follow-up suggestion buttons */}
          {showFollowUps && currentCommunity && (
            <div className="px-4 py-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Suggested questions:</p>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  className="text-xs border-menova-green text-menova-green hover:bg-menova-green/10"
                  onClick={() => handleFollowUp(`How do I join ${currentCommunity}?`)}
                >
                  How do I join?
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  className="text-xs border-menova-green text-menova-green hover:bg-menova-green/10"
                  onClick={() => handleFollowUp(`What are the benefits of ${currentCommunity}?`)}
                >
                  What are the benefits?
                </Button>
              </div>
            </div>
          )}
          
          {/* Quick response buttons for communities - only show on first message */}
          {currentChatMessages.length === 1 && (
            <div className="px-4 py-2 flex flex-col gap-2 border-t border-gray-100">
              {communities.map((community, index) => (
                <Button 
                  key={index}
                  variant="outline"
                  className="border-menova-green text-menova-green hover:bg-menova-green/10 justify-start"
                  onClick={() => handleCommunityChat(community.name)}
                >
                  <div className="w-6 h-6 mr-2 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src={communityIcons[community.name as keyof typeof communityIcons] || '/lovable-uploads/community-icon.png'}
                      alt={community.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = '/lovable-uploads/community-icon.png';
                      }}
                    />
                  </div>
                  Tell me about {community.name}
                </Button>
              ))}
            </div>
          )}
          
          {/* Chat input */}
          <div className="px-4 py-3 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                ref={chatInputRef}
                value={chatInputText}
                onChange={(e) => setChatInputText(e.target.value)}
                placeholder="Ask about communities..."
                className="flex-1 px-3 py-2 border border-menova-green/30 rounded-full focus:outline-none focus:ring-2 focus:ring-menova-green/50 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendChatMessage();
                  }
                }}
              />
              <Button 
                onClick={handleSendChatMessage}
                className="bg-menova-green text-white hover:bg-menova-green/90 rounded-full h-10 w-10 p-0 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </Button>
            </div>
            
            {/* Chat controls */}
            <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
              <button 
                onClick={handleClearChat}
                className="hover:text-menova-green transition-colors"
              >
                Clear chat
              </button>
              <button 
                onClick={() => handleCloseChat(false)}
                className="hover:text-menova-green transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Floating Voice Assistant */}
      <div className="fixed bottom-6 right-6 z-50">
        <VapiAssistant />
      </div>
    </div>
  );
};

export default Community; 