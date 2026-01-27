import React from 'react';
import { InputDevice } from '../types';

interface InputDeviceIconProps {
  device?: InputDevice;
  className?: string;
}

const InputDeviceIcon: React.FC<InputDeviceIconProps> = ({ device, className = "h-5 w-5" }) => {
  if (device === 'Wheel') {
     // Racing Wheel Icon
     return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
           {/* Outer Rim */}
           <circle cx="12" cy="12" r="10" />
           {/* Center Hub */}
           <circle cx="12" cy="12" r="2.5" />
           {/* Top Marker (often red on racing wheels) */}
           <path d="M12 2v2" strokeWidth="3" />
           {/* Left Spoke */}
           <path d="M2.5 12H9.5" />
           {/* Right Spoke */}
           <path d="M14.5 12H21.5" />
           {/* Bottom Spoke */}
           <path d="M12 14.5V21.5" />
        </svg>
     );
  }
  if (device === 'Gamepad') {
     // Gamepad Icon (Modern Style)
     return (
       <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="12" rx="6" />
          {/* D-Pad Left */}
          <path d="M6 12h3" />
          <path d="M7.5 10.5v3" />
          {/* Action Buttons Right (Diamond layout) */}
          <line x1="15" y1="12" x2="15.01" y2="12" strokeWidth="2.5" />
          <line x1="18" y1="12" x2="18.01" y2="12" strokeWidth="2.5" />
          <line x1="16.5" y1="10.5" x2="16.51" y2="10.5" strokeWidth="2.5" />
          <line x1="16.5" y1="13.5" x2="16.51" y2="13.5" strokeWidth="2.5" />
       </svg>
     );
  }
  if (device === 'Keyboard') {
     // Keyboard Icon
     return (
       <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="3" />
          {/* Row 1 */}
          <path d="M6 9h2" />
          <path d="M10 9h2" />
          <path d="M14 9h2" />
          <path d="M18 9h.01" strokeWidth="2.5" />
          {/* Row 2 */}
          <path d="M6 12h2" />
          <path d="M10 12h2" />
          <path d="M14 12h2" />
          <path d="M18 12h.01" strokeWidth="2.5" />
          {/* Spacebar */}
          <path d="M7 16h10" />
       </svg>
     );
  }
  return null;
};

export default InputDeviceIcon;