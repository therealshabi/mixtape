type NoteCardProps = {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
  maxLength?: number;
};

export function NoteCard({
  value,
  onChange,
  readOnly = false,
  className = "",
  maxLength = 280,
}: NoteCardProps) {
  return (
    <div className={`note-card ${className}`}>
      <img src="/assets/note-paper.png" alt="" aria-hidden="true" className="note-paper" draggable={false} />
      <div className="note-margin" />
      <div className="note-lines" />
      {readOnly ? (
        <p className="note-text">{value}</p>
      ) : (
        <textarea
          className="note-text note-input"
          value={value}
          maxLength={maxLength}
          placeholder="Write something sweet…"
          aria-label="Mixtape note"
          onChange={(event) => onChange?.(event.target.value)}
        />
      )}
      {!readOnly && (
        <span className="note-count">
          {value.length}/{maxLength}
        </span>
      )}
    </div>
  );
}
