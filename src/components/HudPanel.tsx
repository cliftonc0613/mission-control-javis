"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export default function HudPanel({
  title,
  children,
  className = "",
  delay = 0,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`hud-panel p-4 ${className}`}
    >
      {title && <h2 className="hud-panel-title">{title}</h2>}
      {children}
    </motion.section>
  );
}
