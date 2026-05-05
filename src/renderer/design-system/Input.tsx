import { forwardRef, type InputHTMLAttributes } from 'react'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ style, ...rest }, ref) {
    return (
      <input
        ref={ref}
        style={{
          width: '100%',
          padding: '10px 14px',
          fontSize: 14,
          color: 'var(--text-primary)',
          background: 'var(--bg-elev-1)',
          border: '1px solid var(--border-glass)',
          borderRadius: 10,
          outline: 'none',
          fontFamily: 'inherit',
          backdropFilter: 'blur(20px)',
          transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
          ...style
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent-2)'
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79, 214, 255, 0.18)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-glass)'
          e.currentTarget.style.boxShadow = 'none'
        }}
        {...rest}
      />
    )
  }
)
