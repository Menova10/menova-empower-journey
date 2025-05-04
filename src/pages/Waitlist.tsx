
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import MeNovaLogo from '@/components/MeNovaLogo';
import { X } from 'lucide-react';

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
          
          <div onClick={() => navigate('/')} className="flex justify-center mb-4 cursor-pointer">
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
    </div>
  );
};

export default Waitlist;
