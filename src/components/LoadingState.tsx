import React from 'react';
import { Wrench, Settings } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = "A carregar dados do sistema...", 
  fullScreen = false 
}) => {
  return (
    <div className={`d-flex flex-column justify-content-center align-items-center ${fullScreen ? 'vh-100 w-100 bg-light bg-opacity-75' : 'py-5'}`}
         style={fullScreen ? { position: 'fixed', top: 0, left: 0, zIndex: 9999, backdropFilter: 'blur(4px)' } : {}}>
      
      {/* Container da Animação Mecânica */}
      <div className="position-relative mb-3 d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
        
        {/* Engrenagem/Porca ao fundo que roda continuamente */}
        <Settings 
          size={56} 
          className="text-secondary opacity-25 animate-mechanical-spin" 
        />
        
        {/* Chave Inglesa à frente que faz o movimento de aperto */}
        <div className="position-absolute animate-wrench-tighten" style={{ top: '12px', left: '12px' }}>
          <Wrench 
            size={36} 
            className="text-primary" 
            style={{ transform: 'rotate(-45deg)' }} // Inclina a chave para encaixar melhor
          />
        </div>
        
      </div>

      {/* Mensagem de Feedback */}
      <span className="fw-bold text-secondary text-uppercase small tracking-wider animate-pulse-text">
        {message}
      </span>
    </div>
  );
};

export default LoadingState;
