"use client";

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import questionsData from "@/data/questions.json";
import QuestionTooltip from "@/components/QuestionTooltip";

interface Passage {
    id: string;
    title: string;
    content: string;
}

interface PassageReaderProps {
    passage: Passage;
    onBack?: () => void;
}

interface Question {
    type: string;
    "sentence-number": number;
    question: string;
}

type QuestionsMap = Record<string, Question>;

export default function PassageReader({ passage, onBack }: PassageReaderProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAdvancing, setIsAdvancing] = useState(true);
    const [fadingOutIndex, setFadingOutIndex] = useState<number | null>(null);
    const [topPosition, setTopPosition] = useState<number | null>(null);
    const [activeQuestion, setActiveQuestion] = useState<{ key: string; question: Question; side: "left" | "right" } | null>(null);
    const [savedAnswers, setSavedAnswers] = useState<Record<string, string>>({});
    const [tooltipY, setTooltipY] = useState(0);
    const scrollCooldown = useRef(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const currentSentenceRef = useRef<HTMLSpanElement>(null);

    const questions = questionsData as QuestionsMap;

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

    const updateTooltipPosition = useCallback(() => {
        if (currentSentenceRef.current) {
            const rect = currentSentenceRef.current.getBoundingClientRect();
            setTooltipY(rect.top + rect.height / 2);
        }
    }, []);

    const checkForQuestion = (sentenceIndex: number) => {
        const sentenceNumber = sentenceIndex + 1;
        let questionIndex = 0;
        for (const [key, q] of Object.entries(questions)) {
            if (q["sentence-number"] === sentenceNumber && !savedAnswers[key]) {
                const side = questionIndex % 2 === 0 ? "right" : "left";
                setActiveQuestion({ key, question: q, side });
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        updateTooltipPosition();
                    });
                });
                return true;
            }
            questionIndex++;
        }
        return false;
    };

    const handleSubmitAnswer = (answer: string) => {
        if (!activeQuestion) return;
        setSavedAnswers((prev) => ({ ...prev, [activeQuestion.key]: answer }));
        setActiveQuestion(null);
    };

    const advance = () => {
        if (scrollCooldown.current || activeQuestion) return;
        scrollCooldown.current = true;
        setIsAdvancing(true);
        setFadingOutIndex(null);
        const nextIndex = Math.min(currentIndex + 1, sentences.length - 1);
        setCurrentIndex(nextIndex);
        setTimeout(() => {
            scrollCooldown.current = false;
            checkForQuestion(nextIndex);
        }, 300);
    };

    const retreat = () => {
        if (scrollCooldown.current || currentIndex === 0 || activeQuestion) return;
        scrollCooldown.current = true;
        setIsAdvancing(false);

        const removingIndex = currentIndex;
        const sentenceLength = sentences[removingIndex].text.length;
        const totalDuration = (sentenceLength * 4) + 200;

        setCurrentIndex((prev) => Math.max(prev - 1, 0));
        setFadingOutIndex(removingIndex);

        setTimeout(() => {
            scrollCooldown.current = false;
        }, 300);

        setTimeout(() => {
            setFadingOutIndex((current) => current === removingIndex ? null : current);
        }, totalDuration);
    };

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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (activeQuestion) return;
            if (e.key === "ArrowDown" || e.key === " ") {
                e.preventDefault();
                advance();
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                retreat();
            }
        };

        const handleWheel = (e: WheelEvent) => {
            if (activeQuestion) return;
            e.preventDefault();
            if (e.deltaY > 0) {
                advance();
            } else if (e.deltaY < 0) {
                retreat();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("wheel", handleWheel, { passive: false });

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("wheel", handleWheel);
        };
    });

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
            <h1
                className="absolute left-1/2 z-30 -translate-x-1/2 text-center font-serif font-bold tracking-tight text-[#1a1a1a] text-[clamp(24px,2.5vw,36px)] top-[4vh]"
            >
                {passage.title}
            </h1>

            {/* Back Button */}
            {onBack && (
                <button
                    onClick={onBack}
                    className="fixed top-8 left-8 z-40 p-2 rounded-full bg-white/80 hover:bg-white backdrop-blur-sm transition-all duration-300 hover:scale-110 shadow-sm border border-black/5 cursor-pointer"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#1a1a1a]">
                        <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
                    </svg>
                </button>
            )}

            {/* Top Fade Gradient */}
            <div
                className="pointer-events-none absolute left-0 right-0 top-0 z-20 bg-gradient-to-b from-white from-50% to-transparent h-[15vh]"
            />

            {/* Content */}
            <div
                ref={contentRef}
                className="absolute left-1/2 z-10 -translate-x-1/2 transition-[top] duration-400 ease-out font-medium w-[clamp(300px,55vw,1000px)] text-[clamp(20px,2.2vw,34px)] leading-[1.7]"
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

            {/* Question Tooltip via Portal */}
            <AnimatePresence>
                {activeQuestion && (
                    <QuestionTooltip
                        question={activeQuestion.question.question}
                        side={activeQuestion.side}
                        anchorY={tooltipY}
                        onSubmit={handleSubmitAnswer}
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

            {/* Progress Indicator */}
            <div
                className="fixed left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 bottom-[5vh]"
            >
                <p
                    className="tracking-wide text-[#aaa] text-[clamp(12px,1vw,16px)]"
                >
                    {currentIndex + 1} / {sentences.length}
                </p>
                <div
                    className="h-1 overflow-hidden rounded-full bg-[#e8e8e8] w-[clamp(120px,15vw,200px)]"
                >
                    <div
                        className="h-full rounded-full bg-[#1a1a1a] transition-all duration-500 ease-out"
                        style={{
                            width: `${((currentIndex + 1) / sentences.length) * 100}%`,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}