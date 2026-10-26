import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CirclePlus, Clock, ListChecks, CalendarDays } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import Segmented from '../../components/common/Segmented.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import EventFormModal from './EventFormModal.jsx';
import { agendaFor, eventsOn, taskDeadlinesOn } from '../../state/selectors.js';
import {
  addDays,
  formatLongDate,
  formatShortDate,
  formatTime,
  isDateStr,
  todayStr,
  weekOf,
} from '../../utils/dates.js';
import { categoryColor } from '../../utils/colors.js';
import { priorityTone } from '../../data/tones.js';
import { Badge } from '../../components/common/Badge.jsx';
import { useNewModalFlag } from '../../hooks/useNewModalFlag.js';

export default function CalendarPage() {
  const { state, dispatch, toast } = useApp();
  const today = todayStr();
  const [view, setView] = useState('week');
  const [cursor, setCursor] = useState(today);
  const [modal, setModal] = useState(null); // { event?, date?, start? }
  const [confirmEvent, setConfirmEvent] = useState(null);
  const [newFlag, clearNewFlag] = useNewModalFlag();

  useEffect(() => {
    if (newFlag) {
      setModal({ date: cursor });
      clearNewFlag();
    }
  }, [newFlag, clearNewFlag, cursor]);

  const safeCursor = isDateStr(cursor) ? cursor : today;
  const days = view === 'week' ? weekOf(safeCursor) : [safeCursor];

  const step = (dir) => {
    const amount = view === 'week' ? 7 * dir : dir;
    setCursor((c) => addDays(isDateStr(c) ? c : today, amount));
  };

  const goToday = () => setCursor(today);

  const editEvent = (event) => setModal({ event });
  const requestDelete = (event) => {
    setModal(null);
    setConfirmEvent(event);
  };

  const confirmDelete = () => {
    if (!confirmEvent) return;
    dispatch({ type: 'EVENT_DELETE', id: confirmEvent.id });
    setConfirmEvent(null);
    toast('Event deleted. Press Ctrl+Z to undo.', 'info');
  };

  const eventCount = state.events.length;
  const deadlineCount = state.tasks.filter((t) => t.status !== 'Completed' && t.dueDate).length;

  const rangeLabel =
    view === 'week'
      ? `${formatShortDate(days[0])} → ${formatShortDate(days[6])}`
      : formatLongDate(safeCursor);

  return (
    <>
      <PageHeader
        title="Calendar"
        description={
          <>
            {eventCount} event{eventCount === 1 ? '' : 's'} · {deadlineCount} open deadline
            {deadlineCount === 1 ? '' : 's'} — events and task due dates share this grid.
          </>
        }
        actions={
          <>
            <Segmented
              ariaLabel="Calendar view"
              value={view}
              onChange={setView}
              options={[
                { value: 'day', label: 'Day' },
                { value: 'week', label: 'Week' },
              ]}
            />
            <button type="button" className="btn btn-primary" onClick={() => setModal({ date: safeCursor })}>
              <CirclePlus className="h-4 w-4" aria-hidden="true" />
              New event
            </button>
          </>
        }
      />

      {/* ------------------------------- toolbar ------------------------------ */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="btn-icon border border-line"
            onClick={() => step(-1)}
            aria-label={view === 'week' ? 'Previous week' : 'Previous day'}
            title={view === 'week' ? 'Previous week' : 'Previous day'}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={goToday}>
            Today
          </button>
          <button
            type="button"
            className="btn-icon border border-line"
            onClick={() => step(1)}
            aria-label={view === 'week' ? 'Next week' : 'Next day'}
            title={view === 'week' ? 'Next week' : 'Next day'}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="text-sm font-medium text-text" aria-live="polite">
          {rangeLabel}
        </p>
      </div>

      {/* -------------------------------- content ----------------------------- */}
      {view === 'week' ? (
        <WeekGrid
          days={days}
          today={today}
          state={state}
          onOpenDay={(d) => {
            setCursor(d);
            setView('day');
          }}
          onEventClick={editEvent}
          onAdd={(d) => setModal({ date: d })}
        />
      ) : (
        <DayColumn
          date={safeCursor}
          today={today}
          state={state}
          onEventClick={editEvent}
          onAdd={(d, start) => setModal({ date: d, start })}
        />
      )}

      <EventFormModal
        open={modal !== null}
        onClose={() => setModal(null)}
        event={modal?.event}
        defaultDate={modal?.date ?? modal?.event?.date ?? safeCursor}
        defaultStart={modal?.start}
        onDelete={modal?.event ? () => requestDelete(modal.event) : undefined}
      />

      <ConfirmDialog
        open={confirmEvent !== null}
        danger
        title="Delete event?"
        message={`“${confirmEvent?.title ?? ''}” will be removed from your calendar. You can undo this right afterwards with Ctrl+Z.`}
        confirmLabel="Delete event"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmEvent(null)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Week view                                                           */
/* ------------------------------------------------------------------ */
function WeekGrid({ days, today, state, onOpenDay, onEventClick, onAdd }) {
  return (
    <div className="overflow-x-auto pb-2 scrollbar-thin">
      <div className="grid min-w-[42rem] grid-cols-7 gap-2" role="grid" aria-label="Week view">
        {days.map((date) => {
          const events = eventsOn(state, date);
          const deadlines = taskDeadlinesOn(state, date);
          const isToday = date === today;
          const dt = new Date(`${date}T00:00:00`);

          return (
            <div
              key={date}
              role="gridcell"
              aria-label={`${formatLongDate(date)}, ${events.length} events, ${deadlines.length} deadlines`}
              className={`card flex min-h-[15rem] flex-col p-2.5 ${isToday ? 'border-accent/50 ring-1 ring-accent/30' : ''}`}
            >
              <div className="mb-2 flex items-center justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-[0.6875rem] font-semibold tracking-wider text-faint uppercase">
                    {dt.toLocaleDateString(undefined, { weekday: 'short' })}
                  </p>
                  <p className={`text-sm font-semibold ${isToday ? 'text-accent' : 'text-text'}`}>
                    {dt.getDate()}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-icon-sm text-faint hover:text-accent"
                  onClick={() => onAdd(date)}
                  aria-label={`Add event on ${formatLongDate(date)}`}
                  title="Add event"
                >
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onOpenDay(date)}
                className="mb-2 cursor-pointer text-left text-xs text-muted hover:text-accent"
              >
                Open day →
              </button>

              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {events.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onEventClick(e)}
                    className="flex min-w-0 items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-1.5 py-1 text-left transition-colors hover:border-line-strong hover:bg-surface-3"
                    title={`${e.title} · ${formatTime(e.start)}–${formatTime(e.end)}`}
                  >
                    <span
                      className="h-3 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: categoryColor(e.category) }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-text">{e.title}</span>
                    <span className="shrink-0 text-[0.625rem] text-faint tabular-nums">{e.start}</span>
                  </button>
                ))}

                {deadlines.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className="flex min-w-0 items-center gap-1.5 rounded-lg border border-dashed border-line px-1.5 py-1"
                    title={`${t.title} — task deadline${t.dueTime ? ` at ${t.dueTime}` : ''}`}
                  >
                    <ListChecks className="h-3 w-3 shrink-0 text-faint" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-xs text-muted">{t.title}</span>
                    {t.dueTime ? (
                      <span className="shrink-0 text-[0.625rem] text-faint tabular-nums">{t.dueTime}</span>
                    ) : null}
                  </div>
                ))}
                {deadlines.length > 3 ? (
                  <p className="text-[0.625rem] text-faint">+{deadlines.length - 3} more deadlines</p>
                ) : null}

                {events.length === 0 && deadlines.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => onAdd(date)}
                    className="flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-dashed border-line px-2 py-3 text-xs text-faint transition-colors hover:border-accent/40 hover:text-accent"
                  >
                    + Add
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-faint lg:hidden">Scroll sideways to see the full week.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Day view                                                            */
/* ------------------------------------------------------------------ */
function DayColumn({ date, today, state, onEventClick, onAdd }) {
  const agenda = useMemo(() => agendaFor(state, date), [state, date]);
  const [dragHour, setDragHour] = useState(null); // reserved for future snapping

  const hours = Array.from({ length: 24 }, (_, h) => h);
  const eventByHour = new Map();
  for (const e of agenda.events) {
    const h = Number(e.start.slice(0, 2));
    if (!eventByHour.has(h)) eventByHour.set(h, []);
    eventByHour.get(h).push(e);
  }
  const deadlineByHour = new Map();
  for (const d of agenda.deadlines) {
    if (!d.start) continue;
    const h = Number(d.start.slice(0, 2));
    if (!deadlineByHour.has(h)) deadlineByHour.set(h, []);
    deadlineByHour.get(h).push(d);
  }

  const isToday = date === today;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[16rem_1fr]">
      {/* all-day + deadlines summary */}
      <aside className="space-y-4">
        <section className="card p-4" aria-label="Task deadlines for this day">
          <h2 className="section-title mb-2.5 flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-accent" aria-hidden="true" />
            Deadlines
          </h2>
          {agenda.allDay.length === 0 && agenda.timed.filter((i) => i.kind === 'task').length === 0 ? (
            <p className="text-sm text-muted">No task deadlines on this date.</p>
          ) : (
            <ul className="space-y-2">
              {agenda.allDay.map((item) => (
                <li key={`task-${item.id}`} className="rounded-xl border border-line bg-surface-2 px-3 py-2">
                  <p className="truncate text-sm font-medium text-text">{item.title}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                    No time set
                    <Badge tone={priorityTone[item.priority]}>{item.priority}</Badge>
                  </p>
                </li>
              ))}
              {agenda.timed
                .filter((i) => i.kind === 'task')
                .map((item) => (
                  <li key={`task-${item.id}`} className="rounded-xl border border-line bg-surface-2 px-3 py-2">
                    <p className="truncate text-sm font-medium text-text">{item.title}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                      Due {formatTime(item.start)}
                      <Badge tone={priorityTone[item.priority]}>{item.priority}</Badge>
                    </p>
                  </li>
                ))}
            </ul>
          )}
        </section>

        <section className="card p-4" aria-label="Legend">
          <h2 className="section-title mb-2.5">How this day works</h2>
          <ul className="space-y-1.5 text-xs leading-relaxed text-muted">
            <li>• Solid blocks are calendar events (click to edit).</li>
            <li>• Dashed rows are task deadlines from Tasks.</li>
            <li>• Events that end where another begins don't count as overlaps.</li>
          </ul>
        </section>
      </aside>

      {/* hour timeline */}
      <section className="card overflow-hidden" aria-label={`Timeline for ${formatLongDate(date)}`}>
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
            <CalendarDays className="h-4 w-4 text-accent" aria-hidden="true" />
            {formatLongDate(date)}
            {isToday ? <Badge tone="accent">Today</Badge> : null}
          </h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onAdd(date)}>
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Add at time
          </button>
        </header>

        <div className="max-h-[34rem] overflow-y-auto scrollbar-thin">
          {hours.map((h) => {
            const hourEvents = eventByHour.get(h) ?? [];
            const hourDeadlines = deadlineByHour.get(h) ?? [];
            const empty = hourEvents.length === 0 && hourDeadlines.length === 0;
            return (
              <div
                key={h}
                className={`group flex min-h-[3rem] border-b border-line/60 last:border-b-0 ${
                  dragHour === h ? 'bg-accent-soft/40' : ''
                }`}
                onMouseEnter={() => setDragHour(h)}
              >
                <div className="w-16 shrink-0 border-r border-line px-2 py-2 text-right text-xs text-faint tabular-nums">
                  {String(h).padStart(2, '0')}:00
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-2.5 py-1.5">
                  {hourEvents.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => onEventClick(e)}
                      className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-opacity hover:opacity-85"
                      style={{
                        backgroundColor: `${categoryColor(e.category)}22`,
                        borderLeft: `3px solid ${categoryColor(e.category)}`,
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{e.title}</span>
                      <span className="shrink-0 text-xs text-muted tabular-nums">
                        {formatTime(e.start)}–{formatTime(e.end)}
                      </span>
                    </button>
                  ))}
                  {hourDeadlines.map((item) => (
                    <div
                      key={`dl-${item.id}`}
                      className="flex min-w-0 items-center gap-2 rounded-lg border border-dashed border-line bg-surface-2 px-2 py-1.5"
                    >
                      <ListChecks className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-sm text-muted">{item.title}</span>
                      <span className="shrink-0 text-xs text-faint">deadline {formatTime(item.start)}</span>
                    </div>
                  ))}
                  {empty ? (
                    <button
                      type="button"
                      onClick={() => onAdd(date, `${String(h).padStart(2, '0')}:00`)}
                      className="flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-transparent py-1 text-xs text-transparent transition-colors group-hover:border-line group-hover:text-faint focus-visible:border-accent focus-visible:text-accent"
                      aria-label={`Add an event starting at ${String(h).padStart(2, '0')}:00`}
                    >
                      + Add event
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {agenda.items.length === 0 ? (
        <div className="lg:col-span-2">
          <EmptyState
            icon={CalendarDays}
            title="Nothing on this day"
            description="No events and no task deadlines fall on this date. Add an event to block out time."
            action={
              <button type="button" className="btn btn-primary" onClick={() => onAdd(date)}>
                <CirclePlus className="h-4 w-4" aria-hidden="true" />
                Add an event
              </button>
            }
          />
        </div>
      ) : null}
    </div>
  );
}
