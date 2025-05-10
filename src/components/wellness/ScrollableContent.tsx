
import React, { ReactNode } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ScrollableContentProps {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
}

export const ScrollableContent: React.FC<ScrollableContentProps> = ({ 
  children, 
  className = '', 
  maxHeight = '80vh' 
}) => {
  return (
    <ScrollArea className={`${className}`} style={{ maxHeight }}>
      <div className="pr-3">
        {children}
      </div>
    </ScrollArea>
  );
};
