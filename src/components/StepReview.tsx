import { useBugReporter } from "../hooks";

type StepReviewProps = {
  onBack: () => void;
};

export function StepReview({ onBack }: StepReviewProps) {
  const {
    state: { assets, draft, isSubmitting, uploadProgress, error },
    submit,
    retrySubmit
  } = useBugReporter();

  return (
    <div className="br-step">
      <h2>Review and submit</h2>
      <p>Confirm details, then send your report.</p>

      <div className="br-summary">
        <strong>{draft.title || "Untitled bug report"}</strong>
        <p>{draft.description || "No description provided."}</p>
      </div>

      <div className="br-assets">
        {assets.map((asset) => (
          <div key={asset.id} className="br-asset-card">
            <span className="br-asset-type">{asset.type}</span>
            {asset.type === "recording" ? (
              <video src={asset.previewUrl} controls className="br-preview" />
            ) : (
              <img src={asset.previewUrl} alt={`${asset.type} preview`} className="br-preview" />
            )}
          </div>
        ))}
      </div>

      {isSubmitting ? (
        <div className="br-upload-progress" aria-live="polite">
          Uploading assets: {Math.round(uploadProgress * 100)}%
          <div className="br-progress-track">
            <div className="br-progress-fill" style={{ width: `${Math.round(uploadProgress * 100)}%` }} />
          </div>
        </div>
      ) : null}

      {error ? <p className="br-error">{error}</p> : null}

      <div className="br-actions">
        <button type="button" className="br-btn br-btn-secondary" onClick={onBack} disabled={isSubmitting}>
          Back
        </button>
        <button type="button" className="br-btn br-btn-secondary" onClick={retrySubmit} disabled={!error || isSubmitting}>
          Retry
        </button>
        <button type="button" className="br-btn br-btn-primary" onClick={submit} disabled={isSubmitting}>
          Submit report
        </button>
      </div>
    </div>
  );
}
