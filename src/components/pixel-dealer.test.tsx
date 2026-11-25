import { renderToStaticMarkup } from "react-dom/server"
import { describe, it, expect } from "vitest"
import { DealerLinePill, PixelDealer } from "./pixel-dealer"

describe("pixel dealer", () => {
  it("stands on the stage with no speech bubble of his own", () => {
    const html = renderToStaticMarkup(
      <PixelDealer
        className="bottom-4 left-[7.5rem]"
        lineSeq={1}
        onSmallTalk={() => {}}
      />,
    )
    expect(html).toContain("left-[7.5rem]")
    expect(html).toContain('data-prop="dealer"')
    expect(html).not.toContain("w-60")
    expect(html).not.toContain("line-clamp-1")
  })
})

describe("dealer line", () => {
  it("shows the title alone, on one truncated line, with the dealer's head", () => {
    const html = renderToStaticMarkup(
      <DealerLinePill line={{ emoji: "🃏", title: "All over the map" }} />,
    )
    expect(html).toContain("All over the map")
    expect(html).toContain("truncate")
    expect(html).toContain("max-w-[min(36rem,100%)]")
    expect(html).toContain('viewBox="3 0 7 7"')
    expect(html).not.toContain(" — ")
  })

  it("keeps small talk's sub on the same line", () => {
    const html = renderToStaticMarkup(
      <DealerLinePill
        line={{
          emoji: "🐈",
          title: "Mind the cat",
          sub: "Judging your velocity.",
        }}
      />,
    )
    expect(html).toContain("Mind the cat — Judging your velocity.")
  })
})
