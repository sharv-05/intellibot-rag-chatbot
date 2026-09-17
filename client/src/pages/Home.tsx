import { useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import {
  ArrowUp,
  BarChart3,
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Copy,
  Database,
  FileCode2,
  FileText,
  FileType2,
  FolderOpen,
  Gauge,
  Headphones,
  Info,
  Layers3,
  Library,
  Menu,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  X,
  Zap,
} from "lucide-react";

type Message = { role: "user" | "assistant"; content: string; sources?: Array<{ name: string; chunk: number; excerpt: string; score: number }>; metadata?: { confidence: number; latencyMs: number; contextChunks: number } };

type Tab = "chat" | "sources" | "evaluation";

const initialMessages: Message[] = [
  {
    role: "assistant",
    content: "Hi Aarav — I’m ready to answer from your indexed documents. I’ll show the retrieved sources alongside each answer.",
  },
];

const iconForType = (type: string) => type === "PDF" ? <FileType2 size={16} /> : type === "MD" ? <FileCode2 size={16} /> : <FileText size={16} />;

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [mobileRail, setMobileRail] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const documentsQuery = trpc.rag.documents.useQuery();
  const metricsQuery = trpc.rag.metrics.useQuery();
  const pipelineQuery = trpc.rag.pipeline.useQuery();
  const chatMutation = trpc.rag.chat.useMutation();
  const uploadMutation = trpc.rag.upload.useMutation({ onSuccess: () => { documentsQuery.refetch(); toast.success("Document indexed and ready to retrieve"); }, onError: () => toast.error("We couldn’t read that file. Try a TXT or MD file.") });
  const selected = documentsQuery.data?.find((document) => document.id === selectedDocument);

  const latestAnswer = useMemo(() => [...messages].reverse().find((message) => message.role === "assistant" && message.sources?.length), [messages]);

  async function sendMessage(value = query) {
    const clean = value.trim();
    if (!clean || isThinking) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    setQuery("");
    setMessages((current) => [...current, { role: "user", content: clean }]);
    setIsThinking(true);
    try {
      const result = await chatMutation.mutateAsync({ query: clean, history });
      setMessages((current) => [...current, { role: "assistant", content: result.answer, sources: result.sources, metadata: result.metadata }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "I couldn’t complete that request. Please try again." }]);
      toast.error("The assistant is unavailable right now");
    } finally {
      setIsThinking(false);
    }
  }

  function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Keep uploads under 5 MB for a fast indexing pass"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      if (!text.trim()) { toast.error("This demo reads text-readable files only"); return; }
      const type = file.name.toLowerCase().endsWith(".md") ? "MD" : file.name.toLowerCase().endsWith(".pdf") ? "PDF" : "TXT";
      uploadMutation.mutate({ name: file.name, text, type });
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function clearChat() {
    setMessages(initialMessages);
    toast.success("New conversation started");
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileRail ? "mobile-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><Sparkles size={16} /></div>
          <div><div className="brand-name">IntelliBot</div><div className="brand-sub">RAG workspace</div></div>
          <button className="icon-button sidebar-close" onClick={() => setMobileRail(false)} aria-label="Close menu"><X size={17} /></button>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">CA</div>
          <div className="workspace-copy"><div>Code A Nova / Ops</div><span>Private workspace</span></div>
          <ChevronDown size={15} className="muted-icon" />
        </div>

        <button className="new-chat-button" onClick={clearChat}><Plus size={17} /> New chat <span className="shortcut">⌘ N</span></button>

        <nav className="side-nav">
          <button className={activeTab === "chat" ? "active" : ""} onClick={() => setActiveTab("chat")}><Bot size={17} /> Ask IntelliBot</button>
          <button className={activeTab === "sources" ? "active" : ""} onClick={() => setActiveTab("sources")}><Library size={17} /> Knowledge base <span className="nav-count">{documentsQuery.data?.length ?? 3}</span></button>
          <button className={activeTab === "evaluation" ? "active" : ""} onClick={() => setActiveTab("evaluation")}><BarChart3 size={17} /> Evaluation <span className="nav-dot" /></button>
        </nav>

        <div className="side-section-label">Recent conversations</div>
        <div className="history-list">
          <button className="history-item selected"><span className="history-dot" /> People ops · leave policy <MoreHorizontal size={14} /></button>
          <button className="history-item"><span className="history-dot purple" /> IntelliBot · RAG pipeline</button>
          <button className="history-item"><span className="history-dot blue" /> Security · API keys</button>
        </div>

        <div className="sidebar-bottom">
          <div className="index-card"><div className="index-card-head"><span><Database size={14} /> Index health</span><span className="status-pill"><span className="status-dot" /> Healthy</span></div><div className="index-stats"><strong>{documentsQuery.data?.length ?? 3}</strong><span>docs</span><strong>{(documentsQuery.data ?? []).reduce((sum, d) => sum + d.chunks, 0) || 52}</strong><span>chunks</span><strong>1.2s</strong><span>avg.</span></div><div className="progress-line"><span /></div><div className="index-foot"><span>Last indexed</span><span>just now</span></div></div>
          <div className="side-links"><button><Settings2 size={16} /> Workspace settings</button><button><CircleHelp size={16} /> Help & docs</button></div>
          <div className="profile-row"><div className="profile-avatar">AM</div><div><strong>Aarav Mehta</strong><span>Workspace owner</span></div><MoreHorizontal size={16} className="muted-icon" /></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileRail(true)} aria-label="Open menu"><Menu size={19} /></button><div className="crumbs"><span>Operations</span><span className="crumb-sep">/</span><strong>{activeTab === "chat" ? "Ask IntelliBot" : activeTab === "sources" ? "Knowledge base" : "Evaluation"}</strong></div><div className="topbar-actions"><div className="topbar-search"><Search size={15} /><span>Search workspace</span><kbd>⌘ K</kbd></div><div className="live-status"><span className="status-dot" /> All systems operational</div><button className="icon-button"><BellIcon /></button></div></header>

        {activeTab === "sources" ? <SourcesView documents={documentsQuery.data ?? []} selectedDocument={selectedDocument} setSelectedDocument={setSelectedDocument} onUpload={() => fileInput.current?.click()} /> : activeTab === "evaluation" ? <EvaluationView metrics={metricsQuery.data ?? []} pipeline={pipelineQuery.data ?? []} /> : <div className="content-grid">
          <section className="chat-column">
            <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-bar" /> GROUNDED WORKSPACE</div><h1>Good morning, Aarav.</h1><p>Your knowledge base is ready. Ask a question, or explore the sources on the right.</p></div><div className="heading-actions"><span className="private-tag"><ShieldCheck size={14} /> Private</span><button className="ghost-button" onClick={clearChat}><Plus size={15} /> New chat</button></div></div>
            <div className="chat-card">
              <div className="chat-card-header"><div><h2>Ask IntelliBot</h2><span>Answers from your knowledge base only</span></div><div className="chat-header-right"><span className="model-badge"><Zap size={13} /> LLM + RAG</span><button className="icon-button"><MoreHorizontal size={17} /></button></div></div>
              <div className="messages-area">
                {messages.map((message, index) => <div className={`message-row ${message.role}`} key={`${message.role}-${index}`}><div className={`message-avatar ${message.role}`}>{message.role === "assistant" ? <Sparkles size={15} /> : "AM"}</div><div className="message-stack"><div className="message-author">{message.role === "assistant" ? "IntelliBot" : "You"}<span>{message.role === "assistant" ? "· source-grounded" : "· just now"}</span></div><div className="message-bubble"><Streamdown>{message.content}</Streamdown></div>{message.sources?.length ? <div className="message-meta"><span><Check size={13} /> Grounded in {message.sources.length} sources</span><span><Clock3 size={13} /> {message.metadata?.latencyMs ?? 1200} ms</span><button onClick={() => { navigator.clipboard?.writeText(message.content); toast.success("Answer copied"); }}><Copy size={13} /> Copy</button></div> : null}</div></div>)}
                {isThinking && <div className="message-row assistant"><div className="message-avatar assistant"><Sparkles size={15} /></div><div className="message-stack"><div className="message-author">IntelliBot<span>· retrieving context</span></div><div className="message-bubble thinking"><span /><span /><span /></div></div></div>}
              </div>
              <div className="suggestions"><span>Try asking</span>{["What are our working hours?", "How does IntelliBot prevent hallucinations?", "What are the upload security rules?"].map((suggestion) => <button key={suggestion} onClick={() => sendMessage(suggestion)}>{suggestion}</button>)}</div>
              <div className="composer-wrap"><div className="composer"><button className="icon-button attach" onClick={() => fileInput.current?.click()} aria-label="Attach document"><Paperclip size={17} /></button><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendMessage(); }} placeholder="Ask about your knowledge base..." /><button className={`send-button ${query.trim() ? "ready" : ""}`} onClick={() => sendMessage()} aria-label="Send message"><ArrowUp size={18} /></button></div><div className="composer-footer"><span><ShieldCheck size={12} /> Source-only mode · No internet knowledge leakage</span><span>Press Enter to send</span></div></div>
            </div>
            <div className="lower-grid"><div className="info-strip"><div className="info-icon amber"><Layers3 size={18} /></div><div><strong>Retrieval first, answer second.</strong><span>Every response is composed after the top 4 relevant chunks are found.</span></div><button className="text-link" onClick={() => setActiveTab("evaluation")}>View pipeline <ArrowUp size={14} /></button></div><div className="info-strip"><div className="info-icon mint"><ShieldCheck size={18} /></div><div><strong>No source, no answer.</strong><span>Unsupported questions fall back instead of hallucinating.</span></div><span className="guard-label">Guard active</span></div></div>
          </section>
          <aside className="context-rail"><div className="rail-header"><div><div className="rail-kicker"><span className="rail-dot" /> LIVE CONTEXT</div><h3>Answer context</h3><p>Retrieved chunks stay visible for traceability.</p></div><button className="icon-button"><MoreHorizontal size={17} /></button></div>{latestAnswer ? <div className="context-sources"><div className="context-summary"><span>Sources in answer</span><strong>{latestAnswer.sources?.length ?? 0}</strong></div>{latestAnswer.sources?.map((source, index) => <button className={`source-card ${index === 0 ? "primary" : ""}`} key={`${source.name}-${source.chunk}`} onClick={() => { setSelectedDocument(documentsQuery.data?.find((doc) => doc.name === source.name)?.id ?? null); setActiveTab("sources"); }}><div className="source-top"><span className="file-icon">{iconForType(source.name.split(".").pop()?.toUpperCase() ?? "TXT")}</span><span className="source-name">{source.name}</span><span className="match-score">{source.score}%</span></div><p>{source.excerpt}</p><div className="source-bottom"><span>Chunk {source.chunk}</span><span>Semantic match</span></div></button>)}</div> : <div className="context-empty"><div className="context-orb"><Sparkles size={19} /></div><strong>Context appears here</strong><p>Ask a question to see the exact chunks used to build the answer.</p></div>}<div className="rail-divider" /><div className="rail-block"><div className="rail-block-head"><span><FolderOpen size={15} /> Indexed sources</span><button onClick={() => setActiveTab("sources")}>View all</button></div><div className="mini-doc-list">{(documentsQuery.data ?? []).slice(0, 3).map((document) => <button className="mini-doc" key={document.id} onClick={() => { setSelectedDocument(document.id); setActiveTab("sources"); }}><span className="file-icon">{iconForType(document.type)}</span><span><strong>{document.name}</strong><small>{document.chunks} chunks · {document.updatedAt}</small></span><span className="doc-ready"><Check size={12} /></span></button>)}</div><button className="upload-cta" onClick={() => fileInput.current?.click()}><Upload size={15} /> Add documents</button></div><div className="rail-divider" /><div className="rail-block quality-block"><div className="rail-block-head"><span><Gauge size={15} /> Quality snapshot</span><span className="tiny-status">Passing</span></div><div className="quality-grid">{(metricsQuery.data ?? []).map((metric) => <div key={metric.label}><strong>{metric.value}</strong><span>{metric.label.replace("Answer ", "")}</span></div>)}</div><button className="full-link" onClick={() => setActiveTab("evaluation")}>Open evaluation <ArrowUp size={14} /></button></div></aside>
        </div>}
        <footer className="page-footer"><span>IntelliBot · Context-aware RAG assistant</span><span>Built for grounded, traceable answers · v0.9.4</span></footer>
      </main>
      <input ref={fileInput} type="file" accept=".pdf,.txt,.md,.csv" hidden onChange={handleUpload} />
    </div>
  );
}

function BellIcon() { return <span className="bell-wrap"><Headphones size={17} /><span /></span>; }

function SourcesView({ documents, selectedDocument, setSelectedDocument, onUpload }: { documents: Array<{ id: string; name: string; type: string; size: string; updatedAt: string; chunks: number; status: string }>; selectedDocument: string | null; setSelectedDocument: (id: string | null) => void; onUpload: () => void }) {
  const selected = documents.find((document) => document.id === selectedDocument);
  return <div className="single-view"><div className="view-heading"><div><div className="eyebrow"><span className="eyebrow-bar" /> KNOWLEDGE BASE</div><h1>Your indexed sources.</h1><p>Documents are chunked and ready for source-grounded retrieval.</p></div><button className="primary-button" onClick={onUpload}><Upload size={16} /> Add documents</button></div><div className="source-overview"><div><span>Total sources</span><strong>{documents.length}</strong><small>Private to this workspace</small></div><div><span>Searchable chunks</span><strong>{documents.reduce((sum, doc) => sum + doc.chunks, 0)}</strong><small>Recursive chunks with overlap</small></div><div><span>Index status</span><strong className="mint-text">Healthy</strong><small>Last indexed just now</small></div></div><div className="documents-panel"><div className="panel-toolbar"><div className="panel-title"><Library size={17} /><strong>Indexed sources</strong></div><div className="panel-search"><Search size={15} /><span>Search documents</span></div></div><div className="documents-table"><div className="doc-table-head"><span>Source</span><span>Format</span><span>Chunks</span><span>Updated</span><span>Status</span></div>{documents.map((document) => <button className={`doc-table-row ${selectedDocument === document.id ? "selected" : ""}`} key={document.id} onClick={() => setSelectedDocument(document.id)}><span className="doc-name-cell"><span className="file-icon large">{iconForType(document.type)}</span><span><strong>{document.name}</strong><small>{document.size}</small></span></span><span><span className="type-pill">{document.type}</span></span><span>{document.chunks}</span><span>{document.updatedAt}</span><span><span className="table-status"><span className="status-dot" /> Indexed</span></span></button>)}</div></div>{selected && <div className="document-preview"><div className="preview-head"><div><span className="eyebrow small-eyebrow">DOCUMENT PREVIEW</span><h3>{selected.name}</h3></div><button className="icon-button" onClick={() => setSelectedDocument(null)}><X size={17} /></button></div><p>Preview the first indexed excerpt in the source. Click the chat tab to ask about it.</p><div className="preview-lines"><span>#{selected.chunks} searchable chunks</span><span>•</span><span>{selected.type} source</span><span>•</span><span>Indexed {selected.updatedAt.toLowerCase()}</span></div></div>}</div>;
}

function EvaluationView({ metrics, pipeline }: { metrics: Array<{ label: string; value: string; description: string }>; pipeline: Array<{ label: string; value: string; detail: string }> }) {
  return <div className="single-view"><div className="view-heading"><div><div className="eyebrow"><span className="eyebrow-bar" /> EVALUATION</div><h1>Quality you can inspect.</h1><p>Track the signals that tell you whether the RAG system is staying grounded.</p></div><span className="passing-pill"><span className="status-dot" /> Last run passing</span></div><div className="metric-cards">{metrics.map((metric) => <div className="metric-card" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.description}</small><div className="metric-line"><span /></div></div>)}</div><div className="evaluation-grid"><div className="pipeline-panel"><div className="panel-heading"><div><span className="eyebrow small-eyebrow">RAG PIPELINE</span><h3>Retrieval before generation</h3></div><span className="tiny-status">Healthy</span></div><div className="pipeline-flow">{pipeline.map((step, index) => <div className="pipeline-step" key={step.label}><div className={`pipeline-number ${index === pipeline.length - 1 ? "last" : ""}`}>{index + 1}</div><div><strong>{step.label}</strong><span>{step.value}</span><small>{step.detail}</small></div>{index < pipeline.length - 1 && <div className="pipeline-connector" />}</div>)}</div></div><div className="evaluation-note"><div className="note-icon"><Info size={18} /></div><h3>What gets measured?</h3><p>Faithfulness checks whether answers stay supported by retrieved context. Answer relevancy checks fit to the user question. Context precision checks whether the top chunks are useful.</p><div className="note-foot"><ShieldCheck size={15} /> Grounding threshold active</div></div></div><div className="eval-footer-note"><Sparkles size={15} /> RAGAS-ready evaluation surface · 42 sample questions in the last run</div></div>;
}
