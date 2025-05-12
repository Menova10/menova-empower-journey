
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
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-100 transition-shadow hover:shadow-md">
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Today's Progress</h2>
        <div className="flex items-center gap-2">
          <div className="w-16 h-16 rounded-full flex items-center justify-center relative">
            {/* Progress ring */}
            <svg className="w-16 h-16 rotate-[-90deg]" viewBox="0 0 100 100">
              <circle 
                cx="50" cy="50" r="45" 
                fill="none" 
                stroke="#f3f4f6" 
                strokeWidth="10"
              />
              <circle 
                cx="50" cy="50" r="45" 
                fill="none" 
                stroke="#4ade80" 
                strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 45 * progress/100} ${2 * Math.PI * 45 * (100-progress)/100}`}
                strokeLinecap="round"
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-800">
              {progress}%
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-1 mb-4">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Progress</span>
          <span>{completedGoals} of {totalGoals} goals</span>
        </div>
        <Progress 
          value={progress} 
          className="h-2 bg-gray-100" 
        />
      </div>

      {/* Category Progress - Updated visualization */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.slice(0, 3).map(category => {
          const catData = categoryCounts[category.value] || { completed: 0, total: 0, percentage: 0 };
          const IconComponent = categoryIcons[category.icon as keyof typeof categoryIcons];
          const categoryColor = category.color.includes('orange') ? '#f97316' : 
                               category.color.includes('teal') ? '#14b8a6' : 
                               category.color.includes('red') ? '#ef4444' : '#4ade80';
          
          return (
            <div key={category.value} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm hover:shadow transition-all">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center relative`}>
                  {/* Category progress ring */}
                  <svg className="w-12 h-12 rotate-[-90deg]" viewBox="0 0 100 100">
                    <circle 
                      cx="50" cy="50" r="40" 
                      fill="none" 
                      stroke="#f3f4f6" 
                      strokeWidth="12"
                    />
                    <circle 
                      cx="50" cy="50" r="40" 
                      fill="none" 
                      stroke={categoryColor} 
                      strokeWidth="12"
                      strokeDasharray={`${2 * Math.PI * 40 * catData.percentage/100} ${2 * Math.PI * 40 * (100-catData.percentage)/100}`}
                      strokeLinecap="round"
                      opacity="0.8"
                    />
                  </svg>
                  {/* Center icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {IconComponent && <IconComponent size={24} className="text-gray-700" />}
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{category.label}</div>
                  <div className="text-xs text-gray-500 flex justify-between">
                    <span>{catData.completed} of {catData.total || 0}</span>
                    <span className="font-medium" style={{ color: categoryColor }}>
                      {catData.percentage}%
                    </span>
                  </div>
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
          className="border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh Progress
        </Button>
      </div>
    </div>
  );
};
