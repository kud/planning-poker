import { redirect } from "next/navigation"
import { HostRoom } from "./host-room"

type Props = {
  searchParams: Promise<{ name?: string; avatar?: string }>
}

export default async function HostPage({ searchParams }: Props) {
  const { name, avatar } = await searchParams
  if (!name?.trim()) redirect("/")
  return <HostRoom name={name.trim()} avatar={avatar ?? name.trim()} />
}
