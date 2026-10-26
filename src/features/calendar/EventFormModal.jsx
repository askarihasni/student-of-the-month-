import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import Modal from '../../components/common/Modal.jsx';
import { Field, SelectField, TextField, TextareaField } from '../../components/common/Fields.jsx';
import { EVENT_CATEGORIES } from '../../data/defaults.js';
import { buildEvent } from '../../state/factories.js';
import { conflictsFor } from '../../state/selectors.js';
import { isDateStr, isTimeStr, formatTime } from '../../utils/dates.js';
import { categoryColor } from '../../utils/colors.js';
import { useApp } from '../../context/AppContext.jsx';

const MAX_TITLE = 300;

function validate(values) {
  const errors = {};
  const title = (values.title || '').trim();
  if (!title) errors.title = 'Title is required.';
  else if (title.length > MAX_TITLE) errors.title = `Keep the title under ${MAX_TITLE} characters.`;

  if (!values.date || !isDateStr(values.date)) errors.date = 'Pick a valid date.';
  if (!values.start || !isTimeStr(values.start)) errors.start = 'Pick a start time.';
  if (!values.end || !isTimeStr(values.end)) errors.end = 'Pick an end time.';
  if (isTimeStr(values.start) && isTimeStr(values.end) && values.end <= values.start) {
    errors.end = 'End time must be after the start time.';
  }
  return errors;
}

/**
 * Create / edit event dialog.
 *
 * Overlaps are checked live against the store with a boundary-exclusive rule:
 * an event that ends at 10:00 does not conflict with one starting at 10:00.
 * The first save attempt with a conflict only surfaces the warning; saving is
 * completed by an explicit second click ("Save anyway").
 */
export default function EventFormModal({ open, onClose, event, defaultDate, defaultStart, onDelete }) {
  const { state, dispatch, toast } = useApp();
  const formId = useMemo(() => `evt-${Math.random().toString(36).slice(2, 9)}`, []);
  const submittingRef = useRef(false);

  const [values, setValues] = useState(() => initial(event, defaultDate, defaultStart));
  const [errors, setErrors] = useState({});
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initial(event, defaultDate, defaultStart));
      setErrors({});
      setAcknowledged(false);
      submittingRef.current = false;
    }
  }, [open, event, defaultDate, defaultStart]);

  const set = (key) => (e) => {
    setValues((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    setAcknowledged(false);
  };

  const conflicts = useMemo(() => {
    if (!open || !values.date || !isTimeStr(values.start) || !isTimeStr(values.end) || values.end <= values.start) {
      return [];
    }
    return conflictsFor(state, {
      date: values.date,
      start: values.start,
      end: values.end,
      excludeId: event?.id ?? null,
    });
  }, [open, state, values.date, values.start, values.end, event]);

  const onSubmit = (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    if (conflicts.length > 0 && !acknowledged) {
      setAcknowledged(true);
      return;
    }

    submittingRef.current = true;
    const record = buildEvent(values, event || null);
    if (event) {
      dispatch({ type: 'EVENT_UPDATE', id: event.id, patch: record });
      toast('Event updated.', 'success');
    } else {
      dispatch({ type: 'EVENT_ADD', event: record });
      toast('Event added to your calendar.', 'success');
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event ? 'Edit event' : 'New event'}
      description={event ? 'Update this event — overlaps are re-checked on save.' : 'Block out time in your calendar.'}
      footer={
        <>
          {event && onDelete ? (
            <button type="button" className="btn btn-danger mr-auto" onClick={onDelete}>
              Delete
            </button>
          ) : null}
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={`${formId}-form`} className="btn btn-primary">
            {event ? (acknowledged && conflicts.length ? 'Save anyway' : 'Save changes') : acknowledged && conflicts.length ? 'Add anyway' : 'Add event'}
          </button>
        </>
      }
    >
      <form id={`${formId}-form`} onSubmit={onSubmit} noValidate className="space-y-4">
        <TextField
          id={`${formId}-title`}
          label="Title"
          required
          data-autofocus
          value={values.title}
          onChange={set('title')}
          error={errors.title}
          placeholder="e.g. Design review"
          maxLength={MAX_TITLE + 20}
          autoComplete="off"
        />

        <TextareaField
          id={`${formId}-description`}
          label="Description"
          hint="Optional — agenda, links, notes."
          value={values.description}
          onChange={set('description')}
          error={errors.description}
          placeholder="Add details…"
          rows={3}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date" htmlFor={`${formId}-date`} error={errors.date} required>
            <input
              id={`${formId}-date`}
              type="date"
              className="input"
              value={values.date || ''}
              onChange={set('date')}
              aria-invalid={errors.date ? 'true' : undefined}
            />
          </Field>

          <SelectField id={`${formId}-category`} label="Category" value={values.category} onChange={set('category')}>
            {EVENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>

          <Field label="Starts" htmlFor={`${formId}-start`} error={errors.start} required>
            <input
              id={`${formId}-start`}
              type="time"
              className="input"
              value={values.start}
              onChange={set('start')}
              aria-invalid={errors.start ? 'true' : undefined}
            />
          </Field>

          <Field
            label="Ends"
            htmlFor={`${formId}-end`}
            error={errors.end}
            required
            hint="Events ending exactly when another starts do not overlap."
          >
            <input
              id={`${formId}-end`}
              type="time"
              className="input"
              value={values.end}
              onChange={set('end')}
              aria-invalid={errors.end ? 'true' : undefined}
            />
          </Field>
        </div>

        {conflicts.length > 0 ? (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning-soft px-3.5 py-3"
          >
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <div className="min-w-0 text-sm">
              <p className="font-medium text-warning">
                Overlaps {conflicts.length} existing event{conflicts.length === 1 ? '' : 's'}
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-muted">
                {conflicts.map((c) => (
                  <li key={c.id}>
                    <span
                      className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                      style={{ backgroundColor: categoryColor(c.category) }}
                      aria-hidden="true"
                    />
                    {c.title} · {formatTime(c.start)}–{formatTime(c.end)}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-xs text-muted">
                {acknowledged
                  ? 'Press “Save” again to keep both events.'
                  : 'Press “Add/Save” once more to confirm anyway.'}
              </p>
            </div>
          </div>
        ) : null}
      </form>
    </Modal>
  );
}

function initial(event, defaultDate, defaultStart) {
  if (event) {
    return {
      title: event.title,
      description: event.description || '',
      date: event.date,
      start: event.start,
      end: event.end,
      category: event.category || 'Other',
    };
  }
  const start = defaultStart || '09:00';
  const [h, m] = start.split(':').map(Number);
  const endMin = Math.min(24 * 60 - 1, h * 60 + m + 60);
  const end = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
  return {
    title: '',
    description: '',
    date: defaultDate || '',
    start,
    end,
    category: 'Other',
  };
}
