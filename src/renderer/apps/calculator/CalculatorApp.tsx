import { useState, useEffect } from 'react'

const KEYS: { label: string; value?: string; op?: string; span?: number; variant?: 'op' | 'eq' | 'clr' | 'num' }[][] = [
  [
    { label: 'C', op: 'C', variant: 'clr' },
    { label: '±', op: '+/-', variant: 'clr' },
    { label: '%', op: '%', variant: 'clr' },
    { label: '÷', op: '/', variant: 'op' }
  ],
  [
    { label: '7', value: '7' },
    { label: '8', value: '8' },
    { label: '9', value: '9' },
    { label: '×', op: '*', variant: 'op' }
  ],
  [
    { label: '4', value: '4' },
    { label: '5', value: '5' },
    { label: '6', value: '6' },
    { label: '−', op: '-', variant: 'op' }
  ],
  [
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
    { label: '+', op: '+', variant: 'op' }
  ],
  [
    { label: '0', value: '0', span: 2 },
    { label: '.', value: '.' },
    { label: '=', op: '=', variant: 'eq' }
  ]
]

export function CalculatorApp(): JSX.Element {
  const [expr, setExpr] = useState('')
  const [display, setDisplay] = useState('0')
  const [last, setLast] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key >= '0' && e.key <= '9') push(e.key)
      else if (e.key === '.') push('.')
      else if (['+', '-', '*', '/'].includes(e.key)) push('', e.key)
      else if (e.key === 'Enter' || e.key === '=') evaluate()
      else if (e.key === 'Escape' || e.key === 'c') clear()
      else if (e.key === 'Backspace') {
        setExpr((x) => x.slice(0, -1))
        setDisplay((x) => (x.length > 1 ? x.slice(0, -1) : '0'))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const push = (v?: string, op?: string): void => {
    if (op === 'C') return clear()
    if (op === '+/-') {
      setExpr((x) => (x.startsWith('-') ? x.slice(1) : '-' + x))
      setDisplay((x) => (x.startsWith('-') ? x.slice(1) : '-' + x))
      return
    }
    if (op === '%') {
      try {
        const n = Number(expr || display)
        const r = String(n / 100)
        setExpr(r)
        setDisplay(r)
      } catch {
        // ignore
      }
      return
    }
    if (op === '=') return evaluate()
    if (op) {
      setExpr((x) => (x ? x + op : display + op))
      setDisplay('0')
      return
    }
    if (v !== undefined) {
      setDisplay((x) => (x === '0' && v !== '.' ? v : x + v))
      setExpr((x) => x + v)
    }
  }

  const evaluate = (): void => {
    if (!expr) return
    try {
      // sanitize for Function: only digits, operators, decimal, parens
      if (!/^[0-9+\-*/.() ]+$/.test(expr)) {
        setDisplay('Errore')
        return
      }
      const result = new Function(`return (${expr})`)() as number
      const rounded = Number.isFinite(result) ? String(Number(result.toPrecision(12))) : 'Errore'
      setLast(`${expr} = ${rounded}`)
      setDisplay(rounded)
      setExpr(rounded)
    } catch {
      setDisplay('Errore')
    }
  }

  const clear = (): void => {
    setExpr('')
    setDisplay('0')
    setLast(null)
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(0,0,0,0.25)'
      }}
    >
      <div
        style={{
          flex: 1,
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'flex-end',
          gap: 6
        }}
      >
        {last && (
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {last}
          </div>
        )}
        <div
          style={{
            fontSize: display.length > 12 ? 28 : 44,
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 300,
            color: 'var(--text-primary)',
            wordBreak: 'break-all',
            textAlign: 'right',
            minHeight: 56,
            transition: 'font-size 0.15s ease'
          }}
        >
          {display}
        </div>
      </div>
      <div
        style={{
          padding: 14,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10
        }}
      >
        {KEYS.flatMap((row) =>
          row.map((k, i) => (
            <button
              key={`${k.label}-${i}`}
              onClick={() => push(k.value, k.op)}
              style={{
                gridColumn: k.span ? `span ${k.span}` : undefined,
                height: 56,
                fontSize: 18,
                fontWeight: 500,
                color: k.variant === 'eq' ? '#0b0b14' : 'var(--text-primary)',
                background:
                  k.variant === 'eq'
                    ? 'var(--gradient-aurora)'
                    : k.variant === 'op'
                    ? 'rgba(176,124,255,0.18)'
                    : k.variant === 'clr'
                    ? 'var(--bg-elev-1)'
                    : 'var(--bg-elev-2)',
                border: '1px solid var(--border-glass)',
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'transform 0.12s var(--ease-spring), background 0.18s ease'
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {k.label}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
