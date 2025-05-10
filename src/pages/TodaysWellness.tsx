import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Plus, RefreshCw, Apple, Brain, ActivitySquare, CalendarDays, CalendarWeek, ChartBar } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useVapi } from '@/contexts/VapiContext';
import VapiAssistant from '@/components/VapiAssistant';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

interface Goal {
  id: string;
  goal: string;
  completed: boolean;
  category: string;
  date?: string;
}

interface CategoryProgress {
  [key: string]: {
    completed: number;
    total: number;
    percentage: number;
  };
}

interface WeeklyProgress {
  [key: string]: {
    [category: string]: {
      completed: number;
      total: number;
      percentage: number;
    };
  };
}

interface MonthlyProgress {
  [key: string]: {
    [category: string]: {
      completed: number;
      total: number;
      percentage: number;
    };
  };
}

const motivationalMessages = [
  "Amazing job! You're taking great care of yourself.",
  "Fantastic work! Keep nurturing your wellbeing.",
  "Well done! Every step matters on your wellness journey.",
  "Great achievement! You're making wonderful progress.",
  "Excellent! Your dedication to self-care is inspiring."
];

// Improved categories with icons and colors
const categories = [
  { value: 'nourish', label: 'Nourish', icon: Apple, color: 'bg-orange-200 text-orange-700' },
  { value: 'center', label: 'Center', icon: Brain, color: 'bg-teal-200 text-teal-700' },
  { value: 'play', label: 'Play', icon: ActivitySquare, color: 'bg-red-200 text-red-700' },
  { value: 'general', label: 'General', icon: Plus, color: 'bg-gray-200 text-gray-700' },
];

// Helper function to normalize category names for consistency
const normalizeCategory = (category: string): string => {
  // Convert to lowercase for consistency
  const lowerCategory = category.toLowerCase();
  
  // Map 'centre' to 'center' for consistency
  if (lowerCategory === 'centre') return 'center';
  
  return lowerCategory;
};

const TodaysWellness = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('nourish');
  const [loading, setLoading] = useState(true);
  const [suggestedGoals, setSuggestedGoals] = useState<string[]>([]);
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

  // Calculate progress
  const completedGoals = goals.filter(g => g.completed).length;
  const totalGoals = goals.length;
  const progress = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  // Calculate and update category progress
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
    
    setCategoryCounts(catCounts);
    return catCounts;
  }, [goals]);

  // Fetch user's goals for today
  const fetchGoals = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const { data, error } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('date', today)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Set goals and calculate category progress
      const fetchedGoals = data || [];
      setGoals(fetchedGoals);
      
      // If we have no goals for today, check if we have wellness goals in the database
      // and create some default goals based on that
      if (fetchedGoals.length === 0) {
        await checkAndCreateDefaultGoals(session.user.id);
      }

      // Also fetch weekly and monthly data when switching tabs
      if (activeTab === 'weekly' || activeTab === 'all') {
        await fetchWeeklyGoals(session.user.id);
      }

      if (activeTab === 'monthly' || activeTab === 'all') {
        await fetchMonthlyGoals(session.user.id);
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
    }
  }, [navigate, toast, activeTab]);

  // Fetch weekly goals
  const fetchWeeklyGoals = async (userId: string) => {
    try {
      setLoading(true);
      const startDate = format(startOfWeek(new Date()), 'yyyy-MM-dd');
      const endDate = format(endOfWeek(new Date()), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;
      
      if (data) {
        setWeeklyGoals(data);
        
        // Process the weekly data
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
        data.forEach(goal => {
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
      }
    } catch (error) {
      console.error('Error fetching weekly goals:', error);
      toast({
        title: 'Error fetching weekly data',
        description: 'Could not retrieve your weekly progress. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch monthly goals
  const fetchMonthlyGoals = async (userId: string) => {
    try {
      setLoading(true);
      const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;
      
      if (data) {
        setMonthlyGoals(data);
        
        // Process the monthly data by week
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
        data.forEach(goal => {
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
      }
    } catch (error) {
      console.error('Error fetching monthly goals:', error);
      toast({
        title: 'Error fetching monthly data',
        description: 'Could not retrieve your monthly progress. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Check for wellness goals and create default goals if needed
  const checkAndCreateDefaultGoals = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('wellness_goals')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // If we have wellness goals data, create some default goals based on that
      if (data && data.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const defaultGoals = [];
        
        for (const wellnessGoal of data) {
          // Create default goals for each category that has a wellness goal
          if (wellnessGoal.total > 0) {
            const goalText = `Complete a ${wellnessGoal.category} activity today`;
            defaultGoals.push({
              user_id: userId,
              goal: goalText,
              category: wellnessGoal.category,
              date: today,
              completed: false
            });
          }
        }
        
        if (defaultGoals.length > 0) {
          const { data: newGoals, error: insertError } = await supabase
            .from('daily_goals')
            .insert(defaultGoals)
            .select();
          
          if (insertError) throw insertError;
          
          if (newGoals) {
            setGoals(newGoals);
            toast({
              title: 'Daily goals created',
              description: 'We\'ve created some default goals based on your wellness plan.',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking wellness goals:', error);
    }
  };

  // Fetch suggested goals from our edge function
  const fetchSuggestedGoals = useCallback(async () => {
    try {
      setLoadingSuggestions(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('suggest-wellness-goals', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      
      if (data?.suggestions && Array.isArray(data.suggestions)) {
        setSuggestedGoals(data.suggestions);
      } else {
        console.error('Invalid suggestions format:', data);
        setSuggestedGoals([]);
      }
    } catch (error) {
      console.error('Error fetching suggested goals:', error);
      setSuggestedGoals([
        "Drink 8 glasses of water today",
        "Take a 15-minute walk outside",
        "Practice deep breathing for 5 minutes",
        "Write down 3 things you're grateful for",
        "Eat a meal rich in calcium and vitamin D"
      ]);
    } finally {
      setLoadingSuggestions(false);
    }
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
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_goals')
        .insert({
          user_id: session.user.id,
          goal: newGoal,
          date: today,
          category: selectedCategory
        })
        .select();
      
      if (error) throw error;
      
      if (data) {
        const updatedGoals = [...goals, data[0]];
        setGoals(updatedGoals);
        setNewGoal('');
        speak(`Added new goal: ${newGoal}`);
        toast({
          title: 'Goal added',
          description: 'Your wellness goal has been added for today.',
        });
        
        // Update category progress and sync with wellness_goals table
        const newCategoryCounts = calculateCategoryProgress();
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
  const addSuggestedGoal = async (goal: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      // Determine the best category for this goal using keyword matching
      let category = 'nourish'; // Default category
      
      if (goal.toLowerCase().includes('water') || 
          goal.toLowerCase().includes('eat') || 
          goal.toLowerCase().includes('food') || 
          goal.toLowerCase().includes('nutrition')) {
        category = 'nourish';
      } else if (goal.toLowerCase().includes('meditat') || 
                 goal.toLowerCase().includes('breath') || 
                 goal.toLowerCase().includes('calm') || 
                 goal.toLowerCase().includes('relax')) {
        category = 'center';
      } else if (goal.toLowerCase().includes('walk') || 
                 goal.toLowerCase().includes('exercise') || 
                 goal.toLowerCase().includes('stretch') || 
                 goal.toLowerCase().includes('yoga')) {
        category = 'play';
      }
      
      const { data, error } = await supabase
        .from('daily_goals')
        .insert({
          user_id: session.user.id,
          goal: goal,
          date: today,
          category: category
        })
        .select();
      
      if (error) throw error;
      
      if (data) {
        const updatedGoals = [...goals, data[0]];
        setGoals(updatedGoals);
        speak(`Added suggested goal: ${goal}`);
        toast({
          title: 'Suggested goal added',
          description: 'The suggested goal has been added to your daily goals.',
        });
        
        // Remove from suggestions
        setSuggestedGoals(suggestedGoals.filter(g => g !== goal));
        
        // Update category progress and sync with wellness_goals table
        const newCategoryCounts = calculateCategoryProgress();
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

  // Update the wellness_goals table with the current category progress
  const updateWellnessGoals = async (userId: string, catCounts: CategoryProgress) => {
    try {
      console.log("Updating wellness goals with:", catCounts);
      
      // Only update the main categories: nourish, center, play
      for (const cat of categories.slice(0, 3)) {
        const catData = catCounts[cat.value];
        if (!catData) continue;
        
        console.log(`Updating ${cat.value}:`, catData);
        
        // First check if we have existing data
        const { data: existingData } = await supabase
          .from('wellness_goals')
          .select('*')
          .eq('user_id', userId)
          .eq('category', cat.value)
          .single();
        
        // If we have existing data, update it
        if (existingData) {
          const { error } = await supabase
            .from('wellness_goals')
            .update({
              completed: catData.completed,
              total: catData.total > 0 ? catData.total : 1 // Ensure we have at least 1 as total
            })
            .eq('id', existingData.id);
            
          if (error) {
            console.error(`Error updating progress for ${cat.value}:`, error);
            toast({
              title: `Error updating ${cat.value} progress`,
              description: error.message,
              variant: "destructive",
            });
          }
        } 
        // If we don't have existing data, insert it
        else {
          const { error } = await supabase
            .from('wellness_goals')
            .insert({
              user_id: userId,
              category: cat.value,
              completed: catData.completed,
              total: catData.total > 0 ? catData.total : 1 // Ensure we have at least 1 as total
            });
            
          if (error) {
            console.error(`Error inserting progress for ${cat.value}:`, error);
            toast({
              title: `Error creating ${cat.value} progress`,
              description: error.message,
              variant: "destructive",
            });
          }
        }
      }
    } catch (error) {
      console.error('Error updating wellness goals:', error);
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
      
      const { error } = await supabase
        .from('daily_goals')
        .update({ completed: !currentStatus })
        .eq('id', goalId);
      
      if (error) throw error;
      
      // Update local state
      const updatedGoals = goals.map(g => 
        g.id === goalId ? { ...g, completed: !currentStatus } : g
      );
      
      setGoals(updatedGoals);
      
      // Update category progress and sync with wellness_goals table
      const newCategoryCounts = calculateCategoryProgress();
      await updateWellnessGoals(session.user.id, newCategoryCounts);
      
      // If this is a newly completed goal, show the celebration
      if (!currentStatus) {
        setCompletedGoal(goalToUpdate);
        speak(`Great job completing your goal: ${goalToUpdate.goal}`);
        
        // Select a random motivational message
        const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
        toast({
          title: 'Goal completed!',
          description: randomMessage,
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
    fetchSuggestedGoals();
    setRefreshKey(prevKey => prevKey + 1);
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Initial data loading
  useEffect(() => {
    fetchGoals();
    fetchSuggestedGoals();
  }, [fetchGoals, fetchSuggestedGoals, activeTab]);

  // Calculate category progress whenever goals change
  useEffect(() => {
    const newCategoryCounts = calculateCategoryProgress();
    
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
  }, [goals, calculateCategoryProgress]);

  // Open the chat assistant
  const openAssistant = () => {
    if (vapiAssistantRef.current) {
      vapiAssistantRef.current.open();
    }
  };

  // Render a category badge
  const CategoryBadge = ({ category }: { category: string }) => {
    const categoryData = categories.find(c => c.value === category) || categories[3]; // Default to 'general'
    const Icon = categoryData.icon;
    
    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${categoryData.color}`}>
        <Icon size={12} />
        <span>{categoryData.label}</span>
      </div>
    );
  };

  // Format date for display
  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'EEE, MMM d');
  };

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
        
        // Calculate progress for each category
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
        data.forEach(goal => {
          const category = goal.category;
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-menova-beige to-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-menova-text text-center mb-2">Wellness Progress</h1>
        <p className="text-center text-gray-600 mb-8">Track your wellness journey</p>
        
        <Tabs defaultValue="daily" onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid grid-cols-3 mb-8">
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <CalendarDays size={16} />
              <span>Daily</span>
            </TabsTrigger>
            <TabsTrigger value="weekly" className="flex items-center gap-2">
              <CalendarWeek size={16} />
              <span>Weekly</span>
            </TabsTrigger>
            <TabsTrigger value="monthly" className="flex items-center gap-2">
              <ChartBar size={16} />
              <span>Monthly</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Daily View */}
          <TabsContent value="daily" className="space-y-8">
            {/* Progress Bar */}
            <div className="bg-white/90 rounded-lg shadow-sm p-6 mb-8 bg-gradient-to-br from-white to-green-50">
              <div className="flex justify-between mb-2">
                <h2 className="text-xl font-semibold text-menova-text">Today's Progress</h2>
                <span className="text-lg font-medium">{progress}%</span>
              </div>
              
              <Progress 
                value={progress} 
                className="h-4 bg-gray-100" 
              />
              
              <div className="mt-3 text-sm text-gray-600 text-center">
                {completedGoals} of {totalGoals} goals completed
              </div>

              {/* Category Progress */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {categories.slice(0, 3).map(category => {
                  const catData = categoryCounts[category.value] || { completed: 0, total: 0, percentage: 0 };
                  const Icon = category.icon;
                  
                  return (
                    <div key={category.value} className="flex flex-col items-center">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${category.color.replace('bg-', 'bg-opacity-20 bg-')}`}>
                        <Icon size={24} className={category.color.replace('bg-', 'text-').replace(' text-', '')} />
                      </div>
                      <div className="font-medium">{category.label}</div>
                      <div className="text-xs text-gray-600">
                        {catData.completed} of {catData.total || 0} ({catData.percentage}%)
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 flex justify-center">
                <Button 
                  onClick={forceRefreshWellnessGoals}
                  variant="outline"
                  className="border-menova-green text-menova-green hover:bg-menova-green/10 flex items-center gap-2"
                  disabled={loading}
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  Refresh Progress
                </Button>
              </div>
            </div>
            
            {/* Add New Goal */}
            <div className="bg-white/90 rounded-lg shadow-sm p-6 mb-8 bg-gradient-to-br from-white to-green-50">
              <h2 className="text-xl font-semibold text-menova-text mb-4">Add New Goal</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-1">
                    Goal Description
                  </label>
                  <input 
                    type="text" 
                    id="goal"
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    placeholder="Enter a new wellness goal"
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-menova-green/50"
                    onKeyDown={(e) => e.key === 'Enter' && addGoal()}
                  />
                </div>
                
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {categories.slice(0, 3).map(category => (
                      <button
                        key={category.value}
                        type="button"
                        onClick={() => setSelectedCategory(category.value)}
                        className={`p-3 rounded-md flex items-center justify-center gap-2 transition-all
                          ${selectedCategory === category.value 
                            ? `${category.color} border-2 border-${category.color.split(' ')[1].replace('text-', '')}` 
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                          }`}
                      >
                        <category.icon size={18} />
                        <span>{category.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <Button 
                  onClick={addGoal} 
                  disabled={!newGoal.trim()}
                  className="w-full bg-menova-green hover:bg-menova-green/90 text-white flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Add Goal
                </Button>
              </div>
            </div>
            
            {/* Suggested Goals */}
            <div className="bg-white/90 rounded-lg shadow-sm p-6 mb-8 bg-gradient-to-br from-white to-green-50">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-menova-text">Suggested Goals</h2>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={refreshSuggestions}
                  className="border-menova-green text-menova-green hover:bg-menova-green/10"
                >
                  <RefreshCw size={18} className={`${refreshKey > 0 ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              
              {loadingSuggestions ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse flex items-center p-3 rounded-md bg-gray-100">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="ml-auto h-8 w-8 bg-gray-200 rounded-full"></div>
                    </div>
                  ))}
                </div>
              ) : suggestedGoals.length > 0 ? (
                <ul className="space-y-2">
                  {suggestedGoals.map((goal, index) => (
                    <li 
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors animate-fade-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <span className="text-gray-700">{goal}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => addSuggestedGoal(goal)}
                        className="text-menova-green hover:bg-menova-green/10 rounded-full"
                      >
                        <Plus size={20} />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600 text-center py-4">No suggested goals available. Click refresh to generate new suggestions.</p>
              )}
            </div>
            
            {/* Today's Goals */}
            <div className="bg-white/90 rounded-lg shadow-sm p-6 bg-gradient-to-br from-white to-green-50">
              <h2 className="text-xl font-semibold text-menova-text mb-4">Today's Goals</h2>
              
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse flex items-center p-3 rounded-md bg-gray-100">
                      <div className="h-6 w-6 bg-gray-200 rounded-full mr-3"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : goals.length > 0 ? (
                <ul className="space-y-2">
                  {goals.map((goal, idx) => (
                    <li 
                      key={goal.id}
                      className={`flex items-center p-3 rounded-md transition-all ${
                        goal.completed 
                          ? 'bg-menova-green/10 text-menova-green' 
                          : 'bg-gray-50 hover:bg-gray-100'
                      } animate-fade-in`}
                      style={{ animationDelay: `${idx * 0.1}s` }}
                    >
                      <button
                        onClick={() => toggleGoalCompletion(goal.id, goal.completed)}
                        className={`w-6 h-6 rounded-full mr-3 flex items-center justify-center border ${
                          goal.completed 
                            ? 'bg-menova-green border-menova-green text-white' 
                            : 'border-gray-300 hover:border-menova-green'
                        }`}
                        disabled={goal.completed}
                      >
                        {goal.completed && <Check size={14} />}
                      </button>
                      <span 
                        className={`flex-1 ${
                          goal.completed ? 'line-through text-menova-green' : 'text-gray-700'
                        }`}
                      >
                        {goal.goal}
                      </span>
                      <CategoryBadge category={goal.category} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600 text-center py-4">No goals for today. Start by adding some goals above!</p>
              )}
            </div>
          </TabsContent>
          
          {/* Weekly View */}
          <TabsContent value="weekly">
            <div className="bg-white/90 rounded-lg shadow-sm p-6 bg-gradient-to-br from-white to-green-50">
              <h2 className="text-xl font-semibold text-menova-text mb-4">Weekly Progress</h2>
              <p className="text-sm text-gray-600 mb-4">
                {format(startOfWeek(new Date()), 'MMM d')} - {format(endOfWeek(new Date()), 'MMM d, yyyy')}
              </p>
              
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-full mb-4"></div>
                  <div className="h-64 bg-gray-200 rounded w-full"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Nourish</TableHead>
                      <TableHead>Center</TableHead>
                      <TableHead>Play</TableHead>
                      <TableHead>Goals</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.keys(weeklyProgress).sort().map((day) => {
                      const dayGoals = weeklyGoals.filter(g => g.date === day);
                      const completedCount = dayGoals.filter(g => g.completed).length;
                      const totalCount = dayGoals.length;
                      
                      return (
                        <TableRow key={day}>
                          <TableCell className="font-medium">{formatDateForDisplay(day)}</TableCell>
                          {categories.slice(0, 3).map(cat => (
                            <TableCell key={cat.value}>
                              {weeklyProgress[day][cat.value].total > 0 ? (
                                <div className="flex flex-col">
                                  <Progress
                                    value={weeklyProgress[day][cat.value].percentage}
                                    className="h-2 mb-1"
                                  />
                                  <span className="text-xs text-gray-600">
                                    {weeklyProgress[day][cat.value].completed}/{weeklyProgress[day][cat.value].total}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">No goals</span>
                              )}
                            </TableCell>
                          ))}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={totalCount > 0 ? (completedCount / totalCount) * 100 : 0}
                                className="h-2 w-16"
                              />
                              <span className="text-xs">{completedCount}/{totalCount}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
          
          {/* Monthly View */}
          <TabsContent value="monthly">
            <div className="bg-white/90 rounded-lg shadow-sm p-6 bg-gradient-to-br from-white to-green-50">
              <h2 className="text-xl font-semibold text-menova-text mb-4">Monthly Progress</h2>
              <p className="text-sm text-gray-600 mb-4">
                {format(startOfMonth(new Date()), 'MMMM yyyy')}
              </p>
              
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-full mb-4"></div>
                  <div className="h-64 bg-gray-200 rounded w-full"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Nourish</TableHead>
                      <TableHead>Center</TableHead>
                      <TableHead>Play</TableHead>
                      <TableHead>Overall</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.keys(monthlyProgress).map((week) => {
                      const weekTotal = categories.slice(0, 3).reduce(
                        (acc, cat) => acc + monthlyProgress[week][cat.value].total, 0
                      );
                      const weekCompleted = categories.slice(0, 3).reduce(
                        (acc, cat) => acc + monthlyProgress[week][cat.value].completed, 0
                      );
                      const weekPercentage = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;
                      
                      return (
                        <TableRow key={week}>
                          <TableCell className="font-medium">{week}</TableCell>
                          {categories.slice(0, 3).map(cat => (
                            <TableCell key={cat.value}>
                              {monthlyProgress[week][cat.value].total > 0 ? (
                                <div className="flex flex-col">
                                  <Progress
                                    value={monthlyProgress[week][cat.value].percentage}
                                    className="h-2 mb-1"
                                  />
                                  <span className="text-xs text-gray-600">
                                    {monthlyProgress[week][cat.value].completed}/{monthlyProgress[week][cat.value].total}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">No goals</span>
                              )}
                            </TableCell>
                          ))}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={weekPercentage}
                                className="h-2 w-16"
                              />
                              <span className="text-xs">{weekCompleted}/{weekTotal}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Celebration Modal - Shown after completing a goal */}
        {completedGoal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center animate-scale-in">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Check size={32} className="text-menova-green" />
              </div>
              
              <h3 className="text-xl font-bold text-menova-text mb-2">Goal Completed!</h3>
              <p className="text-gray-600 mb-6">{motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]}</p>
              
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/check-in')}
                  variant="outline" 
                  className="w-full border-menova-green text-menova-green hover:bg-menova-green/10"
                >
                  Go to Daily Check-In
                </Button>
                
                <Button 
                  onClick={() => navigate('/resources')}
                  variant="outline" 
                  className="w-full border-menova-green text-menova-green hover:bg-menova-green/10"
                >
                  Explore Resources
                </Button>
                
                <Button 
                  onClick={() => {
                    setCompletedGoal(null);
                    openAssistant();
                  }}
                  className="w-full bg-menova-green hover:bg-menova-green/90 text-white"
                >
                  Chat with MeNova
                </Button>
                
                <Button 
                  onClick={() => setCompletedGoal(null)}
                  variant="ghost" 
                  className="w-full text-gray-500 hover:text-gray-700"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <VapiAssistant ref={vapiAssistantRef} />
      <Toaster />
    </div>
  );
};

export default TodaysWellness;
