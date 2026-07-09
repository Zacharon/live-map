/**
 * Compact severity / domain / map legend for operator clarity.
 */
export function renderLegendPanel() {
  return `<section class="v2-legend" aria-label="Map and severity legend">
    <div class="v2-section-title"><span>Legend</span><small>How to read the board</small></div>
    <div class="v2-legend-grid">
      <div class="v2-legend-block">
        <span class="v2-legend-heading">Severity</span>
        <div class="v2-legend-row"><span class="severity-tag v2-legend-sev" style="--sev:#ff5d6c">Critical</span><span class="v2-legend-note">Highest provider band</span></div>
        <div class="v2-legend-row"><span class="severity-tag v2-legend-sev" style="--sev:#ff8a4c">High</span><span class="v2-legend-note">Elevated attention</span></div>
        <div class="v2-legend-row"><span class="severity-tag v2-legend-sev" style="--sev:#f6c453">Medium</span><span class="v2-legend-note">Monitor</span></div>
        <div class="v2-legend-row"><span class="severity-tag v2-legend-sev" style="--sev:#6ec6ff">Low</span><span class="v2-legend-note">Background</span></div>
      </div>
      <div class="v2-legend-block">
        <span class="v2-legend-heading">Threat level v0</span>
        <div class="v2-legend-row"><span class="v2-threat-badge v2-threat-critical">Critical</span></div>
        <div class="v2-legend-row"><span class="v2-threat-badge v2-threat-high">High</span></div>
        <div class="v2-legend-row"><span class="v2-threat-badge v2-threat-elevated">Elevated</span></div>
        <div class="v2-legend-row"><span class="v2-threat-badge v2-threat-guarded">Guarded</span></div>
        <div class="v2-legend-row"><span class="v2-threat-badge v2-threat-low">Low</span></div>
        <p class="v2-empty">Heuristic only — not official warning levels.</p>
      </div>
      <div class="v2-legend-block">
        <span class="v2-legend-heading">Map / change</span>
        <div class="v2-legend-row"><span class="v2-change-badge v2-change-badge-new">New</span><span class="v2-legend-note">Since last mark-as-seen</span></div>
        <div class="v2-legend-row"><span class="v2-change-badge v2-change-badge-updated">Updated</span><span class="v2-legend-note">Signature changed</span></div>
        <div class="v2-legend-row"><span class="v2-legend-dot v2-legend-dot-cluster"></span><span class="v2-legend-note">Cluster / selected ring</span></div>
        <div class="v2-legend-row"><span class="v2-legend-dot v2-legend-dot-new"></span><span class="v2-legend-note">New marker ring</span></div>
      </div>
    </div>
  </section>`;
}
