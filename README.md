# AI Reading Comprehension Interface

A feature prototype developed responding to a product brief from a local EdTech startup (EdAccelerator). The primary goal was to re-imagine the reading comprehension experience for students by improving user engagement and learning outcomes. While I was given a few constraints, I had broad creative freedom to define the final product, making this project an excellent opportunity to exercise both development and product thinking.

## Getting Started

Live Demo can be found here: https://ai-comprehension.vercel.app/

To run locally, clone the repository and create a .env file in the root directory with the following variable:

```
OPENAI_API_KEY=your-key-here
```

Then run `npm install` and `npm run dev`.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **AI:** OpenAI API (Model: gpt-4o-mini)
- **Animations:** Framer Motion

## Developmental Process

Here's some sample user feedback I was given, and how I chose to address them in my implementation.
| Feedback | Solution |
|--------|----------|
| “It’s annoying seeing the entire passage all at once. Is it possible to break it apart? I know we can’t change the length of the passage.” | The normal view lets students read sentence by sentence with the current sentence being focused and the rest of the passage faded out, making it so they dont have to see the entire passage if they dont want to. |
| “Multiple choice is too easy, I can just guess the answer. Can you make it so we have to type?” | While reading, students are asked short answer questions instead of multiple choice, and then once they're done reading they are given a AI-generated summary with mistakes in it that they must correct. These question types are designed to make guessing more difficult and to test true understanding of the passage. |
| “I finish the questions and immediately forget what I read. There’s no reason to actually understand the passage.”<br> | Instead of just asking questions at the end, we ask questions WHILE they are reading the passage which helps them remember the passage better because their minds are being switched on as they are reading. The summary question at the end also forces them to actually solidify their understanding of the passage before moving on. |
| “When I get an answer wrong, I don’t really learn why. The explanation is there but I just click continue.” | The try again button on the results page allows them to correct their response and get a higher score, encouraging them to actually care about the explanation instead of just ignoring it since the explanation can get them a higher score. |
| “It feels like a test, not like learning. I dread doing these.” | The try again feature also helps with this, it makes the experience less like a test because here you can always correct your answers and actually learn from them, you're not just being graded and judged, you're being given a chance to improve your answers. |
| “Sometimes I want to go back and re-read a specific part but I can’t find it quickly.” | There's a find/search feature that allows users to search for specific words or phrases, making it easier to find specific parts of the passage. |
| “My younger brother uses the app too and he’s way slower at reading. The same interface doesn’t work for both of us.” | The interface is dynamic, with options for a Full View which lets users read the entire passage at once instead of the slower normal view. There's also reading mode for users who'd prefer to just read through the text fully first before being evaluated on it. Furthermore, being able to choose your grade makes it so student get questions adjusted to the difficulty that fits them. |

### AI Engineering Approach

Before I implemented any API calls, I used src\data\check.json and src\data\check2.json to mock AI responses which let me test the UI AND test the best format for those AI responses without wasting API calls.

Once that was fine, I had to implement the actual AI API, where I had to vigourously refine the system prompts for each API call to get the best possible responses. I also had to pick the right GPT model to use, something that was efficient in both quality and cost. Initially I went with GPT-4.1 nano but it was not generating responses at the level I wanted, so I switched to GPT-4o mini which is known to be more capable in deep reasoning and nuanced tasks.

The AI is used for three API calls across the app:

1. Generating questions + summary (this happens when the user first selects the passage from the main menu, and the questions for that grade level are then cached to localStorage)
2. Grading the user's answers (this call occurs when user presses submit on the Summary Correction, and it grades both the summary correction and while-reading questions at once.)
3. Re-grading one specific answer based on if the feedback was applied or not (used for the Try Again feature on the results page, lets users improve and rescore their answers.)

### Project Timeline (Total: 15 hours)

I was originally given 4 days to complete this prototype, here's a breakdown of the time spent:

- **Day 1 (3h):** Project setup and building the core sentence-by-sentence reader.
- **Day 2 (4h):** Built out the short answer UI, the summary task, and the results logic.
- **Day 3 (3h):** Integrated the OpenAI API and spent a lot of time testing/refining the prompts.
- **Day 4 (5h):** Added accessibility features (Full View, Grade Selection, Search) and the "Try Again" loop on the results page.
