import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare, Sparkles, Eye, Download, Flower2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Anna SDK — Vibe-code React apps by chat" },
      { name: "description", content: "Anna SDK lets you scaffold tiny vanilla HTML + JavaScript websites by chatting with an AI agent. Built on Anna AI Executa tools." },
    ],
  }),
  component: Landing,
});

function NavBar() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
      <Link to="/" className="flex items-center gap-2">
        <Flower2 className="h-5 w-5 text-foreground" strokeWidth={1.5} />
        <span className="font-serif text-2xl tracking-tight">Anna SDK</span>
      </Link>
      <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
        <a href="#how" className="hover:text-foreground">How it works</a>
        <a href="#features" className="hover:text-foreground">Features</a>
        <a href="#hackathon" className="hover:text-foreground">Hackathon</a>
        <a href="https://anna.partners" className="hover:text-foreground">Anna AI</a>
      </nav>
      <div className="flex items-center gap-3">
        <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Login</Link>
        <Link
          to="/login"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Get Started
        </Link>
      </div>
    </header>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />

      <main className="mx-auto max-w-6xl px-6">
        {/* Hero */}
        <section className="pt-12 pb-20 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs">
            <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-background">
              New
            </span>
            <span className="text-muted-foreground">Anna SDK × Hackathon Edition</span>
          </div>

          <h1 className="mx-auto mt-8 max-w-3xl font-serif text-6xl leading-[1.05] tracking-tight md:text-7xl">
            Meet Anna SDK, your <em className="italic">vibe-coding partner.</em>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground">
            Anna SDK is a developer tool that scaffolds tiny React + Vite websites
            through a chat with an AI agent. Describe what you want, watch it build,
            preview it live, and export the zip.
          </p>

          <div className="mt-8 flex items-center justify-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90"
            >
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[oklch(0.72_0.14_150)]">
                <MessageSquare className="h-3 w-3 text-foreground" />
              </span>
              Get Started
            </Link>
          </div>

          {/* Mock device */}
          <div className="relative mx-auto mt-16 w-full max-w-md">
            <div className="absolute -left-10 top-10 text-3xl opacity-30">✿</div>
            <div className="absolute -right-10 top-20 text-3xl opacity-30">✿</div>
            <div className="rounded-[40px] border border-border bg-card p-3 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)]">
              <div className="rounded-[32px] bg-background p-6">
                <div className="mb-4 flex items-center justify-between text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Flower2 className="h-3 w-3" strokeWidth={1.5} />
                    <span className="font-serif text-sm text-foreground">Anna SDK</span>
                  </div>
                  <div className="h-4 w-16 rounded-full bg-foreground" />
                  <div className="flex gap-3">
                    <span>Chat</span>
                    <span>Files</span>
                  </div>
                </div>
                <h3 className="text-center font-serif text-2xl">Your code, vibed.</h3>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { i: "📄", t: "Scaffold Project" },
                    { i: "🛠", t: "Edit Files" },
                    { i: "🛡", t: "Export Safely" },
                  ].map((c) => (
                    <div key={c.t} className="rounded-xl border border-border bg-card p-2 text-center">
                      <div className="mb-1 text-lg">{c.i}</div>
                      <div className="text-[9px] leading-tight text-muted-foreground">{c.t}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-xl border border-border bg-card p-3">
                  <div className="mb-2 h-2 w-1/2 rounded bg-muted" />
                  <div className="flex gap-2">
                    <div className="h-12 flex-1 rounded bg-muted" />
                    <div className="h-12 flex-1 rounded bg-muted" />
                  </div>
                </div>
                <div className="mt-4 flex justify-center">
                  <div className="rounded-full bg-foreground px-3 py-1 text-[10px] text-background">
                    /vibe a portfolio site
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="py-20">
          <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">How it works</p>
          <h2 className="mx-auto mt-4 max-w-2xl text-center font-serif text-4xl tracking-tight md:text-5xl">
            Three steps from <em className="italic">prompt to project.</em>
          </h2>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                n: "01",
                icon: MessageSquare,
                t: "Describe",
                d: "Open the chat and type /vibe followed by what you want. A landing page, a portfolio, a tiny tool.",
              },
              {
                n: "02",
                icon: Sparkles,
                t: "Generate",
                d: "Anna's Executa tools scaffold a real vanilla HTML + JavaScript project with a fixed, predictable file structure.",
              },
              {
                n: "03",
                icon: Eye,
                t: "Preview & Export",
                d: "Inspect every file, see a live preview, then download a ready-to-run zip of your project.",
              },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{s.n}</span>
                  <s.icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <h3 className="mt-6 font-serif text-2xl">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features strip */}
        <section id="features" className="py-20">
          <div className="rounded-3xl border border-border bg-card p-10 text-center">
            <h2 className="mx-auto max-w-2xl font-serif text-4xl tracking-tight">
              Built on <em className="italic">Anna AI Executa</em> tool calls.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
              Every scaffold, edit, and export runs as a transparent tool call you can
              watch in the chat — read_file, edit_file, generate_project, and more.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {["generate_project()", "read_file()", "edit_file()", "export_zip()"].map((t) => (
                <code key={t} className="rounded-full border border-border bg-background px-3 py-1 font-mono text-xs">
                  {t}
                </code>
              ))}
            </div>
            <div className="mt-8">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm text-background hover:opacity-90"
              >
                <Download className="h-4 w-4" /> Try Anna SDK
              </Link>
            </div>
          </div>
        </section>

        <footer id="hackathon" className="border-t border-border py-10 text-center text-xs text-muted-foreground">
          Built for the Anna AI Hackathon · Powered by Executa Tools
        </footer>
      </main>
    </div>
  );
}
