"use client"

import { Component, type ReactNode } from "react"

// React error boundaries must be class components — no hook equivalent exists.
// This is the one sanctioned exception to the "plain functions only" convention:
// it keeps a render-time error from blanking the whole room mid-session.
type Props = { children: ReactNode }
type State = { failed: boolean }

export class RoomErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error("Room crashed:", error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-semibold">
          Something glitched in the room 🃏
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your votes are safe on the server — reloading will reconnect you.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full border border-border bg-muted px-5 py-2 text-sm font-medium hover:bg-muted/70"
        >
          Reload room
        </button>
      </div>
    )
  }
}
