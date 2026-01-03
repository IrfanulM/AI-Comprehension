"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import PassageReader from "@/components/PassageReader";
import MainMenu from "@/components/MainMenu";
import PostReading from "@/components/PostReading";
import Results from "@/components/Results";
import LoadingOverlay from "@/components/LoadingOverlay";
import ErrorMessage from "@/components/ErrorMessage";
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

export default function Home() {
    const [appState, setAppState] = useState<AppState>("menu");
    const [selectedPassage, setSelectedPassage] = useState<any>(null);
    const [questions, setQuestions] = useState<QuestionsData | null>(null);
    const [checks, setChecks] = useState<ChecksData | null>(null);
    const [savedAnswers, setSavedAnswers] = useState<Record<string, string>>({});
    const [correctedSummary, setCorrectedSummary] = useState("");
    const [error, setError] = useState<string | null>(null);

    const passages = Object.values(passageData);

    // Get post-reading question from loaded questions
    const postReadingQuestion = questions
        ? (Object.values(questions).find((q) => q.type === "post-reading") as PostReadingQuestion | undefined)
        : undefined;

    // Check localStorage for cached questions
    const getCachedQuestions = (passageId: string): QuestionsData | null => {
        if (typeof window === "undefined") return null;
        const cached = localStorage.getItem(CACHE_PREFIX + passageId);
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
    const cacheQuestions = (passageId: string, questionsData: QuestionsData) => {
        if (typeof window === "undefined") return;
        localStorage.setItem(CACHE_PREFIX + passageId, JSON.stringify(questionsData));
    };

    const handleSelectPassage = async (passage: any) => {
        setSelectedPassage(passage);
        setSavedAnswers({});
        setCorrectedSummary("");
        setError(null);
        setChecks(null);

        // Check cache first
        const cached = getCachedQuestions(passage.id);
        if (cached) {
            setQuestions(cached);
            setAppState("reading");
            return;
        }

        // Fetch from API
        setAppState("loading-questions");

        try {
            const response = await fetch("/api/generate-questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    passageTitle: passage.title,
                    passageContent: passage.content,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate questions");
            }

            const data = await response.json();
            setQuestions(data.questions);
            cacheQuestions(passage.id, data.questions);
            setAppState("reading");
        } catch (err) {
            console.error("Error generating questions:", err);
            setError("Failed to generate questions. Please try again.");
            setAppState("menu");
        }
    };

    const handleFinishReading = (answers: Record<string, string>) => {
        setSavedAnswers(answers);
        setAppState("post-reading");
    };

    const handleSubmitCorrections = (summary: string) => {
        setCorrectedSummary(summary);
        handleGradeAnswers(savedAnswers, summary);
    };

    const handleGradeAnswers = async (answers: Record<string, string>, summary: string) => {
        setAppState("loading-results");
        setError(null);

        try {
            const response = await fetch("/api/grade-answers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    passageContent: selectedPassage.content,
                    questions,
                    answers,
                    correctedSummary: summary,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to grade answers");
            }

            const data = await response.json();
            setChecks(data.results);
            setAppState("results");
        } catch (err) {
            console.error("Error grading answers:", err);
            setError("Failed to grade answers. Please try again.");
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
                onBack={handleBackToMenu}
                onFinish={handleFinishReading}
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
                savedAnswers={savedAnswers}
                correctedSummary={correctedSummary}
                questions={questions}
                checks={checks}
                onBack={handleBackToMenu}
            />
        );
    }

    // Menu state
    return (
        <MainMenu
            passages={passages}
            onSelect={handleSelectPassage}
        />
    );
}
