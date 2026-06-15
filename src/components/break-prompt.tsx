"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

type Props = {
  request: { from: string; name: string }
  responses: { from: string; name: string; accept: boolean }[]
  myId: string
  onRespond: (accept: boolean) => void
  onDismiss: () => void
}

export const BreakPrompt = ({
  request,
  responses,
  myId,
  onRespond,
  onDismiss,
}: Props) => {
  const accepts = responses.filter((r) => r.accept).length
  const declines = responses.filter((r) => !r.accept).length
  const mine = request.from === myId
  const iResponded = mine || responses.some((r) => r.from === myId)

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 360, damping: 26 }}
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border-2 border-amber-400/50 bg-[#1a130a]/95 px-4 py-3 shadow-[0_0_36px_rgba(251,191,36,0.3)] backdrop-blur-md"
    >
      <span className="text-2xl">☕</span>
      <span className="text-sm font-medium text-amber-50">
        {mine ? (
          <>You asked for a break</>
        ) : (
          <>
            <span className="font-bold">{request.name}</span> wants a break
          </>
        )}
        <span className="ml-2 text-amber-200/70">
          ✓ {accepts} · ✗ {declines}
        </span>
      </span>

      {!iResponded ? (
        <>
          <Button
            size="sm"
            onClick={() => onRespond(true)}
            className="border border-amber-400/50 bg-amber-500/80 text-amber-950 hover:bg-amber-500"
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRespond(false)}
            className="text-white/60 hover:text-white"
          >
            Decline
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          className="text-white/60 hover:text-white"
        >
          Dismiss
        </Button>
      )}
    </motion.div>
  )
}
