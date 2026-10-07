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

  function channelBlock(node, channel, emphasize) {
    var item = node.comms[channel.id];
    var units = NS.registry.cadenceUnits.map(function (unit) {
      return '<option value="' + unit.id + '"' + (item.cadence.unit === unit.id ? " selected" : "") + ">" + unit.label + "</option>";
    }).join("");
    var fields = channel.fields.map(function (field) {
      var hot = emphasize === "copy" ? " is-hot" : "";
      var value = NS.util.esc(item.copy[field.key] || "");
      if (field.type === "textarea") {
        return '<label class="' + hot.trim() + '">' + field.label + '<textarea data-field="' + field.key + '" rows="4">' + value + "</textarea></label>";
      }
      return '<label class="' + hot.trim() + '">' + field.label + '<input data-field="' + field.key + '" type="text" value="' + value + '"></label>';
    }).join("");
    var cadenceHot = emphasize === "cadence" ? " is-hot" : "";
    return '<section class="channel-block' + (item.enabled ? "" : " is-off") + '" data-channel="' + channel.id + '">' +
      '<header><label class="switch"><input type="checkbox" data-field="enabled"' + (item.enabled ? " checked" : "") + ">" +
      '<span class="switch-track" aria-hidden="true"></span><span>' + NS.util.esc(channel.label) + "</span></label></header>" +
      '<div class="channel-details">' +
      (channel.hint ? '<p class="fine">' + NS.util.esc(channel.hint) + "</p>" : "") +
      '<div class="cadence' + cadenceHot + '"><span>Every</span><input data-field="interval" type="number" min="1" max="365" value="' + item.cadence.interval + '"><select data-field="unit">' + units + "</select></div>" +
      fields + "</div></section>";
  }

  function pickerHTML() {
    if (!picker) return "";
    if (picker === "template") {
      var rows = NS.templates.all().map(function (template) {
        var del = template.builtIn ? "" : '<button type="button" class="text-btn" data-action="delete-template" data-template-id="' + template.id + '">Delete</button>';
        return '<div class="picker-row"><button type="button" data-action="pick-template" data-template-id="' + template.id + '"><strong>' +
          NS.util.esc(template.name) + "</strong><span>" + NS.util.esc(template.description || "") + "</span></button>" + del + "</div>";
      }).join("");
      return '<div class="picker"><p>Use a template</p>' + rows + "</div>";
    }
    var others = NS.model.get().nodes.filter(function (node) { return node.id !== openId; });
    var title = picker === "clone" ? "Clone another node" : picker === "copy" ? "Keep this copy, then change cadence" : "Keep this cadence, then change copy";
    if (!others.length) {
      return '<div class="picker"><p>' + title + '</p><p class="fine">Create another node first, or start from a template.</p></div>';
    }
    var rows = others.map(function (node) {
      return '<button type="button" data-action="pick-node" data-source-id="' + node.id + '"><strong>' +
        NS.util.esc(NS.model.nodeLabel(node)) + "</strong><span>" + NS.util.esc(NS.model.summary(node)) + "</span></button>";
    }).join("");
    return '<div class="picker"><p>' + title + "</p>" + rows + "</div>";
  }

  function render(emphasize) {
    var node = NS.model.findNode(openId);
    if (!node) { close(); return; }
    var persona = NS.model.personaById(node.personaId);
    var stage = NS.model.stageById(node.stageId);
    var modes = NS.registry.nodeModes.map(function (mode) {
      return '<label class="mode-option"><input type="radio" name="mode" value="' + mode.id + '"' + (node.mode === mode.id ? " checked" : "") + "><span>" + mode.label + "</span></label>";
    }).join("");
    var channels = NS.registry.commChannels.map(function (channel) {
      return channelBlock(node, channel, emphasize);
    }).join("");
    root().innerHTML = '<div class="scrim" data-action="close-comms"></div>' +
      '<form class="drawer-panel" id="comms-form" data-testid="comms-panel" role="dialog" aria-modal="true" aria-labelledby="comms-title">' +
      '<header class="drawer-head"><div><p class="caption" id="comms-kicker">' + NS.util.esc(persona ? persona.name : "Persona") + " · " + NS.util.esc(stage ? stage.name : "Stage") + "</p>" +
      '<h2 id="comms-title">Communications</h2><p class="fine" id="comms-summary">' + NS.util.esc(NS.model.summary(node)) + "</p></div>" +
      '<button type="button" class="icon-btn" data-action="close-comms" aria-label="Close">' + NS.util.icon("close") + "</button></header>" +
      '<div class="drawer-scroll">' +
      '<div class="mode-switch" role="radiogroup" aria-label="Node type">' + modes + "</div>" +
      '<p class="fine" id="mode-hint">' + NS.util.esc(modeHint(node.mode)) + "</p>" +
      '<label id="exit-label">' + (node.mode === "cycle" ? "Stays until" : "Completed when") +
      '<input data-field="exitAction" type="text" maxlength="120" value="' + NS.util.esc(node.exitAction) + '" placeholder="' + (node.mode === "cycle" ? "They buy, book, or ask to stop" : "The sequence has been sent") + '"></label>' +
      channels +
      '<div><p class="group-label">Start from</p><div class="group-list">' +
      '<button type="button" class="group-row" data-action="act-clone"><span>Clone another node</span><span class="chev" aria-hidden="true">' + NS.util.icon("chevron") + "</span></button>" +
      '<button type="button" class="group-row" data-action="act-copy"><span>Keep copy, change cadence</span><span class="chev" aria-hidden="true">' + NS.util.icon("chevron") + "</span></button>" +
      '<button type="button" class="group-row" data-action="act-cadence"><span>Keep cadence, change copy</span><span class="chev" aria-hidden="true">' + NS.util.icon("chevron") + "</span></button>" +
      '<button type="button" class="group-row" data-action="act-template"><span>Use a template</span><span class="chev" aria-hidden="true">' + NS.util.icon("chevron") + "</span></button>" +
      '<button type="button" class="group-row" data-action="act-rebuild"><span>Rebuild</span></button>' +
      "</div></div>" +
      pickerHTML() +
      '<details class="disclosure"><summary>Save as template</summary><div class="disclosure-body">' +
      '<label>Template name<input id="template-name" maxlength="48" placeholder="Name"></label>' +
      '<button type="button" class="btn btn-tinted" data-action="save-template">Save template</button></div></details>' +
      "</div>" +
      '<footer class="drawer-foot"><button type="button" class="btn btn-danger btn-block" data-action="delete-node">Delete node</button></footer>' +
      "</form>";
    if (emphasize) {
      var hot = root().querySelector(".is-hot input, .is-hot textarea, .is-hot select");
      if (hot) hot.focus();
    }
    if (picker) {
      var list = root().querySelector(".picker");
      if (list) list.scrollIntoView({ block: "nearest" });
    }
  }

  function refreshHeading() {
    if (!isOpen()) return;
    var node = NS.model.findNode(openId);
    if (!node) return;
    var persona = NS.model.personaById(node.personaId);
    var stage = NS.model.stageById(node.stageId);
    var kicker = document.getElementById("comms-kicker");
    if (kicker) kicker.textContent = (persona ? persona.name : "Persona") + " · " + (stage ? stage.name : "Stage");
  }

  function readAndSave() {
    var form = document.getElementById("comms-form");
    var node = NS.model.findNode(openId);
    if (!form || !node) return;
    var selected = form.querySelector("input[name='mode']:checked");
    var comms = NS.registry.blankComms();
    NS.registry.commChannels.forEach(function (channel) {
      var block = form.querySelector('[data-channel="' + channel.id + '"]');
      comms[channel.id].enabled = block.querySelector("[data-field='enabled']").checked;
      var interval = Number(block.querySelector("[data-field='interval']").value);
      comms[channel.id].cadence.interval = interval >= 1 && interval <= 365 ? interval : 1;
      comms[channel.id].cadence.unit = block.querySelector("[data-field='unit']").value;
      channel.fields.forEach(function (field) {
        comms[channel.id].copy[field.key] = block.querySelector('[data-field="' + field.key + '"]').value;
      });
    });
    NS.model.updateNodeFields(openId, {
      mode: selected ? selected.value : "linear",
      exitAction: form.querySelector("[data-field='exitAction']").value,
      comms: comms
    });
    var hint = document.getElementById("mode-hint");
    var exit = document.getElementById("exit-label");
    var mode = selected ? selected.value : "linear";
    if (hint) hint.textContent = modeHint(mode);
    if (exit) exit.firstChild.textContent = mode === "cycle" ? "Stays until" : "Completed when";
    blockOffState(form);
  }

  function blockOffState(form) {
    NS.registry.commChannels.forEach(function (channel) {
      var block = form.querySelector('[data-channel="' + channel.id + '"]');
      if (!block) return;
      block.classList.toggle("is-off", !block.querySelector("[data-field='enabled']").checked);
    });
  }

  function sync(meta) {
    if (!openId || !meta || meta.nodeId !== openId) return;
    if (meta.render === "node") {
      picker = null;
      render(meta.emphasize);
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
    if (action === "act-clone" || action === "act-copy" || action === "act-cadence" || action === "act-template") {
      readAndSave();
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
      if (mode === "copy") NS.ui.toast("Copy kept from " + label + ". Update the cadence.");
      else if (mode === "cadence") NS.ui.toast("Cadence kept from " + label + ". Update the copy.");
      else NS.ui.toast("Cloned " + label + ".");
      return;
    }
    if (action === "pick-template") {
      var template = NS.templates.byId(button.dataset.templateId);
      if (!template) return;
      NS.model.applyTemplate(openId, template);
      NS.ui.toast("Template applied. Edit anything that should differ.");
      return;
    }
    if (action === "delete-template") {
      NS.model.deleteTemplate(button.dataset.templateId);
      render();
      return;
    }
    if (action === "save-template") {
      readAndSave();
      var name = document.getElementById("template-name").value;
      var saved = NS.model.saveTemplateFromNode(openId, name);
      if (!saved.ok) {
        NS.ui.toast(saved.error);
        return;
      }
      NS.ui.toast("Template “" + saved.template.name + "” saved in this browser.");
      document.getElementById("template-name").value = "";
      return;
    }
    if (action === "act-rebuild") {
      var ok = await NS.ui.confirm({
        title: "Rebuild this node?",
        body: "Copy, cadence, and channel switches on this node will be cleared.",
        confirmLabel: "Rebuild",
        danger: true
      });
      if (!ok) return;
      NS.model.rebuildNode(openId);
      NS.ui.toast("Node cleared. Set it up again, or use a template.");
      return;
    }
    if (action === "delete-node") {
      var remove = await NS.ui.confirm({
        title: "Delete this node?",
        body: "The communications plan at this persona and stage will be removed.",
        confirmLabel: "Delete node",
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
      readAndSave();
    });
    node.addEventListener("change", function (event) {
      if (!event.target.closest("#comms-form")) return;
      readAndSave();
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
