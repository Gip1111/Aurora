import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

type Elev = 1 | 2 | 3

interface GlassProps extends HTMLAttributes<HTMLDivElement> {
  elev?: Elev
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  glow?: boolean
  children?: ReactNode
}

const elevBg = (e: Elev): string =>
  e === 1 ? 'var(--bg-elev-1)' : e === 2 ? 'var(--bg-elev-2)' : 'var(--bg-elev-3)'
const elevBlur = (e: Elev): string =>
  e === 1 ? 'var(--blur-1)' : e === 2 ? 'var(--blur-2)' : 'var(--blur-3)'

const radius = {
  sm: '8px',
  md: '12px',
  lg: '18px',
  xl: '24px',
  full: '9999px'
}

export const Glass = forwardRef<HTMLDivElement, GlassProps>(function Glass(
  { elev = 2, rounded = 'lg', glow = false, style, className = '', children, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={className}
      style={{
        background: elevBg(elev),
        backdropFilter: `blur(${elevBlur(elev)}) saturate(140%)`,
        WebkitBackdropFilter: `blur(${elevBlur(elev)}) saturate(140%)`,
        border: '1px solid var(--border-glass)',
        borderRadius: radius[rounded],
        boxShadow: 'var(--shadow-glass)',
        animation: glow ? 'pulse-glow 2.4s ease-in-out infinite' : undefined,
        ...style
      }}
      {...rest}
    >
      {children}
    </div>
  )
})
