"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/client";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  InteractiveGear, 
  IndustrialGauge, 
  FloatingCog 
} from "@/components/InteractiveIndustrialElements";

const schema = z.object({
  playerName: z.string().min(2, "Player name must be at least 2 characters"),
  teamName: z.string().min(2, "Team name must be at least 2 characters"),
});

export default function JoinGame({ lab = null }) {
  const [animationStep, setAnimationStep] = useState(0);

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
    // First check if team name already exists globally (across all labs)
    const { data: existingTeam, error: existingTeamError } = await supabase
      .from("teams")
      .select("*")
      .eq("name", teamName)
      .single();

    if (existingTeam && existingTeam.lab !== lab) {
      alert(`Team name "${teamName}" is already taken in Lab ${existingTeam.lab}. Please choose a different team name.`);
      return;
    }

    let { data: teamData, error: teamError } = await supabase
      .from("teams")
      .select("*")
      .eq("name", teamName)
      .eq("lab", lab)
      .single();

    if (teamError && teamError.code === "PGRST116") {
      const { data, error } = await supabase
        .from("teams")
        .insert({ name: teamName, score: 0, lab: lab })
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



  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-industrial-steam">
      {/* Animated Background */}
      <motion.div
        key="join-game"
        className="absolute inset-0 bg-gradient-to-br from-industrial-charcoal to-industrial-coal"
        initial={{ clipPath: "circle(0% at 100% 100%)" }}
        animate={{
          clipPath:
            animationStep >= 2
              ? "circle(150% at 100% 100%)"
              : "circle(0% at 100% 100%)",
        }}
        transition={{ duration: 2, ease: [0.32, 0, 0.67, 0] }}
      />

      {/* Interactive Industrial Elements */}
      
      {/* Large Rotating Gears - Better positioned */}
      <InteractiveGear size={120} x={2} y={10} baseSpeed={1} color="copper" />
      <InteractiveGear size={100} x={85} y={15} baseSpeed={1.5} color="brass" />
      <InteractiveGear size={80} x={8} y={78} baseSpeed={2} color="steel" />
      <InteractiveGear size={90} x={88} y={75} baseSpeed={1.2} color="iron" />
      
      {/* Industrial Gauges */}
      <IndustrialGauge x={90} y={5} size={80} />
      <IndustrialGauge x={5} y={2} size={70} />
      
      {/* Floating Cogs - Well distributed across screen */}
      <FloatingCog initialX={18} initialY={35} size={35} />
      <FloatingCog initialX={75} initialY={28} size={40} />
      <FloatingCog initialX={12} initialY={58} size={30} />
      <FloatingCog initialX={85} initialY={55} size={45} />
      <FloatingCog initialX={35} initialY={15} size={25} />
      <FloatingCog initialX={65} initialY={88} size={35} />
      <FloatingCog initialX={45} initialY={20} size={28} />
      <FloatingCog initialX={55} initialY={75} size={32} />

      <AnimatePresence>
        {/* Text Container */}
        <div className="w-full flex flex-col items-center justify-center relative z-10 min-h-screen">
          {/* CODECTIONS Heading with circular text color reveal */}
          <div className="relative">
            <h1 className="font-industrial text-8xl font-bold text-center text-industrial-copper tracking-wider">
              CODECTIONS
            </h1>
            <motion.div
              className="absolute inset-0 text-industrial-steam"
              initial={{ clipPath: "circle(0% at 100% 100%)" }}
              animate={{
                clipPath:
                  animationStep >= 2
                    ? "circle(150% at 100% 100%)"
                    : "circle(0% at 100% 100%)",
              }}
              transition={{ duration: 3.65, ease: [0.32, 0, 0.67, 0] }}
            >
              <h1 className="font-industrial text-8xl font-bold text-center tracking-wider">
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
                className="border-2 border-industrial-steel px-4 p-3 w-full rounded-lg text-industrial-charcoal bg-industrial-steam/90 focus:outline-none focus:border-industrial-copper font-mechanical placeholder-industrial-smoke"
                autoComplete="off"
              />
              {errors.playerName && (
                <p className="text-industrial-fire text-sm mt-1 font-mechanical">
                  {errors.playerName.message}
                </p>
              )}
            </div>
            <div className="mb-4">
              <input
                {...register("teamName")}
                placeholder="Enter team name"
                className="border-2 border-industrial-steel px-4 p-3 w-full rounded-lg text-industrial-charcoal bg-industrial-steam/90 focus:outline-none focus:border-industrial-copper font-mechanical placeholder-industrial-smoke"
                autoComplete="off"
              />
              {errors.teamName && (
                <p className="text-industrial-fire text-sm mt-1 font-mechanical">
                  {errors.teamName.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              className="bg-industrial-copper text-industrial-steam hover:bg-industrial-brass font-bold py-3 px-6 rounded-lg w-full transition duration-300 shadow-xl border-2 border-industrial-steel font-industrial text-lg tracking-wide"
            >
              FIRE UP THE ENGINE
            </button>
          </motion.form>
        </div>
      </AnimatePresence>
    </div>
  );
}
