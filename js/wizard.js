(function (NS) {
  "use strict";

  var draft = null;
  var geoHandle = null;

  function root() { return document.getElementById("wizard"); }

  function blankSegment() {
    return {
      key: NS.util.uid("dseg"),
      id: null,
      name: "",
      audience: "",
      params: NS.audience.emptyParams(),
      custom: []
    };
  }

  function blankPersona(segmentKey, audience) {
    var avatar = NS.avatars.blank(audience === "b2b" ? "b2b" : "b2c");
    return {
      key: NS.util.uid("dper"),
      id: null,
      segmentKey: segmentKey,
      name: "",
      role: "",
      icp: false,
      icpNote: "",
      avatarSeed: 1,
      avatar: avatar
    };
  }

  function open(step) {
    NS.stages.closePopover();
    var state = NS.model.get();
    var segments = state.segments.map(function (segment) {
      return {
        key: segment.id,
        id: segment.id,
        name: segment.name,
        audience: segment.audience || "",
        params: NS.audience.sanitize(segment.audience || "b2c", segment.params),
        custom: (segment.custom || []).map(function (item) { return { id: item.id, label: item.label }; })
      };
    });
    if (!segments.length) segments.push(blankSegment());
    draft = {
      step: 1,
      market: {
        name: state.market ? state.market.name : "",
        description: state.market ? state.market.description || "" : "",
        geo: { places: NS.geo.normalizePlaces(state.market && state.market.geo && state.market.geo.places) }
      },
      sender: {
        name: state.sender.name || "",
        postal: state.sender.postal || ""
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
          avatarSeed: persona.avatarSeed || 1,
          avatar: persona.avatar ? NS.avatars.normalize(persona.avatar) : NS.avatars.normalize(persona.avatarSeed || 1)
        };
      }),
      error: ""
    };
    var wanted = Number(step) || 1;
    if (wanted > 1 && !draft.market.name.trim() && !(draft.market.geo.places || []).length) wanted = 1;
    draft.step = Math.min(4, Math.max(1, wanted));
    render();
    root().hidden = false;
  }

  function close() {
    if (geoHandle) {
      geoHandle.destroy();
      geoHandle = null;
    }
    draft = null;
    root().hidden = true;
    root().innerHTML = "";
  }

  function isOpen() { return !!draft && !root().hidden; }

  function syncFromDom() {
    if (!draft) return;
    var node = root();
    var marketName = node.querySelector("[data-market-name]");
    var marketNote = node.querySelector("[data-market-note]");
    if (marketName) draft.market.name = marketName.value;
    if (marketNote) draft.market.description = marketNote.value;
    var senderName = node.querySelector("[data-sender-name]");
    var senderPostal = node.querySelector("[data-sender-postal]");
    if (senderName) draft.sender.name = senderName.value;
    if (senderPostal) draft.sender.postal = senderPostal.value;
    node.querySelectorAll("[data-seg-name]").forEach(function (input) {
      var segment = draft.segments.filter(function (item) { return item.key === input.dataset.segName; })[0];
      if (segment) segment.name = input.value;
    });
    node.querySelectorAll("[data-persona-key]").forEach(function (card) {
      var persona = draft.personas.filter(function (item) { return item.key === card.dataset.personaKey; })[0];
      if (!persona) return;
      var name = card.querySelector("[data-field='name']");
      var role = card.querySelector("[data-field='role']");
      var icp = card.querySelector("[data-field='icp']");
      var note = card.querySelector("[data-field='icpNote']");
      if (name) persona.name = name.value;
      if (role) persona.role = role.value;
      if (icp) persona.icp = icp.checked;
      if (note) persona.icpNote = note.value;
    });
  }

  function namedSegments() {
    return draft.segments.map(function (segment) {
      var name = segment.name.trim() || NS.audience.suggestName(segment);
      return Object.assign({}, segment, { name: name });
    }).filter(function (segment) { return segment.name && (segment.audience === "b2c" || segment.audience === "b2b"); });
  }

  function errorFor(step) {
    if (step === 1) {
      if (!draft.market.name.trim() && !(draft.market.geo.places || []).length) {
        return "Name the market, or pick a place on the map.";
      }
    }
    if (step === 2) {
      if (!draft.segments.length) return "Add a group of people.";
      var unfinished = draft.segments.some(function (segment) {
        return segment.audience !== "b2c" && segment.audience !== "b2b";
      });
      if (unfinished) return "For each group, choose people or companies.";
      var nameless = draft.segments.some(function (segment) {
        return !segment.name.trim() && !NS.audience.suggestName(segment);
      });
      if (nameless) return "Name the group, or pick a few traits and we will name it.";
      var seen = {};
      var names = namedSegments();
      var i;
      for (i = 0; i < names.length; i += 1) {
        var key = names[i].name.toLowerCase();
        if (seen[key]) return "Group names need to be different.";
        seen[key] = true;
      }
    }
    if (step >= 3) {
      if (!namedSegments().length) return "Add a group you could actually look for.";
      var partial = draft.personas.some(function (persona) {
        return !persona.name.trim() && (persona.role.trim() || persona.icpNote.trim() || persona.icp);
      });
      if (partial) return "Name each person, or remove the unfinished card.";
      var keys = {};
      namedSegments().forEach(function (segment) { keys[segment.key] = true; });
      var count = draft.personas.filter(function (persona) {
        return persona.name.trim() && keys[persona.segmentKey];
      }).length;
      if (!count) return "Add at least one person.";
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
        description: draft.market.description.trim(),
        geo: { places: NS.geo.normalizePlaces(draft.market.geo.places) }
      },
      sender: {
        name: draft.sender.name.trim(),
        postal: draft.sender.postal.trim()
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

  function stepsHTML() {
    var labels = ["Where", "Who you can find", "The people", "Look it over"];
    return '<ol class="step-list">' + labels.map(function (label, index) {
      var n = index + 1;
      var cls = n === draft.step ? " is-now" : n < draft.step ? " is-done" : "";
      return '<li class="' + cls.trim() + '"><span>' + n + "</span>" + label + "</li>";
    }).join("") + "</ol>";
  }

  function marketHTML() {
    var line = NS.geo.summary(draft.market.geo);
    return '<label>Market name, if you want one<input data-market-name data-testid="market-name" maxlength="80" placeholder="Optional. For example, Neighborhood studios" value="' + NS.util.esc(draft.market.name) + '"></label>' +
      "<p class='fine'>Skip the name if the map says it clearly enough.</p>" +
      NS.geo.shell() +
      (line ? "" : "") +
      '<details class="disclosure"><summary>A private note, if you need one</summary><div class="disclosure-body">' +
      '<label>Note<input data-market-note maxlength="140" placeholder="Optional" value="' + NS.util.esc(draft.market.description) + '"></label></div></details>';
  }

  function chipRow(segment, group) {
    var selected = (segment.params[group.id] || []);
    return '<div class="chip-row">' + group.options.map(function (option) {
      var on = selected.indexOf(option[0]) !== -1;
      return '<button type="button" class="chip' + (on ? " is-on" : "") + '" data-action="toggle-param" data-key="' + NS.util.esc(segment.key) + '" data-group="' + group.id + '" data-value="' + option[0] + '" aria-pressed="' + (on ? "true" : "false") + '">' + NS.util.esc(option[1]) + "</button>";
    }).join("") + "</div>";
  }

  function reachHTML(segment) {
    var read = NS.audience.reach(segment);
    return '<div class="reach is-' + read.level + '" data-testid="reach-read"><strong>' + NS.util.esc(read.title) + "</strong><span>" + NS.util.esc(read.detail) + "</span><em>A simple read, not a promise that a list exists.</em></div>";
  }

  function segmentsHTML() {
    var cards = draft.segments.map(function (segment, index) {
      var book = segment.audience === "b2b" ? NS.audience.b2b : segment.audience === "b2c" ? NS.audience.b2c : null;
      var groups = book ? book.groups.map(function (group) {
        return "<fieldset><legend>" + NS.util.esc(group.label) + "</legend>" + chipRow(segment, group) + "</fieldset>";
      }).join("") : "<p class='fine'>Choose people or companies to see the traits you can search for.</p>";
      var custom = (segment.custom || []).map(function (trait) {
        return '<span class="place-chip"><span>' + NS.util.esc(trait.label) + '</span><button type="button" class="icon-btn" data-action="trait-remove" data-key="' + NS.util.esc(segment.key) + '" data-trait="' + NS.util.esc(trait.id) + '" aria-label="Remove ' + NS.util.esc(trait.label) + '">' + NS.util.icon("close") + "</button></span>";
      }).join("");
      var suggestion = NS.audience.suggestName(segment);
      return '<section class="check-card"><header class="split"><h3>Group ' + (index + 1) + "</h3>" +
        '<button type="button" class="icon-btn" data-action="seg-remove" data-index="' + index + '" aria-label="Remove group">' + NS.util.icon("close") + "</button></header>" +
        '<div class="segmented" role="radiogroup" aria-label="People or companies">' +
        '<button type="button" class="segmented-btn' + (segment.audience === "b2c" ? " is-on" : "") + '" data-action="audience" data-key="' + NS.util.esc(segment.key) + '" data-audience="b2c" aria-pressed="' + (segment.audience === "b2c" ? "true" : "false") + '">People<small>Households. Sometimes called B2C.</small></button>' +
        '<button type="button" class="segmented-btn' + (segment.audience === "b2b" ? " is-on" : "") + '" data-action="audience" data-key="' + NS.util.esc(segment.key) + '" data-audience="b2b" aria-pressed="' + (segment.audience === "b2b" ? "true" : "false") + '">Companies<small>A role at a business. Sometimes called B2B.</small></button></div>' +
        groups +
        reachHTML(segment) +
        '<label>What do you call this group?<input data-seg-name="' + NS.util.esc(segment.key) + '" maxlength="48" placeholder="' + NS.util.esc(suggestion || "For example, Studio owners") + '" value="' + NS.util.esc(segment.name) + '"></label>' +
        '<details class="disclosure"><summary>Add a trait that is not listed</summary><div class="disclosure-body">' +
        (custom ? '<div class="chip-row">' + custom + "</div>" : "") +
        '<div class="edit-row"><input data-trait-input="' + NS.util.esc(segment.key) + '" maxlength="32" placeholder="A short trait" aria-label="Custom trait">' +
        '<button type="button" class="btn" data-action="trait-add" data-key="' + NS.util.esc(segment.key) + '">Add trait</button></div>' +
        "<p class='fine'>Custom traits make the group harder to find as a ready-made list.</p></div></details></section>";
    }).join("");
    return '<p class="sheet-lead">Could you find these people on a list or a network you already use?</p>' + cards +
      '<button type="button" class="btn" data-action="seg-add">Add another group</button>';
  }

  function swatchRow(persona, kind) {
    var spec = NS.avatars.swatches();
    var colors = kind === "skin" ? spec.skins : kind === "hair" ? spec.hairs : (persona.avatar.formal ? spec.formal : spec.casual);
    var field = kind === "skin" ? "skin" : kind === "hair" ? "hair" : "attire";
    return colors.map(function (color, index) {
      var on = persona.avatar[field] === index;
      return '<button type="button" class="swatch' + (on ? " is-on" : "") + '" style="background:' + color + '" data-action="avatar-trait" data-key="' + NS.util.esc(persona.key) + '" data-trait="' + field + '" data-value="' + index + '" aria-label="' + kind + " " + (index + 1) + '" aria-pressed="' + (on ? "true" : "false") + '"></button>';
    }).join("");
  }

  function personasHTML() {
    var segments = namedSegments();
    if (!segments.length) return "<p>Add a group first.</p>";
    return segments.map(function (segment) {
      var people = draft.personas.filter(function (persona) { return persona.segmentKey === segment.key; });
      var presets = NS.avatars.presets(segment.audience);
      var cards = people.map(function (persona) {
        if (!persona.avatar) persona.avatar = NS.avatars.blank(segment.audience);
        if (segment.audience === "b2b" && !persona.avatar.formal) persona.avatar = NS.avatars.blank("b2b");
        if (segment.audience === "b2c" && persona.avatar.formal && !persona.avatar.preset) persona.avatar.formal = false;
        var presetChips = presets.map(function (preset) {
          var on = persona.avatar.preset === preset.id;
          return '<button type="button" class="chip' + (on ? " is-on" : "") + '" data-action="avatar-preset" data-key="' + NS.util.esc(persona.key) + '" data-preset="' + preset.id + '" data-testid="avatar-preset" aria-pressed="' + (on ? "true" : "false") + '">' + NS.util.esc(preset.label) + "</button>";
        }).join("");
        var styles = NS.avatars.styles.map(function (label, index) {
          var on = persona.avatar.style === index;
          return '<button type="button" class="chip' + (on ? " is-on" : "") + '" data-action="avatar-trait" data-key="' + NS.util.esc(persona.key) + '" data-trait="style" data-value="' + index + '" aria-pressed="' + (on ? "true" : "false") + '">' + label + "</button>";
        }).join("");
        return '<article class="persona-editor" data-persona-key="' + NS.util.esc(persona.key) + '">' +
          '<div class="avatar lg">' + NS.avatars.render(persona.avatar) + "</div>" +
          '<div class="persona-fields">' +
          '<p class="fine">' + (segment.audience === "b2b" ? "Company person" : "Household person") + ". Pick a starting face, then adjust it.</p>" +
          '<div class="chip-row">' + presetChips + "</div>" +
          '<div class="trait-block"><span>Complexion</span><div class="swatches">' + swatchRow(persona, "skin") + "</div></div>" +
          '<div class="trait-block"><span>Hair</span><div class="swatches">' + swatchRow(persona, "hair") + "</div></div>" +
          '<div class="chip-row">' + styles + "</div>" +
          '<div class="trait-block"><span>' + (persona.avatar.formal ? "Jacket" : "Shirt") + '</span><div class="swatches">' + swatchRow(persona, "attire") + "</div></div>" +
          '<button type="button" class="chip' + (persona.avatar.glasses ? " is-on" : "") + '" data-action="avatar-glasses" data-key="' + NS.util.esc(persona.key) + '" aria-pressed="' + (persona.avatar.glasses ? "true" : "false") + '">Glasses</button>' +
          '<label>Name<input data-field="name" maxlength="48" value="' + NS.util.esc(persona.name) + '" placeholder="What you call them"></label>' +
          '<label>Role<input data-field="role" maxlength="48" value="' + NS.util.esc(persona.role) + '" placeholder="Owner, parent, buyer…"></label>' +
          '<label class="check"><input data-field="icp" type="checkbox"' + (persona.icp ? " checked" : "") + "> This is the best-fit person (ICP)</label>" +
          '<label>Why they fit<input data-field="icpNote" maxlength="80" value="' + NS.util.esc(persona.icpNote) + '" placeholder="Optional. Shows on the badge."></label>' +
          '<button type="button" class="text-btn" data-action="per-remove" data-key="' + NS.util.esc(persona.key) + '">Remove this person</button>' +
          "</div></article>";
      }).join("");
      return '<section class="segment-block"><header><h3>' + NS.util.esc(segment.name) + "</h3>" +
        '<button type="button" class="btn" data-action="per-add" data-key="' + NS.util.esc(segment.key) + '">Add a person</button></header>' +
        (cards || '<p class="fine">No one in this group yet.</p>') + "</section>";
    }).join("");
  }

  function reviewHTML() {
    var data = cleaned();
    var line = NS.geo.summary(data.market.geo);
    var body = data.segments.map(function (segment) {
      var read = NS.audience.reach(segment);
      var people = data.personas.filter(function (persona) { return persona.segmentKey === segment.key; });
      var cards = people.map(function (persona) {
        return '<div class="review-person"><div class="avatar">' + NS.avatars.render(persona.avatar || persona.avatarSeed) + "</div><div><strong>" +
          NS.util.esc(persona.name) + "</strong>" + (persona.icp ? ' <span class="icp">ICP</span>' : "") +
          (persona.role ? '<div class="persona-role">' + NS.util.esc(persona.role) + "</div>" : "") + "</div></div>";
      }).join("");
      return '<section class="review-block"><h3>' + NS.util.esc(segment.name) + " · " + (segment.audience === "b2b" ? "Companies" : "People") + "</h3>" +
        '<p class="fine">' + NS.util.esc(read.title) + ". " + NS.util.esc(read.detail) + "</p>" +
        (cards || "<p class='fine'>No people yet</p>") + "</section>";
    }).join("");
    var senderReady = data.sender.name && data.sender.postal;
    return "<p><strong>" + NS.util.esc(data.market.name || "Untitled market") + "</strong></p>" +
      (line ? "<p>" + NS.util.esc(line) + "</p>" : "") +
      (data.market.description ? "<p class='fine'>" + NS.util.esc(data.market.description) + "</p>" : "") +
      body +
      '<section class="check-card"><h3>Sender card</h3><p class="fine">Marketing email needs your name and a real mailing address. You can fill this now or when you write the first email.</p>' +
      '<label>Name people should see<input data-sender-name maxlength="80" value="' + NS.util.esc(draft.sender.name) + '" placeholder="Your name or company"></label>' +
      '<label>Mailing address<input data-sender-postal maxlength="160" value="' + NS.util.esc(draft.sender.postal) + '" placeholder="Street, city, state, ZIP"></label>' +
      '<p class="fine">' + (senderReady ? "Email can include this address." : "Email stays incomplete until this card is filled in.") + "</p></section>" +
      '<p class="legal-note">' + NS.util.esc(NS.compliance.DISCLAIMER) + "</p>";
  }

  function render() {
    if (geoHandle) {
      geoHandle.destroy();
      geoHandle = null;
    }
    var titles = [
      ["Where are they?", "Pick a region, or drop a pin. A name is optional."],
      ["Could you find them?", "Choose traits you could search for. The read tells you if a list is realistic."],
      ["Who are they?", "Give each person a face and a name. Best-fit is a badge, not a separate row."],
      ["Look it over", "This is what lands on the plane. Messages come next, one step at a time."]
    ];
    var meta = titles[draft.step - 1];
    var body = draft.step === 1 ? marketHTML() : draft.step === 2 ? segmentsHTML() : draft.step === 3 ? personasHTML() : reviewHTML();
    var nextLabel = draft.step === 4 ? "Put this on the plane" : "Continue";
    var wide = draft.step === 1 ? " is-wide" : "";
    root().innerHTML = '<form class="wizard-card' + wide + '" data-testid="wizard-card" role="dialog" aria-modal="true" aria-labelledby="wizard-title">' +
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
    if (draft.step === 1) {
      requestAnimationFrame(function () {
        if (!draft || draft.step !== 1) return;
        var host = root().querySelector("[data-geo]");
        if (host) geoHandle = NS.geo.attach(host, draft);
      });
    }
  }

  function segmentByKey(key) {
    return draft.segments.filter(function (segment) { return segment.key === key; })[0] || null;
  }

  function personaByKey(key) {
    return draft.personas.filter(function (persona) { return persona.key === key; })[0] || null;
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
      if (removedSegments.length) parts.push("Groups removed: " + removedSegments.map(function (segment) { return segment.name; }).join(", ") + ".");
      if (removedPersonas.length) parts.push("People removed: " + removedPersonas.map(function (persona) { return persona.name; }).join(", ") + ".");
      if (nodeLoss) parts.push(nodeLoss + " step" + (nodeLoss === 1 ? "" : "s") + " on those people will be deleted.");
      var ok = await NS.ui.confirm({
        title: "Update the plane?",
        body: parts.join(" "),
        confirmLabel: "Update the plane",
        danger: true
      });
      if (!ok) return;
    }
    NS.model.applyMarketDraft(data);
    close();
    NS.ui.toast("The market is on the plane. Open a circle to plan the first message.");
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
          title: "Remove this group?",
          body: "People drafted in " + (segment.name.trim() || "this group") + " will be dropped.",
          confirmLabel: "Remove group",
          danger: true
        });
        if (!ok) return;
      }
      draft.personas = draft.personas.filter(function (persona) { return persona.segmentKey !== segment.key; });
      draft.segments.splice(index, 1);
      if (!draft.segments.length) draft.segments.push(blankSegment());
      render();
      return;
    }
    if (action === "audience") {
      var chosen = segmentByKey(button.dataset.key);
      if (!chosen) return;
      var nextAudience = button.dataset.audience === "b2b" ? "b2b" : "b2c";
      if (chosen.audience !== nextAudience) {
        chosen.audience = nextAudience;
        chosen.params = NS.audience.sanitize(nextAudience, chosen.params);
        draft.personas.forEach(function (persona) {
          if (persona.segmentKey === chosen.key) persona.avatar = NS.avatars.blank(nextAudience);
        });
      }
      draft.error = "";
      render();
      return;
    }
    if (action === "toggle-param") {
      var paramSegment = segmentByKey(button.dataset.key);
      if (!paramSegment) return;
      var list = paramSegment.params[button.dataset.group] || [];
      var value = button.dataset.value;
      paramSegment.params[button.dataset.group] = list.indexOf(value) === -1
        ? list.concat([value])
        : list.filter(function (item) { return item !== value; });
      render();
      return;
    }
    if (action === "trait-add") {
      var traitSegment = segmentByKey(button.dataset.key);
      var input = root().querySelector('[data-trait-input="' + button.dataset.key + '"]');
      var label = input ? input.value.trim() : "";
      if (!traitSegment || !label) return;
      if (traitSegment.custom.length >= 4) {
        draft.error = "Four extra traits is enough.";
        render();
        return;
      }
      traitSegment.custom.push({ id: NS.util.uid("trait"), label: label.slice(0, 32) });
      render();
      return;
    }
    if (action === "trait-remove") {
      var host = segmentByKey(button.dataset.key);
      if (!host) return;
      host.custom = host.custom.filter(function (trait) { return trait.id !== button.dataset.trait; });
      render();
      return;
    }
    if (action === "per-add") {
      var parent = segmentByKey(button.dataset.key);
      draft.personas.push(blankPersona(button.dataset.key, parent ? parent.audience : "b2c"));
      draft.error = "";
      render();
      return;
    }
    if (action === "per-remove") {
      draft.personas = draft.personas.filter(function (persona) { return persona.key !== button.dataset.key; });
      render();
      return;
    }
    if (action === "avatar-preset") {
      var person = personaByKey(button.dataset.key);
      var owner = person && segmentByKey(person.segmentKey);
      var preset = NS.avatars.presets(owner && owner.audience === "b2b" ? "b2b" : "b2c").filter(function (item) {
        return item.id === button.dataset.preset;
      })[0];
      if (person && preset) person.avatar = Object.assign({}, preset);
      render();
      return;
    }
    if (action === "avatar-trait") {
      var edited = personaByKey(button.dataset.key);
      if (!edited || !edited.avatar) return;
      edited.avatar[button.dataset.trait] = Number(button.dataset.value);
      edited.avatar.preset = "";
      render();
      return;
    }
    if (action === "avatar-glasses") {
      var faced = personaByKey(button.dataset.key);
      if (!faced || !faced.avatar) return;
      faced.avatar.glasses = !faced.avatar.glasses;
      faced.avatar.preset = "";
      render();
    }
  }

  function init() {
    var node = root();
    node.addEventListener("click", onClick);
    node.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") return;
      if (event.target.matches("[data-geo-search]")) event.preventDefault();
    });
    node.addEventListener("input", function (event) {
      if (event.target.closest("[data-geo]")) return;
      syncFromDom();
    });
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
        if (draft.step === 2) {
          draft.segments.forEach(function (segment) {
            if (!segment.name.trim()) segment.name = NS.audience.suggestName(segment);
          });
        }
        draft.step += 1;
        render();
        return;
      }
      finish();
    });
  }

  NS.wizard = { init: init, open: open, close: close, isOpen: isOpen };
})(window.NodeCRM);
