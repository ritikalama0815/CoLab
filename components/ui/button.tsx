import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
        gradient:
          'border-0 bg-linear-to-r from-[oklch(0.52_0.22_300)] via-[oklch(0.55_0.24_305)] to-[oklch(0.5_0.2_285)] text-white shadow-lg shadow-[oklch(0.45_0.2_300_/_0.35)] transition-all hover:brightness-110 hover:shadow-xl hover:shadow-[oklch(0.45_0.2_300_/_0.45)] active:scale-[0.98] dark:from-[oklch(0.58_0.2_300)] dark:via-[oklch(0.62_0.22_305)] dark:to-[oklch(0.55_0.18_285)]',
        hero:
          'border-0 bg-linear-to-br from-primary via-[oklch(0.48_0.22_295)] to-[oklch(0.45_0.2_285)] text-primary-foreground shadow-xl shadow-primary/35 ring-1 ring-white/15 transition-all hover:brightness-105 hover:shadow-2xl hover:shadow-primary/25 active:scale-[0.98]',
        outlineGlow:
          'border-2 border-primary/40 bg-background/80 text-primary shadow-[0_0_20px_-5px_oklch(0.55_0.2_300_/_0.4)] backdrop-blur-sm transition-all hover:border-primary hover:bg-primary/5 hover:shadow-[0_0_28px_-4px_oklch(0.55_0.2_300_/_0.55)]',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
