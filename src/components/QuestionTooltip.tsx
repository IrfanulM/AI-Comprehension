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
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
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
            initial={{ opacity: 0, scale: 0.9, x: side === "right" ? 20 : -20, y: "-50%" }}
            animate={{ opacity: 1, scale: 1, x: 0, y: "-50%" }}
            exit={{ opacity: 0, scale: 0.9, x: side === "right" ? 20 : -20, y: "-50%" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`fixed z-50 ${side === "right" ? "right-[3vw]" : "left-[3vw]"}`}
            style={{ top: anchorY }}
        >
            <div className="relative bg-white rounded-2xl shadow-xl border border-black/10 p-6 w-[320px]">
                <div
                    className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-black/10 rotate-45 ${side === "right"
                            ? "-left-1.5 border-l border-b"
                            : "-right-1.5 border-r border-t"
                        }`}
                />

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
                    className="mt-3 w-full py-2 px-4 bg-[#1a1a1a] text-white text-sm font-medium rounded-lg transition-all duration-200 hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                    Submit
                </button>
            </div>
        </motion.div>
    );

    if (!mounted) return null;
    return createPortal(tooltipContent, document.body);
}
