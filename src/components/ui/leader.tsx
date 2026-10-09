/** Dotted rule between a name and its price, as on a printed bill of fare. */
export function Leader() {
  return (
    <span
      aria-hidden="true"
      className="mb-1.5 min-w-6 flex-1 border-b border-dotted border-ivory/30"
    />
  );
}
