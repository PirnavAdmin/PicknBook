import React, { useState, useEffect } from 'react';
import { Bus, Plane, Building } from 'lucide-react';
import './AdminHeader.css';

export default function AdminHeader({ title, subtitle, module }) {
  const [displayText, setDisplayText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  // Detect module from path if not explicitly provided
  const activeModule = module || (() => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/bus') || path.includes('/b2c-bus')) return 'bus';
    if (path.includes('/flight') || path.includes('/b2c-flight')) return 'flight';
    if (path.includes('/hotel') || path.includes('/b2c-hotel')) return 'hotel';
    
    // Fallback based on title text
    const lowerTitle = (title || '').toLowerCase();
    if (lowerTitle.includes('bus')) return 'bus';
    if (lowerTitle.includes('flight')) return 'flight';
    if (lowerTitle.includes('hotel')) return 'hotel';
    return null;
  })();

  // Typewriter effect
  useEffect(() => {
    let index = 0;
    setDisplayText('');
    setShowCursor(true);
    
    const interval = setInterval(() => {
      if (index < title.length) {
        setDisplayText((prev) => prev + title.charAt(index));
        index++;
      } else {
        clearInterval(interval);
        // Hide blinking cursor after 1 second once complete
        setTimeout(() => {
          setShowCursor(false);
        }, 1000);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [title]);

  const renderIcon = () => {
    switch (activeModule) {
      case 'bus':
        return <Bus className="admin-header-icon bus-theme" size={32} />;
      case 'flight':
        return <Plane className="admin-header-icon flight-theme" size={32} />;
      case 'hotel':
        return <Building className="admin-header-icon hotel-theme" size={32} />;
      default:
        return null;
    }
  };

  return (
    <div className="admin-header-container">
      {renderIcon()}
      <div className="admin-header-text-group">
        <h1 className="admin-header-title">
          {displayText}
          {showCursor && <span className="admin-header-cursor">|</span>}
        </h1>
        {subtitle && <p className="admin-header-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}
