(function (NS) {
  "use strict";

  var openId = null;
  var picker = null;
  var timer = null;

  function root() { return document.getElementById("comms"); }
  function isOpen() { return !!openId && !root().hidden; }
  function currentId() { return openId; }

  function open(id) {
    clearTimeout(timer);
    if (!NS.model.findNode(id)) return;
    openId = id;
    picker = null;
    render();
    root().hidden = false;
  }

  function openAfterMotion(id) {
    clearTimeout(timer);
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timer = setTimeout(function () { open(id); }, reduce ? 180 : 460);
  }

  function close() {
    clearTimeout(timer);
    openId = null;
    picker = null;
    root().hidden = true;
    root().innerHTML = "";
  }

  function modeHint(mode) {
    var found = NS.registry.nodeModes.filter(function (item) { return item.id === mode; })[0];
    return found ? found.hint : "";
  }

  function statusLine(channel, item, state) {
    if (!item.enabled) return "";
    var gaps = NS.compliance.missing(channel, item, state);
    if (!gaps.length) return '<p class="status is-ok">Ready. The checklist is complete.</p>';
    return '<p class="status is-wait">Not ready yet. ' + gaps.length + " item" + (gaps.length === 1 ? "" : "s") + " still open.</p>";
  }

  function channelCard(node, channel, state) {
    var item = node.comms[channel.id];
    if (!item || !item.enabled) return "";
    var checks = (channel.compliance.checks || []).map(function (check) {
      var on = !!(item.checks && item.checks[check.id]);
      return '<label class="check"><input type="checkbox" data-check="' + check.id + '"' + (on ? " checked" : "") + "> " + NS.util.esc(check.label) + "</label>";
    }).join("");
    var actions = channel.actions.map(function (action) {
      var on = !!(item.actions && item.actions[action.id]);
      return '<button type="button" class="chip' + (on ? " is-on" : "") + '" data-action="toggle-node-action" data-channel="' + channel.id + '" data-act="' + action.id + '" aria-pressed="' + (on ? "true" : "false") + '">' + NS.util.esc(action.label) + "</button>";
    }).join("");
    var units = NS.registry.cadenceUnits.map(function (unit) {
      return '<option value="' + unit.id + '"' + (item.cadence.unit === unit.id ? " selected" : "") + ">" + unit.label + "</option>";
    }).join("");
    var fields = channel.fields.map(function (field) {
      var value = NS.util.esc(item.copy[field.key] || "");
      if (field.type === "textarea") {
        return '<label>' + field.label + '<textarea data-copy="' + field.key + '" rows="3">' + value + "</textarea></label>";
      }
      return '<label>' + field.label + '<input data-copy="' + field.key + '" type="text" value="' + value + '"></label>';
    }).join("");
    var footer = NS.compliance.footer(channel, state);
    var quiet = NS.compliance.quietNote(channel);
    var pace = NS.compliance.paceWarning(channel, item);
    var paceNote = pace ? '<p class="fine">' + NS.util.esc(pace) + (item.paceConfirmed ? " You confirmed this faster pace." : "") + "</p>" : "";
    var risk = NS.compliance.riskyText(item);
    var riskNote = risk && item.riskConfirmed ? '<p class="fine">Kept as a note only. This prototype still will not send or dial.</p>' : "";
    return '<section class="check-card" data-channel="' + channel.id + '">' +
      '<header class="split"><h3>' + NS.util.esc(channel.label) + '</h3>' +
      '<button type="button" class="text-btn" data-action="disable-channel" data-channel="' + channel.id + '">Remove</button></header>' +
      (channel.hint ? '<p class="fine">' + NS.util.esc(channel.hint) + "</p>" : "") +
      statusLine(channel, item, state) +
      '<div class="check-list">' + checks + "</div>" +
      '<p class="group-label">What you will do</p><div class="chip-row">' + actions + "</div>" +
      '<div class="cadence"><span>How often</span><input data-field="interval" type="number" min="1" max="365" value="' + item.cadence.interval + '"><select data-field="unit">' + units + "</select></div>" +
      paceNote +
      (quiet ? '<p class="quiet-note">' + NS.util.esc(quiet) + "</p>" : "") +
      (footer ? '<div class="footer-preview"><span>Added for you</span><pre>' + NS.util.esc(footer) + "</pre></div>" : "") +
      riskNote +
      '<details class="disclosure"><summary>What it says</summary><div class="disclosure-body">' + fields +
      "<p class='fine'>Wording is optional. The checklist above is what makes the step ready.</p></div></details></section>";
  }

  function catalogHTML(node) {
    return NS.registry.groups(NS.model.get()).map(function (group) {
      var chips = group.items.map(function (channel) {
        var item = node.comms[channel.id];
        var on = !!(item && item.enabled);
        var ready = on && NS.compliance.ready(channel, item, NS.model.get());
        return '<button type="button" class="chip' + (on ? " is-on" : "") + (ready ? " is-ready" : "") + '" data-action="toggle-channel" data-channel="' + channel.id + '" data-testid="channel-chip" aria-pressed="' + (on ? "true" : "false") + '">' + NS.util.esc(channel.label) + "</button>";
      }).join("");
      var extra = "";
      if (group.allowNetwork) {
        extra = '<details class="disclosure"><summary>Add a network</summary><div class="disclosure-body edit-row">' +
          '<input data-network-name maxlength="40" placeholder="Network name" aria-label="Network name">' +
          '<button type="button" class="btn" data-action="add-network">Add</button></div></details>';
      }
      if (group.allowCustom) {
        extra = '<details class="disclosure"><summary>Name a channel that is not listed</summary><div class="disclosure-body edit-row">' +
          '<input data-custom-name maxlength="40" placeholder="Channel name" aria-label="Custom channel name">' +
          '<button type="button" class="btn" data-action="add-custom">Add</button></div></details>';
      }
      var block = '<section class="catalog-group' + (group.secondary ? " is-secondary" : "") + '"><p class="group-label">' + NS.util.esc(group.label) + '</p><p class="fine">' + NS.util.esc(group.hint || "") + '</p><div class="chip-row">' + chips + "</div>" + extra + "</section>";
      return group.secondary ? '<details class="disclosure"><summary>Something else</summary><div class="disclosure-body">' + block + "</div></details>" : block;
    }).join("");
  }

  function pickerHTML() {
    if (!picker) return "";
    if (picker === "template") {
      var rows = NS.templates.all().map(function (template) {
        var del = template.builtIn ? "" : '<button type="button" class="text-btn" data-action="delete-template" data-template-id="' + template.id + '">Delete</button>';
        return '<div class="picker-row"><button type="button" data-action="pick-template" data-template-id="' + template.id + '"><strong>' +
          NS.util.esc(template.name) + "</strong><span>" + NS.util.esc(template.description || "") + "</span></button>" + del + "</div>";
      }).join("");
      return '<div class="picker"><p>Use a starter. You still confirm consent yourself.</p>' + rows + "</div>";
    }
    var others = NS.model.get().nodes.filter(function (node) { return node.id !== openId; });
    var title = picker === "clone" ? "Start from another step" : picker === "copy" ? "Keep the words, change how often" : "Keep how often, change the words";
    if (!others.length) return '<div class="picker"><p>' + title + '</p><p class="fine">Add another step on the plane first, or use a starter.</p></div>';
    var rows = others.map(function (node) {
      return '<button type="button" data-action="pick-node" data-source-id="' + node.id + '"><strong>' +
        NS.util.esc(NS.model.nodeLabel(node)) + "</strong><span>" + NS.util.esc(NS.model.summary(node)) + "</span></button>";
    }).join("");
    return '<div class="picker"><p>' + title + "</p>" + rows + "</div>";
  }

  function render() {
    var node = NS.model.findNode(openId);
    if (!node) { close(); return; }
    var state = NS.model.get();
    var persona = NS.model.personaById(node.personaId);
    var stage = NS.model.stageById(node.stageId);
    var modes = NS.registry.nodeModes.map(function (mode) {
      return '<label class="mode-option"><input type="radio" name="mode" value="' + mode.id + '"' + (node.mode === mode.id ? " checked" : "") + "><span>" + mode.label + "</span></label>";
    }).join("");
    var cards = NS.registry.list(state).map(function (channel) {
      return channelCard(node, channel, state);
    }).join("");
    var dnc = state.awareness.people.filter(function (person) { return person.status === "opted_out"; }).length;
    root().innerHTML = '<div class="scrim" data-action="close-comms"></div>' +
      '<form class="drawer-panel" id="comms-form" data-testid="comms-panel" role="dialog" aria-modal="true" aria-labelledby="comms-title">' +
      '<header class="drawer-head"><div><p class="caption" id="comms-kicker">' + NS.util.esc(persona ? persona.name : "Person") + " · " + NS.util.esc(stage ? stage.name : "Stage") + "</p>" +
      '<h2 id="comms-title">This step</h2><p class="fine" id="comms-summary">' + NS.util.esc(NS.model.summary(node)) + "</p></div>" +
      '<button type="button" class="icon-btn" data-action="close-comms" aria-label="Close">' + NS.util.icon("close") + "</button></header>" +
      '<div class="drawer-scroll">' +
      '<p class="legal-note">' + NS.util.esc(NS.compliance.DISCLAIMER) + "</p>" +
      '<p class="fine">Anyone on Do not contact is left out' + (dnc ? " (" + dnc + " right now)" : "") + ". You do not message them from this step.</p>" +
      '<section class="check-card"><h3>Who the message is from</h3><p class="fine">Fill this once. Marketing email cannot be ready without a mailing address.</p>' +
      '<label>Name<input data-sender="name" maxlength="80" value="' + NS.util.esc(state.sender.name) + '" placeholder="Your name or company"></label>' +
      '<label>Mailing address<input data-sender="postal" maxlength="160" value="' + NS.util.esc(state.sender.postal) + '" placeholder="Street, city, state, ZIP"></label></section>' +
      '<div class="mode-switch" role="radiogroup" aria-label="What happens after this step">' + modes + "</div>" +
      '<p class="fine" id="mode-hint">' + NS.util.esc(modeHint(node.mode)) + "</p>" +
      '<label id="exit-label">' + (node.mode === "cycle" ? "They stay until" : "This step is done when") +
      '<input data-field="exitAction" type="text" maxlength="120" value="' + NS.util.esc(node.exitAction) + '" placeholder="' + (node.mode === "cycle" ? "They buy, book, or ask to stop" : "The messages in this step have gone out") + '"></label>' +
      '<p class="group-label">Pick the channels</p>' +
      catalogHTML(node) +
      cards +
      '<div><p class="group-label">If this step looks like another</p><div class="group-list">' +
      '<button type="button" class="group-row" data-action="act-clone"><span>Start from another step</span><span class="chev" aria-hidden="true">' + NS.util.icon("chevron") + "</span></button>" +
      '<button type="button" class="group-row" data-action="act-copy"><span>Keep the words, change how often</span><span class="chev" aria-hidden="true">' + NS.util.icon("chevron") + "</span></button>" +
      '<button type="button" class="group-row" data-action="act-cadence"><span>Keep how often, change the words</span><span class="chev" aria-hidden="true">' + NS.util.icon("chevron") + "</span></button>" +
      '<button type="button" class="group-row" data-action="act-template"><span>Use a starter</span><span class="chev" aria-hidden="true">' + NS.util.icon("chevron") + "</span></button>" +
      '<button type="button" class="group-row" data-action="act-rebuild"><span>Clear this step</span></button>' +
      "</div></div>" +
      pickerHTML() +
      '<details class="disclosure"><summary>Save this step as a starter</summary><div class="disclosure-body">' +
      '<label>Starter name<input id="template-name" maxlength="48" placeholder="Name"></label>' +
      '<button type="button" class="btn btn-tinted" data-action="save-template">Save starter</button></div></details>' +
      "</div>" +
      '<footer class="drawer-foot"><button type="button" class="btn btn-danger btn-block" data-action="delete-node">Remove this step</button></footer>' +
      "</form>";
  }

  function refreshHeading() {
    if (!isOpen()) return;
    var node = NS.model.findNode(openId);
    if (!node) return;
    var persona = NS.model.personaById(node.personaId);
    var stage = NS.model.stageById(node.stageId);
    var kicker = document.getElementById("comms-kicker");
    if (kicker) kicker.textContent = (persona ? persona.name : "Person") + " · " + (stage ? stage.name : "Stage");
  }

  function readForm() {
    var form = document.getElementById("comms-form");
    var node = NS.model.findNode(openId);
    if (!form || !node) return null;
    var state = NS.model.get();
    var comms = NS.registry.mergeComms(node.comms, state);
    var selected = form.querySelector("input[name='mode']:checked");
    NS.registry.list(state).forEach(function (channel) {
      var block = form.querySelector('.check-card[data-channel="' + channel.id + '"]');
      if (!block) {
        comms[channel.id].enabled = false;
        return;
      }
      comms[channel.id].enabled = true;
      var interval = Number(block.querySelector("[data-field='interval']").value);
      comms[channel.id].cadence.interval = interval >= 1 && interval <= 365 ? interval : 1;
      comms[channel.id].cadence.unit = block.querySelector("[data-field='unit']").value;
      (channel.compliance.checks || []).forEach(function (check) {
        var box = block.querySelector('[data-check="' + check.id + '"]');
        comms[channel.id].checks[check.id] = !!(box && box.checked);
      });
      channel.fields.forEach(function (field) {
        var input = block.querySelector('[data-copy="' + field.key + '"]');
        if (input) comms[channel.id].copy[field.key] = input.value;
      });
    });
    return {
      mode: selected ? selected.value : "linear",
      exitAction: form.querySelector("[data-field='exitAction']").value,
      comms: comms,
      senderName: form.querySelector("[data-sender='name']").value,
      senderPostal: form.querySelector("[data-sender='postal']").value
    };
  }

  function saveQuiet() {
    var data = readForm();
    if (!data) return;
    NS.model.setSender({ name: data.senderName, postal: data.senderPostal });
    NS.model.updateNodeFields(openId, {
      mode: data.mode,
      exitAction: data.exitAction,
      comms: data.comms
    });
    var hint = document.getElementById("mode-hint");
    var exit = document.getElementById("exit-label");
    if (hint) hint.textContent = modeHint(data.mode);
    if (exit) exit.firstChild.textContent = data.mode === "cycle" ? "They stay until" : "This step is done when";
    var summary = document.getElementById("comms-summary");
    var node = NS.model.findNode(openId);
    if (summary && node) summary.textContent = NS.model.summary(node);
  }

  function writeComms(mutator) {
    var node = NS.model.findNode(openId);
    if (!node) return;
    var comms = NS.registry.mergeComms(node.comms, NS.model.get());
    mutator(comms);
    NS.model.updateNodeFields(openId, { comms: comms });
    render();
  }

  async function guardPace(channelId) {
    var node = NS.model.findNode(openId);
    var channel = NS.registry.channelById(channelId, NS.model.get());
    if (!node || !channel) return;
    var item = node.comms[channel.id];
    var warning = NS.compliance.paceWarning(channel, item);
    if (!warning || item.paceConfirmed) return;
    var ok = await NS.ui.confirm({
      title: "This pace is fast",
      body: warning,
      confirmLabel: "Keep this pace",
      cancelLabel: "Use the slower default",
      danger: true
    });
    writeComms(function (comms) {
      if (ok) comms[channel.id].paceConfirmed = true;
      else {
        comms[channel.id].cadence.interval = channel.defaultInterval;
        comms[channel.id].cadence.unit = channel.defaultUnit;
        comms[channel.id].paceConfirmed = false;
      }
    });
  }

  async function guardCopy(channelId) {
    var node = NS.model.findNode(openId);
    var channel = NS.registry.channelById(channelId, NS.model.get());
    if (!node || !channel) return;
    var item = node.comms[channel.id];
    var hit = NS.compliance.riskyText(item);
    if (!hit || item.riskConfirmed) return;
    var ok = await NS.ui.confirm({
      title: "Check this wording",
      body: hit.why,
      confirmLabel: "Keep it as a note",
      cancelLabel: "Change the wording",
      danger: true
    });
    if (ok) {
      writeComms(function (comms) { comms[channel.id].riskConfirmed = true; });
      return;
    }
    writeComms(function (comms) {
      channel.fields.forEach(function (field) {
        if (NS.compliance.risk(comms[channel.id].copy[field.key])) comms[channel.id].copy[field.key] = "";
      });
      comms[channel.id].riskConfirmed = false;
    });
  }

  function sync(meta) {
    if (!openId || !meta || meta.nodeId !== openId) return;
    if (meta.render === "node") {
      picker = null;
      render();
    }
  }

  async function onClick(event) {
    var button = event.target.closest("[data-action]");
    if (!button) return;
    var action = button.dataset.action;
    if (action === "close-comms") {
      close();
      return;
    }
    if (action === "toggle-channel") {
      saveQuiet();
      var id = button.dataset.channel;
      writeComms(function (comms) {
        var turningOn = !comms[id].enabled;
        comms[id].enabled = turningOn;
        if (turningOn) {
          var spec = NS.registry.channelById(id, NS.model.get());
          var any = spec && spec.actions.some(function (item) { return comms[id].actions[item.id]; });
          if (spec && !any) comms[id].actions[spec.actions[0].id] = true;
        }
      });
      return;
    }
    if (action === "disable-channel") {
      saveQuiet();
      writeComms(function (comms) { comms[button.dataset.channel].enabled = false; });
      return;
    }
    if (action === "toggle-node-action") {
      saveQuiet();
      writeComms(function (comms) {
        var item = comms[button.dataset.channel];
        item.actions[button.dataset.act] = !item.actions[button.dataset.act];
      });
      return;
    }
    if (action === "add-network" || action === "add-custom") {
      var field = action === "add-network" ? "[data-network-name]" : "[data-custom-name]";
      var input = root().querySelector(field);
      var added = NS.model.addExtra(input ? input.value : "", action === "add-network" ? "social" : "custom");
      if (!added.ok) {
        NS.ui.toast(added.error);
        return;
      }
      writeComms(function (comms) {
        if (!comms[added.extra.id]) return;
        comms[added.extra.id].enabled = true;
        comms[added.extra.id].actions[Object.keys(comms[added.extra.id].actions)[0]] = true;
      });
      NS.ui.toast(added.extra.name + " is in the catalog. Confirm you will stop if they ask.");
      return;
    }
    if (action === "act-clone" || action === "act-copy" || action === "act-cadence" || action === "act-template") {
      saveQuiet();
      picker = action === "act-clone" ? "clone" : action === "act-copy" ? "copy" : action === "act-cadence" ? "cadence" : "template";
      render();
      return;
    }
    if (action === "pick-node") {
      var source = button.dataset.sourceId;
      var mode = picker;
      if (mode === "copy") NS.model.keepCopyChangeCadence(openId, source);
      else if (mode === "cadence") NS.model.keepCadenceChangeCopy(openId, source);
      else NS.model.cloneFrom(openId, source);
      var label = NS.model.nodeLabel(NS.model.findNode(source));
      if (mode === "copy") NS.ui.toast("Words kept from " + label + ". Update how often.");
      else if (mode === "cadence") NS.ui.toast("Timing kept from " + label + ". Update the words.");
      else NS.ui.toast("Started from " + label + ". Consent checks were copied. Re-read them.");
      return;
    }
    if (action === "pick-template") {
      var template = NS.templates.byId(button.dataset.templateId);
      if (!template) return;
      NS.model.applyTemplate(openId, template);
      NS.ui.toast("Starter applied. Consent is still yours to confirm.");
      return;
    }
    if (action === "delete-template") {
      NS.model.deleteTemplate(button.dataset.templateId);
      render();
      return;
    }
    if (action === "save-template") {
      saveQuiet();
      var name = document.getElementById("template-name").value;
      var saved = NS.model.saveTemplateFromNode(openId, name);
      if (!saved.ok) {
        NS.ui.toast(saved.error);
        return;
      }
      NS.ui.toast("Starter “" + saved.template.name + "” stays in this browser.");
      return;
    }
    if (action === "act-rebuild") {
      var ok = await NS.ui.confirm({
        title: "Clear this step?",
        body: "Channels, checklists, and wording on this step will be removed. People already marked Do not contact stay marked.",
        confirmLabel: "Clear step",
        danger: true
      });
      if (!ok) return;
      NS.model.rebuildNode(openId);
      NS.ui.toast("Step cleared. Pick a channel to start again.");
      return;
    }
    if (action === "delete-node") {
      var remove = await NS.ui.confirm({
        title: "Remove this step?",
        body: "The plan where this person meets this stage will be removed.",
        confirmLabel: "Remove step",
        danger: true
      });
      if (!remove) return;
      var id = openId;
      close();
      NS.model.deleteNode(id);
    }
  }

  function init() {
    var node = root();
    node.addEventListener("click", onClick);
    node.addEventListener("input", function (event) {
      if (!event.target.closest("#comms-form")) return;
      if (event.target.id === "template-name") return;
      if (event.target.matches("[data-copy]")) return;
      saveQuiet();
    });
    node.addEventListener("change", function (event) {
      if (!event.target.closest("#comms-form")) return;
      var channelId = event.target.closest("[data-channel]");
      channelId = channelId ? channelId.dataset.channel : "";
      saveQuiet();
      if (event.target.matches("[data-field='interval'], [data-field='unit']") && channelId) guardPace(channelId);
      if (event.target.matches("[data-copy]") && channelId) guardCopy(channelId);
      if (event.target.matches("[data-check], [data-sender]")) render();
    });
    node.addEventListener("submit", function (event) { event.preventDefault(); });
  }

  NS.comms = {
    init: init,
    open: open,
    openAfterMotion: openAfterMotion,
    close: close,
    isOpen: isOpen,
    currentId: currentId,
    sync: sync,
    refreshHeading: refreshHeading
  };
})(window.NodeCRM);
