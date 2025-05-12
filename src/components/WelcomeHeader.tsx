
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Bell, Menu } from 'lucide-react';
import MeNovaLogo from './MeNovaLogo';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';

const WelcomeHeader = () => {
  const navigate = useNavigate();
  
  return (
    <header className="bg-transparent py-4 px-6">
      <div className="mx-auto">
        <div className="flex justify-between items-center">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <MeNovaLogo className="text-menova-text" />
            
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent hover:bg-menova-beige/50">Dashboard</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 bg-white">
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-gray-100"
                            onClick={() => navigate('/')}
                          >
                            <div className="text-sm font-medium">Home</div>
                            <p className="line-clamp-2 text-sm leading-snug text-gray-600">
                              Return to main dashboard
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-gray-100"
                            onClick={() => navigate('/todays-wellness')}
                          >
                            <div className="text-sm font-medium">Wellness Progress</div>
                            <p className="line-clamp-2 text-sm leading-snug text-gray-600">
                              Track your daily goals
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-gray-100"
                            onClick={() => navigate('/symptom-tracker')}
                          >
                            <div className="text-sm font-medium">Symptom Tracker</div>
                            <p className="line-clamp-2 text-sm leading-snug text-gray-600">
                              Monitor your symptoms
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-gray-100"
                            onClick={() => navigate('/check-in')}
                          >
                            <div className="text-sm font-medium">Daily Check-in</div>
                            <p className="line-clamp-2 text-sm leading-snug text-gray-600">
                              Complete your daily check-in
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent hover:bg-menova-beige/50">Resources</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 bg-white">
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-gray-100"
                            onClick={() => navigate('/resources')}
                          >
                            <div className="text-sm font-medium">Articles</div>
                            <p className="line-clamp-2 text-sm leading-snug text-gray-600">
                              Helpful information
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-gray-100"
                            onClick={() => navigate('/community')}
                          >
                            <div className="text-sm font-medium">Community</div>
                            <p className="line-clamp-2 text-sm leading-snug text-gray-600">
                              Connect with others
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* User Profile and Notifications */}
          <div className="flex items-center space-x-4">
            <button 
              className="p-2 rounded-full hover:bg-menova-beige/30"
              aria-label="Notifications"
            >
              <Bell size={20} className="text-gray-700" />
            </button>
            <button 
              className="p-2 rounded-full hover:bg-menova-beige/30"
              onClick={() => navigate('/profile')}
              aria-label="User Profile"
            >
              <User size={20} className="text-gray-700" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default WelcomeHeader;
