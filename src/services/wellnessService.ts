import { supabase } from '@/integrations/supabase/client';
import { Goal, SuggestedGoal, CategoryProgress, normalizeCategory } from '@/types/wellness';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { generateSingleGoal } from './aiGoalsService';

// Re-export the normalizeCategory function from types
export { normalizeCategory };

// Cache for session data to avoid repeated auth calls
let cachedSession: any = null;
let sessionCacheTime: number = 0;
const SESSION_CACHE_DURATION = 30000; // 30 seconds

const getCachedSession = async () => {
  const now = Date.now();
  if (cachedSession && (now - sessionCacheTime) < SESSION_CACHE_DURATION) {
    return cachedSession;
  }
  
  const { data: { session } } = await supabase.auth.getSession();
  cachedSession = session;
  sessionCacheTime = now;
  return session;
};

// Optimized fetch for today's goals with better query
export const fetchTodaysGoals = async (userId: string): Promise<Goal[]> => {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const { data, error } = await supabase
      .from('daily_goals')
      .select('id, goal, completed, category, date, created_at')
      .eq('user_id', userId)
      .eq('date', today)
      .order('created_at', { ascending: true })
      .limit(50); // Reasonable limit for performance

    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching today\'s goals:', error);
    return [];
  }
};

// Fetch goals by category for separate sections
export const fetchGoalsByCategory = async (userId: string, category: string): Promise<Goal[]> => {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const { data, error } = await supabase
      .from('daily_goals')
      .select('id, goal, completed, category, date, created_at')
      .eq('user_id', userId)
      .eq('date', today)
      .eq('category', category)
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error(`Error fetching ${category} goals:`, error);
    return [];
  }
};

// Auto-generate and add a new goal when one is completed
export const autoRefillGoal = async (userId: string, category: 'nourish' | 'center' | 'play'): Promise<Goal | null> => {
  try {
    // Generate a new dynamic goal
    const newGoalText = await generateSingleGoal(category);
    
    // Add it to the database
    const newGoal = await addNewGoal(userId, newGoalText, category);
    
    return newGoal;
  } catch (error) {
    console.error('Error auto-refilling goal:', error);
    return null;
  }
};

// Enhanced toggle goal completion with auto-refill
export const toggleGoalCompletionWithRefill = async (goalId: string, newStatus: boolean, userId?: string, category?: string): Promise<Goal | null> => {
  try {
    const { error } = await supabase
      .from('daily_goals')
      .update({ completed: newStatus })
      .eq('id', goalId);
    
    if (error) throw error;

    // If goal is being completed and we have user info, auto-generate a new one
    if (newStatus && userId && category) {
      const newGoal = await autoRefillGoal(userId, category as 'nourish' | 'center' | 'play');
      return newGoal;
    }

    return null;
  } catch (error) {
    console.error('Error toggling goal completion:', error);
    throw error;
  }
};

// Create initial goals for all categories using single AI call
export const createInitialGoalsForAllCategories = async (userId: string, enabledCategories: Record<string, boolean>): Promise<Goal[]> => {
  try {
    const { generateAllCategoriesGoals } = await import('./aiGoalsService');
    const allCategoryGoals = await generateAllCategoriesGoals();
    
    const today = new Date().toISOString().split('T')[0];
    const goalsToInsert: any[] = [];
    
    // Only create goals for enabled categories
    Object.entries(enabledCategories).forEach(([category, enabled]) => {
      if (enabled && allCategoryGoals[category as keyof typeof allCategoryGoals]) {
        const categoryGoals = allCategoryGoals[category as keyof typeof allCategoryGoals];
        categoryGoals.slice(0, 3).forEach(goalText => {
          goalsToInsert.push({
            user_id: userId,
            goal: goalText,
            category: category,
            date: today,
            completed: false
          });
        });
      }
    });

    if (goalsToInsert.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('daily_goals')
      .insert(goalsToInsert)
      .select('id, goal, completed, category, date, created_at');

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error creating initial goals for all categories:', error);
    return [];
  }
};

// Enhanced add new goal with category-specific generation
export const addNewGoalForCategory = async (userId: string, category: 'nourish' | 'center' | 'play'): Promise<Goal | null> => {
  try {
    const { generateSingleGoal } = await import('./aiGoalsService');
    const goalText = await generateSingleGoal(category);
    
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('daily_goals')
      .insert({
        user_id: userId,
        goal: goalText,
        date: today,
        category: category,
        completed: false
      })
      .select('id, goal, completed, category, date, created_at')
      .single();
    
    if (error) throw error;
    
    return data || null;
  } catch (error) {
    console.error(`Error adding new ${category} goal:`, error);
    return null;
  }
};

// Simplified category settings using local storage for now
export const getCategorySettings = (): Record<string, boolean> => {
  try {
    const settings = localStorage.getItem('categorySettings');
    if (settings) {
      return JSON.parse(settings);
    }
    
    // Default settings
    const defaultSettings = {
      nourish: true,
      center: true,
      play: true
    };
    
    localStorage.setItem('categorySettings', JSON.stringify(defaultSettings));
    return defaultSettings;
  } catch (error) {
    console.error('Error fetching category settings:', error);
    return { nourish: true, center: true, play: true };
  }
};

// Update category settings
export const updateCategorySettings = (settings: Record<string, boolean>): void => {
  try {
    localStorage.setItem('categorySettings', JSON.stringify(settings));
  } catch (error) {
    console.error('Error updating category settings:', error);
  }
};

// Optimized weekly goals fetch
export const fetchWeeklyGoals = async (userId: string): Promise<Goal[]> => {
  const startDate = format(startOfWeek(new Date()), 'yyyy-MM-dd');
  const endDate = format(endOfWeek(new Date()), 'yyyy-MM-dd');
  
  try {
    const { data, error } = await supabase
      .from('daily_goals')
      .select('id, goal, completed, category, date, created_at')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .limit(200); // Reasonable limit

    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching weekly goals:', error);
    return [];
  }
};

// Optimized monthly goals fetch
export const fetchMonthlyGoals = async (userId: string): Promise<Goal[]> => {
  const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  
  try {
    const { data, error } = await supabase
      .from('daily_goals')
      .select('id, goal, completed, category, date, created_at')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .limit(500); // Reasonable limit for a month

    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching monthly goals:', error);
    return [];
  }
};

// Optimized default goals creation with batch insert - DEPRECATED, use createInitialGoalsForAllCategories instead
export const checkAndCreateDefaultGoals = async (userId: string): Promise<Goal[]> => {
  console.warn('checkAndCreateDefaultGoals is deprecated. Use createInitialGoalsForAllCategories instead.');
  
  // Redirect to the new function with default settings
  const defaultSettings = { nourish: true, center: true, play: true };
  return createInitialGoalsForAllCategories(userId, defaultSettings);
};

// Optimized wellness goals progress fetch
export const fetchWellnessGoalsProgress = async (userId: string): Promise<CategoryProgress | null> => {
  try {
    const { data, error } = await supabase
      .from('wellness_goals')
      .select('category, completed, total')
      .eq('user_id', userId)
      .limit(10);
    
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

// Optimized add new goal function
export const addNewGoal = async (userId: string, goalText: string, category: string): Promise<Goal | null> => {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const { data, error } = await supabase
      .from('daily_goals')
      .insert({
        user_id: userId,
        goal: goalText,
        date: today,
        category: category,
        completed: false
      })
      .select('id, goal, completed, category, date, created_at')
      .single();
    
    if (error) throw error;
    
    return data || null;
  } catch (error) {
    console.error('Error adding new goal:', error);
    return null;
  }
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
