import { cn } from '@/lib/utils';

type DareLogoProps = {
  variant?: 'lockup' | 'mark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClasses = {
  sm: {
    mark: 'h-7 w-7',
    text: 'text-lg',
    gap: 'gap-2',
  },
  md: {
    mark: 'h-8 w-8',
    text: 'text-xl',
    gap: 'gap-2.5',
  },
  lg: {
    mark: 'h-11 w-11',
    text: 'text-3xl',
    gap: 'gap-3',
  },
};

export function DareLogo({ variant = 'lockup', size = 'md', className }: DareLogoProps) {
  const classes = sizeClasses[size];

  return (
    <span className={cn('inline-flex items-center text-foreground', classes.gap, className)}>
      <svg
        aria-hidden="true"
        viewBox="0 0 48 48"
        className={cn('shrink-0 text-brand-primary', classes.mark)}
        fill="none"
      >
        <path
          fill="currentColor"
          d="M6 6h18.6C34.4 6 42 13.9 42 24s-7.6 18-17.4 18H6V6Zm10.2 9.3v17.4h7.9c4.8 0 8-3.5 8-8.7s-3.2-8.7-8-8.7h-7.9Z"
        />
        <path
          fill="#050509"
          d="M31.7 8.4 16.1 26h8.1l-5 13.6 15.9-18.3h-8.4l5-12.9Z"
        />
      </svg>

      {variant === 'lockup' ? (
        <span className={cn('font-syne font-extrabold leading-none tracking-normal', classes.text)}>
          DARE
        </span>
      ) : null}
    </span>
  );
}
