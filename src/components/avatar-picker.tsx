"use client"

import { cn } from "@/lib/utils"
import { avatarUrl } from "@/lib/avatar"

type Props = {
  options: string[]
  selected: string
  onSelect: (seed: string) => void
  onShuffle: () => void
}

export const AvatarPicker = ({
  options,
  selected,
  onSelect,
  onShuffle,
}: Props) => {
  if (options.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Avatar</span>
        <button
          type="button"
          onClick={onShuffle}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Shuffle
        </button>
      </div>
      <div className="grid grid-cols-8 gap-1.5">
        {options.map((seed) => (
          <button
            key={seed}
            type="button"
            onClick={() => onSelect(seed)}
            className={cn(
              "rounded-lg overflow-hidden border-2 transition-all aspect-square",
              selected === seed
                ? "border-primary scale-110 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                : "border-transparent hover:border-primary/40",
            )}
          >
            <img src={avatarUrl(seed)} alt="avatar" className="w-full h-full" />
          </button>
        ))}
      </div>
    </div>
  )
}
