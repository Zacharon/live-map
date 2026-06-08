export async function requestBrief(payload) {
  const response = await fetch("/api/briefs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Brief request failed with ${response.status}`);
  return response.json();
}
