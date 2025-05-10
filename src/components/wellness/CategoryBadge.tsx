
import React from 'react';
import { Apple, Brain, ActivitySquare, Plus } from 'lucide-react';
import { categories } from '@/types/wellness';

interface CategoryBadgeProps {
  category: string;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  const categoryData = categories.find(c => c.value === category) || categories[3]; // Default to 'general'
  
  // Map the icon string to the actual icon component
  const getIcon = () => {
    switch (categoryData.icon) {
      case 'Apple': return Apple;
      case 'Brain': return Brain;
      case 'ActivitySquare': return ActivitySquare;
      case 'Plus': 
      default: return Plus;
    }
  };
  
  const Icon = getIcon();
  
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${categoryData.color}`}>
      <Icon size={12} />
      <span>{categoryData.label}</span>
    </div>
  );
};
