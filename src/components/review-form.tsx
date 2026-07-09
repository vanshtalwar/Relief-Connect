"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReviewForm({ requestId, revieweeId, role }: { requestId: string; revieweeId: string; role: "VICTIM" | "VOLUNTEER" }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, revieweeId, rating, comment }),
      });
      if (res.ok) {
        setSuccess(true);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error?.message || data.error || "Failed to submit review.");
      }
    } catch (err) {
      setError("Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-center mt-6">
        <p className="font-semibold text-emerald-600 dark:text-emerald-400">Thank you for your feedback!</p>
        <p className="text-sm mt-1 text-emerald-700/80 dark:text-emerald-300/80">Your review helps keep ReliefConnect safe and builds trust.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
      <h3 className="font-semibold text-[color:var(--foreground)]">
        Rate your {role === "VICTIM" ? "Responder" : "Requester"}
      </h3>
      <p className="text-sm text-[color:var(--foreground)]/60 mt-1">Please leave a rating to help us identify and reward trustworthy community members.</p>
      
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      
      <div className="mt-4 flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className={`text-3xl transition hover:scale-110 ${star <= rating ? "text-yellow-400" : "text-slate-300 dark:text-slate-700"}`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        className="input mt-4 w-full min-h-[80px] text-sm"
        placeholder="Add an optional comment..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={isSubmitting}
      />

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="focus-ring rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition hover:bg-sky-400"
        >
          {isSubmitting ? "Submitting..." : "Submit Review"}
        </button>
      </div>
    </form>
  );
}
