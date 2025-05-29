import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PenLine, AlertCircle, Check } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { detectSymptoms } from '@/services/symptomDetectionService';
import { symptoms } from '@/types/symptoms';

interface SymptomNotesProps {
  onNotesSubmitted: (notes: string, detectedSymptoms: { id: string, intensity: number }[]) => void;
}

const SymptomNotes = ({ onNotesSubmitted }: SymptomNotesProps) => {
  const [notes, setNotes] = useState('');
  const [detectedSymptoms, setDetectedSymptoms] = useState<Array<{id: string, name: string, intensity: number}>>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    setHasAnalyzed(false);
  };
  
  const analyzeNotes = () => {
    if (!notes.trim()) return;
    
    // Use our symptom detection service
    const { detectedSymptoms: detected, intensity } = detectSymptoms(notes);
    
    if (detected.size > 0) {
      // Map detected symptoms to display data
      const detectedWithNames = Array.from(detected).map(id => {
        const symptom = symptoms.find(s => s.id === id);
        return {
          id,
          name: symptom?.name || id,
          intensity
        };
      });
      
      setDetectedSymptoms(detectedWithNames);
    } else {
      setDetectedSymptoms([]);
    }
    
    setHasAnalyzed(true);
  };
  
  const handleSubmit = () => {
    if (!notes.trim()) return;
    
    // If not analyzed yet, do it now
    if (!hasAnalyzed) {
      analyzeNotes();
    }
    
    // Submit the notes and detected symptoms
    onNotesSubmitted(
      notes, 
      detectedSymptoms.map(s => ({ id: s.id, intensity: s.intensity }))
    );
    
    // Reset form
    setNotes('');
    setDetectedSymptoms([]);
    setHasAnalyzed(false);
  };
  
  return (
    <Card className="mb-6 backdrop-blur-md bg-white/80 border border-menova-green/20 shadow-sm hover:shadow-md transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenLine className="text-menova-green h-5 w-5" />
          <span>Add Notes About Your Symptoms</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea 
          value={notes}
          onChange={handleNotesChange}
          placeholder="Describe how you're feeling today in your own words..."
          className="resize-none min-h-[150px] mb-4"
        />
        
        {hasAnalyzed && (
          <Alert className={`mb-4 ${detectedSymptoms.length > 0 ? 'bg-menova-green/10' : 'bg-yellow-50'}`}>
            <AlertCircle className={detectedSymptoms.length > 0 ? 'text-menova-green' : 'text-yellow-500'} />
            <AlertTitle>
              {detectedSymptoms.length > 0 
                ? 'Symptoms detected in your notes' 
                : 'No specific symptoms detected'}
            </AlertTitle>
            <AlertDescription>
              {detectedSymptoms.length > 0 ? (
                <ul className="mt-2">
                  {detectedSymptoms.map((symptom, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check size={16} className="text-menova-green" />
                      <span>{symptom.name} (Intensity: {symptom.intensity}/5)</span>
                    </li>
                  ))}
                </ul>
              ) : (
                'Try mentioning specific symptoms like "headache", "hot flashes", or "trouble sleeping"'
              )}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex gap-2">
          <Button
            onClick={analyzeNotes}
            variant="outline"
            className="flex-1 border-menova-green text-menova-green hover:bg-menova-green/10"
            disabled={!notes.trim()}
          >
            Analyze Notes
          </Button>
          
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-menova-green hover:bg-menova-green/90 text-white"
            disabled={!notes.trim()}
          >
            Save Notes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SymptomNotes; 