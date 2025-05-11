
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { symptoms, ChartDataPoint, getSymptomColor } from '@/types/symptoms';

interface SymptomChartProps {
  loading: boolean;
  chartData: ChartDataPoint[];
  selectedSymptom: string;
}

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

  return (
    <div className="h-64">
      <ChartContainer 
        config={{
          hot_flashes: { color: "#FFDEE2" },
          sleep: { color: "#A5D6A7" },
          mood: { color: "#d9b6d9" },
          energy: { color: "#FDE1D3" },
          anxiety: { color: "#b1cfe6" }
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
            <XAxis 
              dataKey="date"
              tickLine={false}
              axisLine={{ stroke: '#e5e5e5' }}
              padding={{ left: 10, right: 10 }}
            />
            <YAxis 
              tickLine={false}
              axisLine={{ stroke: '#e5e5e5' }}
              domain={[0, 5]}
              ticks={[1, 2, 3, 4, 5]}
              label={{ value: 'Intensity', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent formatter={(value, name) => {
                  const symptom = symptoms.find(s => s.id === name);
                  return [value, symptom?.name || name];
                }} />
              }
            />
            {selectedSymptom === 'all' ? (
              symptoms.map(symptom => (
                <Bar
                  key={symptom.id}
                  dataKey={symptom.id}
                  maxBarSize={50}
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((_, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={getSymptomColor(symptom.id)}
                    />
                  ))}
                </Bar>
              ))
            ) : (
              <Bar
                dataKey={selectedSymptom}
                maxBarSize={50}
                radius={[4, 4, 0, 0]}
                fill={getSymptomColor(selectedSymptom)}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
};

export default SymptomChart;
