import { CircleAlert, CircleCheckBig, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';

const TONES = {
  success: { cls: 'text-success border-success/30 bg-success-soft', Icon: CircleCheckBig },
  error: { cls: 'text-danger border-danger/30 bg-danger-soft', Icon: CircleAlert },
  info: { cls: 'text-info border-info/30 bg-info-soft', Icon: Info },
};

/** Toast notifications (success / error / info), rendered above everything. */
export default function Toasts() {
  const { toasts, dismissToast } = useApp();

  return (
    <div
      className="pointer-events-none fixed inset-x-3 bottom-20 z-[60] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-80"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => {
        const tone = TONES[t.type] || TONES.success;
        const Icon = tone.Icon;
        return (
          <div
            key={t.id}
            className={`slide-up pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-lg backdrop-blur ${tone.cls}`}
            role={t.type === 'error' ? 'alert' : 'status'}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="flex-1 text-sm leading-snug text-text">{t.message}</p>
            <button
              type="button"
              className="btn-icon-sm -my-1 -mr-1 h-6 w-6"
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
