import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Message, RoomState } from "../src/lib/types"
import { VOTE_MASK } from "../src/lib/constants"
import {
  BUCKET_CAPACITY,
  MAX_CONNECTIONS,
  MAX_MESSAGE_CHARS,
  MAX_PARTICIPANTS,
} from "./limits"

// partyserver's Server needs the Workers runtime; the room logic only uses
// its connection registry, broadcast and storage, which this stands in for.
vi.mock("partyserver", () => {
  class Server {
    ctx: unknown
    conns = new Map<string, FakeConn>()
    constructor(ctx: unknown) {
      this.ctx = ctx
    }
    getConnections() {
      return this.conns.values()
    }
    broadcast(msg: string, without: string[] = []) {
      for (const conn of this.conns.values())
        if (!without.includes(conn.id)) conn.send(msg)
    }
  }
  return { Server, routePartykitRequest: vi.fn() }
})

const { PokerRoom } = await import("./index")

type FakeConn = {
  id: string
  state: Record<string, unknown> | null
  sent: Message[]
  closed: { code: number; reason: string } | null
  setState: (
    next:
      | Record<string, unknown>
      | ((prev: Record<string, unknown> | null) => Record<string, unknown>),
  ) => void
  send: (msg: string) => void
  close: (code: number, reason: string) => void
}

const fakeStorage = () => {
  const data = new Map<string, unknown>()
  return {
    get: async (key: string) => data.get(key),
    put: async (key: string, value: unknown) => void data.set(key, value),
    delete: async (key: string) => data.delete(key),
    setAlarm: () => {},
  }
}

let seq = 0
const makeConn = (): FakeConn => {
  const conn: FakeConn = {
    id: `conn-${++seq}`,
    state: null,
    sent: [],
    closed: null,
    setState(next) {
      conn.state = typeof next === "function" ? next(conn.state) : next
    },
    send(msg) {
      conn.sent.push(JSON.parse(msg) as Message)
    },
    close(code, reason) {
      conn.closed = { code, reason }
    },
  }
  return conn
}

type Room = InstanceType<typeof PokerRoom> & {
  conns: Map<string, FakeConn>
}

const makeRoom = async () => {
  const room = new PokerRoom(
    { storage: fakeStorage() } as never,
    {} as never,
  ) as Room
  await room.onStart()
  return room
}

const TOKEN_A = "alice-private-token-0001"
const TOKEN_B = "bob-private-token-000002"
const HOST_TOKEN = "host-private-token-00003"
const HOST_SECRET = "host-secret-0000000000000"

const connect = async (
  room: Room,
  params: Record<string, string>,
): Promise<FakeConn> => {
  const conn = makeConn()
  room.conns.set(conn.id, conn)
  const url = `https://example.test/parties/main/ROOM?${new URLSearchParams(params)}`
  await room.onConnect(conn as never, { request: new Request(url) } as never)
  return conn
}

const send = (room: Room, conn: FakeConn, msg: Message | string) =>
  room.onMessage(
    conn as never,
    typeof msg === "string" ? msg : JSON.stringify(msg),
  )

const welcomeId = (conn: FakeConn) => {
  const welcome = conn.sent.find((m) => m.type === "welcome")
  if (welcome?.type !== "welcome") throw new Error("no welcome frame")
  return welcome.clientId
}

const lastState = (conn: FakeConn): RoomState => {
  const states = conn.sent.filter((m) => m.type === "state")
  const last = states.at(-1)
  if (last?.type !== "state") throw new Error("no state frame")
  return last.state
}

let room: Room

beforeEach(async () => {
  room = await makeRoom()
})

describe("identity bound to a private token", () => {
  it("never broadcasts the token, only a derived public id", async () => {
    const alice = await connect(room, { token: TOKEN_A, name: "Alice" })
    const id = welcomeId(alice)
    expect(id).not.toBe(TOKEN_A)
    expect(id).toMatch(/^[0-9a-f]{32}$/)
    for (const frame of alice.sent)
      expect(JSON.stringify(frame)).not.toContain(TOKEN_A)
    expect(Object.keys(lastState(alice).participants)).toEqual([id])
  })

  it("gives the same public id to every tab holding the same token", async () => {
    const tab1 = await connect(room, { token: TOKEN_A, name: "Alice" })
    const tab2 = await connect(room, { token: TOKEN_A, name: "Alice" })
    expect(welcomeId(tab1)).toBe(welcomeId(tab2))
    expect(Object.keys(lastState(tab2).participants)).toHaveLength(1)
  })

  it("gives a client without a valid token a fresh identity", async () => {
    const legacy1 = await connect(room, { clientId: "abc", name: "Old" })
    const legacy2 = await connect(room, { clientId: "abc", name: "Old" })
    expect(welcomeId(legacy1)).not.toBe(welcomeId(legacy2))
    expect(welcomeId(legacy1)).not.toBe("abc")
  })

  it("does not let a socket claiming a victim's public id see or change the victim's vote", async () => {
    const alice = await connect(room, { token: TOKEN_A, name: "Alice" })
    const aliceId = welcomeId(alice)
    send(room, alice, { type: "vote", value: "8" })

    // The attacker knows Alice's public id from the room state and tries it
    // both as the token and as the legacy clientId parameter.
    const attackers = [
      await connect(room, { token: aliceId, name: "Mallory" }),
      await connect(room, { clientId: aliceId, name: "Mallory" }),
    ]
    for (const attacker of attackers) {
      expect(welcomeId(attacker)).not.toBe(aliceId)
      expect(lastState(attacker).participants[aliceId].vote).toBe(VOTE_MASK)

      send(room, attacker, { type: "vote", value: "1" })
      send(room, attacker, {
        type: "update-profile",
        name: "Pwned",
        avatar: "",
      })
    }

    const seen = lastState(alice).participants[aliceId]
    expect(seen.vote).toBe("8")
    expect(seen.name).toBe("Alice")
  })

  it("does not let a known public id skip the approval queue", async () => {
    const host = await connect(room, {
      token: HOST_TOKEN,
      hostSecret: HOST_SECRET,
      name: "Host",
    })
    const alice = await connect(room, { token: TOKEN_A, name: "Alice" })
    const aliceId = welcomeId(alice)
    send(room, host, { type: "set-approval", enabled: true })

    const intruder = await connect(room, { token: aliceId, name: "Mallory" })
    expect(intruder.sent.at(-1)).toEqual({ type: "waiting", status: "pending" })
    expect(lastState(host).pending[welcomeId(intruder)]).toBeDefined()
  })
})

describe("approval gate", () => {
  const setUp = async () => {
    const host = await connect(room, {
      token: HOST_TOKEN,
      hostSecret: HOST_SECRET,
      name: "Host",
    })
    const alice = await connect(room, { token: TOKEN_A, name: "Alice" })
    send(room, host, { type: "set-approval", enabled: true })
    send(room, alice, { type: "vote", value: "5" })
    send(room, alice, { type: "react", emoji: "🎉" })
    const bob = await connect(room, { token: TOKEN_B, name: "Bob" })
    return { host, alice, bob }
  }

  it("sends a pending socket only a waiting frame, never the room", async () => {
    const { alice, bob } = await setUp()
    send(room, alice, { type: "react", emoji: "👋" })
    expect(bob.sent.map((m) => m.type)).toEqual(["welcome", "waiting"])
    expect(bob.sent.at(-1)).toEqual({ type: "waiting", status: "pending" })
    const raw = JSON.stringify(bob.sent)
    expect(raw).not.toContain("Alice")
    expect(raw).not.toContain(welcomeId(alice))
  })

  it("sends the room once the host admits, and a denied frame on deny", async () => {
    const { host, bob } = await setUp()
    const bobId = welcomeId(bob)
    send(room, host, { type: "admit", clientId: bobId })
    expect(lastState(bob).participants[bobId]).toBeDefined()

    const carol = await connect(room, {
      token: "carol-private-token-0004",
      name: "Carol",
    })
    send(room, host, { type: "deny", clientId: welcomeId(carol) })
    expect(carol.sent.at(-1)).toEqual({ type: "waiting", status: "denied" })
    expect(carol.sent.some((m) => m.type === "state")).toBe(false)
  })

  it("ignores messages from a pending socket", async () => {
    const { host, bob } = await setUp()
    send(room, bob, { type: "vote", value: "3" })
    expect(lastState(host).participants[welcomeId(bob)]).toBeUndefined()
  })
})

describe("room limits", () => {
  it("turns away connections beyond the per-room limit", async () => {
    for (let i = 0; i < MAX_CONNECTIONS; i++)
      await connect(room, { token: TOKEN_A, name: "Alice" })
    const extra = await connect(room, { token: TOKEN_A, name: "Alice" })
    expect(extra.sent).toEqual([{ type: "rejected", reason: "room-full" }])
    expect(extra.closed?.code).toBe(4008)
  })

  it("turns away new identities beyond the participant cap but lets known ones back in", async () => {
    const first = await connect(room, {
      token: "participant-token-000000",
      name: "P0",
    })
    for (let i = 1; i < MAX_PARTICIPANTS; i++)
      await connect(room, {
        token: `participant-token-${String(i).padStart(6, "0")}`,
        name: `P${i}`,
      })
    expect(Object.keys(lastState(first).participants)).toHaveLength(
      MAX_PARTICIPANTS,
    )

    const extra = await connect(room, { token: TOKEN_B, name: "Late" })
    expect(extra.sent).toEqual([{ type: "rejected", reason: "room-full" }])
    // Its close must not unseat anyone.
    room.onClose(extra as never)
    expect(Object.keys(lastState(first).participants)).toHaveLength(
      MAX_PARTICIPANTS,
    )

    const secondTab = await connect(room, {
      token: "participant-token-000000",
      name: "P0",
    })
    expect(secondTab.sent.some((m) => m.type === "state")).toBe(true)
  })

  it("drops oversized messages", async () => {
    const alice = await connect(room, { token: TOKEN_A, name: "Alice" })
    const aliceId = welcomeId(alice)
    const padded = JSON.stringify({
      type: "update-profile",
      name: "Big",
      avatar: "",
      pad: "x".repeat(MAX_MESSAGE_CHARS),
    })
    send(room, alice, padded)
    expect(lastState(alice).participants[aliceId].name).toBe("Alice")
  })

  it("rate-limits state-changing messages with a token bucket", async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(1_000_000)
      const alice = await connect(room, { token: TOKEN_A, name: "Alice" })
      const before = alice.sent.length
      for (let i = 0; i < BUCKET_CAPACITY + 10; i++)
        send(room, alice, { type: "vote", value: i % 2 ? "3" : "5" })
      const states = alice.sent.slice(before).filter((m) => m.type === "state")
      expect(states).toHaveLength(BUCKET_CAPACITY)

      // The bucket refills over time.
      vi.setSystemTime(1_000_000 + 1000)
      send(room, alice, { type: "vote", value: "8" })
      expect(lastState(alice).participants[welcomeId(alice)].vote).toBe("8")
    } finally {
      vi.useRealTimers()
    }
  })
})
