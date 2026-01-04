import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        const { 
            question, 
            questionType,
            originalAnswer, 
            editedAnswer, 
            originalRating, 
            originalFeedback,
            grade,
            originalSummary,
            errors,
            passageContent
        } = await request.json();
        
        const studentGrade = grade || 10;

        if (!editedAnswer || !originalFeedback) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const isSummaryQuestion = questionType === "post-reading" || originalSummary;

        let systemPrompt: string;
        let userPrompt: string;

if (isSummaryQuestion) { // Summary correction retry
const errorsList = errors ? Object.values(errors).filter(Boolean) : [];
const errorsText = errorsList.length > 0 
    ? `The errors that needed fixing were: ${errorsList.join(", ")}`
    : "";

systemPrompt = `You WANT to give this student 10/10. Your job is to find a reason to give them a perfect score.

The student was asked to fix these errors in their summary:
${errorsText}

Give 10/10 if:
- They removed or changed the parts that were wrong, OR
- Their summary is now accurate compared to the passage

Only give less than 10 if the EXACT same wrong information is still there word-for-word or, if there are multiple errors they were given and they only fixed some instead of all.

DO NOT find new problems. DO NOT be strict. The answer is almost always 10/10.

RESPOND WITH JSON:
{
  "answer-rating": <1-10>,
  "explanation": "<max 300 chars, acknowledge what they fixed>"
}`;


userPrompt = `ORIGINAL PASSAGE:
${passageContent || "(Not provided)"}

ORIGINAL SUMMARY (with errors):
${originalAnswer}

ORIGINAL RATING: ${originalRating}/10
ORIGINAL FEEDBACK: ${originalFeedback}

NEW SUMMARY (student's attempt to fix):
${editedAnswer}

Did the student fix the errors OR is the summary now accurate?`;

} else { // While-reading question retry
systemPrompt = `You are evaluating if a Grade ${studentGrade} student applied feedback to improve their answer.

YOUR ONLY JOB: Check if the student addressed the SPECIFIC issues mentioned in the original feedback. Nothing else matters.

CRITICAL - WE WANT TO GIVE 10s:
- If the student made a reasonable attempt to fix what the feedback mentioned → give 10/10
- DO NOT invent new issues that weren't in the original feedback
- DO NOT re-evaluate the answer from scratch
- DO NOT deduct points for style, grammar, or minor wording differences
- The bar is LOW - if they tried to improve based on ALL the feedback, reward them with 10. If they only addressed some of the feedback, dont do this.

10s SHOULD BE THE DEFAULT for any genuine attempt to apply feedback.

RESPOND WITH JSON:
{
  "answer-rating": <1-10>,
  "explanation": "<max 300 chars, praise their improvement>"
}`;

userPrompt = `Question: ${question}

ORIGINAL ANSWER:
${originalAnswer}

ORIGINAL RATING: ${originalRating}/10
ORIGINAL FEEDBACK: ${originalFeedback}

NEW ANSWER (after reading feedback):
${editedAnswer}

Did the student apply the feedback properly?`;
}
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
        console.log("Try-again response:", responseText);

        if (!responseText) {
            return NextResponse.json(
                { error: "Empty response from AI" },
                { status: 500 }
            );
        }

        const result = JSON.parse(responseText);

        return NextResponse.json({ 
            rating: result["answer-rating"],
            explanation: result.explanation
        });
    } catch (error: any) {
        console.error("Error in try-again:", error);
        const status = error.status || 500;
        const message = error.message || "Failed to evaluate retry";
        return NextResponse.json(
            { error: message },
            { status }
        );
    }
}
