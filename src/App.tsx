
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Welcome from './pages/Welcome';
import Waitlist from './pages/Waitlist';
import SymptomTracker from './pages/SymptomTracker';
import NotFound from './pages/NotFound';
import Chat from './pages/Chat';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/waitlist" element={<Waitlist />} />
        <Route path="/symptom-tracker" element={<SymptomTracker />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
