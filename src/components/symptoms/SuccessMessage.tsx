import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

interface SuccessMessageProps {
  message: string;
  onClose: () => void;
}

const SuccessMessage = ({ message, onClose }: SuccessMessageProps) => {
  const navigate = useNavigate();
  
  if (!message) return null;

  return (
    <div
      className="mb-6 p-4 rounded-lg bg-gradient-to-r from-menova-green/10 to-menova-green/20 backdrop-blur-md border border-menova-green/20 animate-scaleIn w-full relative"
    >
      <button 
        onClick={onClose}
        className="absolute top-2 right-2 hover:bg-menova-green/10 rounded-full p-1"
        aria-label="Close"
      >
        <X size={16} />
      </button>
      <h3 className="font-medium text-menova-text mb-2">Symptoms recorded successfully!</h3>
      <p className="text-sm text-gray-700 mb-3 font-['Dancing_Script'],cursive text-lg italic">
        {message}
      </p>
      <div className="flex flex-wrap gap-2 mt-2">
        <Button
          size="sm"
          onClick={() => navigate('/welcome')}
          className="bg-menova-green hover:bg-menova-green/90 text-white"
        >
          Back to Dashboard
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/todays-wellness')}
          className="border-menova-green text-menova-green"
        >
          Set a Wellness Goal
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/chat')}
          className="border-menova-green text-menova-green"
        >
          Talk to MeNova
        </Button>
      </div>
    </div>
  );
};

export default SuccessMessage;
