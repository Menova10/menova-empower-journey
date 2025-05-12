
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
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow duration-300">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Today's Goals</h2>
      
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex items-center p-3 rounded-md bg-gray-50">
              <div className="h-6 w-6 bg-gray-200 rounded-full mr-3"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : goals.length > 0 ? (
        <ul className="space-y-2 max-h-[400px] overflow-y-auto pr-2 divide-y divide-gray-100">
          {goals.map((goal, idx) => (
            <li 
              key={goal.id}
              className={`flex items-center p-3 rounded-md transition-all ${
                goal.completed 
                  ? 'bg-green-50 text-gray-800' 
                  : 'bg-white hover:bg-gray-50'
              } animate-fade-in border border-gray-100`}
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <button
                onClick={() => toggleGoalCompletion(goal.id, goal.completed)}
                className={`w-6 h-6 rounded-full mr-3 flex items-center justify-center border ${
                  goal.completed 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : 'border-gray-300 hover:border-green-500'
                }`}
                disabled={goal.completed}
              >
                {goal.completed && <Check size={14} />}
              </button>
              <span 
                className={`flex-1 ${
                  goal.completed ? 'line-through text-gray-500' : 'text-gray-700'
                }`}
              >
                {goal.goal}
              </span>
              <CategoryBadge category={goal.category} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-gray-600 text-center py-8 bg-gray-50 rounded-lg">
          <p>No goals for today. Start by adding some goals above!</p>
        </div>
      )}
    </div>
  );
};
