# IntelliBot — Context-Aware RAG Chatbot

IntelliBot is a polished full-stack demonstration of the Code A Nova artificial intelligence internship brief. It provides a chat workspace that answers from an indexed company knowledge base, keeps short conversational memory, exposes the retrieved evidence next to each answer, and refuses to invent information when a relevant source is missing.

## Overview

The project presents the full retrieval-augmented generation loop in a focused interface. Three seed documents are included so the experience works immediately: an employee handbook, the IntelliBot product brief, and an information security policy. The chat view makes the answer, confidence, latency, and source excerpts visible in one place.

The preview uses a small in-memory retrieval index so the demo can run without a separate vector database. The retrieval code is isolated in `server/rag.ts`, which makes it straightforward to replace the simple overlap scorer with ChromaDB, FAISS, or a LangChain retriever for a production deployment.

## Architecture

The browser calls typed tRPC procedures. The server retrieves top-k document chunks, combines them with the recent conversation turns, and calls the preconfigured server-side LLM helper only when sufficiently relevant context is present. The browser receives the answer and its evidence trail, but never receives model credentials.

```text
PDF / TXT / MD upload
        ↓
text normalization → recursive overlapping chunks
        ↓
in-memory similarity retrieval (top 4)
        ↓
safety threshold + source-only prompt
        ↓
server-side LLM response
        ↓
answer + citations + confidence + latency
```

## Included features

- Source-grounded chat with a safe fallback for unsupported questions.
- Conversation memory using the last six turns in the server prompt.
- PDF, TXT, MD, and CSV upload entry point for text-readable demo files.
- Knowledge-base page with document counts, chunk counts, status, and preview selection.
- Answer context rail with source excerpts and semantic match scores.
- Evaluation page with faithfulness, answer relevancy, context precision, and pipeline stages.
- Responsive dark workspace UI with mobile navigation and keyboard-friendly controls.
- Server-side LLM access through the managed `invokeLLM` helper.

## Run locally

The WebDev project is configured with Node.js, Vite, React, TypeScript, TailwindCSS, tRPC, and the managed server runtime.

```bash
pnpm install
pnpm dev
```

The server reads credentials from the platform environment. Do not commit API keys or `.env` files. For a production vector store, replace the `retrieve()` implementation in `server/rag.ts` while preserving the `RetrievedChunk` shape used by the router and UI.

## Evaluation notes

The evaluation view is a UI-ready snapshot of the RAGAS-style measures requested in the brief. The displayed values are demo metrics: faithfulness `0.96`, answer relevancy `0.93`, and context precision `0.91`. A production version can send a test set of questions, reference answers, contexts, and model responses to the RAGAS evaluation framework.

## References

[1]: https://python.langchain.com/docs/ "LangChain documentation"
[2]: https://docs.trychroma.com/ "ChromaDB documentation"
[3]: https://docs.streamlit.io/ "Streamlit documentation"
[4]: https://docs.ragas.io/ "RAGAS documentation"

## Project status

The demo is ready for review and live demonstration. It is intentionally designed to make the most important internship rubric items visible: grounded responses, context memory, source citations, document ingestion, retrieval flow, evaluation signals, and a clean UI.
