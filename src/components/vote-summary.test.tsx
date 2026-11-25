import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { VoteSummary } from "./vote-summary"
import type { Participant } from "@/lib/types"

const makeParticipant = (id: string, name: string, vote: string | null): Participant => ({
  id,
  name,
  avatar: "🦊",
  vote,
  isHost: id === "p1",
})

describe("vote summary", () => {
  it("revealed with votes 3,5,5,8: no tally chips, shows avg/median/spread, single-row constrained", () => {
    const participants: Record<string, Participant> = {
      p1: makeParticipant("p1", "Alice", "3"),
      p2: makeParticipant("p2", "Bob", "5"),
      p3: makeParticipant("p3", "Carol", "5"),
      p4: makeParticipant("p4", "Dave", "8"),
    }
    const html = renderToStaticMarkup(<VoteSummary participants={participants} revealed={true} />)
    expect(html).not.toContain("×")
    expect(html).toContain("avg")
    expect(html).toContain("median")
    expect(html).toContain("spread")
    expect(html).toContain("flex-nowrap")
    expect(html).toContain("max-w-[min(320px,37vw)]")
  })

  it("8-player full table with mixed votes: only the avg, median and spread chips, no × chips", () => {
    const participants: Record<string, Participant> = {
      p1: makeParticipant("p1", "A", "1"),
      p2: makeParticipant("p2", "B", "2"),
      p3: makeParticipant("p3", "C", "3"),
      p4: makeParticipant("p4", "D", "5"),
      p5: makeParticipant("p5", "E", "8"),
      p6: makeParticipant("p6", "F", "13"),
      p7: makeParticipant("p7", "G", "21"),
      p8: makeParticipant("p8", "H", "34"),
    }
    const html = renderToStaticMarkup(<VoteSummary participants={participants} revealed={true} />)
    const chipLabels = (html.match(/>avg<|>median<|>spread</g) ?? []).length
    expect(chipLabels).toBe(3)
    expect(html).not.toContain("×")
  })

  it("not revealed: empty html", () => {
    const participants: Record<string, Participant> = {
      p1: makeParticipant("p1", "Alice", "5"),
      p2: makeParticipant("p2", "Bob", "8"),
    }
    const html = renderToStaticMarkup(<VoteSummary participants={participants} revealed={false} />)
    expect(html).toBe("")
  })
})