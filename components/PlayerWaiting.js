"use client";
import { useState, useEffect } from "react";
import { ArrowLeft, Fish, Waves, Loader2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "./ui/button";
import { motion } from "framer-motion";
import UnderwaterBackground from "./UndergroundBackground";

const easing = [0.22, 1, 0.36, 1];

const variants = {
  hidden: { opacity: 0, x: 0, y: 20 },
  enter: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      duration: 0.6,
      ease: easing,
    },
  },
  exit: { opacity: 0, x: 0, y: 0 },
};

export default function PlayerWaiting({
  player,
  team,
  upcomingSession,
  message,
  onLogout,
}) {
  const [waitingTime, setWaitingTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setWaitingTime((prevTime) => prevTime + 1);
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <motion.div
      initial="hidden"
      key="waiting"
      animate="enter"
      exit="exit"
      variants={variants}
      transition={{ duration: 0.4, type: "easeInOut" }}
      className="min-h-screen flex relative lg:flex-row bg-gradient-to-br from-blue-300 to-blue-600 overflow-hidden"
    >
      <UnderwaterBackground/>
      <div className="w-full flex items-center justify-center p-8 backdrop-blur-sm">

      {/* {upcomingSession && (
        <p className="mb-8">
          Next session starts at:{" "}
          {new Date(upcomingSession.start_time).toLocaleString()}
        </p>
      )} */}

      <Card
        variants={variants}
        initial="hidden"
        animate="enter"
        transition={{ type: "linear" }}
        className="w-full max-w-md bg-white/80 backdrop-blur-sm relative z-10"
      >
        <CardHeader className="relative">
          <div className="absolute top-0 left-0 w-full h-24 overflow-hidden">
            <Waves className="text-blue-500 w-full h-full opacity-20" />
          </div>
          <CardTitle
            className={`font-spicyRice text-3xl font-bold text-center text-blue-800 relative z-10`}
          >
            Waiting for Other Players
          </CardTitle>
          <CardDescription className="text-center text-blue-600 relative z-10">
            Get ready to dive!
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
          <p className="text-lg text-blue-700">
            Time elapsed: {waitingTime} seconds
          </p>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-4">
          <p className="text-sm text-blue-600 flex items-center">
            <Fish className="mr-2" size={16} />
            {message ? (
              <span className="mb-4 text-blue-600">{message}</span>
            ) : (
              "The game will start once all players are ready"
            )}
          </p>
          <Button
            onClick={onLogout}
            variant="outline"
            className="w-full bg-red-100 hover:bg-red-200 text-red-600 border-red-300"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Quit / Change Details
          </Button>
        </CardFooter>
      </Card>

      </div>

    </motion.div>
  );
}
