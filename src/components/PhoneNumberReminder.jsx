import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * A component that reminds users to add a phone number to their profile
 * for WhatsApp notifications.
 */
const PhoneNumberReminder = () => {
  const [showReminder, setShowReminder] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkPhoneNumber = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setShowReminder(false);
          setLoading(false);
          return;
        }
        
        // Check if user has a phone number in their profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')  // Changed to select all columns to avoid error if phone column doesn't exist
          .eq('id', session.user.id)
          .single();
          
        if (error) {
          console.error('Error checking profile:', error);
          setShowReminder(false);
        } else if (!profile.phone) {
          // Only show reminder if user doesn't have a phone number
          setShowReminder(true);
        } else {
          setShowReminder(false);
        }
      } catch (error) {
        console.error('Error in PhoneNumberReminder:', error);
        setShowReminder(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkPhoneNumber();
  }, []);
  
  const handleAddPhoneNumber = () => {
    navigate('/profile');
  };
  
  const handleDismiss = () => {
    setShowReminder(false);
  };
  
  if (loading || !showReminder) {
    return null;
  }
  
  return (
    <Alert className="mb-4 border-amber-300 bg-amber-50">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">Add your phone number for WhatsApp notifications</AlertTitle>
      <AlertDescription className="text-sm text-amber-700">
        <p className="mb-2">
          To receive timely notifications and check-in reminders via WhatsApp, please add your phone number to your profile.
        </p>
        <div className="flex gap-2 mt-2">
          <Button 
            onClick={handleAddPhoneNumber}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Add Phone Number
          </Button>
          <Button
            onClick={handleDismiss}
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-800 hover:bg-amber-100"
          >
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default PhoneNumberReminder; 