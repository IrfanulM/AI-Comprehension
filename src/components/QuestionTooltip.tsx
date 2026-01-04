"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

interface QuestionTooltipProps {
    question: string;
    side: "left" | "right";
    anchorY: number;
    initialAnswer?: string;
    onSubmit: (answer: string) => void;
    onDraftChange?: (answer: string) => void;
}

export default function QuestionTooltip({
    question,
    side,
    anchorY,
    initialAnswer = "",
    onSubmit,
    onDraftChange,
}: QuestionTooltipProps) {
    const [answer, setAnswer] = useState(initialAnswer);
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [clampedY, setClampedY] = useState(anchorY);
    const [clampedX, setClampedX] = useState<number | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => {
            setMounted(false);
            window.removeEventListener("resize", checkMobile);
        };
    }, []);

    useEffect(() => {
        if (mounted) {
            inputRef.current?.focus();
        }
    }, [mounted]);

    useLayoutEffect(() => {
        if (!mounted || isMobile || !containerRef.current) return;

        const updatePosition = () => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const padding = 20;
            let targetY = anchorY - rect.height / 2;
            const minY = padding;
            const maxY = viewportHeight - rect.height - padding;
            setClampedY(Math.max(minY, Math.min(maxY, targetY)));

            const passageCenter = viewportWidth / 2;
            const passageOffset = Math.min(27.5 * (viewportWidth / 100), 500) + 24;
            
            let targetX: number;
            if (side === "right") {
                targetX = passageCenter + passageOffset;
                if (targetX + rect.width > viewportWidth - padding) {
                    targetX = viewportWidth - rect.width - padding;
                }
            } else {
                targetX = passageCenter - passageOffset - rect.width;
                if (targetX < padding) {
                    targetX = padding;
                }
            }
            setClampedX(targetX);
        };

        // Initial measurement
        updatePosition();
        
        // Debounced or direct resize listener
        window.addEventListener("resize", updatePosition);
        return () => window.removeEventListener("resize", updatePosition);
    }, [mounted, isMobile, anchorY, side, question]); // Re-run if question changes (height might change)

    const handleAnswerChange = (value: string) => {
        setAnswer(value);
        onDraftChange?.(value);
    };

    const handleSubmit = () => {
        if (!answer.trim()) return;
        onSubmit(answer);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    // On mobile, we don't need clampedX since we use CSS positioning
    const isReady = isMobile || clampedX !== null;

    const tooltipContent = (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
                opacity: isReady ? 1 : 0, 
                scale: isReady ? 1 : 0.9
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`fixed z-50 ${isMobile ? "left-4 right-4 top-20" : ""} flex flex-col pointer-events-none`}
            style={isMobile ? undefined : {
                top: clampedY,
                left: clampedX !== null ? clampedX : -9999
            }}
        >
            <div className="relative bg-white rounded-2xl shadow-xl border border-black/10 p-5 md:p-6 w-full md:w-[clamp(260px,22vw,320px)] max-h-[75vh] flex flex-col pointer-events-auto">
                {isMobile && (
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-black/10 rotate-45 border-r border-b" />
                )}

                {!isMobile && (
                    <div
                        className={`absolute w-3 h-3 bg-white border-black/10 rotate-45 ${side === "right"
                            ? "-left-1.5 border-l border-b"
                            : "-right-1.5 border-r border-t"
                            }`}
                        style={{ 
                            opacity: clampedX !== null ? 1 : 0,
                            top: Math.max(20, Math.min((containerRef.current?.offsetHeight || 0) - 20, anchorY - clampedY))
                        }}
                    />
                )}

                <div className="overflow-y-auto scrollbar-none flex-grow pr-1">
                    <p className="text-[15px] font-medium text-[#1a1a1a] leading-relaxed mb-4">
                        {question}
                    </p>
                </div>

                <textarea
                    ref={inputRef}
                    value={answer}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your answer..."
                    className="w-full h-24 px-3 py-2 text-base md:text-sm border border-black/10 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-black/10 placeholder:text-[#aaa] scrollbar-none"
                    maxLength={1000}
                />

                <button
                    onClick={handleSubmit}
                    disabled={!answer.trim()}
                    className="mt-3 w-full py-2 px-4 bg-[#1a1a1a] text-white text-sm font-medium rounded-lg hover:scale-105 active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
                >
                    Submit
                </button>
            </div>
        </motion.div>
    );

    if (!mounted) return null;
    return createPortal(tooltipContent, document.body);
}
