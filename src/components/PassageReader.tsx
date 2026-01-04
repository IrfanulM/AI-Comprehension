"use client";

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QuestionTooltip from "@/components/QuestionTooltip";
import ProgressIndicator from "@/components/ProgressIndicator";
import ReaderSettings from "@/components/ReaderSettings";

interface Passage {
    id: string;
    title: string;
    content: string;
}

interface WhileReadingQuestion {
    type: "while-reading";
    "sentence-number": number;
    question: string;
}

interface PostReadingQuestion {
    type: "post-reading";
    summary: string;
    errors: Record<string, string>;
}

type Question = WhileReadingQuestion | PostReadingQuestion;
type QuestionsMap = Record<string, Question>;

interface PassageReaderProps {
    passage: Passage;
    questions: QuestionsMap;
    initialAnswers?: Record<string, string>;
    onBack?: () => void;
    onFinish?: (savedAnswers: Record<string, string>) => void;
    onSaveAnswer?: (key: string, answer: string) => void;
}

export default function PassageReader({ passage, questions, initialAnswers, onBack, onFinish, onSaveAnswer }: PassageReaderProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAdvancing, setIsAdvancing] = useState(true);
    const [fadingOutIndex, setFadingOutIndex] = useState<number | null>(null);
    const [topPosition, setTopPosition] = useState<number | null>(null);
    const [activeQuestion, setActiveQuestion] = useState<{ key: string; question: WhileReadingQuestion; side: "left" | "right" } | null>(null);
    const [savedAnswers, setSavedAnswers] = useState<Record<string, string>>(initialAnswers || {});
    const [answeredInSession, setAnsweredInSession] = useState<Set<string>>(new Set());
    const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
    const [tooltipY, setTooltipY] = useState(0);

    const [readOnlyMode, setReadOnlyMode] = useState(false);
    const [fullViewMode, setFullViewMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showValidationError, setShowValidationError] = useState(false);
    const [sentencePositions, setSentencePositions] = useState<Map<number, number>>(new Map());
    const scrollCooldown = useRef(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const currentSentenceRef = useRef<HTMLSpanElement>(null);
    const fullViewPassageRef = useRef<HTMLDivElement>(null);
    const fullViewSentenceRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
    const lastScrollTime = useRef(0);
    const lastEventTimestamp = useRef(0);
    const wheelDeltas = useRef<number[]>([]);
    const questionPending = useRef(false);

    const sentences = (() => {
        const content = passage.content;
        const paragraphs = content.split(/\n\n+/);
        const result: { text: string; startsNewParagraph: boolean }[] = [];

        paragraphs.forEach((para, paraIndex) => {
            const parts = para.split(/(?<=[.!?])\s+/);
            parts.filter((s) => s.trim().length > 0).forEach((sentence, sentIndex) => {
                result.push({
                    text: sentence,
                    startsNewParagraph: paraIndex > 0 && sentIndex === 0,
                });
            });
        });

        return result;
    })();

    // Get all while-reading questions as array
    const whileReadingQuestions = Object.entries(questions)
        .filter(([, q]) => q.type === "while-reading")
        .map(([key, q]) => ({ key, question: q as WhileReadingQuestion }));

    // Check if all while-reading questions have answers
    const allQuestionsAnswered = () => {
        return whileReadingQuestions.every(({ key }) => 
            savedAnswers[key] && savedAnswers[key].trim().length > 0
        );
    };

    const highlightSearch = (text: string, query: string) => {
        if (!query.trim()) return text;
        const parts = text.split(new RegExp(`(${query})`, "gi"));
        return parts.map((part, i) =>
            part.toLowerCase() === query.toLowerCase() ? (
                <mark key={i} className="bg-yellow-200/80 rounded px-0.5 text-[#1a1a1a]">
                    {part}
                </mark>
            ) : (
                part
            )
        );
    };

    const updateTooltipPosition = useCallback(() => {
        if (currentSentenceRef.current) {
            const rect = currentSentenceRef.current.getBoundingClientRect();
            setTooltipY(rect.top + rect.height / 2);
        }
    }, []);

    const hasQuestionAtSentence = useCallback((sentenceIndex: number) => {
        if (readOnlyMode) return false;
        const sentenceNumber = sentenceIndex + 1;
        for (const [key, q] of Object.entries(questions)) {
            if (q.type === "while-reading" && q["sentence-number"] === sentenceNumber && !answeredInSession.has(key)) {
                return true;
            }
        }
        return false;
    }, [questions, readOnlyMode, answeredInSession]);

    const checkForQuestion = useCallback((sentenceIndex: number) => {
        const sentenceNumber = sentenceIndex + 1;
        let questionIndex = 0;
        for (const [key, q] of Object.entries(questions)) {
            if (!readOnlyMode && q.type === "while-reading" && q["sentence-number"] === sentenceNumber && !answeredInSession.has(key)) {
                const side = questionIndex % 2 === 0 ? "right" : "left";
                setActiveQuestion({ key, question: q, side });
                questionPending.current = false;
                return true;
            }
            if (q.type === "while-reading") questionIndex++;
        }
        questionPending.current = false;
        return false;
    }, [questions, readOnlyMode, answeredInSession, updateTooltipPosition]);

    const handleSubmitAnswer = (answer: string) => {
        if (!activeQuestion) return;
        const key = activeQuestion.key;
        setSavedAnswers((prev) => ({ ...prev, [key]: answer }));
        setAnsweredInSession((prev) => new Set(prev).add(key));
        onSaveAnswer?.(key, answer);
        setActiveQuestion(null);
    };

    const advance = useCallback(() => {
        if (activeQuestion || scrollCooldown.current || questionPending.current) return;
        
        const nextIndex = currentIndex + 1;
        if (nextIndex >= sentences.length) return;

        scrollCooldown.current = true;
        setIsAdvancing(true);
        setFadingOutIndex(null);
        setCurrentIndex(nextIndex);
        
        const hasQuestion = !readOnlyMode && hasQuestionAtSentence(nextIndex);
        
        if (hasQuestion) {
            questionPending.current = true;
        }
        
        setTimeout(() => {
            checkForQuestion(nextIndex);
        }, 350);

        setTimeout(() => {
            if (!hasQuestion) {
                scrollCooldown.current = false;
            }
        }, 50);
        
        if (hasQuestion) {
            setTimeout(() => {
                scrollCooldown.current = false;
            }, 400);
        }
    }, [currentIndex, activeQuestion, checkForQuestion, hasQuestionAtSentence, sentences.length, readOnlyMode]);

    const retreat = useCallback(() => {
        if (currentIndex === 0 || scrollCooldown.current) return;

        if (activeQuestion) {
            setActiveQuestion(null);
        }

        scrollCooldown.current = true;
        setIsAdvancing(false);

        const removingIndex = currentIndex;
        const sentenceLength = sentences[removingIndex].text.length;
        const totalDuration = (sentenceLength * 4) + 200;

        setCurrentIndex((prev) => Math.max(prev - 1, 0));
        setFadingOutIndex(removingIndex);

        setTimeout(() => {
            scrollCooldown.current = false;
        }, 50);

        setTimeout(() => {
            setFadingOutIndex((current) => current === removingIndex ? null : current);
        }, totalDuration);
    }, [currentIndex, activeQuestion, sentences]);

    useLayoutEffect(() => {
        if (contentRef.current) {
            const fadingElement = contentRef.current.querySelector('[data-fading="true"]');
            let contentHeight;

            if (fadingElement instanceof HTMLElement) {
                const originalDisplay = fadingElement.style.display;
                fadingElement.style.display = "none";
                contentHeight = contentRef.current.offsetHeight;
                fadingElement.style.display = originalDisplay;
            } else {
                contentHeight = contentRef.current.offsetHeight;
            }

            const viewportHeight = window.innerHeight;
            const centeredTop = (viewportHeight - contentHeight) / 2;
            const bottomAnchoredTop = viewportHeight * 0.8 - contentHeight;
            setTopPosition(Math.min(bottomAnchoredTop, centeredTop));
        }
    }, [currentIndex, fadingOutIndex]);

    useEffect(() => {
        if (activeQuestion) {
            updateTooltipPosition();
        }
    }, [activeQuestion, topPosition, updateTooltipPosition]);

    // Calculate sentence positions for full view mode
    useEffect(() => {
        if (!fullViewMode || readOnlyMode) return;

        const updatePositions = () => {
            if (!fullViewPassageRef.current) return;
            const passageRect = fullViewPassageRef.current.getBoundingClientRect();
            const newPositions = new Map<number, number>();

            fullViewSentenceRefs.current.forEach((el, sentenceNum) => {
                if (el) {
                    const rect = el.getBoundingClientRect();
                    // Position relative to passage container
                    newPositions.set(sentenceNum, rect.top - passageRect.top + rect.height / 2);
                }
            });

            setSentencePositions(newPositions);
        };

        // Small delay to ensure layout is complete
        const timer = setTimeout(updatePositions, 100);
        window.addEventListener("resize", updatePositions);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("resize", updatePositions);
        };
    }, [fullViewMode, readOnlyMode]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (fullViewMode) return;
            if (e.key === "ArrowDown" || e.key === " ") {
                if (activeQuestion) return; // Block forward when question active
                e.preventDefault();
                advance();
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                retreat(); // Always allow backward
            }
        };

        const handleWheel = (e: WheelEvent) => {
            if (fullViewMode) return;
            
            e.preventDefault();
            
            const delta = Math.abs(e.deltaY);
            if (delta < 5) return;

            const now = Date.now();
            const timeSinceLastEvent = now - lastEventTimestamp.current;
            const timeSinceLastTrigger = now - lastScrollTime.current;
            
            lastEventTimestamp.current = now;

            const isStream = timeSinceLastEvent < 60;

            if (isStream) {
                if (wheelDeltas.current.length > 20) wheelDeltas.current.shift();
                wheelDeltas.current.push(delta);

                const isPeak = wheelDeltas.current.every((v, i) => 
                    i === wheelDeltas.current.length - 1 || delta >= v
                );

                if (isPeak && timeSinceLastTrigger > 100) {
                    if (e.deltaY > 0) {
                        if (activeQuestion) return;
                        lastScrollTime.current = now;
                        wheelDeltas.current = [];
                        advance();
                    } else if (e.deltaY < 0) {
                        lastScrollTime.current = now;
                        wheelDeltas.current = [];
                        retreat();
                    }
                }
            } else {
                wheelDeltas.current = [delta];
                if (timeSinceLastTrigger > 100) {
                    if (e.deltaY > 0) {
                        if (activeQuestion) return;
                        lastScrollTime.current = now;
                        advance();
                    } else if (e.deltaY < 0) {
                        lastScrollTime.current = now;
                        retreat();
                    }
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("wheel", handleWheel, { passive: false });

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("wheel", handleWheel);
        };
    }, [activeQuestion, advance, retreat, fullViewMode]);

    const getColorClass = (distanceFromCurrent: number): string => {
        if (distanceFromCurrent === 0) return "text-[#1c1c1c]";
        if (distanceFromCurrent === 1) return "text-[#999999ff]";
        if (distanceFromCurrent === 2) return "text-[#d8d8d8ff]";
        if (distanceFromCurrent === 3) return "text-[#e4e4e4ff]";
        return "text-[#f3f3f3ff]";
    };

    const renderSentence = (
        sentence: { text: string; startsNewParagraph: boolean },
        index: number,
        colorClass: string,
        animationClass?: string
    ) => {
        const totalChars = sentence.text.length;
        const isHide = animationClass === "animate-letter-hide";
        const isReveal = animationClass === "animate-letter-reveal";
        const isCurrentSentence = index === currentIndex;

        return (
            <span
                key={index}
                data-fading={isHide ? "true" : "false"}
                ref={isCurrentSentence ? currentSentenceRef : undefined}
            >
                {sentence.startsNewParagraph && <span className="block h-6" />}
                <span
                    className={`${colorClass} ${!animationClass ? "transition-colors duration-500 ease-out" : ""}`}
                >
                    {sentence.text.split(" ").map((word, wordIndex, wordsArray) => {
                        const previousChars = wordsArray
                            .slice(0, wordIndex)
                            .reduce((sum, w) => sum + w.length + 1, 0);

                        return (
                            <span key={wordIndex} className="inline-block whitespace-nowrap">
                                {word.split("").map((char, charIndex) => {
                                    const charPos = previousChars + charIndex;
                                    const delay = isHide
                                        ? (totalChars - charPos - 1) * 4
                                        : charPos * 4;

                                    return (
                                        <span
                                            key={charIndex}
                                            className={`${animationClass || ""} inline-block ${isReveal ? "opacity-0" : "opacity-100"}`}
                                            style={{
                                                animationDelay: animationClass ? `${delay}ms` : undefined,
                                            }}
                                        >
                                            {char}
                                        </span>
                                    );
                                })}
                                {wordIndex < wordsArray.length - 1 && "\u00A0"}
                            </span>
                        );
                    })}
                    {" "}
                </span>
            </span>
        );
    };

    const maxIndex = fadingOutIndex !== null
        ? Math.max(currentIndex, fadingOutIndex)
        : currentIndex;
    const visibleSentences = sentences.slice(0, maxIndex + 1);

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-white">
            {/* Title */}
            {!fullViewMode && (
                <h1 className="absolute left-1/2 z-30 -translate-x-1/2 text-center font-serif font-bold tracking-tight text-[#1a1a1a] text-[clamp(24px,2.5vw,36px)] top-[4vh]">
                    {passage.title}
                </h1>
            )}

            {/* Back Button */}
            {onBack && (
                <button
                    onClick={() => onBack()}
                    className="fixed top-8 left-8 z-40 p-2 rounded-full bg-white/80 hover:bg-white backdrop-blur-sm transition-all duration-300 hover:scale-110 shadow-sm border border-black/5 cursor-pointer"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#1a1a1a]">
                        <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
                    </svg>
                </button>
            )}

            {/* Reader Settings */}
            <ReaderSettings
                currentSentenceIndex={currentIndex}
                sentences={sentences}
                totalSentences={sentences.length}
                readOnlyMode={readOnlyMode}
                onReadOnlyChange={(newValue) => {
                    if (newValue && activeQuestion) {
                        setActiveQuestion(null);
                    }
                    setReadOnlyMode(newValue);
                }}
                fullViewMode={fullViewMode}
                onFullViewChange={(newValue) => {
                    if (newValue) {
                        // Entering full view - dismiss active question and show all sentences
                        setActiveQuestion(null);
                        setCurrentIndex(sentences.length - 1);
                    } else {
                        // Exiting full view - reset to start
                        setCurrentIndex(0);
                        setFadingOutIndex(null);
                        setActiveQuestion(null);
                        setAnsweredInSession(new Set());
                        setDraftAnswers({});
                        setSentencePositions(new Map());
                        fullViewSentenceRefs.current.clear();
                    }
                    setFullViewMode(newValue);
                }}
                onResetToStart={() => {
                    setCurrentIndex(0);
                    setFadingOutIndex(null);
                    setActiveQuestion(null);
                    setSavedAnswers(initialAnswers || {});
                    setAnsweredInSession(new Set());
                    setDraftAnswers({});
                }}
                onSearchQueryChange={setSearchQuery}
            />

            {/* Top Fade Gradient */}
            {!fullViewMode && (
                <div
                    className="pointer-events-none absolute left-0 right-0 top-0 z-20 bg-gradient-to-b from-white from-50% to-transparent h-[15vh]"
                />
            )}

            {fullViewMode ? (
                /* Full View Mode */
                <div className="fixed inset-0 z-10 overflow-y-auto bg-white">
                    {/* Title */}
                    <h1 className="absolute left-1/2 z-30 -translate-x-1/2 text-center font-serif font-bold tracking-tight text-[#1a1a1a] text-[clamp(24px,2.5vw,36px)] top-[4vh]">
                        {passage.title}
                    </h1>

                    {/* Content */}
                    <div className="pt-[12vh] px-4 pb-16">
                        {!readOnlyMode ? (
                            <>
                                {/* Desktop Layout */}
                                <div className="hidden lg:grid grid-cols-[1fr_700px_1fr] gap-6 max-w-[1400px] mx-auto">
                                    {/* Left Column */}
                                    <div className="relative">
                                        {whileReadingQuestions
                                            .filter((_, i) => i % 2 === 1)
                                            .map(({ key, question }) => {
                                                const yPos = sentencePositions.get(question["sentence-number"]) || 0;
                                                return (
                                                    <div
                                                        key={key}
                                                        className="absolute w-full bg-white rounded-xl border border-black/10 p-4 shadow-sm max-h-[400px] flex flex-col"
                                                        style={{ top: Math.max(0, yPos - 20) }}
                                                    >
                                                        {/* Arrow */}
                                                        <div className="absolute top-5 -right-1.5 w-3 h-3 bg-white border-black/10 rotate-45 border-t border-r" />
                                                        <span className="text-xs font-semibold text-[#888] uppercase tracking-wider block mb-2">
                                                            Question {whileReadingQuestions.findIndex(q => q.key === key) + 1}
                                                        </span>
                                                        <div className="overflow-y-auto scrollbar-none pr-1 mb-3">
                                                            <p className="text-sm font-medium text-[#1a1a1a] leading-snug">
                                                                {question.question}
                                                            </p>
                                                        </div>
                                                        <textarea
                                                            value={savedAnswers[key] || ""}
                                                            onChange={(e) => {
                                                                setSavedAnswers(prev => ({ ...prev, [key]: e.target.value }));
                                                                onSaveAnswer?.(key, e.target.value);
                                                            }}
                                                            placeholder="Type your answer..."
                                                            className="w-full p-3 text-sm font-sans bg-[#f5f5f5] rounded-lg border-0 resize-none focus:outline-none focus:ring-2 focus:ring-black/10 scrollbar-none"
                                                            rows={3}
                                                            maxLength={1000}
                                                        />
                                                    </div>
                                                );
                                            })}
                                    </div>

                                    {/* Center Column - Passage */}
                                    <div ref={fullViewPassageRef} className="relative font-serif text-[clamp(14px,1.3vw,18px)] leading-relaxed text-[#1a1a1a]">
                                        {sentences.map((sentence, index) => {
                                            const sentenceNumber = index + 1;
                                            const questionForSentence = whileReadingQuestions.find(
                                                ({ question }) => question["sentence-number"] === sentenceNumber
                                            );

                                            return (
                                                <span key={index}>
                                                    {sentence.startsNewParagraph && <span className="block h-5" />}
                                                    <span
                                                        ref={questionForSentence ? (el) => { if (el) fullViewSentenceRefs.current.set(sentenceNumber, el); } : undefined}
                                                        className=""
                                                    >
                                                        {highlightSearch(sentence.text, searchQuery)}{" "}
                                                    </span>
                                                </span>
                                            );
                                        })}
                                    </div>

                                    {/* Right Column */}
                                    <div className="relative">
                                        {whileReadingQuestions
                                            .filter((_, i) => i % 2 === 0)
                                            .map(({ key, question }) => {
                                                const yPos = sentencePositions.get(question["sentence-number"]) || 0;
                                                return (
                                                    <div
                                                        key={key}
                                                        className="absolute w-full bg-white rounded-xl border border-black/10 p-4 shadow-sm max-h-[400px] flex flex-col"
                                                        style={{ top: Math.max(0, yPos - 20) }}
                                                    >
                                                        {/* Arrow */}
                                                        <div className="absolute top-5 -left-1.5 w-3 h-3 bg-white border-black/10 rotate-45 border-b border-l" />
                                                        <span className="text-xs font-semibold text-[#888] uppercase tracking-wider block mb-2">
                                                            Question {whileReadingQuestions.findIndex(q => q.key === key) + 1}
                                                        </span>
                                                        <div className="overflow-y-auto scrollbar-none pr-1 mb-3">
                                                            <p className="text-sm font-medium text-[#1a1a1a] leading-snug">
                                                                {question.question}
                                                            </p>
                                                        </div>
                                                        <textarea
                                                            value={savedAnswers[key] || ""}
                                                            onChange={(e) => {
                                                                setSavedAnswers(prev => ({ ...prev, [key]: e.target.value }));
                                                                onSaveAnswer?.(key, e.target.value);
                                                            }}
                                                            placeholder="Type your answer..."
                                                            className="w-full p-3 text-sm font-sans bg-[#f5f5f5] rounded-lg border-0 resize-none focus:outline-none focus:ring-2 focus:ring-black/10 scrollbar-none"
                                                            rows={3}
                                                            maxLength={500}
                                                        />
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>

                                {/* Mobile Layout */}
                                <div className="lg:hidden max-w-2xl mx-auto">
                                    {/* Passage */}
                                    <div className="font-serif text-base leading-relaxed text-[#1a1a1a] mb-8">
                                        {sentences.map((sentence, index) => {
                                            const questionForSentence = whileReadingQuestions.find(
                                                ({ question }) => question["sentence-number"] === index + 1
                                            );

                                            return (
                                                <span key={index}>
                                                    {sentence.startsNewParagraph && <span className="block h-4" />}
                                                    <span className="">
                                                        {highlightSearch(sentence.text, searchQuery)}{" "}
                                                    </span>
                                                </span>
                                            );
                                        })}
                                    </div>

                                    {/* Question Cards */}
                                    <div className="space-y-4">
                                        <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">
                                            Questions
                                        </h2>
                                        {whileReadingQuestions.map(({ key, question }, index) => (
                                            <div
                                                key={key}
                                                className="bg-white rounded-xl border border-black/10 p-4 shadow-sm max-h-[400px] flex flex-col"
                                            >
                                                <span className="text-xs font-semibold text-[#888] uppercase tracking-wider block mb-2">
                                                    Question {index + 1}
                                                </span>
                                                <div className="overflow-y-auto scrollbar-none pr-1 mb-3">
                                                    <p className="text-sm font-medium text-[#1a1a1a] leading-snug">
                                                        {question.question}
                                                    </p>
                                                </div>
                                                <textarea
                                                    value={savedAnswers[key] || ""}
                                                    onChange={(e) => {
                                                        setSavedAnswers(prev => ({ ...prev, [key]: e.target.value }));
                                                        onSaveAnswer?.(key, e.target.value);
                                                    }}
                                                    placeholder="Type your answer..."
                                                    className="w-full p-3 text-sm font-sans bg-[#f5f5f5] rounded-lg border-0 resize-none focus:outline-none focus:ring-2 focus:ring-black/10 scrollbar-none"
                                                    rows={3}
                                                    maxLength={500}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Finish Button */}
                                <div className="flex justify-center mt-12 relative">
                                    <AnimatePresence>
                                        {showValidationError && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, x: "-50%" }}
                                                animate={{ opacity: 1, y: 0, x: "-50%" }}
                                                exit={{ opacity: 0, y: 10, x: "-50%" }}
                                                className="absolute bottom-full mb-3 left-1/2 whitespace-nowrap text-red-500 text-sm font-medium bg-red-50 px-4 py-2 rounded-full border border-red-100 shadow-lg z-50"
                                            >
                                                Please answer all questions before finishing.
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => {
                                            if (!allQuestionsAnswered()) {
                                                setShowValidationError(true);
                                                setTimeout(() => setShowValidationError(false), 3000);
                                            } else {
                                                onFinish?.(savedAnswers);
                                            }
                                        }}
                                        className="px-8 py-3 bg-[#1a1a1a] text-white rounded-full font-medium text-sm transition-all shadow-lg cursor-pointer"
                                    >
                                        Finish Reading
                                    </motion.button>
                                </div>
                            </>
                        ) : (
                            /* Read Only Full View */
                            <>
                                <div className="max-w-[700px] mx-auto font-serif text-lg leading-relaxed text-[#1a1a1a]">
                                    {sentences.map((sentence, index) => (
                                        <span key={index}>
                                            {sentence.startsNewParagraph && <span className="block h-5" />}
                                            {highlightSearch(sentence.text, searchQuery)}{" "}
                                        </span>
                                    ))}
                                </div>
                                {/* Finish Button for read-only */}
                                <div className="flex justify-center mt-12">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => readOnlyMode ? onBack?.() : onFinish?.(savedAnswers)}
                                        className="px-8 py-3 bg-[#1a1a1a] text-white rounded-full font-medium text-sm transition-all shadow-lg cursor-pointer"
                                    >
                                        Finish Reading
                                    </motion.button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                /* Normal Scroll Mode */
                <>
                    {/* Content */}
                    <div
                        ref={contentRef}
                        className="absolute left-1/2 z-10 -translate-x-1/2 transition-[top] duration-400 ease-out font-serif font-medium w-[clamp(300px,55vw,1000px)] text-[clamp(20px,2.2vw,34px)] leading-[1.7]"
                        style={{
                            top: topPosition !== null ? `${topPosition}px` : "50%",
                        }}
                    >
                        <p>
                            {visibleSentences.map((sentence, i) => {
                                const distanceFromCurrent = currentIndex - i;
                                const colorClass = getColorClass(distanceFromCurrent);
                                const isCurrentSentence = i === currentIndex;
                                const isFadingOut = i === fadingOutIndex;
                                const shouldAnimateIn = isCurrentSentence && isAdvancing;

                                if (isFadingOut) {
                                    return renderSentence(sentence, i, "text-[#1c1c1c]", "animate-letter-hide");
                                }

                                if (shouldAnimateIn) {
                                    return renderSentence(sentence, i, colorClass, "animate-letter-reveal");
                                }

                                return renderSentence(sentence, i, colorClass);
                            })}
                        </p>
                    </div>

                    {/* Question Tooltip */}
                    <AnimatePresence>
                        {activeQuestion && (
                            <QuestionTooltip
                                question={activeQuestion.question.question}
                                side={activeQuestion.side}
                                anchorY={tooltipY}
                                initialAnswer={draftAnswers[activeQuestion.key] || savedAnswers[activeQuestion.key] || ""}
                                onSubmit={handleSubmitAnswer}
                                onDraftChange={(draft) => setDraftAnswers(prev => ({ ...prev, [activeQuestion.key]: draft }))}
                            />
                        )}
                    </AnimatePresence>

                    {/* Scroll Helper */}
                    <div
                        className={`fixed left-1/2 -translate-x-1/2 bottom-[15vh] transition-opacity duration-700 pointer-events-none ${currentIndex < 3 && !activeQuestion ? "opacity-60" : "opacity-0"}`}
                    >
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] tracking-[0.2em] uppercase text-[#999999ff] font-medium">Scroll To Keep Reading</span>
                            <motion.div
                                animate={{ y: [0, 6, 0] }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 2,
                                    ease: "easeInOut"
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#999999ff]">
                                    <path d="M12 5v14M19 12l-7 7-7-7" />
                                </svg>
                            </motion.div>
                        </div>
                    </div>
                </>
            )}

            {/* Progress Indicator */}
            {!fullViewMode && (
                <ProgressIndicator
                    currentIndex={currentIndex}
                    totalSentences={sentences.length}
                    isFinished={currentIndex === sentences.length - 1 && !activeQuestion}
                    onFinish={() => {
                        if (!readOnlyMode && !allQuestionsAnswered()) {
                            setShowValidationError(true);
                            setTimeout(() => setShowValidationError(false), 3000);
                        } else {
                            if (readOnlyMode) {
                                onBack?.();
                            } else {
                                onFinish?.(savedAnswers);
                            }
                        }
                    }}
                />
            )}

            {/* Validation*/}
            {!fullViewMode && (
                <AnimatePresence>
                    {showValidationError && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, x: "-50%" }}
                            animate={{ opacity: 1, y: 0, x: "-50%" }}
                            exit={{ opacity: 0, y: 20, x: "-50%" }}
                            className="fixed bottom-[14vh] left-1/2 z-50 text-red-500 text-sm font-medium bg-red-50 px-4 py-2 rounded-full border border-red-100 shadow-lg"
                        >
                            Please answer all questions before finishing.
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    );
}