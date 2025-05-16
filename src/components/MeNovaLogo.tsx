import { useNavigate } from 'react-router-dom';
interface MeNovaLogoProps {
  className?: string;
}
const MeNovaLogo = ({
  className = ""
}: MeNovaLogoProps) => {
  const navigate = useNavigate();
  return <h1 onClick={() => navigate('/')} className={`text-2xl font-bold cursor-pointer ${className}`}>
      
      
    </h1>;
};
export default MeNovaLogo;