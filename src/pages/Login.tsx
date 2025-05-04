
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import MeNovaLogo from '@/components/MeNovaLogo';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { X } from 'lucide-react';

// Login form schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Signup form schema
const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const navigate = useNavigate();
  const location = useLocation();
  const [directAccessCreated, setDirectAccessCreated] = useState(false);
  const [waitlistData, setWaitlistData] = useState<any>(null);

  // Parse email from URL query parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const email = queryParams.get('email');
    
    if (email) {
      // Set active tab to signup if email is provided
      setActiveTab("signup");
      
      // Fetch waitlist data for this email to pre-populate fields
      fetchWaitlistData(email);
      
      // Pre-populate the signup form with the email
      signupForm.setValue("email", email);
    }
  }, [location.search]);
  
  // Fetch waitlist data for the email
  const fetchWaitlistData = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from("waitlist")
        .select("*")
        .eq("email", email)
        .single();
      
      if (error) {
        console.error("Error fetching waitlist data:", error);
        return;
      }
      
      if (data) {
        setWaitlistData(data);
        signupForm.setValue("fullName", data.full_name || "");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Create direct access account for specific email
  useEffect(() => {
    const createDirectAccessAccount = async () => {
      const email = "Shettysandhya1985@gmail.com";
      
      try {
        // Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const createDefault = urlParams.get('createDefault');
        
        // Only try to create if URL parameter is present and we haven't done it yet
        if (createDefault === 'true' && !directAccessCreated) {
          setIsLoading(true);
          setDirectAccessCreated(true);
          
          // Call the edge function to create the account using invoke method
          const { data, error } = await supabase.functions.invoke('approve-waitlist', {
            body: {
              email: email,
              directAccess: true
            }
          });
          
          if (error) {
            throw error;
          }
          
          toast({
            title: "Default account created",
            description: "A default account has been created and an email with credentials has been sent.",
          });
          
          // Redirect to login page
          navigate('/login');
        }
      } catch (error) {
        console.error('Error creating default account:', error);
        toast({
          title: "Account creation failed",
          description: "Failed to create default account.",
          variant: "destructive"
        });
        setIsLoading(false);
      }
    };
    
    createDirectAccessAccount();
  }, [directAccessCreated, navigate]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Signup form
  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
    },
  });

  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      
      if (error) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });
      
      navigate('/');
    } catch (error) {
      console.error('Error signing in:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSignupSubmit = async (data: SignupFormValues) => {
    try {
      setIsLoading(true);
      
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          }
        }
      });
      
      if (error) {
        toast({
          title: "Signup failed",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      
      // If we have waitlist data, update the profile with that data
      if (waitlistData && authData?.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: data.fullName,
            menopause_stage: waitlistData.menopause_stage,
            birth_date: waitlistData.birth_date,
          })
          .eq("id", authData.user.id);
          
        if (profileError) {
          console.error("Error updating profile with waitlist data:", profileError);
        }
      }

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
      
      navigate('/');
    } catch (error) {
      console.error('Error signing up:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    navigate('/');
  };

  // Add a button to create the default account
  const handleCreateDefaultAccount = () => {
    navigate('/login?createDefault=true');
  };

  return (
    <div className="min-h-screen flex flex-col bg-menova-beige">
      {/* Navigation Bar */}
      <nav className="flex justify-between items-center px-6 py-4 bg-white/90 shadow-sm backdrop-blur-sm sticky top-0 z-10">
        <MeNovaLogo />
      </nav>
      
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md relative">
          {/* Close button */}
          <button 
            onClick={handleClose}
            className="absolute right-4 top-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
          
          <div onClick={() => navigate('/')} className="flex justify-center mb-4 cursor-pointer">
            <img
              src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png"
              alt="MeNova Character"
              className="w-20 h-20 rounded-full object-cover border-2 border-menova-green"
            />
          </div>
          
          <h1 className="text-2xl font-semibold text-center text-menova-text mb-6">Welcome to MeNova</h1>
          
          {/* Default account button */}
          <div className="mb-4 text-center">
            <Button 
              onClick={handleCreateDefaultAccount}
              className="bg-menova-green hover:bg-menova-green/90 px-3 py-1 text-sm"
              disabled={isLoading}
            >
              Create Default Account
            </Button>
          </div>
          
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-menova-green hover:bg-menova-green/90"
                    disabled={isLoading}
                  >
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="signup">
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                  <FormField
                    control={signupForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={signupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-menova-green hover:bg-menova-green/90"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Sign Up"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Login;
