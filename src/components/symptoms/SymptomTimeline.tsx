import { format } from 'date-fns';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { symptoms, SymptomEntry, sourceBadges } from '@/types/symptoms';
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
    
    return (
      <div className="mt-2 text-xs">
        <p><span className="font-semibold">Detected Symptoms:</span> {detectedSymptoms !== 'None specifically identified' ? detectedSymptoms : 'None specifically identified'}</p>
        {intensity && <p><span className="font-semibold">Intensity:</span> {intensity}</p>}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4">
        {symptomHistory.map((entry, index) => {
          const symptom = symptoms.find(s => s.id === entry.symptom);
          const date = new Date(entry.recorded_at);
          const source = sourceBadges[entry.source as keyof typeof sourceBadges] || 
            { label: entry.source.toUpperCase(), class: 'bg-gray-200 text-gray-700' };
          
          const isVoiceAssistant = entry.symptom === 'voice_assistant' || entry.source === 'voice_assistant';
          const parsedVoiceInfo = isVoiceAssistant && entry.notes ? parseVoiceAssistantNotes(entry.notes) : null;
          
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
                  {format(date, 'EEEE, MMM d, yyyy')} at {format(date, 'h:mm a')}
                </span>
                {entry.notes && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="px-2 py-1 h-auto text-xs underline text-menova-green hover:text-menova-green/80"
                    onClick={() => openNotes(entry.notes!, symptom?.name || entry.symptom)}
                  >
                    View Notes
                  </Button>
                )}
              </div>
              {parsedVoiceInfo}
            </div>
          );
        })}
      </div>
      
      {/* Dialog for displaying notes */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {selectedNote && selectedNote.includes('DETECTED SYMPTOMS:') ? (
              // Format voice assistant notes specially
              <div className="space-y-4">
                {selectedNote.split('\n\n').map((section, idx) => {
                  if (idx === 0) {
                    // This is the metadata section
                    return (
                      <div key={idx} className="bg-menova-green/10 p-3 rounded-md">
                        {section.split('\n').map((line, lineIdx) => (
                          <p key={lineIdx} className="mb-1"><strong>{line.split(':')[0]}:</strong> {line.split(':').slice(1).join(':')}</p>
                        ))}
                      </div>
                    );
                  } else {
                    // This is the conversation
                    return (
                      <div key={idx} className="whitespace-pre-wrap font-mono text-sm">
                        {section}
                      </div>
                    );
                  }
                })}
              </div>
            ) : (
              // Regular notes
              <div className="whitespace-pre-wrap">{selectedNote}</div>
            )}
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setIsDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SymptomTimeline;
