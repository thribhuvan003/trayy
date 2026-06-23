# Neobrutalist & Bento Grid Design Specification

This document provides a comprehensive design specification, styling rules, layout guidelines, component implementations, and typography setup for building high-fidelity Neobrutalist-Bento Hybrid interfaces.

---

## 1. Neobrutalist UI Styling Specification

Neobrutalism rejects standard modern design tropes (soft gradients, subtle shadows, low contrast) and returns to raw, structural, high-contrast aesthetics.

### 1.1 Core Visual Design Tokens

| Property | Value / Spec | Tailwind Class | CSS Rule |
| :--- | :--- | :--- | :--- |
| **Borders** | Solid, thick, dark stroke | `border-[3px] border-black` | `border: 3px solid #000000;` |
| **Border Radius**| Sharp or moderate rounding | `rounded-md` or `rounded-xl` | `border-radius: 6px;` or `12px;` |
| **Offset Shadow** | Hard offset shadow, no blur | `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]` | `box-shadow: 4px 4px 0px 0px #000000;` |
| **Large Shadow** | Expanded offset shadow for cards| `shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]` | `box-shadow: 8px 8px 0px 0px #000000;` |

> [!IMPORTANT]
> Neobrutalist shadows must have **no blur radius** (`0px`). Adding blur ruins the flat physical look.

### 1.2 Color Harmony Palette

Neobrutalism uses a high-contrast base with ultra-saturated accent colors (sometimes called "Neo-Pop" colors).

*   **Stroke & Shadow Base**: `#000000` (Pure Black)
*   **Vibrant Background Accent Colors**:
    *   **Cyber Yellow**: `#FDE047` / `#FACC15` (`bg-yellow-300` / `bg-yellow-400`)
    *   **Mint Green**: `#86EFAC` / `#4ADE80` (`bg-green-300` / `bg-green-400`)
    *   **Neon Cyan**: `#67E8F9` / `#22D3EE` (`bg-cyan-300` / `bg-cyan-400`)
    *   **Hot Pink**: `#F472B6` / `#F43F5E` (`bg-pink-400` / `bg-rose-500`)
    *   **Electric Purple**: `#A78BFA` / `#8B5CF6` (`bg-violet-400` / `bg-violet-600`)
    *   **Safety Orange**: `#FB923C` / `#F97316` (`bg-orange-400` / `bg-orange-500`)
*   **Neutral Backgrounds**:
    *   **Pure White**: `#FFFFFF` (`bg-white`)
    *   **Off-White / Cream**: `#FDFBF7` (custom warm background)
    *   **Soft Gray**: `#F4F4F5` (`bg-zinc-100`)

### 1.3 Neobrutalist Button Component (HTML/CSS & Tailwind)

Interactive components must feel physical. On hover, the button elevates or shifts. On click, the button translates down and right to match the exact dimensions of the shadow offset, giving a tactile "pressed" feel.

#### Tailwind CSS Implementation
```html
<button class="
  px-6 py-3 font-extrabold text-black bg-yellow-400 
  border-[3px] border-black rounded-lg 
  shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] 
  transition-all duration-100 ease-in-out
  hover:-translate-x-[2px] hover:-translate-y-[2px] 
  hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
  active:translate-x-[4px] active:translate-y-[4px] 
  active:shadow-none
">
  Confirm Order
</button>
```

#### Pure CSS Implementation
```html
<!-- HTML -->
<button class="neo-button">Confirm Order</button>

<!-- CSS -->
<style>
.neo-button {
  display: inline-block;
  padding: 12px 24px;
  font-family: 'Outfit', sans-serif;
  font-size: 16px;
  font-weight: 800;
  color: #000000;
  background-color: #FACC15; /* Cyber Yellow */
  border: 3px solid #000000;
  border-radius: 8px;
  box-shadow: 4px 4px 0px 0px #000000;
  cursor: pointer;
  outline: none;
  transition: all 0.1s ease-in-out;
  user-select: none;
}

.neo-button:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0px 0px #000000;
}

.neo-button:active {
  transform: translate(4px, 4px);
  box-shadow: 0px 0px 0px 0px #000000;
}
</style>
```

---

## 2. Bento Grid Structural Guidelines

Bento Grid layouts partition user interface spaces into modular cards of various dimensions (1x1, 1x2, 2x1, 2x2, etc.) that align perfectly within a parent grid container.

### 2.1 Structural Grid Rules
1.  **Grid Foundation**: Define a clear 4-column layout on medium/large devices (`md:grid-cols-4`) and drop back to a 1-column layout on mobile.
2.  **Row Height**: Establish uniform grid tracks using `auto-rows-[height]` (e.g. `auto-rows-[180px]`). Using fixed heights keeps the boxes proportional.
3.  **Spans**: Combine column-spanning (`col-span-x`) and row-spanning (`row-span-y`) to build asymmetrical visual hierarchy.
4.  **Bento Gaps**: Use a standard gap (e.g. `gap-4` or `gap-6`) to delineate card borders clearly.

### 2.2 Bento Layout Templates

#### CSS Grid Schema Visualizer
```
+-------------------------------------------------------+
|        Card 1 (2x2)         |      Card 2 (2x1)       |
|        [col-span-2]         |      [col-span-2]       |
|        [row-span-2]         |      [row-span-1]       |
|                             +-------------------------+
|                             |      Card 3 (2x1)       |
|                             |      [col-span-2]       |
|                             |      [row-span-1]       |
+-----------------------------+-------------------------+
|  Card 4 (1x1) |       Card 5 (2x1)      |Card 6 (1x1) |
|  [col-span-1] |       [col-span-2]      |[col-span-1] |
+-------------------------------------------------------+
```

#### Tailwind CSS & React Code

```tsx
import React from 'react';
import { Sparkles, Activity, ShieldCheck, Users, TrendingUp, Zap } from 'lucide-react';

export function BentoGridDemo() {
  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[180px]">
        
        {/* Card 1: Large Featured Card (2x2) */}
        <div className="col-span-1 md:col-span-2 row-span-2 border-[3px] border-black bg-white rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 flex flex-col justify-between">
          <div className="w-12 h-12 rounded-xl bg-yellow-400 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Sparkles className="w-6 h-6 text-black" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Overview</span>
            <h3 className="text-2xl font-extrabold text-black mt-1">Stunning Analytics Dashboard</h3>
            <p className="text-zinc-600 text-sm mt-2">
              Track student enrollment progress, cohort statistics, and live interaction tracking via a unified Bento-style control panel.
            </p>
          </div>
        </div>

        {/* Card 2: Wide Card (2x1) */}
        <div className="col-span-1 md:col-span-2 row-span-1 border-[3px] border-black bg-cyan-300 rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 flex items-center justify-between">
          <div className="max-w-[70%]">
            <h3 className="text-xl font-extrabold text-black">Security Ensured</h3>
            <p className="text-black/80 text-xs mt-1">Encrypted checkout sliders and multi-factor validation portals.</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <ShieldCheck className="w-6 h-6 text-black" />
          </div>
        </div>

        {/* Card 3: Another Wide Card (2x1) */}
        <div className="col-span-1 md:col-span-2 row-span-1 border-[3px] border-black bg-pink-300 rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 flex items-center justify-between">
          <div className="max-w-[70%]">
            <h3 className="text-xl font-extrabold text-black">Active Cohorts</h3>
            <p className="text-black/80 text-xs mt-1">Real-time chat, code review rosters, and leaderboard rankings.</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Users className="w-6 h-6 text-black" />
          </div>
        </div>

        {/* Card 4: Small Card (1x1) */}
        <div className="col-span-1 row-span-1 border-[3px] border-black bg-green-300 rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 flex flex-col justify-between">
          <div className="w-10 h-10 rounded-lg bg-white border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Activity className="w-5 h-5 text-black" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-black leading-none">99.9%</h4>
            <p className="text-black/70 text-xs mt-1">Uptime SLA</p>
          </div>
        </div>

        {/* Card 5: Long Middle Card (2x1) */}
        <div className="col-span-1 md:col-span-2 row-span-1 border-[3px] border-black bg-white rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Traction</span>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-black">System Scaling</h3>
            <p className="text-zinc-500 text-xs mt-0.5">Automated queue processing distributes task loads.</p>
          </div>
        </div>

        {/* Card 6: Small Card (1x1) */}
        <div className="col-span-1 row-span-1 border-[3px] border-black bg-violet-400 rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 flex flex-col justify-between">
          <div className="w-10 h-10 rounded-lg bg-white border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Zap className="w-5 h-5 text-black" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-black leading-none">12ms</h4>
            <p className="text-black/80 text-xs mt-1">Latency</p>
          </div>
        </div>

      </div>
    </div>
  );
}
```

---

## 3. Drag-to-Confirm Checkout Slider

The **drag-to-confirm** checkout slider provides a secure and satisfying checkout flow. The slider thumb must be dragged from left to right. If the user releases the thumb before it hits the right edge (the completion threshold), it springs back to the starting point.

### 3.1 React + Framer Motion Component

This component uses Framer Motion's `drag` hook structure and physics to handle mouse/touch inputs.

```tsx
"use client";

import React, { useRef, useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";

interface DragConfirmSliderProps {
  onConfirm: () => void;
  text?: string;
  successText?: string;
  width?: number; // Total width of the slider container in pixels
}

export function DragConfirmSlider({
  onConfirm,
  text = "Slide to confirm payment",
  successText = "Payment confirmed!",
  width = 320,
}: DragConfirmSliderProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);
  
  // Track horizontal position of thumb
  const x = useMotionValue(0);
  
  // The thumb is 52px wide (w-13). Total drag distance: width - thumbWidth - padding.
  const thumbWidth = 52;
  const padding = 12; // p-1.5 = 6px on each side (total 12px)
  const dragRange = width - thumbWidth - padding;

  // Transform opacity of the background instruction label as we slide
  const labelOpacity = useTransform(x, [0, dragRange / 1.5], [1, 0]);
  
  // Transform background color saturation / fill percentage
  const fillWidth = useTransform(x, (latest) => `${latest + thumbWidth / 2}px`);

  const handleDragEnd = () => {
    setIsDragging(false);
    
    // Check if user reached the threshold (95% of drag range)
    if (x.get() >= dragRange * 0.95) {
      x.set(dragRange);
      setIsConfirmed(true);
      if (onConfirm) onConfirm();
    } else {
      // Spring back to starting position if released early
      x.set(0);
    }
  };

  return (
    <div
      ref={constraintsRef}
      className="relative h-[68px] border-[3px] border-black bg-white rounded-2xl p-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden select-none"
      style={{ width: `${width}px` }}
    >
      {/* Slide Progress Fill (Dynamic Green Background) */}
      <motion.div
        className="absolute top-0 left-0 h-full bg-green-400 border-r-2 border-black"
        style={{ width: fillWidth }}
      />

      {/* Slide Instructions Label */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-black pointer-events-none z-10"
        style={{ opacity: isConfirmed ? 0 : labelOpacity }}
      >
        {text}
        <ArrowRight className="w-4 h-4 ml-2 animate-pulse" />
      </motion.div>

      {/* Success State Indicator */}
      {isConfirmed && (
        <div className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-black z-10 bg-green-400">
          {successText}
          <Check className="w-5 h-5 ml-2 border-2 border-black rounded-full p-0.5 bg-white" />
        </div>
      )}

      {/* Draggable Thumb (Slider Handle) */}
      {!isConfirmed && (
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: dragRange }}
          dragElastic={0.05}
          dragMomentum={false}
          style={{ x }}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
          className={`
            relative z-20 w-[52px] h-[50px] 
            border-[3px] border-black bg-yellow-300 rounded-xl 
            flex items-center justify-center cursor-grab 
            shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
            transition-colors duration-150
            active:cursor-grabbing active:bg-yellow-400
            \${isDragging ? 'shadow-none' : ''}
          `}
        >
          <ArrowRight className="w-5 h-5 text-black" />
        </motion.div>
      )}
    </div>
  );
}
```

### 3.2 Pure HTML / Vanilla CSS & JS Checkout Slider

For non-React systems or static web pages (e.g. `student.html`), this implementation works purely on raw mouse/touch events.

```html
<!-- HTML Structure -->
<div class="neo-slider-container" id="checkout-slider">
  <div class="neo-slider-fill" id="slider-fill"></div>
  <div class="neo-slider-text" id="slider-text">
    Slide to Confirm Payment <span class="arrow-pulse">→</span>
  </div>
  <div class="neo-slider-thumb" id="slider-thumb">
    <span class="thumb-icon">→</span>
  </div>
</div>

<!-- CSS Styling -->
<style>
.neo-slider-container {
  position: relative;
  width: 320px;
  height: 68px;
  background-color: #FFFFFF;
  border: 3px solid #000000;
  border-radius: 16px;
  box-shadow: 4px 4px 0px 0px #000000;
  padding: 6px;
  overflow: hidden;
  box-sizing: border-box;
  user-select: none;
  -webkit-user-select: none;
}

.neo-slider-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 0;
  background-color: #86EFAC; /* Light Green */
  border-right: 3px solid #000000;
  box-sizing: border-box;
  z-index: 1;
}

.neo-slider-text {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  font-weight: 800;
  color: #000000;
  pointer-events: none;
  z-index: 2;
  box-sizing: border-box;
}

.arrow-pulse {
  margin-left: 8px;
  animation: pulse-arrow 1.2s infinite;
}

@keyframes pulse-arrow {
  0% { transform: translateX(0); opacity: 0.6; }
  50% { transform: translateX(4px); opacity: 1; }
  100% { transform: translateX(0); opacity: 0.6; }
}

.neo-slider-thumb {
  position: relative;
  width: 52px;
  height: 50px;
  background-color: #FDE047; /* Cyber Yellow */
  border: 3px solid #000000;
  border-radius: 10px;
  box-shadow: 2px 2px 0px 0px #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  z-index: 3;
  box-sizing: border-box;
}

.neo-slider-thumb:active {
  cursor: grabbing;
  background-color: #FACC15;
  box-shadow: none;
  transform: translate(2px, 2px);
}

.thumb-icon {
  font-size: 20px;
  font-weight: 800;
  color: #000000;
}

.neo-slider-container.confirmed {
  background-color: #86EFAC;
}

.neo-slider-container.confirmed .neo-slider-thumb {
  display: none;
}

.neo-slider-container.confirmed .neo-slider-fill {
  width: 100% !important;
  border-right: none;
}
</style>

<!-- JavaScript Event Handling -->
<script>
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("checkout-slider");
  const thumb = document.getElementById("slider-thumb");
  const fill = document.getElementById("slider-fill");
  const label = document.getElementById("slider-text");

  let isDragging = false;
  let startX = 0;
  let currentX = 0;
  let isConfirmed = false;

  const thumbWidth = 52;
  const padding = 12; // 6px padding on left & right
  const containerWidth = container.offsetWidth;
  const maxDrag = containerWidth - thumbWidth - padding;

  // Add transition helper
  function setThumbTransition(hasTransition) {
    if (hasTransition) {
      thumb.style.transition = "transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)";
      fill.style.transition = "width 0.2s cubic-bezier(0.25, 1, 0.5, 1)";
    } else {
      thumb.style.transition = "none";
      fill.style.transition = "none";
    }
  }

  function startDrag(e) {
    if (isConfirmed) return;
    isDragging = true;
    startX = (e.type === "touchstart") ? e.touches[0].clientX : e.clientX;
    currentX = 0;
    setThumbTransition(false);
  }

  function doDrag(e) {
    if (!isDragging || isConfirmed) return;
    const clientX = (e.type === "touchmove") ? e.touches[0].clientX : e.clientX;
    let deltaX = clientX - startX;

    // Boundary containment (0 <= x <= maxDrag)
    deltaX = Math.max(0, Math.min(deltaX, maxDrag));
    currentX = deltaX;

    // Apply movement
    thumb.style.transform = `translateX(\${deltaX}px)`;
    
    // Fill tracking
    const fillWidth = deltaX + (thumbWidth / 2);
    fill.style.width = `\${fillWidth}px`;

    // Fade text label
    const progress = deltaX / maxDrag;
    label.style.opacity = Math.max(0, 1 - (progress * 1.5));
  }

  function endDrag() {
    if (!isDragging || isConfirmed) return;
    isDragging = false;

    // Check confirmation (threshold: 95% of maxDrag)
    if (currentX >= maxDrag * 0.95) {
      isConfirmed = true;
      setThumbTransition(true);
      
      // Lock at completed position
      thumb.style.transform = `translateX(\${maxDrag}px)`;
      fill.style.width = "100%";
      container.classList.add("confirmed");
      
      // Update label to Success State
      label.innerText = "Payment Confirmed! ✓";
      label.style.opacity = 1;
      
      // Execute completion callback
      if (typeof window.onCheckoutConfirmed === "function") {
        window.onCheckoutConfirmed();
      }
    } else {
      // Spring back to 0
      setThumbTransition(true);
      thumb.style.transform = "translateX(0px)";
      fill.style.width = "0px";
      label.style.opacity = 1;
    }
  }

  // Mouse Listeners
  thumb.addEventListener("mousedown", startDrag);
  window.addEventListener("mousemove", doDrag);
  window.addEventListener("mouseup", endDrag);

  // Touch Listeners
  thumb.addEventListener("touchstart", startDrag);
  window.addEventListener("touchmove", doDrag);
  window.addEventListener("touchend", endDrag);
});
</script>
```

---

## 4. Premium Web Fonts Reference

Premium websites use unique sans-serif and high-contrast serif typography. The fonts used in these cohorts, and their configuration pipelines, are detailed below.

### 4.1 Fonts Mapping & CDN Integrations

| Font Name | Category | Provider | CDN Embed Link / Import |
| :--- | :--- | :--- | :--- |
| **Outfit** | Clean Sans-Serif | Google Fonts | `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');` |
| **Bricolage Grotesque** | Creative Sans-Serif | Google Fonts | `@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap');` |
| **Instrument Serif** | Elegant Retro Serif | Google Fonts | `@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital,wght@0,400;1,400&display=swap');` |
| **Syne** | Bold Geometric Sans | Google Fonts | `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400..800&display=swap');` |
| **Cabinet Grotesk** | Display Grotesk | Fontshare | `@import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@100,200,300,400,500,700,800,900&display=swap');` |
| **Clash Display** | Modern Display | Fontshare | `@import url('https://api.fontshare.com/v2/css?f[]=clash-display@200,300,400,500,600,700&display=swap');` |

### 4.2 Tailwind Config Integration

Add these fonts into your Tailwind config configuration, mapping theme font families:

#### Tailwind CSS v3 Configuration (`tailwind.config.js`)
```javascript
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  theme: {
    extend: {
      fontFamily: {
        outfit: ['Outfit', ...defaultTheme.fontFamily.sans],
        bricolage: ['"Bricolage Grotesque"', ...defaultTheme.fontFamily.sans],
        instrument: ['"Instrument Serif"', ...defaultTheme.fontFamily.serif],
        syne: ['Syne', ...defaultTheme.fontFamily.sans],
        cabinet: ['"Cabinet Grotesk"', ...defaultTheme.fontFamily.sans],
        clash: ['"Clash Display"', ...defaultTheme.fontFamily.sans],
      },
    },
  },
}
```

#### Tailwind CSS v4 Configuration (`global.css`)
```css
@theme {
  --font-outfit: "Outfit", sans-serif;
  --font-bricolage: "Bricolage Grotesque", sans-serif;
  --font-instrument: "Instrument Serif", serif;
  --font-syne: "Syne", sans-serif;
  --font-cabinet: "Cabinet Grotesk", sans-serif;
  --font-clash: "Clash Display", sans-serif;
}
```
