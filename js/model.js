(function (NS) {
  "use strict";

  var listeners = [];
  var state = null;

  function blankSender() {
    return { name: "", postal: "" };
  }

  function createInitial() {
    return {
      version: 1,
      market: null,
      segments: [],
      personas: [],
      stages: [{ id: "stage_awareness", name: "Awareness", kind: "awareness" }],
      nodes: [],
      awareness: { channels: [], wires: [], people: [] },
      templates: [],
      extras: [],
      sender: blankSender()
    };
  }

  function get() { return state; }

  function subscribe(fn) {
    listeners.push(fn);
    return function () {
      listeners = listeners.filter(function (item) { return item !== fn; });
    };
  }

  function commit(meta) {
    var saved = NS.storage.save(state);
    var detail = Object.assign({ saved: saved }, meta || {});
    listeners.forEach(function (fn) { fn(state, detail); });
  }

  function awarenessStage() {
    return state.stages.filter(function (stage) { return stage.kind === "awareness"; })[0] || state.stages[0];
  }

  function personaById(id) {
    return state.personas.filter(function (persona) { return persona.id === id; })[0] || null;
  }

  function stageById(id) {
    return state.stages.filter(function (stage) { return stage.id === id; })[0] || null;
  }

  function segmentById(id) {
    return state.segments.filter(function (segment) { return segment.id === id; })[0] || null;
  }

  function stageByName(name) {
    var key = String(name || "").trim().toLowerCase();
    return state.stages.filter(function (stage) { return stage.name.toLowerCase() === key; })[0] || null;
  }

  function findNode(id) {
    return state.nodes.filter(function (node) { return node.id === id; })[0] || null;
  }

  function nodeAt(personaId, stageId) {
    return state.nodes.filter(function (node) {
      return node.personaId === personaId && node.stageId === stageId;
    })[0] || null;
  }

  function findPerson(id) {
    return state.awareness.people.filter(function (person) { return person.id === id; })[0] || null;
  }

  function hydrateNode(raw, workspace) {
    return {
      id: String(raw.id),
      personaId: raw.personaId,
      stageId: raw.stageId,
      mode: raw.mode === "cycle" ? "cycle" : "linear",
      exitAction: String(raw.exitAction || ""),
      templateId: raw.templateId || null,
      comms: NS.registry.mergeComms(raw.comms, workspace),
      createdAt: raw.createdAt || null
    };
  }

  function normalizeMarket(raw) {
    if (!raw || typeof raw !== "object") return null;
    var name = String(raw.name || "").trim();
    var description = String(raw.description || "").trim();
    var places = NS.geo.normalizePlaces(raw.geo && raw.geo.places);
    if (!name && !description && !places.length) return null;
    return { name: name, description: description, geo: { places: places } };
  }

  function normalizeCustom(list) {
    if (!Array.isArray(list)) return [];
    return list.map(function (item) {
      var label = String((item && item.label) || "").trim().slice(0, 32);
      if (!label) return null;
      return { id: String(item.id || NS.util.uid("trait")), label: label };
    }).filter(Boolean).slice(0, 4);
  }

  function normalizeAvatar(raw) {
    if (!raw || typeof raw !== "object") return null;
    return NS.avatars.normalize(raw);
  }

  function normalize(data) {
    var base = createInitial();
    var next = {
      version: 1,
      market: normalizeMarket(data.market),
      segments: Array.isArray(data.segments) ? data.segments.map(function (segment) {
        var audience = segment.audience === "b2b" ? "b2b" : segment.audience === "b2c" ? "b2c" : "";
        return {
          id: String(segment.id),
          name: String(segment.name || "Segment").trim() || "Segment",
          description: String(segment.description || ""),
          audience: audience,
          params: NS.audience.sanitize(audience || "b2c", segment.params),
          custom: normalizeCustom(segment.custom)
        };
      }) : [],
      personas: [],
      stages: Array.isArray(data.stages) && data.stages.length
        ? data.stages.map(function (stage) {
          var advance = NS.registry.eventById(stage.advanceOn);
          return {
            id: String(stage.id),
            name: String(stage.name || "Stage").trim() || "Stage",
            kind: stage.kind === "awareness" ? "awareness" : "standard",
            advanceOn: advance ? advance.id : ""
          };
        })
        : base.stages,
      nodes: [],
      awareness: { channels: [], wires: [], people: [] },
      templates: Array.isArray(data.templates) ? data.templates : [],
      extras: (Array.isArray(data.extras) ? data.extras : []).map(function (extra) {
        var name = String(extra.name || "").trim().slice(0, 40);
        if (!name) return null;
        return {
          id: String(extra.id || NS.util.uid("ext")),
          name: name,
          group: extra.group === "social" ? "social" : "custom"
        };
      }).filter(Boolean).slice(0, 12),
      sender: {
        name: String((data.sender && data.sender.name) || "").trim().slice(0, 80),
        postal: String((data.sender && data.sender.postal) || "").trim().slice(0, 160)
      }
    };

    var seenAwareness = false;
    next.stages.forEach(function (stage) {
      if (stage.kind !== "awareness") return;
      if (seenAwareness) stage.kind = "standard";
      seenAwareness = true;
    });
    if (!seenAwareness) next.stages[0].kind = "awareness";
    next.stages.forEach(function (stage) {
      if (stage.kind === "awareness") stage.advanceOn = "";
      else stage.advanceOn = stage.advanceOn || "";
    });
    next.stages.sort(function (a, b) {
      return (a.kind === "awareness" ? 0 : 1) - (b.kind === "awareness" ? 0 : 1);
    });

    var segmentIds = {};
    next.segments.forEach(function (segment) { segmentIds[segment.id] = true; });
    next.personas = (Array.isArray(data.personas) ? data.personas : []).filter(function (persona) {
      return segmentIds[persona.segmentId];
    }).map(function (persona) {
      return {
        id: String(persona.id),
        segmentId: persona.segmentId,
        name: String(persona.name || "Persona").trim() || "Persona",
        role: String(persona.role || ""),
        icp: !!persona.icp,
        icpNote: String(persona.icpNote || ""),
        avatarSeed: Number(persona.avatarSeed) || 1,
        avatar: normalizeAvatar(persona.avatar)
      };
    });

    var personaIds = {};
    next.personas.forEach(function (persona) { personaIds[persona.id] = true; });
    var stageIds = {};
    next.stages.forEach(function (stage) { stageIds[stage.id] = true; });
    next.nodes = (Array.isArray(data.nodes) ? data.nodes : []).filter(function (node) {
      return personaIds[node.personaId] && stageIds[node.stageId];
    }).map(function (node) { return hydrateNode(node, next); });

    var channels = (data.awareness && data.awareness.channels) || [];
    next.awareness.channels = channels.map(function (channel, index) {
      var catalogId = channel.catalogId || NS.registry.catalogIdForKind(channel.kind) || "";
      var spec = catalogId ? NS.registry.channelById(catalogId, next) : null;
      var actions = {};
      if (spec) {
        spec.actions.forEach(function (action, actionIndex) {
          if (channel.actions && channel.actions[action.id] != null) actions[action.id] = !!channel.actions[action.id];
          else actions[action.id] = actionIndex === 0;
        });
      }
      return {
        id: String(channel.id),
        name: String(channel.name || (spec ? spec.label : "Channel")).trim() || "Channel",
        catalogId: spec ? spec.id : "custom",
        kind: spec ? spec.id : String(channel.kind || "custom"),
        actions: actions,
        x: Number.isFinite(Number(channel.x)) ? Number(channel.x) : 18 + (index % 4) * 16,
        y: Number.isFinite(Number(channel.y)) ? Number(channel.y) : 24 + (index % 3) * 18
      };
    });
    var channelIds = {};
    next.awareness.channels.forEach(function (channel) { channelIds[channel.id] = true; });
    var wires = (data.awareness && data.awareness.wires) || [];
    next.awareness.wires = wires.filter(function (wire) {
      return channelIds[wire.from] && channelIds[wire.to] && wire.from !== wire.to;
    }).map(function (wire) {
      return { id: String(wire.id), from: wire.from, to: wire.to };
    });
    var people = (data.awareness && data.awareness.people) || [];
    next.awareness.people = people.map(function (person) {
      var status = person.status === "contact" || person.status === "advanced" || person.status === "opted_out" ? person.status : "lead";
      return {
        id: String(person.id),
        name: String(person.name || "Lead").trim() || "Lead",
        status: status,
        channelId: person.channelId && channelIds[person.channelId] ? person.channelId : null,
        personaId: person.personaId && personaIds[person.personaId] ? person.personaId : null,
        advancedStageId: person.advancedStageId && stageIds[person.advancedStageId] ? person.advancedStageId : null,
        note: String(person.note || "")
      };
    });
    return next;
  }

  function init() {
    var loaded = NS.storage.load();
    state = loaded ? normalize(loaded) : createInitial();
    if (loaded) NS.storage.save(state);
  }

  function isPristine() {
    return !state.market &&
      state.segments.length === 0 &&
      state.personas.length === 0 &&
      state.stages.length === 1 &&
      state.stages[0].kind === "awareness" &&
      state.stages[0].name === "Awareness" &&
      state.nodes.length === 0 &&
      state.awareness.channels.length === 0 &&
      state.awareness.people.length === 0 &&
      state.templates.length === 0 &&
      state.extras.length === 0 &&
      !state.sender.name &&
      !state.sender.postal;
  }

  function marketTitle() {
    if (!state.market) return "";
    if (state.market.name) return state.market.name;
    var line = NS.geo.summary(state.market.geo).replace(/\.$/, "");
    return line || "Untitled market";
  }

  function reset() {
    state = createInitial();
    commit({ render: "plane" });
  }

  function replaceAll(next) {
    state = normalize(next);
    commit({ render: "plane" });
  }

  function applyMarketDraft(draft) {
    var places = NS.geo.normalizePlaces(draft.market.geo && draft.market.geo.places);
    state.market = {
      name: draft.market.name.trim(),
      description: (draft.market.description || "").trim(),
      geo: { places: places }
    };
    if (draft.sender) {
      state.sender.name = String(draft.sender.name || "").trim().slice(0, 80);
      state.sender.postal = String(draft.sender.postal || "").trim().slice(0, 160);
    }
    var keyToId = {};
    state.segments = draft.segments.map(function (segment) {
      var id = segment.id || NS.util.uid("seg");
      keyToId[segment.key] = id;
      var audience = segment.audience === "b2b" ? "b2b" : "b2c";
      return {
        id: id,
        name: segment.name.trim(),
        description: "",
        audience: audience,
        params: NS.audience.sanitize(audience, segment.params),
        custom: normalizeCustom(segment.custom)
      };
    });
    state.personas = draft.personas.map(function (persona) {
      return {
        id: persona.id || NS.util.uid("per"),
        segmentId: keyToId[persona.segmentKey],
        name: persona.name.trim(),
        role: (persona.role || "").trim(),
        icp: !!persona.icp,
        icpNote: (persona.icpNote || "").trim(),
        avatarSeed: Number(persona.avatarSeed) || 1,
        avatar: persona.avatar ? NS.avatars.normalize(persona.avatar) : null
      };
    }).filter(function (persona) { return persona.segmentId; });
    var personaIds = {};
    state.personas.forEach(function (persona) { personaIds[persona.id] = true; });
    state.nodes = state.nodes.filter(function (node) { return personaIds[node.personaId]; });
    state.awareness.people.forEach(function (person) {
      if (person.personaId && !personaIds[person.personaId]) person.personaId = null;
    });
    commit({ render: "plane" });
  }

  function removePersona(id) {
    state.personas = state.personas.filter(function (persona) { return persona.id !== id; });
    state.nodes = state.nodes.filter(function (node) { return node.personaId !== id; });
    state.awareness.people.forEach(function (person) {
      if (person.personaId === id) person.personaId = null;
    });
    commit({ render: "plane" });
  }

  function nameTaken(name, exceptId) {
    var key = name.trim().toLowerCase();
    return state.stages.some(function (stage) {
      return stage.id !== exceptId && stage.name.toLowerCase() === key;
    });
  }

  function addStage(name) {
    var trimmed = String(name || "").trim();
    if (!trimmed) return { ok: false, error: "Name the stage." };
    if (nameTaken(trimmed)) return { ok: false, error: "That stage is already on the plane." };
    state.stages.push({ id: NS.util.uid("stg"), name: trimmed, kind: "standard" });
    commit({ render: "plane" });
    return { ok: true };
  }

  function renameStage(id, name) {
    var trimmed = String(name || "").trim();
    var stage = stageById(id);
    if (!stage) return { ok: false, error: "Stage not found." };
    if (!trimmed) return { ok: false, error: "Name the stage." };
    if (trimmed === stage.name) return { ok: true, unchanged: true };
    if (nameTaken(trimmed, id)) return { ok: false, error: "Another stage already uses that name." };
    stage.name = trimmed;
    commit({ render: "plane" });
    return { ok: true };
  }

  function removeStage(id) {
    var stage = stageById(id);
    if (!stage) return { ok: false, error: "Stage not found." };
    if (stage.kind === "awareness") {
      return { ok: false, error: "The first stage stays so the channel map has a home. Rename it if you want a different label." };
    }
    state.stages = state.stages.filter(function (item) { return item.id !== id; });
    state.nodes = state.nodes.filter(function (node) { return node.stageId !== id; });
    state.awareness.people.forEach(function (person) {
      if (person.advancedStageId === id) person.advancedStageId = null;
    });
    commit({ render: "plane" });
    return { ok: true };
  }

  function moveStage(id, dir) {
    var index = state.stages.findIndex(function (stage) { return stage.id === id; });
    if (index < 0) return { ok: false };
    var stage = state.stages[index];
    if (stage.kind === "awareness") return { ok: false, error: "The channel-map stage stays first." };
    var target = index + dir;
    if (target <= 0 || target >= state.stages.length) return { ok: false };
    var copy = state.stages.slice();
    var moved = copy.splice(index, 1)[0];
    copy.splice(target, 0, moved);
    state.stages = copy;
    commit({ render: "plane" });
    return { ok: true };
  }

  function planRecommended(defs) {
    var awareness = awarenessStage();
    var others = state.stages.filter(function (stage) { return stage.id !== awareness.id; });
    var keep = Math.min(others.length, defs.length - 1);
    var renames = awareness.name !== defs[0].name ? 1 : 0;
    var i;
    for (i = 0; i < keep; i += 1) {
      if (others[i].name !== defs[i + 1].name) renames += 1;
    }
    var dropped = others.slice(defs.length - 1);
    var nodeLoss = state.nodes.filter(function (node) {
      return dropped.some(function (stage) { return stage.id === node.stageId; });
    }).length;
    var adds = Math.max(0, defs.length - 1 - others.length);
    return {
      already: renames === 0 && dropped.length === 0 && adds === 0,
      renames: renames,
      adds: adds,
      dropped: dropped,
      nodeLoss: nodeLoss
    };
  }

  function applyRecommended(defs) {
    var awareness = awarenessStage();
    var others = state.stages.filter(function (stage) { return stage.id !== awareness.id; });
    var next = [];
    awareness.name = defs[0].name;
    awareness.kind = "awareness";
    next.push(awareness);
    var i;
    for (i = 1; i < defs.length; i += 1) {
      var existing = others[i - 1];
      if (existing) {
        existing.name = defs[i].name;
        existing.kind = "standard";
        next.push(existing);
      } else {
        next.push({ id: NS.util.uid("stg"), name: defs[i].name, kind: "standard" });
      }
    }
    var dropped = others.slice(defs.length - 1);
    var droppedIds = {};
    dropped.forEach(function (stage) { droppedIds[stage.id] = true; });
    next.forEach(function (stage) {
      if (stage.kind === "awareness") {
        stage.advanceOn = "";
        return;
      }
      if (!stage.advanceOn) {
        var suggested = NS.registry.defaultEventFor(stage.name);
        if (suggested) stage.advanceOn = suggested;
      }
    });
    state.stages = next;
    state.nodes = state.nodes.filter(function (node) { return !droppedIds[node.stageId]; });
    state.awareness.people.forEach(function (person) {
      if (person.advancedStageId && droppedIds[person.advancedStageId]) person.advancedStageId = null;
    });
    commit({ render: "plane" });
    return { ok: true };
  }

  function updatePersona(id, patch) {
    var persona = personaById(id);
    if (!persona || !patch) return { ok: false };
    if (patch.name != null) {
      var name = String(patch.name).trim().slice(0, 48);
      if (name) persona.name = name;
    }
    if (patch.role != null) persona.role = String(patch.role).slice(0, 48);
    if (patch.icp != null) persona.icp = !!patch.icp;
    if (patch.avatar) {
      persona.avatar = NS.avatars.normalize(Object.assign({}, persona.avatar || {}, patch.avatar));
      if (patch.avatar.preset != null) persona.avatar.preset = String(patch.avatar.preset || "");
    }
    commit({ render: "plane" });
    return { ok: true };
  }

  function nextStage(stageId) {
    var index = state.stages.findIndex(function (stage) { return stage.id === stageId; });
    if (index < 0) return null;
    return state.stages[index + 1] || null;
  }

  function setAdvance(stageId, eventId) {
    var stage = stageById(stageId);
    if (!stage || stage.kind === "awareness") return { ok: false };
    if (!eventId) {
      stage.advanceOn = "";
      commit({ render: "plane" });
      return { ok: true };
    }
    var event = NS.registry.eventById(eventId);
    if (!event) return { ok: false };
    stage.advanceOn = event.id;
    commit({ render: "plane" });
    return { ok: true };
  }

  function markAdvance(personaId, stageId) {
    var next = nextStage(stageId);
    if (!next || !next.advanceOn) return { ok: false, error: "Choose what moves people into the next stage." };
    var existing = nodeAt(personaId, next.id);
    if (existing) return { ok: true, stage: next, node: existing, existed: true };
    var node = createNode(personaId, next.id);
    return { ok: true, stage: next, node: node, existed: false };
  }

  function peekAdvanceStage() {
    var named = stageByName("Consideration");
    if (named) return named;
    var awareness = awarenessStage();
    var index = state.stages.findIndex(function (stage) { return stage.id === awareness.id; });
    return state.stages[index + 1] || null;
  }

  function ensureAdvanceStage() {
    var existing = peekAdvanceStage();
    if (existing) return { stage: existing, created: false };
    var created = { id: NS.util.uid("stg"), name: "Consideration", kind: "standard" };
    var awareness = awarenessStage();
    var index = state.stages.findIndex(function (stage) { return stage.id === awareness.id; });
    state.stages.splice(index + 1, 0, created);
    return { stage: created, created: true };
  }

  function createNode(personaId, stageId) {
    var existing = nodeAt(personaId, stageId);
    if (existing) return existing;
    var node = {
      id: NS.util.uid("nod"),
      personaId: personaId,
      stageId: stageId,
      mode: "linear",
      exitAction: "",
      templateId: null,
      comms: NS.registry.blankComms(state),
      createdAt: new Date().toISOString()
    };
    state.nodes.push(node);
    commit({ render: "plane", animateNodeId: node.id });
    return node;
  }

  function writeNode(id, mutator, meta) {
    var node = findNode(id);
    if (!node) return null;
    mutator(node);
    commit(Object.assign({ render: "node", nodeId: id }, meta || {}));
    return node;
  }

  function updateNodeFields(id, fields) {
    return writeNode(id, function (node) {
      if (fields.mode) node.mode = fields.mode === "cycle" ? "cycle" : "linear";
      if (fields.exitAction !== undefined) node.exitAction = fields.exitAction;
      if (fields.comms) node.comms = NS.registry.mergeComms(fields.comms, state);
      node.templateId = fields.templateId === undefined ? node.templateId : fields.templateId;
    }, { render: "none", nodeId: id });
  }

  function deleteNode(id) {
    state.nodes = state.nodes.filter(function (node) { return node.id !== id; });
    commit({ render: "plane" });
  }

  function cloneFrom(targetId, sourceId) {
    var source = findNode(sourceId);
    if (!source) return;
    writeNode(targetId, function (node) {
      node.mode = source.mode;
      node.exitAction = source.exitAction;
      node.comms = NS.registry.mergeComms(source.comms, state);
      node.templateId = null;
    });
  }

  function keepCopyChangeCadence(targetId, sourceId) {
    var source = findNode(sourceId);
    if (!source) return;
    writeNode(targetId, function (node) {
      NS.registry.list(state).forEach(function (ch) {
        if (!node.comms[ch.id] || !source.comms[ch.id]) return;
        node.comms[ch.id].copy = NS.util.clone(source.comms[ch.id].copy);
        node.comms[ch.id].actions = NS.util.clone(source.comms[ch.id].actions);
        node.comms[ch.id].checks = NS.util.clone(source.comms[ch.id].checks);
        node.comms[ch.id].enabled = source.comms[ch.id].enabled;
      });
      node.templateId = null;
    }, { emphasize: "cadence" });
  }

  function keepCadenceChangeCopy(targetId, sourceId) {
    var source = findNode(sourceId);
    if (!source) return;
    writeNode(targetId, function (node) {
      NS.registry.list(state).forEach(function (ch) {
        if (!node.comms[ch.id] || !source.comms[ch.id]) return;
        node.comms[ch.id].cadence = NS.util.clone(source.comms[ch.id].cadence);
        node.comms[ch.id].paceConfirmed = source.comms[ch.id].paceConfirmed;
        node.comms[ch.id].enabled = source.comms[ch.id].enabled;
      });
      node.templateId = null;
    }, { emphasize: "copy" });
  }

  function rebuildNode(id) {
    writeNode(id, function (node) {
      node.mode = "linear";
      node.exitAction = "";
      node.templateId = null;
      node.comms = NS.registry.blankComms(state);
    });
  }

  function applyTemplate(nodeId, template) {
    writeNode(nodeId, function (node) {
      node.mode = template.mode === "cycle" ? "cycle" : "linear";
      node.exitAction = template.exitAction || "";
      node.comms = NS.registry.mergeComms(template.comms, state);
      node.templateId = template.id;
    });
  }

  function saveTemplateFromNode(nodeId, name) {
    var node = findNode(nodeId);
    var trimmed = String(name || "").trim();
    if (!node) return { ok: false, error: "Node not found." };
    if (!trimmed) return { ok: false, error: "Name the template." };
    var template = {
      id: NS.util.uid("tpl"),
      name: trimmed,
      description: "Saved from this workspace.",
      mode: node.mode,
      exitAction: node.exitAction,
      comms: NS.registry.mergeComms(node.comms, state),
      builtIn: false
    };
    state.templates.push(template);
    commit({ render: "none" });
    return { ok: true, template: template };
  }

  function deleteTemplate(id) {
    state.templates = state.templates.filter(function (template) { return template.id !== id; });
    commit({ render: "none" });
  }

  function isConfigured(node) {
    return NS.registry.list(state).some(function (ch) {
      return NS.compliance.ready(ch, node.comms[ch.id], state);
    });
  }

  function nodeLabel(node) {
    var persona = personaById(node.personaId);
    var stage = stageById(node.stageId);
    return (persona ? persona.name : "Persona") + " · " + (stage ? stage.name : "Stage");
  }

  function cadencePhrase(interval, unit) {
    var count = Number(interval) || 1;
    var label = unit || "days";
    if (count === 1 && label.endsWith("s")) label = label.slice(0, -1);
    return count + " " + label;
  }

  function summary(node) {
    var parts = [];
    NS.registry.list(state).forEach(function (ch) {
      var item = node.comms[ch.id];
      if (!item || !item.enabled) return;
      var st = NS.compliance.status(ch, item, state);
      parts.push(st.label && st.label !== "Ready" ? ch.label + " · " + st.label : ch.label);
    });
    if (!parts.length) return "No channel";
    return parts.join(", ");
  }

  function advancedCount(stageId) {
    return state.awareness.people.filter(function (person) {
      return person.status === "advanced" && person.advancedStageId === stageId;
    }).length;
  }

  function addCatalogChannel(catalogId) {
    var spec = NS.registry.channelById(catalogId, state);
    if (!spec) return { ok: false, error: "That channel is not in the catalog." };
    var existing = state.awareness.channels.filter(function (channel) { return channel.catalogId === spec.id; })[0];
    if (existing) return { ok: true, channel: existing, existing: true };
    var actions = {};
    spec.actions.forEach(function (action, index) { actions[action.id] = index === 0; });
    var count = state.awareness.channels.length;
    var channel = {
      id: NS.util.uid("chn"),
      name: spec.label,
      catalogId: spec.id,
      kind: spec.id,
      actions: actions,
      x: 16 + (count % 4) * 18,
      y: 22 + (count % 3) * 20
    };
    state.awareness.channels.push(channel);
    commit({ render: "channels", selectChannel: channel.id });
    return { ok: true, channel: channel };
  }

  function addChannel(partial) {
    if (partial && partial.catalogId) return addCatalogChannel(partial.catalogId);
    return addCatalogChannel("event");
  }

  function updateChannel(id, patch) {
    var channel = state.awareness.channels.filter(function (item) { return item.id === id; })[0];
    if (!channel) return;
    if (patch.name != null) channel.name = String(patch.name).trim() || channel.name;
    if (patch.kind) channel.kind = patch.kind;
    if (patch.actions) {
      channel.actions = channel.actions || {};
      Object.keys(patch.actions).forEach(function (key) { channel.actions[key] = !!patch.actions[key]; });
    }
    if (Number.isFinite(patch.x)) channel.x = Math.max(6, Math.min(94, patch.x));
    if (Number.isFinite(patch.y)) channel.y = Math.max(8, Math.min(92, patch.y));
    commit({ render: "channels" });
  }

  function removeChannel(id) {
    state.awareness.channels = state.awareness.channels.filter(function (channel) { return channel.id !== id; });
    state.awareness.wires = state.awareness.wires.filter(function (wire) { return wire.from !== id && wire.to !== id; });
    state.awareness.people.forEach(function (person) {
      if (person.channelId === id) person.channelId = null;
    });
    commit({ render: "channels" });
  }

  function addWire(from, to) {
    if (!from || !to || from === to) return { ok: false, error: "Pick two different channels." };
    var exists = state.awareness.wires.some(function (wire) { return wire.from === from && wire.to === to; });
    if (exists) return { ok: false, error: "Those channels are already wired." };
    state.awareness.wires.push({ id: NS.util.uid("wir"), from: from, to: to });
    commit({ render: "channels" });
    return { ok: true };
  }

  function removeWire(id) {
    state.awareness.wires = state.awareness.wires.filter(function (wire) { return wire.id !== id; });
    commit({ render: "channels" });
  }

  function addLead(partial) {
    var name = String(partial.name || "").trim();
    if (!name) return { ok: false, error: "Name the lead." };
    state.awareness.people.push({
      id: NS.util.uid("ppl"),
      name: name,
      status: "lead",
      channelId: partial.channelId || null,
      personaId: null,
      advancedStageId: null,
      note: ""
    });
    commit({ render: "channels" });
    return { ok: true };
  }

  function convertToContact(id) {
    var person = findPerson(id);
    if (!person || person.status === "opted_out") {
      return { ok: false, error: "They asked to stop. They stay on Do not contact until they ask to hear from you again." };
    }
    if (person.status !== "lead") return { ok: false, error: "Only a new name can move into the plan." };
    person.status = "contact";
    commit({ render: "channels" });
    return { ok: true };
  }

  function optOutPerson(id) {
    var person = findPerson(id);
    if (!person || person.status === "opted_out") return { ok: false };
    person.status = "opted_out";
    person.advancedStageId = null;
    commit({ render: "channels" });
    return { ok: true };
  }

  function restorePerson(id) {
    var person = findPerson(id);
    if (!person || person.status !== "opted_out") return { ok: false };
    person.status = "lead";
    commit({ render: "channels" });
    return { ok: true };
  }

  function findOptOutByName(name) {
    var key = String(name || "").trim().toLowerCase();
    if (!key) return null;
    return state.awareness.people.filter(function (person) {
      return person.status === "opted_out" && person.name.toLowerCase() === key;
    })[0] || null;
  }

  function setSender(patch) {
    if (!patch) return state.sender;
    if (patch.name != null) state.sender.name = String(patch.name).slice(0, 80);
    if (patch.postal != null) state.sender.postal = String(patch.postal).slice(0, 160);
    commit({ render: "none", sender: true });
    return state.sender;
  }

  function addExtra(name, group) {
    var trimmed = String(name || "").trim().slice(0, 40);
    if (!trimmed) return { ok: false, error: "Name it first." };
    var taken = state.extras.some(function (extra) { return extra.name.toLowerCase() === trimmed.toLowerCase(); }) ||
      NS.registry.commChannels.some(function (channel) { return channel.label.toLowerCase() === trimmed.toLowerCase(); });
    if (taken) return { ok: false, error: "That name is already in the catalog." };
    var extra = {
      id: NS.util.uid(group === "social" ? "net" : "cus"),
      name: trimmed,
      group: group === "social" ? "social" : "custom"
    };
    state.extras.push(extra);
    commit({ render: "none", extras: true });
    return { ok: true, extra: extra };
  }

  function removeExtra(id) {
    state.extras = state.extras.filter(function (extra) { return extra.id !== id; });
    state.awareness.channels = state.awareness.channels.filter(function (channel) { return channel.catalogId !== id; });
    state.nodes.forEach(function (node) {
      if (node.comms[id]) delete node.comms[id];
    });
    commit({ render: "both" });
  }

  function assignPersona(id, personaId) {
    var person = findPerson(id);
    if (!person) return;
    person.personaId = personaId || null;
    commit({ render: "channels" });
  }

  function movePersonForward(id) {
    var person = findPerson(id);
    if (!person || person.status === "opted_out") {
      return { ok: false, error: "They asked to stop, so they do not move into the sequence." };
    }
    if (person.status !== "contact") return { ok: false, error: "Move them into the plan before the next stage." };
    var result = ensureAdvanceStage();
    person.status = "advanced";
    person.advancedStageId = result.stage.id;
    commit({ render: "both" });
    return { ok: true, created: result.created, stage: result.stage };
  }

  NS.model = {
    get: get,
    subscribe: subscribe,
    init: init,
    createInitial: createInitial,
    isPristine: isPristine,
    marketTitle: marketTitle,
    reset: reset,
    replaceAll: replaceAll,
    applyMarketDraft: applyMarketDraft,
    updatePersona: updatePersona,
    removePersona: removePersona,
    addStage: addStage,
    renameStage: renameStage,
    removeStage: removeStage,
    moveStage: moveStage,
    planRecommended: planRecommended,
    applyRecommended: applyRecommended,
    peekAdvanceStage: peekAdvanceStage,
    nextStage: nextStage,
    setAdvance: setAdvance,
    markAdvance: markAdvance,
    personaById: personaById,
    stageById: stageById,
    segmentById: segmentById,
    awarenessStage: awarenessStage,
    findNode: findNode,
    nodeAt: nodeAt,
    createNode: createNode,
    updateNodeFields: updateNodeFields,
    deleteNode: deleteNode,
    cloneFrom: cloneFrom,
    keepCopyChangeCadence: keepCopyChangeCadence,
    keepCadenceChangeCopy: keepCadenceChangeCopy,
    rebuildNode: rebuildNode,
    applyTemplate: applyTemplate,
    saveTemplateFromNode: saveTemplateFromNode,
    deleteTemplate: deleteTemplate,
    isConfigured: isConfigured,
    nodeLabel: nodeLabel,
    summary: summary,
    advancedCount: advancedCount,
    addChannel: addChannel,
    addCatalogChannel: addCatalogChannel,
    updateChannel: updateChannel,
    removeChannel: removeChannel,
    addWire: addWire,
    removeWire: removeWire,
    addLead: addLead,
    convertToContact: convertToContact,
    assignPersona: assignPersona,
    movePersonForward: movePersonForward,
    optOutPerson: optOutPerson,
    restorePerson: restorePerson,
    findOptOutByName: findOptOutByName,
    setSender: setSender,
    addExtra: addExtra,
    removeExtra: removeExtra
  };
})(window.NodeCRM);
