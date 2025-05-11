
interface ConfettiEffectProps {
  show: boolean;
}

const ConfettiEffect = ({ show }: ConfettiEffectProps) => {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {[...Array(30)].map((_, i) => (
        <div 
          key={i}
          className="absolute animate-fall"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-${20 + Math.random() * 10}px`,
            width: `${10 + Math.random() * 10}px`,
            height: `${10 + Math.random() * 10}px`,
            backgroundColor: ['#A5D6A7', '#E8F5E9', '#FFDEE2', '#FDE1D3'][Math.floor(Math.random() * 4)],
            borderRadius: '50%',
            animationDelay: `${Math.random() * 1.5}s`,
            animationDuration: `${1 + Math.random() * 2}s`
          }}
        />
      ))}
    </div>
  );
};

export default ConfettiEffect;
