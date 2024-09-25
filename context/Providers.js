"use client";

import Loader from "@/components/Loader";
import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import { AnimatePresence } from 'framer-motion'

export default function Providers({ children }) {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoadComplete = () => {
    setIsLoading(false);
  };

  return (
    <>
      <Loader onLoadComplete={handleLoadComplete} />
      {!isLoading && (
        <AnimatePresence
        mode="wait"
        initial={true}
        onExitComplete={() => {
          if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0 })
          }
        }}>

          {children}
          <Toaster richColors closeButton />
        </AnimatePresence>
      )}
    </>
  );
}
