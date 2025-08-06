import React, { memo, ReactNode } from 'react';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  hover?: boolean;
}

const AnimatedCard: React.FC<AnimatedCardProps> = memo(({ 
  children, 
  className = '', 
  delay = 0, 
  duration = 300,
  hover = true 
}) => {
  const style = {
    animationDelay: `${delay}ms`,
    animationDuration: `${duration}ms`,
    animationFillMode: 'both',
    animationName: 'fadeInUp',
  };

  return (
    <div
      className={`
        animate-fade-in-up
        ${hover ? 'hover:shadow-lg hover:-translate-y-1' : ''}
        transition-all duration-300 ease-out
        ${className}
      `}
      style={style}
    >
      {children}
    </div>
  );
});

AnimatedCard.displayName = 'AnimatedCard';

export default AnimatedCard;