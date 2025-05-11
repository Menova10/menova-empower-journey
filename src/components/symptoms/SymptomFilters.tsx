
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, Calendar } from 'lucide-react';
import { symptoms, timePeriods } from '@/types/symptoms';

interface SymptomFiltersProps {
  selectedSymptom: string;
  setSelectedSymptom: (symptom: string) => void;
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
}

const SymptomFilters = ({ 
  selectedSymptom,
  setSelectedSymptom,
  selectedPeriod,
  setSelectedPeriod
}: SymptomFiltersProps) => {
  return (
    <Card className="backdrop-blur-md bg-white/80 border border-menova-green/20 shadow-sm w-full">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Filter className="h-4 w-4" /> Symptom
            </label>
            <Select 
              value={selectedSymptom} 
              onValueChange={setSelectedSymptom}
            >
              <SelectTrigger className="border-menova-green/30">
                <SelectValue placeholder="Select symptom" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Symptoms</SelectItem>
                {symptoms.map(symptom => (
                  <SelectItem key={symptom.id} value={symptom.id}>
                    {symptom.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Calendar className="h-4 w-4" /> Time Period
            </label>
            <Select 
              value={selectedPeriod} 
              onValueChange={setSelectedPeriod}
            >
              <SelectTrigger className="border-menova-green/30">
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                {timePeriods.map(period => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SymptomFilters;
