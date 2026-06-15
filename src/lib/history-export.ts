import { HistoryEntry } from "@/lib/types"

const escapeCsv = (field: string) =>
  /[",\n]/.test(field) ? `"${field.replace(/"/g, '""')}"` : field

export const toMarkdown = (history: HistoryEntry[]) => {
  if (history.length === 0) return ""
  const rows = history.map((e) => {
    const title = e.title || "Untitled"
    const label = e.url ? `[${title}](${e.url})` : title
    return `| ${label} | ${e.estimate} |`
  })
  return ["| Topic | Estimate |", "| --- | --- |", ...rows].join("\n")
}

const isoDate = (ms: number) => {
  const date = new Date(ms)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString()
}

export const toCsv = (history: HistoryEntry[]) => {
  const header = "Topic,Link,Estimate,Date"
  const rows = history.map((e) =>
    [
      escapeCsv(e.title || "Untitled"),
      escapeCsv(e.url ?? ""),
      escapeCsv(e.estimate),
      escapeCsv(isoDate(e.at)),
    ].join(","),
  )
  return [header, ...rows].join("\n")
}
