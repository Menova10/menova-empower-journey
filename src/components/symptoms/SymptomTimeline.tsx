import { format } from 'date-fns';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { symptoms, SymptomEntry, sourceBadges, Symptom } from '@/types/symptoms';
import { useState } from 'react';

interface SymptomTimelineProps {
  loading: boolean;
  symptomHistory: SymptomEntry[];
}

const SymptomTimeline = ({ loading, symptomHistory }: SymptomTimelineProps) => {
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');

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

  const openNotes = (notes: string, symptomName: string) => {
    setSelectedNote(notes);
    setDialogTitle(`Notes for ${symptomName}`);
    setIsDialogOpen(true);
  };

  // Parse detected symptoms from Voice Assistant notes
  const parseVoiceAssistantNotes = (notes: string) => {
    if (!notes || !notes.includes('DETECTED SYMPTOMS:')) return null;
    
    const detectedLine = notes.split('\n').find(line => line.startsWith('DETECTED SYMPTOMS:'));
    const intensityLine = notes.split('\n').find(line => line.startsWith('INTENSITY:'));
    
    if (!detectedLine) return null;
    
    const detectedSymptoms = detectedLine.replace('DETECTED SYMPTOMS:', '').trim();
    const intensity = intensityLine ? intensityLine.replace('INTENSITY:', '').trim() : null;
    
    const hasDetectedSymptoms = detectedSymptoms !== 'None specifically identified';
    
    return (
      <div className={`mt-2 border-t pt-2 ${hasDetectedSymptoms ? 'border-menova-green/30' : 'border-gray-200'}`}>
        <p className="text-xs">
          <span className="font-semibold text-menova-green">Detected:</span> 
          {hasDetectedSymptoms ? (
            <span className="font-medium text-menova-text">{detectedSymptoms}</span>
          ) : (
            <span className="text-gray-500">None specifically identified</span>
          )}
        </p>
        {intensity && (
          <p className="text-xs">
            <span className="font-semibold text-menova-green">Intensity:</span> 
            <span className={`${intensity === '5/5' ? 'text-red-500 font-medium' : 'text-menova-text'}`}>{intensity}</span>
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4">
        {symptomHistory.map((entry, index) => {
          // Find the symptom in our predefined list or create a custom one
          const symptom: Symptom = symptoms.find(s => s.id === entry.symptom) || 
            { 
              id: entry.symptom, 
              name: entry.symptom.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '), 
              color: '#A5D6A7',
              tip: 'No specific tip available for this symptom.' 
            };

          const date = new Date(entry.recorded_at);
          const source = sourceBadges[entry.source as keyof typeof sourceBadges] || 
            { label: entry.source.toUpperCase(), class: 'bg-gray-200 text-gray-700' };
          
          // Format notes based on source
          let formattedNotes = entry.notes;
          if (entry.source === 'chat' || entry.source === 'voice_assistant' || entry.source === 'voice_auto') {
            formattedNotes = entry.notes
              .replace('Detected in chat: ', '')
              .replace('Auto-detected from voice conversation: ', '')
              .replace(/^"(.*)"$/, '$1');
          }
          
          // Parse detected symptoms from notes if available
          const detectedSymptomInfo = parseVoiceAssistantNotes(entry.notes);
          
          return (
            <div 
              key={`${entry.id}-${index}`}
              className="p-3 rounded-lg border border-menova-green/10 bg-white/70 hover:bg-white/90 hover:border-menova-green/30 transition-all animate-fadeIn"
              style={{ 
                animationDelay: `${index * 0.1}s`,
                boxShadow: '0 2px 10px rgba(165, 214, 167, 0.1)'
              }}
            >
              <div className="flex justify-between mb-1 items-center">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{symptom.name}</span>
                  <span 
                    className={`text-xs font-bold py-0.5 px-2 rounded-full ${source.class}`}
                  >
                    {source.label}
                  </span>
                </div>
                <span 
                  className="rounded-full px-2 py-0.5 text-white text-sm font-medium"
                  style={{ backgroundColor: symptom.color }}
                >
                  {entry.intensity}/5
                </span>
              </div>
              
              {/* Add timestamp and notes */}
              <div className="mt-2 text-sm text-gray-600">
                <div className="flex justify-between items-center">
                  <span>{format(date, 'MMM d, yyyy h:mm a')}</span>
                  {formattedNotes && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openNotes(formattedNotes, symptom.name)}
                      className="text-menova-green hover:text-menova-green/80"
                    >
                      View Notes
                    </Button>
                  )}
                </div>
                
                {/* Show detected symptoms info for chat/voice entries */}
                {(entry.source === 'chat' || entry.source === 'voice_assistant' || entry.source === 'voice_auto') && detectedSymptomInfo}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Notes dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <DialogDescription className="mt-4 whitespace-pre-wrap">
            {selectedNote}
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SymptomTimeline;
