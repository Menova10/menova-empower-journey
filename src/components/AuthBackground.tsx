
import React from 'react';

interface AuthBackgroundProps {
  children: React.ReactNode;
}

const AuthBackground: React.FC<AuthBackgroundProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full flex flex-col bg-cover bg-center bg-no-repeat bg-fixed" 
         style={{ 
           backgroundImage: "linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0.85)), url('/lovable-uploads/14905dcb-7154-41d0-92c2-f134f2aa1117.png')" 
         }}>
      <div className="flex-1 flex items-center justify-center w-full py-24 px-0">
        <div className="w-full max-w-7xl mx-auto relative">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthBackground;
