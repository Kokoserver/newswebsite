"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Reaction = "LIKE" | "DISLIKE";

type CommentActionsProps = {
  commentId: string;
  initialLikes: number;
  initialDislikes: number;
  initialReaction: Reaction | null;
  signedIn: boolean;
  loginUrl: string;
};

export default function CommentActions({
  commentId,
  initialLikes,
  initialDislikes,
  initialReaction,
  signedIn,
  loginUrl,
}: CommentActionsProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [reaction, setReaction] = useState<Reaction | null>(initialReaction);
  const [pending, setPending] = useState(false);

  async function toggle(type: Reaction) {
    if (pending) return;
    setPending(true);

    const response = await fetch(`/api/comments/${commentId}/reaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reaction: type }),
    });
    const data = await response.json().catch(() => ({}));

    setPending(false);

    if (!response.ok) return;

    setLikes(data.likes);
    setDislikes(data.dislikes);
    setReaction(data.myReaction);
  }

  const reactionControl = (type: Reaction) => {
    const active = reaction === type;
    const count = type === "LIKE" ? likes : dislikes;
    const label = type === "LIKE" ? "Like this comment" : "Dislike this comment";
    const icon = type === "LIKE" ? <ThumbsUp size={13} /> : <ThumbsDown size={13} />;

    if (!signedIn) {
      return (
        <Link
          className={`comment-reaction${active ? " active" : ""}`}
          href={loginUrl}
          aria-label={label}
          title="Sign in to react"
        >
          {icon} {count}
        </Link>
      );
    }

    return (
      <button
        className={`comment-reaction${active ? " active" : ""}`}
        type="button"
        onClick={() => toggle(type)}
        disabled={pending}
        aria-pressed={active}
        aria-label={label}
      >
        {icon} {count}
      </button>
    );
  };

  return (
    <span className="comment-reactions">
      {reactionControl("LIKE")}
      {reactionControl("DISLIKE")}
    </span>
  );
}
