"use client"

import { useRef, useSyncExternalStore, type MouseEvent } from "react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const emptySubscribe = () => () => {}

// Built in the browser from parts, so no served HTML or bundle carries the
// address whole for a scraper to find. The minifier folds constant joins, so
// the separator and the scheme come from maps it leaves alone. The server
// renders the link bare.
export const supportAddress = () => {
  const at = [63].map((code) => String.fromCharCode(code + 1)).join("")
  return ["support+planning-poker", "beansontoast.app"].join(at)
}

const scheme = () => ["mail", "to"].map((part) => part).join("")

const mailUrl = (query = "") =>
  [scheme(), supportAddress() + query].join(":")

// The note becomes a pre-filled message in the visitor's mail app. Nothing is
// sent from the page.
export const composeSupportMail = (name: string, message: string) => {
  const from = name.trim()
  const text = message.trim()
  const subject = from
    ? `Planning Poker support, from ${from}`
    : "Planning Poker support"
  const body = from ? `${text}\n\n${from}` : text
  return mailUrl(
    `?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  )
}

// A modifier click means "do what links do", so it keeps the plain address.
const opensElsewhere = (event: MouseEvent) =>
  event.button !== 0 ||
  event.metaKey ||
  event.ctrlKey ||
  event.shiftKey ||
  event.altKey

// Same box as ui/input, which renders an <input> and so cannot take a textarea.
const field =
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"

export const SupportLink = ({ className }: { className?: string }) => {
  const address = useSyncExternalStore(
    emptySubscribe,
    supportAddress,
    () => null,
  )
  const dialog = useRef<HTMLDialogElement>(null)
  const form = useRef<HTMLFormElement>(null)

  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    const element = dialog.current
    if (!element || typeof element.showModal !== "function") return
    if (opensElsewhere(event)) return
    event.preventDefault()
    element.returnValue = ""
    element.showModal()
  }

  const closed = () => {
    const element = dialog.current
    const fields = form.current
    if (!element || !fields || element.returnValue !== "send") return
    const data = new FormData(fields)
    window.location.href = composeSupportMail(
      String(data.get("name") ?? ""),
      String(data.get("message") ?? ""),
    )
    fields.reset()
  }

  return (
    <>
      <a
        href={address ? mailUrl() : undefined}
        onClick={open}
        className={className}
      >
        Get support
      </a>
      {/* Native, so Escape and focus come free; dressed as ui/dialog. */}
      <dialog
        ref={dialog}
        aria-labelledby="support-title"
        onClose={closed}
        // A click on the backdrop lands on the dialog itself; the card is the form.
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
        className="m-auto w-[min(24rem,calc(100vw-2rem))] overflow-visible rounded-xl bg-popover p-0 text-left text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/10 backdrop:bg-black/40 backdrop:backdrop-blur-xs open:animate-in open:fade-in-0 open:zoom-in-95"
      >
        <form ref={form} method="dialog" className="grid gap-4 p-4">
          <div className="flex flex-col gap-2">
            <h2
              id="support-title"
              className="font-heading text-base leading-none font-medium"
            >
              Get support
            </h2>
            <p className="text-sm text-muted-foreground">
              Write it here and your mail app opens with it, ready to send.
              Nothing leaves this page.
            </p>
          </div>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">
              Your name{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </span>
            <input
              name="name"
              autoComplete="name"
              maxLength={80}
              className={cn(field, "h-8")}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">What&rsquo;s up?</span>
            <textarea
              name="message"
              rows={5}
              required
              maxLength={2000}
              className={cn(field, "resize-y")}
            />
          </label>
          <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
            <button
              type="submit"
              value="cancel"
              formNoValidate
              className={buttonVariants({ variant: "outline" })}
            >
              Not now
            </button>
            <button type="submit" value="send" className={buttonVariants()}>
              Open in my mail app
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
