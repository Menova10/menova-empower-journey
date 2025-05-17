
import { useNavigate } from 'react-router-dom';

interface MeNovaLogoProps {
  className?: string;
}

const MeNovaLogo = ({
  className = ""
}: MeNovaLogoProps) => {
  const navigate = useNavigate();
  
  return (
    <h1 
      onClick={() => navigate('/')} 
      className={`text-2xl font-bold cursor-pointer flex items-center ${className}`}
    >
      <span className="text-menova-green">Me</span>
      <span className="text-menova-text">Nova</span>
    </h1>
  );
};

export default MeNovaLogo;
