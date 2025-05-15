import { BrowserRouter as Router, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Welcome from './pages/Welcome';
import Waitlist from './pages/Waitlist';
import SymptomTracker from './pages/SymptomTracker';
import NotFound from './pages/NotFound';
import Chat from './pages/Chat';
import Community from './pages/Community';
import Resources from './pages/Resources';
import ArticleView from './pages/ArticleView';
import ChatHistory from './pages/ChatHistory';
import TodaysWellness from './pages/TodaysWellness';
import DailyCheckIn from './pages/DailyCheckIn';
import TextChat from './pages/TextChat';
import ApiStatus from './pages/ApiStatus';
import MeNovaChatButton from './components/MeNovaChatButton';
import { VapiProvider } from './contexts/VapiContext';
import { Toaster } from './components/ui/toaster';
import './App.css';

// This component contains all the routes
const MainContent = () => {
  const location = useLocation();
  const isVoiceChatHidden = location.pathname === '/chat' || location.pathname === '/text-chat';
  
  return (
    <div className="flex-1">
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/waitlist" element={<Waitlist />} />
        <Route path="/symptom-tracker" element={<SymptomTracker />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/text-chat" element={<TextChat />} />
        <Route path="/community" element={<Community />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/article/:articleId" element={<ArticleView />} />
        <Route path="/chat-history" element={<ChatHistory />} />
        <Route path="/todays-wellness" element={<TodaysWellness />} />
        <Route path="/check-in" element={<DailyCheckIn />} />
        <Route path="/api-status" element={<ApiStatus />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      {/* Global floating MeNovaChatButton that appears on all pages except the Chat and TextChat pages */}
      {!isVoiceChatHidden && (
        <div className="fixed bottom-6 right-6 z-40">
          <MeNovaChatButton variant="floating" />
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <VapiProvider>
      <Router>
        <div className="min-h-screen flex flex-col">
          <MainContent />
        </div>
        <Toaster />
      </Router>
    </VapiProvider>
  );
}

export default App;
