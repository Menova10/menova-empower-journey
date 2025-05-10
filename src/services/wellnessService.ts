import { supabase } from '@/integrations/supabase/client';
import { Goal, SuggestedGoal, CategoryProgress, normalizeCategory } from '@/types/wellness';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// Re-export the normalizeCategory function from types
export { normalizeCategory };

// Fetch user's goals for today
export const fetchTodaysGoals = async (userId: string): Promise<Goal[]> => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const { data, error } = await supabase
    .from('daily_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .order('created_at', { ascending: true });

  if (error) throw error;
  
  return data || [];
};

// Fetch weekly goals
export const fetchWeeklyGoals = async (userId: string): Promise<Goal[]> => {
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
  
  return data || [];
};

// Fetch monthly goals
export const fetchMonthlyGoals = async (userId: string): Promise<Goal[]> => {
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
  
  return data || [];
};

// Check and create default goals
export const checkAndCreateDefaultGoals = async (userId: string): Promise<Goal[]> => {
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
      
      return newGoals || [];
    }
  }
  
  return [];
};

// Fetch wellness goals progress
export const fetchWellnessGoalsProgress = async (userId: string): Promise<CategoryProgress | null> => {
  try {
    const { data, error } = await supabase
      .from('wellness_goals')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      const progress: CategoryProgress = {};
      
      data.forEach(record => {
        progress[record.category] = {
          completed: record.completed,
          total: record.total,
          percentage: record.total > 0 ? Math.round((record.completed / record.total) * 100) : 0
        };
      });
      
      return progress;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching wellness goals progress:', error);
    return null;
  }
};

// Add a new goal
export const addNewGoal = async (userId: string, goalText: string, category: string): Promise<Goal | null> => {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('daily_goals')
    .insert({
      user_id: userId,
      goal: goalText,
      date: today,
      category: category
    })
    .select();
  
  if (error) throw error;
  
  return data?.[0] || null;
};

// Toggle goal completion
export const toggleGoalCompletion = async (goalId: string, currentStatus: boolean): Promise<void> => {
  if (currentStatus === true) return; // Only allow completing goals, not uncompleting
  
  const { error } = await supabase
    .from('daily_goals')
    .update({ completed: !currentStatus })
    .eq('id', goalId);
  
  if (error) throw error;
};

// Fetch suggested goals
export const fetchSuggestedGoals = async (userId: string): Promise<SuggestedGoal[]> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No authenticated session found');

    const { data, error } = await supabase.functions.invoke('suggest-wellness-goals', {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: { 
        categories: ['nourish', 'center', 'play'] 
      }
    });

    if (error) throw error;
    
    if (data?.suggestions && Array.isArray(data.suggestions)) {
      // Check if suggestions are already categorized
      if (data.suggestions[0] && typeof data.suggestions[0] === 'object' && 'category' in data.suggestions[0]) {
        // Already categorized format
        return data.suggestions as SuggestedGoal[];
      } else {
        // Need to categorize them ourselves
        return data.suggestions.map((goal: string) => {
          let category = 'general';
          
          // Simple keyword matching for categorization
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
          
          return {
            text: goal,
            category: category
          };
        });
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching suggested goals:', error);
    // Fallback suggestions
    return [
      { text: "Drink 8 glasses of water today", category: "nourish" },
      { text: "Take a 15-minute walk outside", category: "play" },
      { text: "Practice deep breathing for 5 minutes", category: "center" },
      { text: "Write down 3 things you're grateful for", category: "center" },
      { text: "Eat a meal rich in calcium and vitamin D", category: "nourish" }
    ];
  }
};

// Update wellness goals in the database
export const updateWellnessGoals = async (userId: string, catCounts: CategoryProgress): Promise<void> => {
  try {
    const categoryKeys = ['nourish', 'center', 'play'];
    
    // Only update the main categories: nourish, center, play
    for (const category of categoryKeys) {
      const catData = catCounts[category];
      if (!catData) continue;
      
      // First check if we have existing data
      const { data: existingData } = await supabase
        .from('wellness_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .single();
      
      // If we have existing data, update it
      if (existingData) {
        await supabase
          .from('wellness_goals')
          .update({
            completed: catData.completed,
            total: catData.total > 0 ? catData.total : 1 // Ensure we have at least 1 as total
          })
          .eq('id', existingData.id);
      } 
      // If we don't have existing data, insert it
      else {
        await supabase
          .from('wellness_goals')
          .insert({
            user_id: userId,
            category: category,
            completed: catData.completed,
            total: catData.total > 0 ? catData.total : 1 // Ensure we have at least 1 as total
          });
      }
    }
  } catch (error) {
    console.error('Error updating wellness goals:', error);
    throw error;
  }
};
