import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { 
  timePeriods, 
  SymptomEntry, 
  ChartDataPoint, 
  GroupedSymptoms 
} from '@/types/symptoms';
import { format } from 'date-fns';

export async function fetchSymptomHistory(selectedSymptom: string, selectedPeriod: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast({
        title: "Not logged in",
        description: "Please log in to view symptom history",
        variant: "destructive",
      });
      return { data: [], error: new Error("Not logged in") };
    }
    
    // Get date range based on selected period
    const period = timePeriods.find(p => p.id === selectedPeriod);
    const { start, end } = period ? period.getRange() : { start: new Date(), end: new Date() };
    
    // Build query
    let query = supabase
      .from('symptom_tracking')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('recorded_at', start.toISOString())
      .lte('recorded_at', end.toISOString())
      .order('recorded_at', { ascending: false });
    
    // Add symptom filter if not "all"
    if (selectedSymptom !== 'all') {
      query = query.eq('symptom', selectedSymptom);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return { data: data || [], error: null };
  } catch (error) {
    console.error("Error fetching symptom history:", error);
    toast({
      title: "Error",
      description: "Failed to load symptom history",
      variant: "destructive",
    });
    return { data: [], error };
  }
}

export function prepareChartData(data: SymptomEntry[], selectedPeriod: string): ChartDataPoint[] {
  // Group by date and symptom, calculate average intensity
  const grouped: GroupedSymptoms = data.reduce((acc: GroupedSymptoms, item) => {
    // Format date based on selected period
    let dateKey;
    const date = new Date(item.recorded_at);
    
    if (selectedPeriod === 'daily') {
      dateKey = format(date, 'HH:mm');
    } else if (selectedPeriod === 'weekly') {
      dateKey = format(date, 'EEE, MMM d'); // Include month and day
    } else {
      dateKey = format(date, 'MMM dd');
    }
    
    if (!acc[dateKey]) {
      acc[dateKey] = {};
    }
    
    if (!acc[dateKey][item.symptom]) {
      acc[dateKey][item.symptom] = {
        sum: 0,
        count: 0,
        rawDate: date, // Store the raw date for proper sorting
      };
    }
    
    acc[dateKey][item.symptom].sum += item.intensity;
    acc[dateKey][item.symptom].count += 1;
    
    return acc;
  }, {});
  
  // Convert grouped data to chart format
  const chartData: ChartDataPoint[] = Object.entries(grouped).map(([date, symptoms]) => {
    const entry: ChartDataPoint = { 
      date,
      rawDate: Object.values(symptoms)[0]?.rawDate || new Date() // Use the raw date from any symptom for sorting
    };
    
    // Calculate average for each symptom
    Object.entries(symptoms).forEach(([symptom, { sum, count }]) => {
      entry[symptom] = Math.round(sum / count);
    });
    
    return entry;
  });
  
  // Sort by actual date value, not string
  chartData.sort((a, b) => {
    return (a.rawDate?.getTime() || 0) - (b.rawDate?.getTime() || 0);
  });
  
  return chartData;
}

/**
 * Calculate symptom trends over the selected period
 * Returns the direction of change for each symptom (increasing, decreasing, or stable)
 */
export function calculateSymptomTrends(chartData: ChartDataPoint[]): Record<string, string> {
  const trends: Record<string, string> = {};
  
  if (chartData.length <= 1) {
    return trends;
  }
  
  // Get all symptom types present in the data
  const symptomTypes = new Set<string>();
  chartData.forEach(point => {
    Object.keys(point).forEach(key => {
      if (key !== 'date' && key !== 'rawDate') {
        symptomTypes.add(key);
      }
    });
  });
  
  // Calculate trend for each symptom type using a more sophisticated approach
  symptomTypes.forEach(symptom => {
    // Get all valid data points for this symptom
    const validPoints = chartData
      .filter(point => typeof point[symptom] === 'number')
      .sort((a, b) => (a.rawDate?.getTime() || 0) - (b.rawDate?.getTime() || 0));
    
    if (validPoints.length >= 2) {
      // Use the last 5 points (or all points if less than 5) to determine trend
      const recentPoints = validPoints.slice(-5);
      
      // Calculate average change between consecutive points
      let totalChange = 0;
      for (let i = 1; i < recentPoints.length; i++) {
        const currentValue = recentPoints[i][symptom] as number;
        const previousValue = recentPoints[i - 1][symptom] as number;
        totalChange += currentValue - previousValue;
      }
      
      const averageChange = totalChange / (recentPoints.length - 1);
      
      // Determine trend direction with a small threshold to avoid noise
      const CHANGE_THRESHOLD = 0.3;
      if (Math.abs(averageChange) < CHANGE_THRESHOLD) {
        trends[symptom] = 'stable';
      } else if (averageChange > 0) {
        trends[symptom] = 'increasing';
      } else {
        trends[symptom] = 'decreasing';
      }
    } else if (validPoints.length === 1) {
      // If only one point, mark as stable
      trends[symptom] = 'stable';
    }
  });
  
  return trends;
}
