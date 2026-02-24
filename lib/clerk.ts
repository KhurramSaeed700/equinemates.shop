export function isClerkEnabledFromKey(
  publishableKey: string | undefined,
): boolean {
  return (
    typeof publishableKey === "string" &&
    /^pk_(test|live)_[a-zA-Z0-9]+$/.test(publishableKey) &&
    !publishableKey.includes("YOUR_")
  );
}
