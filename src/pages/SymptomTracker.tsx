
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MeNovaLogo from '@/components/MeNovaLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Flower, Leaf, Activity, Clock } from 'lucide-react';
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
        <main className="flex-1 flex flex-col w-full px-3 md:px-6 relative z-10">
          <div className="max-w-5xl mx-auto w-full">
            <div className="flex items-center mb-6 gap-2 mt-4">
              <Flower className="text-menova-green h-8 w-8" />
              <h1 className="text-2xl font-bold text-menova-text">Symptom Tracker</h1>
            </div>
            
            {/* Quote */}
            {!successTip && (
              <div 
                className="mb-6 text-center animate-fadeIn"
              >
                <p className="font-['Dancing_Script'],cursive text-lg text-menova-text italic text-shadow">
                  "Listening to your body is an act of self-compassion. Each symptom tracked is a step toward better wellness."
                </p>
              </div>
            )}
            
            {/* Success message with personalized tip */}
            <SuccessMessage tip={successTip} />
            
            {/* Symptom Rating Form */}
            <div className="animate-fadeIn">
              <SymptomForm 
                onSubmitSuccess={handleSubmitSuccess}
                onRefreshHistory={refreshSymptomHistory}
              />
            </div>
            
            {/* History and Trends Section */}
            <div className="animate-fadeIn space-y-6 my-8">
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
              <Tabs defaultValue="chart">
                <TabsList className="bg-menova-green/10 border border-menova-green/20">
                  <TabsTrigger value="chart" className="data-[state=active]:bg-menova-green data-[state=active]:text-white">
                    Trend Chart
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="data-[state=active]:bg-menova-green data-[state=active]:text-white">
                    Timeline
                  </TabsTrigger>
                </TabsList>
                
                {/* Chart View */}
                <TabsContent value="chart" className="animate-fadeIn">
                  <Card className="backdrop-blur-md bg-white/80 border border-menova-green/20 shadow-sm">
                    <CardHeader className="pb-0">
                      <CardTitle className="text-lg">Symptom Intensity Over Time</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <SymptomChart 
                        loading={loading}
                        chartData={chartData}
                        selectedSymptom={selectedSymptom}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Timeline View */}
                <TabsContent value="timeline" className="animate-fadeIn">
                  <Card className="backdrop-blur-md bg-white/80 border border-menova-green/20 shadow-sm">
                    <CardHeader className="pb-0">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Symptom Timeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <SymptomTimeline 
                        loading={loading}
                        symptomHistory={symptomHistory}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
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
