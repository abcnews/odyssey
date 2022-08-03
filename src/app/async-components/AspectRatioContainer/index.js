import React from 'react';
import './index.scss';

const AspectRatioContainer = ({ ratio, children }) => {
  const [ratioW, ratioH] = ratio.split('x').map(n => Number(n));

  return (
    <div className="AspectRatioContainer" style={{ '--aspect-ratio': ratioW / ratioH }}>
      {children}
    </div>
  );
};

export default AspectRatioContainer;
