export function StepBar({ step }: { step: number }) {
  return (
    <ol className="step-bar" aria-label="Create steps">
      {[1, 2, 3, 4].map((n) => (
        <li key={n} className={n < step ? "done" : n === step ? "current" : ""}>
          {n < step ? "✓" : n}
        </li>
      ))}
    </ol>
  );
}

export function WizardNav({
  onBack,
  onNext,
  nextLabel = "Next",
  nextDisabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="wizard-nav">
      <button type="button" className="btn btn-light" onClick={onBack}>
        Back
      </button>
      <button type="button" className="btn btn-dark" onClick={onNext} disabled={nextDisabled}>
        {nextLabel}
      </button>
    </div>
  );
}
