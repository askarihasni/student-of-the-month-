import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../../components/common/Modal.jsx';
import { Field, TextField, TextareaField } from '../../components/common/Fields.jsx';
import { buildGoal } from '../../state/factories.js';
import { isDateStr } from '../../utils/dates.js';
import { useApp } from '../../context/AppContext.jsx';

const MAX_TITLE = 300;

function validate(values) {
  const errors = {};
  const title = (values.title || '').trim();
  if (!title) errors.title = 'Title is required.';
  else if (title.length > MAX_TITLE) errors.title = `Keep the title under ${MAX_TITLE} characters.`;
  if (values.targetDate && !isDateStr(values.targetDate)) errors.targetDate = 'Pick a valid date.';
  return errors;
}

/** Create / edit goal dialog (milestones are managed inline on the card). */
export default function GoalFormModal({ open, onClose, goal }) {
  const { dispatch, toast } = useApp();
  const formId = useMemo(() => `goal-${Math.random().toString(36).slice(2, 9)}`, []);
  const submittingRef = useRef(false);
  const [values, setValues] = useState(() => initial(goal));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setValues(initial(goal));
      setErrors({});
      submittingRef.current = false;
    }
  }, [open, goal]);

  const set = (key) => (e) => {
    setValues((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    submittingRef.current = true;

    const record = buildGoal(values, goal || null);
    if (goal) {
      dispatch({ type: 'GOAL_UPDATE', id: goal.id, patch: record });
      toast('Goal updated.', 'success');
    } else {
      dispatch({ type: 'GOAL_ADD', goal: record });
      toast('Goal created — add milestones to start tracking progress.', 'success');
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={goal ? 'Edit goal' : 'New goal'}
      description={goal ? 'Update the goal details.' : 'Define the outcome — milestones define its progress.'}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={`${formId}-form`} className="btn btn-primary">
            {goal ? 'Save changes' : 'Create goal'}
          </button>
        </>
      }
    >
      <form id={`${formId}-form`} onSubmit={onSubmit} noValidate className="space-y-4">
        <TextField
          id={`${formId}-title`}
          label="Goal title"
          required
          data-autofocus
          value={values.title}
          onChange={set('title')}
          error={errors.title}
          placeholder="e.g. Launch my portfolio site"
          maxLength={MAX_TITLE + 20}
          autoComplete="off"
        />

        <TextareaField
          id={`${formId}-description`}
          label="Description"
          hint="Optional — why this matters, definition of done."
          value={values.description}
          onChange={set('description')}
          error={errors.description}
          placeholder="Add details…"
          rows={3}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Target date"
            htmlFor={`${formId}-targetDate`}
            error={errors.targetDate}
            hint="Optional — past dates flag the goal overdue."
          >
            <input
              id={`${formId}-targetDate`}
              type="date"
              className="input"
              value={values.targetDate || ''}
              onChange={set('targetDate')}
              aria-invalid={errors.targetDate ? 'true' : undefined}
            />
          </Field>

          <TextField
            id={`${formId}-category`}
            label="Category"
            value={values.category}
            onChange={set('category')}
            placeholder="Career, Health, Study…"
            autoComplete="off"
          />
        </div>
      </form>
    </Modal>
  );
}

function initial(goal) {
  if (goal) {
    return {
      title: goal.title,
      description: goal.description || '',
      targetDate: goal.targetDate || '',
      category: goal.category || '',
    };
  }
  return { title: '', description: '', targetDate: '', category: '' };
}
