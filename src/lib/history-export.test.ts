import { describe, it, expect } from "vitest"
import { toMarkdown, toCsv } from "@/lib/history-export"
import type { HistoryEntry } from "@/lib/types"

const makeEntry = (overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: "1",
  title: "My Story",
  url: null,
  estimate: "5",
  at: 0,
  ...overrides,
})

describe("toMarkdown", () => {
  it("returns empty string for empty history", () => {
    expect(toMarkdown([])).toBe("")
  })

  it("includes header and separator rows", () => {
    const result = toMarkdown([makeEntry()])
    const lines = result.split("\n")
    expect(lines[0]).toBe("| Topic | Estimate |")
    expect(lines[1]).toBe("| --- | --- |")
  })

  it("renders plain title when no url is provided", () => {
    const result = toMarkdown([makeEntry({ title: "Plain Title", url: null })])
    expect(result).toContain("| Plain Title |")
  })

  it("renders a markdown link when url is provided", () => {
    const result = toMarkdown([
      makeEntry({ title: "Linked Story", url: "https://example.com/1" }),
    ])
    expect(result).toContain("[Linked Story](https://example.com/1)")
  })

  it("falls back to 'Untitled' when title is empty", () => {
    const result = toMarkdown([makeEntry({ title: "" })])
    expect(result).toContain("Untitled")
  })

  it("includes the estimate in each row", () => {
    const result = toMarkdown([makeEntry({ estimate: "13" })])
    expect(result).toContain("| 13 |")
  })

  it("handles multiple entries", () => {
    const history = [
      makeEntry({ id: "1", title: "A", estimate: "3" }),
      makeEntry({ id: "2", title: "B", estimate: "8", url: "https://b.com" }),
    ]
    const lines = toMarkdown(history).split("\n")
    expect(lines).toHaveLength(4) // header + sep + 2 rows
  })
})

describe("toCsv", () => {
  it("always outputs header row", () => {
    expect(toCsv([])).toBe("Topic,Link,Estimate")
  })

  it("outputs a data row for a basic entry", () => {
    const result = toCsv([
      makeEntry({ title: "Story", url: null, estimate: "5" }),
    ])
    expect(result).toBe("Topic,Link,Estimate\nStory,,5")
  })

  it("includes url in the link column", () => {
    const result = toCsv([
      makeEntry({ title: "Story", url: "https://example.com", estimate: "3" }),
    ])
    expect(result).toContain("https://example.com")
  })

  it("falls back to 'Untitled' when title is empty", () => {
    const result = toCsv([makeEntry({ title: "" })])
    expect(result).toContain("Untitled")
  })

  it("escapes commas in the title by wrapping in quotes", () => {
    const result = toCsv([makeEntry({ title: "Story, part 2" })])
    expect(result).toContain('"Story, part 2"')
  })

  it("escapes double-quotes in the title by doubling them", () => {
    const result = toCsv([makeEntry({ title: 'He said "hello"' })])
    expect(result).toContain('"He said ""hello"""')
  })

  it("escapes newlines in the title", () => {
    const result = toCsv([makeEntry({ title: "Line1\nLine2" })])
    expect(result).toContain('"Line1\nLine2"')
  })

  it("handles multiple entries separated by newlines", () => {
    const history = [
      makeEntry({ id: "1", title: "A", estimate: "2" }),
      makeEntry({ id: "2", title: "B", estimate: "5" }),
    ]
    const lines = toCsv(history).split("\n")
    expect(lines).toHaveLength(3) // header + 2 rows
  })
})
