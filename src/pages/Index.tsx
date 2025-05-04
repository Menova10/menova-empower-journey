
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import VapiAssistant from '@/components/VapiAssistant';
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const birdAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleFeatureClick = (path: string) => {
    if (isAuthenticated) {
      navigate(path);
    } else {
      setShowLoginModal(true);
    }
  };

  // Handle bird chirping audio
  useEffect(() => {
    // Create audio element for bird chirping
    const audio = new Audio('/assets/bird-chirping.mp3'); // Replace with your actual audio file path
    audio.loop = true;
    birdAudioRef.current = audio;
    
    // Play audio when component mounts
    const playAudio = () => {
      audio.play().catch(error => {
        console.log("Audio play failed:", error);
      });
    };
    
    // Only play if user is not authenticated
    if (!isAuthenticated) {
      playAudio();
    }
    
    // Cleanup function to stop audio when component unmounts
    return () => {
      if (birdAudioRef.current) {
        birdAudioRef.current.pause();
        birdAudioRef.current.currentTime = 0;
      }
    };
  }, []);
  
  // Stop audio when user logs in
  useEffect(() => {
    if (isAuthenticated && birdAudioRef.current) {
      birdAudioRef.current.pause();
      birdAudioRef.current.currentTime = 0;
    }
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen flex flex-col bg-menova-beige bg-menova-pattern bg-cover">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 py-4 bg-white/90 shadow-sm backdrop-blur-sm sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-menova-green">MeNova</h1>
        <div className="space-x-2">
          <Button
            onClick={() => setShowLoginModal(true)}
            variant="outline"
            className="border-menova-green text-menova-green hover:bg-menova-green/10"
          >
            Login
          </Button>
          <Button
            onClick={() => navigate('/waitlist')}
            className="bg-menova-green text-white hover:bg-menova-green/90"
          >
            Join Waitlist
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col space-y-8 px-6 py-8 max-w-6xl mx-auto w-full">
        {/* Hero Section */}
        <section className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="md:w-1/2 space-y-4">
            <div className="space-y-2">
              <h2 className="text-lg font-medium text-menova-green">Your Menopause Companion</h2>
              <h1 className="text-4xl md:text-5xl font-bold text-menova-text leading-tight">
                Still You.<br />Just More
              </h1>
            </div>
            <p className="text-lg text-gray-600 max-w-md">
              MeNova provides empathetic support, personalized tracking, and evidence-based resources for your unique menopause journey.
            </p>
            <Button
              onClick={() => handleFeatureClick('/chat')}
              className="bg-menova-green text-white hover:bg-menova-green/90 rounded-full px-8 py-6 text-lg"
            >
              Speak to MeNova
            </Button>
          </div>
          
          <div className="md:w-1/2 flex justify-center relative">
            <div className="relative">
              {/* Circular clip for the character image */}
              <div className="rounded-full overflow-hidden w-64 h-64 border-4 border-white shadow-lg">
                <img
                  src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png"
                  alt="MeNova Character"
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Speech bubble - moved to bottom right */}
              <div className="absolute bottom-0 right-0 bg-white px-4 py-2 rounded-2xl text-menova-text shadow-md">
                <p className="font-medium">Hi, I'm MeNova!</p>
                <div className="absolute bottom-8 right-4 transform rotate-45 w-4 h-4 bg-white"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Educational Content */}
        <section className="pt-6">
          <h2 className="text-2xl font-semibold text-menova-text mb-4">
            Understand Your Journey
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-menova-lightgreen rounded-lg text-center hover:shadow-md transition-shadow">
              <span className="text-3xl block mb-2">🌿</span>
              <h3 className="text-lg font-medium text-menova-text">Perimenopause</h3>
              <p className="text-sm text-gray-600 mt-2">
                Hormone fluctuations, irregular cycles, and the beginning of your transition.
              </p>
            </div>
            <div className="p-5 bg-menova-softpink rounded-lg text-center hover:shadow-md transition-shadow">
              <span className="text-3xl block mb-2">🌸</span>
              <h3 className="text-lg font-medium text-menova-text">Menopause</h3>
              <p className="text-sm text-gray-600 mt-2">
                12+ months without periods, embracing your natural evolution.
              </p>
            </div>
            <div className="p-5 bg-menova-softpeach rounded-lg text-center hover:shadow-md transition-shadow">
              <span className="text-3xl block mb-2">✨</span>
              <h3 className="text-lg font-medium text-menova-text">Postmenopause</h3>
              <p className="text-sm text-gray-600 mt-2">
                A new chapter of clarity, strength, and wisdom.
              </p>
            </div>
          </div>
        </section>

        {/* Wellness Section */}
        <section className="pt-2">
          <h2 className="text-2xl font-semibold text-menova-text mb-4">
            Your Daily Companion
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => handleFeatureClick('/symptom-tracker')}
              className="p-5 bg-white rounded-lg text-center hover:shadow-md transition-shadow flex flex-col items-center"
            >
              <span className="text-3xl block mb-2">🌱</span>
              <h3 className="text-base font-medium text-menova-text">Symptom Tracker</h3>
              <p className="text-xs text-gray-600 mt-1">
                Track patterns and gain insights
              </p>
            </button>
            <button
              onClick={() => handleFeatureClick('/chat')}
              className="p-5 bg-white rounded-lg text-center hover:shadow-md transition-shadow flex flex-col items-center"
            >
              <span className="text-3xl block mb-2">💬</span>
              <h3 className="text-base font-medium text-menova-text">Empathetic Chat</h3>
              <p className="text-xs text-gray-600 mt-1">
                Talk through what you're experiencing
              </p>
            </button>
            <button
              onClick={() => handleFeatureClick('/mood-check')}
              className="p-5 bg-white rounded-lg text-center hover:shadow-md transition-shadow flex flex-col items-center"
            >
              <span className="text-3xl block mb-2">😊</span>
              <h3 className="text-base font-medium text-menova-text">Daily Check-In</h3>
              <p className="text-xs text-gray-600 mt-1">
                Monitor your emotional wellbeing
              </p>
            </button>
            <button
              onClick={() => handleFeatureClick('/resources')}
              className="p-5 bg-white rounded-lg text-center hover:shadow-md transition-shadow flex flex-col items-center"
            >
              <span className="text-3xl block mb-2">📚</span>
              <h3 className="text-base font-medium text-menova-text">Resource Vault</h3>
              <p className="text-xs text-gray-600 mt-1">
                Evidence-based knowledge at your fingertips
              </p>
            </button>
          </div>
        </section>
        
        {/* Testimonial Section */}
        <section className="pt-2">
          <div className="bg-white/80 p-6 rounded-lg shadow-sm backdrop-blur-sm">
            <h3 className="font-medium text-menova-text mb-3 text-center">What Women Say About MeNova</h3>
            <div className="italic text-gray-600 text-center">
              "MeNova has been my compass during this transformative journey. Having a companion who truly understands has made all the difference."
            </div>
            <div className="text-right text-sm text-menova-green mt-2">— Sarah, 52</div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white/90 backdrop-blur-sm py-4 px-6 text-center text-sm text-gray-500">
        <p>© 2025 MeNova. Your companion through menopause.</p>
      </footer>

      {/* Fixed floating chatbot */}
      <div className="fixed bottom-20 right-6 z-40">
        <div className="bg-menova-green hover:bg-menova-green/90 text-white rounded-full p-3 shadow-lg cursor-pointer flex items-center justify-center">
          <span className="text-sm font-medium">Text Chat</span>
        </div>
      </div>

      {/* Floating Voice Assistant */}
      <div className="fixed bottom-6 right-6 z-50">
        <VapiAssistant />
      </div>

      {/* Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md bg-white/90 backdrop-blur-sm p-6">
          <div className="flex flex-col items-center space-y-4">
            <div 
              className="text-2xl font-bold text-menova-green cursor-pointer"
              onClick={() => setShowLoginModal(false)}
            >
              MeNova
            </div>
            
            <div className="rounded-full overflow-hidden w-20 h-20 border-2 border-menova-green mb-2">
              <img
                src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png"
                alt="MeNova"
                className="w-full h-full object-cover"
              />
            </div>
            
            <h3 className="text-xl font-medium text-menova-text">Welcome to MeNova</h3>
            <p className="text-sm text-gray-600 text-center mb-2">
              Your personal menopause companion
            </p>
            
            <div className="flex gap-4 mt-4 w-full">
              <Button
                onClick={() => navigate('/login')}
                className="flex-1 border-menova-green text-menova-green hover:bg-menova-green/10"
                variant="outline"
              >
                Login
              </Button>
              <Button
                onClick={() => navigate('/waitlist')}
                className="flex-1 bg-menova-green text-white hover:bg-menova-green/90"
              >
                Join Waitlist
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
