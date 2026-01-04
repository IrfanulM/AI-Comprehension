"use client";

import { useState, useEffect, useRef } from "react";

interface ReaderSettingsProps {
    currentSentenceIndex: number;
    sentences: { text: string }[];
    totalSentences: number;
    readOnlyMode: boolean;
    onReadOnlyChange: (readOnly: boolean) => void;
    fullViewMode: boolean;
    onFullViewChange: (fullView: boolean) => void;
    onResetToStart: () => void;
    onSearchQueryChange?: (query: string) => void;
}

export default function ReaderSettings({ currentSentenceIndex, sentences, totalSentences, readOnlyMode, onReadOnlyChange, fullViewMode, onFullViewChange, onResetToStart, onSearchQueryChange }: ReaderSettingsProps) {

    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<{ sentenceIndex: number; text: string }[]>([]);
    const searchRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
            }
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
                setIsMobileMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus input when search opens
    useEffect(() => {
        if (isSearchOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSearchOpen]);

    // Search when query changes
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const query = searchQuery.toLowerCase();
        const results: { sentenceIndex: number; text: string }[] = [];

        const maxIndex = readOnlyMode ? sentences.length - 1 : currentSentenceIndex;
        for (let i = 0; i <= maxIndex && i < sentences.length; i++) {
            if (sentences[i].text.toLowerCase().includes(query)) {
                results.push({ sentenceIndex: i, text: sentences[i].text });
            }
        }

        setSearchResults(results);
    }, [searchQuery, currentSentenceIndex, sentences, readOnlyMode]);

    // Notify parent of search query changes
    useEffect(() => {
        onSearchQueryChange?.(searchQuery);
    }, [searchQuery, onSearchQueryChange]);

    const highlightMatch = (text: string, query: string) => {
        if (!query.trim()) return text;
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return parts.map((part, i) => 
            part.toLowerCase() === query.toLowerCase() 
                ? <mark key={i} className="bg-yellow-200 rounded px-0.5">{part}</mark> 
                : part
        );
    };

    // Toggle component for reuse
    const Toggle = ({ label, icon, isOn, onToggle }: { label: string; icon: React.ReactNode; isOn: boolean; onToggle: () => void }) => (
        <div
            onClick={onToggle}
            className="flex items-center justify-between gap-3 cursor-pointer select-none"
        >
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-sm text-[#1a1a1a] font-medium">{label}</span>
            </div>
            <div className={`w-10 h-5 rounded-full transition-colors ${isOn ? "bg-[#1a1a1a]" : "bg-[#ddd]"}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${isOn ? "translate-x-5 ml-0.5" : "translate-x-0.5"}`} />
            </div>
        </div>
    );

    return (
        <>
            {/* MOBILE: Single settings button with dropdown */}
            <div ref={mobileMenuRef} className="md:hidden fixed top-8 right-8 z-40">
                <div
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="bg-white/80 hover:bg-white backdrop-blur-sm rounded-full p-2.5 shadow-sm border border-black/5 transition-all duration-300 cursor-pointer"
                >
                    <svg className="w-5 h-5 text-[#666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>

                {isMobileMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border border-black/10 overflow-hidden w-[280px]">
                        {/* Search */}
                        <div className="p-3 border-b border-black/5">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={readOnlyMode ? "Search in passage..." : "Search up to current..."}
                                className="w-full text-sm bg-[#f5f5f5] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10"
                                maxLength={100}
                            />
                            {searchQuery.trim() && (
                                <div className="max-h-[150px] overflow-y-auto mt-2">
                                    {searchResults.length === 0 ? (
                                        <div className="p-2 text-sm text-[#888] text-center">No matches found</div>
                                    ) : (
                                        searchResults.map((result, i) => (
                                            <div key={i} className="p-2 text-xs border-b border-black/5 last:border-0">
                                                <span className="text-[#888] text-[10px] uppercase tracking-wider">Sentence {result.sentenceIndex + 1}</span>
                                                <p className="mt-1 text-[#1a1a1a] line-clamp-2">{highlightMatch(result.text, searchQuery)}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        
                        {/* Toggle Options */}
                        <div className="p-4 space-y-4">
                            <Toggle 
                                label="Read Only"
                                icon={<svg className="w-4 h-4 text-[#666]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                                isOn={readOnlyMode}
                                onToggle={() => {
                                    if (readOnlyMode && currentSentenceIndex > 0) onResetToStart();
                                    onReadOnlyChange(!readOnlyMode);
                                }}
                            />
                            <Toggle 
                                label="Full View"
                                icon={<svg className="w-4 h-4 text-[#666]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>}
                                isOn={fullViewMode}
                                onToggle={() => onFullViewChange(!fullViewMode)}
                            />
                        </div>

                        {/* Restart Button */}
                        <div className="p-3 border-t border-black/5">
                            <button
                                onClick={() => { onResetToStart(); setIsMobileMenuOpen(false); }}
                                className="w-full py-2 px-4 text-sm font-medium text-[#666] bg-[#f5f5f5] rounded-lg hover:bg-[#eee] transition-colors cursor-pointer"
                            >
                                Restart Reading
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* DESKTOP: Top Right Group - Search and Restart */}
            <div className="hidden md:flex fixed top-8 right-8 z-40 items-center gap-3">
                {/* Search */}
                <div ref={searchRef} className="relative">
                    <div
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                        className="bg-white/80 hover:bg-white backdrop-blur-sm rounded-full px-3 py-2 shadow-sm border border-black/5 transition-all duration-300 cursor-pointer flex items-center justify-center h-10"
                    >
                        <svg className="w-4 h-4 text-[#666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    {isSearchOpen && (
                        <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border border-black/10 overflow-hidden w-[300px]">
                            <div className="p-3 border-b border-black/5">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={readOnlyMode ? "Search in passage..." : "Search up to current sentence..."}
                                    className="w-full text-sm bg-[#f5f5f5] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10"
                                    maxLength={100}
                                />
                            </div>
                            {searchQuery.trim() && (
                                <div className="max-h-[200px] overflow-y-auto">
                                    {searchResults.length === 0 ? (
                                        <div className="p-3 text-sm text-[#888] text-center">No matches found</div>
                                    ) : (
                                        searchResults.map((result, i) => (
                                            <div key={i} className="p-3 text-xs border-b border-black/5 last:border-0 hover:bg-[#f9f9f9]">
                                                <span className="text-[#888] text-[10px] uppercase tracking-wider">Sentence {result.sentenceIndex + 1}</span>
                                                <p className="mt-1 text-[#1a1a1a] line-clamp-2">
                                                    {highlightMatch(result.text, searchQuery)}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Restart Button */}
                <div
                    onClick={onResetToStart}
                    className="bg-white/80 hover:bg-white backdrop-blur-sm rounded-full px-3 py-2 shadow-sm border border-black/5 flex items-center justify-center transition-all duration-300 cursor-pointer h-10"
                    title="Restart from beginning"
                >
                    <svg className="w-4 h-4 text-[#666] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </div>
            </div>

            {/* DESKTOP: Bottom Right Group - Read Only, Full View */}
            <div className="hidden md:flex fixed bottom-8 right-8 z-40 items-center gap-3">
                {/* Read Only Mode Toggle */}
                <div
                    onClick={() => {
                        if (readOnlyMode && currentSentenceIndex > 0) {
                            onResetToStart();
                        }
                        onReadOnlyChange(!readOnlyMode);
                    }}
                    className="bg-white/80 hover:bg-white backdrop-blur-sm rounded-full px-3 py-2 shadow-sm border border-black/5 flex items-center gap-2 transition-all duration-300 cursor-pointer select-none h-10"
                >
                    <svg className="w-4 h-4 text-[#666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="text-xs text-[#666] font-medium">Read Only</span>
                    <div className={`w-8 h-4 rounded-full transition-colors ${readOnlyMode ? "bg-[#1a1a1a]" : "bg-[#ddd]"}`}>
                        <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${readOnlyMode ? "translate-x-4 ml-0.5" : "translate-x-0.5"}`} />
                    </div>
                </div>

                {/* Full View Toggle */}
                <div
                    onClick={() => onFullViewChange(!fullViewMode)}
                    className="bg-white/80 hover:bg-white backdrop-blur-sm rounded-full px-3 py-2 shadow-sm border border-black/5 flex items-center gap-2 transition-all duration-300 cursor-pointer select-none h-10"
                >
                    <svg className="w-4 h-4 text-[#666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    <span className="text-xs text-[#666] font-medium">Full View</span>
                    <div className={`w-8 h-4 rounded-full transition-colors ${fullViewMode ? "bg-[#1a1a1a]" : "bg-[#ddd]"}`}>
                        <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${fullViewMode ? "translate-x-4 ml-0.5" : "translate-x-0.5"}`} />
                    </div>
                </div>
            </div>
        </>
    );
}
