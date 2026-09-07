import { SubmitButton } from "@/components/admin/submit-button";

export default function ArticleSaveBar({ statusText }: { statusText: string }) {
  return (
    <div className="admin-mobile-save-bar">
      <span>{statusText}</span>
      <SubmitButton>Save article</SubmitButton>
    </div>
  );
}