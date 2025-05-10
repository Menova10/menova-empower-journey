
import React from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { WeeklyProgress, categories } from '@/types/wellness';
import { Goal } from '@/types/wellness';

interface WeeklyProgressViewProps {
  loading: boolean;
  weeklyProgress: WeeklyProgress;
  weeklyGoals: Goal[];
}

export const WeeklyProgressView: React.FC<WeeklyProgressViewProps> = ({
  loading,
  weeklyProgress,
  weeklyGoals
}) => {
  // Format date for display
  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'EEE, MMM d');
  };

  return (
    <div className="bg-white/90 rounded-lg shadow-sm p-6 bg-gradient-to-br from-white to-green-50">
      <h2 className="text-xl font-semibold text-menova-text mb-4">Weekly Progress</h2>
      <p className="text-sm text-gray-600 mb-4">
        {format(startOfWeek(new Date()), 'MMM d')} - {format(endOfWeek(new Date()), 'MMM d, yyyy')}
      </p>
      
      {loading ? (
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-full mb-4"></div>
          <div className="h-64 bg-gray-200 rounded w-full"></div>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead>Nourish</TableHead>
              <TableHead>Center</TableHead>
              <TableHead>Play</TableHead>
              <TableHead>Goals</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.keys(weeklyProgress).sort().map((day) => {
              const dayGoals = weeklyGoals.filter(g => g.date === day);
              const completedCount = dayGoals.filter(g => g.completed).length;
              const totalCount = dayGoals.length;
              
              return (
                <TableRow key={day}>
                  <TableCell className="font-medium">{formatDateForDisplay(day)}</TableCell>
                  {categories.slice(0, 3).map(cat => (
                    <TableCell key={cat.value}>
                      {weeklyProgress[day][cat.value].total > 0 ? (
                        <div className="flex flex-col">
                          <Progress
                            value={weeklyProgress[day][cat.value].percentage}
                            className="h-2 mb-1"
                          />
                          <span className="text-xs text-gray-600">
                            {weeklyProgress[day][cat.value].completed}/{weeklyProgress[day][cat.value].total}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No goals</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={totalCount > 0 ? (completedCount / totalCount) * 100 : 0}
                        className="h-2 w-16"
                      />
                      <span className="text-xs">{completedCount}/{totalCount}</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
