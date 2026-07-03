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
  open_youtube: "Open YouTube",
  open_google: "Open Google",
  open_github: "Open GitHub",
  open_chatgpt: "Open ChatGPT",
};

const websiteMap: Record<string, string> = {
  open_youtube: "https://www.youtube.com",
  open_google: "https://www.google.com",
  open_github: "https://github.com",
  open_chatgpt: "https://chat.openai.com",
};

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
    if (websiteMap[predicted]) {
      setMessage(`Opening ${commandMap[predicted] || predicted}...`);
      openInNewTab(websiteMap[predicted]);
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
          "Available commands: open dashboard, open projects, open notes, open youtube, open google, open github, open chatgpt, search, clear screen, help."
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
    <main className="min-h-screen bg-[#0b1020] text-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-300">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Voice Command ML System</h1>
              <p className="mt-2 text-white/70">
                Browser speech recognition + Python ML intent classification + Vercel deployment.
              </p>
            </div>
          </div>

          <button
            onClick={startListening}
            disabled={listening || loading}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-6 py-3 font-semibold text-black transition hover:bg-cyan-300 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
            {listening ? "Listening..." : loading ? "Processing..." : "Start Voice Command"}
          </button>

          <p className="mt-4 text-sm text-white/70">{message}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Transcript</h2>
            <p className="mt-3 text-white/80">{transcript || "No speech captured yet."}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Predicted Intent</h2>
            <p className="mt-3 text-cyan-300">
              {intent ? commandMap[intent] || intent : "No prediction yet."}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Confidence</h2>
            <p className="mt-3 text-white/80">
              {confidence !== null ? `${(confidence * 100).toFixed(2)}%` : "Not available"}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}