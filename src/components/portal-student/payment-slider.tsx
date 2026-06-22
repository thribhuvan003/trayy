"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { ChevronRight, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentSliderProps {
  onConfirm: () => void;
  isLoading?: boolean;
}

export function PaymentSlider({ onConfirm, isLoading }: PaymentSliderProps) {
  const [isComplete, setIsComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  
  // Use spring for a more fluid, elastic feel
  const springX = useSpring(x, { stiffness: 400, damping: 30 });
  
  // Get dynamic width
  const [maxDrag, setMaxDrag] = useState(250);
  useEffect(() => {
    if (containerRef.current) {
      setMaxDrag(containerRef.current.offsetWidth - 64);
    }
  }, []);

  const opacity = useTransform(x, [0, maxDrag * 0.5], [1, 0]);
  const progressWidth = useTransform(x, [0, maxDrag], ["0%", "100%"]);
  const handleColor = useTransform(x, [0, maxDrag], ["#1A1A19", "#0066FF"]);

  useEffect(() => {
    const unsubscribe = x.onChange((latest) => {
      if (latest >= maxDrag * 0.95 && !isComplete && !isLoading) {
        setIsComplete(true);
        onConfirm();
      }
    });
    return () => unsubscribe();
  }, [x, maxDrag, isComplete, isLoading, onConfirm]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full max-w-md h-16 bg-ink/5 rounded-full p-1 overflow-hidden select-none"
    >
      <motion.div 
        style={{ width: progressWidth }}
        className="absolute inset-0 bg-ocean opacity-10"
      />
      
      <motion.div 
        style={{ opacity }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-dust">
          Slide to Pay
        </span>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0.05}
        dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
        style={{ x: springX, backgroundColor: handleColor }}
        onDragEnd={() => {
          if (x.get() < maxDrag * 0.95) {
            x.set(0);
          }
        }}
        className={cn(
          "relative z-10 w-14 h-14 rounded-full flex items-center justify-center text-white cursor-grab active:cursor-grabbing shadow-lg transition-colors duration-300",
          isComplete && "bg-ocean"
        )}
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Loader2 className="w-6 h-6 animate-spin" />
            </motion.div>
          ) : isComplete ? (
            <motion.div 
              key="check"
              initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
            >
              <Check className="w-6 h-6" strokeWidth={3} />
            </motion.div>
          ) : (
            <motion.div
              key="arrow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <ChevronRight className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
