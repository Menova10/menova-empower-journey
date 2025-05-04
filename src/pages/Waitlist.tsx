
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';

const Waitlist = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Joined waitlist",
      description: "You've been added to our waitlist! We'll notify you when MeNova is ready.",
    });
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-menova-beige bg-menova-pattern bg-cover">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
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
          
          <Button type="submit" className="w-full bg-menova-green hover:bg-menova-green/90">
            Join Waitlist
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
  );
};

export default Waitlist;
