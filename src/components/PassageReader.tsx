"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";

interface PassageData {
    passage: {
        id: string;
        title: string;
        content: string;
    };
}

interface PassageReaderProps {
    passageData: PassageData;
}

export default function PassageReader({ passageData }: PassageReaderProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAdvancing, setIsAdvancing] = useState(true);
    const [fadingOutIndex, setFadingOutIndex] = useState<number | null>(null);
    const [topPosition, setTopPosition] = useState<number | null>(null);
    const scrollCooldown = useRef(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // Process passage content into individual sentences with paragraph metadata
    const sentences = (() => {
        const content = passageData.passage.content;
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

    // Navigation handlers
    const advance = () => {
        if (scrollCooldown.current) return;
        scrollCooldown.current = true;
        setIsAdvancing(true);
        setFadingOutIndex(null);
        setCurrentIndex((prev) => Math.min(prev + 1, sentences.length - 1));
        setTimeout(() => {
            scrollCooldown.current = false;
        }, 300);
    };

    const retreat = () => {
        if (scrollCooldown.current || currentIndex === 0) return;
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

    // Calculate vertical position based on content height to handle centering and bottom anchoring
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

    // Global input event listeners
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown" || e.key === " ") {
                e.preventDefault();
                advance();
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                retreat();
            }
        };

        const handleWheel = (e: WheelEvent) => {
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

        return (
            <span key={index} data-fading={isHide ? "true" : "false"}>
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
                {passageData.passage.title}
            </h1>

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