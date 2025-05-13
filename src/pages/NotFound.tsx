
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-menova-beige bg-cover bg-center bg-no-repeat bg-fixed"
         style={{
           backgroundImage: "linear-gradient(to bottom, rgba(255,255,255,0.85), rgba(255,255,255,0.75)), url('/lovable-uploads/14905dcb-7154-41d0-92c2-f134f2aa1117.png')"
         }}>
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
        <a href="/" className="text-menova-green hover:text-menova-green/80 underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
