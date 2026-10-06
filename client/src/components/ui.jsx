import { LoaderCircle, X } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const cx = (...classes) => classes.filter(Boolean).join(' ');
export { cx };

const BUTTON_VARIANTS = {
  primary: 'bg-saffron-700 text-white hover:bg-saffron-800 shadow-sm disabled:bg-saffron-300',
  secondary: 'bg-white text-temple-800 border border-temple-200 hover:bg-temple-100 disabled:text-temple-400',
  ghost: 'text-temple-700 hover:bg-temple-100 disabled:text-temple-300',
  danger: 'bg-red-700 text-white hover:bg-red-800 disabled:bg-red-300',
  success: 'bg-emerald-700 text-white hover:bg-emerald-800 disabled:bg-emerald-300',
  dark: 'bg-temple-900 text-white hover:bg-temple-800 disabled:bg-temple-400',
};

const BUTTON_SIZES = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  xl: 'h-16 px-8 text-lg gap-3',
};

function buttonClass(variant = 'primary', size = 'md', className) {
  return cx(
    'inline-flex items-center justify-center rounded-lg font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron-600 whitespace-nowrap',
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className,
  );
}

export function Button({ variant, size, loading, icon: Icon, children, className, disabled, type = 'button', ...props }) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : Icon && <Icon className="size-4 shrink-0" />}
      {children}
    </button>
  );
}

export function LinkButton({ to, variant, size, icon: Icon, children, className, ...props }) {
  return (
    <Link to={to} className={buttonClass(variant, size, className)} {...props}>
      {Icon && <Icon className="size-4 shrink-0" />}
      {children}
    </Link>
  );
}

export function Card({ className, children, ...props }) {
  return (
    <div className={cx('card', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon: Icon, actions, className }) {
  return (
    <div className={cx('flex flex-wrap items-start justify-between gap-3 border-b border-temple-100 px-5 py-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-saffron-50 text-saffron-700">
            <Icon className="size-4" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="font-sans text-base font-semibold text-temple-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-temple-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const BADGE_TONES = {
  gray: 'bg-temple-100 text-temple-700 ring-temple-200',
  blue: 'bg-blue-50 text-blue-800 ring-blue-200',
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-900 ring-amber-200',
  red: 'bg-red-50 text-red-800 ring-red-200',
  saffron: 'bg-saffron-50 text-saffron-800 ring-saffron-200',
  violet: 'bg-violet-50 text-violet-800 ring-violet-200',
  dark: 'bg-temple-900 text-white ring-temple-900',
};

export function Badge({ tone = 'gray', icon: Icon, children, className }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
        BADGE_TONES[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3" />}
      {children}
    </span>
  );
}

export function Field({ label, error, hint, children, className, htmlFor }) {
  return (
    <div className={cx('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-temple-800">
          {label}
        </label>
      )}
      {children}
      {error ? <p className="text-xs font-medium text-red-700">{error}</p> : hint && <p className="text-xs text-temple-500">{hint}</p>}
    </div>
  );
}

export function Input({ className, ...props }) {
  return <input className={cx('input', className)} {...props} />;
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cx('input pr-8', className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }) {
  return <textarea className={cx('input min-h-24', className)} {...props} />;
}

export function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <label className={cx('flex items-start gap-3', disabled ? 'opacity-60' : 'cursor-pointer')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition',
          checked ? 'bg-saffron-700' : 'bg-temple-300',
        )}
      >
        <span className={cx('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', checked ? 'left-5.5' : 'left-0.5')} />
      </button>
      {(label || description) && (
        <span>
          <span className="block text-sm font-medium text-temple-900">{label}</span>
          {description && <span className="block text-xs text-temple-500">{description}</span>}
        </span>
      )}
    </label>
  );
}

export function Segmented({ options, value, onChange, className, size = 'md' }) {
  return (
    <div className={cx('inline-flex rounded-xl bg-temple-100 p-1', className)} role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cx(
            'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition',
            size === 'lg' ? 'px-5 py-2.5 text-base' : 'px-3 py-1.5 text-sm',
            value === option.value ? option.activeClass || 'bg-white text-temple-900 shadow-sm' : 'text-temple-600 hover:text-temple-900',
          )}
        >
          {option.icon && <option.icon className="size-4" />}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, onChange, min = 1, max = 10, size = 'md' }) {
  const big = size === 'lg';
  return (
    <div className="inline-flex items-center rounded-xl border border-temple-200 bg-white">
      <button
        type="button"
        className={cx(
          'grid place-items-center text-temple-700 hover:bg-temple-100 disabled:text-temple-300',
          big ? 'size-16 text-3xl' : 'size-10 text-xl',
        )}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease"
      >
        −
      </button>
      <span className={cx('text-center font-semibold', big ? 'w-16 text-3xl' : 'w-10 text-lg')}>{value}</span>
      <button
        type="button"
        className={cx(
          'grid place-items-center text-temple-700 hover:bg-temple-100 disabled:text-temple-300',
          big ? 'size-16 text-3xl' : 'size-10 text-xl',
        )}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}

export function Spinner({ className }) {
  return <LoaderCircle className={cx('size-5 animate-spin text-saffron-700', className)} />;
}

export function PageLoader({ label = 'Loading...' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-temple-500">
      <Spinner className="size-7" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, action, className }) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {Icon && (
        <span className="mb-3 grid size-12 place-items-center rounded-full bg-temple-100 text-temple-500">
          <Icon className="size-6" />
        </span>
      )}
      <p className="font-semibold text-temple-900">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-temple-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <span>{message}</span>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'saffron', children }) {
  const tones = {
    saffron: 'bg-saffron-50 text-saffron-700',
    green: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700',
    gray: 'bg-temple-100 text-temple-700',
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-temple-600">{label}</p>
        {Icon && (
          <span className={cx('grid size-9 place-items-center rounded-lg', tones[tone])}>
            <Icon className="size-5" />
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-semibold text-temple-900">{value}</p>
      {hint && <p className="mt-1 text-sm text-temple-500">{hint}</p>}
      {children}
    </Card>
  );
}

export function PageHeader({ title, subtitle, actions, badge }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl text-temple-900 sm:text-3xl">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="mt-1 text-temple-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-temple-950/50 p-4 sm:items-center" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={cx('card flex max-h-[90vh] w-full flex-col overflow-hidden shadow-xl', widths[size])}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-temple-100 px-5 py-4">
          <h2 className="font-sans text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-temple-500 hover:bg-temple-100" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-temple-100 bg-temple-50 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
