type LoadingSkeletonProps = {
  label?: string;
  className?: string;
};

export function LoadingSkeleton({ label = "Loading", className = "" }: LoadingSkeletonProps) {
  return (
    <div className={`loading-skeleton ${className}`.trim()} role="status" aria-label={label} aria-live="polite">
      <span className="skeleton-line skeleton-line-wide" />
      <span className="skeleton-line skeleton-line-medium" />
      <span className="skeleton-line skeleton-line-short" />
    </div>
  );
}

export function ReaderLoadingSkeleton() {
  return (
    <div className="reader-loading-skeleton" role="status" aria-label="Loading reader content" aria-live="polite">
      <div className="skeleton-reader-header">
        <span className="skeleton-line skeleton-line-short" />
        <span className="skeleton-line skeleton-line-title" />
        <span className="skeleton-line skeleton-line-medium" />
      </div>
      <div className="skeleton-reader-toolbar">
        <span className="skeleton-control" />
        <span className="skeleton-control" />
        <span className="skeleton-icon" />
        <span className="skeleton-icon" />
      </div>
      <div className="skeleton-reader-card">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} className={`skeleton-line ${index % 3 === 0 ? "skeleton-line-wide" : "skeleton-line-medium"}`} />
        ))}
      </div>
      <div className="skeleton-definition-card">
        <span className="skeleton-line skeleton-line-short" />
        <span className="skeleton-line skeleton-line-medium" />
        <span className="skeleton-line skeleton-line-wide" />
      </div>
    </div>
  );
}
