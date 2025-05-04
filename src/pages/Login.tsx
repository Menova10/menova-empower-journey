
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import MeNovaLogo from '@/components/MeNovaLogo';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Login functionality",
      description: "This would connect to Supabase in a real implementation",
    });
    // In a real implementation, this would connect to Supabase
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-menova-beige">
      {/* Navigation Bar */}
      <nav className="flex justify-between items-center px-6 py-4 bg-white/90 shadow-sm backdrop-blur-sm sticky top-0 z-10">
        <MeNovaLogo />
      </nav>
      
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-semibold text-center text-menova-text mb-6">Login to MeNova</h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <label htmlFor="password" className="block text-sm font-medium text-menova-text">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            
            <Button type="submit" className="w-full bg-menova-green hover:bg-menova-green/90">
              Login
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Button 
                variant="link" 
                className="p-0 h-auto text-menova-green"
                onClick={() => navigate('/waitlist')}
              >
                Join Waitlist
              </Button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
