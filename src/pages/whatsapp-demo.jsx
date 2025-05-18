import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import WhatsAppDemo from '@/components/WhatsAppDemo';
import MeNovaLogo from '@/components/MeNovaLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { mockWhatsApp } from '@/services/mockWhatsAppService';
import { notificationTrigger } from '@/services/notificationTriggerService';
import { HelpCircle, CheckCircle2, Clock } from 'lucide-react';

/**
 * WhatsApp Demo Page
 * This page demonstrates the WhatsApp notification functionality
 * without requiring actual Twilio credentials
 */
const WhatsAppDemoPage = () => {
  const navigate = useNavigate();
  const [messageHistory, setMessageHistory] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [schedulingDemo, setSchedulingDemo] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          toast({
            title: "Authentication Required",
            description: "Please login to access the WhatsApp demo",
            variant: "destructive",
          });
          navigate('/login');
          return;
        }
        
        setUser(session.user);
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate]);

  // Update message history from mock service
  useEffect(() => {
    const updateHistory = () => {
      setMessageHistory(mockWhatsApp.getMessageHistory());
    };
    
    // Update initially
    updateHistory();
    
    // Set up interval to refresh history
    const interval = setInterval(updateHistory, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Simulate scheduling a follow-up notification
  const handleScheduleDemo = async () => {
    if (!user) return;
    
    setSchedulingDemo(true);
    
    try {
      // Schedule a demo follow-up
      const result = await notificationTrigger.scheduleFollowUpNotification(
        user.id,
        'symptom-tracker'
      );
      
      if (result.success) {
        toast({
          title: "Follow-up Scheduled",
          description: "A demo follow-up notification has been scheduled",
        });
      } else if (result.reason === 'no-phone') {
        toast({
          title: "Phone Number Required",
          description: "Please add your phone number in your profile to receive follow-ups",
          variant: "destructive",
        });
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule follow-up",
        variant: "destructive",
      });
    } finally {
      setSchedulingDemo(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-menova-beige flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-menova-beige">
      {/* Navigation header */}
      <nav className="flex justify-between items-center px-6 py-4 bg-white/90 shadow-sm backdrop-blur-sm sticky top-0 z-10">
        <div onClick={() => navigate('/')} className="cursor-pointer">
          <MeNovaLogo />
        </div>
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => navigate('/welcome')} 
            variant="ghost"
            className="text-menova-green hover:bg-menova-green/10"
          >
            Dashboard
          </Button>
          <Button 
            onClick={() => navigate('/profile')} 
            variant="ghost"
            className="text-menova-green hover:bg-menova-green/10"
          >
            Profile
          </Button>
        </div>
      </nav>

      <main className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-center mb-2 text-menova-text">WhatsApp Demo</h1>
        <p className="text-center text-gray-600 mb-8">
          Test WhatsApp notifications without actual Twilio credentials
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <WhatsAppDemo />
            
            {/* Follow-up Demo Card */}
            <Card className="mt-8 border-[#25D366]/20">
              <CardHeader className="bg-[#25D366]/5">
                <CardTitle className="flex items-center text-lg">
                  <Clock className="mr-2 h-5 w-5 text-[#25D366]" />
                  Follow-up Notification Demo
                </CardTitle>
                <CardDescription>
                  Simulate the symptom tracking follow-up process
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="bg-gray-50 p-3 rounded-md mb-4 text-sm">
                  <p className="flex items-start">
                    <HelpCircle className="h-4 w-4 mr-2 mt-0.5 text-gray-500" />
                    <span>
                      This simulates the 24-hour follow-up that's automatically scheduled when you track symptoms or have a voice chat
                    </span>
                  </p>
                </div>
                
                <Button 
                  onClick={handleScheduleDemo}
                  disabled={schedulingDemo}
                  className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white flex items-center justify-center"
                >
                  {schedulingDemo ? (
                    <span className="flex items-center">
                      <Clock className="animate-spin mr-2 h-4 w-4" />
                      Scheduling...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Schedule Demo Follow-up
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Message History</CardTitle>
                <CardDescription>
                  Recent simulated WhatsApp messages
                </CardDescription>
              </CardHeader>
              <CardContent>
                {messageHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No messages sent yet. Try sending a test message.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messageHistory.slice().reverse().map(message => (
                      <div 
                        key={message.id} 
                        className="p-3 rounded-lg bg-[#DCF8C6] border-l-4 border-[#25D366]"
                      >
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">To: {message.to}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(message.sentAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-gray-800">{message.body}</p>
                        <div className="flex justify-end mt-1">
                          <span className="text-xs text-gray-500 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            {message.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {messageHistory.length > 0 && (
                  <div className="mt-4 flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        mockWhatsApp.clearHistory();
                        setMessageHistory([]);
                      }}
                    >
                      Clear History
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-12 max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                This demo uses a mock WhatsApp service that simulates sending messages 
                without requiring actual Twilio credentials. In a production environment, 
                this would be replaced with real Twilio API calls.
              </p>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-lg font-medium mb-2">Integration Steps:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Enter a phone number (or use the one from your profile)</li>
                  <li>Customize the message if desired</li>
                  <li>Click "Send Test Message"</li>
                  <li>See the simulated message in the history panel</li>
                  <li>Check your browser console for detailed logs</li>
                </ol>
              </div>
              
              <p className="text-sm text-gray-600">
                <strong>Note:</strong> In a real implementation with Twilio, the recipient would need to have 
                joined your WhatsApp sandbox first by sending a message to the Twilio number with a join code.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default WhatsAppDemoPage; 