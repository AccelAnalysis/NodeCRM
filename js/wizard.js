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
    NS.stages.closeTrigger();
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
      error: "",
      focusIndex: 0,
      trait: "",
      focusKey: "",
      personKey: ""
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
    return '<div class="progress" role="progressbar" aria-valuemin="1" aria-valuemax="4" aria-valuenow="' + draft.step + '" aria-label="Step ' + draft.step + ' of 4">' +
      '<span style="width:' + (draft.step / 4 * 100) + '%"></span></div>';
  }

  function marketHTML() {
    return '<label>Name<input data-market-name data-testid="market-name" maxlength="80" placeholder="Optional" value="' + NS.util.esc(draft.market.name) + '"></label>' +
      NS.geo.shell() +
      '<details class="disclosure is-quiet"><summary>Note</summary><div class="disclosure-body">' +
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
    if (!segment.audience) return "";
    return '<div class="status-row" data-testid="reach-read"><span class="status-pill is-' + read.level + '">' + NS.util.esc(read.title) + "</span>" +
      '<details class="disclosure is-quiet"><summary>Why?</summary><div class="disclosure-body"><p class="why-line">' + NS.util.esc(read.detail) + "</p></div></details></div>";
  }

  function segmentsHTML() {
    if (draft.focusIndex >= draft.segments.length) draft.focusIndex = 0;
    var index = draft.focusIndex || 0;
    var segment = draft.segments[index];
    var switcher = '<div class="segmented" role="tablist" aria-label="Groups">' + draft.segments.map(function (item, itemIndex) {
      var label = item.name.trim() || String(itemIndex + 1);
      return '<button type="button" class="segmented-btn' + (itemIndex === index ? " is-on" : "") + '" data-action="focus-seg" data-index="' + itemIndex + '" aria-pressed="' + (itemIndex === index ? "true" : "false") + '">' + NS.util.esc(label) + "</button>";
    }).join("") + '<button type="button" class="segmented-btn" data-action="seg-add" aria-label="Add group">+</button></div>';
    var book = segment.audience === "b2b" ? NS.audience.b2b : segment.audience === "b2c" ? NS.audience.b2c : null;
    var traits = "";
    if (book) {
      var traitId = draft.trait && book.groups.some(function (group) { return group.id === draft.trait; }) ? draft.trait : book.groups[0].id;
      draft.trait = traitId;
      var tabs = '<div class="segmented" role="tablist" aria-label="Traits">' + book.groups.map(function (group) {
        var on = group.id === traitId;
        return '<button type="button" class="segmented-btn' + (on ? " is-on" : "") + '" data-action="focus-trait" data-group="' + group.id + '" aria-pressed="' + (on ? "true" : "false") + '">' + NS.util.esc(group.label) + "</button>";
      }).join("") + "</div>";
      var group = book.groups.filter(function (item) { return item.id === traitId; })[0];
      traits = tabs + chipRow(segment, group);
    }
    var custom = (segment.custom || []).map(function (trait) {
      return '<span class="place-chip"><span>' + NS.util.esc(trait.label) + '</span><button type="button" class="icon-btn" data-action="trait-remove" data-key="' + NS.util.esc(segment.key) + '" data-trait="' + NS.util.esc(trait.id) + '" aria-label="Remove ' + NS.util.esc(trait.label) + '">' + NS.util.icon("close") + "</button></span>";
    }).join("");
    var suggestion = NS.audience.suggestName(segment);
    return switcher +
      '<div class="segmented" role="radiogroup" aria-label="People or companies">' +
      '<button type="button" class="segmented-btn' + (segment.audience === "b2c" ? " is-on" : "") + '" data-action="audience" data-key="' + NS.util.esc(segment.key) + '" data-audience="b2c" aria-pressed="' + (segment.audience === "b2c" ? "true" : "false") + '">People</button>' +
      '<button type="button" class="segmented-btn' + (segment.audience === "b2b" ? " is-on" : "") + '" data-action="audience" data-key="' + NS.util.esc(segment.key) + '" data-audience="b2b" aria-pressed="' + (segment.audience === "b2b" ? "true" : "false") + '">Companies</button></div>' +
      traits +
      reachHTML(segment) +
      '<label>Name<input data-seg-name="' + NS.util.esc(segment.key) + '" maxlength="48" placeholder="' + NS.util.esc(suggestion || "Name") + '" value="' + NS.util.esc(segment.name) + '"></label>' +
      '<details class="disclosure is-quiet"><summary>Other trait</summary><div class="disclosure-body">' +
      (custom ? '<div class="chip-row">' + custom + "</div>" : "") +
      '<div class="edit-row"><input data-trait-input="' + NS.util.esc(segment.key) + '" maxlength="32" placeholder="Trait" aria-label="Custom trait">' +
      '<button type="button" class="btn" data-action="trait-add" data-key="' + NS.util.esc(segment.key) + '">Add</button></div></div></details>' +
      (draft.segments.length > 1 ? '<button type="button" class="text-btn" data-action="seg-remove" data-index="' + index + '">Remove group</button>' : "");
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
    if (!segments.length) return "";
    var segIndex = segments.findIndex(function (segment) { return segment.key === draft.focusKey; });
    if (segIndex < 0) segIndex = 0;
    draft.focusKey = segments[segIndex].key;
    var segment = segments[segIndex];
    var switcher = segments.length > 1
      ? '<div class="segmented" role="tablist" aria-label="Groups">' + segments.map(function (item) {
        var on = item.key === segment.key;
        return '<button type="button" class="segmented-btn' + (on ? " is-on" : "") + '" data-action="focus-key" data-key="' + NS.util.esc(item.key) + '" aria-pressed="' + (on ? "true" : "false") + '">' + NS.util.esc(item.name) + "</button>";
      }).join("") + "</div>"
      : "";
    var people = draft.personas.filter(function (persona) { return persona.segmentKey === segment.key; });
    if (draft.personKey && !people.some(function (persona) { return persona.key === draft.personKey; })) draft.personKey = "";
    if (!draft.personKey && people.length) draft.personKey = people[0].key;
    var faces = '<div class="preset-row">' + people.map(function (persona) {
      var on = persona.key === draft.personKey;
      return '<button type="button" class="preset' + (on ? " is-on" : "") + '" data-action="focus-person" data-key="' + NS.util.esc(persona.key) + '" aria-pressed="' + (on ? "true" : "false") + '" aria-label="' + NS.util.esc(persona.name || "Person") + '"><span class="avatar sm">' + NS.avatars.render(persona.avatar || persona.avatarSeed) + "</span></button>";
    }).join("") + '<button type="button" class="preset preset-add" data-action="per-add" data-key="' + NS.util.esc(segment.key) + '" aria-label="Add a person">' + NS.util.icon("plus") + "</button></div>";
    var persona = people.filter(function (item) { return item.key === draft.personKey; })[0];
    if (!persona) return switcher + faces;
    if (!persona.avatar) persona.avatar = NS.avatars.blank(segment.audience);
    var presets = NS.avatars.presets(segment.audience);
    var presetFaces = '<div class="preset-row">' + presets.map(function (preset) {
      var on = persona.avatar.preset === preset.id;
      return '<button type="button" class="preset' + (on ? " is-on" : "") + '" data-action="avatar-preset" data-key="' + NS.util.esc(persona.key) + '" data-preset="' + preset.id + '" data-testid="avatar-preset" aria-pressed="' + (on ? "true" : "false") + '" aria-label="' + NS.util.esc(preset.label) + '"><span class="avatar sm">' + NS.avatars.render(preset) + "</span></button>";
    }).join("") + "</div>";
    return switcher + faces +
      '<article class="dress-layout" data-persona-key="' + NS.util.esc(persona.key) + '">' +
      '<div class="avatar xl">' + NS.avatars.render(persona.avatar) + "</div>" +
      presetFaces +
      '<label>Name<input data-field="name" maxlength="48" value="' + NS.util.esc(persona.name) + '" placeholder="Name"></label>' +
      '<label>Role<input data-field="role" maxlength="48" value="' + NS.util.esc(persona.role) + '" placeholder="Role"></label>' +
      '<label class="check"><input data-field="icp" type="checkbox"' + (persona.icp ? " checked" : "") + "> Best fit</label>" +
      '<details class="disclosure is-quiet"' + (persona.icp ? " open" : "") + "><summary>Note</summary><div class=\"disclosure-body\">" +
      '<label>Note<input data-field="icpNote" maxlength="80" value="' + NS.util.esc(persona.icpNote) + '" placeholder="Optional"></label></div></details>' +
      '<button type="button" class="text-btn" data-action="per-remove" data-key="' + NS.util.esc(persona.key) + '">Remove</button>' +
      "</article>";
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
      return '<section class="review-block"><h3>' + NS.util.esc(segment.name) + "</h3>" +
        '<span class="status-pill is-' + read.level + '">' + NS.util.esc(read.title) + "</span>" +
        (cards || "") + "</section>";
    }).join("");
    var senderReady = data.sender.name && data.sender.postal;
    return "<p><strong>" + NS.util.esc(data.market.name || "Market") + "</strong></p>" +
      (line ? "<p>" + NS.util.esc(line) + "</p>" : "") +
      body +
      '<div class="from-line"><label>From<input data-sender-name maxlength="80" value="' + NS.util.esc(draft.sender.name) + '" placeholder="Name"></label>' +
      '<label>Address<input data-sender-postal maxlength="160" value="' + NS.util.esc(draft.sender.postal) + '" placeholder="Street, city, ZIP"></label></div>' +
      '<span class="status-pill is-' + (senderReady ? "ok" : "wait") + '">' + (senderReady ? "Ready" : "Needs a sender") + "</span>" +
      '<details class="disclosure is-quiet"><summary>Not legal advice</summary><div class="disclosure-body"><p class="why-line">' + NS.util.esc(NS.compliance.DISCLAIMER) + "</p></div></details>";
  }

  function render() {
    if (geoHandle) {
      geoHandle.destroy();
      geoHandle = null;
    }
    var titles = ["Where", "Find", "People", "Review"];
    var meta = [titles[draft.step - 1], ""];
    var body = draft.step === 1 ? marketHTML() : draft.step === 2 ? segmentsHTML() : draft.step === 3 ? personasHTML() : reviewHTML();
    var nextLabel = draft.step === 4 ? "Put this on the plane" : "Continue";
    var wide = draft.step === 1 ? " is-wide" : "";
    root().innerHTML = '<form class="wizard-card' + wide + '" data-testid="wizard-card" role="dialog" aria-modal="true" aria-labelledby="wizard-title">' +
      '<div class="sheet-grabber" aria-hidden="true"></div>' +
      '<header class="wizard-head"><div><p class="caption">' + draft.step + ' of 4</p><h2 id="wizard-title">' + meta[0] + "</h2></div>" +
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
    NS.ui.toast("On the plane.");
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
    if (action === "focus-seg") {
      draft.focusIndex = Number(button.dataset.index) || 0;
      draft.trait = "";
      draft.error = "";
      render();
      return;
    }
    if (action === "focus-trait") {
      draft.trait = button.dataset.group || "";
      render();
      return;
    }
    if (action === "focus-key") {
      draft.focusKey = button.dataset.key || "";
      draft.personKey = "";
      render();
      return;
    }
    if (action === "focus-person") {
      draft.personKey = button.dataset.key || "";
      render();
      return;
    }
    if (action === "seg-add") {
      draft.segments.push(blankSegment());
      draft.focusIndex = draft.segments.length - 1;
      draft.trait = "";
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
      var created = blankPersona(button.dataset.key, parent ? parent.audience : "b2c");
      draft.personas.push(created);
      draft.personKey = created.key;
      draft.focusKey = button.dataset.key;
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
