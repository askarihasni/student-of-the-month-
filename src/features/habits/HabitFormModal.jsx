import { useEffect, useId, useRef, useState } from 'react';
import Modal from '../../components/common/Modal.jsx';
import { Field, SelectField, TextField, TextareaField } from '../../components/common/Fields.jsx';
import { buildHabit } from '../../state/factories.js';
import { useApp } from '../../context/AppContext.jsx';
import { HABIT_ICON_OPTIONS, habitIcon, WEEKDAY_INITIAL, WEEKDAY_SHORT } from './habitIcons.js';
import { cn } from '../../utils/cn.js';
import { weekdayLongName } from '../../utils/dates.js';

const QUICK = [
  { label: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] },
  { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
  { label: 'Weekends', days: [0, 6] },
];

function initialSchedule(habit) {
  if (!habit) return [0, 1, 2, 3, 4, 5, 6];
  if (habit.schedule === 'daily') return [0, 1, 2, 3, 4, 5, 6];
  return habit.schedule;
}

export default function HabitFormModal({ open, onClose, habit }) {
  const { dispatch, toast } = useApp();
  const ids = useId();
  const submittingRef = useRef(false);

  const [values, setValues] = useState(() => base(habit));
  const [days, setDays] = useState(() => initialSchedule(habit));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setValues(base(habit));
      setDays(initialSchedule(habit));
      setErrors({});
      submittingRef.current = false;
    }
  }, [open, habit]);

  const set = (key) => (e) => {
    setValues((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const toggleDay = (d) => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  const onSubmit = (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    const found = {};
    const name = values.name.trim();
    if (!name) found.name = 'Habit name is required.';
    else if (name.length > 200) found.name = 'Keep the name under 200 characters.';
    if (days.length === 0) found.schedule = 'Pick at least one weekday, or choose “Every day”.';
    setErrors(found);
    if (Object.keys(found).length) return;

    submittingRef.current = true;
    const record = buildHabit({ ...values, schedule: days }, habit || null);
    if (habit) {
      dispatch({ type: 'HABIT_UPDATE', id: habit.id, patch: record });
      toast('Habit updated.', 'success');
    } else {
      dispatch({ type: 'HABIT_ADD', habit: record });
      toast('Habit created — start the streak today.', 'success');
    }
    onClose();
  };

  const PreviewIcon = habitIcon(values.icon);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={habit ? 'Edit habit' : 'New habit'}
      description={
        habit
          ? 'Changes apply to future scheduling — existing completion history is preserved.'
          : 'Define a routine and its schedule. Streaks are calculated from this schedule.'
      }
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={`${ids}-form`} className="btn btn-primary">
            {habit ? 'Save changes' : 'Create habit'}
          </button>
        </>
      }
    >
      <form id={`${ids}-form`} onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="flex items-start gap-3">
          <span
            className="mt-7 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-3 text-accent"
            aria-hidden="true"
          >
            <PreviewIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <TextField
              id={`${ids}-name`}
              label="Habit name"
              required
              data-autofocus
              value={values.name}
              onChange={set('name')}
              error={errors.name}
              placeholder="e.g. Morning run"
              maxLength={220}
              autoComplete="off"
            />
          </div>
        </div>

        <TextareaField
          id={`${ids}-description`}
          label="Description"
          hint="Optional"
          rows={2}
          value={values.description}
          onChange={set('description')}
          placeholder="Why this habit matters…"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField id={`${ids}-icon`} label="Icon" value={values.icon} onChange={set('icon')}>
            {HABIT_ICON_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </SelectField>

          <TextField
            id={`${ids}-category`}
            label="Category"
            value={values.category}
            onChange={set('category')}
            placeholder="Health, Growth…"
            autoComplete="off"
          />

          <TextField
            id={`${ids}-target`}
            label="Target"
            hint="Optional, e.g. “20 pages” or “10 min”"
            value={values.target}
            onChange={set('target')}
            autoComplete="off"
          />

          <Field label="Reminder" htmlFor={`${ids}-reminder`} hint="Optional">
            <input
              id={`${ids}-reminder`}
              type="time"
              className="input"
              value={values.reminder || ''}
              onChange={set('reminder')}
            />
          </Field>
        </div>

        <fieldset>
          <legend className="label">Schedule</legend>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {QUICK.map((q) => {
              const active = q.days.length === days.length && q.days.every((d) => days.includes(d));
              return (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => setDays(q.days)}
                  className={cn(
                    'btn btn-sm cursor-pointer',
                    active ? 'btn-primary' : 'btn-secondary',
                  )}
                  aria-pressed={active}
                >
                  {q.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Days of the week">
            {WEEKDAY_INITIAL.map((initial, index) => {
              const active = days.includes(index);
              return (
                <button
                  key={`${initial}-${index}`}
                  type="button"
                  onClick={() => toggleDay(index)}
                  aria-pressed={active}
                  aria-label={weekdayLongName(index)}
                  title={weekdayLongName(index)}
                  className={cn(
                    'grid h-9 w-9 cursor-pointer place-items-center rounded-lg border text-xs font-semibold transition-colors',
                    active
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-line bg-surface-2 text-muted hover:border-line-strong',
                  )}
                >
                  {initial}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-faint">
            Selected: {days.length === 7 ? 'every day' : days.map((d) => WEEKDAY_SHORT[d]).join(', ') || 'none'} ·
            Unscheduled days are rest days and never break a streak.
          </p>
          {errors.schedule ? <span role="alert" className="field-error">{errors.schedule}</span> : null}
        </fieldset>
      </form>
    </Modal>
  );
}

function base(habit) {
  if (habit) {
    return {
      name: habit.name,
      description: habit.description || '',
      icon: habit.icon,
      category: habit.category || '',
      target: habit.target || '',
      reminder: habit.reminder || '',
    };
  }
  return { name: '', description: '', icon: 'circle', category: '', target: '', reminder: '' };
}
