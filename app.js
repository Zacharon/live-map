import { bootLiveMap } from "./src/app-controller.js";

document.body.dataset.liveMapModule = "1";
window.addEventListener("error", (event) => {
  document.body.dataset.liveMapError = String(event.message || event.error || "error").slice(0, 240);
});
window.addEventListener("unhandledrejection", (event) => {
  document.body.dataset.liveMapError = String(event.reason?.message || event.reason || "rejection").slice(0, 240);
});
try {
  bootLiveMap();
  document.body.dataset.liveMapBoot = "complete";
} catch (error) {
  document.body.dataset.liveMapBoot = "failed";
  document.body.dataset.liveMapError = String(error?.message || error).slice(0, 240);
  document.body.dataset.liveMapReady = "1";
}
