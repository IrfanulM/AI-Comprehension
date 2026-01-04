# AI Reading Comprehension Interface
An app built to help students at EdAccelerator with their reading comprehension skills. The primary goal was to encourage user engagement and improve learning outcomes.

## Getting Started
Live Demo can be found here: https://ai-comprehension.vercel.app/

Otherwise, clone the repo to your local dekstop and create a .env file in the root directory with the following variable:
```
OPENAI_API_KEY=your-key-here
```
Then run `npm install` and `npm run dev`.

## Tech Stack
- Next.js
- TypeScript
- Tailwind CSS
- OpenAI API (Model: gpt-4o-mini)
- Framer Motion

## Developmental Process
Here's the feedback from users and how I addressed them:
| Feedback | Solution |
|--------|----------|
| “It’s annoying seeing the entire passage all at once. Is it possible to break it apart? I know we can’t change the length of the passage.” | The normal view lets students read sentence by sentence with the current sentence being focused and the rest of the passage faded out, making it so they dont have to see the entire passage if they dont want to. |
| “Multiple choice is too easy, I can just guess the answer. Can you make it so we have to type?” | While reading, students are asked short answer questions instead of multiple choice, and then once they're done reading they are given a AI-generated summary with mistakes in it that they must correct. These question types are designed to make guessing more difficult and to test true understanding of the passage. |
| “I finish the questions and immediately forget what I read. There’s no reason to actually understand the passage.”<br> | Instead of just asking questions at the end, we ask questions WHILE they are reading the passage which helps them remember the passage better because their minds are being switched on as they are reading. The summary question at the end also forces them to actually solidify their understanding of the passage before moving on. |
| “When I get an answer wrong, I don’t really learn why. The explanation is there but I just click continue.” | The try again button on the results page allows them to correct their response and get a higher score, encouraging them to actually care about the explanation instead of just ignoring it since the explanation can get them a higher score. |
| “It feels like a test, not like learning. I dread doing these.” | The try again feature also helps with this, it makes the experience less like a test because here you can always correct your answers and actually learn from them, you're not just being graded and judged, you're being given a chance to improve your answers. |
| “Sometimes I want to go back and re-read a specific part but I can’t find it quickly.” | There's a find/search feature that allows users to search for specific words or phrases, making it easier to find specific parts of the passage. |
| “My younger brother uses the app too and he’s way slower at reading. The same interface doesn’t work for both of us.” | The interface is dynamic, with options for a Full View which lets users read the entire passage at once instead of the slower normal view. There's also reading mode for users who'd prefer to just read through the text fully first before being evaluated on it. Furthermore, being able to choose your grade makes it so student get questions adjusted to the difficulty that fits them. |

### AI Generation Approach
Before I implemented any API calls, I used src\data\check.json and src\data\check2.json to mock AI responses which let me test the UI AND test the best format for those AI responses without wasting API calls.

Once that was fine, I had to implement the actual AI API, where I had to vigourously refine the system prompts for each API call to get the best possible responses. I also had to pick the right GPT model to use, something that was efficient both quality and cost. Initially I went with GPT-4.1 nano but it was not generating responses at the level I wanted, so I switched to GPT-4o mini which is known to be more capable in deep reasoning and nuanched tasks.

The AI is used for three API calls across the app:
1. Generating questions + summary (this happens when the user first selects the passage from the main menu, and the questions for that grade level are then cached to localStorage)
2. Grading the user's answers (this call occurs when user presses submit on the Summary Correction, and it grades both the summary correction and while-reading questions at once.)
3. Re-grading one specific answer based on if the feedback was applied or not (used for the Try Again feature on the results page, lets users improve and rescore their answers.)

### Key Decisions & Improvements
| Decision | Rationale |
|----------|-----------|
| **LocalStorage caching** | Caches generated questions, user responses and AI gradings to prevent excess API calls and improve performance. |
| **Batch grading and question generation** | Generates summary and while-reading questions together in one API calls, and grades all of them in another API call. This makes it so from the basic minimum user flow, only two API calls should occur (if the user decides to rewrite their answers, of course this would be exceeded.) |
| **State machine architecture** | App flows through discrete states (menu → reading → post-reading → results) with clear transitions, making the UX predictable and the code maintainable. |
| **Minimalistic UI** | I aimed to make the UI simple and modern to make it easy to use and navigate + put more focus on the actual content of the passage. Fonts were based off fonts used on EdAccelerator's official website (https://www.edaccelerator.com/) |

### Time Spent
- January 1st: 3 hours
    - Set up project structure
    - Planning for the app
    - Finish the basic passage reading interface
- January 2nd: 4 hours
    - Create short answer + summary question UI with mocked API responses from json files
    - Results page and final grade handling
- January 3rd: 3 hours
    - Implementing AI API calls, replacing mocked responses
    - Refining planned prompts thoroughly to get good responses
- January 4th: 5 hours
    - Settings and acessibility features: Full View, Reading Mode, Grade Selection, Find/Search, Restart Reading
    - Edge case handling and input validation
    - Try Again feature with API call on results page
    - Spent a bunch of time refining AI prompts to get even better responses
    - Documentation
    - Deployment!

**Total:** 15 hours

### Future Improvements
Possible improvements I thought of that I'd love to implement:
- More gamification features like badges and retained points from readings that can be exchanged for rewards.
- A lively Book mascot that is shown on all the question and summary tooltips, as if the mascot is the one asking the user questions.
- This one more so works for fictional stories but it could also work for passages like our example passage, basically instead of only showing a final score, maybe a show a 'personality type' too like one of those personality quizzes online, where the AI can analyze the user's answers based on their tone and tell them what character from the story they are most like (eg. "I can tell you've put effort into your responses, you must be like the Worker Bee!").