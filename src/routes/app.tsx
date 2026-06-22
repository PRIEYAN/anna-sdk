import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Flower2,
  Download,
  Github,
  Send,
  FileCode,
  Folder,
  FolderOpen,
  Eye,
  Code2,
  ChevronRight,
  Sparkles,
  Terminal,
} from "lucide-react";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Build · Anna SDK" },
      { name: "description", content: "Chat with Anna to generate a tiny vanilla web project." },
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

const AGENT_BASE = (import.meta.env.VITE_AGENT_URL ?? "").replace(/\/$/, "");

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${AGENT_BASE}${path}`, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || `Agent request failed (${response.status})`);
  return payload as T;
}

function BuildApp() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "m0",
      type: "assistant",
      text: "Hi, I'm Anna. Type /vibe and describe any website — I'll build it from scratch.\n\nExamples:\n• /vibe a coffee shop called Morning Brew\n• /vibe a chatting app called ConnectHub\n• /vibe a designer portfolio for Alex\n• /vibe an ecommerce store for sneakers",
    },
  ]);
  const [input, setInput] = useState("");
  const [hasProject, setHasProject] = useState(false);
  const [projectVersion, setProjectVersion] = useState(0);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("screens/home.js");
  const [selectedContent, setSelectedContent] = useState("");
  const [rightTab, setRightTab] = useState<"code" | "preview">("code");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef("");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const showToast = (t: string, hold = 1800) => {
    setToast(t);
    setTimeout(() => setToast(null), hold);
  };

  const pushMsg = (m: ChatMsg) => setMessages((prev) => [...prev, m]);

  const getSessionId = () => {
    if (sessionIdRef.current) return sessionIdRef.current;
    const stored = window.localStorage.getItem("anna-session-id");
    sessionIdRef.current = stored || crypto.randomUUID();
    window.localStorage.setItem("anna-session-id", sessionIdRef.current);
    return sessionIdRef.current;
  };

  const loadTree = async (sessionId: string) => {
    const result = await api<{ tree: FileNode[] }>(`/api/files/${encodeURIComponent(sessionId)}`);
    setFileTree(result.tree);
  };

  const loadFile = async (path: string, sessionId = getSessionId()) => {
    setSelectedFile(path);
    if (/\.(png|jpe?g|gif|webp|ico)$/i.test(path)) {
      setSelectedContent("[binary asset]");
      return;
    }
    try {
      const result = await api<{ content: string }>(
        `/api/files/${encodeURIComponent(sessionId)}?path=${encodeURIComponent(path)}`,
      );
      setSelectedContent(result.content);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not read file");
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    pushMsg({ id: `u-${Date.now()}`, type: "user", text });

    try {
      const sessionId = getSessionId();
      if (text.startsWith("/vibe")) {
        const desc = text.replace(/^\/vibe\b/, "").trim() || "a tiny landing page";
        pushMsg({
          id: `t-${Date.now()}`,
          type: "tool",
          text: `→ generate_project({ prompt: "${desc}" })`,
        });
        const result = await api<{ filesWritten: string[] }>("/api/vibe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId, prompt: desc }),
        });
        await loadTree(sessionId);
        await loadFile("screens/home.js", sessionId);
        setHasProject(true);
        setProjectVersion((version) => version + 1);
        pushMsg({
          id: `done-${Date.now()}`,
          type: "tool",
          text: `✓ Wrote ${result.filesWritten.length} files.`,
        });
        pushMsg({
          id: `a-${Date.now()}`,
          type: "assistant",
          text: "Done. Your real project is in the right panel. Open Preview or ask me for a tweak.",
        });
      } else if (hasProject) {
        pushMsg({
          id: `a-${Date.now()}`,
          type: "assistant",
          text: "AI edits require the Anna App (port 5180). Run: start-anna.cmd\nThen visit http://localhost:5180 and type your edit there.",
        });
      } else {
        pushMsg({
          id: `a-${Date.now()}`,
          type: "assistant",
          text: "Start with /vibe to generate a project first. e.g. /vibe a coffee shop landing page.",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "The agent request failed";
      pushMsg({
        id: `error-${Date.now()}`,
        type: "assistant",
        text: `I couldn't complete that: ${message}`,
      });
      showToast(message, 3000);
    } finally {
      setBusy(false);
    }
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
              window.location.assign(
                `${AGENT_BASE}/api/download/${encodeURIComponent(getSessionId())}`,
              );
              showToast("Preparing download…");
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
              <TabBtn
                active={rightTab === "code"}
                onClick={() => setRightTab("code")}
                icon={<Code2 className="h-3 w-3" />}
                label="Files & Code"
              />
              <TabBtn
                active={rightTab === "preview"}
                onClick={() => setRightTab("preview")}
                icon={<Eye className="h-3 w-3" />}
                label="Preview"
              />
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              {hasProject ? `vibe-project · v${projectVersion}` : "no project"}
            </span>
          </div>

          {rightTab === "code" ? (
            <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr]">
              <aside className="overflow-y-auto border-r border-border bg-card/30 p-3 text-xs">
                {hasProject ? (
                  <FileTree
                    node={{ name: "vibe-project", path: "", children: fileTree }}
                    selected={selectedFile}
                    onSelect={(path) => void loadFile(path)}
                    depth={0}
                  />
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
                  {hasProject
                    ? selectedContent || "// loading file…"
                    : "// generate a project with /vibe to see code"}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-[oklch(0.96_0.005_90)] p-6">
              {hasProject ? (
                <ProjectPreview sessionId={getSessionId()} version={projectVersion} />
              ) : (
                <EmptyHint text="Preview appears here after /vibe" />
              )}
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

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
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

function FileTree({
  node,
  selected,
  onSelect,
  depth,
}: {
  node: FileNode;
  selected: string;
  onSelect: (p: string) => void;
  depth: number;
}) {
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
              <FileTree
                key={c.path}
                node={c}
                selected={selected}
                onSelect={onSelect}
                depth={depth + 1}
              />
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

function ProjectPreview({ sessionId, version }: { sessionId: string; version: number }) {
  const previewUrl = `${AGENT_BASE}/preview/${encodeURIComponent(sessionId)}/index.html?v=${version}`;
  return (
    <div className="flex h-full w-full max-w-5xl flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="flex items-center gap-1.5 border-b border-border bg-[oklch(0.95_0.005_90)] px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          <span className="ml-3 truncate font-mono text-[10px] text-muted-foreground">
            {previewUrl}
          </span>
        </div>
        <iframe
          key={version}
          title="Generated project preview"
          src={previewUrl}
          className="min-h-0 flex-1 bg-white"
        />
      </div>
      <p className="mt-3 text-center font-mono text-[10px] text-muted-foreground">
        live static preview · v{version}
      </p>
    </div>
  );
}
