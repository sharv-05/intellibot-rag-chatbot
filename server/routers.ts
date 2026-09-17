import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  buildContext,
  fallbackAnswer,
  getChunkCount,
  getConfidence,
  getCurrentWorkspace,
  getMetrics,
  getPipeline,
  getSourceCards,
  ingestDocument,
  isGrounded,
  listDocuments,
  retrieve,
  summarizeHistory,
} from "./rag";

function responseText(content: unknown) {
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) return content.map((part) => (typeof part === "string" ? part : (part as { text?: string }).text ?? "")).join(" ").trim();
  return "";
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  rag: router({
    workspace: publicProcedure.query(() => ({ workspace: getCurrentWorkspace(), documents: listDocuments(), chunks: getChunkCount(), status: "Operational" })),
    documents: publicProcedure.query(() => listDocuments()),
    metrics: publicProcedure.query(() => getMetrics()),
    pipeline: publicProcedure.query(() => getPipeline()),
    upload: publicProcedure.input(z.object({ name: z.string().min(1), text: z.string().min(1), type: z.enum(["PDF", "TXT", "MD"]).optional() })).mutation(({ input }) => ingestDocument(input)),
    chat: publicProcedure.input(z.object({ query: z.string().min(1).max(1000), history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).default([]) })).mutation(async ({ input }) => {
      const startedAt = Date.now();
      const chunks = retrieve(input.query, 4);
      const grounded = isGrounded(chunks);
      if (!grounded) {
        return { answer: fallbackAnswer(chunks), grounded: false, sources: [], metadata: { confidence: 0, latencyMs: Math.max(120, Date.now() - startedAt), contextChunks: 0 } };
      }

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are IntelliBot, a source-grounded internal knowledge assistant. Answer only from the retrieved context below. If the context does not contain the answer, say so plainly. Keep the answer concise and mention the source document by name. Do not use general internet knowledge.\n\nRETRIEVED CONTEXT:\n" + buildContext(chunks) + "\n\nRECENT CONVERSATION:\n" + summarizeHistory(input.history) },
          { role: "user", content: input.query },
        ],
      });
      const answer = responseText(response.choices?.[0]?.message?.content) || fallbackAnswer(chunks);
      return { answer, grounded: true, sources: getSourceCards(chunks), metadata: { confidence: getConfidence(chunks), latencyMs: Math.max(120, Date.now() - startedAt), contextChunks: chunks.length } };
    }),
  }),
});

export type AppRouter = typeof appRouter;
