
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { initializeAuth, setupAuthListener } from "@/stores/authStore";
import ChatInterface from "./components/ChatInterface";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Waitlist from "./pages/Waitlist";
import Profile from "./pages/Profile";
import Welcome from "./pages/Welcome";
import Dashboard from "./pages/Dashboard";
import SymptomTracker from "./pages/SymptomTracker";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Apply global background style to all pages
const AppBackground = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col bg-menova-beige bg-menova-pattern bg-cover bg-fixed bg-blend-soft-light opacity-95">
      {children}
    </div>
  );
};

const App = () => {
  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = setupAuthListener();
    
    // Initialize auth state
    initializeAuth();
    
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppBackground>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/waitlist" element={<Waitlist />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/symptom-tracker" element={<SymptomTracker />} />
              <Route path="/chat" element={<Chat />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <ChatInterface />
          </AppBackground>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
