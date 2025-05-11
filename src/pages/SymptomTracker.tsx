
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MeNovaLogo from '@/components/MeNovaLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Flower, Smile, Book, Activity } from 'lucide-react';
import { fetchSymptomHistory, prepareChartData } from '@/services/symptomService';
import { SymptomEntry, ChartDataPoint } from '@/types/symptoms';
import SymptomForm from '@/components/symptoms/SymptomForm';
import SymptomChart from '@/components/symptoms/SymptomChart';
import SymptomTimeline from '@/components/symptoms/SymptomTimeline';
import SymptomFilters from '@/components/symptoms/SymptomFilters';
import SuccessMessage from '@/components/symptoms/SuccessMessage';
import ConfettiEffect from '@/components/symptoms/ConfettiEffect';

const SymptomTracker = () => {
  const navigate = useNavigate();
  
  // UI state
  const [showConfetti, setShowConfetti] = useState(false);
  const [successTip, setSuccessTip] = useState<string | null>(null);
  
  // History and filtering state
  const [symptomHistory, setSymptomHistory] = useState<SymptomEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSymptom, setSelectedSymptom] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('weekly');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [activeTab, setActiveTab] = useState<string>("today");

  // Handle success after submitting the form
  const handleSubmitSuccess = (tip: string) => {
    setSuccessTip(tip);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  // Fetch symptom history based on filters
  const refreshSymptomHistory = async () => {
    setLoading(true);
    const { data, error } = await fetchSymptomHistory(selectedSymptom, selectedPeriod);
    
    if (!error) {
      setSymptomHistory(data);
      const formattedData = prepareChartData(data, selectedPeriod);
      setChartData(formattedData);
    }
    
    setLoading(false);
  };

  // Fetch symptom history on mount and when filters change
  useEffect(() => {
    refreshSymptomHistory();
  }, [selectedSymptom, selectedPeriod]);

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-menova-beige bg-menova-pattern bg-cover relative overflow-hidden">
        {/* Floral overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-cover bg-center bg-[url('/lovable-uploads/14905dcb-7154-41d0-92c2-f134f2aa1117.png')]" />
        
        {/* Confetti effect */}
        <ConfettiEffect show={showConfetti} />

        {/* Navbar */}
        <nav className="flex justify-between items-center px-4 md:px-6 py-4 bg-white/90 shadow-sm backdrop-blur-sm sticky top-0 z-10">
          <MeNovaLogo />
          <Button
            variant="outline"
            onClick={() => navigate('/welcome')}
            className="border-menova-green text-menova-green hover:bg-menova-green/10"
          >
            Back to Dashboard
          </Button>
        </nav>

        {/* Main Content */}
        <main className="flex-1 flex flex-col w-full px-3 md:px-6 lg:px-10 relative z-10">
          <div className="max-w-6xl mx-auto w-full py-4">
            <div className="flex items-center mb-6 gap-2 mt-2">
              <Flower className="text-menova-green h-8 w-8" />
              <h1 className="text-2xl font-bold text-menova-text">Symptom Tracker</h1>
            </div>
            
            {/* Success message with personalized tip */}
            <SuccessMessage tip={successTip} />
            
            {/* Main Tabs Interface */}
            <Tabs defaultValue="today" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-menova-green/10 border border-menova-green/20 w-full justify-start mb-6">
                <TabsTrigger value="today" className="data-[state=active]:bg-menova-green data-[state=active]:text-white flex gap-2 py-2 px-4">
                  <Smile className="h-4 w-4" /> How are you feeling today?
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-menova-green data-[state=active]:text-white flex gap-2 py-2 px-4">
                  <Book className="h-4 w-4" /> Symptom History
                </TabsTrigger>
              </TabsList>
              
              {/* Today's Symptoms Tab */}
              <TabsContent value="today" className="animate-fadeIn">
                {!successTip && (
                  <div className="mb-6 text-center">
                    <p className="font-['Dancing_Script'],cursive text-lg text-menova-text italic text-shadow">
                      "Listening to your body is an act of self-compassion. Each symptom tracked is a step toward better wellness."
                    </p>
                  </div>
                )}
                <div className="animate-fadeIn">
                  <SymptomForm 
                    onSubmitSuccess={(tip) => {
                      handleSubmitSuccess(tip);
                      // Switch to history tab after submission
                      setActiveTab("history");
                    }}
                    onRefreshHistory={refreshSymptomHistory}
                  />
                </div>
              </TabsContent>
              
              {/* History Tab */}
              <TabsContent value="history" className="animate-fadeIn">
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-menova-text flex items-center gap-2">
                    <Activity className="h-5 w-5 text-menova-green" />
                    Your Symptom History
                  </h2>
                  
                  {/* Filters */}
                  <SymptomFilters 
                    selectedSymptom={selectedSymptom}
                    setSelectedSymptom={setSelectedSymptom}
                    selectedPeriod={selectedPeriod}
                    setSelectedPeriod={setSelectedPeriod}
                  />
                  
                  {/* Charts and Timeline */}
                  <Card className="backdrop-blur-md bg-white/80 border border-menova-green/20 shadow-sm">
                    <CardContent className="pt-6">
                      <Tabs defaultValue="chart" className="w-full">
                        <TabsList className="bg-menova-green/10 border border-menova-green/20 mb-4">
                          <TabsTrigger value="chart" className="data-[state=active]:bg-menova-green data-[state=active]:text-white">
                            Trend Chart
                          </TabsTrigger>
                          <TabsTrigger value="timeline" className="data-[state=active]:bg-menova-green data-[state=active]:text-white">
                            Timeline
                          </TabsTrigger>
                        </TabsList>
                        
                        {/* Chart View */}
                        <TabsContent value="chart" className="animate-fadeIn">
                          <div className="pt-2">
                            <h3 className="text-lg font-medium mb-2">Symptom Intensity Over Time</h3>
                            <SymptomChart 
                              loading={loading}
                              chartData={chartData}
                              selectedSymptom={selectedSymptom}
                            />
                          </div>
                        </TabsContent>
                        
                        {/* Timeline View */}
                        <TabsContent value="timeline" className="animate-fadeIn">
                          <div className="pt-2">
                            <h3 className="text-lg font-medium mb-2">Symptom Timeline</h3>
                            <SymptomTimeline 
                              loading={loading}
                              symptomHistory={symptomHistory}
                            />
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
        
        {/* Add custom styles for the animations */}
        <style>
          {`
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(165, 214, 167, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(165, 214, 167, 0); }
            100% { box-shadow: 0 0 0 0 rgba(165, 214, 167, 0); }
          }
          .text-shadow {
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          }
          @keyframes fall {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(360deg); opacity: 0.2; }
          }
          .animate-fall {
            animation: fall 3s ease-in forwards;
          }
          .animate-fadeIn {
            animation: fadeIn 0.6s ease-out forwards;
          }
          @keyframes fadeIn {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .animate-scaleIn {
            animation: scaleIn 0.3s ease-out forwards;
          }
          @keyframes scaleIn {
            0% { opacity: 0; transform: scale(0.9); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}
        </style>
      </div>
    </TooltipProvider>
  );
};

export default SymptomTracker;
