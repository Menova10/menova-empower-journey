
import React from 'react';

interface AuthBackgroundProps {
  children: React.ReactNode;
}

const AuthBackground: React.FC<AuthBackgroundProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-cover bg-center bg-no-repeat" 
         style={{ backgroundImage: "url('/lovable-uploads/14905dcb-7154-41d0-92c2-f134f2aa1117.png')" }}>
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-md p-6 bg-white/95 backdrop-blur-sm rounded-lg shadow-md relative">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthBackground;
