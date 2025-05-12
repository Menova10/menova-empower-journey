
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, User, ChevronDown } from 'lucide-react';
import MeNovaLogo from './MeNovaLogo';
import { 
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { BreadcrumbTrail } from './BreadcrumbTrail';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-100">
      <div className="mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <MeNovaLogo />
            
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Dashboard</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
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
                  <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
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
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-gray-100"
                            onClick={() => navigate('/chat')}
                          >
                            <div className="text-sm font-medium">Chat Assistant</div>
                            <p className="line-clamp-2 text-sm leading-snug text-gray-600">
                              Get personalized support
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
              className="p-2 rounded-full hover:bg-gray-100"
              aria-label="Notifications"
            >
              <Bell size={20} className="text-gray-700" />
            </button>
            <button 
              className="p-2 rounded-full hover:bg-gray-100"
              onClick={() => navigate('/profile')}
              aria-label="User Profile"
            >
              <User size={20} className="text-gray-700" />
            </button>
          </div>
        </div>
        
        {/* Breadcrumb Section */}
        <div className="py-2">
          <BreadcrumbTrail currentPath={location.pathname} />
        </div>
      </div>
    </header>
  );
};

export default Header;
