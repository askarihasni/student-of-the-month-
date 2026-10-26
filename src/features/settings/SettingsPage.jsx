import { useMemo, useRef, useState } from 'react';
import {
  CircleAlert,
  CircleCheck,
  Download,
  Moon,
  RotateCcw,
  Sun,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Segmented from '../../components/common/Segmented.jsx';
import { Field } from '../../components/common/Fields.jsx';
import { buildInitialState, serializeState } from '../../state/reducer.js';
import { createSampleData } from '../../data/sampleData.js';
import { SETTINGS_LIMITS, SCHEMA_VERSION, validateNumericSetting } from '../../data/defaults.js';
import { parseBackupText, triggerBackupDownload, validateBackup } from '../../utils/backup.js';

const NUMERIC_FIELDS = [
  {
    key: 'focusMinutes',
    label: 'Focus length (minutes)',
    hint: 'Length of a full focus session.',
  },
  {
    key: 'shortBreakMinutes',
    label: 'Short break (minutes)',
    hint: 'Break between focus sessions.',
  },
  {
    key: 'longBreakMinutes',
    label: 'Long break (minutes)',
    hint: 'Longer break after a full cycle.',
  },
  {
    key: 'dailyFocusGoalMin',
    label: 'Daily focus goal (minutes)',
    hint: 'Target for total focused minutes per day.',
  },
  {
    key: 'pomodoroCycles',
    label: 'Cycles before a long break',
    hint: 'How many focus sessions trigger a long break.',
  },
];

export default function SettingsPage() {
  const { state, dispatch, toast } = useApp();
  const { prefs } = state;
  const fileInputRef = useRef(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [importErrors, setImportErrors] = useState(null);
  const [importName, setImportName] = useState('');

  const counts = useMemo(
    () => ({
      tasks: state.tasks.length,
      habits: state.habits.length,
      events: state.events.length,
      sessions: state.sessions.length,
      goals: state.goals.length,
    }),
    [state],
  );

  const setPref = (key, value) => dispatch({ type: 'PREFS_UPDATE', patch: { [key]: value } });

  const onNumericChange = (key) => (e) => {
    const raw = e.target.value;
    if (raw === '') {
      setPref(key, '');
      return;
    }
    const result = validateNumericSetting(key, raw);
    if (result.ok) setPref(key, result.value);
    else setPref(key, raw);
  };

  const numericError = (key) => {
    const value = prefs[key];
    if (value === '' || value == null) return 'Enter a value.';
    const result = validateNumericSetting(key, value);
    return result.ok ? undefined : result.error;
  };

  const exportBackup = () => {
    const ok = triggerBackupDownload(state);
    if (ok) toast('Backup downloaded as JSON.', 'success');
    else toast('Could not start the download in this environment.', 'error');
  };

  const onImportClick = () => fileInputRef.current?.click();

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-choosing the same file
    if (!file) return;
    setImportErrors(null);

    let text;
    try {
      text = await file.text();
    } catch {
      setImportErrors(['Could not read that file.']);
      toast('Import failed — the file could not be read.', 'error');
      return;
    }

    const parsed = parseBackupText(text);
    if (!parsed.ok) {
      setImportErrors(parsed.errors);
      toast('Import failed — that file is not valid JSON.', 'error');
      return;
    }

    const checked = validateBackup(parsed.value);
    if (!checked.ok) {
      setImportErrors(checked.errors);
      toast('Import failed — the backup was rejected. Your existing data is untouched.', 'error');
      return;
    }

    // Atomic: validated data replaces the whole record set in one dispatch.
    dispatch({ type: 'STATE_IMPORT', data: checked.data });
    setImportName(file.name);
    setImportErrors(null);
    toast('Backup imported successfully.', 'success');
  };

  const doReset = () => {
    const data = serializeState(buildInitialState(createSampleData()));
    dispatch({ type: 'STATE_RESET', data });
    setConfirmReset(false);
    setImportErrors(null);
    toast('Reset to sample data.', 'success');
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Preferences, backup and restore. Everything here is stored locally in your browser — there is no account and no server."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* ------------------------------ appearance ---------------------- */}
        <section className="card p-4 sm:p-5" aria-label="Appearance">
          <h2 className="section-title">Appearance</h2>
          <p className="mt-1 mb-3 text-sm text-muted">
            Theme applies instantly and is remembered across refreshes.
          </p>
          <Segmented
            ariaLabel="Theme"
            value={prefs.theme}
            onChange={(v) => dispatch({ type: 'THEME_SET', theme: v })}
            options={[
              { value: 'dark', label: 'Dark', icon: Moon },
              { value: 'light', label: 'Light', icon: Sun },
            ]}
          />

          <div className="mt-4 border-t border-line pt-4">
            <button
              type="button"
              role="switch"
              aria-checked={prefs.soundEnabled}
              onClick={() => setPref('soundEnabled', !prefs.soundEnabled)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-medium text-text">
                  {prefs.soundEnabled ? (
                    <Volume2 className="h-4 w-4 text-accent" aria-hidden="true" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-faint" aria-hidden="true" />
                  )}
                  Completion chime
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  Play a short sound when a focus session finishes.
                </span>
              </span>
              <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  prefs.soundEnabled ? 'bg-accent' : 'bg-surface-3'
                }`}
                aria-hidden="true"
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    prefs.soundEnabled ? 'left-[1.375rem]' : 'left-0.5'
                  }`}
                />
              </span>
            </button>
          </div>
        </section>

        {/* -------------------------------- focus ------------------------- */}
        <section className="card p-4 sm:p-5" aria-label="Focus preferences">
          <h2 className="section-title">Focus & Pomodoro</h2>
          <p className="mt-1 mb-4 text-sm text-muted">
            Durations are validated before they are saved — invalid entries are flagged, never silently applied.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {NUMERIC_FIELDS.map((field) => (
              <Field
                key={field.key}
                label={field.label}
                htmlFor={`pref-${field.key}`}
                hint={`${field.hint} Range ${SETTINGS_LIMITS[field.key].min}–${SETTINGS_LIMITS[field.key].max}.`}
                error={numericError(field.key)}
              >
                <input
                  id={`pref-${field.key}`}
                  type="number"
                  className="input"
                  min={SETTINGS_LIMITS[field.key].min}
                  max={SETTINGS_LIMITS[field.key].max}
                  step={1}
                  inputMode="numeric"
                  value={prefs[field.key] ?? ''}
                  onChange={onNumericChange(field.key)}
                  aria-invalid={numericError(field.key) ? 'true' : undefined}
                />
              </Field>
            ))}
          </div>
        </section>

        {/* ------------------------------- backup ------------------------- */}
        <section className="card p-4 sm:p-5" aria-label="Backup and restore">
          <h2 className="section-title">Backup & restore</h2>
          <p className="mt-1 mb-4 text-sm text-muted">
            Export a complete JSON snapshot, or restore one. Imports are validated strictly and applied
            atomically — a rejected file never touches your current data.
          </p>

          <ul className="mb-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <Count label="Tasks" value={counts.tasks} />
            <Count label="Habits" value={counts.habits} />
            <Count label="Events" value={counts.events} />
            <Count label="Sessions" value={counts.sessions} />
            <Count label="Goals" value={counts.goals} />
            <Count label="Schema" value={`v${SCHEMA_VERSION}`} />
          </ul>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={exportBackup}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Export backup
            </button>
            <button type="button" className="btn btn-secondary" onClick={onImportClick}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              Import backup
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={onFileChosen}
              aria-label="Choose a LifeOS backup file to import"
            />
          </div>

          {importName && !importErrors ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-success">
              <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Restored from “{importName}”.
            </p>
          ) : null}

          {importErrors ? (
            <div role="alert" className="mt-3 rounded-xl border border-danger/35 bg-danger-soft px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-danger">
                <CircleAlert className="h-4 w-4" aria-hidden="true" />
                Import rejected — your data was not changed
              </p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs text-muted">
                {importErrors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* ------------------------------- reset -------------------------- */}
        <section className="card border-danger/30 p-4 sm:p-5" aria-label="Danger zone">
          <h2 className="section-title text-danger">Reset</h2>
          <p className="mt-1 mb-3 text-sm text-muted">
            Replace all current records with the built-in sample data set. This is the same data a brand-new
            install starts with, and it is not undoable across imports — export a backup first if you want to
            keep your work.
          </p>
          <button type="button" className="btn btn-danger" onClick={() => setConfirmReset(true)}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset to sample data
          </button>
        </section>
      </div>

      <p className="mt-5 text-xs leading-relaxed text-faint">
        LifeOS stores everything in this browser's <code>localStorage</code> under{' '}
        <code>lifeos.state.v1</code>. Clearing site data will remove it — keep an exported backup if the data
        matters.
      </p>

      <ConfirmDialog
        open={confirmReset}
        danger
        title="Reset to sample data?"
        message="Every current task, habit, event, focus session and goal will be replaced by the built-in sample data set. Export a backup first if you want to keep your current records."
        confirmLabel="Reset everything"
        onConfirm={doReset}
        onCancel={() => setConfirmReset(false)}
      />
    </>
  );
}

function Count({ label, value }) {
  return (
    <li className="rounded-xl border border-line bg-surface-2 px-3 py-2">
      <span className="block text-xs text-muted">{label}</span>
      <span className="text-sm font-semibold text-text tabular-nums">{value}</span>
    </li>
  );
}
