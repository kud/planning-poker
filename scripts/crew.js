// Inject a crew of fake voters into a room for testing.
//
//   npm run crew -- ROOMCODE              7 users on the local dev server
//   npm run crew -- ROOMCODE --count 3    3 users
//   npm run crew -- ROOMCODE --prod       against the deployed PartyKit server
//
// The crew votes shortly after joining and re-votes after every new round.
// Stops after 15 minutes or on Ctrl-C.

const args = process.argv.slice(2)
const room = args.find((a) => !a.startsWith("--"))
if (!room) {
  console.error("Usage: npm run crew -- ROOMCODE [--count N] [--prod]")
  process.exit(1)
}

const prod = args.includes("--prod")
const countIndex = args.indexOf("--count")
const count = countIndex === -1 ? 7 : Number(args[countIndex + 1]) || 7

const host = prod
  ? "wss://planning-poker.kud.partykit.dev"
  : "ws://127.0.0.1:1999"
const NAMES = ["Alice", "Bob", "Chloe", "Dan", "Eve", "Farouk", "Grace", "Hugo"]
const VALUES = ["1", "2", "3", "5", "8", "13"]

NAMES.slice(0, count).forEach((name) => {
  const ws = new WebSocket(
    `${host}/parties/main/${room.toUpperCase()}?clientId=crew-${name}&name=${name}&avatar=${name}`,
  )
  let lastRevealed = null
  const vote = () =>
    setTimeout(
      () =>
        ws.readyState === 1 &&
        ws.send(
          JSON.stringify({
            type: "vote",
            value: VALUES[Math.floor(Math.random() * VALUES.length)],
          }),
        ),
      800 + Math.random() * 3500,
    )
  ws.onopen = () => {
    console.log(`${name} joined ${room.toUpperCase()}`)
    vote()
  }
  ws.onclose = () => console.log(`${name} left`)
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.type !== "state") return
    if (lastRevealed === true && msg.state.revealed === false) vote()
    lastRevealed = msg.state.revealed
  }
})

const started = process.hrtime.bigint()
setInterval(() => {
  const elapsed = Number(process.hrtime.bigint() - started) / 1e9
  if (elapsed > 900) {
    console.log("Crew leaving (15 min limit).")
    process.exit(0)
  }
}, 1000)
