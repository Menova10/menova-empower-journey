
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { Goal, motivationalMessages } from '@/types/wellness';

interface GoalCompletionModalProps {
  completedGoal: Goal | null;
  setCompletedGoal: (goal: Goal | null) => void;
  openAssistant: () => void;
}

export const GoalCompletionModal: React.FC<GoalCompletionModalProps> = ({
  completedGoal,
  setCompletedGoal,
  openAssistant
}) => {
  const navigate = useNavigate();
  
  if (!completedGoal) return null;
  
  const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center animate-scale-in">
        <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <Check size={32} className="text-menova-green" />
        </div>
        
        <h3 className="text-xl font-bold text-menova-text mb-2">Goal Completed!</h3>
        <p className="text-gray-600 mb-6">{randomMessage}</p>
        
        <div className="space-y-3">
          <Button 
            onClick={() => navigate('/check-in')}
            variant="outline" 
            className="w-full border-menova-green text-menova-green hover:bg-menova-green/10"
          >
            Go to Daily Check-In
          </Button>
          
          <Button 
            onClick={() => navigate('/resources')}
            variant="outline" 
            className="w-full border-menova-green text-menova-green hover:bg-menova-green/10"
          >
            Explore Resources
          </Button>
          
          <Button 
            onClick={() => {
              setCompletedGoal(null);
              openAssistant();
            }}
            className="w-full bg-menova-green hover:bg-menova-green/90 text-white"
          >
            Chat with MeNova
          </Button>
          
          <Button 
            onClick={() => setCompletedGoal(null)}
            variant="ghost" 
            className="w-full text-gray-500 hover:text-gray-700"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
