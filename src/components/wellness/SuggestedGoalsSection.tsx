
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { SuggestedGoal, categories } from '@/types/wellness';

interface SuggestedGoalsSectionProps {
  suggestedGoals: SuggestedGoal[];
  loadingSuggestions: boolean;
  refreshKey: number;
  refreshSuggestions: () => void;
  addSuggestedGoal: (goal: SuggestedGoal) => void;
}

export const SuggestedGoalsSection: React.FC<SuggestedGoalsSectionProps> = ({
  suggestedGoals,
  loadingSuggestions,
  refreshKey,
  refreshSuggestions,
  addSuggestedGoal
}) => {
  const renderSuggestedGoals = () => {
    if (loadingSuggestions) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex items-center p-3 rounded-md bg-gray-100">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="ml-auto h-8 w-8 bg-gray-200 rounded-full"></div>
            </div>
          ))}
        </div>
      );
    }
    
    if (suggestedGoals.length === 0) {
      return (
        <p className="text-gray-600 text-center py-4">No suggested goals available. Click refresh to generate new suggestions.</p>
      );
    }
    
    return (
      <ul className="space-y-2">
        {suggestedGoals.map((goal, index) => {
          // Find the category display information
          const categoryInfo = categories.find(c => c.value === goal.category) || categories[3];
          
          return (
            <li 
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center gap-2 flex-1">
                <div className={`w-2 h-2 rounded-full ${categoryInfo.color.replace('text-', 'bg-').split(' ')[1]}`}></div>
                <span className="text-gray-700">{goal.text}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => addSuggestedGoal(goal)}
                className="text-menova-green hover:bg-menova-green/10 rounded-full"
              >
                <Plus size={20} />
              </Button>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="bg-white/90 rounded-lg shadow-sm p-6 mb-8 bg-gradient-to-br from-white to-green-50">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-menova-text">Suggested Goals</h2>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={refreshSuggestions}
          className="border-menova-green text-menova-green hover:bg-menova-green/10"
        >
          <RefreshCw size={18} className={`${refreshKey > 0 ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      {renderSuggestedGoals()}
    </div>
  );
};
