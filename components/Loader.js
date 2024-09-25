import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

import Logo from "@/assets/SSN_IT_White.svg";
import ThemeLogo from "@/assets/14-LifeBelowWater.jpg";
import { useLatency } from "@/hooks/useLatency";

const LOADING_DURATION = 1500;

export default function Loader({ onLoadComplete }) {
  const [isLoading, setIsLoading] = useState(true);
  const { latency, isStable, status } = useLatency();

  useEffect(() => {
    let loadingTimer;

    if (isStable) {
      loadingTimer = setTimeout(() => {
        setIsLoading(false);
        onLoadComplete();
      }, LOADING_DURATION);
    }

    return () => {
      loadingTimer && clearTimeout(loadingTimer);
    };
  }, [isStable, onLoadComplete]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
    exit: {
      y: "-100%",
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 100,
        duration: 0.8,
      },
    },
  };

  const letterVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200,
      },
    },
  };

  const dotsContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.2,
      },
    },
  };

  const dotVariants = {
    hidden: { y: 0, opacity: 0 },
    visible: {
      y: [-5, 0],
      opacity: 1,
      transition: {
        y: {
          repeat: Infinity,
          repeatType: "reverse",
          duration: 0.6,
        },
        opacity: { duration: 0.2 },
      },
    },
  };

  const text = "Websitica";

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="main-loader"
          className="font-spicyRice text-white flex flex-col items-center justify-center fixed inset-0 z-50 text-7xl bg-gradient-to-br from-blue-300 to-blue-600"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="absolute top-12 left-12">
            <Image src={Logo} className="w-40 antialiased" alt="logo" />
          </div>
          <div className="text-lg absolute bottom-12 right-12">
            {status} {latency > 0 && `(${latency.toFixed(0)}ms)`}
          </div>

          <div className="flex mb-4">
            {text.split("").map((letter, index) => (
              <motion.span key={index} variants={letterVariants}>
                {letter}
              </motion.span>
            ))}
          </div>
          <div className="text-3xl flex items-end">
            <motion.div
              className="flex"
              variants={dotsContainerVariants}
              initial="hidden"
              animate="visible"
            >
              {[0, 1, 2].map((index) => (
                <motion.span key={index} variants={dotVariants} className="w-3">
                  .
                </motion.span>
              ))}
            </motion.div>
          </div>
          {/* <Image src={ThemeLogo} className="w-40 antialiased" alt="logo" /> */}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
