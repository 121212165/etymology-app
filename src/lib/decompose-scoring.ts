export function isDecomposeCorrect(
  selectedRoots: string[],
  correctRoots: string[]
): boolean {
  return (
    selectedRoots.length === correctRoots.length &&
    selectedRoots.every((r) => correctRoots.includes(r))
  );
}
