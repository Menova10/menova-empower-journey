
import React from 'react';

interface AuthBackgroundProps {
  children: React.ReactNode;
}

const AuthBackground: React.FC<AuthBackgroundProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full flex flex-col bg-menova-beige bg-menova-pattern bg-cover">
      <div className="flex-1 flex items-center justify-center w-full py-24 px-0">
        <div className="w-full max-w-md mx-auto bg-white/90 p-8 rounded-lg shadow-sm backdrop-blur-sm">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthBackground;
