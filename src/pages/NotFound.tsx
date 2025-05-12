
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-menova-beige bg-menova-pattern bg-cover">
      <div className="text-center bg-white/90 p-8 rounded-lg shadow-sm backdrop-blur-sm max-w-md">
        <h1 className="text-4xl font-bold mb-4 text-menova-text">404</h1>
        <p className="text-xl text-gray-600 mb-6">Oops! Page not found</p>
        <Button 
          onClick={() => navigate('/')}
          className="bg-menova-green hover:bg-menova-green/90"
        >
          Return to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
