import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'glass' | 'aurora' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  children?: ReactNode
}

const sizes = {
  sm: { padding: '6px 10px', fontSize: 12, height: 28 },
  md: { padding: '8px 14px', fontSize: 13, height: 36 },
  lg: { padding: '12px 20px', fontSize: 15, height: 44 }
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'glass', size = 'md', icon, children, style, ...rest },
  ref
) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    border: '1px solid var(--border-glass)',
    borderRadius: 10,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: 500,
    color: 'var(--text-primary)',
    transition: 'transform 0.18s var(--ease-spring), background 0.2s ease, border-color 0.2s ease',
    ...sizes[size]
  }

  const variants: Record<string, React.CSSProperties> = {
    glass: {
      background: 'var(--bg-elev-2)',
      backdropFilter: 'blur(24px) saturate(140%)'
    },
    aurora: {
      background: 'var(--gradient-aurora)',
      border: 'none',
      color: '#0b0b14',
      fontWeight: 600
    },
    ghost: { background: 'transparent', border: '1px solid transparent' },
    danger: {
      background: 'rgba(255, 80, 100, 0.18)',
      border: '1px solid rgba(255, 80, 100, 0.45)',
      color: '#ffb3bf'
    }
  }

  return (
    <button
      ref={ref}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
})
