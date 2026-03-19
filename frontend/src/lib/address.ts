/**
 * Normalize a Starknet address for comparison.
 * Strips leading zeros after 0x so that 0x05ca1... and 0x000005ca1... match.
 */
export function normalizeAddress(addr: string): string {
  if (!addr) return "0x0";
  const hex = addr.replace(/^0x0*/i, "");
  return "0x" + (hex || "0");
}
