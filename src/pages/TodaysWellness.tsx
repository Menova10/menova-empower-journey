import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Check, RefreshCw, Settings, MoreHorizontal, ChevronDown, User, LogOut } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MeNovaLogo from '@/components/MeNovaLogo';

// Import animations CSS
import '@/styles/animations.css';

// Import types and services
import { 
  Goal, 
  categories,
  normalizeCategory
} from '@/types/wellness';

import { 
  fetchTodaysGoals,
  toggleGoalCompletionWithRefill,
  getCategorySettings,
  updateCategorySettings,
  createInitialGoalsForAllCategories,
  addNewGoalForCategory
} from '@/services/wellnessService';

// Category configuration
const categoryConfig = {
  nourish: {
    title: 'Nourish',
    icon: '🌱',
    color: 'from-green-400 to-emerald-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'Nutrition & Self-Care'
  },
  center: {
    title: 'Center',
    icon: '⊕',
    color: 'from-purple-400 to-indigo-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Mindfulness & Balance'
  },
  play: {
    title: 'Play',
    icon: '⭐',
    color: 'from-pink-400 to-rose-500',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    description: 'Movement & Joy'
  }
};

// Simple Goal Item Component
const DashboardGoalItem = memo(({ goal, onToggle }: { 
  goal: Goal; 
  onToggle: (goalId: string, completed: boolean) => void;
}) => {
  const handleClick = () => onToggle(goal.id, goal.completed);

  return (
    <div 
      className="flex items-start gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-all duration-200 border border-gray-100"
      onClick={handleClick}
    >
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 mt-0.5 flex-shrink-0 ${
        goal.completed 
          ? 'bg-green-500 border-green-500' 
          : 'border-gray-300 hover:border-green-400'
      }`}>
        {goal.completed && (
          <Check size={12} className="text-white" />
        )}
      </div>
      <p className={`text-sm ${goal.completed ? 'line-through text-gray-500' : 'text-gray-700'} transition-all duration-200`}>
        {goal.goal}
      </p>
    </div>
  );
});

// Category Dashboard Card
const CategoryCard = memo(({ 
  category, 
  goals, 
  isEnabled, 
  onToggleCategory, 
  onGoalToggle,
  onAddGoal,
  loading 
}: { 
  category: keyof typeof categoryConfig;
  goals: Goal[];
  isEnabled: boolean;
  onToggleCategory: (category: string, enabled: boolean) => void;
  onGoalToggle: (goalId: string, completed: boolean) => void;
  onAddGoal: (category: string) => void;
  loading: boolean;
}) => {
  const config = categoryConfig[category];
  const completedCount = goals.filter(g => g.completed).length;
  const totalCount = goals.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className={`${config.bgColor} rounded-2xl p-6 border-2 ${config.borderColor} shadow-sm hover:shadow-md transition-all duration-300 h-full`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{config.icon}</div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{config.title}</h3>
            <p className="text-sm text-gray-600">{config.description}</p>
          </div>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={(checked) => onToggleCategory(category, checked)}
        />
      </div>

      {!isEnabled ? (
        <div className="text-center py-8 opacity-50">
          <p className="text-gray-500">Category disabled</p>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Progress</span>
              <span className={`text-lg font-bold bg-gradient-to-r ${config.color} bg-clip-text text-transparent`}>
                {progress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`bg-gradient-to-r ${config.color} h-2 rounded-full transition-all duration-500`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Goals List */}
          <div className="space-y-2 mb-4 min-h-[200px] max-h-[300px] overflow-y-auto">
            {loading ? (
              // Loading skeletons
              [1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg animate-pulse">
                  <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 h-4 bg-gray-200 rounded"></div>
                </div>
              ))
            ) : goals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2 opacity-50">{config.icon}</div>
                <p className="text-sm mb-3">No goals yet</p>
                <Button 
                  onClick={() => onAddGoal(category)}
                  size="sm"
                  className={`bg-gradient-to-r ${config.color} text-white hover:opacity-90`}
                >
                  <Plus size={16} className="mr-2" />
                  Generate Goals
                </Button>
              </div>
            ) : (
              goals.map((goal) => (
                <DashboardGoalItem
                  key={goal.id}
                  goal={goal}
                  onToggle={onGoalToggle}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {goals.length > 0 && (
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <span className="text-xs text-gray-500">
                {completedCount} of {totalCount} completed
              </span>
              <Button 
                onClick={() => onAddGoal(category)}
                variant="ghost" 
                size="sm"
                className="text-gray-600 hover:text-gray-900 h-8"
              >
                <Plus size={14} className="mr-1" />
                New Goal
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
});

// Settings Modal Component
const SettingsModal = ({ 
  settings, 
  onUpdateSettings 
}: { 
  settings: Record<string, boolean>;
  onUpdateSettings: (settings: Record<string, boolean>) => void;
}) => {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    onUpdateSettings(localSettings);
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Category Settings</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        {Object.entries(categoryConfig).map(([key, config]) => (
          <div key={key} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{config.icon}</div>
              <div>
                <p className="font-medium">{config.title}</p>
                <p className="text-sm text-gray-600">{config.description}</p>
              </div>
            </div>
            <Switch
              checked={localSettings[key] || false}
              onCheckedChange={(checked) => 
                setLocalSettings(prev => ({ ...prev, [key]: checked }))
              }
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </DialogContent>
  );
};

const TodaysWellness = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State management
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [categorySettings, setCategorySettings] = useState(getCategorySettings());
  const [userId, setUserId] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  // Initialize user session and profile
  useEffect(() => {
    const initSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/login');
          return;
        }
      setUser(session.user);
      setUserId(session.user.id);
      
      // Fetch user profile
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!error && data) {
          setProfile(data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    initSession();
  }, [navigate]);

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

  // Load all goals
  const loadGoals = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      
      const allGoals = await fetchTodaysGoals(userId);
      setGoals(allGoals);
      
      if (allGoals.length === 0 && initialLoad) {
        console.log('🚀 Creating initial goals with AI...');
        const newGoals = await createInitialGoalsForAllCategories(userId, categorySettings);
        setGoals(newGoals);
        setInitialLoad(false);
        
        if (newGoals.length > 0) {
          toast({
            title: 'Welcome! 🌟',
            description: 'Your personalized wellness dashboard is ready!',
          });
        }
      }
      else if (allGoals.length > 0 && allGoals.some(goal => 
        goal.goal.includes('Complete a') && goal.goal.includes('activity today')
      )) {
        toast({
          title: 'Outdated Goals Detected 🔄',
          description: 'Use the refresh button to get personalized AI goals.',
          duration: 8000,
        });
      }
    } catch (error) {
      console.error('Error loading goals:', error);
      toast({
        title: 'Error loading goals',
        description: 'Could not load your goals. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [userId, categorySettings, initialLoad, toast]);

  // Load goals when user is ready
  useEffect(() => {
    if (userId) {
      loadGoals();
    }
  }, [userId, loadGoals]);

  // Handle goal completion
  const handleGoalToggle = useCallback(async (goalId: string, completed: boolean) => {
    if (!userId) return;

    try {
      setGoals(prev => prev.map(goal => 
        goal.id === goalId ? { ...goal, completed: !completed } : goal
      ));

      await toggleGoalCompletionWithRefill(goalId, !completed);

      if (!completed) {
        toast({
          title: 'Goal completed! 🎉',
          description: 'Great job on your wellness journey!',
        });
      }

    } catch (error) {
      console.error('Error toggling goal:', error);
      setGoals(prev => prev.map(goal => 
        goal.id === goalId ? { ...goal, completed: completed } : goal
      ));
      toast({
        title: 'Error updating goal',
        description: 'Please try again.',
        variant: 'destructive'
      });
    }
  }, [userId, toast]);

  // Handle category toggle
  const handleCategoryToggle = useCallback((category: string, enabled: boolean) => {
    const newSettings = { ...categorySettings, [category]: enabled };
    setCategorySettings(newSettings);
    updateCategorySettings(newSettings);
  }, [categorySettings]);

  // Handle adding new goal
  const handleAddGoal = useCallback(async (category: string) => {
    if (!userId) return;

    try {
      const newGoal = await addNewGoalForCategory(userId, category as 'nourish' | 'center' | 'play');
      if (newGoal) {
        setGoals(prev => [...prev, newGoal]);
        toast({
          title: 'New goal added! ✨',
          description: `Fresh ${category} goal generated for you.`,
        });
      }
    } catch (error) {
      console.error('Error adding goal:', error);
      toast({
        title: 'Error adding goal',
        description: 'Please try again.',
        variant: 'destructive'
      });
    }
  }, [userId, toast]);

  // Clear and regenerate all goals
  const clearAndRegenerateGoals = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('daily_goals')
        .delete()
        .eq('user_id', userId)
        .eq('date', today);
      
      if (error) throw error;
      
      const newGoals = await createInitialGoalsForAllCategories(userId, categorySettings);
      setGoals(newGoals);
        
        toast({
        title: 'Dashboard Refreshed! ✨',
        description: 'Your new personalized goals are ready!',
        });
      
    } catch (error) {
      console.error('Error regenerating goals:', error);
      toast({
        title: 'Error refreshing dashboard',
        description: 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [userId, categorySettings, toast]);

  // Calculate progress and categorize goals
  const { overallProgress, categoryGoals } = useMemo(() => {
    const completed = goals.filter(g => g.completed).length;
    const total = goals.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const categoryBreakdown: Record<string, Goal[]> = {
      nourish: [],
      center: [],
      play: []
    };
    
    goals.forEach(goal => {
      const category = normalizeCategory(goal.category);
      if (categoryBreakdown[category]) {
        categoryBreakdown[category].push(goal);
      }
    });
    
    return { overallProgress: progress, categoryGoals: categoryBreakdown };
  }, [goals]);

  // Show loading screen
  if (loading && goals.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">😊</div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your wellness dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ 
        backgroundImage: "url('/lovable-uploads/14905dcb-7154-41d0-92c2-f134f2aa1117.png')" 
      }}
    >
      {/* Header with Navigation */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200 py-4 sticky top-0 z-50">
        <div className="w-full flex justify-between items-center px-4">
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
                <DropdownMenuItem onClick={() => navigate('/todays-wellness')}>
                  Today's Wellness
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
      <div className="bg-white/60 backdrop-blur-sm py-4 border-b border-white/20">
        <div className="w-full px-4">
          <div className="flex items-center text-sm">
            <Link to="/welcome" className="text-[#92D9A9] hover:text-[#7bc492]">Dashboard</Link>
            <span className="mx-2 text-gray-400">&gt;</span>
            <span className="text-gray-600">Today's Wellness</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        <div className="w-full py-8 px-6">
          
          {/* Top Header Bar: Title Left + Controls Right */}
          <div className="flex justify-between items-start mb-6">
            
            {/* Left: Title */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Your Wellness Dashboard
              </h1>
              <p className="text-gray-600">Track your menopause wellness journey</p>
            </div>
            
            {/* Right: Compact Controls */}
            <div className="flex gap-3 items-center">
              
              {/* Progress */}
              <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-white/20 text-center">
                <div className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {overallProgress}%
                </div>
                <div className="w-16 bg-gray-200 rounded-full h-1 mx-auto mb-1">
                  <div 
                    className="bg-gradient-to-r from-purple-600 to-pink-600 h-1 rounded-full transition-all duration-500"
                    style={{ width: `${overallProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600">{goals.filter(g => g.completed).length}/{goals.length}</p>
              </div>
              
              {/* Fresh Goals */}
              <Button 
                onClick={clearAndRegenerateGoals}
                disabled={loading}
                size="sm"
                className="text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <RefreshCw size={14} className="mr-1" />
                Fresh Goals
              </Button>
              
              {/* Settings */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-gray-600 border-gray-300 hover:bg-gray-50 bg-white/90">
                    <Settings size={14} className="mr-1" />
                    Settings
                  </Button>
                </DialogTrigger>
                <SettingsModal 
                  settings={categorySettings}
                  onUpdateSettings={(settings) => {
                    setCategorySettings(settings);
                    updateCategorySettings(settings);
                  }}
                />
              </Dialog>
              
              {/* Helper Tips */}
              <div className="bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm border border-white/20">
                <p className="text-xs text-gray-600 text-center">
                  💡 Click ✓ to complete, + for new goals
                </p>
              </div>
              
            </div>
          </div>

          {/* Main Layout: Dashboard Cards */}
          <div className="flex gap-4">
            
            {/* Wellness Dashboard Cards */}
            <div className="flex-1">
              {/* Dashboard Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {Object.entries(categoryConfig).map(([category, config]) => (
                  <CategoryCard
                    key={category}
                    category={category as keyof typeof categoryConfig}
                    goals={categoryGoals[category] || []}
                    isEnabled={categorySettings[category] || false}
                    onToggleCategory={handleCategoryToggle}
                    onGoalToggle={handleGoalToggle}
                    onAddGoal={handleAddGoal}
                    loading={false}
                  />
                ))}
              </div>
            </div>
            
          </div>
        </div>
      </main>
      
      <Toaster />
    </div>
  );
};

export default TodaysWellness;
