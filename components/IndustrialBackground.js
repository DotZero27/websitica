import { useState, useEffect, useCallback, useRef } from "react";
import { Cog, Zap, Factory } from "lucide-react";

const PARTICLE_COUNT = 25; // Reduced from 40 for better performance
const SPAWN_INTERVAL = 3000; // Slower spawn rate

const SteamParticle = ({ style, isFlipped, onAnimationEnd, type }) => {
  const icons = {
    steam: <div className="w-8 h-8 rounded-full bg-white/40" />,
    cog: <Cog className="w-10 h-10 text-industrial-copper" />,
    spark: <Zap className="w-6 h-6 text-industrial-fire" />,
    factory: <Factory className="w-12 h-12 text-industrial-steel" />
  };

  return (
    <div
      style={style}
      className={`absolute -z-10 ${isFlipped ? "scale-x-[-1]" : ""}`}
      onAnimationEnd={onAnimationEnd}
    >
      {icons[type]}
      <div className="steam-puff steam-puff-1"></div>
      <div className="steam-puff steam-puff-2"></div>
      <div className="steam-puff steam-puff-3"></div>
    </div>
  );
};

export default function IndustrialBackground() {
  const [particles, setParticles] = useState([]);
  const particleCountRef = useRef(0);

  const createParticle = useCallback(() => {
    const side = Math.random() < 0.5 ? "left" : "right";
    const startY = Math.random() * 100;
    const endY = Math.random() * 100;
    const duration = 20 + Math.random() * 25; // Slower movement
    const types = ['steam', 'cog', 'spark', 'factory'];
    const type = types[Math.floor(Math.random() * types.length)];

    return {
      id: Math.random(),
      startSide: side,
      startY: `${startY}%`,
      endY: `${endY}%`,
      duration: `${duration}s`,
      isFlipped: side === "right",
      type: type,
    };
  }, []);

  const removeParticle = useCallback((id) => {
    setParticles((prevParticles) => prevParticles.filter((particle) => particle.id !== id));
    particleCountRef.current -= 1;
  }, []);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes drift-left-to-right {
        from { left: -10%; }
        to { left: 110%; }
      }
      @keyframes drift-right-to-left {
        from { right: -10%; }
        to { right: 110%; }
      }
      @keyframes steam-rise {
        0% { transform: translateY(0) scale(0.5); opacity: 0.3; }
        50% { transform: translateY(-15px) scale(1); opacity: 0.8; }
        100% { transform: translateY(-30px) scale(0.3); opacity: 0; }
      }
      .industrial-particle { position: absolute; }
      .steam-puff {
        position: absolute;
        background: radial-gradient(circle, rgba(245,245,245,0.6) 0%, rgba(245,245,245,0.1) 70%);
        border-radius: 50%;
        animation: steam-rise 3s infinite;
      }
      .steam-puff-1 { width: 12px; height: 12px; top: -5px; left: 5px; animation-delay: 0s; }
      .steam-puff-2 { width: 8px; height: 8px; top: -10px; left: 15px; animation-delay: 1s; }
      .steam-puff-3 { width: 6px; height: 6px; top: -8px; left: 25px; animation-delay: 2s; }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    const spawnParticle = () => {
      if (particleCountRef.current < PARTICLE_COUNT) {
        setParticles((prevParticles) => [...prevParticles, createParticle()]);
        particleCountRef.current += 1;
      }
    };

    const interval = setInterval(spawnParticle, SPAWN_INTERVAL);

    return () => clearInterval(interval);
  }, [createParticle]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Subtle gradient overlay for depth */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-industrial-coal/20 to-transparent"></div>
      
      {particles.map((particle) => (
        <SteamParticle
          key={particle.id}
          type={particle.type}
          isFlipped={particle.isFlipped}
          style={{
            top: particle.startY,
            [particle.startSide]: "-10%",
            animation: `
              ${
                particle.startSide === "left"
                  ? "drift-left-to-right"
                  : "drift-right-to-left"
              } 
              ${particle.duration} linear forwards,
              move-vertical-${particle.id} ${particle.duration} linear forwards
            `,
            animationTimingFunction: "linear",
          }}
          onAnimationEnd={() => removeParticle(particle.id)}
        />
      ))}
      <style>
        {particles
          .map(
            (particle) => `
          @keyframes move-vertical-${particle.id} {
            from { top: ${particle.startY}; }
            to { top: ${particle.endY}; }
          }
        `
          )
          .join("\n")}
      </style>
    </div>
  );
}
