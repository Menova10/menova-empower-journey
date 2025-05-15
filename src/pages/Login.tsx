import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { X } from 'lucide-react';
import AuthBackground from '@/components/AuthBackground';
import MeNovaLogo from '@/components/MeNovaLogo';

// Login form schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
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

  const handleClose = () => {
    navigate('/');
  };

  return (
    <AuthBackground>
      {/* Logo positioned at top left */}
      <div className="absolute top-4 left-4">
        <MeNovaLogo />
      </div>
      
      {/* Close button */}
      <button 
        onClick={handleClose}
        className="absolute right-4 top-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Close"
      >
        <X size={20} />
      </button>
      
      <h1 className="text-2xl font-semibold text-center text-menova-text mb-6">Welcome to MeNova</h1>
      
      <div className="w-full">
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
              className="w-full bg-[#92D9A9] hover:bg-[#7bc492] text-white"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </Form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 mb-2">Don't have an account yet?</p>
          <Button 
            onClick={() => navigate('/waitlist')}
            className="bg-[#92D9A9] hover:bg-[#7bc492] text-white"
          >
            Join the Waitlist
          </Button>
        </div>
      </div>
    </AuthBackground>
  );
};

export default Login;
