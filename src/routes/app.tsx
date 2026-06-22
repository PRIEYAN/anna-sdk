import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Flower2, Download, Github, Send, FileCode, Folder, FolderOpen,
  Eye, Code2, ChevronRight, Sparkles, Terminal,
} from "lucide-react";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Build · Anna SDK" },
      { name: "description", content: "Chat with Anna to vibe-code a tiny React + Vite project." },
    ],
  }),
  component: BuildApp,
});

type ChatMsg =
  | { id: string; type: "user"; text: string }
  | { id: string; type: "assistant"; text: string }
  | { id: string; type: "tool"; text: string };

type FileNode = {
  name: string;
  path: string;
  children?: FileNode[];
};

const FILE_TREE: FileNode = {
  name: "vibe-project", path: "", children: [
    { name: "index.html", path: "index.html" },
    { name: "package.json", path: "package.json" },
    { name: "package-lock.json", path: "package-lock.json" },
    { name: ".gitignore", path: ".gitignore" },
    { name: "public", path: "public", children: [
      { name: "favicon.svg", path: "public/favicon.svg" },
      { name: "icons.svg", path: "public/icons.svg" },
    ]},
    { name: "src", path: "src", children: [
      { name: "main.jsx", path: "src/main.jsx" },
      { name: "App.jsx", path: "src/App.jsx" },
      { name: "style.css", path: "src/style.css" },
      { name: "assets", path: "src/assets", children: [
        { name: "hero.png", path: "src/assets/hero.png" },
      ]},
      { name: "screens", path: "src/screens", children: [
        { name: "Home.jsx", path: "src/screens/Home.jsx" },
      ]},
    ]},
  ],
};

const FILE_CONTENT_V1: Record<string, string> = {
  "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vibe Project</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,
  "package.json": `{
  "name": "vibe-project",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0"
  }
}`,
  "package-lock.json": `{
  "name": "vibe-project",
  "version": "0.0.1",
  "lockfileVersion": 3,
  "requires": true,
  "packages": { "": { "name": "vibe-project", "version": "0.0.1" } }
}`,
  ".gitignore": `node_modules
dist
.DS_Store
.env`,
  "public/favicon.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="14" fill="#1a1a1a"/>
  <text x="16" y="21" text-anchor="middle" fill="#fff" font-size="14">✿</text>
</svg>`,
  "public/icons.svg": `<svg xmlns="http://www.w3.org/2000/svg">
  <symbol id="arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>
</svg>`,
  "src/main.jsx": `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./style.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
  "src/App.jsx": `import Home from "./screens/Home.jsx";

export default function App() {
  return <Home />;
}`,
  "src/style.css": `:root { color-scheme: light; }
body {
  margin: 0;
  font-family: ui-sans-serif, system-ui, sans-serif;
  background: #faf8f3;
  color: #1a1a1a;
}
.btn {
  background: #1a1a1a;
  color: #fff;
  padding: 10px 18px;
  border-radius: 999px;
  border: 0;
  cursor: pointer;
}`,
  "src/assets/hero.png": `[binary asset — 24kb PNG placeholder]`,
  "src/screens/Home.jsx": `import hero from "../assets/hero.png";

export default function Home() {
  return (
    <main style={{ textAlign: "center", padding: "80px 20px" }}>
      <h1 style={{ fontSize: 56, margin: 0 }}>Hello, vibe.</h1>
      <p style={{ color: "#666", marginTop: 12 }}>
        A tiny site, scaffolded by Anna SDK.
      </p>
      <button className="btn" style={{ marginTop: 24 }}>
        Get Started
      </button>
      <img src={hero} alt="hero" style={{ marginTop: 40, maxWidth: 320 }} />
    </main>
  );
}`,
};

const FILE_CONTENT_V2: Record<string, string> = {
  ...FILE_CONTENT_V1,
  "src/style.css": FILE_CONTENT_V1["src/style.css"].replace("#1a1a1a;\n  color: #fff;", "#2b6cff;\n  color: #fff;"),
  "src/screens/Home.jsx": `import hero from "../assets/hero.png";

export default function Home() {
  return (
    <main style={{ textAlign: "center", padding: "80px 20px" }}>
      <h1 style={{ fontSize: 56, margin: 0 }}>Hello, vibe.</h1>
      <p style={{ color: "#666", marginTop: 12 }}>
        A tiny site, scaffolded by Anna SDK.
      </p>
      <button className="btn" style={{ marginTop: 24, background: "#2b6cff" }}>
        Get Started
      </button>
      <img src={hero} alt="hero" style={{ marginTop: 40, maxWidth: 320 }} />
    </main>
  );
}`,
};

function BuildApp() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "m0",
      type: "assistant",
      text: "Hi, I'm Anna. Type /vibe followed by a description to scaffold a tiny React + Vite project. e.g. /vibe a portfolio site for a ceramic artist.",
    },
  ]);
  const [input, setInput] = useState("");
  const [hasProject, setHasProject] = useState(false);
  const [projectVersion, setProjectVersion] = useState<1 | 2>(1);
  const [selectedFile, setSelectedFile] = useState<string>("src/screens/Home.jsx");
  const [rightTab, setRightTab] = useState<"code" | "preview">("code");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const files = projectVersion === 1 ? FILE_CONTENT_V1 : FILE_CONTENT_V2;

  const showToast = (t: string, hold = 1800) => {
    setToast(t);
    setTimeout(() => setToast(null), hold);
  };

  const pushMsg = (m: ChatMsg) => setMessages((prev) => [...prev, m]);
  const pushDelay = (m: ChatMsg, delay: number) =>
    new Promise<void>((resolve) =>
      setTimeout(() => {
        pushMsg(m);
        resolve();
      }, delay)
    );

  const handleSend = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    pushMsg({ id: `u-${Date.now()}`, type: "user", text });

    if (text.startsWith("/vibe")) {
      const desc = text.replace("/vibe", "").trim() || "a tiny landing page";
      await pushDelay({ id: `t1-${Date.now()}`, type: "tool", text: `→ generate_project({ idea: "${desc}" })` }, 500);
      await pushDelay({ id: `t2-${Date.now()}`, type: "tool", text: "  Scaffolding Vite + React project…" }, 700);
      await pushDelay({ id: `t3-${Date.now()}`, type: "tool", text: "  Writing src/main.jsx" }, 500);
      await pushDelay({ id: `t4-${Date.now()}`, type: "tool", text: "  Writing src/App.jsx" }, 400);
      await pushDelay({ id: `t5-${Date.now()}`, type: "tool", text: "  Writing src/screens/Home.jsx" }, 400);
      await pushDelay({ id: `t6-${Date.now()}`, type: "tool", text: "✓ Tool finished. Project ready." }, 600);
      await pushDelay({
        id: `a-${Date.now()}`, type: "assistant",
        text: "Done. Your project is in the right panel. Click any file to read it, or hit Preview to see the result. Ask me for tweaks like \"make the button blue\".",
      }, 400);
      setHasProject(true);
      setProjectVersion(1);
      setSelectedFile("src/screens/Home.jsx");
    } else if (hasProject) {
      const target = "src/screens/Home.jsx";
      await pushDelay({ id: `t1-${Date.now()}`, type: "tool", text: `→ read_file("${target}")` }, 400);
      await pushDelay({ id: `t2-${Date.now()}`, type: "tool", text: `→ edit_file("${target}")` }, 700);
      await pushDelay({ id: `t3-${Date.now()}`, type: "tool", text: "✓ File updated." }, 500);
      await pushDelay({
        id: `a-${Date.now()}`, type: "assistant",
        text: "Applied your change. Check the Preview tab — the button has a fresh vibe.",
      }, 400);
      setProjectVersion(2);
      setSelectedFile(target);
      setRightTab("preview");
    } else {
      await pushDelay({
        id: `a-${Date.now()}`, type: "assistant",
        text: "Start with /vibe to scaffold a project first. e.g. /vibe a coffee shop landing page.",
      }, 500);
    }
    setBusy(false);
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card/60 px-6 py-3">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <Flower2 className="h-5 w-5" strokeWidth={1.5} />
            <span className="font-serif text-xl">Anna SDK</span>
          </Link>
          <div className="hidden items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-[11px] text-muted-foreground md:flex">
            <Sparkles className="h-3 w-3 text-[oklch(0.72_0.14_150)]" />
            Powered by Anna AI · Executa Tools
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled
            title="Coming soon"
            className="flex cursor-not-allowed items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground opacity-60"
          >
            <Github className="h-3.5 w-3.5" /> Connect GitHub
          </button>
          <button
            onClick={() => {
              if (!hasProject) {
                showToast("Scaffold a project first with /vibe");
                return;
              }
              showToast("Preparing download…");
              setTimeout(() => showToast("Download ready ✓", 2200), 1500);
            }}
            className="flex items-center gap-2 rounded-full bg-foreground px-3 py-1.5 text-xs text-background hover:opacity-90"
          >
            <Download className="h-3.5 w-3.5" /> Download ZIP
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[minmax(320px,420px)_1fr]">
        {/* Chat */}
        <section className="flex min-h-0 flex-col border-r border-border">
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-6">
            {messages.map((m) => (
              <MessageBubble key={m.id} msg={m} />
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Terminal className="h-3 w-3" />
                <span className="font-mono">anna is working…</span>
              </div>
            )}
          </div>
          <div className="border-t border-border bg-card/50 p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2">
              <textarea
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={hasProject ? "Ask for a tweak…" : "/vibe a tiny portfolio site"}
                className="min-h-[40px] flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={handleSend}
                disabled={busy || !input.trim()}
                className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 px-2 text-[10px] text-muted-foreground">
              Try: <code className="font-mono">/vibe a ceramic artist portfolio</code>
            </p>
          </div>
        </section>

        {/* Right panel */}
        <section className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-border bg-card/40 px-4 py-2 text-xs">
            <div className="flex gap-1 rounded-full border border-border bg-background p-1">
              <TabBtn active={rightTab === "code"} onClick={() => setRightTab("code")} icon={<Code2 className="h-3 w-3" />} label="Files & Code" />
              <TabBtn active={rightTab === "preview"} onClick={() => setRightTab("preview")} icon={<Eye className="h-3 w-3" />} label="Preview" />
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              {hasProject ? `vibe-project · v${projectVersion}` : "no project"}
            </span>
          </div>

          {rightTab === "code" ? (
            <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr]">
              <aside className="overflow-y-auto border-r border-border bg-card/30 p-3 text-xs">
                {hasProject ? (
                  <FileTree node={FILE_TREE} selected={selectedFile} onSelect={setSelectedFile} depth={0} />
                ) : (
                  <EmptyHint text="File tree appears here after /vibe" />
                )}
              </aside>
              <div className="flex min-h-0 flex-col">
                <div className="flex items-center gap-2 border-b border-border bg-card/40 px-4 py-2 text-[11px] text-muted-foreground">
                  <FileCode className="h-3 w-3" />
                  <span className="font-mono">{hasProject ? selectedFile : "—"}</span>
                </div>
                <pre className="flex-1 overflow-auto bg-[oklch(0.16_0.01_60)] p-5 font-mono text-[12px] leading-relaxed text-[oklch(0.92_0.01_90)]">
                  {hasProject ? files[selectedFile] ?? "// file not found" : "// scaffold a project with /vibe to see code"}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-[oklch(0.96_0.005_90)] p-6">
              {hasProject ? <MockPreview version={projectVersion} /> : <EmptyHint text="Preview appears here after /vibe" />}
            </div>
          )}
        </section>
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs text-background shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMsg }) {
  if (msg.type === "tool") {
    return (
      <div className="rounded-md border border-border bg-card/60 px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
        {msg.text}
      </div>
    );
  }
  if (msg.type === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-foreground px-4 py-2 text-sm text-background">
          {msg.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <div className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[oklch(0.72_0.14_150)]">
        <Flower2 className="h-3 w-3 text-foreground" strokeWidth={2} />
      </div>
      <div className="max-w-[85%] text-sm leading-relaxed text-foreground">{msg.text}</div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-center gap-1.5 rounded-full px-3 py-1 transition " +
        (active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")
      }
    >
      {icon} {label}
    </button>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
      {text}
    </div>
  );
}

function FileTree({ node, selected, onSelect, depth }: { node: FileNode; selected: string; onSelect: (p: string) => void; depth: number }) {
  const [open, setOpen] = useState(true);
  const isDir = !!node.children;

  if (depth === 0 && isDir) {
    return (
      <div>
        <div className="mb-1 flex items-center gap-1 px-1 font-mono text-[11px] text-muted-foreground">
          <FolderOpen className="h-3 w-3" /> {node.name}/
        </div>
        <div className="space-y-0.5">
          {node.children!.map((c) => (
            <FileTree key={c.path} node={c} selected={selected} onSelect={onSelect} depth={1} />
          ))}
        </div>
      </div>
    );
  }

  if (isDir) {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-secondary"
          style={{ paddingLeft: depth * 10 }}
        >
          <ChevronRight className={"h-3 w-3 transition " + (open ? "rotate-90" : "")} />
          {open ? <FolderOpen className="h-3 w-3" /> : <Folder className="h-3 w-3" />}
          <span className="font-mono text-[11px]">{node.name}/</span>
        </button>
        {open && (
          <div className="space-y-0.5">
            {node.children!.map((c) => (
              <FileTree key={c.path} node={c} selected={selected} onSelect={onSelect} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const active = selected === node.path;
  return (
    <button
      onClick={() => onSelect(node.path)}
      className={
        "flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left transition " +
        (active ? "bg-foreground text-background" : "hover:bg-secondary")
      }
      style={{ paddingLeft: depth * 10 + 14 }}
    >
      <FileCode className="h-3 w-3" />
      <span className="font-mono text-[11px]">{node.name}</span>
    </button>
  );
}

function MockPreview({ version }: { version: 1 | 2 }) {
  const btnBg = version === 2 ? "#2b6cff" : "#1a1a1a";
  return (
    <div className="w-full max-w-3xl">
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="flex items-center gap-1.5 border-b border-border bg-[oklch(0.95_0.005_90)] px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          <span className="ml-3 font-mono text-[10px] text-muted-foreground">localhost:5173</span>
        </div>
        <div className="bg-[#faf8f3] px-6 py-16 text-center text-[#1a1a1a]">
          <h1 className="m-0 text-5xl font-semibold">Hello, vibe.</h1>
          <p className="mt-3 text-sm text-neutral-500">A tiny site, scaffolded by Anna SDK.</p>
          <button
            className="mt-6 rounded-full px-5 py-2.5 text-sm text-white transition"
            style={{ backgroundColor: btnBg }}
          >
            Get Started
          </button>
          <div className="mx-auto mt-10 grid h-40 max-w-xs place-items-center rounded-xl bg-gradient-to-br from-neutral-200 to-neutral-100 text-xs text-neutral-400">
            hero.png
          </div>
        </div>
      </div>
      <p className="mt-3 text-center font-mono text-[10px] text-muted-foreground">
        mock preview · v{version}
      </p>
    </div>
  );
}