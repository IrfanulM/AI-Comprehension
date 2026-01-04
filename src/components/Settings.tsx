"use client";

import { useState, useEffect, useRef } from "react";

interface SettingsProps {
    onGradeChange: (grade: number) => void;
}

export default function Settings({ onGradeChange }: SettingsProps) {
    const [grade, setGrade] = useState<number>(10);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Load saved grade from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("selected_grade");
        if (saved) {
            const parsed = parseInt(saved, 10);
            if (parsed >= 1 && parsed <= 10) {
                setGrade(parsed);
                onGradeChange(parsed);
            }
        }
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleGradeChange = (newGrade: number) => {
        setGrade(newGrade);
        localStorage.setItem("selected_grade", String(newGrade));
        onGradeChange(newGrade);
        setIsOpen(false);
    };

    return (
        <div className="fixed top-8 right-8 z-40" ref={dropdownRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="bg-white/80 hover:bg-white backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-black/5 flex items-center gap-2 transition-all duration-300 cursor-pointer select-none"
            >
                <span className="text-sm text-[#666] font-medium">Grade</span>
                <span className="text-[#1a1a1a] font-semibold text-sm">{grade}</span>
                <svg
                    className={`w-3 h-3 text-[#666] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border border-black/10 overflow-hidden min-w-[100px]">
                    <div>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((g) => (
                            <div
                                key={g}
                                onClick={() => handleGradeChange(g)}
                                className={`px-4 py-2 text-sm text-center cursor-pointer transition-colors ${
                                    g === grade
                                        ? "bg-[#1a1a1a] text-white font-semibold"
                                        : "text-[#1a1a1a] hover:bg-[#f5f5f5]"
                                }`}
                            >
                                Grade {g}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
