
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
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
import MeNovaChatButton from './components/MeNovaChatButton';
import Header from './components/Header';
import { VapiProvider } from './contexts/VapiContext';
import { Toaster } from './components/ui/toaster';
import './App.css';

function App() {
  const currentPath = window.location.pathname;
  const hideFloatingButton = currentPath === '/chat' || currentPath === '/text-chat';

  return (
    <VapiProvider>
      <Router>
        <div className="min-h-screen flex flex-col">
          <Header />
          <div className="pt-24 flex-1">
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          
          {/* Global floating MeNovaChatButton that appears on all pages except the Chat and TextChat pages */}
          {!hideFloatingButton && (
            <div className="z-40">
              <MeNovaChatButton variant="floating" />
            </div>
          )}
        </div>
        <Toaster />
      </Router>
    </VapiProvider>
  );
}

export default App;
