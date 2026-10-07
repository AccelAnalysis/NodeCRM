(function (NS) {
  "use strict";

  var draft = null;

  function root() { return document.getElementById("wizard"); }

  function blankSegment() {
    return { key: NS.util.uid("dseg"), id: null, name: "" };
  }

  function blankPersona(segmentKey) {
    return {
      key: NS.util.uid("dper"),
      id: null,
      segmentKey: segmentKey,
      name: "",
      role: "",
      icp: false,
      icpNote: "",
      avatarSeed: 1 + Math.floor(Math.random() * 8000)
    };
  }

  function open(step) {
    NS.stages.closePopover();
    var state = NS.model.get();
    var segments = state.segments.map(function (segment) {
      return { key: segment.id, id: segment.id, name: segment.name };
    });
    if (!segments.length) segments.push(blankSegment());
    draft = {
      step: 1,
      market: {
        name: state.market ? state.market.name : "",
        description: state.market ? state.market.description || "" : ""
      },
      segments: segments,
      personas: state.personas.map(function (persona) {
        return {
          key: persona.id,
          id: persona.id,
          segmentKey: persona.segmentId,
          name: persona.name,
          role: persona.role || "",
          icp: !!persona.icp,
          icpNote: persona.icpNote || "",
          avatarSeed: persona.avatarSeed || 1
        };
      }),
      error: ""
    };
    var wanted = Number(step) || 1;
    if (wanted > 1 && !draft.market.name.trim()) wanted = 1;
    draft.step = Math.min(4, Math.max(1, wanted));
    render();
    root().hidden = false;
    var focus = root().querySelector("[data-market-name], [data-seg-key], [data-field='name']");
    if (focus) focus.focus();
  }

  function close() {
    draft = null;
    root().hidden = true;
    root().innerHTML = "";
  }

  function isOpen() { return !!draft && !root().hidden; }

  function syncFromDom() {
    if (!draft) return;
    var node = root();
    var marketName = node.querySelector("[data-market-name]");
    var marketDesc = node.querySelector("[data-market-desc]");
    if (marketName) draft.market.name = marketName.value;
    if (marketDesc) draft.market.description = marketDesc.value;
    node.querySelectorAll("[data-seg-key]").forEach(function (input) {
      var segment = draft.segments.filter(function (item) { return item.key === input.dataset.segKey; })[0];
      if (segment) segment.name = input.value;
    });
    node.querySelectorAll("[data-persona-key]").forEach(function (card) {
      var persona = draft.personas.filter(function (item) { return item.key === card.dataset.personaKey; })[0];
      if (!persona) return;
      persona.name = card.querySelector("[data-field='name']").value;
      persona.role = card.querySelector("[data-field='role']").value;
      persona.icp = card.querySelector("[data-field='icp']").checked;
      persona.icpNote = card.querySelector("[data-field='icpNote']").value;
    });
  }

  function namedSegments() {
    return draft.segments.map(function (segment) {
      return Object.assign({}, segment, { name: segment.name.trim() });
    }).filter(function (segment) { return segment.name; });
  }

  function errorFor(step) {
    if (step === 1 && !draft.market.name.trim()) return "Name the market.";
    if (step === 2) {
      var names = namedSegments();
      if (!names.length) return "Add at least one segment.";
      var seen = {};
      var i;
      for (i = 0; i < names.length; i += 1) {
        var key = names[i].name.toLowerCase();
        if (seen[key]) return "Segment names need to be distinct.";
        seen[key] = true;
      }
    }
    if (step >= 3) {
      if (!namedSegments().length) return "Add at least one segment.";
      var partial = draft.personas.some(function (persona) {
        return !persona.name.trim() && (persona.role.trim() || persona.icpNote.trim() || persona.icp);
      });
      if (partial) return "Name each persona, or clear the unfinished one.";
      var keys = {};
      namedSegments().forEach(function (segment) { keys[segment.key] = true; });
      var count = draft.personas.filter(function (persona) {
        return persona.name.trim() && keys[persona.segmentKey];
      }).length;
      if (!count) return "Add at least one persona.";
    }
    return "";
  }

  function cleaned() {
    var segments = namedSegments();
    var keys = {};
    segments.forEach(function (segment) { keys[segment.key] = true; });
    return {
      market: {
        name: draft.market.name.trim(),
        description: draft.market.description.trim()
      },
      segments: segments,
      personas: draft.personas.filter(function (persona) {
        return persona.name.trim() && keys[persona.segmentKey];
      }).map(function (persona) {
        return Object.assign({}, persona, {
          name: persona.name.trim(),
          role: persona.role.trim(),
          icpNote: persona.icpNote.trim()
        });
      })
    };
  }

  function moveItem(list, index, dir) {
    var target = index + dir;
    if (target < 0 || target >= list.length) return;
    var item = list.splice(index, 1)[0];
    list.splice(target, 0, item);
  }

  function stepsHTML() {
    var labels = ["Market", "Segments", "Personas", "Review"];
    var current = labels[draft.step - 1];
    return '<div class="progress" role="progressbar" aria-valuemin="1" aria-valuemax="4" aria-valuenow="' + draft.step + '" aria-valuetext="Step ' + draft.step + " of 4, " + current + '">' +
      '<span style="width:' + (draft.step / 4 * 100) + '%"></span></div>';
  }

  function marketHTML() {
    return '<label>Name<input data-market-name maxlength="80" required placeholder="Who you serve" value="' + NS.util.esc(draft.market.name) + '"></label>' +
      '<label>Notes<textarea data-market-desc maxlength="280" rows="3" placeholder="Optional. What this market has in common.">' + NS.util.esc(draft.market.description) + "</textarea></label>";
  }

  function segmentsHTML() {
    var rows = draft.segments.map(function (segment, index) {
      return '<div class="edit-row"><input data-seg-key="' + NS.util.esc(segment.key) + '" maxlength="48" placeholder="Segment name" value="' + NS.util.esc(segment.name) + '" aria-label="Segment name">' +
        '<button type="button" class="icon-btn" data-action="seg-up" data-index="' + index + '" aria-label="Move segment up"' + (index === 0 ? " disabled" : "") + ">" + NS.util.icon("up") + "</button>" +
        '<button type="button" class="icon-btn" data-action="seg-down" data-index="' + index + '" aria-label="Move segment down"' + (index === draft.segments.length - 1 ? " disabled" : "") + ">" + NS.util.icon("down") + "</button>" +
        '<button type="button" class="icon-btn" data-action="seg-remove" data-index="' + index + '" aria-label="Remove segment">' + NS.util.icon("close") + "</button></div>";
    }).join("");
    return rows +
      '<button type="button" class="btn" data-action="seg-add">Add segment</button>';
  }

  function personasHTML() {
    var segments = namedSegments();
    if (!segments.length) return "<p>Add a segment first.</p>";
    return segments.map(function (segment) {
      var people = draft.personas.filter(function (persona) { return persona.segmentKey === segment.key; });
      var cards = people.map(function (persona) {
        var index = draft.personas.indexOf(persona);
        return '<article class="persona-editor" data-persona-key="' + NS.util.esc(persona.key) + '">' +
          '<div class="avatar lg">' + NS.avatars.render(persona.avatarSeed) + "</div>" +
          '<div class="persona-fields">' +
          '<label>Name<input data-field="name" maxlength="48" value="' + NS.util.esc(persona.name) + '" placeholder="Persona name"></label>' +
          '<label>Role<input data-field="role" maxlength="48" value="' + NS.util.esc(persona.role) + '" placeholder="Role or job"></label>' +
          '<label class="check"><input data-field="icp" type="checkbox"' + (persona.icp ? " checked" : "") + "> Mark as ICP</label>" +
          '<label>Badge note<input data-field="icpNote" maxlength="80" value="' + NS.util.esc(persona.icpNote) + '" placeholder="Optional. Shown with the badge."></label>' +
          '<div class="edit-row">' +
          '<button type="button" class="btn btn-plain" data-action="shuffle-face" data-key="' + NS.util.esc(persona.key) + '">Another face</button>' +
          '<button type="button" class="icon-btn" data-action="per-up" data-index="' + index + '" aria-label="Move persona up">' + NS.util.icon("up") + "</button>" +
          '<button type="button" class="icon-btn" data-action="per-down" data-index="' + index + '" aria-label="Move persona down">' + NS.util.icon("down") + "</button>" +
          '<button type="button" class="icon-btn" data-action="per-remove" data-key="' + NS.util.esc(persona.key) + '" aria-label="Remove persona">' + NS.util.icon("close") + "</button>" +
          "</div></div></article>";
      }).join("");
      return '<section class="segment-block"><header><h3>' + NS.util.esc(segment.name) + "</h3>" +
        '<button type="button" class="btn" data-action="per-add" data-key="' + NS.util.esc(segment.key) + '">Add persona</button></header>' +
        (cards || '<p class="fine">No personas in this segment yet.</p>') + "</section>";
    }).join("");
  }

  function reviewHTML() {
    var data = cleaned();
    var body = data.segments.map(function (segment) {
      var people = data.personas.filter(function (persona) { return persona.segmentKey === segment.key; });
      var cards = people.map(function (persona) {
        return '<div class="review-person"><div class="avatar">' + NS.avatars.render(persona.avatarSeed) + "</div><div><strong>" +
          NS.util.esc(persona.name) + "</strong>" + (persona.icp ? ' <span class="icp">ICP</span>' : "") +
          (persona.role ? '<div class="persona-role">' + NS.util.esc(persona.role) + "</div>" : "") + "</div></div>";
      }).join("");
      return '<section class="review-block"><h3>' + NS.util.esc(segment.name) + "</h3>" + (cards || "<p class='fine'>No personas</p>") + "</section>";
    }).join("");
    return "<p><strong>" + NS.util.esc(data.market.name) + "</strong></p>" +
      (data.market.description ? "<p class='fine'>" + NS.util.esc(data.market.description) + "</p>" : "") + body;
  }

  function render() {
    var titles = [
      ["Target market", "Name who this plane is for."],
      ["Segments", "Each segment becomes a group of rows."],
      ["Personas", "People on the side axis. ICP is a badge, not a row."],
      ["Review", "This is what lands on the plane."]
    ];
    var meta = titles[draft.step - 1];
    var body = draft.step === 1 ? marketHTML() : draft.step === 2 ? segmentsHTML() : draft.step === 3 ? personasHTML() : reviewHTML();
    var nextLabel = draft.step === 4 ? "Done" : "Continue";
    root().innerHTML = '<form class="wizard-card" data-testid="wizard-card" role="dialog" aria-modal="true" aria-labelledby="wizard-title">' +
      '<div class="sheet-grabber" aria-hidden="true"></div>' +
      '<header class="wizard-head"><div><p class="caption">Step ' + draft.step + ' of 4</p><h2 id="wizard-title">' + meta[0] + '</h2><p class="sheet-lead">' + meta[1] + "</p></div>" +
      '<button type="button" class="icon-btn" data-action="wizard-close" aria-label="Close">' + NS.util.icon("close") + "</button></header>" +
      stepsHTML() +
      '<div class="wizard-body">' + body + "</div>" +
      '<p class="form-error" role="alert"' + (draft.error ? "" : " hidden") + ">" + NS.util.esc(draft.error || "") + "</p>" +
      '<footer class="wizard-foot">' +
      '<button type="button" class="btn btn-plain" data-action="wizard-back"' + (draft.step === 1 ? " disabled" : "") + ">Back</button>" +
      '<button type="submit" class="btn btn-primary" data-testid="wizard-next">' + nextLabel + "</button>" +
      "</footer></form>";
  }

  async function finish() {
    var data = cleaned();
    var state = NS.model.get();
    var keepPersonas = {};
    data.personas.forEach(function (persona) { if (persona.id) keepPersonas[persona.id] = true; });
    var keepSegments = {};
    data.segments.forEach(function (segment) { if (segment.id) keepSegments[segment.id] = true; });
    var removedPersonas = state.personas.filter(function (persona) { return !keepPersonas[persona.id]; });
    var removedSegments = state.segments.filter(function (segment) { return !keepSegments[segment.id]; });
    if (removedPersonas.length || removedSegments.length) {
      var nodeLoss = state.nodes.filter(function (node) {
        return removedPersonas.some(function (persona) { return persona.id === node.personaId; });
      }).length;
      var parts = [];
      if (removedSegments.length) parts.push("Segments removed: " + removedSegments.map(function (segment) { return segment.name; }).join(", ") + ".");
      if (removedPersonas.length) parts.push("Personas removed: " + removedPersonas.map(function (persona) { return persona.name; }).join(", ") + ".");
      if (nodeLoss) parts.push(nodeLoss + " node" + (nodeLoss === 1 ? "" : "s") + " on those personas will be deleted.");
      var ok = await NS.ui.confirm({
        title: "Update the plane?",
        body: parts.join(" "),
        confirmLabel: "Update plane",
        danger: true
      });
      if (!ok) return;
    }
    NS.model.applyMarketDraft(data);
    close();
    NS.ui.toast("Personas are on the plane.");
  }

  async function onClick(event) {
    if (event.target === root()) {
      close();
      return;
    }
    var button = event.target.closest("[data-action]");
    if (!button || !draft) return;
    var action = button.dataset.action;
    if (action !== "wizard-close") syncFromDom();
    if (action === "wizard-close") {
      close();
      return;
    }
    if (action === "wizard-back") {
      draft.error = "";
      draft.step = Math.max(1, draft.step - 1);
      render();
      return;
    }
    if (action === "seg-add") {
      draft.segments.push(blankSegment());
      draft.error = "";
      render();
      return;
    }
    if (action === "seg-remove") {
      var index = Number(button.dataset.index);
      var segment = draft.segments[index];
      var related = draft.personas.filter(function (persona) { return persona.segmentKey === segment.key && persona.name.trim(); });
      if (related.length) {
        var ok = await NS.ui.confirm({
          title: "Remove this segment?",
          body: "Personas drafted in " + (segment.name.trim() || "this segment") + " will be dropped from the wizard.",
          confirmLabel: "Remove segment",
          danger: true
        });
        if (!ok) return;
      }
      draft.personas = draft.personas.filter(function (persona) { return persona.segmentKey !== segment.key; });
      draft.segments.splice(index, 1);
      render();
      return;
    }
    if (action === "seg-up" || action === "seg-down") {
      moveItem(draft.segments, Number(button.dataset.index), action === "seg-up" ? -1 : 1);
      render();
      return;
    }
    if (action === "per-add") {
      draft.personas.push(blankPersona(button.dataset.key));
      draft.error = "";
      render();
      return;
    }
    if (action === "per-remove") {
      draft.personas = draft.personas.filter(function (persona) { return persona.key !== button.dataset.key; });
      render();
      return;
    }
    if (action === "per-up" || action === "per-down") {
      var personaIndex = Number(button.dataset.index);
      var moving = draft.personas[personaIndex];
      var siblings = [];
      draft.personas.forEach(function (persona, personaPos) {
        if (persona.segmentKey === moving.segmentKey) siblings.push(personaPos);
      });
      var place = siblings.indexOf(personaIndex);
      var swapWith = siblings[place + (action === "per-up" ? -1 : 1)];
      if (swapWith == null) return;
      var swap = draft.personas[personaIndex];
      draft.personas[personaIndex] = draft.personas[swapWith];
      draft.personas[swapWith] = swap;
      render();
      return;
    }
    if (action === "shuffle-face") {
      var persona = draft.personas.filter(function (item) { return item.key === button.dataset.key; })[0];
      if (persona) persona.avatarSeed = NS.avatars.shuffleSeed(persona.avatarSeed);
      render();
    }
  }

  function init() {
    var node = root();
    node.addEventListener("click", onClick);
    node.addEventListener("input", syncFromDom);
    node.addEventListener("change", syncFromDom);
    node.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!draft) return;
      syncFromDom();
      var message = errorFor(draft.step);
      if (message) {
        draft.error = message;
        render();
        return;
      }
      draft.error = "";
      if (draft.step < 4) {
        draft.step += 1;
        render();
        return;
      }
      finish();
    });
  }

  NS.wizard = { init: init, open: open, close: close, isOpen: isOpen };
})(window.NodeCRM);
