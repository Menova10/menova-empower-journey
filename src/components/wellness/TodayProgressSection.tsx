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
    <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 transition-all duration-300 hover:shadow-lg h-full">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Today's Progress</h2>
          <p className="text-lg text-gray-600">Your wellness journey at a glance</p>
        </div>
        <div className="mt-6 md:mt-0">
          <div className="w-32 h-32 rounded-full flex items-center justify-center relative bg-menova-green/5">
            {/* Progress ring */}
            <svg className="w-32 h-32 rotate-[-90deg]" viewBox="0 0 100 100">
              <circle 
                cx="50" cy="50" r="45" 
                fill="none" 
                stroke="#f3f4f6" 
                strokeWidth="8"
              />
              <circle 
                cx="50" cy="50" r="45" 
                fill="none" 
                stroke="#4ade80" 
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 45 * progress/100} ${2 * Math.PI * 45 * (100-progress)/100}`}
                strokeLinecap="round"
                className="transition-all duration-500 ease-in-out"
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-800">{progress}%</span>
              <span className="text-sm text-gray-500 mt-1">Complete</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {Object.entries(categoryCounts).map(([category, count]) => {
          const Icon = categoryIcons[category as keyof typeof categoryIcons];
          const categoryColor = category === 'Apple' ? 'text-orange-500' : 
                              category === 'Brain' ? 'text-teal-500' : 
                              'text-purple-500';
          const bgColor = category === 'Apple' ? 'bg-orange-50' : 
                         category === 'Brain' ? 'bg-teal-50' : 
                         'bg-purple-50';
          const borderColor = category === 'Apple' ? 'border-orange-100' : 
                            category === 'Brain' ? 'border-teal-100' : 
                            'border-purple-100';
          
          return (
            <div 
              key={category} 
              className={`p-6 rounded-xl ${bgColor} border ${borderColor} transition-all duration-300 hover:shadow-md`}
            >
              <div className="flex items-center gap-4 mb-4">
                {Icon && <Icon className={`${categoryColor} w-8 h-8`} />}
                <div>
                  <h3 className="text-lg font-medium text-gray-800">{category}</h3>
                  <p className="text-sm text-gray-600">
                    {count.completed}/{count.total} Goals
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <div className="h-3 bg-white rounded-full overflow-hidden shadow-inner">
                  <div 
                    className={`h-full ${
                      category === 'Apple' ? 'bg-orange-500' : 
                      category === 'Brain' ? 'bg-teal-500' : 
                      'bg-purple-500'
                    } transition-all duration-500 ease-in-out`}
                    style={{ width: `${(count.completed / count.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-center">
        <Button 
          onClick={forceRefreshWellnessGoals}
          variant="outline"
          className="border-menova-green text-menova-green hover:bg-menova-green/10 flex items-center gap-3 px-8 py-3 text-lg"
          disabled={loading}
        >
          <RefreshCw size={20} className={`${loading ? 'animate-spin' : ''} transition-all duration-300`} />
          Refresh Progress
        </Button>
      </div>
    </div>
  );
};
