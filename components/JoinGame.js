"use client";
import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/client";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

const schema = z.object({
  playerName: z.string().min(2, "Player name must be at least 2 characters"),
  teamName: z.string().min(2, "Team name must be at least 2 characters"),
});

const BUBBLE_COUNT = 150;
const BUBBLE_SPAWN_INTERVAL = 0; // ms

const Bubble = ({ size, left, duration, onComplete }) => (
  <motion.div
    className="absolute rounded-full bg-blue-200"
    style={{
      width: size,
      height: size,
      left: left,
      bottom: "-50px", // Start slightly below the screen
    }}
    initial={{ y: 0, opacity: 0.2 }}
    animate={{ y: "-200vh", opacity: 0.7 }} // Animate to above the viewport
    transition={{ duration: duration, ease: "linear" }}
    onAnimationComplete={onComplete}
  />
);

export default function JoinGame() {
  const [animationStep, setAnimationStep] = useState(0);
  const [bubbles, setBubbles] = useState([]);

  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const handleJoinGame = (playerData, teamData) => {
    localStorage.setItem("playerData", JSON.stringify(playerData));
    localStorage.setItem("teamData", JSON.stringify(teamData));
    router.push("/waiting");
  };

  const joinGame = async (playerName, teamName) => {
    let { data: teamData, error: teamError } = await supabase
      .from("teams")
      .select("*")
      .eq("name", teamName)
      .single();

    if (teamError && teamError.code === "PGRST116") {
      const { data, error } = await supabase
        .from("teams")
        .insert({ name: teamName, score: 0 })
        .select()
        .single();

      if (error) {
        console.error("Error creating team:", error);
        return;
      }
      teamData = data;
    } else if (teamError) {
      console.error("Error fetching team:", teamError);
      return;
    }

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .insert({ name: playerName, team_id: teamData.id })
      .select()
      .single();

    if (playerError) {
      console.error("Error creating player:", playerError);
      return;
    }
    const playerToStore = {
      id: playerData.id,
      name: playerData.name,
    };

    // Start the animation sequence
    setAnimationStep(1);

    // Sequence the animations
    setTimeout(() => setAnimationStep(2), 500); // Background change after form disappears
    setTimeout(() => setAnimationStep(3), 1000); // Further background changes

    // Call onJoin after all animations are complete
    setTimeout(() => {
      handleJoinGame(playerToStore, teamData);
    }, 6000);
  };

  const onSubmit = (data) => {
    joinGame(data.playerName, data.teamName);
  };

  const createBubble = useCallback(() => {
    const size = Math.random() * 50 + 10;
    const left = Math.random() * 100;
    const duration = 5 + Math.random() * 10;

    return {
      id: Math.random(),
      size: `${size}px`,
      left: `${left}%`,
      duration: duration,
    };
  }, []);

  const removeBubble = useCallback((id) => {
    setBubbles((prevBubbles) =>
      prevBubbles.filter((bubble) => bubble.id !== id)
    );
  }, []);

  useEffect(() => {
    const spawnBubble = () => {
      if (bubbles.length < BUBBLE_COUNT) {
        setBubbles((prevBubbles) => [...prevBubbles, createBubble()]);
      }
    };

    const interval = setInterval(spawnBubble, BUBBLE_SPAWN_INTERVAL);

    return () => clearInterval(interval);
  }, [bubbles.length, createBubble]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-white">
      {/* Animated Background */}
      <motion.div
        key="join-game"
        className="absolute inset-0 bg-gradient-to-br from-blue-300 to-blue-600"
        initial={{ clipPath: "circle(0% at 100% 100%)" }}
        animate={{
          clipPath:
            animationStep >= 2
              ? "circle(150% at 100% 100%)"
              : "circle(0% at 100% 100%)",
        }}
        transition={{ duration: 2, ease: [0.32, 0, 0.67, 0] }}
      />

      {/* Bubbles */}
      {bubbles.map((bubble) => (
        <Bubble
          key={bubble.id}
          size={bubble.size}
          left={bubble.left}
          duration={bubble.duration}
          onComplete={() => removeBubble(bubble.id)}
        />
      ))}

      <AnimatePresence>
        {/* Text Container */}
        <div className="w-full flex flex-col items-center justify-center relative z-10 min-h-screen backdrop-blur-sm">
          {/* CODECTIONS Heading with circular text color reveal */}
          <div className="relative">
            <h1 className="font-spicyRice text-7xl font-bold text-center text-[#0D52A0]">
              CODECTIONS
            </h1>
            <motion.div
              className="absolute inset-0 text-white"
              initial={{ clipPath: "circle(0% at 100% 100%)" }}
              animate={{
                clipPath:
                  animationStep >= 2
                    ? "circle(150% at 100% 100%)"
                    : "circle(0% at 100% 100%)",
              }}
              transition={{ duration: 3.65, ease: [0.32, 0, 0.67, 0] }}
            >
              <h1 className="font-spicyRice text-7xl font-bold text-center">
                CODECTIONS
              </h1>
            </motion.div>
          </div>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit(onSubmit)}
            className="w-full max-w-md px-4 mt-8"
            initial={{ opacity: 1, y: 0 }}
            animate={{
              opacity: animationStep >= 1 ? 0 : 1,
              y: animationStep >= 1 ? 100 : 0,
            }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-4">
              <input
                {...register("playerName")}
                placeholder="Enter your name"
                className="border px-4 p-2 w-full rounded-full text-black focus:outline-primary"
                autocomplete="off"
              />
              {errors.playerName && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.playerName.message}
                </p>
              )}
            </div>
            <div className="mb-4">
              <input
                {...register("teamName")}
                placeholder="Enter team name"
                className="border px-4 p-2 w-full rounded-full text-black focus:outline-primary"
                autocomplete="off"
              />
              {errors.teamName && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.teamName.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              className="bg-primary text-white hover:bg-primary/80 font-bold py-2 px-4 rounded-full w-full transition duration-300"
            >
              Join Game
            </button>
          </motion.form>
        </div>
      </AnimatePresence>
    </div>
  );
}
