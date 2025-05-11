
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Volume2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BreadcrumbTrail } from '@/components/BreadcrumbTrail';
import { toast } from '@/components/ui/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { ScrollableContent } from '@/components/wellness/ScrollableContent';

const ChatHistory = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showChatOptions, setShowChatOptions] = useState(false);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast({
          title: "Access denied",
          description: "Please log in to view this page.",
          variant: "destructive",
        });
        navigate('/login');
        return;
      }
      
      setUser(session.user);
      fetchSessions(session.user.id);
    };
    
    checkAuth();
  }, [navigate]);

  // Fetch user sessions
  const fetchSessions = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (error) {
        console.error('Error fetching sessions:', error);
        toast({
          title: "Error",
          description: "Failed to load your chat history.",
          variant: "destructive",
        });
      } else {
        setSessions(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a specific session
  const fetchSessionMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('session_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching session messages:', error);
      } else {
        setSessionMessages(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Handle session selection
  const handleSessionClick = (session: any) => {
    setSelectedSession(session);
    fetchSessionMessages(session.id);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Get session title or default
  const getSessionTitle = (session: any) => {
    return session.title || `${session.session_type.charAt(0).toUpperCase() + session.session_type.slice(1)} Session`;
  };

  // Open chat options dialog
  const handleStartNewSession = () => {
    setShowChatOptions(true);
  };
  
  // Start voice or text chat session
  const handleChatOptionSelected = (type: 'voice' | 'text') => {
    setShowChatOptions(false);
    navigate('/chat', { state: { sessionType: type } });
  };

  // Resume or start a new session
  const handleStartSession = (sessionId?: string) => {
    // For now, just redirect to chat page
    // In future implementation, pass the session ID to resume a specific session
    navigate('/chat', { state: { sessionId } });
  };

  return (
    <div className="min-h-screen flex flex-col bg-menova-beige bg-menova-pattern bg-cover">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 py-4 bg-white/90 shadow-sm backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4" onClick={() => navigate('/welcome')}>
          <img src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png" alt="MeNova" className="h-10 w-10 rounded-full" />
          <span className="text-xl font-semibold text-menova-green">MeNova</span>
        </div>
        {user && (
          <Avatar className="h-9 w-9 cursor-pointer" onClick={() => navigate('/profile')}>
            <AvatarImage src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png" alt="Profile" />
            <AvatarFallback className="bg-menova-green text-white">
              {user?.email?.[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </nav>

      {/* Breadcrumb */}
      <div className="px-6 pt-4 max-w-6xl mx-auto w-full">
        <BreadcrumbTrail currentPath="/chat-history" />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col space-y-8 px-6 py-8 max-w-6xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-menova-text">Chat History</h1>
        
        {/* Start New Session Button */}
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Review your past conversations or start a new session.</p>
          <Button
            onClick={handleStartNewSession}
            className="bg-menova-green text-white hover:bg-menova-green/90 flex items-center gap-2"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden">
              <img 
                src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png" 
                alt="MeNova" 
                className="w-full h-full object-cover" 
              />
            </div>
            Talk to MeNova
          </Button>
        </div>
        
        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Conversation History</CardTitle>
            <CardDescription>
              Browse your past chats with MeNova
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-4">Loading your conversations...</p>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">You haven't had any conversations yet.</p>
                <Button 
                  onClick={handleStartNewSession} 
                  className="bg-menova-green text-white hover:bg-menova-green/90 flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden">
                    <img 
                      src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png" 
                      alt="MeNova" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  Start Your First Conversation
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow 
                        key={session.id}
                        className={`cursor-pointer ${selectedSession?.id === session.id ? 'bg-green-50' : ''}`}
                        onClick={() => handleSessionClick(session)}
                      >
                        <TableCell>
                          {session.session_type === 'voice' ? (
                            <Volume2 size={18} className="text-menova-green" />
                          ) : (
                            <MessageCircle size={18} className="text-menova-green" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{getSessionTitle(session)}</TableCell>
                        <TableCell>{formatDate(session.started_at)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${session.ended_at ? 'bg-gray-100' : 'bg-green-100 text-green-800'}`}>
                            {session.ended_at ? 'Completed' : 'Active'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-menova-green text-menova-green hover:bg-menova-green/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartSession(session.id);
                            }}
                          >
                            {session.ended_at ? 'Review' : 'Resume'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Selected Session Details */}
        {selectedSession && sessionMessages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{getSessionTitle(selectedSession)}</CardTitle>
              <CardDescription>
                {formatDate(selectedSession.started_at)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollableContent maxHeight="320px" className="space-y-4 p-2">
                {sessionMessages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.sender === 'user' 
                          ? 'bg-menova-green/10 text-menova-text' 
                          : 'bg-white text-menova-text border border-gray-200'
                      }`}
                    >
                      {message.message}
                    </div>
                  </div>
                ))}
              </ScrollableContent>
              <div className="flex justify-center mt-4">
                <Button
                  onClick={() => handleStartSession(selectedSession.id)}
                  className="bg-menova-green text-white hover:bg-menova-green/90"
                >
                  {selectedSession.ended_at ? 'Start New Session' : 'Resume Session'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Chat Options Dialog */}
      <Dialog open={showChatOptions} onOpenChange={setShowChatOptions}>
        <DialogContent className="sm:max-w-md bg-menova-beige">
          <DialogHeader>
            <DialogTitle className="text-center">How would you like to chat with MeNova?</DialogTitle>
            <DialogDescription className="text-center">
              Choose your preferred mode of conversation
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button 
              onClick={() => handleChatOptionSelected('text')}
              className="flex flex-col items-center gap-3 h-auto py-6 bg-white hover:bg-white/80 text-menova-text border border-menova-green/30"
              variant="outline"
            >
              <MessageCircle className="h-8 w-8 text-menova-green" />
              <div className="text-center">
                <p className="font-medium">Text Chat</p>
                <p className="text-xs text-gray-500">Type your messages</p>
              </div>
            </Button>
            
            <Button 
              onClick={() => handleChatOptionSelected('voice')}
              className="flex flex-col items-center gap-3 h-auto py-6 bg-white hover:bg-white/80 text-menova-text border border-menova-green/30"
              variant="outline"
            >
              <Volume2 className="h-8 w-8 text-menova-green" />
              <div className="text-center">
                <p className="font-medium">Voice Chat</p>
                <p className="text-xs text-gray-500">Speak with MeNova</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatHistory;
