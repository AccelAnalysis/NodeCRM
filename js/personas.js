(function (NS) {
  "use strict";

  function cellHTML(persona) {
    var badge = persona.icp
      ? '<span class="icp" title="' + NS.util.esc(persona.icpNote || "Ideal customer profile") + '">ICP</span>'
      : "";
    return '<div class="persona-cell" data-persona-id="' + persona.id + '">' +
      '<div class="persona-card">' +
      '<div class="avatar">' + NS.avatars.render(persona.avatarSeed) + "</div>" +
      '<div class="persona-copy">' +
      '<div class="persona-name">' + NS.util.esc(persona.name) + badge + "</div>" +
      (persona.role ? '<div class="persona-role">' + NS.util.esc(persona.role) + "</div>" : "") +
      "</div>" +
      '<button type="button" class="icon-btn persona-remove" data-action="remove-persona" data-persona-id="' + persona.id + '" aria-label="Remove ' + NS.util.esc(persona.name) + '">' + NS.util.icon("close") + "</button>" +
      "</div></div>";
  }

  function startBlockHTML() {
    return '<button type="button" class="y-start" data-action="open-wizard" data-testid="y-axis-start">' +
      '<span class="y-kicker">Personas</span>' +
      "<strong>Define your market</strong>" +
      "<span>Segments and people land on this axis. ICP is a badge, not a row.</span>" +
      '<span class="y-cta">Begin ' + NS.util.icon("chevron") + "</span>" +
      "</button>";
  }

  function segmentHTML(segment) {
    return '<div class="segment-row"><div class="segment-label"><span>' + NS.util.esc(segment.name) + "</span>" +
      '<button type="button" class="text-btn" data-action="open-wizard" data-step="3">Edit</button></div></div>';
  }

  function emptySegmentHTML(colspanNote) {
    return '<div class="persona-cell persona-empty"><span>No personas in this segment yet.</span>' +
      '<button type="button" class="text-btn" data-action="open-wizard" data-step="3">Add a persona</button></div>' +
      colspanNote;
  }

  function addRowHTML() {
    return '<div class="y-add"><button type="button" class="text-btn" data-action="open-wizard" data-step="3">Add personas</button></div>';
  }

  NS.personas = {
    cellHTML: cellHTML,
    startBlockHTML: startBlockHTML,
    segmentHTML: segmentHTML,
    emptySegmentHTML: emptySegmentHTML,
    addRowHTML: addRowHTML
  };
})(window.NodeCRM);
