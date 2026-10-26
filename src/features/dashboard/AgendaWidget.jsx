import { useNavigate } from 'react-router-dom';
import { CalendarDays, CircleAlert, Clock, ListChecks } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { agendaFor } from '../../state/selectors.js';
import { formatTime, todayStr } from '../../utils/dates.js';
import { categoryColor } from '../../utils/colors.js';
import { priorityTone } from '../../data/tones.js';
import { Badge } from '../../components/common/Badge.jsx';

/** Today's agenda: real events plus real task deadlines, merged by time. */
export default function AgendaWidget() {
  const { state } = useApp();
  const navigate = useNavigate();
  const today = todayStr();
  const agenda = agendaFor(state, today);

  if (agenda.items.length === 0) {
    return (
      <EmptyState
        compact
        icon={CalendarDays}
        title="Nothing scheduled today"
        description="Add an event or give a task a due date to fill your agenda."
        action={
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/calendar?new=1')}>
            Schedule an event
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-2.5">
      {agenda.allDay.map((item) => (
        <div
          key={`${item.kind}-${item.id}`}
          className="flex items-center gap-2.5 rounded-xl border border-dashed border-line bg-surface-2 px-3 py-2"
        >
          <ListChecks className="h-4 w-4 shrink-0 text-faint" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text">{item.title}</p>
            <p className="text-xs text-muted">Deadline · no specific time</p>
          </div>
          <Badge tone={priorityTone[item.priority]}>{item.priority}</Badge>
        </div>
      ))}

      {agenda.timed.map((item) => (
        <button
          key={`${item.kind}-${item.id}`}
          type="button"
          onClick={() => navigate(item.kind === 'event' ? '/calendar' : '/tasks')}
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-left transition-colors hover:border-line-strong hover:bg-surface-3"
        >
          <span className="flex w-16 shrink-0 items-center gap-1.5 text-xs font-semibold text-muted tabular-nums">
            <Clock className="h-3.5 w-3.5 text-faint" aria-hidden="true" />
            {formatTime(item.start)}
          </span>
          <span
            className="h-8 w-1 shrink-0 rounded-full"
            style={{ backgroundColor: categoryColor(item.category) }}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-text">{item.title}</span>
            <span className="flex items-center gap-1 text-xs text-muted">
              {item.kind === 'event' ? (
                <>
                  {item.category} event · ends {formatTime(item.end)}
                </>
              ) : (
                <>
                  <CircleAlert className="h-3 w-3 text-danger" aria-hidden="true" />
                  Task deadline · {item.priority} priority
                </>
              )}
            </span>
          </span>
          <span className="chip shrink-0">{item.kind === 'event' ? 'Event' : 'Task'}</span>
        </button>
      ))}
    </div>
  );
}
