import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

interface CompleteSymptomProfileProps {
  className?: string;
}

const CompleteSymptomProfile: React.FC<CompleteSymptomProfileProps> = ({ className }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/symptom-tracker');
  };

  return (
    <Card className={`overflow-hidden border-2 border-dashed border-teal-200 bg-teal-50/50 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-teal-700">
          <Info className="h-5 w-5" />
          Complete Your Symptom Profile
        </CardTitle>
        <CardDescription>
          Track your symptoms to get personalized resources and recommendations
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm">
        <p>
          By logging your symptoms, MeNova can tailor content specifically to your menopause journey.
          We'll recommend articles, videos, and resources most relevant to your experiences.
        </p>
      </CardContent>
      <CardFooter>
        <Button onClick={handleClick} className="bg-teal-600 hover:bg-teal-700">
          Track My Symptoms
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CompleteSymptomProfile; 