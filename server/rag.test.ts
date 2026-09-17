import { afterEach, describe, expect, it } from "vitest";
import { chunkText, ingestDocument, isGrounded, resetDocuments, retrieve } from "./rag";

afterEach(() => resetDocuments());

describe("IntelliBot retrieval pipeline", () => {
  it("chunks text with overlap and preserves searchable content", () => {
    const chunks = chunkText("alpha ".repeat(220), 120, 20);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toContain("alpha");
    expect(chunks.at(-1)).toContain("alpha");
  });

  it("retrieves the employee handbook for a leave question", () => {
    const chunks = retrieve("How many annual leave days do we get?");
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]?.documentName).toBe("Employee Handbook 2026.pdf");
    expect(isGrounded(chunks)).toBe(true);
  });

  it("does not ground an answer when no source matches", () => {
    const chunks = retrieve("What is the recipe for chocolate cake?");
    expect(chunks).toHaveLength(0);
    expect(isGrounded(chunks)).toBe(false);
  });

  it("ingests a new text source and returns safe metadata", () => {
    const result = ingestDocument({ name: "Launch Notes.txt", text: "The launch review is on Friday." });
    expect(result.name).toBe("Launch Notes.txt");
    expect(result.type).toBe("TXT");
    expect(result.chunks).toBeGreaterThan(0);
    expect("text" in result).toBe(false);
  });
});
