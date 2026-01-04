import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

interface QuestionAnswer {
    question: string;
    answer: string;
}

export async function POST(request: NextRequest) {
    try {
        const { passageContent, questions, answers, correctedSummary, grade } = await request.json();
        const studentGrade = grade || 10;

        if (!passageContent || !questions || !answers) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Build the question-answer pairs for the prompt with their keys
        interface KeyedQA {
            key: string;
            question: string;
            answer: string;
            sentenceNumber?: number;
        }
        const questionAnswerPairs: KeyedQA[] = [];
        const questionKeys = Object.keys(questions).filter(
            (key) => questions[key].type === "while-reading"
        );

        questionKeys.forEach((key) => {
            questionAnswerPairs.push({
                key,
                question: questions[key].question,
                answer: answers[key] || "(No answer provided)",
                sentenceNumber: questions[key]["sentence-number"],
            });
        });

        // Find the post-reading question
        const postReadingKey = Object.keys(questions).find(
            (key) => questions[key].type === "post-reading" || questions[key].summary
        );

const systemPrompt = `You are an encouraging reading comprehension grader for Grade ${studentGrade} students.

GRADING PHILOSOPHY:
- This student is in Grade ${studentGrade}. Adjust your expectations, vocabulary complexity, and feedback tone to be appropriate for this level.
- Be generous and encouraging to motivate students
- 10s are absolutely acceptable for good answers, they dont have to absolutely perfect to get a 10. Feel free to give out 10s.
- Scores below 5 should be RARE (only for completely wrong answers)
- 10s should be more common than 9s or even 8s, we WANT to give out 10s.
- NEVER deduct points for writing style, grammar, or flow. If they understood the content, give a 10. You are not grading writing style, you're grading reading comprehension.

RUBRIC:
- 9-10: Strong understanding, good reasoning
- 7-8: Solid answer, minor gaps
- 5-6: Partial understanding, needs more depth
- 1-4: RARE - fundamentally misunderstands (use sparingly)
- 0: Student did not attempt to answer or gibberish.

FEEDBACK:
- Maximum 300 characters per explanation
- Always start with what they did well
- Gently suggest improvements (only if they actually missed a fact)
- Be specific and constructive
- DO NOT suggest "improving style", "flow", or "conciseness".

CRITICAL FOR WHILE-READING QUESTIONS:
- Each question includes a "sentence-number" showing where it was asked
- The student had ONLY read up to that sentence when answering
- DO NOT penalize them for not mentioning information from later sentences
- Only grade based on what they could have known at that point in the text

CRITICAL FOR SUMMARY QUESTIONS:
- The student was given a list of INCORRECT phrases they must fix
- To get a 10/10, the student MUST fix ALL the listed errors, not just some of them
- If they fixed 2 out of 3 errors, that's 7-8/10. If they fixed 1 out of 2 errors, that's 5-6/10
- Check EACH error in the list - was it corrected? Count how many they fixed vs how many were listed
- Any phrase NOT in the error list is CORRECT - never penalize for those
- DO NOT give 10 unless EVERY error has been addressed

RESPOND WITH JSON using the EXACT keys provided for each question.`;

let qaText = questionAnswerPairs
    .map((qa) => `Key: "${qa.key}"\nSentence-number: ${qa.sentenceNumber} (student had only read up to this sentence)\nQuestion: ${qa.question}\nStudent Answer: ${qa.answer}`)
    .join("\n\n");

if (postReadingKey) {
    const errorsInSummary = questions[postReadingKey].errors || {};
    const errorsList = Object.values(errorsInSummary).filter(Boolean);
    const errorsText = errorsList.length > 0 
        ? `\nThe following phrases in the summary are INCORRECT: ${errorsList.join(", ")}`
        : "\nThe summary contains errors (not explicitly listed).";
    
    qaText += `\n\nKey: "${postReadingKey}"\nSummary Correction Task:\nOriginal summary: ${questions[postReadingKey].summary}${errorsText}\nStudent's corrected summary: ${correctedSummary || "(No corrections submitted)"}\n\nThe student should have identified and fixed the incorrect phrases listed above.`;
}

const userPrompt = `Passage:
${passageContent}

Questions and Answers:
${qaText}

Grade each response. Use the exact "Key" values as the JSON keys in your response. Format:
{
    "<key>": {
    "question": "<original question text OR 'Summary Correction'>",
    "answer-rating": <1-10>,
    "explanation": "<max 300 chars feedback>"
  },
  ...
}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.5,
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

        const results = JSON.parse(responseText);

        return NextResponse.json({ results });
    } catch (error: any) {
        console.error("Error grading answers:", error);
        const status = error.status || 500;
        const message = error.message || "Failed to grade answers";
        return NextResponse.json(
            { error: message },
            { status }
        );
    }
}
