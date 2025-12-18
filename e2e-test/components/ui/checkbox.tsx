'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          'h-5 w-5 shrink-0 rounded-md border-2 transition-all duration-150 flex items-center justify-center',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked
            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
            : 'bg-white border-gray-300 hover:border-gray-400',
          className,
        )}
        data-state={checked ? 'checked' : 'unchecked'}
      >
        {checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
      </button>
    )
  },
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
