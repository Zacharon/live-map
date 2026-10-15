export function encodeUsgsCursor(epoch, id) {
  if (!/^[0-9a-f]{32}$/.test(String(epoch)) || !Number.isSafeInteger(Number(id)) || Number(id) < 0) {
    throw new Error("invalid change-feed cursor state");
  }
  return `c2.${epoch}.${id}`;
}

export function parseUsgsCursor(value) {
  if (value == null || value === "") return { kind: "initial", id: null };
  if (/^c1\./.test(value)) return { kind: "incompatible" };
  const match = /^c2\.([0-9a-f]{32})\.(\d{1,15})$/.exec(value);
  if (!match) return { kind: "invalid" };
  const id = Number(match[2]);
  if (!Number.isSafeInteger(id)) return { kind: "invalid" };
  return { kind: "valid", epoch: match[1], id };
}
