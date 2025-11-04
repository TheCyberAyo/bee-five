import React from 'react';
import { type Theme } from '../hooks/useTheme';

interface BeeLifeStageEffectsProps {
  theme: Theme;
  children: React.ReactNode;
}

const BeeLifeStageEffects: React.FC<BeeLifeStageEffectsProps> = ({ theme, children }) => {
  const getEffectStyle = () => {
    switch (theme.visualEffect) {
      case 'soft-glow':
        return {
          position: 'relative' as const,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(circle, ${theme.primaryColor}20 0%, transparent 70%)`,
            borderRadius: 'inherit',
            zIndex: -1,
            animation: 'softPulse 3s ease-in-out infinite'
          }
        };
      case 'crawling-pattern':
        return {
          position: 'relative' as const,
          background: `linear-gradient(45deg, transparent 40%, ${theme.primaryColor}10 50%, transparent 60%)`,
          backgroundSize: '20px 20px',
          animation: 'crawlMove 4s linear infinite'
        };
      case 'honey-drip':
        return {
          position: 'relative' as const,
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '50%',
            width: '2px',
            height: '100%',
            background: `linear-gradient(to bottom, ${theme.primaryColor}, transparent)`,
            transform: 'translateX(-50%)',
            animation: 'honeyDrip 2s ease-in-out infinite'
          }
        };
      case 'spinning-web':
        return {
          position: 'relative' as const,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '100px',
            height: '100px',
            border: `2px solid ${theme.primaryColor}30`,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            animation: 'spinWeb 6s linear infinite'
          }
        };
      case 'dreamy-swirl':
        return {
          position: 'relative' as const,
          background: `radial-gradient(circle at 30% 30%, ${theme.primaryColor}15 0%, transparent 50%)`,
          animation: 'dreamyFloat 5s ease-in-out infinite'
        };
      case 'dawn-break':
        return {
          position: 'relative' as const,
          background: `linear-gradient(45deg, ${theme.primaryColor}20 0%, ${theme.secondaryColor}10 100%)`,
          animation: 'dawnShimmer 3s ease-in-out infinite'
        };
      case 'hexagonal-grid':
        return {
          position: 'relative' as const,
          backgroundImage: `
            radial-gradient(circle at 25% 25%, ${theme.primaryColor}10 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, ${theme.secondaryColor}10 0%, transparent 50%)
          `,
          backgroundSize: '40px 40px',
          animation: 'hexPulse 4s ease-in-out infinite'
        };
      case 'pollen-trail':
        return {
          position: 'relative' as const,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(ellipse at 20% 80%, ${theme.primaryColor}15 0%, transparent 50%)`,
            animation: 'pollenFloat 6s ease-in-out infinite'
          }
        };
      case 'protective-aura':
        return {
          position: 'relative' as const,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: `3px solid ${theme.primaryColor}40`,
            borderRadius: 'inherit',
            animation: 'auraPulse 2s ease-in-out infinite'
          }
        };
      case 'royal-radiance':
        return {
          position: 'relative' as const,
          background: `radial-gradient(circle at 50% 50%, ${theme.primaryColor}20 0%, ${theme.secondaryColor}10 70%, transparent 100%)`,
          animation: 'royalGlow 4s ease-in-out infinite'
        };
      default:
        return {};
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes softPulse {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.05); }
          }
          
          @keyframes crawlMove {
            0% { background-position: 0% 0%; }
            100% { background-position: 100% 100%; }
          }
          
          @keyframes honeyDrip {
            0% { opacity: 0; transform: translateX(-50%) translateY(-100%); }
            50% { opacity: 1; transform: translateX(-50%) translateY(0%); }
            100% { opacity: 0; transform: translateX(-50%) translateY(100%); }
          }
          
          @keyframes spinWeb {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(360deg); }
          }
          
          @keyframes dreamyFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          
          @keyframes dawnShimmer {
            0%, 100% { background-position: 0% 0%; }
            50% { background-position: 100% 100%; }
          }
          
          @keyframes hexPulse {
            0%, 100% { background-size: 40px 40px; }
            50% { background-size: 50px 50px; }
          }
          
          @keyframes pollenFloat {
            0%, 100% { transform: translateX(0px) translateY(0px); }
            25% { transform: translateX(10px) translateY(-5px); }
            50% { transform: translateX(0px) translateY(-10px); }
            75% { transform: translateX(-10px) translateY(-5px); }
          }
          
          @keyframes auraPulse {
            0%, 100% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.02); }
          }
          
          @keyframes royalGlow {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
        `}
      </style>
      <div style={getEffectStyle()}>
        {children}
      </div>
    </>
  );
};

export default BeeLifeStageEffects;
