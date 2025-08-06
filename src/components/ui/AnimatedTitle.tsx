import React from 'react';
import './AnimatedTitle.css';

interface AnimatedTitleProps {
  className?: string;
}

const AnimatedTitle: React.FC<AnimatedTitleProps> = ({ className = '' }) => {
  return (
    <div className={`animated-title-container ${className}`}>
      <h1 className="animated-title">
        <span>Note</span>
        <span>
          &nbsp;Space
          <span className="pops">
            <span className="pop"></span>
            <span className="pop"></span>
            <span className="pop"></span>
            <span className="pop"></span>
            <span className="pop"></span>
          </span>
        </span>
        <span>™</span>
      </h1>
    </div>
  );
};

export default AnimatedTitle;