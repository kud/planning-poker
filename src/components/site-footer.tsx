import { SupportLink } from "@/components/support-link"
import { cn } from "@/lib/utils"

const TONES = {
  dark: "text-slate-500 [&_a:hover]:text-slate-300",
  light: "text-slate-500 [&_a:hover]:text-slate-800",
}

// Who makes this and where to get help: one quiet line at the foot of a page.
// A div inside, never a <p>, because the support dialog renders in it.
export const SiteFooter = ({
  tone = "dark",
  className,
}: {
  tone?: keyof typeof TONES
  className?: string
}) => (
  <footer
    className={cn(
      "px-4 text-center text-xs [&_a]:cursor-pointer [&_a]:underline-offset-4 [&_a]:transition-colors [&_a:hover]:underline",
      TONES[tone],
      className,
    )}
  >
    <div>
      Made by <a href="https://beansontoast.app">beansontoast.app</a> ·{" "}
      <SupportLink /> ·{" "}
      <a
        href="https://github.com/kud/planning-poker"
        target="_blank"
        rel="noreferrer"
      >
        GitHub
      </a>
    </div>
  </footer>
)
