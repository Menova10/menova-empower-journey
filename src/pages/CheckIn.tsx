
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Volume2, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useAuthStore } from '@/stores/authStore';

const CheckIn = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalSessions, setTotalSessions] = useState(0);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  const { user, isAuthenticated } = useAuthStore();

  // Check authentication without immediate redirect
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we already have session data from Supabase
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
          // We have a session, so fetch the user's sessions
          if (session.user.id) {
            fetchSessionsCount(session.user.id);
            fetchSessions(session.user.id);
          }
        } else {
          // No session, but don't redirect yet - we'll handle this in the UI
          console.log("No authenticated session found");
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
      } finally {
        setIsAuthChecking(false);
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Fetch total count of user sessions
  const fetchSessionsCount = async (userId: string) => {
    try {
      const { count, error } = await supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching session count:', error);
      } else {
        setTotalSessions(count || 0);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Fetch paginated user sessions
  const fetchSessions = async (userId: string) => {
    try {
      setLoading(true);
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching sessions:', error);
        toast({
          title: "Error",
          description: "Failed to load your sessions.",
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
    // Check authentication before showing chat options
    if (!isAuthenticated) {
      // If not authenticated, redirect to login with returnTo set to this page
      navigate('/login', { state: { returnTo: '/check-in' } });
      return;
    }
    
    setShowChatOptions(true);
  };
  
  // Start voice or text chat session
  const handleChatOptionSelected = (type: 'voice' | 'text') => {
    setShowChatOptions(false);
    
    // Directly navigate to chat without authentication check (already checked in handleStartNewSession)
    navigate('/chat', { 
      state: { 
        sessionType: type,
        authenticated: true
      } 
    });
  };

  // Resume or start a new session
  const handleStartSession = (sessionId?: string) => {
    // Check authentication first
    if (!isAuthenticated) {
      navigate('/login', { state: { returnTo: '/check-in' } });
      return;
    }
    
    // Get session type if resuming
    let sessionType = 'text'; // Default
    if (sessionId && sessions) {
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        sessionType = session.session_type;
      }
    }
    
    navigate('/chat', { 
      state: { 
        sessionId,
        sessionType,
        authenticated: true
      } 
    });
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= Math.ceil(totalSessions / pageSize)) {
      setCurrentPage(newPage);
    }
  };

  // Handle page size change
  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Calculate total pages
  const totalPages = Math.ceil(totalSessions / pageSize);

  // Render login prompt if not authenticated
  if (!isAuthChecking && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-menova-beige to-white bg-menova-pattern bg-cover">
        {/* Navbar */}
        <nav className="flex justify-between items-center px-6 py-4 bg-white/90 shadow-sm backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png" alt="MeNova" className="h-10 w-10 rounded-full" />
            <span className="text-xl font-semibold text-menova-green">MeNova</span>
          </div>
        </nav>

        {/* Login prompt */}
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md border-none shadow-lg backdrop-blur-md bg-white/90">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <img 
                  src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png" 
                  alt="MeNova" 
                  className="w-20 h-20 mx-auto rounded-full border-2 border-menova-green"
                />
              </div>
              <CardTitle className="text-2xl font-bold text-menova-green">Sign In Required</CardTitle>
              <CardDescription>
                Please sign in to access your check-in history and chat with MeNova
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => navigate('/login', { state: { returnTo: '/check-in' } })}
                className="w-full bg-menova-green hover:bg-menova-green/90"
              >
                Sign In
              </Button>
              <p className="text-center text-sm text-gray-500">
                Don't have an account? 
                <Button 
                  variant="link" 
                  className="text-menova-green p-0 h-auto font-normal ml-1"
                  onClick={() => navigate('/login', { state: { returnTo: '/check-in', tab: 'signup' } })}
                >
                  Sign Up
                </Button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-menova-beige to-white bg-menova-pattern bg-cover">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 py-4 bg-white/90 shadow-sm backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('/welcome')}>
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
        <BreadcrumbTrail currentPath="/check-in" />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col space-y-8 px-6 py-8 max-w-6xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-menova-text bg-clip-text text-transparent bg-gradient-to-r from-menova-green to-teal-600">
              Daily Check-In
            </h1>
            <p className="text-gray-600 mt-2">
              Review your past check-ins or start a new session with MeNova.
            </p>
          </div>
          
          {/* Talk to MeNova Button */}
          <Button
            onClick={handleStartNewSession}
            className="bg-menova-green text-white hover:bg-menova-green/90 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-2 px-5 py-6 rounded-xl"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white">
              <img 
                src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png" 
                alt="MeNova" 
                className="w-full h-full object-cover" 
              />
            </div>
            <span className="text-lg font-medium">Talk to MeNova</span>
          </Button>
        </div>
        
        {/* Sessions Table Card */}
        <Card className="overflow-hidden border-none shadow-md">
          <CardHeader className="bg-menova-green/5 border-b">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <CardTitle className="text-menova-text">Your Check-In History</CardTitle>
                <CardDescription>
                  Browse your past sessions with MeNova
                </CardDescription>
              </div>
              
              {/* Page Size Selector */}
              {totalSessions > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Show:</span>
                  <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-16 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-500">per page</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-menova-green"></div>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-16 px-4">
                <img 
                  src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png" 
                  alt="MeNova" 
                  className="w-20 h-20 mx-auto mb-4 rounded-full border-4 border-menova-lightgreen/30"
                />
                <p className="text-gray-500 mb-6 text-lg">You haven't had any check-ins with MeNova yet.</p>
                <Button 
                  onClick={handleStartNewSession} 
                  className="bg-menova-green text-white hover:bg-menova-green/90 flex items-center gap-2 mx-auto px-6 py-2 rounded-full"
                >
                  Start Your First Check-In
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
                        className={`cursor-pointer hover:bg-gray-50 transition-colors ${selectedSession?.id === session.id ? 'bg-menova-lightgreen/20' : ''}`}
                        onClick={() => handleSessionClick(session)}
                      >
                        <TableCell>
                          {session.session_type === 'voice' ? (
                            <div className="bg-menova-lightgreen/20 p-2 rounded-full w-8 h-8 flex items-center justify-center">
                              <Volume2 size={16} className="text-menova-green" />
                            </div>
                          ) : (
                            <div className="bg-menova-lightgreen/20 p-2 rounded-full w-8 h-8 flex items-center justify-center">
                              <MessageCircle size={16} className="text-menova-green" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{getSessionTitle(session)}</TableCell>
                        <TableCell>{formatDate(session.started_at)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            session.ended_at 
                              ? 'bg-gray-100 text-gray-600' 
                              : 'bg-green-100 text-green-800'
                          }`}>
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
          
          {/* Pagination */}
          {totalSessions > pageSize && (
            <CardFooter className="flex justify-center py-4 bg-gray-50">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {/* Show page numbers */}
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    // Logic for showing page numbers around current page
                    let pageNum = currentPage;
                    if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    // Skip if page number is out of range
                    if (pageNum <= 0 || pageNum > totalPages) return null;
                    
                    return (
                      <PaginationItem key={i}>
                        <Button
                          variant={pageNum === currentPage ? "default" : "outline"}
                          className={`w-9 h-9 p-0 ${
                            pageNum === currentPage 
                              ? "bg-menova-green text-white" 
                              : "text-menova-text hover:bg-menova-lightgreen/20"
                          }`}
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </CardFooter>
          )}
        </Card>
        
        {/* Selected Session Details */}
        {selectedSession && sessionMessages.length > 0 && (
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-menova-green/5 border-b">
              <CardTitle className="text-menova-text">{getSessionTitle(selectedSession)}</CardTitle>
              <CardDescription>
                {formatDate(selectedSession.started_at)}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto rounded-lg bg-gray-50 p-4">
                {sessionMessages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.sender !== 'user' && (
                      <div className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0">
                        <img
                          src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png"
                          alt="MeNova"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div 
                      className={`max-w-[80%] p-3 rounded-lg shadow-sm ${
                        message.sender === 'user' 
                          ? 'bg-menova-green text-white' 
                          : 'bg-white text-menova-text border border-gray-100'
                      }`}
                    >
                      {message.message}
                      <div className="text-xs opacity-70 mt-1 text-right">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {message.sender === 'user' && (
                      <div className="w-8 h-8 rounded-full overflow-hidden ml-2 flex-shrink-0 invisible">
                        {/* Placeholder for alignment */}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-6">
                <Button
                  onClick={() => handleStartSession(selectedSession.id)}
                  className="bg-menova-green text-white hover:bg-menova-green/90 px-6 py-2 rounded-full shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
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
        <DialogContent className="sm:max-w-md bg-gradient-to-b from-menova-beige to-white">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-menova-text">
              How would you like to chat with MeNova?
            </DialogTitle>
            <DialogDescription className="text-center">
              Choose your preferred mode of conversation
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-6">
            <Button 
              onClick={() => handleChatOptionSelected('text')}
              className="flex flex-col items-center gap-4 h-auto py-8 bg-white hover:bg-white/90 text-menova-text border border-menova-green/30 hover:border-menova-green shadow-md hover:shadow-lg transition-all"
              variant="outline"
            >
              <div className="w-16 h-16 rounded-full bg-menova-lightgreen/20 flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-menova-green" />
              </div>
              <div className="text-center">
                <p className="font-medium text-lg">Text Chat</p>
                <p className="text-sm text-gray-500">Type your messages</p>
              </div>
            </Button>
            
            <Button 
              onClick={() => handleChatOptionSelected('voice')}
              className="flex flex-col items-center gap-4 h-auto py-8 bg-white hover:bg-white/90 text-menova-text border border-menova-green/30 hover:border-menova-green shadow-md hover:shadow-lg transition-all"
              variant="outline"
            >
              <div className="w-16 h-16 rounded-full bg-menova-lightgreen/20 flex items-center justify-center">
                <Volume2 className="h-8 w-8 text-menova-green" />
              </div>
              <div className="text-center">
                <p className="font-medium text-lg">Voice Chat</p>
                <p className="text-sm text-gray-500">Speak with MeNova</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CheckIn;
