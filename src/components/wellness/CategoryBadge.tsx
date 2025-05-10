
import React, { useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { categories } from '@/types/wellness';

interface CategoryBadgeProps {
  category: string;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  const categoryData = categories.find(c => c.value === category) || categories[3]; // Default to 'general'
  
  // Use useMemo to prevent unnecessary re-renders of the icon component
  const Icon = useMemo(() => {
    switch (categoryData.icon) {
      case 'Apple': return LucideIcons.Apple;
      case 'Brain': return LucideIcons.Brain;
      case 'ActivitySquare': return LucideIcons.ActivitySquare;
      case 'Plus': 
      default: return LucideIcons.Plus;
    }
  }, [categoryData.icon]);
  
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${categoryData.color}`}>
      <Icon size={12} />
      <span>{categoryData.label}</span>
    </div>
  );
};
