import React from "react";

export default function Loading() {
  return (
    <div
      role="status"
      aria-label="جارٍ تحميل المحتوى"
      className="space-y-6 py-4"
    >
      <div className="h-56 w-full animate-pulse rounded-3xl bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-36 animate-pulse rounded-3xl bg-muted" />
        <div className="h-36 animate-pulse rounded-3xl bg-muted" />
        <div className="h-36 animate-pulse rounded-3xl bg-muted" />
      </div>
    </div>
  );
}
