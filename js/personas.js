(function (NS) {
  "use strict";

  function cellHTML(persona) {
    var badge = persona.icp
      ? '<span class="icp" title="' + NS.util.esc(persona.icpNote || "Ideal customer profile") + '">ICP</span>'
      : "";
    return '<div class="persona-cell" data-persona-id="' + persona.id + '">' +
      '<button type="button" class="avatar-float" data-action="dress-persona" data-persona-id="' + persona.id + '" data-testid="avatar-overlay" aria-label="Edit ' + NS.util.esc(persona.name) + '">' +
      '<span class="avatar">' + NS.avatars.render(persona.avatar || persona.avatarSeed) + "</span></button>" +
      '<div class="persona-card">' +
      '<div class="persona-copy">' +
      '<div class="persona-name">' + NS.util.esc(persona.name) + badge + "</div>" +
      (persona.role ? '<div class="persona-role">' + NS.util.esc(persona.role) + "</div>" : "") +
      "</div>" +
      '<button type="button" class="icon-btn persona-remove" data-action="remove-persona" data-persona-id="' + persona.id + '" aria-label="Remove ' + NS.util.esc(persona.name) + '">' + NS.util.icon("close") + "</button>" +
      "</div></div>";
  }

  function startBlockHTML() {
    return '<button type="button" class="y-start" data-action="open-wizard" data-testid="y-axis-start">' +
      "<strong>Define your market</strong>" +
      '<span class="y-cta">Begin ' + NS.util.icon("chevron") + "</span>" +
      "</button>";
  }

  function segmentHTML(segment) {
    var who = segment.audience === "b2b" ? "Companies" : segment.audience === "b2c" ? "People" : "";
    var meta = who;
    return '<div class="segment-row"><div class="segment-label"><span>' + NS.util.esc(segment.name) + "</span>" +
      (meta ? '<span class="segment-meta">' + NS.util.esc(meta) + "</span>" : "") +
      '<button type="button" class="text-btn" data-action="open-wizard" data-step="2">Edit</button></div></div>';
  }

  function emptySegmentHTML(colspanNote) {
    return '<div class="persona-cell persona-empty">' +
      '<button type="button" class="text-btn" data-action="open-wizard" data-step="3">Add a person</button></div>' +
      colspanNote;
  }

  function addRowHTML() {
    return '<div class="y-add"><button type="button" class="text-btn" data-action="open-wizard" data-step="3">Add a person</button></div>';
  }

  NS.personas = {
    cellHTML: cellHTML,
    startBlockHTML: startBlockHTML,
    segmentHTML: segmentHTML,
    emptySegmentHTML: emptySegmentHTML,
    addRowHTML: addRowHTML
  };
})(window.NodeCRM);
