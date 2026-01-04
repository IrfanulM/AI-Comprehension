import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        const { passageTitle, passageContent, grade } = await request.json();
        const studentGrade = grade || 7;

        if (!passageTitle || !passageContent) {
            return NextResponse.json(
                { error: "Missing passageTitle or passageContent" },
                { status: 400 }
            );
        }

        // Split into sentences
        const sentences = passageContent
            .split(/(?<=[.!?])\s+/)
            .filter((s: string) => s.trim().length > 0);

        const sentenceCount = sentences.length;

        // Dynamic question count: 1 per ~5 sentences, min 2, max 6
        const questionCount = Math.min(6, Math.max(2, Math.floor(sentenceCount / 5)));

        // Number the sentences for the prompt
        const numberedSentences = sentences
            .map((s: string, i: number) => `${i + 1}. ${s}`)
            .join("\n");

const systemPrompt = `You are an expert reading comprehension instructor for Grade ${studentGrade} students.

TASK: Generate ${questionCount} while-reading questions and 1 post-reading summary task.
CRITICAL: All questions and language MUST be appropriate for Grade ${studentGrade} level. Adjust vocabulary complexity, reasoning depth, and question difficulty accordingly.

WHILE-READING QUESTIONS:
- Each specifies a sentence-number where it appears (the "Stop Point")
- Tests comprehension of ALL text UP TO that sentence (student has NOT read anything after)
- STRICTLY FORBIDDEN: referencing concepts, events, or definitions that appear after the Stop Point
- **THE HIGHLIGHTER TEST:** If the answer to the question is explicitly printed in a single sentence, REJECT the question. The student must not be able to just "find" the answer; they must "construct" it.
- NO recall questions ("What is X?", "Where is Y?", "How many?")
- REQUIRE: Synthesis, inference, cause-and-effect, evaluation, deep reasoning
- Questions should test genuine comprehension, not surface-level recall
- Question quality matters and should lead to strong learning outcomes
- NEVER place a question on sentence 1
- NEVER place a question on the LAST sentence (sentence ${sentenceCount})
- Space questions evenly across the passage
- Simple, discussion-friendly language. No jargon. Speak like you're a cheery person.
- NEVER mention sentence numbers in the question text (no "based on sentences 1-5")
- Even if you're asking "why" something happens, always frame your questions as one continous sentence with no commas and no use of phrases like "and how...", "and why...", "and what...", etc.
- ALWAYS end questions with a question mark (?)

POST-READING SUMMARY TASK:
Write a summary with 1-3 subtle errors that require understanding to catch. NOT simple fact-checking.

1. Write a summary of the passage (300-500 characters)
2. Include 1-3 errors that are LOGICAL INCONSISTENCIES:
   - Contradict relationships between concepts
   - Reverse cause and effect
   - Misrepresent a process or reasoning explained in the text
   - State something that conflicts with the overall logic
3. For the errors object: Copy the phrase from YOUR SUMMARY that contains the error, EXACTLY as written

The errors should NOT be simple "find the wrong word" - they should require the reader to understand the passage's logic to spot.

RESPOND ONLY WITH THIS EXACT JSON STRUCTURE:
{
  "question1": {
    "type": "while-reading",
    "sentence-number": <number between 2 and ${sentenceCount - 1}>,
    "question": "<text>"
  },
  ... (${questionCount} while-reading questions total)
  "question${questionCount + 1}": {
    "type": "post-reading",
    "summary": "<300-500 char summary with 0-3 CHANGED facts>",
    "errors": {
      "error1": "<exact wrong phrase from summary>"
    }
  }
}`;

const userPrompt = `Passage Title: ${passageTitle}

Passage (sentences numbered, total ${sentenceCount} sentences):
${numberedSentences}

Generate questions following the rules exactly. Respond with valid JSON only.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            response_format: { type: "json_object" },
        });

        const responseText = completion.choices[0].message.content;
        console.log(responseText);

        if (!responseText) {
            return NextResponse.json(
                { error: "Empty response from AI" },
                { status: 500 }
            );
        }

        const questions = JSON.parse(responseText);

        return NextResponse.json({ questions });
    } catch (error) {
        console.error("Error generating questions:", error);
        return NextResponse.json(
            { error: "Failed to generate questions" },
            { status: 500 }
        );
    }
}
