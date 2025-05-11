
import { format } from 'date-fns';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { symptoms, SymptomEntry, sourceBadges } from '@/types/symptoms';

interface SymptomTimelineProps {
  loading: boolean;
  symptomHistory: SymptomEntry[];
}

const SymptomTimeline = ({ loading, symptomHistory }: SymptomTimelineProps) => {
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-pulse text-menova-green/60">Loading timeline data...</div>
      </div>
    );
  }
  
  if (symptomHistory.length === 0) {
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
    <TooltipProvider>
      <div className="space-y-4">
        {symptomHistory.map((entry, index) => {
          const symptom = symptoms.find(s => s.id === entry.symptom);
          const date = new Date(entry.recorded_at);
          const source = sourceBadges[entry.source as keyof typeof sourceBadges] || 
            { label: entry.source.toUpperCase(), class: 'bg-gray-200 text-gray-700' };
          
          return (
            <div 
              key={entry.id}
              className="p-3 rounded-lg border border-menova-green/10 bg-white/70 hover:bg-white/90 hover:border-menova-green/30 transition-all animate-fadeIn"
              style={{ 
                animationDelay: `${index * 0.1}s`,
                boxShadow: '0 2px 10px rgba(165, 214, 167, 0.1)'
              }}
            >
              <div className="flex justify-between mb-1 items-center">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{symptom?.name || entry.symptom}</span>
                  <span 
                    className={`text-xs font-bold py-0.5 px-2 rounded-full ${source.class}`}
                  >
                    {source.label}
                  </span>
                </div>
                <span 
                  className="rounded-full px-2 py-0.5 text-white text-sm font-medium"
                  style={{ 
                    backgroundColor: symptom?.color.replace('bg-', '').startsWith('#') 
                      ? symptom?.color.replace('bg-', '') 
                      : '#A5D6A7'
                  }}
                >
                  {entry.intensity}/5
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  {format(date, 'MMM d, yyyy')} at {format(date, 'h:mm a')}
                </span>
                {entry.notes && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="underline cursor-help">Notes</span>
                    </TooltipTrigger>
                    <TooltipContent className="p-2 max-w-xs">
                      {entry.notes}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export default SymptomTimeline;
