
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { 
  Form, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage 
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Calendar, Check, X, RefreshCcw, Plus, ArrowRight } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Define form schema for adding a new goal
const formSchema = z.object({
  goal: z.string().min(3, {
    message: "Goal must be at least 3 characters.",
  }),
});

// Define the Goal interface
interface Goal {
  id: string;
  goal: string;
  completed: boolean;
  category: string;
  date: string;
}

const TodaysWellness = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, session } = useAuth();

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      goal: "",
    },
  });

  // Calculate progress
  const calculateProgress = (goalsList: Goal[]) => {
    if (goalsList.length === 0) return 0;
    const completed = goalsList.filter((goal) => goal.completed).length;
    return Math.round((completed / goalsList.length) * 100);
  };

  // Fetch goals from Supabase
  const fetchGoals = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("daily_goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      setGoals(data || []);
      setProgress(calculateProgress(data || []));
    } catch (error) {
      console.error("Error fetching goals:", error);
      toast({
        title: "Error",
        description: "Failed to load your daily goals. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch AI-generated goal suggestions
  const fetchSuggestions = async () => {
    if (!user || !session) return;
    
    try {
      setSuggestionsLoading(true);
      
      const { data, error } = await supabase.functions.invoke("suggest-wellness-goals", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([
        "Take a 15-minute walk outside",
        "Drink 8 glasses of water today",
        "Practice deep breathing for 5 minutes",
        "Eat a meal rich in calcium and vitamin D",
        "Write down 3 things you're grateful for"
      ]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // Initialize component
  useEffect(() => {
    if (user) {
      fetchGoals();
      fetchSuggestions();
    } else {
      // Redirect to login if not authenticated
      navigate("/login", { state: { from: "/todays-wellness" } });
    }
  }, [user, navigate]);

  // Add a new goal
  const addGoal = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("daily_goals")
        .insert([
          {
            user_id: user.id,
            goal: values.goal,
            completed: false,
            date: new Date().toISOString().split("T")[0],
          },
        ])
        .select();

      if (error) throw error;
      
      // Add the new goal to the list
      if (data && data.length > 0) {
        setGoals((prev) => {
          const newGoals = [...prev, data[0]];
          setProgress(calculateProgress(newGoals));
          return newGoals;
        });
        
        form.reset();
        
        toast({
          title: "Success",
          description: "Goal added successfully!",
        });
      }
    } catch (error) {
      console.error("Error adding goal:", error);
      toast({
        title: "Error",
        description: "Failed to add goal. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Add a suggested goal
  const addSuggestedGoal = async (suggestion: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("daily_goals")
        .insert([
          {
            user_id: user.id,
            goal: suggestion,
            completed: false,
            date: new Date().toISOString().split("T")[0],
          },
        ])
        .select();

      if (error) throw error;
      
      // Add the new goal to the list
      if (data && data.length > 0) {
        setGoals((prev) => {
          const newGoals = [...prev, data[0]];
          setProgress(calculateProgress(newGoals));
          return newGoals;
        });
        
        // Remove the suggestion from the list
        setSuggestions((prev) => prev.filter((item) => item !== suggestion));
        
        toast({
          title: "Success",
          description: "Suggested goal added to your list!",
        });
      }
    } catch (error) {
      console.error("Error adding suggested goal:", error);
      toast({
        title: "Error",
        description: "Failed to add suggested goal. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Toggle goal completion
  const toggleGoalCompletion = async (goalId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("daily_goals")
        .update({ completed: !currentStatus })
        .eq("id", goalId);

      if (error) throw error;
      
      // Update the goal in the list
      setGoals((prev) => {
        const newGoals = prev.map((goal) =>
          goal.id === goalId ? { ...goal, completed: !currentStatus } : goal
        );
        
        const newProgress = calculateProgress(newGoals);
        setProgress(newProgress);
        
        // Show completion message if all goals are completed
        if (newProgress === 100) {
          setShowCompletionMessage(true);
        }
        
        return newGoals;
      });
    } catch (error) {
      console.error("Error toggling goal completion:", error);
      toast({
        title: "Error",
        description: "Failed to update goal status. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Delete a goal
  const deleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from("daily_goals")
        .delete()
        .eq("id", goalId);

      if (error) throw error;
      
      // Remove the goal from the list
      setGoals((prev) => {
        const newGoals = prev.filter((goal) => goal.id !== goalId);
        setProgress(calculateProgress(newGoals));
        return newGoals;
      });
      
      toast({
        title: "Success",
        description: "Goal removed successfully.",
      });
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast({
        title: "Error",
        description: "Failed to delete goal. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Refresh suggested goals
  const refreshSuggestions = async () => {
    if (!user) return;
    
    setRefreshing(true);
    await fetchSuggestions();
    setRefreshing(false);
    
    toast({
      title: "Success",
      description: "Goal suggestions refreshed!",
    });
  };

  // Get today's date in a readable format
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="container px-4 py-6 mx-auto max-w-6xl">
      <h1 className="text-3xl font-semibold text-menova-text mb-6">Today's Wellness</h1>
      <p className="text-gray-600 mb-8 flex items-center">
        <Calendar className="mr-2 h-5 w-5 text-menova-green" />
        {today}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Goals list */}
        <div className="md:col-span-2 space-y-6">
          {/* New goal card */}
          <Card className="bg-white/90 shadow-sm border-menova-green/30 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#7d6285]">Add New Goal</CardTitle>
              <CardDescription>Set your wellness intentions for today</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(addGoal)} className="flex space-x-2">
                  <FormField
                    control={form.control}
                    name="goal"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input 
                            placeholder="E.g., Drink 8 glasses of water" 
                            {...field} 
                            className="border-menova-green/30 focus-visible:ring-menova-green"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit"
                    className="bg-menova-green hover:bg-menova-green/80 text-white"
                  >
                    <Plus className="mr-1 h-4 w-4" /> Add
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Goals progress */}
          <Card className="bg-white/90 shadow-sm border-menova-green/30 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-[#7d6285]">Today's Progress</CardTitle>
                <span className="text-sm font-medium">{progress}%</span>
              </div>
            </CardHeader>
            <CardContent>
              <Progress 
                value={progress} 
                className="h-3 bg-gray-100"
                indicatorClassName="bg-menova-green"
              />
            </CardContent>
          </Card>

          {/* Goals list */}
          <Card className="bg-white/90 shadow-sm border-menova-green/30 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#7d6285]">Your Goals</CardTitle>
              <CardDescription>Track your daily wellness activities</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-pulse space-y-2 w-full">
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                  </div>
                </div>
              ) : goals.length > 0 ? (
                <div className="space-y-2">
                  {goals.map((goal) => (
                    <div 
                      key={goal.id} 
                      className={`flex items-center justify-between p-3 rounded-md border transition-all ${
                        goal.completed 
                          ? "bg-menova-lightgreen border-menova-green/40" 
                          : "bg-white border-gray-200 hover:border-menova-green/30"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={goal.completed}
                          onCheckedChange={() => toggleGoalCompletion(goal.id, goal.completed)}
                          className={`${
                            goal.completed 
                              ? "bg-menova-green border-menova-green" 
                              : "border-menova-green/30"
                          } text-white`}
                        />
                        <span className={goal.completed ? "line-through text-gray-500" : ""}>
                          {goal.goal}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="Delete goal"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-gray-500">
                  <p>You haven't set any goals for today yet.</p>
                  <p className="mt-2 text-sm">Add a new goal above or choose from our suggestions.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Completion message */}
          {showCompletionMessage && (
            <Card className="bg-menova-lightgreen border-menova-green shadow-sm overflow-hidden animate-fade-in">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="bg-menova-green rounded-full p-3 mb-4">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-menova-text mb-2">Amazing job!</h3>
                  <p className="text-gray-600 mb-6">
                    You've completed all your wellness goals for today. Keep up the great work!
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <Button
                      variant="outline"
                      className="border-menova-green text-menova-green hover:bg-menova-green/10"
                      onClick={() => navigate('/check-in')}
                    >
                      Daily Check-In
                    </Button>
                    <Button
                      variant="outline"
                      className="border-menova-green text-menova-green hover:bg-menova-green/10"
                      onClick={() => navigate('/resources')}
                    >
                      Explore Resources
                    </Button>
                    <Button
                      variant="outline"
                      className="border-menova-green text-menova-green hover:bg-menova-green/10"
                      onClick={() => navigate('/chat')}
                    >
                      Start a Chat
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Suggestions column */}
        <div className="space-y-6">
          <Card className="bg-white/90 shadow-sm border-menova-green/30 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-[#7d6285]">Suggested Goals</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshSuggestions}
                  disabled={refreshing || suggestionsLoading}
                  className="text-menova-green hover:text-menova-green/80 hover:bg-menova-green/10"
                >
                  <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  <span className="ml-1 sr-md:hidden">Refresh</span>
                </Button>
              </div>
              <CardDescription>Personalized wellness suggestions for you</CardDescription>
            </CardHeader>
            <CardContent>
              {suggestionsLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-10 bg-gray-200 rounded"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="flex justify-between items-center w-full p-3 text-left rounded-md border border-gray-200 hover:border-menova-green/30 transition-all bg-white hover:bg-menova-lightgreen/30"
                      onClick={() => addSuggestedGoal(suggestion)}
                    >
                      <span>{suggestion}</span>
                      <Plus className="h-4 w-4 text-menova-green" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/90 shadow-sm border-menova-green/30 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#7d6285]">Wellness Tips</CardTitle>
              <CardDescription>Daily insights for your journey</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-gray-700">
                <p className="text-sm">
                  <span className="font-semibold text-menova-green">💧 Stay hydrated:</span> Drinking enough water can help minimize hot flashes and improve energy levels.
                </p>
                <p className="text-sm">
                  <span className="font-semibold text-menova-green">🌿 Mindfulness:</span> Just 5 minutes of mindfulness practice can significantly reduce stress hormones.
                </p>
                <p className="text-sm">
                  <span className="font-semibold text-menova-green">🚶‍♀️ Movement:</span> Regular movement helps strengthen bones and improves mood through endorphin release.
                </p>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button 
                variant="outline" 
                className="w-full border-menova-green text-menova-green hover:bg-menova-green/10"
                onClick={() => navigate('/resources')}
              >
                Explore More Resources <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TodaysWellness;
