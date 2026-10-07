(function (NS) {
  "use strict";

  var openId = null;
  var picker = null;
  var menu = null;
  var focusId = null;
  var why = false;
  var timer = null;

  function root() { return document.getElementById("comms"); }
  function isOpen() { return !!openId && !root().hidden; }
  function currentId() { return openId; }

  function open(id) {
    clearTimeout(timer);
    if (!NS.model.findNode(id)) return;
    openId = id;
    picker = null;
    menu = null;
    why = false;
    focusId = null;
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
    menu = null;
    focusId = null;
    why = false;
    root().hidden = true;
    root().innerHTML = "";
  }

  function enabledChannels(node, state) {
    return NS.registry.list(state).filter(function (channel) {
      return node.comms[channel.id] && node.comms[channel.id].enabled;
    });
  }

  function sectionTitle(id) {
    if (id === "direct") return "Direct";
    if (id === "social") return "Social";
    if (id === "physical") return "In person";
    return "Other";
  }

  function catalogMenu(node, state) {
    var groups = NS.registry.groups(state).map(function (group) {
      var rows = group.items.map(function (channel) {
        var on = !!(node.comms[channel.id] && node.comms[channel.id].enabled);
        return '<button type="button" class="menu-item' + (on ? " is-on" : "") + '" role="menuitemcheckbox" aria-checked="' + (on ? "true" : "false") + '" data-action="toggle-channel" data-channel="' + channel.id + '" data-testid="channel-chip">' + NS.util.esc(channel.label) + "</button>";
      }).join("");
      var extra = "";
      if (group.allowNetwork) extra = '<button type="button" class="menu-item" data-action="show-extra" data-extra="network">Add a network</button>';
      if (group.allowCustom) extra = '<button type="button" class="menu-item" data-action="show-extra" data-extra="custom">Add a channel</button>';
      return '<p class="menu-label">' + sectionTitle(group.id) + "</p>" + rows + extra;
    }).join("");
    var naming = "";
    if (menu === "network" || menu === "custom") {
      var field = menu === "network" ? "data-network-name" : "data-custom-name";
      var action = menu === "network" ? "add-network" : "add-custom";
      naming = '<div class="menu-name"><input ' + field + ' maxlength="40" placeholder="Name" aria-label="Name"><button type="button" class="btn btn-primary" data-action="' + action + '">Add</button></div>';
    }
    return '<div class="menu" role="menu" aria-label="Channels">' + groups + naming + "</div>";
  }

  function startMenu() {
    function item(action, label) {
      return '<button type="button" class="menu-item" data-action="' + action + '">' + label + "</button>";
    }
    return '<div class="menu" role="menu" aria-label="Start from">' +
      item("act-clone", "Copy a step") +
      item("act-copy", "Keep words") +
      item("act-cadence", "Keep timing") +
      item("act-template", "Starter") +
      item("act-rebuild", "Clear") +
      "</div>";
  }

  function whyHTML(channel, item, state) {
    var checks = (channel.compliance.checks || []).map(function (check) {
      var on = !!(item.checks && item.checks[check.id]);
      return '<label class="check"><input type="checkbox" data-check="' + check.id + '"' + (on ? " checked" : "") + "> " + NS.util.esc(check.label) + "</label>" +
        (check.detail ? '<p class="why-line">' + NS.util.esc(check.detail) + "</p>" : "");
    }).join("");
    var quiet = NS.compliance.quietNote(channel);
    var footer = NS.compliance.footer(channel, state);
    var pace = NS.compliance.paceWarning(channel, item);
    var risk = NS.compliance.riskyText(item);
    return '<div class="why"' + (why ? "" : " hidden") + ">" +
      checks +
      (quiet ? '<p class="why-line">' + NS.util.esc(quiet) + "</p>" : "") +
      (pace ? '<p class="why-line">' + NS.util.esc(pace) + (item.paceConfirmed ? " Kept." : "") + "</p>" : "") +
      (risk ? '<p class="why-line">' + NS.util.esc(risk.why) + (item.riskConfirmed ? " Kept as a note." : "") + "</p>" : "") +
      (footer ? '<pre class="footer-preview">' + NS.util.esc(footer) + "</pre>" : "") +
      "</div>";
  }

  function focusHTML(node, channel, state) {
    var item = node.comms[channel.id];
    var st = NS.compliance.status(channel, item, state);
    var units = NS.registry.cadenceUnits.map(function (unit) {
      return '<option value="' + unit.id + '"' + (item.cadence.unit === unit.id ? " selected" : "") + ">" + unit.label + "</option>";
    }).join("");
    var actions = channel.actions.map(function (action) {
      var on = !!(item.actions && item.actions[action.id]);
      return '<button type="button" class="chip' + (on ? " is-on" : "") + '" data-action="toggle-node-action" data-channel="' + channel.id + '" data-act="' + action.id + '" aria-pressed="' + (on ? "true" : "false") + '">' + NS.util.esc(action.label) + "</button>";
    }).join("");
    var fields = channel.fields.map(function (field) {
      var value = NS.util.esc(item.copy[field.key] || "");
      if (field.type === "textarea") {
        return '<label>' + NS.util.esc(field.label) + '<textarea data-copy="' + field.key + '" rows="3">' + value + "</textarea></label>";
      }
      return '<label>' + NS.util.esc(field.label) + '<input data-copy="' + field.key + '" type="text" value="' + value + '"></label>';
    }).join("");
    var from = "";
    if (channel.compliance && channel.compliance.footer === "email") {
      from = '<div class="from-line"><label>From<input data-sender="name" maxlength="80" placeholder="Name" value="' + NS.util.esc(state.sender.name) + '"></label>' +
        '<label>Address<input data-sender="postal" maxlength="160" placeholder="Street, city, ZIP" value="' + NS.util.esc(state.sender.postal) + '"></label></div>';
    }
    return '<section class="channel-focus" data-channel-editor="' + channel.id + '" data-channel="' + channel.id + '">' +
      '<div class="status-row"><span class="status-pill is-' + st.tone + '">' + NS.util.esc(st.label) + '</span>' +
      '<button type="button" class="text-btn" data-action="toggle-why" aria-expanded="' + (why ? "true" : "false") + '">Why?</button>' +
      '<button type="button" class="text-btn" data-action="disable-channel" data-channel="' + channel.id + '">Remove</button></div>' +
      whyHTML(channel, item, state) +
      '<div class="chip-row">' + actions + "</div>" +
      '<div class="cadence"><span>Every</span><input data-field="interval" type="number" min="1" max="365" value="' + item.cadence.interval + '"><select data-field="unit">' + units + "</select></div>" +
      from +
      '<details class="disclosure is-quiet"><summary>Words</summary><div class="disclosure-body">' + fields + "</div></details></section>";
  }

  function pickerHTML() {
    if (!picker) return "";
    if (picker === "template") {
      var rows = NS.templates.all().map(function (template) {
        var del = template.builtIn ? "" : '<button type="button" class="text-btn" data-action="delete-template" data-template-id="' + template.id + '">Delete</button>';
        return '<div class="picker-row"><button type="button" data-action="pick-template" data-template-id="' + template.id + '"><strong>' +
          NS.util.esc(template.name) + "</strong></button>" + del + "</div>";
      }).join("");
      return '<div class="menu picker-menu"><p class="menu-label">Starter</p>' + rows + "</div>";
    }
    var others = NS.model.get().nodes.filter(function (node) { return node.id !== openId; });
    var title = picker === "clone" ? "Copy a step" : picker === "copy" ? "Keep words" : "Keep timing";
    if (!others.length) return '<div class="menu picker-menu"><p class="menu-label">' + title + "</p></div>";
    var rows = others.map(function (node) {
      return '<button type="button" class="menu-item" data-action="pick-node" data-source-id="' + node.id + '"><strong>' +
        NS.util.esc(NS.model.nodeLabel(node)) + "</strong></button>";
    }).join("");
    return '<div class="menu picker-menu"><p class="menu-label">' + title + "</p>" + rows + "</div>";
  }

  function render() {
    var node = NS.model.findNode(openId);
    if (!node) { close(); return; }
    var state = NS.model.get();
    var persona = NS.model.personaById(node.personaId);
    var stage = NS.model.stageById(node.stageId);
    var enabled = enabledChannels(node, state);
    if (focusId && !enabled.some(function (channel) { return channel.id === focusId; })) focusId = null;
    if (!focusId && enabled.length) focusId = enabled[0].id;
    var focus = focusId ? NS.registry.channelById(focusId, state) : null;
    var modes = NS.registry.nodeModes.map(function (mode) {
      return '<label class="mode-option"><input type="radio" name="mode" value="' + mode.id + '"' + (node.mode === mode.id ? " checked" : "") + "><span>" + mode.label + "</span></label>";
    }).join("");
    var pills = enabled.map(function (channel) {
      var on = channel.id === focusId;
      var st = NS.compliance.status(channel, node.comms[channel.id], state);
      return '<button type="button" class="segmented-btn' + (on ? " is-on" : "") + '" data-action="focus-channel" data-channel="' + channel.id + '" aria-pressed="' + (on ? "true" : "false") + '">' +
        NS.util.esc(channel.label) + (st.label && st.label !== "Ready" ? "" : "") + "</button>";
    }).join("");
    var dnc = state.awareness.people.filter(function (person) { return person.status === "opted_out"; }).length;
    var next = NS.model.nextStage(node.stageId);
    var event = next && NS.registry.eventById(next.advanceOn);
    var advance = event
      ? '<button type="button" class="btn btn-tinted" data-action="mark-advance">' + NS.util.esc(event.label) + " → " + NS.util.esc(next.name) + "</button>"
      : "";
    var stopped = dnc ? '<span class="status-pill">' + dnc + " stopped</span>" : "";
    root().innerHTML = '<div class="scrim" data-action="close-comms"></div>' +
      '<form class="drawer-panel" id="comms-form" data-testid="comms-panel" role="dialog" aria-modal="true" aria-labelledby="comms-title">' +
      '<header class="drawer-head"><div><p class="caption" id="comms-kicker">' + NS.util.esc(persona ? persona.name : "Person") + " · " + NS.util.esc(stage ? stage.name : "Stage") + "</p>" +
      '<h2 id="comms-title">Step</h2></div><div class="head-side">' + stopped +
      '<button type="button" class="icon-btn" data-action="close-comms" aria-label="Close">' + NS.util.icon("close") + "</button></div></header>" +
      '<div class="drawer-scroll">' +
      '<div class="mode-switch" role="radiogroup" aria-label="After this step">' + modes + "</div>" +
      '<label id="exit-label">' + (node.mode === "cycle" ? "Until" : "Done when") +
      '<input data-field="exitAction" type="text" maxlength="120" value="' + NS.util.esc(node.exitAction) + '"></label>' +
      (advance ? '<div class="advance-row">' + advance + "</div>" : "") +
      '<div class="channel-bar"><div class="segmented" role="tablist" aria-label="Channels">' + pills + "</div>" +
      '<button type="button" class="icon-btn add-channel" data-action="toggle-menu" aria-expanded="' + (menu === "catalog" || menu === "network" || menu === "custom" ? "true" : "false") + '" aria-label="Add channel">' + NS.util.icon("plus") + "</button></div>" +
      (menu === "catalog" || menu === "network" || menu === "custom" ? catalogMenu(node, state) : "") +
      (focus ? focusHTML(node, focus, state) : "") +
      '<div class="menu-anchor"><button type="button" class="btn btn-plain" data-action="toggle-start" aria-expanded="' + (menu === "start" ? "true" : "false") + '">Start from</button>' +
      (menu === "start" ? startMenu() : "") +
      pickerHTML() + "</div>" +
      '<details class="disclosure is-quiet"><summary>Save as starter</summary><div class="disclosure-body">' +
      '<label>Name<input id="template-name" maxlength="48" placeholder="Name"></label>' +
      '<button type="button" class="btn btn-tinted" data-action="save-template">Save</button></div></details>' +
      "</div>" +
      '<footer class="drawer-foot"><button type="button" class="btn btn-danger" data-action="delete-node">Remove step</button></footer>' +
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
    var block = form.querySelector("[data-channel-editor]");
    if (block) {
      var channelId = block.dataset.channelEditor;
      var channel = NS.registry.channelById(channelId, state);
      if (channel && comms[channelId]) {
        var interval = Number(block.querySelector("[data-field='interval']").value);
        comms[channelId].cadence.interval = interval >= 1 && interval <= 365 ? interval : 1;
        comms[channelId].cadence.unit = block.querySelector("[data-field='unit']").value;
        block.querySelectorAll("[data-check]").forEach(function (box) {
          comms[channelId].checks[box.dataset.check] = box.checked;
        });
        channel.fields.forEach(function (field) {
          var input = block.querySelector('[data-copy="' + field.key + '"]');
          if (input) comms[channelId].copy[field.key] = input.value;
        });
      }
    }
    var senderName = form.querySelector("[data-sender='name']");
    var senderPostal = form.querySelector("[data-sender='postal']");
    return {
      mode: selected ? selected.value : "linear",
      exitAction: form.querySelector("[data-field='exitAction']").value,
      comms: comms,
      senderName: senderName ? senderName.value : null,
      senderPostal: senderPostal ? senderPostal.value : null
    };
  }

  function saveQuiet() {
    var data = readForm();
    if (!data) return;
    if (data.senderName != null) NS.model.setSender({ name: data.senderName, postal: data.senderPostal });
    NS.model.updateNodeFields(openId, {
      mode: data.mode,
      exitAction: data.exitAction,
      comms: data.comms
    });
    var exit = document.getElementById("exit-label");
    if (exit && exit.firstChild) exit.firstChild.textContent = data.mode === "cycle" ? "Until" : "Done when";
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
      title: "Faster pace",
      body: warning,
      confirmLabel: "Keep",
      cancelLabel: "Slow down",
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
      confirmLabel: "Keep as a note",
      cancelLabel: "Change it",
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
    if (action === "toggle-why") {
      saveQuiet();
      why = !why;
      render();
      return;
    }
    if (action === "toggle-menu") {
      saveQuiet();
      menu = menu === "catalog" || menu === "network" || menu === "custom" ? null : "catalog";
      picker = null;
      render();
      return;
    }
    if (action === "toggle-start") {
      saveQuiet();
      menu = menu === "start" ? null : "start";
      picker = null;
      render();
      return;
    }
    if (action === "show-extra") {
      menu = button.dataset.extra === "network" ? "network" : "custom";
      render();
      var input = root().querySelector(menu === "network" ? "[data-network-name]" : "[data-custom-name]");
      if (input) input.focus();
      return;
    }
    if (action === "focus-channel") {
      saveQuiet();
      focusId = button.dataset.channel;
      why = false;
      menu = null;
      render();
      return;
    }
    if (action === "toggle-channel") {
      saveQuiet();
      var id = button.dataset.channel;
      var node = NS.model.findNode(openId);
      var turningOn = !(node && node.comms[id] && node.comms[id].enabled);
      if (turningOn) focusId = id;
      else if (focusId === id) focusId = null;
      writeComms(function (comms) {
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
      if (focusId === button.dataset.channel) focusId = null;
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
      focusId = added.extra.id;
      menu = "catalog";
      writeComms(function (comms) {
        if (!comms[added.extra.id]) return;
        comms[added.extra.id].enabled = true;
        comms[added.extra.id].actions[Object.keys(comms[added.extra.id].actions)[0]] = true;
      });
      return;
    }
    if (action === "mark-advance") {
      saveQuiet();
      var current = NS.model.findNode(openId);
      if (!current) return;
      var moved = NS.model.markAdvance(current.personaId, current.stageId);
      if (!moved.ok) {
        NS.ui.toast(moved.error);
        return;
      }
      if (moved.existed) open(moved.node.id);
      return;
    }
    if (action === "act-clone" || action === "act-copy" || action === "act-cadence" || action === "act-template") {
      saveQuiet();
      picker = action === "act-clone" ? "clone" : action === "act-copy" ? "copy" : action === "act-cadence" ? "cadence" : "template";
      menu = null;
      render();
      return;
    }
    if (action === "pick-node") {
      var source = button.dataset.sourceId;
      var mode = picker;
      if (mode === "copy") NS.model.keepCopyChangeCadence(openId, source);
      else if (mode === "cadence") NS.model.keepCadenceChangeCopy(openId, source);
      else NS.model.cloneFrom(openId, source);
      return;
    }
    if (action === "pick-template") {
      var template = NS.templates.byId(button.dataset.templateId);
      if (!template) return;
      NS.model.applyTemplate(openId, template);
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
      NS.ui.toast("Saved.");
      return;
    }
    if (action === "act-rebuild") {
      var ok = await NS.ui.confirm({
        title: "Clear this step?",
        body: "Channels and wording on this step will be removed.",
        confirmLabel: "Clear",
        danger: true
      });
      if (!ok) return;
      focusId = null;
      NS.model.rebuildNode(openId);
      return;
    }
    if (action === "delete-node") {
      var remove = await NS.ui.confirm({
        title: "Remove this step?",
        body: "This person and stage will have no step.",
        confirmLabel: "Remove",
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
      if (event.target.matches("[data-network-name], [data-custom-name]")) return;
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
