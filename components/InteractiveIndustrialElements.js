import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useMousePosition, getDistance, getProximityFactor } from "@/hooks/useMouseTracking";

// Rotating Gear Component
export const InteractiveGear = ({ size = 80, x, y, baseSpeed = 2, color = "copper" }) => {
  const [currentSpeed, setCurrentSpeed] = useState(baseSpeed);
  const mousePos = useMousePosition();
  const elementRef = useRef(null);

  const colorClasses = {
    copper: "text-industrial-copper",
    brass: "text-industrial-brass", 
    steel: "text-industrial-steel",
    iron: "text-industrial-iron"
  };

  useEffect(() => {
    if (elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = getDistance(mousePos.x, mousePos.y, centerX, centerY);
      const proximity = getProximityFactor(distance, 150);
      
      setCurrentSpeed(baseSpeed + proximity * 10); // Speed up on hover
    }
  }, [mousePos, baseSpeed]);

  return (
    <motion.div
      ref={elementRef}
      className={`absolute ${colorClasses[color]} pointer-events-none`}
      style={{ 
        left: `${x}%`, 
        top: `${y}%`,
        width: size,
        height: size,
        filter: `drop-shadow(0 0 ${currentSpeed > baseSpeed ? 15 : 8}px currentColor)`,
      }}
      animate={{
        rotate: 360,
        scale: currentSpeed > baseSpeed ? 1.1 : 1,
      }}
      transition={{ 
        rotate: {
          duration: 10 / currentSpeed, // Faster rotation on hover
          repeat: Infinity,
          ease: "linear"
        },
        scale: {
          duration: 0.3
        }
      }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Gear teeth */}
        <path
          d="M50,5 L55,8 L85,8 L90,15 L85,22 L55,22 L52,25 L48,25 L45,22 L15,22 L10,15 L15,8 L45,8 L50,5 Z 
             M95,50 L92,45 L92,15 L85,10 L78,15 L78,45 L75,48 L75,52 L78,55 L78,85 L85,90 L92,85 L92,55 L95,50 Z
             M50,95 L45,92 L15,92 L10,85 L15,78 L45,78 L48,75 L52,75 L55,78 L85,78 L90,85 L85,92 L55,92 L50,95 Z
             M5,50 L8,55 L8,85 L15,90 L22,85 L22,55 L25,52 L25,48 L22,45 L22,15 L15,10 L8,15 L8,45 L5,50 Z"
          fill="currentColor"
          stroke="rgba(0,0,0,0.4)"
          strokeWidth="1"
        />
        {/* Center hub */}
        <circle cx="50" cy="50" r="18" fill="rgba(0,0,0,0.4)" />
        <circle cx="50" cy="50" r="12" fill="currentColor" />
        <circle cx="50" cy="50" r="6" fill="rgba(0,0,0,0.6)" />
      </svg>
    </motion.div>
  );
};



// Industrial Gauge Component
export const IndustrialGauge = ({ x, y, size = 100 }) => {
  const [needleAngle, setNeedleAngle] = useState(-90);
  const [glowIntensity, setGlowIntensity] = useState(0);
  const mousePos = useMousePosition();
  const elementRef = useRef(null);

  useEffect(() => {
    if (elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = getDistance(mousePos.x, mousePos.y, centerX, centerY);
      const proximity = getProximityFactor(distance, 120);
      
      setNeedleAngle(-90 + proximity * 180);
      setGlowIntensity(proximity);
    }
  }, [mousePos]);

  return (
    <motion.div
      ref={elementRef}
      className="absolute pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        filter: `drop-shadow(0 0 ${glowIntensity * 15}px rgba(184, 115, 51, ${glowIntensity}))`,
      }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Gauge body */}
        <circle 
          cx="50" 
          cy="50" 
          r="45" 
          fill="url(#gaugeGradient)" 
          stroke="rgb(44, 44, 44)"
          strokeWidth="3"
        />
        {/* Gauge face */}
        <circle 
          cx="50" 
          cy="50" 
          r="35" 
          fill="rgb(20, 20, 20)"
          stroke="rgb(184, 115, 51)"
          strokeWidth="1"
        />
        {/* Scale marks */}
        {Array.from({ length: 9 }, (_, i) => {
          const angle = -90 + (i * 22.5);
          const x1 = 50 + 30 * Math.cos(angle * Math.PI / 180);
          const y1 = 50 + 30 * Math.sin(angle * Math.PI / 180);
          const x2 = 50 + 25 * Math.cos(angle * Math.PI / 180);
          const y2 = 50 + 25 * Math.sin(angle * Math.PI / 180);
          
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgb(245, 245, 245)"
              strokeWidth="1"
            />
          );
        })}
        {/* Needle */}
        <line
          x1="50"
          y1="50"
          x2={50 + 25 * Math.cos(needleAngle * Math.PI / 180)}
          y2={50 + 25 * Math.sin(needleAngle * Math.PI / 180)}
          stroke="rgb(255, 107, 53)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Center dot */}
        <circle cx="50" cy="50" r="3" fill="rgb(184, 115, 51)" />
        
        {/* Gradient definition */}
        <defs>
          <radialGradient id="gaugeGradient" cx="0.3" cy="0.3">
            <stop offset="0%" stopColor="rgb(113, 121, 126)" />
            <stop offset="100%" stopColor="rgb(44, 44, 44)" />
          </radialGradient>
        </defs>
      </svg>
    </motion.div>
  );
};

// Floating Cog Component
export const FloatingCog = ({ initialX, initialY, size = 40 }) => {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const mousePos = useMousePosition();
  const elementRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && elementRef.current) {
      const currentX = (initialX / 100) * window.innerWidth;
      const currentY = (initialY / 100) * window.innerHeight;
      const distance = getDistance(mousePos.x, mousePos.y, currentX, currentY);
      const proximity = getProximityFactor(distance, 120);
      
      if (proximity > 0.2) {
        // Move slightly towards mouse
        const targetX = initialX + (mousePos.x / window.innerWidth * 100 - initialX) * proximity * 0.15;
        const targetY = initialY + (mousePos.y / window.innerHeight * 100 - initialY) * proximity * 0.15;
        
        setPosition({ x: targetX, y: targetY });
      } else {
        // Return to original position
        setPosition({ x: initialX, y: initialY });
      }
    }
  }, [mousePos, initialX, initialY]);

  return (
    <motion.div
      ref={elementRef}
      className="absolute text-industrial-brass pointer-events-none"
      style={{ 
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: size, 
        height: size 
      }}
      animate={{
        rotate: 360,
        scale: position.x !== initialX || position.y !== initialY ? 1.2 : 1,
      }}
      transition={{ 
        rotate: {
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        },
        scale: {
          duration: 0.3
        },
        left: {
          duration: 0.6,
          ease: "easeOut"
        },
        top: {
          duration: 0.6,
          ease: "easeOut"
        }
      }}
    >
      <svg viewBox="0 0 50 50" className="w-full h-full">
        {/* Better gear teeth design */}
        <path
          d="M25,2 L28,4 L42,4 L45,8 L42,12 L28,12 L26,14 L24,14 L22,12 L8,12 L5,8 L8,4 L22,4 L25,2 Z
             M48,25 L46,22 L46,8 L42,5 L38,8 L38,22 L36,24 L36,26 L38,28 L38,42 L42,45 L46,42 L46,28 L48,25 Z
             M25,48 L22,46 L8,46 L5,42 L8,38 L22,38 L24,36 L26,36 L28,38 L42,38 L45,42 L42,46 L28,46 L25,48 Z
             M2,25 L4,28 L4,42 L8,45 L12,42 L12,28 L14,26 L14,24 L12,22 L12,8 L8,5 L4,8 L4,22 L2,25 Z"
          fill="currentColor"
          stroke="rgba(0,0,0,0.4)"
          strokeWidth="0.8"
        />
        <circle cx="25" cy="25" r="10" fill="rgba(0,0,0,0.4)" />
        <circle cx="25" cy="25" r="6" fill="currentColor" />
        <circle cx="25" cy="25" r="3" fill="rgba(0,0,0,0.6)" />
      </svg>
    </motion.div>
  );
};
