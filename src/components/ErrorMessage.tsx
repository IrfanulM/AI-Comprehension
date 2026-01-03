"use client";

import { motion } from "framer-motion";

interface ErrorMessageProps {
    message: string;
    onDismiss?: () => void;
}

export default function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-8"
        >
            <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-8 max-w-md text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>
                <h2 className="text-lg font-semibold text-[#1a1a1a] mb-2">Something went wrong</h2>
                <p className="text-[#666] mb-6">{message}</p>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="px-6 py-2 bg-[#1a1a1a] text-white font-medium rounded-full hover:scale-105 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                    >
                        Go Back
                    </button>
                )}
            </div>
        </motion.div>
    );
}
