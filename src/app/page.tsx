"use client";

import PassageReader from "@/components/PassageReader";
import MainMenu from "@/components/MainMenu";
import passageData from "@/data/passage.json";
import { useState } from "react";

export default function Home() {
    const [selectedPassage, setSelectedPassage] = useState<any>(null);

    const passages = Object.values(passageData);

    if (selectedPassage) {
        return (
            <PassageReader
                passage={selectedPassage}
                onBack={() => setSelectedPassage(null)}
            />
        );
    }

    return (
        <MainMenu
            passages={passages}
            onSelect={(passage) => setSelectedPassage(passage)}
        />
    );
}
