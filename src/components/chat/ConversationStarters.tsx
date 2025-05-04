
import { Button } from '@/components/ui/button';
import { getConversationStarters } from '@/utils/chatUtils';

interface ConversationStartersProps {
  onStarterClick: (starter: string) => void;
}

const ConversationStarters = ({ onStarterClick }: ConversationStartersProps) => {
  const starters = getConversationStarters();
  
  return (
    <div className="p-4 border-b overflow-x-auto flex space-x-2">
      {starters.map((starter) => (
        <Button
          key={starter}
          variant="outline"
          size="sm"
          className="whitespace-nowrap text-xs border-menova-green text-menova-green hover:bg-menova-green/10"
          onClick={() => onStarterClick(starter)}
        >
          {starter}
        </Button>
      ))}
    </div>
  );
};

export default ConversationStarters;
