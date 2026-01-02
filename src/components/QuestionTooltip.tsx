"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

interface QuestionTooltipProps {
    question: string;
    side: "left" | "right";
    anchorY: number;
    onSubmit: (answer: string) => void;
}

export default function QuestionTooltip({
    question,
    side,
    anchorY,
    onSubmit,
}: QuestionTooltipProps) {
    const [answer, setAnswer] = useState("");
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);

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

    const tooltipContent = (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: isMobile ? 0 : "-50%" }}
            animate={{ opacity: 1, scale: 1, y: isMobile ? 0 : "-50%" }}
            exit={{ opacity: 0, scale: 0.9, y: isMobile ? 0 : "-50%" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`fixed z-50 ${isMobile
                ? "left-1/2 -translate-x-1/2 top-[12vh]"
                : `${side === "right" ? "right-[3vw]" : "left-[3vw]"}`
                }`}
            style={isMobile ? undefined : { top: anchorY }}
        >
            <div className="relative bg-white rounded-2xl shadow-xl border border-black/10 p-5 md:p-6 w-[calc(100vw-32px)] max-w-[320px]">
                {isMobile && (
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-black/10 rotate-45 border-r border-b" />
                )}

                {!isMobile && (
                    <div
                        className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-black/10 rotate-45 ${side === "right"
                            ? "-left-1.5 border-l border-b"
                            : "-right-1.5 border-r border-t"
                            }`}
                    />
                )}

                <p className="text-[15px] font-medium text-[#1a1a1a] leading-relaxed mb-4">
                    {question}
                </p>

                <textarea
                    ref={inputRef}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your answer..."
                    className="w-full h-24 px-3 py-2 text-sm border border-black/10 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-black/10 placeholder:text-[#aaa]"
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
