"use client";
import { useState, useEffect } from "react";
import { ArrowLeft, Cog, Factory, Loader2 } from "lucide-react";
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
import IndustrialBackground from "./IndustrialBackground";

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
      className="min-h-screen flex relative lg:flex-row bg-gradient-to-br from-industrial-charcoal to-industrial-coal overflow-hidden"
    >
      <IndustrialBackground/>
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
            <Factory className="text-industrial-copper w-full h-full opacity-20" />
          </div>
          <CardTitle
            className={`font-industrial text-4xl font-bold text-center text-industrial-charcoal relative z-10 tracking-wider`}
          >
            ENGINES WARMING UP
          </CardTitle>
          <CardDescription className="text-center text-industrial-copper relative z-10 font-mechanical text-lg">
            The machinery is starting up!
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4">
          <Cog className="w-16 h-16 text-industrial-copper animate-spin" />
          <p className="text-lg text-industrial-charcoal font-mechanical">
            Time elapsed: {waitingTime} seconds
          </p>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-4">
          <p className="text-sm text-industrial-copper flex items-center">
            <Cog className="mr-2" size={16} />
            {message ? (
              <span className="mb-4 text-industrial-copper font-mechanical">{message}</span>
            ) : (
              <span className="font-mechanical">The engines will start once all workers are ready</span>
            )}
          </p>
          <Button
            onClick={onLogout}
            variant="outline"
            className="w-full bg-industrial-fire/20 hover:bg-industrial-fire/30 text-industrial-fire border-industrial-fire font-mechanical"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> LEAVE FACTORY / CHANGE DETAILS
          </Button>
        </CardFooter>
      </Card>

      </div>

    </motion.div>
  );
}
