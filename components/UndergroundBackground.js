import { useState, useEffect, useCallback, useRef } from "react";
import { Fish } from "lucide-react";

const FISH_COUNT = 40;
const SPAWN_INTERVAL = 2000; // ms

const FishWithBubbles = ({ style, isFlipped, onAnimationEnd }) => (
  <div
    style={style}
    className={`absolute -z-10 ${isFlipped ? "scale-x-[-1]" : ""}`}
    onAnimationEnd={onAnimationEnd}
  >
    <Fish className="w-12 h-12 text-yellow-400" />
    <div className="bubble bubble-1"></div>
    <div className="bubble bubble-2"></div>
    <div className="bubble bubble-3"></div>
  </div>
);

export default function UnderwaterBackground() {
  const [fishes, setFishes] = useState([]);
  const fishCountRef = useRef(0);

  const createFish = useCallback(() => {
    const side = Math.random() < 0.5 ? "left" : "right";
    const startY = Math.random() * 100;
    const endY = Math.random() * 100;
    const duration = 15 + Math.random() * 20;

    return {
      id: Math.random(),
      startSide: side,
      startY: `${startY}%`,
      endY: `${endY}%`,
      duration: `${duration}s`,
      isFlipped: side === "right",
    };
  }, []);

  const removeFish = useCallback((id) => {
    setFishes((prevFishes) => prevFishes.filter((fish) => fish.id !== id));
    fishCountRef.current -= 1;
  }, []);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes swim-left-to-right {
        from { left: -10%; }
        to { left: 110%; }
      }
      @keyframes swim-right-to-left {
        from { right: -10%; }
        to { right: 110%; }
      }
      @keyframes bubble {
        0% { transform: translateY(0) scale(0); opacity: 0; }
        50% { transform: translateY(-10px) scale(1); opacity: 1; }
        100% { transform: translateY(-20px) scale(0); opacity: 0; }
      }
      .fish { position: absolute; }
      .bubble {
        position: absolute;
        background-color: rgba(255, 255, 255, 0.5);
        border-radius: 50%;
        animation: bubble 2s infinite;
      }
      .bubble-1 { width: 8px; height: 8px; top: 10px; left: 10px; animation-delay: 0s; }
      .bubble-2 { width: 6px; height: 6px; top: 20px; left: 20px; animation-delay: 0.5s; }
      .bubble-3 { width: 4px; height: 4px; top: 15px; left: 30px; animation-delay: 1s; }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    const spawnFish = () => {
      if (fishCountRef.current < FISH_COUNT) {
        setFishes((prevFishes) => [...prevFishes, createFish()]);
        fishCountRef.current += 1;
      }
    };

    const interval = setInterval(spawnFish, SPAWN_INTERVAL);

    return () => clearInterval(interval);
  }, [createFish]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {fishes.map((fish) => (
        <FishWithBubbles
          key={fish.id}
          isFlipped={fish.isFlipped}
          style={{
            top: fish.startY,
            [fish.startSide]: "-10%",
            animation: `
              ${
                fish.startSide === "left"
                  ? "swim-left-to-right"
                  : "swim-right-to-left"
              } 
              ${fish.duration} linear forwards,
              move-vertical-${fish.id} ${fish.duration} linear forwards
            `,
            animationTimingFunction: "linear",
          }}
          onAnimationEnd={() => removeFish(fish.id)}
        />
      ))}
      <style>
        {fishes
          .map(
            (fish) => `
          @keyframes move-vertical-${fish.id} {
            from { top: ${fish.startY}; }
            to { top: ${fish.endY}; }
          }
        `
          )
          .join("\n")}
      </style>
    </div>
  );
}
