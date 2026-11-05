import { describe, expect, it } from "vitest"
import {
  MAX_ID_LEN,
  MAX_TEXT_LEN,
  clampConnectionUrl,
  parseConnectionParams,
} from "./connection-params"

const parse = (qs: string) => parseConnectionParams(new URLSearchParams(qs))

describe("parseConnectionParams", () => {
  it("reads all four fields", () => {
    expect(parse("clientId=c1&hostSecret=shhh&name=Ada&avatar=fox")).toEqual({
      clientId: "c1",
      secret: "shhh",
      name: "Ada",
      avatar: "fox",
    })
  })

  it("falls back to empty strings and Guest when fields are absent", () => {
    expect(parse("")).toEqual({
      clientId: "",
      secret: "",
      name: "Guest",
      avatar: "",
    })
  })

  it("keeps an explicitly empty name rather than the Guest fallback", () => {
    expect(parse("name=&avatar=a").name).toBe("")
  })

  it("clamps identifiers to 128 characters", () => {
    const long = "x".repeat(200)
    expect(parse(`clientId=${long}`).clientId).toHaveLength(MAX_ID_LEN)
    expect(parse(`hostSecret=${long}`).secret).toHaveLength(MAX_ID_LEN)
  })

  it("clamps text fields to 120 characters", () => {
    const long = "n".repeat(200)
    const parsed = parse(`name=${long}&avatar=${long}`)
    expect(parsed.name).toHaveLength(MAX_TEXT_LEN)
    expect(parsed.avatar).toHaveLength(MAX_TEXT_LEN)
  })

  it("never throws on odd or repeated params", () => {
    expect(() => parse("clientId=1&clientId=2&name=%ZZ")).not.toThrow()
  })
})

describe("clampConnectionUrl", () => {
  it("clamps a very long name and keeps the URL under 2 KB", () => {
    const long = "n".repeat(5000)
    const url = clampConnectionUrl(
      `https://example.test/parties/main/ROOM?name=${long}&avatar=fox`,
    )
    const params = new URL(url).searchParams
    expect(params.get("name")).toHaveLength(MAX_TEXT_LEN)
    expect(params.get("avatar")).toBe("fox")
    expect(url.length).toBeLessThan(2048)
  })

  it("clamps identifiers to 128 characters", () => {
    const long = "x".repeat(5000)
    const url = clampConnectionUrl(
      `https://example.test/parties/main/ROOM?clientId=${long}&hostSecret=${long}&_pk=${long}`,
    )
    const params = new URL(url).searchParams
    expect(params.get("clientId")).toHaveLength(MAX_ID_LEN)
    expect(params.get("hostSecret")).toHaveLength(MAX_ID_LEN)
    expect(params.get("_pk")).toHaveLength(MAX_ID_LEN)
  })

  it("keeps _pk and leaves absent params absent", () => {
    const url = clampConnectionUrl(
      "https://example.test/parties/main/ROOM?_pk=u1&clientId=c",
    )
    const params = new URL(url).searchParams
    expect(params.get("_pk")).toBe("u1")
    expect(params.get("clientId")).toBe("c")
    expect(params.get("name")).toBeNull()
    expect(params.get("avatar")).toBeNull()
    expect(params.get("hostSecret")).toBeNull()
  })

  it("drops unknown params", () => {
    const url = clampConnectionUrl(
      "https://example.test/parties/main/ROOM?clientId=c&tracking=x&_aff=y",
    )
    const params = new URL(url).searchParams
    expect(params.get("tracking")).toBeNull()
    expect(params.get("_aff")).toBeNull()
    expect(params.get("clientId")).toBe("c")
  })

  it("leaves host, path and protocol unchanged", () => {
    const url = clampConnectionUrl(
      "wss://example.test/parties/main/ROOM?name=A",
    )
    const parsed = new URL(url)
    expect(parsed.protocol).toBe("wss:")
    expect(parsed.host).toBe("example.test")
    expect(parsed.pathname).toBe("/parties/main/ROOM")
  })
})
