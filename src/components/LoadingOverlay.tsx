"use client";

import { motion } from "framer-motion";

interface LoadingOverlayProps {
    message?: string;
}

export default function LoadingOverlay({ message = "Loading..." }: LoadingOverlayProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center"
        >
            {/* Spinner */}
            <div className="relative w-12 h-12 mb-4">
                <div className="absolute inset-0 border-4 border-black/10 rounded-full" />
                <motion.div
                    className="absolute inset-0 border-4 border-transparent border-t-[#1a1a1a] rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
            </div>
            <p className="text-[#666] font-medium">{message}</p>
        </motion.div>
    );
}
