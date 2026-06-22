"use client";

import React, { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, useAnimation, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentSliderProps {
  onConfirm: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  label?: string;
}

export function PaymentSlider({
  onConfirm,
  isLoading = false,
  disabled = false,
  label = "Slide to confirm payment",
}: PaymentSliderProps) {
  const [isSuccess, setIsSuccess] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const controls = useAnimation();

  // Visual transforms based on drag position
  const opacity = useTransform(x, [0, 100], [1, 0.3]);
  const bgOpacity = useTransform(x, [0, 240], [0, 1]);
  const arrowRotate = useTransform(x, [0, 240], [0, 90]);

  const handleDragEnd = async (_: any, info: any) => {
    if (disabled || isSuccess || isLoading) return;

    // Trigger threshold (80% of the track)
    if (info.offset.x > 200) {
      setIsSuccess(true);
      await controls.start({ x: 250, transition: { type: "spring", stiffness: 500, damping: 30 } });
      onConfirm();
    } else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 25 } });
    }
  };

  return (
    <div
      ref={constraintsRef}
      className={cn(
        "relative h-14 w-full max-w-[320px] rounded-full bg-ink/5 border border-ink/10 overflow-hidden transition-all duration-500",
        (isSuccess || isLoading) && "border-emerald-500/30"
      )}
    >
      {/* Background Progress Fill */}
      <motion.div
        style={{ width: x, opacity: bgOpacity }}
        className="absolute inset-y-0 left-0 bg-emerald-500/10"
      />

      {/* Label Text */}
      <motion.div
        style={{ opacity }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <span className="text-[13px] font-medium tracking-tight text-ink/60 uppercase">
          {label}
        </span>
      </motion.div>

      {/* The Slider Handle */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 250 }}
        dragElastic={0.05}
        dragSnapToOrigin={false}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className={cn(
          "absolute left-1 top-1 bottom-1 aspect-square rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing z-10 transition-colors duration-300 shadow-sm",
          isSuccess ? "bg-emerald-500 text-white" : "bg-white text-ink border border-ink/5"
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
              <Loader2 className="animate-spin" size={18} />
            </motion.div>
          ) : isSuccess ? (
            <motion.div
              key="check"
              initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
            >
              <Check size={20} strokeWidth={3} />
            </motion.div>
          ) : (
            <motion.div
              key="arrow"
              style={{ rotate: arrowRotate }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <ArrowRight size={18} strokeWidth={2.5} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Subtle Success Glow */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-emerald-500/5 pointer-events-none"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
