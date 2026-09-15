"use client"

import {
  CheckCircle,
  Info,
  Spinner,
  Warning,
  XCircle,
} from "@phosphor-icons/react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CheckCircle className="size-4" weight="fill" />,
        info: <Info className="size-4" weight="fill" />,
        warning: <Warning className="size-4" weight="fill" />,
        error: <XCircle className="size-4" weight="fill" />,
        loading: <Spinner className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--color-charcoal-800)",
          "--normal-text": "var(--color-cream-50)",
          "--normal-border": "oklch(1 0 0 / 0.1)",
          "--border-radius": "var(--radius-md)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
