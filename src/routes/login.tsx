import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Flower2, Check, Loader2, KeyRound, Info } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · Anna SDK" },
      { name: "description", content: "Connect your Anna AI account and API key to start vibe-coding." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [googleStatus, setGoogleStatus] = useState<"idle" | "loading" | "done">("idle");
  const [apiKey, setApiKey] = useState("");
  const [keyStatus, setKeyStatus] = useState<"idle" | "loading" | "done">("idle");

  const handleGoogle = () => {
    setGoogleStatus("loading");
    setTimeout(() => {
      setGoogleStatus("done");
      setTimeout(() => navigate({ to: "/app" }), 900);
    }, 1200);
  };

  const handleConnectKey = () => {
    if (!apiKey.trim()) return;
    setKeyStatus("loading");
    setTimeout(() => setKeyStatus("done"), 800);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <Flower2 className="h-5 w-5" strokeWidth={1.5} />
          <span className="font-serif text-2xl tracking-tight">Anna SDK</span>
        </Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
      </header>

      <main className="mx-auto flex max-w-md flex-col items-center px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-[oklch(0.72_0.14_150)]" />
          Step 1 of 2
        </div>

        <h1 className="mt-6 font-serif text-5xl tracking-tight">
          Welcome, <em className="italic">vibe-coder.</em>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in and connect your Anna AI key. Everything below is a mocked hackathon demo.
        </p>

        <div className="mt-10 w-full space-y-4 text-left">
          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleStatus !== "idle"}
            className="flex w-full items-center justify-center gap-3 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium transition hover:bg-secondary disabled:opacity-80"
          >
            {googleStatus === "idle" && (
              <>
                <GoogleIcon /> Sign in with Google
              </>
            )}
            {googleStatus === "loading" && (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Authenticating…
              </>
            )}
            {googleStatus === "done" && (
              <>
                <div className="grid h-6 w-6 place-items-center rounded-full bg-[oklch(0.72_0.14_150)] font-mono text-[10px] text-foreground">
                  AV
                </div>
                Welcome, Ava · redirecting…
              </>
            )}
          </button>

          {/* <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            and
            <div className="h-px flex-1 bg-border" />
          </div> */}

          {/* API key */}
          {/* <div className="rounded-2xl border border-border bg-card p-5">
            
            <div className="mt-3 flex gap-2">
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="anna_sk_••••••••"
                className="flex-1 rounded-full border border-border bg-background px-4 py-2 font-mono text-xs outline-none focus:border-foreground"
              />
              <button
                onClick={handleConnectKey}
                disabled={keyStatus === "loading" || keyStatus === "done"}
                className={
                  "rounded-full px-4 py-2 text-xs font-medium transition " +
                  (keyStatus === "done"
                    ? "bg-[oklch(0.72_0.14_150)] text-foreground"
                    : "bg-foreground text-background hover:opacity-90")
                }
              >
                {keyStatus === "idle" && "Connect"}
                {keyStatus === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {keyStatus === "done" && (
                  <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Connected</span>
                )}
              </button>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              No key handy? Use anything — this demo is mocked.
            </p>
          </div> */}
        </div>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.56-2.77c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.45.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}