
import React, { useState, useRef, useEffect } from 'react';
import { toPersianDigits } from '../utils/dateUtils';
import { Check, X } from 'lucide-react';

interface AnalogTimePickerProps {
  value: string; // HH:mm (24h format)
  onChange: (time: string) => void;
  onClose: () => void;
}

const AnalogTimePicker: React.FC<AnalogTimePickerProps> = ({ value, onChange, onClose }) => {
  const clockRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Constants for design
  const CLOCK_SIZE = 256; // w-64
  const CLOCK_RADIUS = CLOCK_SIZE / 2; // 128
  const NUMBER_RADIUS = 95; // Distance from center to number center
  
  // Parse initial state
  const parseTime = (val: string) => {
    if (!val) return { hour: 10, minute: 0, meridiem: 'AM' as const };
    const [h, m] = val.split(':').map(Number);
    return {
      hour: h % 12 || 12, 
      minute: m,
      meridiem: h >= 12 ? 'PM' as const : 'AM' as const
    };
  };

  const initial = parseTime(value);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [meridiem, setMeridiem] = useState<'AM' | 'PM'>(initial.meridiem);
  const [mode, setMode] = useState<'HOURS' | 'MINUTES'>('HOURS');

  // Convert back to 24h format and save
  const handleSave = () => {
    let h = hour;
    if (meridiem === 'PM' && h !== 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    
    const timeString = `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    onChange(timeString);
    onClose();
  };

  // Calculate value based on pointer position
  const calculateValue = (clientX: number, clientY: number, isClick: boolean) => {
      if (!clockRef.current) return;
      
      const rect = clockRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const x = clientX - rect.left - centerX;
      const y = clientY - rect.top - centerY;

      // Calculate angle in degrees (0 is at 3 o'clock, so we adjust)
      let deg = (Math.atan2(y, x) * 180) / Math.PI;
      deg = deg + 90; // Rotate so 0 is at 12 o'clock
      if (deg < 0) deg += 360;

      if (mode === 'HOURS') {
          // 360 / 12 = 30 degrees per hour
          let h = Math.round(deg / 30);
          if (h === 0) h = 12;
          setHour(h);
          
          // Switch to minutes on mouse up/click
          if (isClick) {
              setTimeout(() => setMode('MINUTES'), 300);
          }
      } else {
          // 360 / 60 = 6 degrees per minute
          let m = Math.round(deg / 6);
          if (m === 60) m = 0;
          setMinute(m);
      }
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
      setIsDragging(true);
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      calculateValue(clientX, clientY, false);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault(); 
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      calculateValue(clientX, clientY, false);
  };

  const handleMouseUp = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDragging) return;
      setIsDragging(false);
      const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
      const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;
      calculateValue(clientX, clientY, true);
  };

  // Helper for positioning
  const getPosition = (angleDeg: number, radius: number) => {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return {
      left: `calc(50% + ${radius * Math.cos(rad)}px)`,
      top: `calc(50% + ${radius * Math.sin(rad)}px)`,
    };
  };

  // Render Ticks
  const renderTicks = () => {
      const ticks = [];
      const isHours = mode === 'HOURS';
      const count = isHours ? 12 : 60;
      
      for (let i = 0; i < count; i++) {
          const deg = i * (360 / count);
          const isMajor = isHours ? true : i % 5 === 0;
          
          if (!isHours && !isMajor) continue; // Only show major ticks for cleaner look in minutes

          ticks.push(
              <div
                  key={i}
                  className={`absolute top-1/2 left-1/2 origin-left bg-gray-200 pointer-events-none rounded-full
                      ${isMajor ? 'w-2 h-0.5' : 'w-1 h-px'} 
                  `}
                  style={{
                      transform: `translate(-50%, -50%) rotate(${deg - 90}deg) translate(${120}px, 0)`
                  }}
              />
          );
      }
      return ticks;
  };

  // Render Numbers
  const renderNumbers = () => {
    const isHours = mode === 'HOURS';
    const items = [];
    const radius = NUMBER_RADIUS;

    for (let i = 1; i <= 12; i++) {
        const val = isHours ? i : (i === 12 ? 0 : i * 5);
        const displayVal = isHours ? i : (i === 12 ? '00' : i * 5);
        
        // Logic to determine if this number is selected
        const isSelected = isHours 
            ? hour === val 
            : (val === 0 ? (minute === 0 || minute === 60) : Math.abs(minute - val) < 3 && minute !== 0);

        const pos = getPosition(i * 30, radius);

        items.push(
            <div
                key={i}
                className={`absolute w-8 h-8 flex items-center justify-center text-sm font-bold transition-colors duration-200 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-20 font-sans
                    ${isSelected ? 'text-white' : 'text-gray-600'}`}
                style={pos}
            >
                {toPersianDigits(displayVal)}
            </div>
        );
    }
    return items;
  };
  
  const getHandAngle = () => {
      if (mode === 'HOURS') {
          return (hour % 12) * 30; // Snap to hour
      } else {
          return minute * 6; // Precise minute
      }
  };

  return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in font-sans">
        <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 w-[320px] overflow-hidden animate-in zoom-in-95 flex flex-col">
             
             {/* Header - Matching the Cyan Image Style */}
             <div className="bg-primary pt-6 pb-4 px-6 text-white flex flex-col relative shadow-md z-30">
                 <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
                    <X size={20} />
                 </button>
                 
                 <h3 className="text-white/80 text-xs font-medium mb-4 opacity-80">انتخاب زمان</h3>
                 
                 <div className="flex justify-between items-end dir-ltr">
                     <div className="flex items-baseline gap-1 select-none">
                        <button 
                            onClick={() => setMode('HOURS')}
                            className={`text-5xl font-bold transition-all ${mode === 'HOURS' ? 'opacity-100' : 'opacity-60 hover:opacity-80'}`}
                        >
                            {toPersianDigits(hour.toString().padStart(2, '0'))}
                        </button>
                        <span className="text-4xl font-bold opacity-60 pb-1">:</span>
                        <button 
                            onClick={() => setMode('MINUTES')}
                            className={`text-5xl font-bold transition-all ${mode === 'MINUTES' ? 'opacity-100' : 'opacity-60 hover:opacity-80'}`}
                        >
                            {toPersianDigits(minute.toString().padStart(2, '0'))}
                        </button>
                    </div>

                    <div className="flex flex-col gap-1 mb-1">
                        <button 
                            onClick={() => setMeridiem('AM')}
                            className={`text-xs font-bold px-2 py-1 rounded border transition-colors ${meridiem === 'AM' ? 'bg-white text-primary border-white' : 'text-white border-white/40 hover:bg-white/10'}`}
                        >
                            AM
                        </button>
                        <button 
                            onClick={() => setMeridiem('PM')}
                            className={`text-xs font-bold px-2 py-1 rounded border transition-colors ${meridiem === 'PM' ? 'bg-white text-primary border-white' : 'text-white border-white/40 hover:bg-white/10'}`}
                        >
                            PM
                        </button>
                    </div>
                 </div>
             </div>
    
             {/* Clock Face Area */}
             <div className="p-6 bg-white flex justify-center cursor-pointer relative"
                  onMouseUp={() => setIsDragging(false)}
             >
                <div 
                    ref={clockRef}
                    className="relative w-64 h-64 bg-gray-50 rounded-full select-none touch-none shadow-inner"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onTouchStart={handleMouseDown}
                    onTouchMove={handleMouseMove}
                    onTouchEnd={handleMouseUp}
                >
                    {/* Ticks */}
                    {renderTicks()}

                    {/* Center Dot */}
                    <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-primary rounded-full -translate-x-1/2 -translate-y-1/2 z-30"></div>
                    
                    {/* Hand */}
                    {/* We position the hand container in the center, rotate it, and draw the line and bubble upwards */}
                    <div 
                        className="absolute top-1/2 left-1/2 w-0.5 bg-primary origin-bottom z-10 pointer-events-none transition-transform duration-100 ease-out"
                        style={{ 
                            height: `${NUMBER_RADIUS}px`, // Exact match to number placement
                            transform: `translate(-50%, -100%) rotate(${getHandAngle()}deg)` 
                        }}
                    >
                         {/* Selected Bubble - Placed at the top (end) of the hand */}
                         <div className="absolute top-0 left-1/2 w-8 h-8 bg-primary rounded-full -translate-x-1/2 -translate-y-1/2 shadow-md"></div>
                         
                         {/* Small connection for minutes precision if needed, usually just the bubble is enough */}
                    </div>
    
                    {/* Numbers - Rendered AFTER hand but z-index handles layering if set correctly. 
                        We set Numbers to z-20 and Hand to z-10 so Numbers sit ON TOP of the bubble. */}
                    {renderNumbers()}
                </div>
             </div>
    
             {/* Footer Actions */}
             <div className="p-4 flex justify-between items-center bg-white mt-auto">
                <button 
                    onClick={onClose}
                    className="px-4 py-2 text-primary hover:bg-primary/5 rounded-lg transition-colors font-bold text-sm"
                >
                    انصراف
                </button>
                <button 
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-bold shadow-md shadow-primary/30 transition-all text-sm active:scale-95"
                >
                    <Check size={18} />
                    <span>تایید زمان</span>
                </button>
             </div>
        </div>
      </div>
  );
};

export default AnalogTimePicker;
