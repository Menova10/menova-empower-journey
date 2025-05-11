
import React from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { ChartDataPoint } from '@/types/symptoms';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { getSymptomColor } from '@/types/symptoms';

interface SymptomChartProps {
  loading: boolean;
  chartData: ChartDataPoint[];
  selectedSymptom: string;
}

// Custom tick formatter to display dates in a readable format
const formatXAxisTick = (tickItem: string) => {
  try {
    // First, check if the string already contains a date format (like "Mon" or "May 12")
    if (tickItem.length <= 3 || tickItem.includes(' ')) {
      return tickItem;
    }
    
    // Try to parse as ISO date
    const date = parseISO(tickItem);
    if (isValid(date)) {
      return format(date, 'MMM d');
    }
    
    return tickItem;
  } catch (e) {
    return tickItem;
  }
};

const SymptomChart = ({ loading, chartData, selectedSymptom }: SymptomChartProps) => {
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-pulse text-menova-green/60">Loading chart data...</div>
      </div>
    );
  }
  
  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-center">
        <div className="text-gray-500">
          <p className="mb-2">No symptom data available for this period.</p>
          <p className="text-sm">Try selecting a different time period or log your symptoms.</p>
        </div>
      </div>
    );
  }

  // Determine which lines to show based on the selected symptom
  const displayedSymptoms = selectedSymptom === 'all'
    ? [...new Set(chartData.flatMap(point => 
        Object.keys(point).filter(key => key !== 'date')))]
    : [selectedSymptom];

  // Add date tooltips
  const renderTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dateLabel = label;
      
      return (
        <div className="bg-white p-3 shadow-md rounded-md border border-gray-100">
          <p className="text-xs font-medium mb-1">{dateLabel}</p>
          {payload.map((item: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: item.stroke }}>
              {item.name}: {item.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickFormatter={formatXAxisTick} 
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis 
            domain={[0, 5]} 
            ticks={[0, 1, 2, 3, 4, 5]} 
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={renderTooltip} />
          <Legend wrapperStyle={{ paddingTop: 10 }} />
          
          {displayedSymptoms.map(symptomId => (
            <Line
              key={symptomId}
              type="monotone"
              dataKey={symptomId}
              name={symptomId.charAt(0).toUpperCase() + symptomId.slice(1).replace('_', ' ')}
              stroke={getSymptomColor(symptomId)}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 1, fill: 'white' }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SymptomChart;
