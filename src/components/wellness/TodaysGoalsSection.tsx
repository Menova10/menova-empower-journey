import React from 'react';
import { Check } from 'lucide-react';
import { Goal } from '@/types/wellness';
import { CategoryBadge } from './CategoryBadge';

interface TodaysGoalsSectionProps {
  goals: Goal[];
  loading: boolean;
  toggleGoalCompletion: (id: string, completed: boolean) => void;
}

export const TodaysGoalsSection: React.FC<TodaysGoalsSectionProps> = ({
  goals,
  loading,
  toggleGoalCompletion
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 transition-all duration-300 hover:shadow-lg h-full">
      <div className="flex flex-col h-full">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Today's Goals</h2>
          <p className="text-lg text-gray-600">Track your daily wellness activities</p>
        </div>
        
        {loading ? (
          <div className="space-y-6 flex-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex items-center p-6 rounded-xl bg-gray-50 border border-gray-100">
                <div className="h-6 w-6 bg-gray-200 rounded-full mr-4"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : goals.length > 0 ? (
          <div className="space-y-4 flex-1 overflow-y-auto pr-2 max-h-[calc(100vh-24rem)]">
            {goals.map((goal, index) => (
              <div
                key={index}
                className={`group p-6 rounded-xl transition-all duration-300 ${
                  goal.completed 
                    ? 'bg-menova-green/5 border border-menova-green/20' 
                    : 'bg-white border border-gray-100 hover:border-menova-green/20 hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div 
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 cursor-pointer transition-all duration-300 ${
                      goal.completed 
                        ? 'bg-menova-green border-menova-green text-white flex items-center justify-center' 
                        : 'border-gray-300 group-hover:border-menova-green'
                    }`}
                    onClick={() => toggleGoalCompletion(goal.id, goal.completed)}
                  >
                    {goal.completed && (
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-3.5 w-3.5" 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
                        <path 
                          fillRule="evenodd" 
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-base font-medium ${
                      goal.completed ? 'text-menova-green line-through' : 'text-gray-800'
                    }`}>
                      {goal.goal}
                    </p>
                    <p className={`text-sm mt-1.5 ${
                      goal.completed ? 'text-menova-green/60' : 'text-gray-500'
                    }`}>
                      Category: {goal.category.charAt(0).toUpperCase() + goal.category.slice(1)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
            <div className="text-gray-400">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-16 w-16 mx-auto mb-6" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
                />
              </svg>
              <p className="text-xl font-medium text-gray-600 mb-2">No goals for today</p>
              <p className="text-base text-gray-500">Add some goals to start tracking your progress</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
