# Anna backend agent

Standalone Node.js backend for generated vanilla HTML/CSS/JS projects. Project state lives in `workspaces/<sessionId>` and the four Executa-compatible tools communicate over JSON-RPC through stdin/stdout.

```bash
npm install
npm run dev
```

The server defaults to `http://127.0.0.1:8787` and automatically loads `Agent/.env` when present. Copy `.env.example` to `.env` when different settings or model credentials are needed.

From the repository root, `npm run dev:all` starts both this agent and the frontend. Vite proxies `/api` and `/preview` to the agent during development. For separate or production deployments, build the frontend with `VITE_AGENT_URL` set to the public agent origin.

## HTTP API

- `POST /api/vibe` — `{ "sessionId": "abc", "prompt": "a ceramic portfolio" }`
- `POST /api/edit` — `{ "sessionId": "abc", "path": "screens/home.js", "instruction": "change the headline to Studio Earth" }`
- `GET /api/files/:sessionId` — recursive file tree
- `GET /api/files/:sessionId?path=style.css` — file content
- `GET /preview/:sessionId/index.html` — static preview
- `GET /api/download/:sessionId` — ZIP archive

Set `ANNA_API_URL`, `ANNA_API_KEY`, and `ANNA_MODEL` for an OpenAI-compatible Anna endpoint. The skill is loaded for every model call; when credentials are absent the server uses the reliable local template fallback described in plan section 7.
