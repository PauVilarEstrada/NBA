import { motion, type HTMLMotionProps } from 'framer-motion'
import clsx from 'clsx'
import type { ReactNode } from 'react'

interface Props extends Omit<HTMLMotionProps<'div'>, 'children'> {
  hover?: boolean
  sheen?: boolean
  padded?: boolean
  accent?: string
  children?: ReactNode
}

export function GlassCard({
  hover = false, sheen = false, padded = true, accent, className, children, ...rest
}: Props) {
  return (
    <motion.div
      className={clsx('glass rounded-2xl relative', hover && 'glass-hover',
        sheen && 'sheen', padded && 'p-5', className)}
      {...rest}
    >
      {accent && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
        />
      )}
      {children}
    </motion.div>
  )
}
