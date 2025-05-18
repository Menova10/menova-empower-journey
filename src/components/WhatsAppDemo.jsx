import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { sendWhatsAppNotification } from '@/services/mockWhatsAppService';
import { supabase } from '@/integrations/supabase/client';

/**
 * WhatsApp Demo Component
 * Provides a UI to demonstrate WhatsApp notification functionality
 */
const WhatsAppDemo = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('Thank you for your check-in with MeNova! We\'ll check back with you in 24 hours to see how you\'re feeling.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [userPhone, setUserPhone] = useState('');

  // Get the user's phone from profile on component mount
  useEffect(() => {
    const getUserPhone = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('phone')
            .eq('id', session.user.id)
            .single();
            
          if (!error && data?.phone) {
            setPhoneNumber(data.phone);
            setUserPhone(data.phone);
          }
        }
      } catch (error) {
        console.error('Error fetching user phone:', error);
      }
    };
    
    getUserPhone();
  }, []);

  // Send a test WhatsApp message
  const sendTestMessage = async () => {
    if (!phoneNumber) {
      setResult({
        success: false,
        message: 'Please enter a phone number'
      });
      return;
    }
    
    // Validate phone format
    if (!phoneNumber.startsWith('+')) {
      setResult({
        success: false,
        message: 'Phone number must be in international format (starting with +)'
      });
      return;
    }
    
    setLoading(true);
    setResult(null);
    
    try {
      const response = await sendWhatsAppNotification(phoneNumber, message);
      
      // Set success result
      setResult({
        success: true,
        message: 'WhatsApp message sent successfully!',
        sid: response.sid
      });
      
    } catch (error) {
      // Set error result
      setResult({
        success: false,
        message: error.message || 'Failed to send WhatsApp message'
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="bg-[#25D366]/10">
        <CardTitle className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-[#25D366]">
            <path d="M21.41 2.59A2 2 0 0 0 20 2H4a2 2 0 0 0-1.41.59A2 2 0 0 0 2 4v12a2 2 0 0 0 .59 1.41A2 2 0 0 0 4 18h2v4l4-4h10a2 2 0 0 0 1.41-.59A2 2 0 0 0 22 16V4a2 2 0 0 0-.59-1.41Z"></path>
          </svg>
          WhatsApp Demo
        </CardTitle>
        <CardDescription>
          Send test WhatsApp notifications without Twilio credentials
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium">
            Phone Number
          </label>
          <Input
            id="phone"
            type="tel"
            placeholder="+12345678900"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <p className="text-xs text-gray-500">
            {userPhone 
              ? `Using phone number from your profile: ${userPhone}`
              : 'Include the country code with + prefix (e.g., +1 for US)'}
          </p>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="message" className="text-sm font-medium">
            Message
          </label>
          <Textarea
            id="message"
            placeholder="Enter your message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
        </div>
        
        {result && (
          <Alert className={result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
            {result.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <AlertTitle className={result.success ? 'text-green-800' : 'text-red-800'}>
              {result.success ? 'Success' : 'Error'}
            </AlertTitle>
            <AlertDescription className={result.success ? 'text-green-700' : 'text-red-700'}>
              {result.message}
              {result.success && result.sid && (
                <div className="mt-1 text-xs">Message ID: {result.sid}</div>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          <strong>Demo Mode:</strong> This will simulate sending a WhatsApp message without using actual Twilio credentials. Check the browser console to see the message details.
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={sendTestMessage} 
          disabled={loading}
          className="w-full bg-[#25D366] hover:bg-[#128C7E] flex items-center"
        >
          <Send className="mr-2 h-4 w-4" />
          {loading ? 'Sending...' : 'Send Test Message'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default WhatsAppDemo; 