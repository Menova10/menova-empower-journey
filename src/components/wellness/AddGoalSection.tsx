
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Apple, Brain, ActivitySquare } from 'lucide-react';
import { categories } from '@/types/wellness';

interface AddGoalSectionProps {
  newGoal: string;
  setNewGoal: (goal: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  addGoal: () => void;
}

export const AddGoalSection: React.FC<AddGoalSectionProps> = ({
  newGoal,
  setNewGoal,
  selectedCategory,
  setSelectedCategory,
  addGoal
}) => {
  // Map the icon string to the actual icon component
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Apple': return Apple;
      case 'Brain': return Brain;
      case 'ActivitySquare': return ActivitySquare;
      case 'Plus': 
      default: return Plus;
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#f0faf0] to-[#fef6f0] rounded-lg shadow-sm p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Goal</h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-1">
            Goal Description
          </label>
          <input 
            type="text" 
            id="goal"
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            placeholder="Enter a new wellness goal"
            className="w-full p-3 border border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400/50 bg-white/70"
            onKeyDown={(e) => e.key === 'Enter' && addGoal()}
          />
        </div>
        
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {categories.slice(0, 3).map(category => {
              const Icon = getIcon(category.icon);
              const isSelected = selectedCategory === category.value;
              
              // Custom colors for each category
              let bgColor = '';
              let hoverBgColor = '';
              let borderColor = '';
              
              if (category.value === 'nutrition') {
                bgColor = isSelected ? 'bg-green-100/70' : 'bg-green-50/50';
                hoverBgColor = 'hover:bg-green-100/50';
                borderColor = isSelected ? 'border-green-400' : 'border-transparent';
              } else if (category.value === 'mental') {
                bgColor = isSelected ? 'bg-blue-100/70' : 'bg-blue-50/50';
                hoverBgColor = 'hover:bg-blue-100/50';
                borderColor = isSelected ? 'border-blue-400' : 'border-transparent';
              } else if (category.value === 'physical') {
                bgColor = isSelected ? 'bg-orange-100/70' : 'bg-orange-50/50';
                hoverBgColor = 'hover:bg-orange-100/50';
                borderColor = isSelected ? 'border-orange-400' : 'border-transparent';
              }
              
              return (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => setSelectedCategory(category.value)}
                  className={`p-3 rounded-md flex items-center justify-center gap-2 transition-all
                    ${bgColor} ${hoverBgColor} border-2 ${borderColor}`}
                >
                  <Icon size={18} />
                  <span>{category.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        <Button 
          onClick={addGoal} 
          disabled={!newGoal.trim()}
          className="w-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Add Goal
        </Button>
      </div>
    </div>
  );
};
