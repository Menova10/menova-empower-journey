import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, Calendar, ChartBar, PlusCircle, BarChart2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useVapi } from '@/contexts/VapiContext';
import VapiAssistant from '@/components/VapiAssistant';
import AuthBackground from '@/components/AuthBackground';

// Import types
import { 
  Goal, 
  SuggestedGoal, 
  CategoryProgress,
  WeeklyProgress,
  MonthlyProgress,
  categories,
  motivationalMessages
} from '@/types/wellness';

// Import components
import { TodayProgressSection } from '@/components/wellness/TodayProgressSection';
import { AddGoalSection } from '@/components/wellness/AddGoalSection';
import { SuggestedGoalsSection } from '@/components/wellness/SuggestedGoalsSection';
import { TodaysGoalsSection } from '@/components/wellness/TodaysGoalsSection';
import { WeeklyProgressView } from '@/components/wellness/WeeklyProgressView';
import { MonthlyProgressView } from '@/components/wellness/MonthlyProgressView';
import { GoalCompletionModal } from '@/components/wellness/GoalCompletionModal';

// Import services
import { 
  fetchTodaysGoals,
  checkAndCreateDefaultGoals,
  fetchWellnessGoalsProgress,
  fetchWeeklyGoals,
  fetchMonthlyGoals,
  fetchSuggestedGoals,
  addNewGoal as serviceAddNewGoal,
  toggleGoalCompletion as serviceToggleGoalCompletion,
  updateWellnessGoals,
  normalizeCategory
} from '@/services/wellnessService';

// Helper functions
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  startOfMonth, 
  endOfMonth, 
  differenceInDays 
} from 'date-fns';

const TodaysWellness = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('nourish');
  const [loading, setLoading] = useState(true);
  const [suggestedGoals, setSuggestedGoals] = useState<SuggestedGoal[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [completedGoal, setCompletedGoal] = useState<Goal | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Used to trigger animation
  const { speak } = useVapi();
  const vapiAssistantRef = React.useRef<any>(null);
  const [categoryCounts, setCategoryCounts] = useState<CategoryProgress>({});
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress>({});
  const [monthlyProgress, setMonthlyProgress] = useState<MonthlyProgress>({});
  const [activeTab, setActiveTab] = useState("daily");
  const [weeklyGoals, setWeeklyGoals] = useState<Goal[]>([]);
  const [monthlyGoals, setMonthlyGoals] = useState<Goal[]>([]);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [mainViewTab, setMainViewTab] = useState("progress"); // New state for main view tabs
  
  // Use a ref to prevent scrolling issues
  const contentRef = useRef<HTMLDivElement>(null);

  // Calculate progress with useMemo to prevent unnecessary recalculations
  const { completedGoals, totalGoals, progress } = useMemo(() => {
    const completed = goals.filter(g => g.completed).length;
    const total = goals.length;
    const prog = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completedGoals: completed, totalGoals: total, progress: prog };
  }, [goals]);

  // Calculate and update category progress - using a more stable implementation
  const calculateCategoryProgress = useCallback(() => {
    const catCounts: CategoryProgress = {};
    
    // Initialize categories
    categories.forEach(cat => {
      catCounts[cat.value] = {
        completed: 0,
        total: 0,
        percentage: 0
      };
    });
    
    // Calculate progress for each category
    goals.forEach(goal => {
      const category = normalizeCategory(goal.category);
      if (category in catCounts) {
        catCounts[category].total += 1;
        if (goal.completed) {
          catCounts[category].completed += 1;
        }
      }
    });
    
    // Calculate percentages
    Object.keys(catCounts).forEach(cat => {
      const { completed, total } = catCounts[cat];
      catCounts[cat].percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    });
    
    return catCounts;
  }, [goals]);

  // Memoize category counts to prevent unnecessary re-renders
  const updateCategoryCounts = useCallback(() => {
    const newCounts = calculateCategoryProgress();
    setCategoryCounts(newCounts);
    return newCounts;
  }, [calculateCategoryProgress]);

  // Fetch user's goals for today
  const fetchGoals = useCallback(async () => {
    if (!initialLoadComplete) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/login');
          return;
        }

        // Fetch today's goals
        const fetchedGoals = await fetchTodaysGoals(session.user.id);
        setGoals(fetchedGoals);
        
        // If we have no goals for today, check if we have wellness goals in the database
        // and create some default goals based on that
        if (fetchedGoals.length === 0) {
          const defaultGoals = await checkAndCreateDefaultGoals(session.user.id);
          if (defaultGoals.length > 0) {
            setGoals(defaultGoals);
            toast({
              title: 'Daily goals created',
              description: 'We\'ve created some default goals based on your wellness plan.',
            });
          }
        }

        // Also fetch weekly and monthly data when switching tabs
        if (activeTab === 'weekly' || activeTab === 'all') {
          const weeklyData = await fetchWeeklyGoals(session.user.id);
          setWeeklyGoals(weeklyData);
          processWeeklyData(weeklyData);
        }

        if (activeTab === 'monthly' || activeTab === 'all') {
          const monthlyData = await fetchMonthlyGoals(session.user.id);
          setMonthlyGoals(monthlyData);
          processMonthlyData(monthlyData);
        }
        
        // Check for existing progress in wellness_goals table
        const progress = await fetchWellnessGoalsProgress(session.user.id);
        if (progress) {
          setCategoryCounts(progress);
        } else {
          // Fallback to calculation from goals
          updateCategoryCounts();
        }
        
      } catch (error) {
        console.error('Error fetching goals:', error);
        toast({
          title: 'Error fetching goals',
          description: 'Could not retrieve your goals. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
        setInitialLoadComplete(true);
      }
    } else {
      // For subsequent fetches, especially when tabs change
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/login');
          return;
        }

        // Only fetch data for the active tab to reduce unnecessary API calls
        if (activeTab === 'weekly') {
          const weeklyData = await fetchWeeklyGoals(session.user.id);
          setWeeklyGoals(weeklyData);
          processWeeklyData(weeklyData);
        } else if (activeTab === 'monthly') {
          const monthlyData = await fetchMonthlyGoals(session.user.id);
          setMonthlyGoals(monthlyData);
          processMonthlyData(monthlyData);
        }
      } catch (error) {
        console.error('Error fetching tab data:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [navigate, toast, activeTab, updateCategoryCounts, initialLoadComplete]);

  // Process weekly data to calculate progress - keep logic the same but memoize better
  const processWeeklyData = useCallback((weeklyData: Goal[]) => {
    const weekProgress: WeeklyProgress = {};
    const daysOfWeek = [];
    let currentDay = startOfWeek(new Date());
    const endDay = endOfWeek(new Date());
    
    while (currentDay <= endDay) {
      const dayStr = format(currentDay, 'yyyy-MM-dd');
      daysOfWeek.push(dayStr);
      
      weekProgress[dayStr] = {};
      
      // Initialize categories for this day
      categories.forEach(cat => {
        weekProgress[dayStr][cat.value] = {
          completed: 0,
          total: 0,
          percentage: 0
        };
      });
      
      currentDay = addDays(currentDay, 1);
    }
    
    // Populate with data
    weeklyData.forEach(goal => {
      const day = goal.date;
      const category = normalizeCategory(goal.category);
      
      if (day in weekProgress && category in weekProgress[day]) {
        weekProgress[day][category].total += 1;
        if (goal.completed) {
          weekProgress[day][category].completed += 1;
        }
      }
    });
    
    // Calculate percentages
    Object.keys(weekProgress).forEach(day => {
      Object.keys(weekProgress[day]).forEach(cat => {
        const { completed, total } = weekProgress[day][cat];
        weekProgress[day][cat].percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      });
    });
    
    setWeeklyProgress(weekProgress);
  }, []);

  // Process monthly data to calculate progress - keep logic the same but memoize better
  const processMonthlyData = useCallback((monthlyData: Goal[]) => {
    const monthProgress: MonthlyProgress = {};
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    const totalDays = differenceInDays(end, start) + 1;
    const totalWeeks = Math.ceil(totalDays / 7);
    
    // Initialize weeks
    for (let i = 0; i < totalWeeks; i++) {
      const weekLabel = `Week ${i + 1}`;
      monthProgress[weekLabel] = {};
      
      // Initialize categories for this week
      categories.forEach(cat => {
        monthProgress[weekLabel][cat.value] = {
          completed: 0,
          total: 0,
          percentage: 0
        };
      });
    }
    
    // Populate with data
    monthlyData.forEach(goal => {
      const goalDate = new Date(goal.date);
      const dayOfMonth = goalDate.getDate();
      const weekNum = Math.floor((dayOfMonth - 1) / 7);
      const weekLabel = `Week ${weekNum + 1}`;
      const category = normalizeCategory(goal.category);
      
      if (weekLabel in monthProgress && category in monthProgress[weekLabel]) {
        monthProgress[weekLabel][category].total += 1;
        if (goal.completed) {
          monthProgress[weekLabel][category].completed += 1;
        }
      }
    });
    
    // Calculate percentages
    Object.keys(monthProgress).forEach(week => {
      Object.keys(monthProgress[week]).forEach(cat => {
        const { completed, total } = monthProgress[week][cat];
        monthProgress[week][cat].percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      });
    });
    
    setMonthlyProgress(monthProgress);
  }, []);

  // Add a new goal
  const addGoal = async () => {
    if (!newGoal.trim()) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      
      const newGoalData = await serviceAddNewGoal(session.user.id, newGoal, selectedCategory);
      
      if (newGoalData) {
        setGoals(prevGoals => [...prevGoals, newGoalData]);
        setNewGoal('');
        speak(`Added new goal: ${newGoal}`);
        toast({
          title: 'Goal added',
          description: 'Your wellness goal has been added for today.',
        });
        
        // Update category progress and sync with wellness_goals table
        const newCategoryCounts = updateCategoryCounts();
        await updateWellnessGoals(session.user.id, newCategoryCounts);
      }
    } catch (error) {
      console.error('Error adding goal:', error);
      toast({
        title: 'Error adding goal',
        description: 'Could not add your goal. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Add a suggested goal
  const addSuggestedGoal = async (goal: SuggestedGoal) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      
      // Check for duplicates before adding
      const existingGoal = goals.find(g => g.goal.toLowerCase() === goal.text.toLowerCase());
      if (existingGoal) {
        toast({
          title: 'Goal already exists',
          description: 'This goal has already been added to your daily goals.',
          variant: 'destructive',
        });
        return;
      }
      
      const newGoalData = await serviceAddNewGoal(session.user.id, goal.text, goal.category);
      
      if (newGoalData) {
        setGoals(prevGoals => [...prevGoals, newGoalData]);
        speak(`Added suggested goal: ${goal.text}`);
        toast({
          title: 'Suggested goal added',
          description: 'The suggested goal has been added to your daily goals.',
        });
        
        // Remove from suggestions
        setSuggestedGoals(suggestedGoals.filter(g => g.text !== goal.text));
        
        // Update category progress and sync with wellness_goals table
        const newCategoryCounts = updateCategoryCounts();
        await updateWellnessGoals(session.user.id, newCategoryCounts);
      }
    } catch (error) {
      console.error('Error adding suggested goal:', error);
      toast({
        title: 'Error adding goal',
        description: 'Could not add the suggested goal. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Toggle goal completion status
  const toggleGoalCompletion = async (goalId: string, currentStatus: boolean) => {
    if (currentStatus === true) return; // Only allow completing goals, not uncompleting
    
    try {
      const goalToUpdate = goals.find(g => g.id === goalId);
      if (!goalToUpdate) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      
      await serviceToggleGoalCompletion(goalId, currentStatus);
      
      // Update local state
      setGoals(prevGoals => 
        prevGoals.map(g => 
          g.id === goalId ? { ...g, completed: !currentStatus } : g
        )
      );
      
      // Update category progress and sync with wellness_goals table
      const newCategoryCounts = updateCategoryCounts();
      await updateWellnessGoals(session.user.id, newCategoryCounts);
      
      // If this is a newly completed goal, show the celebration
      if (!currentStatus) {
        setCompletedGoal(goalToUpdate);
        speak(`Great job completing your goal: ${goalToUpdate.goal}`);
        
        toast({
          title: 'Goal completed!',
          description: 'Great job on completing your goal!',
        });
      }
    } catch (error) {
      console.error('Error updating goal:', error);
      toast({
        title: 'Error updating goal',
        description: 'Could not update your goal. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Refresh suggested goals
  const refreshSuggestions = () => {
    fetchSuggestedGoalsHandler();
    setRefreshKey(prevKey => prevKey + 1);
  };

  // Fetch suggested goals with fallback mechanism for API errors
  const fetchSuggestedGoalsHandler = async () => {
    try {
      setLoadingSuggestions(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      try {
        const suggestions = await fetchSuggestedGoals(session.user.id);
        setSuggestedGoals(suggestions);
      } catch (error) {
        console.error('Error fetching suggested goals:', error);
        // Use fallback suggestions if API fails
        setSuggestedGoals([
          { text: "Drink 8 glasses of water today", category: "nourish" },
          { text: "Take a 15-minute walk outside", category: "play" },
          { text: "Practice deep breathing for 5 minutes", category: "center" },
          { text: "Write down 3 things you're grateful for", category: "center" },
          { text: "Eat a meal rich in calcium and vitamin D", category: "nourish" }
        ]);
      }
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Handle tab change - optimized to prevent unnecessary renders
  const handleTabChange = useCallback((value: string) => {
    if (value !== activeTab) {
      setActiveTab(value);
    }
  }, [activeTab]);

  // Handle main view tab change
  const handleMainViewTabChange = useCallback((value: string) => {
    if (value !== mainViewTab) {
      setMainViewTab(value);
    }
  }, [mainViewTab]);

  // Force refresh wellness goals from the database
  const forceRefreshWellnessGoals = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      // Recalculate based on today's goals
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('date', today);
      
      if (error) throw error;
      
      if (data) {
        setGoals(data);
        
        // Calculate progress for each category using the memoized function
        const catCounts = calculateCategoryProgress();
        setCategoryCounts(catCounts);
        
        // Update the database with our calculated values
        await updateWellnessGoals(session.user.id, catCounts);
        
        toast({
          title: 'Progress updated',
          description: 'Your wellness progress has been refreshed.',
        });
      }
    } catch (error) {
      console.error('Error refreshing wellness goals:', error);
      toast({
        title: 'Error refreshing progress',
        description: 'Could not refresh your progress. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Open the chat assistant
  const openAssistant = () => {
    if (vapiAssistantRef.current) {
      vapiAssistantRef.current.open();
    }
  };

  // Stabilize contentRef position after renders
  useEffect(() => {
    const savedPosition = contentRef.current?.scrollTop || 0;
    
    // Restore scroll position after render
    return () => {
      if (contentRef.current) {
        contentRef.current.scrollTop = savedPosition;
      }
    };
  }, [goals, activeTab]);

  // Initial data loading - with optimizations to prevent flickering
  useEffect(() => {
    const fetchInitialData = async () => {
      await fetchGoals();
      await fetchSuggestedGoalsHandler();
    };

    fetchInitialData();
  }, [fetchGoals]);

  // Only update category progress when goals change - with debounce
  useEffect(() => {
    if (initialLoadComplete) {
      const newCategoryCounts = updateCategoryCounts();
      
      // Sync with database whenever goals change
      const syncWellnessGoals = async () => {
        if (goals.length > 0) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await updateWellnessGoals(session.user.id, newCategoryCounts);
          }
        }
      };
      
      syncWellnessGoals();
    }
  }, [goals, updateCategoryCounts, initialLoadComplete]);

  // Effect for fetching data when tab changes
  useEffect(() => {
    if (initialLoadComplete) {
      fetchGoals();
    }
  }, [activeTab, fetchGoals, initialLoadComplete]);

  return (
    <AuthBackground>
      <div className="max-w-4xl mx-auto py-6 bg-white/70 backdrop-blur-sm rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-menova-text text-center mb-2">Wellness Progress</h1>
        <p className="text-center text-gray-600 mb-6">Track your wellness journey</p>
        
        {/* Main View Tabs */}
        <Tabs defaultValue="progress" value={mainViewTab} onValueChange={handleMainViewTabChange} className="w-full mb-6">
          <TabsList className="grid grid-cols-2 mb-6 bg-white/80">
            <TabsTrigger value="progress" className="flex items-center gap-2 data-[state=active]:bg-menova-green/10 data-[state=active]:text-menova-green">
              <BarChart2 size={16} />
              <span>Progress</span>
            </TabsTrigger>
            <TabsTrigger value="add-goal" className="flex items-center gap-2 data-[state=active]:bg-menova-green/10 data-[state=active]:text-menova-green">
              <PlusCircle size={16} />
              <span>Add Goal</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Progress View */}
          <TabsContent value="progress" className="space-y-6">
            {/* Period Tabs */}
            <Tabs defaultValue="daily" value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid grid-cols-3 mb-6 bg-white/80">
                <TabsTrigger value="daily" className="flex items-center gap-2 data-[state=active]:bg-menova-green/10 data-[state=active]:text-menova-green">
                  <CalendarDays size={16} />
                  <span>Daily</span>
                </TabsTrigger>
                <TabsTrigger value="weekly" className="flex items-center gap-2 data-[state=active]:bg-menova-green/10 data-[state=active]:text-menova-green">
                  <Calendar size={16} />
                  <span>Weekly</span>
                </TabsTrigger>
                <TabsTrigger value="monthly" className="flex items-center gap-2 data-[state=active]:bg-menova-green/10 data-[state=active]:text-menova-green">
                  <ChartBar size={16} />
                  <span>Monthly</span>
                </TabsTrigger>
              </TabsList>
              
              {/* Daily View */}
              <TabsContent value="daily" className="space-y-6">
                <TodayProgressSection 
                  progress={progress}
                  completedGoals={completedGoals}
                  totalGoals={totalGoals}
                  categoryCounts={categoryCounts}
                  forceRefreshWellnessGoals={forceRefreshWellnessGoals}
                  loading={loading}
                />
                
                <TodaysGoalsSection
                  goals={goals}
                  loading={loading}
                  toggleGoalCompletion={toggleGoalCompletion}
                />
              </TabsContent>
              
              {/* Weekly View */}
              <TabsContent value="weekly">
                <WeeklyProgressView
                  loading={loading}
                  weeklyProgress={weeklyProgress}
                  weeklyGoals={weeklyGoals}
                />
              </TabsContent>
              
              {/* Monthly View */}
              <TabsContent value="monthly">
                <MonthlyProgressView
                  loading={loading}
                  monthlyProgress={monthlyProgress}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>
          
          {/* Add Goal View */}
          <TabsContent value="add-goal" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AddGoalSection
                newGoal={newGoal}
                setNewGoal={setNewGoal}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                addGoal={addGoal}
              />
              
              <SuggestedGoalsSection
                suggestedGoals={suggestedGoals}
                loadingSuggestions={loadingSuggestions}
                refreshKey={refreshKey}
                refreshSuggestions={refreshSuggestions}
                addSuggestedGoal={addSuggestedGoal}
              />
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Goal completion modal */}
        <GoalCompletionModal
          completedGoal={completedGoal}
          setCompletedGoal={setCompletedGoal}
          openAssistant={openAssistant}
        />
      </div>
      
      <VapiAssistant ref={vapiAssistantRef} />
      <Toaster />
    </AuthBackground>
  );
};

export default TodaysWellness;
