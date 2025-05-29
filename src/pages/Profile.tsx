import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Profile form schema
const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").nullable().optional(),
  username: z.string().min(3, "Username must be at least 3 characters").nullable().optional(),
  menopauseStage: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      username: "",
      menopauseStage: "",
      birthDate: "",
      phone: "",
    },
  });

  // Check if user is logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast({
          title: "Access denied",
          description: "Please log in to view your profile.",
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

  // Fetch user profile data
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error",
          description: "Failed to load your profile information.",
          variant: "destructive",
        });
        return;
      }

      setProfile(data);
      
      // Set form default values
      form.reset({
        fullName: data.full_name || "",
        username: data.username || "",
        menopauseStage: data.menopause_stage || "",
        birthDate: data.birth_date ? new Date(data.birth_date).toISOString().split('T')[0] : "",
        phone: data.phone || "",
      });
      
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update profile
  const onSubmit = async (values: ProfileFormValues) => {
    try {
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to update your profile.",
          variant: "destructive",
        });
        return;
      }

      setIsUpdating(true);
      
      const profileUpdate = {
        ...(values.fullName !== null && { full_name: values.fullName }),
        ...(values.username !== null && { username: values.username }),
        ...(values.menopauseStage !== null && { menopause_stage: values.menopauseStage }),
        ...(values.birthDate !== null && { birth_date: values.birthDate }),
        ...(values.phone !== null && { phone: values.phone }),
        updated_at: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id)
        .select();
      
      if (error) {
        toast({
          title: "Update failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
  
      // Get the updated profile
      const updatedProfile = data?.[0] || null;
      
      // Show success message
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      
      // Show additional message about WhatsApp if phone was added or changed
      if (values.phone && (!profile?.phone || profile.phone !== values.phone)) {
        setTimeout(() => {
          toast({
            title: "WhatsApp Notifications Enabled",
            description: "You'll now receive WhatsApp follow-ups for your symptom tracking and voice chats.",
            variant: "default",
          });
        }, 1000);
      }
      
      // Update local state
      setProfile(updatedProfile);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating your profile.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-menova-beige flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-menova-beige flex flex-col">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} />
                <AvatarFallback>{profile?.full_name?.charAt(0) || user?.email?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{profile?.full_name || "Your Profile"}</CardTitle>
                <CardDescription>{user?.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Doe" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormDescription>
                        This is how your name will appear in your account.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="janedoe" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="menopauseStage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Menopause Stage</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="perimenopause">Perimenopause</SelectItem>
                          <SelectItem value="menopause">Menopause</SelectItem>
                          <SelectItem value="postmenopause">Postmenopause</SelectItem>
                          <SelectItem value="not_sure">Not Sure</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Birth Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (for WhatsApp notifications)</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel" 
                          placeholder="+1234567890" 
                          {...field} 
                          value={field.value || ''} 
                        />
                      </FormControl>
                      <FormDescription>
                        Include country code for WhatsApp notifications (e.g., +1 for US)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-between">
                  <Button 
                    type="submit" 
                    className="bg-menova-green hover:bg-menova-green/90"
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="border-menova-green text-menova-green hover:bg-menova-green/10"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
