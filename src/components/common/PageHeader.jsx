import { cn } from '../../utils/cn.js';

/** Page heading with title, optional supporting text and action area. */
export default function PageHeader({ title, description, actions, className }) {
  return (
    <header className={cn('mb-5 flex flex-wrap items-start justify-between gap-3 sm:mb-6', className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-text sm:text-2xl">{title}</h1>
        {description ? <div className="mt-1 max-w-2xl text-sm text-muted">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
