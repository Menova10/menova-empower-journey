
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
      dateKey = format(date, 'EEE');
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
      };
    }
    
    acc[dateKey][item.symptom].sum += item.intensity;
    acc[dateKey][item.symptom].count += 1;
    
    return acc;
  }, {});
  
  // Convert grouped data to chart format
  const chartData: ChartDataPoint[] = Object.entries(grouped).map(([date, symptoms]) => {
    const entry: ChartDataPoint = { date };
    
    // Calculate average for each symptom
    Object.entries(symptoms).forEach(([symptom, { sum, count }]) => {
      entry[symptom] = Math.round(sum / count);
    });
    
    return entry;
  });
  
  // Sort by date
  chartData.sort((a, b) => {
    return a.date.localeCompare(b.date);
  });
  
  return chartData;
}
