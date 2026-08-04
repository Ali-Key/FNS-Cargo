import { cn } from '@/utils/cn'
import { initials } from '@/utils/format'

type Size = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_STYLES: Record<Size, string> = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
  xl: 'h-24 w-24 text-2xl',
}

interface AvatarProps {
  name?: string | null
  src?: string | null
  size?: Size
  className?: string
}

/** Initials chip, or the profile photo when one is set. Used anywhere a person is referenced. */
export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-300 bg-navy-100 font-bold uppercase text-navy-700',
        SIZE_STYLES[size],
        className,
      )}
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initials(name)}
    </span>
  )
}
