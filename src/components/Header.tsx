
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, User, Bell } from 'lucide-react';
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
import { cn } from '@/lib/utils';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#f7fcf7]/95 to-[#fff5f0]/95 backdrop-blur-md shadow-sm border-b border-green-100/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center">
            <MeNovaLogo className="mr-8" />
            
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-menova-text">Dashboard</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      <li className="row-span-3">
                        <NavigationMenuLink asChild>
                          <a
                            className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-green-100/40 to-green-50/30 p-6 no-underline outline-none focus:shadow-md"
                            onClick={() => navigate('/')}
                          >
                            <div className="mb-2 mt-4 text-lg font-medium text-menova-text">
                              MeNova Home
                            </div>
                            <p className="text-sm leading-tight text-menova-text/90">
                              Return to main dashboard and overview of your wellness journey
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-green-50/60 focus:bg-green-50/60"
                            onClick={() => navigate('/todays-wellness')}
                          >
                            <div className="text-sm font-medium leading-none text-menova-text">Wellness Progress</div>
                            <p className="line-clamp-2 text-sm leading-snug text-menova-text/70">
                              Track your daily wellness goals and achievements
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-green-50/60 focus:bg-green-50/60"
                            onClick={() => navigate('/symptom-tracker')}
                          >
                            <div className="text-sm font-medium leading-none text-menova-text">Symptom Tracker</div>
                            <p className="line-clamp-2 text-sm leading-snug text-menova-text/70">
                              Record and monitor your symptoms over time
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-green-50/60 focus:bg-green-50/60"
                            onClick={() => navigate('/check-in')}
                          >
                            <div className="text-sm font-medium leading-none text-menova-text">Daily Check-in</div>
                            <p className="line-clamp-2 text-sm leading-snug text-menova-text/70">
                              Complete your daily wellness check-in
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-menova-text">Resources</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-green-50/60 focus:bg-green-50/60"
                            onClick={() => navigate('/resources')}
                          >
                            <div className="text-sm font-medium leading-none text-menova-text">Articles</div>
                            <p className="line-clamp-2 text-sm leading-snug text-menova-text/70">
                              Helpful articles and information
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-green-50/60 focus:bg-green-50/60"
                            onClick={() => navigate('/community')}
                          >
                            <div className="text-sm font-medium leading-none text-menova-text">Community</div>
                            <p className="line-clamp-2 text-sm leading-snug text-menova-text/70">
                              Connect with others on similar journeys
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-green-50/60 focus:bg-green-50/60"
                            onClick={() => navigate('/chat')}
                          >
                            <div className="text-sm font-medium leading-none text-menova-text">Chat Assistant</div>
                            <p className="line-clamp-2 text-sm leading-snug text-menova-text/70">
                              Get personalized support from our AI assistant
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
              className="p-2 rounded-full hover:bg-green-50/70"
              aria-label="Notifications"
            >
              <Bell size={20} className="text-gray-700" />
            </button>
            <button 
              className="p-2 rounded-full hover:bg-green-50/70"
              onClick={() => navigate('/profile')}
              aria-label="User Profile"
            >
              <User size={20} className="text-gray-700" />
            </button>
            <button 
              className="p-2 rounded-full hover:bg-green-50/70 md:hidden"
              aria-label="Menu"
            >
              <Menu size={20} className="text-gray-700" />
            </button>
          </div>
        </div>
        
        {/* Breadcrumb Section */}
        <div className="px-4 py-2">
          <BreadcrumbTrail currentPath={location.pathname} />
        </div>
      </div>
    </header>
  );
};

export default Header;
