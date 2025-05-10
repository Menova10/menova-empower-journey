
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { RefreshCw, Apple, Brain, ActivitySquare } from 'lucide-react';
import { CategoryProgress, categories } from '@/types/wellness';

interface TodayProgressSectionProps {
  progress: number;
  completedGoals: number;
  totalGoals: number;
  categoryCounts: CategoryProgress;
  forceRefreshWellnessGoals: () => Promise<void>;
  loading: boolean;
}

export const TodayProgressSection: React.FC<TodayProgressSectionProps> = ({
  progress,
  completedGoals,
  totalGoals,
  categoryCounts,
  forceRefreshWellnessGoals,
  loading
}) => {
  // Map the icon string to the actual icon component
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Apple': return Apple;
      case 'Brain': return Brain;
      case 'ActivitySquare': return ActivitySquare;
      default: return Apple;
    }
  };
  
  return (
    <div className="bg-white/90 rounded-lg shadow-sm p-6 mb-8 bg-gradient-to-br from-white to-green-50">
      <div className="flex justify-between mb-2">
        <h2 className="text-xl font-semibold text-menova-text">Today's Progress</h2>
        <span className="text-lg font-medium">{progress}%</span>
      </div>
      
      <Progress 
        value={progress} 
        className="h-4 bg-gray-100" 
      />
      
      <div className="mt-3 text-sm text-gray-600 text-center">
        {completedGoals} of {totalGoals} goals completed
      </div>

      {/* Category Progress */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.slice(0, 3).map(category => {
          const catData = categoryCounts[category.value] || { completed: 0, total: 0, percentage: 0 };
          const Icon = getIcon(category.icon);
          
          return (
            <div key={category.value} className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${category.color.replace('bg-', 'bg-opacity-20 bg-')}`}>
                <Icon size={24} className={category.color.replace('bg-', 'text-').replace(' text-', '')} />
              </div>
              <div className="font-medium">{category.label}</div>
              <div className="text-xs text-gray-600">
                {catData.completed} of {catData.total || 0} ({catData.percentage}%)
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 flex justify-center">
        <Button 
          onClick={forceRefreshWellnessGoals}
          variant="outline"
          className="border-menova-green text-menova-green hover:bg-menova-green/10 flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh Progress
        </Button>
      </div>
    </div>
  );
};
