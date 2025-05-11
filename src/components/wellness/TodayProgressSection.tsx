
import React, { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { CategoryProgress, categories } from '@/types/wellness';
import * as LucideIcons from 'lucide-react';

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
  // Define category icons using useMemo to prevent re-renders
  const categoryIcons = useMemo(() => {
    return {
      Apple: LucideIcons.Apple,
      Brain: LucideIcons.Brain,
      ActivitySquare: LucideIcons.ActivitySquare
    };
  }, []);
  
  return (
    <div className="bg-white/90 rounded-lg shadow-md p-6 mb-6 bg-gradient-to-br from-white to-green-50 hover:shadow-lg transition-shadow duration-300">
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-semibold text-menova-text">Today's Progress</h2>
        <div className="flex items-center gap-2">
          <span className="text-lg font-medium">{progress}%</span>
          <div className="w-12 h-12 rounded-full flex items-center justify-center border-4 border-menova-green/20" style={{
            background: `conic-gradient(#4ade80 ${progress}%, #f3f4f6 0)`
          }}>
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sm font-bold">
              {progress}%
            </div>
          </div>
        </div>
      </div>
      
      <Progress 
        value={progress} 
        className="h-5 bg-gray-100 mb-2" 
      />
      
      <div className="mt-1 text-sm text-gray-600 text-center">
        {completedGoals} of {totalGoals} goals completed
      </div>

      {/* Category Progress */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.slice(0, 3).map(category => {
          const catData = categoryCounts[category.value] || { completed: 0, total: 0, percentage: 0 };
          const IconComponent = categoryIcons[category.icon as keyof typeof categoryIcons];
          
          return (
            <div key={category.value} className="flex flex-col items-center bg-white/60 p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-300">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${category.color.replace('bg-', 'bg-opacity-30 bg-')}`}>
                {IconComponent && <IconComponent size={24} className={category.color.replace('bg-', 'text-').replace(' text-', '')} />}
              </div>
              <div className="font-medium">{category.label}</div>
              <div className="text-xs text-gray-600 mb-2">
                {catData.completed} of {catData.total || 0} ({catData.percentage}%)
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="h-2.5 rounded-full" 
                     style={{ width: `${catData.percentage}%`, 
                              backgroundColor: category.color.includes('orange') ? '#f97316' : 
                                              category.color.includes('teal') ? '#14b8a6' : 
                                              category.color.includes('red') ? '#ef4444' : '#9ca3af' }}>
                </div>
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
