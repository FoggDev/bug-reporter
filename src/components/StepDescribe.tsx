
import { useBugReporter } from "../hooks";

type StepDescribeProps = {
  onNext: () => void;
};

export function StepDescribe({ onNext }: StepDescribeProps) {
  const {
    state: { draft },
    updateDraft
  } = useBugReporter();

  return (
    <div className="br-step">
      <h2>Describe issue</h2>
      <p>Provide enough context so engineers can reproduce what happened.</p>

      <label className="br-field">
        Title
        <input
          value={draft.title}
          onChange={(event) => updateDraft({ title: event.target.value })}
          placeholder="Short summary"
          required
        />
      </label>

      <label className="br-field">
        Description
        <textarea
          value={draft.description}
          onChange={(event) => updateDraft({ description: event.target.value })}
          placeholder="What happened?"
          rows={4}
        />
      </label>

      <div className="br-actions">
        <button type="button" className="br-btn br-btn-primary" disabled={!draft.title.trim()} onClick={onNext}>
          Continue
        </button>
      </div>
    </div>
  );
}
