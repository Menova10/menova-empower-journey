
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { initializeAuth, setupAuthListener } from "@/stores/authStore";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Waitlist from "./pages/Waitlist";
import Profile from "./pages/Profile";
import Welcome from "./pages/Welcome";
import NotFound from "./pages/NotFound";
import Chat from "./pages/Chat";
import SymptomTracker from "./pages/SymptomTracker";

const queryClient = new QueryClient();

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
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/waitlist" element={<Waitlist />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/symptom-tracker" element={<SymptomTracker />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
