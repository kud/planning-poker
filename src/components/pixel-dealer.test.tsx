import { renderToStaticMarkup } from "react-dom/server"
import { describe, it, expect } from "vitest"
import { PixelDealer } from "./pixel-dealer"
import { TABLE_LAYER } from "@/lib/table-layers"

describe("pixel dealer layering", () => {
  it("renders with the dealer layer z-index and without z-10 class", () => {
    const html = renderToStaticMarkup(
      <PixelDealer
        announcement={{ emoji: "🃏", title: "Reveal", sub: "Cards up" }}
      />
    )
    expect(html).toContain(`z-index:${TABLE_LAYER.dealer}`)
    expect(html).not.toContain("z-10")
  })
})

describe("pixel dealer speech bubble", () => {
  it("stays narrow and clamps its sub-line to one line", () => {
    const html = renderToStaticMarkup(
      <PixelDealer
        announcement={{ emoji: "🃏", title: "Reveal", sub: "Cards up" }}
      />
    )
    expect(html).toContain("w-60")
    expect(html).not.toContain("w-80")
    expect(html).toContain("line-clamp-1")
  })
})
