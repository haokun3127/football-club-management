export function createIdempotencyKey(prefix = "mp") {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${random}`;
}

export function createRequestId() {
  const random = Math.random().toString(36).slice(2, 8);
  return `req-${Date.now()}-${random}`;
}
