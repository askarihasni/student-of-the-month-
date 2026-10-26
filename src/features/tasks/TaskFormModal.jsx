import { useEffect, useId, useRef, useState } from 'react';
import Modal from '../../components/common/Modal.jsx';
import { Field, SelectField, TextField, TextareaField } from '../../components/common/Fields.jsx';
import { PRIORITIES, STATUSES } from '../../data/defaults.js';
import { buildTask } from '../../state/factories.js';
import { useApp } from '../../context/AppContext.jsx';
import { categoryList } from './taskFilters.js';

const MAX_TITLE = 300;

function validate(values) {
  const errors = {};
  const title = (values.title || '').trim();
  if (!title) errors.title = 'Title is required.';
  else if (title.length > MAX_TITLE) errors.title = `Keep the title under ${MAX_TITLE} characters.`;

  if (values.dueTime && !values.dueDate) {
    errors.dueTime = 'Add a due date before setting a time.';
  }
  if (values.estimateMin !== '' && values.estimateMin != null) {
    const n = Number(values.estimateMin);
    if (!Number.isInteger(n) || n < 1 || n > 43200) {
      errors.estimateMin = 'Enter whole minutes between 1 and 43200 (30 days).';
    }
  }
  return errors;
}

/**
 * Create / edit task dialog with inline validation.
 * Submissions are guarded so double-clicks can never create duplicate records.
 */
export default function TaskFormModal({ open, onClose, task, defaultDueDate, defaultStatus }) {
  const { state, dispatch, toast } = useApp();
  const datalistId = useId();
  const submittingRef = useRef(false);

  const [values, setValues] = useState(() => initial(task, defaultDueDate, defaultStatus));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setValues(initial(task, defaultDueDate, defaultStatus));
      setErrors({});
      submittingRef.current = false;
    }
  }, [open, task, defaultDueDate, defaultStatus]);

  const set = (key) => (e) => {
    const v = e?.target ? e.target.value : e;
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const firstKey = Object.keys(found)[0];
      document.getElementById(`${datalistId}-${firstKey}`)?.focus();
      return;
    }
    submittingRef.current = true;
    const record = buildTask(values, task || null);
    if (task) {
      // Preserve completion timing when editing an already-completed task.
      if (task.status === 'Completed' && record.status !== 'Completed') record.completedAt = null;
      dispatch({ type: 'TASK_UPDATE', id: task.id, patch: record });
      toast('Task updated.', 'success');
    } else {
      dispatch({ type: 'TASK_ADD', task: record });
      toast('Task created.', 'success');
    }
    onClose();
  };

  const categories = categoryList(state.tasks);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? 'Edit task' : 'New task'}
      description={task ? 'Update the details of this task.' : 'Capture something you need to get done.'}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={`${datalistId}-form`} className="btn btn-primary">
            {task ? 'Save changes' : 'Create task'}
          </button>
        </>
      }
    >
      <form id={`${datalistId}-form`} onSubmit={onSubmit} noValidate className="space-y-4">
        <TextField
          id={`${datalistId}-title`}
          label="Title"
          required
          data-autofocus
          value={values.title}
          onChange={set('title')}
          error={errors.title}
          placeholder="e.g. Draft the project outline"
          maxLength={MAX_TITLE + 20}
          autoComplete="off"
        />

        <TextareaField
          id={`${datalistId}-description`}
          label="Description"
          hint="Optional — context, links, acceptance criteria."
          value={values.description}
          onChange={set('description')}
          error={errors.description}
          placeholder="Add details…"
          rows={3}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            id={`${datalistId}-priority`}
            label="Priority"
            value={values.priority}
            onChange={set('priority')}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </SelectField>

          <SelectField id={`${datalistId}-status`} label="Status" value={values.status} onChange={set('status')}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>

          <Field
            label="Due date"
            htmlFor={`${datalistId}-dueDate`}
            error={errors.dueDate}
            hint={task?.dueDate ? `Currently ${task.dueDate}` : 'Optional'}
          >
            <input
              id={`${datalistId}-dueDate`}
              type="date"
              className="input"
              value={values.dueDate || ''}
              onChange={set('dueDate')}
              aria-invalid={errors.dueDate ? 'true' : undefined}
            />
          </Field>

          <Field label="Due time" htmlFor={`${datalistId}-dueTime`} error={errors.dueTime} hint="Optional">
            <input
              id={`${datalistId}-dueTime`}
              type="time"
              className="input"
              value={values.dueTime || ''}
              onChange={set('dueTime')}
              aria-invalid={errors.dueTime ? 'true' : undefined}
            />
          </Field>

          <div className="relative">
            <TextField
              id={`${datalistId}-category`}
              label="Category"
              list={`${datalistId}-cats`}
              value={values.category}
              onChange={set('category')}
              error={errors.category}
              placeholder="Work, Study, Personal…"
              autoComplete="off"
            />
            <datalist id={`${datalistId}-cats`}>
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <TextField
            id={`${datalistId}-estimateMin`}
            label="Estimate (minutes)"
            type="number"
            min={1}
            max={43200}
            step={1}
            inputMode="numeric"
            value={values.estimateMin ?? ''}
            onChange={set('estimateMin')}
            error={errors.estimateMin}
            placeholder="e.g. 45"
          />
        </div>
      </form>
    </Modal>
  );
}

function initial(task, defaultDueDate, defaultStatus) {
  if (task) {
    return {
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate || '',
      dueTime: task.dueTime || '',
      category: task.category || '',
      estimateMin: task.estimateMin ?? '',
    };
  }
  return {
    title: '',
    description: '',
    priority: 'Medium',
    status: defaultStatus || 'To Do',
    dueDate: defaultDueDate || '',
    dueTime: '',
    category: '',
    estimateMin: '',
  };
}
