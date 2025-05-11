
import React from 'react';

interface AuthBackgroundProps {
  children: React.ReactNode;
}

const AuthBackground: React.FC<AuthBackgroundProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-cover bg-center bg-no-repeat" 
         style={{ backgroundImage: "url('/lovable-uploads/14905dcb-7154-41d0-92c2-f134f2aa1117.png')" }}>
      <div className="flex-1 flex items-center justify-center py-8 px-4">
        <div className="w-full relative">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthBackground;
