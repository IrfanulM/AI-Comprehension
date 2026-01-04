import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface Passage {
    id: string;
    title: string;
    content: string;
}

interface MainMenuProps {
    passages: Passage[];
    onSelect: (passage: Passage) => void;
    onViewResults?: (passage: Passage) => void;
}

export default function MainMenu({ passages, onSelect, onViewResults }: MainMenuProps) {
    const [clearedPassages, setClearedPassages] = useState<Set<string>>(new Set());
    const [cacheState, setCacheState] = useState<Record<string, { hasQuestions: boolean; hasResults: boolean }>>({});
    const [mounted, setMounted] = useState(false);

    // Check cache state after mount
    useEffect(() => {
        const state: Record<string, { hasQuestions: boolean; hasResults: boolean }> = {};
        passages.forEach(p => {
            // Check if any questions cache exists
            let hasQuestions = false;
            for (let grade = 1; grade <= 12; grade++) {
                if (localStorage.getItem(`questions_${p.id}_grade${grade}`) !== null) {
                    hasQuestions = true;
                    break;
                }
            }
            state[p.id] = {
                hasQuestions,
                hasResults: localStorage.getItem(`results_${p.id}`) !== null,
            };
        });
        setCacheState(state);
        setMounted(true);
    }, [passages]);

    const handleClearCache = (passageId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        // Clear all question and answer caches
        for (let grade = 1; grade <= 12; grade++) {
            localStorage.removeItem(`questions_${passageId}_grade${grade}`);
            localStorage.removeItem(`answers_${passageId}_grade${grade}`);
        }
        // Clear single results cache
        localStorage.removeItem(`results_${passageId}`);
        setClearedPassages(prev => new Set(prev).add(passageId));
        setCacheState(prev => ({ ...prev, [passageId]: { hasQuestions: false, hasResults: false } }));
    };

    const handleViewResults = (passage: Passage, e: React.MouseEvent) => {
        e.stopPropagation();
        onViewResults?.(passage);
    };

    return (
        <div className="min-h-screen w-full bg-[#f8f9fa] flex flex-col items-center justify-center p-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-4xl"
            >
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#1a1a1a] text-center mb-4">
                    Select a Story
                </h1>
                <p className="text-[#666] text-center mb-12 font-sans text-lg">
                    Choose a passage to begin reading
                </p>

                <div className="flex flex-wrap justify-center gap-6">
                    {passages.map((passage, index) => (
                        <motion.button
                            key={passage.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ scale: 1.03, y: -5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onSelect(passage)}
                            className="group relative bg-white rounded-2xl p-8 text-left shadow-sm hover:shadow-xl transition-[box-shadow,border-color] duration-300 border border-black/5 hover:border-black/10 overflow-hidden cursor-pointer w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />

                            <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                                {mounted && cacheState[passage.id]?.hasQuestions && !clearedPassages.has(passage.id) && (
                                    <div
                                        onClick={(e) => handleClearCache(passage.id, e)}
                                        className="text-xs transition-colors text-[#888] hover:text-red-500 cursor-pointer"
                                    >
                                        Clear Cache
                                    </div>
                                )}
                                {mounted && cacheState[passage.id]?.hasResults && !clearedPassages.has(passage.id) && (
                                    <div
                                        onClick={(e) => handleViewResults(passage, e)}
                                        className="text-xs text-[#888] hover:text-blue-500 cursor-pointer transition-colors"
                                    >
                                        View Results
                                    </div>
                                )}
                            </div>

                            <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-black/5 group-hover:bg-[#1a1a1a] transition-all duration-300">
                                <span className="font-serif font-bold text-lg text-[#1a1a1a] group-hover:text-white transition-colors">
                                    {index + 1}
                                </span>
                            </div>

                            <h3 className="font-serif text-xl font-bold text-[#1a1a1a] group-hover:text-black mb-2 line-clamp-2">
                                {passage.title}
                            </h3>

                            <p className="font-sans text-sm text-[#888] line-clamp-3 leading-relaxed">
                                {passage.content}
                            </p>

                            <div className="mt-6 flex items-center text-sm font-medium text-[#1a1a1a] opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
                                Read Story
                                <svg
                                    className="w-4 h-4 ml-2"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                                    />
                                </svg>
                            </div>
                        </motion.button>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
