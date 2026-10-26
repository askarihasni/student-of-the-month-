import { useId } from 'react';
import { cn } from '../../utils/cn.js';

/**
 * Labelled form field with hint + error text.
 * Errors are announced (role="alert") and never signalled by colour alone —
 * they always carry explanatory text.
 */
export function Field({ label, htmlFor, hint, error, required, children, className }) {
  const hintId = `${htmlFor}-hint`;
  const errorId = `${htmlFor}-error`;
  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={htmlFor} className="label">
        {label}
        {required ? <span className="ml-0.5 text-danger" aria-hidden="true">*</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <span id={hintId} className="mt-1 block text-xs text-faint">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} role="alert" className="field-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/** Text input wrapped in a labelled Field. */
export function TextField({
  label,
  hint,
  error,
  required,
  className,
  id: idProp,
  ...inputProps
}) {
  const autoId = useId();
  const id = idProp || autoId;
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={required} className={className}>
      <input
        id={id}
        className="input"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        required={required}
        {...inputProps}
      />
    </Field>
  );
}

/** Select wrapped in a labelled Field. */
export function SelectField({ label, hint, error, required, className, children, id: idProp, ...selectProps }) {
  const autoId = useId();
  const id = idProp || autoId;
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={required} className={className}>
      <select
        id={id}
        className="select"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...selectProps}
      >
        {children}
      </select>
    </Field>
  );
}

/** Textarea wrapped in a labelled Field. */
export function TextareaField({ label, hint, error, className, id: idProp, ...areaProps }) {
  const autoId = useId();
  const id = idProp || autoId;
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} className={className}>
      <textarea id={id} className="textarea" aria-invalid={error ? 'true' : undefined} {...areaProps} />
    </Field>
  );
}
