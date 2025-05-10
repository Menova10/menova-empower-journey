
import React from 'react';
import { format, startOfMonth } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { MonthlyProgress, categories } from '@/types/wellness';

interface MonthlyProgressViewProps {
  loading: boolean;
  monthlyProgress: MonthlyProgress;
}

export const MonthlyProgressView: React.FC<MonthlyProgressViewProps> = ({
  loading,
  monthlyProgress
}) => {
  return (
    <div className="bg-white/90 rounded-lg shadow-sm p-6 bg-gradient-to-br from-white to-green-50">
      <h2 className="text-xl font-semibold text-menova-text mb-4">Monthly Progress</h2>
      <p className="text-sm text-gray-600 mb-4">
        {format(startOfMonth(new Date()), 'MMMM yyyy')}
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
              <TableHead>Period</TableHead>
              <TableHead>Nourish</TableHead>
              <TableHead>Center</TableHead>
              <TableHead>Play</TableHead>
              <TableHead>Overall</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.keys(monthlyProgress).map((week) => {
              const weekTotal = categories.slice(0, 3).reduce(
                (acc, cat) => acc + monthlyProgress[week][cat.value].total, 0
              );
              const weekCompleted = categories.slice(0, 3).reduce(
                (acc, cat) => acc + monthlyProgress[week][cat.value].completed, 0
              );
              const weekPercentage = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;
              
              return (
                <TableRow key={week}>
                  <TableCell className="font-medium">{week}</TableCell>
                  {categories.slice(0, 3).map(cat => (
                    <TableCell key={cat.value}>
                      {monthlyProgress[week][cat.value].total > 0 ? (
                        <div className="flex flex-col">
                          <Progress
                            value={monthlyProgress[week][cat.value].percentage}
                            className="h-2 mb-1"
                          />
                          <span className="text-xs text-gray-600">
                            {monthlyProgress[week][cat.value].completed}/{monthlyProgress[week][cat.value].total}
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
                        value={weekPercentage}
                        className="h-2 w-16"
                      />
                      <span className="text-xs">{weekCompleted}/{weekTotal}</span>
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
