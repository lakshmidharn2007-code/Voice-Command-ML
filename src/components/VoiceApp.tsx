"use client";

import { useState } from "react";
import { Mic, Loader2, Sparkles } from "lucide-react";
import { getRecognition } from "@/lib/speech";

type PredictionResponse = {
  success: boolean;
  input_text?: string;
  predicted_intent?: string;
  confidence?: number | null;
  error?: string;
};

const commandMap: Record<string, string> = {
  open_dashboard: "Open Dashboard",
  open_projects: "Open Projects",
  open_notes: "Open Notes",
  search: "Search",
  clear: "Clear Screen",
  help: "Help",
  open_website: "Open Website",
};

// Known aliases -> real URLs. Add more any time without retraining the model.
const siteAliases: Record<string, string> = {
  youtube: "https://www.youtube.com",
  "you tube": "https://www.youtube.com",
  google: "https://www.google.com",
  gemini: "https://gemini.google.com",
  chatgpt: "https://chat.openai.com",
  "chat gpt": "https://chat.openai.com",
  gpt: "https://chat.openai.com",
  github: "https://github.com",
  "git hub": "https://github.com",
  gmail: "https://mail.google.com",
  "google mail": "https://mail.google.com",
  maps: "https://maps.google.com",
  "google maps": "https://maps.google.com",
  drive: "https://drive.google.com",
  "google drive": "https://drive.google.com",
  calendar: "https://calendar.google.com",
  "google calendar": "https://calendar.google.com",
  netflix: "https://www.netflix.com",
  spotify: "https://open.spotify.com",
  amazon: "https://www.amazon.com",
  instagram: "https://www.instagram.com",
  facebook: "https://www.facebook.com",
  twitter: "https://twitter.com",
  x: "https://x.com",
  whatsapp: "https://web.whatsapp.com",
  reddit: "https://www.reddit.com",
  wikipedia: "https://www.wikipedia.org",
  linkedin: "https://www.linkedin.com",
  outlook: "https://outlook.com",
  bing: "https://www.bing.com",
  duckduckgo: "https://duckduckgo.com",
};

// Strips filler words around the site name, e.g. "please go to the youtube website" -> "youtube"
function extractSiteName(spokenText: string): string {
  let t = spokenText.toLowerCase().trim();

  const leadPatterns = [
    /^i want to open /, /^i want /,
    /^open the /, /^open my /, /^open /,
    /^go to /, /^take me to /, /^navigate to /,
    /^switch to /, /^bring up /, /^pull up /,
    /^show me /, /^show /, /^display /,
    /^launch /, /^start /, /^play /,
  ];
  for (const p of leadPatterns) t = t.replace(p, "");

  t = t
    .replace(/ website$/, "")
    .replace(/ please$/, "")
    .replace(/ page$/, "")
    .trim();

  return t;
}

// Resolves a spoken site name to a URL. Falls back to a Google search
// for anything not in the known alias list, so it never just does nothing.
function resolveWebsiteUrl(spokenText: string): { url: string; label: string } {
  const siteName = extractSiteName(spokenText);

  if (siteAliases[siteName]) {
    return { url: siteAliases[siteName], label: siteName };
  }

  // Fuzzy fallback: check if any known alias is contained in the phrase
  for (const key of Object.keys(siteAliases)) {
    if (siteName.includes(key)) {
      return { url: siteAliases[key], label: key };
    }
  }

  // Unknown site: don't fail silently, search for it instead
  const query = encodeURIComponent(siteName || spokenText);
  return {
    url: `https://www.google.com/search?q=${query}`,
    label: siteName || spokenText,
  };
}

export default function VoiceApp() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [intent, setIntent] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Click the mic and speak a command.");

  const openInNewTab = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const runIntentAction = (predicted: string, spokenText: string) => {
    if (predicted === "open_website") {
      const { url, label } = resolveWebsiteUrl(spokenText);
      setMessage(`Opening ${label}...`);
      openInNewTab(url);
      return;
    }

    switch (predicted) {
      case "clear":
        setTranscript("");
        setIntent("");
        setConfidence(null);
        setMessage("Screen cleared.");
        break;

      case "help":
        setMessage(
          "Available commands: open dashboard, open projects, open notes, search, clear screen, help, or say \"open <any website>\" (e.g. open gemini, open netflix)."
        );
        break;

      case "search":
        setMessage(`Search command detected: "${spokenText}"`);
        break;

      default:
        setMessage("Prediction complete.");
        break;
    }
  };

  const startListening = () => {
    const Recognition = getRecognition();

    if (!Recognition) {
      setMessage("Speech recognition is not supported in this browser. Use Chrome.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      setListening(true);
      setMessage("Listening...");
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = (event: any) => {
      setListening(false);
      setLoading(false);
      setMessage(`Speech recognition error: ${event?.error || "unknown"}`);
    };

    recognition.onresult = async (event: any) => {
      const spokenText = event.results[0][0].transcript;
      setTranscript(spokenText);
      setLoading(true);
      setMessage("Predicting intent...");

      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL ||
          (process.env.NODE_ENV === "production" ? "/api/predict" : "http://127.0.0.1:8000/");

        const res = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: spokenText }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data: PredictionResponse = await res.json();
        console.log("API response:", data);

        if (data.success) {
          const predicted = data.predicted_intent?.trim() || "";
          const conf = data.confidence ?? null;

          if (!predicted || conf === null || conf < 0.25) {
            setIntent("");
            setConfidence(conf);
            setMessage("Unknown or low-confidence command.");
          } else {
            setIntent(predicted);
            setConfidence(conf);
            setMessage("Prediction complete.");
            runIntentAction(predicted, spokenText);
          }
        } else {
          setIntent("");
          setConfidence(null);
          setMessage(data.error || "Prediction failed.");
        }
      } catch (error) {
        console.error("API request error:", error);
        setIntent("");
        setConfidence(null);
        setMessage("API request failed.");
      } finally {
        setLoading(false);
      }
    };

    recognition.start();
  };

  return (
    <main className="page-wrap">
      <div className="container">
        <div className="hero-card">
          <div className="hero-header">
            <div className="hero-icon">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="hero-title">Voice Command ML System</h1>
              <p className="hero-subtitle">
                Browser speech recognition + Python ML intent classification + Vercel deployment.
              </p>
            </div>
          </div>

          <button
            onClick={startListening}
            disabled={listening || loading}
            className={`mic-button${listening ? " listening" : ""}`}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 spin" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
            {listening ? "Listening..." : loading ? "Processing..." : "Start Voice Command"}
          </button>

          <p className="status-message">{message}</p>
        </div>

        <div className="info-grid">
          <div className="info-card">
            <h2>Transcript</h2>
            <p className={transcript ? "" : "placeholder"}>
              {transcript || "No speech captured yet."}
            </p>
          </div>

          <div className="info-card intent">
            <h2>Predicted Intent</h2>
            <p>{intent ? commandMap[intent] || intent : "No prediction yet."}</p>
          </div>

          <div className="info-card">
            <h2>Confidence</h2>
            <p className={confidence !== null ? "" : "placeholder"}>
              {confidence !== null ? `${(confidence * 100).toFixed(2)}%` : "Not available"}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}