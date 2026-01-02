"use client";

import PassageReader from "@/components/PassageReader";
import MainMenu from "@/components/MainMenu";
import PostReading from "@/components/PostReading";
import Results from "@/components/Results";
import passageData from "@/data/passage.json";
import questionsData from "@/data/questions.json";
import { useState } from "react";

type AppState = "menu" | "reading" | "post-reading" | "results";

interface PostReadingQuestion {
    type: "post-reading";
    summary: string;
    errors: Record<string, string>;
}

export default function Home() {
    const [appState, setAppState] = useState<AppState>("menu");
    const [selectedPassage, setSelectedPassage] = useState<any>(null);
    const [savedAnswers, setSavedAnswers] = useState<Record<string, string>>({});
    const [correctedSummary, setCorrectedSummary] = useState("");

    const passages = Object.values(passageData);

    const postReadingQuestion = Object.values(questionsData).find(
        (q) => q.type === "post-reading"
    ) as PostReadingQuestion | undefined;

    const handleSelectPassage = (passage: any) => {
        setSelectedPassage(passage);
        setSavedAnswers({});
        setCorrectedSummary("");
        setAppState("reading");
    };

    const handleFinishReading = (answers: Record<string, string>) => {
        setSavedAnswers(answers);
        if (postReadingQuestion) {
            setAppState("post-reading");
        } else {
            setAppState("results");
        }
    };

    const handleSubmitCorrections = (summary: string) => {
        setCorrectedSummary(summary);
        setAppState("results");
    };

    const handleBackToMenu = () => {
        setAppState("menu");
        setSelectedPassage(null);
        setSavedAnswers({});
        setCorrectedSummary("");
    };

    if (appState === "reading" && selectedPassage) {
        return (
            <PassageReader
                passage={selectedPassage}
                onBack={handleFinishReading}
            />
        );
    }

    if (appState === "post-reading" && selectedPassage && postReadingQuestion) {
        return (
            <PostReading
                passageTitle={selectedPassage.title}
                summary={postReadingQuestion.summary}
                onSubmit={handleSubmitCorrections}
                onBack={handleBackToMenu}
            />
        );
    }

    if (appState === "results" && selectedPassage) {
        return (
            <Results
                passageTitle={selectedPassage.title}
                passageContent={selectedPassage.content}
                savedAnswers={savedAnswers}
                correctedSummary={correctedSummary}
                onBack={handleBackToMenu}
            />
        );
    }

    return (
        <MainMenu
            passages={passages}
            onSelect={handleSelectPassage}
        />
    );
}
