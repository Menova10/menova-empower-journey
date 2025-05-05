
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import MeNovaLogo from '@/components/MeNovaLogo';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

const Waitlist = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [menopauseStage, setMenopauseStage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      // Insert the data into the waitlist table
      const { data, error } = await supabase
        .from('waitlist')
        .insert({
          email,
          full_name: name,
          reason,
          birth_date: date ? format(date, 'yyyy-MM-dd') : null,
          menopause_stage: menopauseStage || null
        });
        
      if (error) {
        throw error;
      }
      
      // Call the notify-waitlist function to send emails
      const functionResponse = await supabase.functions.invoke('notify-waitlist', {
        body: {
          email,
          full_name: name,
          reason,
          birth_date: date ? format(date, 'yyyy-MM-dd') : null,
          menopause_stage: menopauseStage || null
        }
      });
      
      if (functionResponse.error) {
        console.error("Error calling function:", functionResponse.error);
      }
      
      toast({
        title: "Joined waitlist",
        description: "You've been added to our waitlist! We'll notify you when your MeNova access is approved.",
      });
      
      navigate('/');
    } catch (error: any) {
      console.error('Error submitting to waitlist:', error);
      
      if (error?.code === '23505') {
        toast({
          title: "Email already exists",
          description: "This email has already been added to our waitlist.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Submission failed",
          description: "There was an error adding you to the waitlist. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-menova-beige">
      {/* Navigation Bar */}
      <nav className="flex justify-between items-center px-6 py-4 bg-white/90 shadow-sm backdrop-blur-sm sticky top-0 z-10">
        <MeNovaLogo />
      </nav>
      
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md relative">
          {/* Close button */}
          <button 
            onClick={() => navigate('/')}
            className="absolute right-4 top-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
          
          <div className="flex justify-center mb-4">
            <img
              src="/lovable-uploads/687720ee-5470-46ea-95c1-c506999c0b94.png"
              alt="MeNova Character"
              className="w-20 h-20 rounded-full object-cover border-2 border-menova-green"
            />
          </div>
          
          <h1 className="text-2xl font-semibold text-center text-menova-text mb-6">Join the MeNova Waitlist</h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-menova-text">
                Full Name
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
                placeholder="Jane Doe"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-menova-text">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
                placeholder="you@example.com"
                required
              />
            </div>
            
            {/* Date of Birth Field */}
            <div>
              <label htmlFor="date-picker" className="block text-sm font-medium text-menova-text">
                Date of Birth
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date-picker"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    disabled={(date) =>
                      date > new Date() || date < new Date("1920-01-01")
                    }
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Menopause Stage Field */}
            <div>
              <label htmlFor="menopause-stage" className="block text-sm font-medium text-menova-text">
                Cycle Stage
              </label>
              <Select onValueChange={setMenopauseStage} value={menopauseStage}>
                <SelectTrigger id="menopause-stage" className="mt-1">
                  <SelectValue placeholder="Select your stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Perimenopause">Perimenopause</SelectItem>
                  <SelectItem value="Menopause">Menopause</SelectItem>
                  <SelectItem value="Postmenopause">Postmenopause</SelectItem>
                  <SelectItem value="I'm not sure">I'm not sure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-menova-text">
                Why are you interested in MeNova?
              </label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-menova-green hover:bg-menova-green/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Join Waitlist"}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Button 
                variant="link" 
                className="p-0 h-auto text-menova-green"
                onClick={() => navigate('/login')}
              >
                Login
              </Button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Waitlist;
