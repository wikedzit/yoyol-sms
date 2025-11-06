import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '~/lib/utils';

interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    };

    return (
      <div className="relative inline-flex">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={handleChange}
          className={cn(
            'peer h-4 w-4 shrink-0 rounded-sm border border-primary appearance-none cursor-pointer',
            'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'checked:bg-primary checked:border-primary',
            'transition-colors',
            className
          )}
          {...props}
        />
        <Check
          className={cn(
            'h-4 w-4 absolute top-0 left-0 text-primary-foreground pointer-events-none',
            'opacity-0 peer-checked:opacity-100 transition-opacity'
          )}
        />
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
