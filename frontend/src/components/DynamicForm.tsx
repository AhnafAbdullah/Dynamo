import { useState } from 'react';
import { buildApiClient } from '../engine/ApiClient';
import type { AppConfig, ComponentConfig } from '../engine/ConfigLoader';
import { track } from '../telemetry/sdk';

interface FormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  required?: boolean;
  options?: string[];
}

interface DynamicFormProps {
  config: ComponentConfig;
  appConfig: AppConfig;
  apiBinding: string;
  onSuccess?: () => void;
}

export function DynamicForm({ config, appConfig, apiBinding, onSuccess }: DynamicFormProps) {
  const fields = config.fields as FormField[];
  const submitLabel = (config.submit_label as string) ?? 'Submit';

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map(f => [f.key, '']))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    fields.forEach(f => {
      if (f.required && !values[f.key]?.trim()) {
        errs[f.key] = `${f.label} is required`;
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    track({ event_type: 'WORKFLOW_STEP', app_id: appConfig.app_id, context: { action: 'form_submit', form_id: config.id } });
    try {
      const client = buildApiClient(appConfig);
      await client.call(apiBinding, { body: values });
      setSuccess(true);
      track({ event_type: 'WORKFLOW_STEP', app_id: appConfig.app_id, context: { action: 'form_submit_success', form_id: config.id } });
      setTimeout(() => { setSuccess(false); onSuccess?.(); }, 1200);
    } catch (err) {
      console.error(err);
      track({ event_type: 'API_ERROR', app_id: appConfig.app_id, context: { form_id: config.id } });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="empty-state" style={{ padding: '40px' }}>
        <div style={{ fontSize: 40 }}>✅</div>
        <h3>Created successfully!</h3>
      </div>
    );
  }

  return (
    <form className="form-container" onSubmit={handleSubmit}>
      <div className="form-grid">
        {fields.map(field => (
          <div className="form-group" key={field.key}>
            <label className="form-label">
              {field.label}
              {field.required && <span className="required">*</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                className="form-textarea"
                value={values[field.key]}
                onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                onFocus={() => track({ event_type: 'INPUT_FOCUS', app_id: appConfig.app_id, context: { field: field.key } })}
              />
            ) : field.type === 'select' ? (
              <select
                className="form-select"
                value={values[field.key]}
                onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
              >
                <option value="">Select…</option>
                {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            ) : (
              <input
                className="form-input"
                type={field.type}
                value={values[field.key]}
                onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                onFocus={() => track({ event_type: 'INPUT_FOCUS', app_id: appConfig.app_id, context: { field: field.key } })}
              />
            )}
            {errors[field.key] && (
              <span style={{ color: 'var(--danger)', fontSize: 11 }}>{errors[field.key]}</span>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Saving…</> : submitLabel}
        </button>
      </div>
    </form>
  );
}
