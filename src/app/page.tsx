"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import PassageReader from "@/components/PassageReader";
import MainMenu from "@/components/MainMenu";
import PostReading from "@/components/PostReading";
import Results from "@/components/Results";
import LoadingOverlay from "@/components/LoadingOverlay";
import ErrorMessage from "@/components/ErrorMessage";
import Settings from "@/components/Settings";
import passageData from "@/data/passage.json";

type AppState = "menu" | "loading-questions" | "reading" | "post-reading" | "loading-results" | "results";

interface PostReadingQuestion {
    type: "post-reading";
    summary: string;
    errors: Record<string, string>;
}

interface QuestionsData {
    [key: string]: any;
}

interface ChecksData {
    [key: string]: {
        question: string;
        "answer-rating": number;
        explanation: string;
    };
}

const CACHE_PREFIX = "questions_";
const API_TIMEOUT_MS = 30000;

// Helper to create fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
};

export default function Home() {
    const [appState, setAppState] = useState<AppState>("menu");
    const [selectedPassage, setSelectedPassage] = useState<any>(null);
    const [questions, setQuestions] = useState<QuestionsData | null>(null);
    const [checks, setChecks] = useState<ChecksData | null>(null);
    const [savedAnswers, setSavedAnswers] = useState<Record<string, string>>({});
    const [correctedSummary, setCorrectedSummary] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [selectedGrade, setSelectedGrade] = useState<number>(10);

    const passages = Object.values(passageData);

    // Get post-reading question from loaded questions
    const postReadingQuestion = questions
        ? (Object.values(questions).find((q) => q.type === "post-reading" || q.summary) as PostReadingQuestion | undefined)
        : undefined;

    const getQuestionsCacheKey = (passageId: string, grade: number) => `${CACHE_PREFIX}${passageId}_grade${grade}`;

    // Check localStorage for cached questions
    const getCachedQuestions = (passageId: string, grade: number): QuestionsData | null => {
        if (typeof window === "undefined") return null;
        const cached = localStorage.getItem(getQuestionsCacheKey(passageId, grade));
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                return null;
            }
        }
        return null;
    };

    // Save questions to localStorage
    const cacheQuestions = (passageId: string, grade: number, questionsData: QuestionsData) => {
        if (typeof window === "undefined") return;
        localStorage.setItem(getQuestionsCacheKey(passageId, grade), JSON.stringify(questionsData));
    };

    // Cache key helpers
    const getAnswersCacheKey = (passageId: string, grade: number) => `answers_${passageId}_grade${grade}`;

    // Check localStorage for cached answers
    const getCachedAnswers = (passageId: string, grade: number): Record<string, string> => {
        if (typeof window === "undefined") return {};
        const cached = localStorage.getItem(getAnswersCacheKey(passageId, grade));
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                return {};
            }
        }
        return {};
    };

    // Check localStorage for cached results
    const getCachedResults = (passageId: string): { checks: ChecksData; answers: Record<string, string>; summary: string } | null => {
        if (typeof window === "undefined") return null;
        const cached = localStorage.getItem(`results_${passageId}`);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                return null;
            }
        }
        return null;
    };

    // Save results to localStorage
    const cacheResults = (passageId: string, checks: ChecksData, answers: Record<string, string>, summary: string) => {
        if (typeof window === "undefined") return;
        localStorage.setItem(`results_${passageId}`, JSON.stringify({ checks, answers, summary }));
    };

    const handleSaveAnswer = (key: string, answer: string) => {
        setSavedAnswers(prev => {
            const newAnswers = { ...prev, [key]: answer };
            if (selectedPassage) {
                localStorage.setItem(getAnswersCacheKey(selectedPassage.id, selectedGrade), JSON.stringify(newAnswers));
            }
            return newAnswers;
        });
    };

    const handleSelectPassage = async (passage: any) => {
        setSelectedPassage(passage);
        setSavedAnswers(getCachedAnswers(passage.id, selectedGrade));
        setCorrectedSummary("");
        setError(null);
        setChecks(null);

        // Check cache first (with current grade)
        const cached = getCachedQuestions(passage.id, selectedGrade);
        if (cached) {
            setQuestions(cached);
            setAppState("reading");
            return;
        }

        // Fetch from API with timeout
        setAppState("loading-questions");

        try {
            const response = await fetchWithTimeout("/api/generate-questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    passageTitle: passage.title,
                    passageContent: passage.content,
                    grade: selectedGrade,
                }),
            }, API_TIMEOUT_MS);

            if (!response.ok) {
                throw new Error("Failed to generate questions");
            }

            const data = await response.json();
            
            // Validate response has questions object with at least one entry
            if (!data.questions || typeof data.questions !== "object" || Object.keys(data.questions).length === 0) {
                throw new Error("Invalid response from AI");
            }
            
            setQuestions(data.questions);
            cacheQuestions(passage.id, selectedGrade, data.questions);
            setAppState("reading");
        } catch (err: any) {
            console.error("Error generating questions:", err);
            const message = err.name === "AbortError" 
                ? "Request timed out. Please try again." 
                : "Failed to generate questions. Please try again.";
            setError(message);
            setAppState("menu");
        }
    };

    const handleFinishReading = (answers: Record<string, string>) => {
        setSavedAnswers(answers);
        if (selectedPassage) {
            localStorage.setItem(getAnswersCacheKey(selectedPassage.id, selectedGrade), JSON.stringify(answers));
        }
        if (postReadingQuestion) {
            setAppState("post-reading");
        } else {
            handleGradeAnswers(answers, "");
        }
    };

    const handleSubmitCorrections = (summary: string) => {
        setCorrectedSummary(summary);
        handleGradeAnswers(savedAnswers, summary);
    };

    const handleGradeAnswers = async (answers: Record<string, string>, summary: string) => {
        setAppState("loading-results");
        setError(null);

        try {
            const response = await fetchWithTimeout("/api/grade-answers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    passageContent: selectedPassage.content,
                    questions,
                    answers,
                    correctedSummary: summary,
                    grade: selectedGrade,
                }),
            }, API_TIMEOUT_MS);

            if (!response.ok) {
                throw new Error("Failed to grade answers");
            }

            const data = await response.json();
            
            // Validate response has results
            if (!data.results || typeof data.results !== "object") {
                throw new Error("Invalid response from AI");
            }
            
            setChecks(data.results);
            // Cache results
            if (selectedPassage) {
                cacheResults(selectedPassage.id, data.results, answers, summary);
            }
            setAppState("results");
        } catch (err: any) {
            console.error("Error grading answers:", err);
            const message = err.name === "AbortError" 
                ? "Request timed out. Please try again." 
                : "Failed to grade answers. Please try again.";
            setError(message);
            setAppState("post-reading");
        }
    };

    const handleBackToMenu = () => {
        setAppState("menu");
        setSelectedPassage(null);
        setQuestions(null);
        setChecks(null);
        setSavedAnswers({});
        setCorrectedSummary("");
        setError(null);
    };

    const handleViewResults = (passage: any) => {
        const cachedResults = getCachedResults(passage.id);
        const cachedQuestions = getCachedQuestions(passage.id, selectedGrade);
        if (cachedResults && cachedQuestions) {
            setSelectedPassage(passage);
            setQuestions(cachedQuestions);
            setChecks(cachedResults.checks);
            setSavedAnswers(cachedResults.answers);
            setCorrectedSummary(cachedResults.summary);
            setAppState("results");
        }
    };

    // Loading states
    if (appState === "loading-questions") {
        return <LoadingOverlay message="Generating questions..." />;
    }

    if (appState === "loading-results") {
        return <LoadingOverlay message="Grading your answers..." />;
    }

    // Error state
    if (error) {
        return <ErrorMessage message={error} onDismiss={handleBackToMenu} />;
    }

    // Reading state
    if (appState === "reading" && selectedPassage && questions) {
        return (
            <PassageReader
                passage={selectedPassage}
                questions={questions}
                initialAnswers={savedAnswers}
                onBack={handleBackToMenu}
                onFinish={handleFinishReading}
                onSaveAnswer={handleSaveAnswer}
            />
        );
    }

    // Post-reading state
    if (appState === "post-reading" && selectedPassage && postReadingQuestion) {
        return (
            <PostReading
                passageTitle={selectedPassage.title}
                summary={postReadingQuestion.summary}
                onSubmit={handleSubmitCorrections}
                onBack={() => setAppState("reading")}
            />
        );
    }

    // Results state
    if (appState === "results" && selectedPassage && questions && checks) {
        return (
            <Results
                passageTitle={selectedPassage.title}
                passageContent={selectedPassage.content}
                passageId={selectedPassage.id}
                savedAnswers={savedAnswers}
                correctedSummary={correctedSummary}
                questions={questions}
                checks={checks}
                onBack={handleBackToMenu}
                onRetryUpdate={(newChecks, newAnswers, newSummary) => {
                    setChecks(newChecks);
                    setSavedAnswers(newAnswers);
                    setCorrectedSummary(newSummary);
                    cacheResults(selectedPassage.id, newChecks, newAnswers, newSummary);
                }}
                grade={selectedGrade}
            />
        );
    }

    // Menu state
    return (
        <>
            <Settings onGradeChange={setSelectedGrade} />
            <MainMenu
                passages={passages}
                onSelect={handleSelectPassage}
                onViewResults={handleViewResults}
            />
        </>
    );
}
