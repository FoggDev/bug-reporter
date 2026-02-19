import { useBugReporter } from "../hooks";
import { getButtonStyle, inlineStyles } from "../styles/inline";

type StepReviewProps = {
  onBack: () => void;
};

export function StepReview({ onBack }: StepReviewProps) {
  const {
    state: { assets, draft, isSubmitting, uploadProgress, error },
    submit
  } = useBugReporter();

  return (
    <div style={{ ...inlineStyles.step, display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <h2 style={inlineStyles.h2}>Review and submit</h2>
      <p style={inlineStyles.p}>Confirm details, then send your report.</p>

      <div style={inlineStyles.summary}>
        <strong>{draft.title || "Untitled bug report"}</strong>
        <p style={inlineStyles.p}>{draft.description || "No description provided."}</p>
      </div>

      <div style={inlineStyles.assets}>
        {assets.map((asset) => (
          <div key={asset.id} style={inlineStyles.assetCard}>
            <span style={inlineStyles.assetType}>{asset.type}</span>
            {asset.type === "recording" ? (
              <video src={asset.previewUrl} controls style={inlineStyles.preview} />
            ) : (
              <img src={asset.previewUrl} alt={`${asset.type} preview`} style={inlineStyles.preview} />
            )}
          </div>
        ))}
      </div>

      {isSubmitting ? (
        <div style={inlineStyles.uploadProgress} aria-live="polite">
          Uploading assets: {Math.round(uploadProgress * 100)}%
          <div style={inlineStyles.progressTrack}>
            <div style={{ ...inlineStyles.progressFill, width: `${Math.round(uploadProgress * 100)}%` }} />
          </div>
        </div>
      ) : null}

      {error ? <p style={inlineStyles.error}>{error}</p> : null}

      <div
        style={{
          ...inlineStyles.actions,
          marginTop: "auto",
          position: "sticky",
          bottom: 0,
          background: "var(--br-bg)",
          paddingTop: "12px",
          paddingBottom: "12px"
        }}
      >
        <button
          type="button"
          style={{ ...getButtonStyle("secondary", { disabled: isSubmitting }), flex: 1 }}
          onClick={onBack}
          disabled={isSubmitting}
        >
          Back
        </button>
        <button
          type="button"
          style={{ ...getButtonStyle("primary", { disabled: isSubmitting }), flex: 1 }}
          onClick={submit}
          disabled={isSubmitting}
        >
          Submit
        </button>
      </div>
    </div>
  );
}
