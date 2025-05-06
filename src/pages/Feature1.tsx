
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BreadcrumbTrail } from '@/components/BreadcrumbTrail';
import VapiAssistant from '@/components/VapiAssistant';

const Feature1 = () => {
  const navigate = useNavigate();
  const vapiRef = useRef(null);

  useEffect(() => {
    if (vapiRef.current) {
      setTimeout(() => {
        (vapiRef.current as any).speak('Welcome to Feature 1. This is a placeholder for future functionality.');
      }, 500);
    }
  }, []);

  return (
    <div className="min-h-screen bg-menova-beige p-6">
      <div className="max-w-6xl mx-auto">
        <BreadcrumbTrail currentPath="/features/feature1" />
        
        <div className="bg-white/90 rounded-lg shadow-sm p-8 backdrop-blur-sm">
          <h1 className="text-3xl font-bold text-menova-green mb-4">Feature 1</h1>
          <p className="text-gray-600 mb-6">
            This is a placeholder for Feature 1 content. Future functionality will be implemented here.
          </p>
          
          <div className="p-12 border-2 border-dashed border-menova-green/30 rounded-lg flex flex-col items-center justify-center">
            <p className="text-xl text-menova-green font-medium text-center">
              Feature Coming Soon
            </p>
            <p className="text-gray-500 mt-2 text-center">
              We're working hard to bring you this new feature.
            </p>
            <button 
              onClick={() => navigate('/')}
              className="mt-8 px-6 py-2 bg-menova-green hover:bg-menova-green/90 text-white rounded-lg"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
      
      {/* Floating Voice Assistant */}
      <div className="fixed bottom-6 right-6 z-50">
        <VapiAssistant ref={vapiRef} />
      </div>
    </div>
  );
};

export default Feature1;
