# Voice Command ML

A browser-based voice assistant that listens to spoken commands, classifies the intent using a custom-trained machine learning model, and performs the corresponding action — whether that's navigating the app's own pages or opening an external website like YouTube, Gemini, GitHub, or ChatGPT.

## How it works

1. **Speech capture** — the browser's built-in Web Speech API (`SpeechRecognition`) converts your voice into text. No audio is sent anywhere; only the resulting text is processed.
2. **Intent classification** — the transcribed text is sent to a Python/FastAPI backend, where a TF-IDF + Logistic Regression model (trained with scikit-learn) predicts which intent the command matches.
3. **Action execution** — the frontend maps the predicted intent to an action:
   - App-internal intents (`open_dashboard`, `open_projects`, `open_notes`, `search`, `clear`, `help`) drive in-app behavior.
   - The generic `open_website` intent extracts the site name from the spoken phrase (e.g. "open gemini" → `gemini`) and opens the matching URL in a new tab. Unrecognized site names fall back to a Google search instead of failing silently.

## Tech stack

- **Frontend:** Next.js (App Router), React, TypeScript, plain CSS
- **Speech input:** Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`)
- **ML backend:** Python, FastAPI, scikit-learn, joblib
- **Deployment:** Vercel (Next.js frontend + Python serverless function for the API)

## Project structure

```
├── api/
│   └── predict.py          # FastAPI app: loads the trained model and serves predictions
├── dataset/
│   └── commands.csv        # Training data: (text, intent) pairs
├── model/
│   ├── train_model.py      # Trains the TF-IDF + Logistic Regression classifier
│   └── saved/               # Saved model, label encoder, and metadata (generated)
├── src/
│   ├── app/                 # Next.js app router pages and global styles
│   ├── components/
│   │   └── VoiceApp.tsx     # Main voice UI: mic control, prediction handling, action routing
│   └── lib/
│       └── speech.ts        # Web Speech API wrapper
├── requirements.txt          # Python dependencies for the API
├── vercel.json                # Vercel function configuration
└── package.json
```

## Supported commands

| Say something like...                  | Intent           | Result                                  |
|-----------------------------------------|-------------------|------------------------------------------|
| "open dashboard"                        | `open_dashboard`  | Navigates to the dashboard section       |
| "open projects" / "show projects"       | `open_projects`   | Navigates to the projects section        |
| "open notes"                            | `open_notes`      | Navigates to the notes section           |
| "search react" / "find python notes"    | `search`          | Triggers a search with the spoken query  |
| "clear screen" / "reset everything"     | `clear`           | Clears the transcript and prediction     |
| "help" / "what can I say"               | `help`            | Lists available commands                 |
| "open youtube" / "open gemini" / "open \<any site\>" | `open_website` | Opens the matching website in a new tab, or searches for it if unrecognized |

## Running locally

**1. Backend (FastAPI + ML model)**

From the project root:

```bash
pip install -r requirements.txt
python model/train_model.py      # trains the model and saves it to model/saved/
uvicorn api.predict:app --reload
```

The API will be available at `https://voice-command-amber.vercel.app/`.

**2. Frontend (Next.js)**

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, click **Start Voice Command**, and allow microphone access (Chrome/Edge recommended — Web Speech API support varies by browser).

## Deployment (Vercel)

The frontend deploys as a standard Next.js app. The FastAPI backend in `api/predict.py` deploys automatically as a Python serverless function, reachable at `/api/predict` in production — no separate hosting needed. `vercel.json` configures the function's max duration; the Python runtime itself is auto-detected by Vercel from `requirements.txt` and the `api/` directory.

## Retraining / extending

To teach the model new app-specific intents, add more rows to `dataset/commands.csv` and rerun `python model/train_model.py`. To support more websites without retraining, just add new entries to the `siteAliases` map in `src/components/VoiceApp.tsx` — the model already generalizes the "open a website" pattern to unseen site names, so only the URL lookup needs updating.

## Known limitations

- Speech recognition relies on the browser's Web Speech API, which currently has the best support in Chrome and Edge.
- The dataset is small (a few hundred examples), so accuracy on very unusual phrasings may vary — extending `dataset/commands.csv` improves this over time.
