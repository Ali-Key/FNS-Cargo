interface SparklineProps {
  data: number[]
  color: string
  width?: number
  height?: number
  className?: string
}

/**
 * Tiny inline-SVG sparkline — no chart library, so it's cheap to render one per
 * metric tile. Draws a soft area fill under a 2px line.
 */
export function Sparkline({ data, color, width = 96, height = 32, className }: SparklineProps) {
  if (data.length < 2) return <svg width={width} height={height} className={className} aria-hidden="true" />

  const max = Math.max(...data, 1)
  const min = Math.min(...data)
  const range = max - min || 1
  const stepX = width / (data.length - 1)
  const pad = 3

  const points = data.map((v, i) => {
    const x = i * stepX
    const y = pad + (height - pad * 2) * (1 - (v - min) / range)
    return [x, y] as const
  })

  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  const gradientId = `spark-${color.replace(/[^a-z0-9]/gi, '')}`

  return (
    <svg width={width} height={height} className={className} aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
