"use client";

import { useState } from "react";
import { motion } from "framer-motion";

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

    const handleSubmit = () => {
        onSubmit(correctedSummary);
    };

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-white flex flex-col">
            {/* Title */}
            <h1 className="absolute left-1/2 z-30 -translate-x-1/2 text-center font-serif font-bold tracking-tight text-[#1a1a1a] text-[clamp(24px,2.5vw,36px)] top-[4vh]">
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
                            className="w-full min-h-[250px] p-6 text-[#1a1a1a] text-lg leading-relaxed border border-black/10 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-transparent bg-[#fafafa]"
                            placeholder="Edit the summary here..."
                        />
                        <div className="absolute bottom-4 right-4 text-xs text-[#aaa]">
                            {correctedSummary.length} characters
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 justify-end">
                        <button
                            onClick={() => setCorrectedSummary(summary)}
                            className="px-6 py-3 text-[#666] font-medium rounded-full border border-black/10 hover:scale-105 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                        >
                            Reset
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-8 py-3 bg-[#1a1a1a] text-white font-medium rounded-full shadow-lg hover:scale-105 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                        >
                            Submit
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
