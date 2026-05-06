import { redirect } from "next/navigation"
import { GuestRoom } from "./guest-room"

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ name?: string; avatar?: string }>
}

export default async function RoomPage({ params, searchParams }: Props) {
  const { id } = await params
  const { name, avatar } = await searchParams
  if (!name?.trim()) redirect(`/?join=${id}`)
  return (
    <GuestRoom hostId={id} name={name.trim()} avatar={avatar ?? name.trim()} />
  )
}
