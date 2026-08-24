import { CircleHelp } from "lucide-react";

export default function InfoTooltip({ text, label = "More information" }: { text: string; label?: string }) {
  return (
    <span className="admin-info-tooltip" tabIndex={0} aria-label={`${label}: ${text}`}>
      <CircleHelp size={15} aria-hidden="true" />
      <span className="admin-info-tooltip-content" role="tooltip">{text}</span>
    </span>
  );
}
