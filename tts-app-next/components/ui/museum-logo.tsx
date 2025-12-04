import React from 'react';
import { cn } from '@/lib/utils';

interface MuseumLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  variant?: 'white' | 'colored' | 'inverted';
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6', 
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
};

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg', 
  xl: 'text-xl'
};

export const MuseumLogo: React.FC<MuseumLogoProps> = ({ 
  size = 'md', 
  className,
  showText = false,
  variant = 'white'
}) => {
  const getFilterClass = () => {
    switch (variant) {
      case 'white':
        return 'filter brightness-0 invert';
      case 'colored':
        return '';
      case 'inverted':
        return 'filter brightness-0 invert';
      default:
        return 'filter brightness-0 invert';
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img 
        src="/images/logo_museu_ccen.png" 
        alt="Museu de Ciências Exatas" 
        className={cn(
          sizeClasses[size],
          "object-contain",
          getFilterClass()
        )}
      />
      {showText && (
        <span className={cn(
          "font-semibold text-white",
          textSizeClasses[size]
        )}>
          Museu do CCEN
        </span>
      )}
    </div>
  );
};

export default MuseumLogo;
