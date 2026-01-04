"use client";

import { motion } from "framer-motion";
import { useRef, useState, useEffect } from "react";

interface CheckItem {
    question: string;
    "answer-rating": number;
    explanation: string;
}

interface WhileReadingQuestion {
    type: "while-reading";
    "sentence-number": number;
    question: string;
}

type CheckData = Record<string, CheckItem>;
type QuestionsData = Record<string, any>;

interface ResultsProps {
    passageTitle: string;
    passageContent: string;
    passageId: string;
    savedAnswers: Record<string, string>;
    correctedSummary: string;
    questions: QuestionsData;
    checks: CheckData;
    onBack: () => void;
    onRetryUpdate?: (checks: CheckData, answers: Record<string, string>, summary: string) => void;
    grade?: number;
}

export default function Results({
    passageTitle,
    passageContent,
    passageId,
    savedAnswers,
    correctedSummary,
    questions,
    checks: initialChecks,
    onBack,
    onRetryUpdate,
    grade = 10,
}: ResultsProps) {
    const passageRef = useRef<HTMLDivElement>(null);
    const sentenceRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
    const [sentencePositions, setSentencePositions] = useState<Map<number, number>>(new Map());
    const [hoveredQuestion, setHoveredQuestion] = useState<string | null>(null);
    
    // State for try-again feature
    const [checks, setChecks] = useState<CheckData>(initialChecks);
    const [updatedAnswers, setUpdatedAnswers] = useState<Record<string, string>>({ ...savedAnswers, summary: correctedSummary });

    // Parse sentences from passage
    const sentences = (() => {
        const paragraphs = passageContent.split(/\n\n+/);
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

    // Get while-reading questions with their sentence numbers and sides
    const whileReadingQuestions = Object.entries(questions)
        .filter(([, q]) => q.type === "while-reading")
        .map(([key, q], index) => ({
            key,
            sentenceNumber: (q as WhileReadingQuestion)["sentence-number"],
            question: (q as WhileReadingQuestion).question,
            side: index % 2 === 0 ? "right" : "left" as "left" | "right",
        }));

    // Get post-reading question
    const postReadingEntry = Object.entries(questions).find(([, q]) => q.type === "post-reading" || q.summary);
    const postReadingKey = postReadingEntry?.[0];

    // Get rating color based on score
    const getRatingColor = (rating: number) => {
        if (rating >= 8) return { text: "text-green-600", bg: "bg-green-50", border: "border-green-200" };
        if (rating >= 5) return { text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" };
        return { text: "text-red-600", bg: "bg-red-50", border: "border-red-200" };
    };

    // Calculate final score dynamically
    const allRatings = Object.values(checks).map(c => c["answer-rating"]);
    const totalScore = allRatings.reduce((sum, r) => sum + r, 0);
    const maxScore = allRatings.length * 10;
    const percentageScore = Math.round((totalScore / maxScore) * 100);

    // Handle retry result
    const handleRetryResult = (questionKey: string, newRating: number, newExplanation: string, newAnswer: string) => {
        const newChecks = {
            ...checks,
            [questionKey]: {
                ...checks[questionKey],
                "answer-rating": newRating,
                explanation: newExplanation,
            }
        };
        const newAnswers = { ...updatedAnswers, [questionKey]: newAnswer };
        const newSummary = questionKey === "summary" ? newAnswer : (updatedAnswers.summary || correctedSummary);
        
        setChecks(newChecks);
        setUpdatedAnswers(newAnswers);
        
        // Persist to localStorage via callback
        onRetryUpdate?.(newChecks, newAnswers, newSummary);
    };

    // Calculate sentence positions after render
    useEffect(() => {
        const updatePositions = () => {
            if (!passageRef.current) return;
            const passageRect = passageRef.current.getBoundingClientRect();
            const newPositions = new Map<number, number>();

            sentenceRefs.current.forEach((el, sentenceNum) => {
                if (el) {
                    const rect = el.getBoundingClientRect();
                    newPositions.set(sentenceNum, rect.top - passageRect.top + rect.height / 2);
                }
            });

            setSentencePositions(newPositions);
        };

        const timer = setTimeout(updatePositions, 100);
        window.addEventListener("resize", updatePositions);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("resize", updatePositions);
        };
    }, []);

    const leftQuestions = whileReadingQuestions.filter(q => q.side === "left");
    const rightQuestions = whileReadingQuestions.filter(q => q.side === "right");

    return (
        <div className="fixed inset-0 overflow-y-auto bg-white">
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

            {/* Desktop: Three Column Layout, Mobile: Single Column */}
            <div className="pt-[12vh] px-4 pb-8">
                {/* Desktop Layout (hidden on mobile) */}
                <div className="hidden lg:grid grid-cols-[1fr_minmax(500px,700px)_1fr] gap-6 max-w-[1400px] mx-auto">
                    {/* Left Column */}
                    <div className="relative">
                        {leftQuestions.map((q, index) => {
                            const yPos = sentencePositions.get(q.sentenceNumber) || 0;
                            return (
                                <ResultCard
                                    key={q.key}
                                    questionKey={q.key}
                                    side="left"
                                    yPosition={yPos}
                                    isMobile={false}
                                    question={q.question}
                                    userAnswer={updatedAnswers[q.key] || savedAnswers[q.key] || "(No answer provided)"}
                                    rating={checks[q.key]?.["answer-rating"] || 0}
                                    explanation={checks[q.key]?.explanation || ""}
                                    getRatingColor={getRatingColor}
                                    index={index}
                                    questionNumber={whileReadingQuestions.indexOf(q) + 1}
                                    isHovered={hoveredQuestion === q.key}
                                    onHover={setHoveredQuestion}
                                    grade={grade}
                                    onRetryComplete={handleRetryResult}
                                />
                            );
                        })}
                    </div>

                    {/* Center Column - Passage */}
                    <div ref={passageRef} className="relative font-serif text-[clamp(14px,1.3vw,18px)] leading-relaxed text-[#1a1a1a]">
                        {sentences.map((sentence, index) => {
                            const sentenceNumber = index + 1;
                            const questionForSentence = whileReadingQuestions.find(
                                q => q.sentenceNumber === sentenceNumber
                            );

                            const isHovered = questionForSentence && hoveredQuestion === questionForSentence.key;

                            let highlightClass = "transition-all duration-200 ";
                            if (questionForSentence && checks[questionForSentence.key]) {
                                const rating = checks[questionForSentence.key]["answer-rating"];
                                if (rating >= 8) {
                                    highlightClass += isHovered
                                        ? "bg-green-200 rounded px-0.5 cursor-pointer"
                                        : "bg-green-100/70 rounded px-0.5 cursor-pointer";
                                } else if (rating >= 5) {
                                    highlightClass += isHovered
                                        ? "bg-amber-200 rounded px-0.5 cursor-pointer"
                                        : "bg-amber-100/70 rounded px-0.5 cursor-pointer";
                                } else {
                                    highlightClass += isHovered
                                        ? "bg-red-200 rounded px-0.5 cursor-pointer"
                                        : "bg-red-100/70 rounded px-0.5 cursor-pointer";
                                }
                            }

                            return (
                                <span key={index}>
                                    {sentence.startsNewParagraph && <span className="block h-5" />}
                                    <span
                                        ref={questionForSentence ? (el) => { if (el) sentenceRefs.current.set(sentenceNumber, el); } : undefined}
                                        className={highlightClass}
                                        onMouseEnter={() => questionForSentence && setHoveredQuestion(questionForSentence.key)}
                                        onMouseLeave={() => setHoveredQuestion(null)}
                                    >
                                        {sentence.text}{" "}
                                    </span>
                                </span>
                            );
                        })}
                    </div>

                    {/* Right Column */}
                    <div className="relative">
                        {rightQuestions.map((q, index) => {
                            const yPos = sentencePositions.get(q.sentenceNumber) || 0;
                            return (
                                <ResultCard
                                    key={q.key}
                                    questionKey={q.key}
                                    side="right"
                                    yPosition={yPos}
                                    isMobile={false}
                                    question={q.question}
                                    userAnswer={updatedAnswers[q.key] || savedAnswers[q.key] || "(No answer provided)"}
                                    rating={checks[q.key]?.["answer-rating"] || 0}
                                    explanation={checks[q.key]?.explanation || ""}
                                    getRatingColor={getRatingColor}
                                    index={index}
                                    questionNumber={whileReadingQuestions.indexOf(q) + 1}
                                    isHovered={hoveredQuestion === q.key}
                                    onHover={setHoveredQuestion}
                                    grade={grade}
                                    onRetryComplete={handleRetryResult}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Mobile Layout (hidden on desktop) */}
                <div className="lg:hidden max-w-2xl mx-auto">
                    {/* Passage */}
                    <div className="font-serif text-base leading-relaxed text-[#1a1a1a] mb-8">
                        {sentences.map((sentence, index) => {
                            const sentenceNumber = index + 1;
                            const questionForSentence = whileReadingQuestions.find(
                                q => q.sentenceNumber === sentenceNumber
                            );

                            let highlightClass = "";
                            if (questionForSentence && checks[questionForSentence.key]) {
                                const rating = checks[questionForSentence.key]["answer-rating"];
                                if (rating >= 8) highlightClass = "bg-green-100/70 rounded px-0.5";
                                else if (rating >= 5) highlightClass = "bg-amber-100/70 rounded px-0.5";
                                else highlightClass = "bg-red-100/70 rounded px-0.5";
                            }

                            return (
                                <span key={index}>
                                    {sentence.startsNewParagraph && <span className="block h-4" />}
                                    <span className={highlightClass}>
                                        {sentence.text}{" "}
                                    </span>
                                </span>
                            );
                        })}
                    </div>

                    {/* Question Results - Stacked */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">
                            Your Results
                        </h2>
                        {whileReadingQuestions.map((q, index) => (
                            <ResultCard
                                key={q.key}
                                questionKey={q.key}
                                side="right"
                                yPosition={0}
                                isMobile={true}
                                question={q.question}
                                userAnswer={updatedAnswers[q.key] || savedAnswers[q.key] || "(No answer provided)"}
                                rating={checks[q.key]?.["answer-rating"] || 0}
                                explanation={checks[q.key]?.explanation || ""}
                                getRatingColor={getRatingColor}
                                index={index}
                                questionNumber={index + 1}
                                isHovered={false}
                                onHover={() => { }}
                                grade={grade}
                                onRetryComplete={handleRetryResult}
                            />
                        ))}
                    </div>
                </div>

                {/* Summary Question Results */}
                {postReadingKey && checks[postReadingKey] && (
                    <SummaryResultCard
                        questionKey={postReadingKey}
                        questions={questions}
                        correctedSummary={updatedAnswers.summary || correctedSummary}
                        rating={checks[postReadingKey]["answer-rating"]}
                        explanation={checks[postReadingKey].explanation}
                        getRatingColor={getRatingColor}
                        grade={grade}
                        onRetryComplete={handleRetryResult}
                        totalScore={totalScore}
                        maxScore={maxScore}
                        percentageScore={percentageScore}
                        onBack={onBack}
                    />
                )}
            </div>
        </div>
    );
}

// Inline spinner component
function Spinner() {
    return (
        <div className="flex flex-col items-center justify-center py-8">
            <div className="relative w-8 h-8 mb-2">
                <div className="absolute inset-0 border-3 border-black/10 rounded-full" />
                <motion.div
                    className="absolute inset-0 border-3 border-transparent border-t-[#1a1a1a] rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
            </div>
            <p className="text-xs text-[#888]">Evaluating...</p>
        </div>
    );
}

function ResultCard({
    questionKey,
    side,
    yPosition,
    isMobile,
    question,
    userAnswer,
    rating,
    explanation,
    getRatingColor,
    index,
    questionNumber,
    isHovered,
    onHover,
    grade,
    onRetryComplete,
}: {
    questionKey: string;
    side: "left" | "right";
    yPosition: number;
    isMobile: boolean;
    question: string;
    userAnswer: string;
    rating: number;
    explanation: string;
    getRatingColor: (rating: number) => { text: string; bg: string; border: string };
    index: number;
    questionNumber: number;
    isHovered: boolean;
    onHover: (key: string | null) => void;
    grade: number;
    onRetryComplete: (key: string, newRating: number, newExplanation: string, newAnswer: string) => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editedAnswer, setEditedAnswer] = useState(userAnswer);
    const colors = getRatingColor(rating);

    const handleTryAgain = () => {
        setEditedAnswer(userAnswer);
        setIsEditing(true);
    };

    const handleSubmitRetry = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/try-again", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question,
                    questionType: "while-reading",
                    originalAnswer: userAnswer,
                    editedAnswer,
                    originalRating: rating,
                    originalFeedback: explanation,
                    grade,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to evaluate");
            }

            const data = await response.json();
            onRetryComplete(questionKey, data.rating, data.explanation, editedAnswer);
        } catch (error) {
            console.error("Retry failed:", error);
        } finally {
            setIsLoading(false);
            setIsEditing(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: isMobile ? 0 : (side === "left" ? -20 : 20), y: isMobile ? 20 : 0 }}
            animate={{
                opacity: 1,
                x: 0,
                y: 0,
                scale: isHovered ? 1.03 : 1,
            }}
            transition={{
                duration: 0.4,
                delay: 0.2 + index * 0.15,
                scale: { duration: 0.2, delay: 0 }
            }}
            style={isMobile ? {} : { top: Math.max(0, yPosition - 20), zIndex: isHovered ? 10 : 1 }}
            className={`${isMobile ? "relative" : "absolute w-full"} bg-white rounded-xl border border-black/10 p-4 cursor-pointer transition-shadow duration-200 ${isHovered ? "shadow-lg" : "shadow-sm"} max-h-[500px] flex flex-col`}
            onMouseEnter={() => onHover(questionKey)}
            onMouseLeave={() => onHover(null)}
        >
            {/* Arrow pointing toward passage (desktop only) */}
            {!isMobile && (
                <div
                    className={`absolute top-5 w-3 h-3 bg-white border-black/10 rotate-45 ${side === "left"
                        ? "-right-1.5 border-t border-r"
                        : "-left-1.5 border-b border-l"
                        }`}
                />
            )}

            {isLoading ? (
                <Spinner />
            ) : (
                <>
                    {/* Header with rating */}
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-[#888] uppercase tracking-wider">
                            Question {questionNumber}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${colors.text} ${colors.bg} ${colors.border}`}>
                            {rating}/10
                        </span>
                    </div>

                    {/* Scrollable Content Area */}
                    <div className="overflow-y-auto scrollbar-none pr-1 flex-grow">
                        {/* Question */}
                        <p className="text-sm font-medium text-[#1a1a1a] mb-2 leading-snug">
                            {question}
                        </p>

                    {/* Your Answer */}
                    <div className="mb-2">
                        <span className="text-[10px] font-semibold text-[#aaa] uppercase tracking-wider">
                            Your Answer
                        </span>
                        {isEditing ? (
                            <textarea
                                value={editedAnswer}
                                onChange={(e) => setEditedAnswer(e.target.value)}
                                className="w-full mt-1 p-2 text-xs text-[#555] leading-relaxed border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 resize-none"
                                rows={3}
                                maxLength={1000}
                                autoFocus
                            />
                        ) : (
                            <p className="text-xs text-[#555] mt-0.5 leading-relaxed">
                                {userAnswer}
                            </p>
                        )}
                    </div>

                        {/* Feedback */}
                        <div className="mb-3">
                            <span className="text-[10px] font-semibold text-[#aaa] uppercase tracking-wider">
                                Feedback
                            </span>
                            <p className={`text-xs mt-0.5 leading-relaxed ${colors.text}`}>
                                {explanation}
                            </p>
                        </div>
                    </div>

                    {/* Try Again / Submit buttons */}
                    {rating < 10 && (
                        <div className="flex justify-end gap-2">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-3 py-1.5 text-xs font-medium text-[#666] bg-[#f5f5f5] rounded-full hover:bg-[#eee] transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmitRetry}
                                        className="px-3 py-1.5 text-xs font-medium text-white bg-[#1a1a1a] rounded-full hover:scale-105 active:scale-[0.98] transition-all cursor-pointer"
                                    >
                                        Submit
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleTryAgain}
                                    className="px-3 py-1.5 text-xs font-medium text-[#1a1a1a] border border-black/10 rounded-full hover:bg-[#f5f5f5] transition-colors cursor-pointer"
                                >
                                    Try Again
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}
        </motion.div>
    );
}

function SummaryResultCard({
    questionKey,
    questions,
    correctedSummary,
    rating,
    explanation,
    getRatingColor,
    grade,
    onRetryComplete,
    totalScore,
    maxScore,
    percentageScore,
    onBack,
}: {
    questionKey: string;
    questions: QuestionsData;
    correctedSummary: string;
    rating: number;
    explanation: string;
    getRatingColor: (rating: number) => { text: string; bg: string; border: string };
    grade: number;
    onRetryComplete: (key: string, newRating: number, newExplanation: string, newAnswer: string) => void;
    totalScore: number;
    maxScore: number;
    percentageScore: number;
    onBack: () => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editedSummary, setEditedSummary] = useState(correctedSummary);
    const colors = getRatingColor(rating);

    const handleTryAgain = () => {
        setEditedSummary(correctedSummary);
        setIsEditing(true);
    };

    const handleSubmitRetry = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/try-again", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question: "Correct the errors in the passage summary",
                    questionType: "post-reading",
                    originalAnswer: correctedSummary,
                    editedAnswer: editedSummary,
                    originalRating: rating,
                    originalFeedback: explanation,
                    grade,
                    originalSummary: questions[questionKey].summary,
                    errors: questions[questionKey].errors,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to evaluate");
            }

            const data = await response.json();
            onRetryComplete("summary", data.rating, data.explanation, editedSummary);
        } catch (error) {
            console.error("Retry failed:", error);
        } finally {
            setIsLoading(false);
            setIsEditing(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="max-w-[700px] mx-auto mt-8 lg:mt-16 mb-8"
        >
        <div className="bg-white rounded-2xl border border-black/10 overflow-hidden shadow-sm max-h-[85vh] flex flex-col">
            <div className="flex-grow overflow-y-auto scrollbar-none">
                {/* Header */}
                <div className="px-6 py-4 bg-[#fafafa] border-b border-black/5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <span className="text-xs font-medium text-[#888] uppercase tracking-wider">
                                Summary Correction
                            </span>
                            <p className="text-[#1a1a1a] font-medium mt-1">
                                Correct the errors in the passage summary
                            </p>
                        </div>
                        <div className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-sm font-bold ${colors.text} ${colors.bg} ${colors.border}`}>
                            {rating}/10
                        </div>
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="py-12">
                        <Spinner />
                    </div>
                ) : (
                    <div className="px-6 py-4 space-y-4">
                        <div>
                            <span className="text-xs font-medium text-[#888] uppercase tracking-wider">
                                Your Corrections
                            </span>
                            {isEditing ? (
                                <textarea
                                    value={editedSummary}
                                    onChange={(e) => setEditedSummary(e.target.value)}
                                    className="w-full mt-2 p-4 text-sm text-[#1a1a1a] leading-relaxed bg-[#f5f5f5] border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 resize-none"
                                    rows={5}
                                    maxLength={1000}
                                    autoFocus
                                />
                            ) : (
                                <p className="mt-2 text-sm text-[#1a1a1a] leading-relaxed bg-[#f5f5f5] p-4 rounded-lg">
                                    {correctedSummary || "(No corrections submitted)"}
                                </p>
                            )}
                        </div>
                        <div>
                            <span className="text-xs font-medium text-[#888] uppercase tracking-wider">
                                Feedback
                            </span>
                            <p className={`mt-2 leading-relaxed ${colors.text}`}>
                                {explanation}
                            </p>
                        </div>

                        {/* Try Again buttons */}
                        {rating < 10 && (
                            <div className="flex justify-end gap-2 pt-2">
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="px-4 py-2 text-sm font-medium text-[#666] bg-[#f5f5f5] rounded-full hover:bg-[#eee] transition-colors cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSubmitRetry}
                                            className="px-4 py-2 text-sm font-medium text-white bg-[#1a1a1a] rounded-full hover:scale-105 active:scale-[0.98] transition-all cursor-pointer"
                                        >
                                            Submit
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={handleTryAgain}
                                        className="px-4 py-2 text-sm font-medium text-[#1a1a1a] border border-black/10 rounded-full hover:bg-[#f5f5f5] transition-colors cursor-pointer"
                                    >
                                        Try Again
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

            {/* Final Score & Done Button */}
            <div className="mt-8 flex items-center justify-center gap-6">
                <div className="text-center">
                    <p className="text-xs font-medium text-[#888] uppercase tracking-wider mb-1">
                        Final Score
                    </p>
                    <p className={`text-3xl font-bold ${getRatingColor(percentageScore / 10).text}`}>
                        {percentageScore}%
                    </p>
                    <p className="text-xs text-[#aaa] mt-0.5">
                        {totalScore} / {maxScore} points
                    </p>
                </div>
                <button
                    onClick={onBack}
                    className="px-8 py-3 bg-[#1a1a1a] text-white font-medium rounded-full shadow-lg hover:scale-105 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                >
                    Back to Menu
                </button>
            </div>
        </motion.div>
    );
}
