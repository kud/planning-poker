"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AvatarPicker } from "@/components/avatar-picker"
import { avatarUrl, randomSeed } from "@/lib/avatar"
import { saveSettings } from "@/lib/settings"

type Props = {
  currentName: string
  currentAvatar: string
  onSave: (name: string, avatar: string) => void
  trigger: React.ReactElement
}

export const SettingsDialog = ({
  currentName,
  currentAvatar,
  onSave,
  trigger,
}: Props) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(currentName)
  const [avatar, setAvatar] = useState(currentAvatar)
  const [avatarOptions, setAvatarOptions] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setName(currentName)
    setAvatar(currentAvatar)
    const opts = Array.from({ length: 8 }, randomSeed)
    const withCurrent = opts.includes(currentAvatar)
      ? opts
      : [currentAvatar, ...opts.slice(1)]
    setAvatarOptions(withCurrent)
  }, [open, currentName, currentAvatar])

  const shuffle = () => {
    const opts = Array.from({ length: 8 }, randomSeed)
    setAvatarOptions(opts)
    setAvatar(opts[0])
  }

  const handleSave = () => {
    if (!name.trim()) return
    const trimmed = name.trim()
    saveSettings({ name: trimmed, avatar })
    onSave(trimmed, avatar)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Your profile</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex items-center gap-3">
            <img
              src={avatarUrl(avatar)}
              alt="avatar preview"
              className="w-12 h-12 rounded-xl flex-none"
            />
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <AvatarPicker
            options={avatarOptions}
            selected={avatar}
            onSelect={setAvatar}
            onShuffle={shuffle}
          />
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
