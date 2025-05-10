
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
    <div className="bg-white/90 rounded-lg shadow-sm p-6 mb-8 bg-gradient-to-br from-white to-green-50">
      <h2 className="text-xl font-semibold text-menova-text mb-4">Add New Goal</h2>
      
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
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-menova-green/50"
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
              return (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => setSelectedCategory(category.value)}
                  className={`p-3 rounded-md flex items-center justify-center gap-2 transition-all
                    ${selectedCategory === category.value 
                      ? `${category.color} border-2 border-${category.color.split(' ')[1].replace('text-', '')}` 
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
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
          className="w-full bg-menova-green hover:bg-menova-green/90 text-white flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Add Goal
        </Button>
      </div>
    </div>
  );
};
