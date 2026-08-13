import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

export function Spinner({ className, size = 20 }: { className?: string; size?: number }) {
  return <Loader2 className={cn('animate-spin text-signal-500', className)} size={size} />
}
