export function announce(message) {
  const status = document.getElementById("systemStatus");
  if (status) status.setAttribute("aria-label", message);
}
