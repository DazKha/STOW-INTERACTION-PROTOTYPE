import type { AttachmentMeta } from "../domain/analysisTypes";

interface AttachmentCardProps {
  attachment: AttachmentMeta;
  onRemove: () => void;
  disabled?: boolean;
}

export function AttachmentCard({ attachment, onRemove, disabled = false }: AttachmentCardProps) {
  return (
    <article aria-label="Selected image" className="attachment-card">
      <img src={attachment.previewUrl} alt="Selected image preview" />
      <div>
        <strong>{attachment.name}</strong>
        <p>{formatBytes(attachment.size)} · {attachment.width} × {attachment.height}</p>
        <p>Ready to analyze</p>
      </div>
      <button type="button" onClick={onRemove} aria-label="Remove selected image" disabled={disabled}>Remove</button>
    </article>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.round(bytes / 1024)} KB`;
}
