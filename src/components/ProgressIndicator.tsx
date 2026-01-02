"use client";

import { motion } from "framer-motion";

interface ProgressIndicatorProps {
    currentIndex: number;
    totalSentences: number;
    isFinished: boolean;
    onFinish?: () => void;
}

export default function ProgressIndicator({
    currentIndex,
    totalSentences,
    isFinished,
    onFinish,
}: ProgressIndicatorProps) {
    const START_DELAY = isFinished ? 0.3 : 0;

    return (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[5vh] flex flex-col items-center">
            {/* Counter text */}
            <motion.p
                className="tracking-wide text-[#aaa] text-[clamp(12px,1vw,16px)] mb-2"
                animate={{
                    opacity: isFinished ? 0 : 1,
                    y: isFinished ? -10 : 0,
                }}
                transition={{
                    duration: 0.2,
                    ease: "easeOut",
                    delay: START_DELAY
                }}
            >
                {currentIndex + 1} / {totalSentences}
            </motion.p>

            {/* Progress bar container */}
            <motion.div
                onClick={isFinished ? onFinish : undefined}
                className={`relative overflow-hidden bg-[#e8e8e8] ${isFinished ? "cursor-pointer" : ""}`}
                animate={{
                    width: isFinished ? 180 : "clamp(120px, 15vw, 200px)",
                    height: isFinished ? 44 : 4,
                    borderRadius: isFinished ? 22 : 2,
                    backgroundColor: isFinished ? "#1a1a1a" : "#e8e8e8",
                    boxShadow: isFinished ? "0 4px 20px rgba(0,0,0,0.15)" : "none",
                    scale: 1,
                }}
                transition={{
                    duration: 0.4,
                    ease: isFinished ? [0.34, 1.56, 0.64, 1] : "easeInOut",
                    delay: START_DELAY,
                    backgroundColor: { duration: 0.2, delay: START_DELAY },
                    boxShadow: { duration: 0.2, delay: START_DELAY },
                    scale: { type: "spring", stiffness: 400, damping: 25, delay: 0 }
                }}
                whileHover={isFinished ? { scale: 1.05 } : {}}
                whileTap={isFinished ? { scale: 0.98 } : {}}
            >
                {/* Progress fill */}
                <motion.div
                    className="absolute inset-y-0 left-0 bg-[#1a1a1a] rounded-[inherit]"
                    animate={{
                        width: isFinished ? "100%" : `${((currentIndex + 1) / totalSentences) * 100}%`,
                    }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                />

                {/* Finish text */}
                <motion.span
                    className="absolute inset-0 flex items-center justify-center text-white font-medium text-sm"
                    animate={{
                        opacity: isFinished ? 1 : 0,
                        scale: isFinished ? 1 : 0.8,
                    }}
                    transition={{
                        duration: 0.2,
                        delay: isFinished ? START_DELAY + 0.15 : 0,
                        ease: "easeOut",
                    }}
                >
                    Finish Reading
                </motion.span>
            </motion.div>
        </div>
    );
}