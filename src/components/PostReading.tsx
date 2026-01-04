"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PostReadingProps {
    passageTitle: string;
    summary: string;
    onSubmit: (correctedSummary: string) => void;
    onBack: () => void;
}

export default function PostReading({
    passageTitle,
    summary,
    onSubmit,
    onBack,
}: PostReadingProps) {
    const [correctedSummary, setCorrectedSummary] = useState(summary);
    const [showValidationError, setShowValidationError] = useState(false);

    const handleSubmit = () => {
        if (!correctedSummary.trim()) {
            setShowValidationError(true);
            setTimeout(() => setShowValidationError(false), 3000);
            return;
        }
        onSubmit(correctedSummary);
    };

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-white flex flex-col">
            {/* Title */}
            <h1 className="fixed left-1/2 z-30 -translate-x-1/2 text-center font-serif font-bold tracking-tight text-[#1a1a1a] text-[clamp(24px,2.5vw,36px)] top-8 md:top-[4vh]">
                {passageTitle}
            </h1>

            {/* Back Button */}
            <button
                onClick={onBack}
                className="fixed top-8 left-8 z-40 p-2 rounded-full bg-white/80 hover:bg-white backdrop-blur-sm transition-all duration-300 hover:scale-110 shadow-sm border border-black/5 cursor-pointer"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#1a1a1a]">
                    <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
                </svg>
            </button>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-3xl mx-auto w-full">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full"
                >
                    {/* Instructions */}
                    <div className="mb-6">
                        <h2 className="font-serif font-bold text-xl text-[#1a1a1a] mb-2">
                            Correct the Summary
                        </h2>
                        <p className="text-[#666] leading-relaxed">
                            The following summary may contain errors. Read it carefully and make corrections where needed. Edit the text directly to fix any mistakes.
                        </p>
                    </div>

                    {/* Editable Summary */}
                    <div className="relative mb-6">
                        <textarea
                            value={correctedSummary}
                            onChange={(e) => setCorrectedSummary(e.target.value)}
                            className="w-full min-h-[250px] p-6 text-[#1a1a1a] text-lg leading-relaxed border border-black/10 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-transparent bg-[#fafafa] scrollbar-none"
                            placeholder="Edit the summary here..."
                            maxLength={1000}
                        />
                        <div className="absolute bottom-4 right-4 text-xs text-[#aaa]">
                            {correctedSummary.length} characters
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 justify-end relative">
                        <button
                            onClick={() => setCorrectedSummary(summary)}
                            className="px-6 py-3 text-[#666] font-medium rounded-full border border-black/10 hover:scale-105 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                        >
                            Reset
                        </button>
                        <div className="relative">
                            <AnimatePresence>
                                {showValidationError && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-red-500 text-sm font-medium bg-red-50 px-4 py-2 rounded-full border border-red-100 shadow-lg z-50"
                                    >
                                        Please don't erase the whole summary.
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <button
                                onClick={handleSubmit}
                                className="px-8 py-3 bg-[#1a1a1a] text-white font-medium rounded-full shadow-lg hover:scale-105 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
