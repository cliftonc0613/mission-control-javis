"use client";

import { useEffect, useRef } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";

export default function AnimatedCounter({
  value,
  suffix = "",
  decimals = 0,
}: {
  value: number;
  suffix?: string;
  decimals?: number;
}) {
  const count = useMotionValue(0);
  const display = useTransform(count, (v) =>
    `${v.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`
  );
  const prev = useRef(0);

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.6,
      ease: "easeOut",
      // continue from previous value on refresh instead of restarting from 0
      ...(prev.current !== 0 && { duration: 0.8 }),
    });
    prev.current = value;
    return controls.stop;
  }, [value, count]);

  return <motion.span>{display}</motion.span>;
}
