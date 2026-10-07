(function (NS) {
  "use strict";

  var ui = { selected: null, wire: false, wireFrom: null, selectedWire: null, drag: null };

  function root() { return document.getElementById("channel-map"); }

  function specFor(channel) {
    return NS.registry.channelById(channel.catalogId, NS.model.get());
  }

  function kindLabel(channel) {
    var spec = specFor(channel);
    if (spec) return spec.group === "social" ? "Social" : spec.group === "physical" ? "In person" : spec.group === "direct" ? "Direct" : "Other";
    return "Other";
  }

  function isOpen() { return !root().hidden; }

  function open() {
    ui.selected = null;
    ui.wireFrom = null;
    ui.selectedWire = null;
    root().hidden = false;
    render();
  }

  function close() {
    ui.drag = null;
    root().hidden = true;
    root().innerHTML = "";
  }

  function sync(meta) {
    if (root().hidden) return;
    if (meta && meta.selectChannel) ui.selected = meta.selectChannel;
    render();
  }

  function positions() {
    var map = {};
    NS.model.get().awareness.channels.forEach(function (channel) {
      map[channel.id] = { x: channel.x, y: channel.y };
    });
    if (ui.drag && ui.drag.moved && Number.isFinite(ui.drag.x)) {
      map[ui.drag.id] = { x: ui.drag.x, y: ui.drag.y };
    }
    return map;
  }

  function redrawWires() {
    var canvas = document.getElementById("map-canvas");
    var svg = document.getElementById("map-wires");
    if (!canvas || !svg) return;
    var width = canvas.clientWidth;
    var height = canvas.clientHeight;
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    var pos = positions();
    var html = NS.model.get().awareness.wires.map(function (wire) {
      var a = pos[wire.from];
      var b = pos[wire.to];
      if (!a || !b) return "";
      var x1 = a.x / 100 * width;
      var y1 = a.y / 100 * height;
      var x2 = b.x / 100 * width;
      var y2 = b.y / 100 * height;
      var mx = (x1 + x2) / 2 - (y2 - y1) * 0.12;
      var my = (y1 + y2) / 2 + (x2 - x1) * 0.12;
      var d = "M " + x1 + " " + y1 + " Q " + mx + " " + my + " " + x2 + " " + y2;
      var selected = ui.selectedWire === wire.id ? " is-selected" : "";
      return '<path class="wire-hit" data-action="select-wire" data-wire-id="' + wire.id + '" d="' + d + '"/>' +
        '<path class="wire-vis' + selected + '" d="' + d + '"/>';
    }).join("");
    svg.innerHTML = html;
  }

  function peopleHTML() {
    var state = NS.model.get();
    var advance = NS.model.peekAdvanceStage();
    var advanceLabel = "Move to " + (advance ? advance.name : "the next stage");
    var channelOptions = '<option value="">No channel yet</option>' + state.awareness.channels.map(function (channel) {
      return '<option value="' + channel.id + '">' + NS.util.esc(channel.name) + "</option>";
    }).join("");

    function cards(status) {
      return state.awareness.people.filter(function (person) { return person.status === status; }).map(function (person) {
        var channel = state.awareness.channels.filter(function (item) { return item.id === person.channelId; })[0];
        var source = channel ? '<span class="mini-chip">' + NS.util.esc(channel.name) + "</span>" : '<span class="mini-chip">No channel</span>';
        var actions = "";
        if (status === "lead") {
          actions = '<button type="button" class="btn btn-primary" data-action="become-contact" data-person-id="' + person.id + '">Move into the plan</button>' +
            '<button type="button" class="btn btn-danger" data-action="opt-out" data-person-id="' + person.id + '">They asked to stop</button>';
        } else if (status === "contact") {
          var options = '<option value=""' + (person.personaId ? "" : " selected") + ">Not matched yet</option>" + state.personas.map(function (persona) {
            return '<option value="' + persona.id + '"' + (persona.id === person.personaId ? " selected" : "") + ">" + NS.util.esc(persona.name) + "</option>";
          }).join("");
          actions = '<label>Looks like<select data-action="assign-persona" data-person-id="' + person.id + '">' + options + "</select></label>" +
            '<button type="button" class="btn btn-primary" data-action="move-forward" data-person-id="' + person.id + '">' + NS.util.esc(advanceLabel) + "</button>" +
            '<button type="button" class="btn btn-danger" data-action="opt-out" data-person-id="' + person.id + '">They asked to stop</button>';
        } else if (status === "opted_out") {
          actions = '<p class="fine">Left out of every message. Put them back only if they ask to hear from you again.</p>' +
            '<button type="button" class="btn" data-action="restore-person" data-person-id="' + person.id + '">They asked to hear from us again</button>';
        } else {
          var stage = NS.model.stageById(person.advancedStageId);
          actions = '<p class="fine">On ' + NS.util.esc(stage ? stage.name : "the next stage") + ".</p>" +
            '<button type="button" class="btn btn-danger" data-action="opt-out" data-person-id="' + person.id + '">They asked to stop</button>';
        }
        return '<article class="person-card"><header><strong>' + NS.util.esc(person.name) + "</strong>" + source + "</header>" + actions + "</article>";
      }).join("");
    }

    return '<p class="fine">Moving someone ahead does not mean they consented. Consent is checked on each message.</p>' +
      '<form id="lead-form" class="lead-form"><label>Person\'s name<input name="name" maxlength="48" placeholder="Name" required></label>' +
      '<label>Where you met them<select name="channel">' + channelOptions + "</select></label>" +
      '<button type="submit" class="btn">Add the name</button></form>' +
      "<h3>Do not contact</h3>" + (cards("opted_out") || '<p class="fine">When someone asks to stop, they stay here so you do not add them again.</p>') +
      "<h3>New names</h3>" + (cards("lead") || '<p class="fine">Names you have not put in the plan yet.</p>') +
      "<h3>In the plan</h3>" + (cards("contact") || '<p class="fine">People you are matching to a person on the plane.</p>') +
      "<h3>Moved ahead</h3>" + (cards("advanced") || '<p class="fine">People who left the first stage.</p>');
  }

  function inspectorHTML() {
    var channel = NS.model.get().awareness.channels.filter(function (item) { return item.id === ui.selected; })[0];
    if (!channel) return '<p class="fine">Select a channel to see its actions.</p>';
    var spec = specFor(channel);
    var actions = spec ? spec.actions.map(function (action) {
      var on = channel.actions && channel.actions[action.id];
      return '<button type="button" class="chip' + (on ? " is-on" : "") + '" data-action="toggle-map-action" data-channel-id="' + channel.id + '" data-act="' + action.id + '" aria-pressed="' + (on ? "true" : "false") + '">' + NS.util.esc(action.label) + "</button>";
    }).join("") : "";
    var note = spec && spec.hint ? '<p class="fine">' + NS.util.esc(spec.hint) + "</p>" : '<p class="fine">This came from an older freeform channel. Prefer one from the catalog when you can.</p>';
    var quiet = spec ? NS.compliance.quietNote(spec) : "";
    return '<p class="group-label">' + NS.util.esc(channel.name) + "</p>" + note +
      (quiet ? '<p class="quiet-note">' + NS.util.esc(quiet) + "</p>" : "") +
      (actions ? '<p class="group-label">Actions that belong to it</p><div class="chip-row">' + actions + "</div>" : "") +
      '<label>Name on the map<input id="channel-rename" maxlength="40" value="' + NS.util.esc(channel.name) + '"></label>' +
      '<button type="button" class="btn btn-danger" data-action="remove-channel" data-channel-id="' + channel.id + '">Remove channel</button>';
  }

  function catalogHTML() {
    var state = NS.model.get();
    var placed = {};
    state.awareness.channels.forEach(function (channel) { placed[channel.catalogId] = channel.id; });
    return NS.registry.groups(state).map(function (group) {
      var chips = group.items.map(function (item) {
        var on = !!placed[item.id];
        return '<button type="button" class="chip' + (on ? " is-on" : "") + '" data-action="add-catalog" data-catalog="' + item.id + '" aria-pressed="' + (on ? "true" : "false") + '">' + NS.util.esc(item.label) + "</button>";
      }).join("");
      var extra = "";
      if (group.allowNetwork) {
        extra = '<details class="disclosure"><summary>Add a network</summary><div class="disclosure-body edit-row">' +
          '<input id="network-name" maxlength="40" placeholder="Network name" aria-label="Network name">' +
          '<button type="button" class="btn" data-action="add-network">Add</button></div></details>';
      }
      if (group.secondary) {
        return '<details class="disclosure"><summary>Something else</summary><div class="disclosure-body"><div class="chip-row">' + chips + "</div>" +
          '<div class="edit-row"><input id="custom-name" maxlength="40" placeholder="Channel name" aria-label="Custom channel name">' +
          '<button type="button" class="btn" data-action="add-custom">Add</button></div></div></details>';
      }
      return '<section class="catalog-group"><p class="group-label">' + NS.util.esc(group.label) + '</p><div class="chip-row">' + chips + "</div>" + extra + "</section>";
    }).join("");
  }

  function render() {
    var state = NS.model.get();
    var stage = NS.model.awarenessStage();
    var nodes = state.awareness.channels.map(function (channel) {
      var cls = "map-node";
      if (ui.selected === channel.id) cls += " is-selected";
      if (ui.wireFrom === channel.id) cls += " is-source";
      var pressed = ui.selected === channel.id || ui.wireFrom === channel.id;
      var spec = specFor(channel);
      var actionNames = spec ? spec.actions.filter(function (action) { return channel.actions && channel.actions[action.id]; }).map(function (action) { return action.label; }) : [];
      return '<div class="' + cls + '" role="button" tabindex="0" aria-pressed="' + (pressed ? "true" : "false") + '" aria-label="' + NS.util.esc(channel.name + (actionNames.length ? ", " + actionNames.join(", ") : "")) + '" data-channel-id="' + channel.id + '" style="left:' + channel.x + "%;top:" + channel.y + '%">' +
        '<span>' + NS.util.esc(kindLabel(channel)) + "</span><strong>" + NS.util.esc(channel.name) + "</strong></div>";
    }).join("");
    var wireLabel = ui.wire ? "Connecting" : "Connect channels";
    var wireExtra = ui.selectedWire ? '<button type="button" class="btn btn-danger" data-action="remove-wire" data-wire-id="' + ui.selectedWire + '">Remove connection</button>' : "";
    root().innerHTML = '<div class="map-sheet" role="dialog" aria-modal="true" aria-labelledby="map-title">' +
      '<header class="map-head"><button type="button" class="btn btn-plain" data-action="close-map">Done</button>' +
      '<div class="map-title-block"><h2 id="map-title">' + NS.util.esc(stage.name) + '</h2><p class="fine">Pick channels from the list. Each one brings the actions that belong to it. Custom is at the bottom.</p></div></header>' +
      '<div class="catalog-bar">' + catalogHTML() + "</div>" +
      '<div class="map-toolbar">' +
      '<button type="button" class="btn' + (ui.wire ? " is-on" : "") + '" data-action="toggle-wire" aria-pressed="' + (ui.wire ? "true" : "false") + '" data-testid="wire-toggle">' + wireLabel + "</button>" +
      wireExtra + "</div>" +
      '<div class="map-body"><div class="map-canvas-wrap"><div class="map-canvas" id="map-canvas" data-testid="map-canvas">' +
      '<svg id="map-wires" class="map-wires"></svg>' + nodes +
      (nodes ? "" : '<p class="map-empty">Choose SMS, email, phone, a network, or an in-person channel to start.</p>') +
      '</div><div class="map-inspector" id="map-inspector">' + inspectorHTML() + "</div></div>" +
      '<aside class="people-pane" aria-label="People and do not contact">' + peopleHTML() + "</aside></div></div>";
    redrawWires();
  }

  function onDown(event) {
    var node = event.target.closest(".map-node");
    if (!node || !root().contains(node)) return;
    var channel = NS.model.get().awareness.channels.filter(function (item) { return item.id === node.dataset.channelId; })[0];
    if (!channel) return;
    ui.drag = {
      id: channel.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: channel.x,
      originY: channel.y,
      x: channel.x,
      y: channel.y,
      moved: false
    };
  }

  function onMove(event) {
    if (!ui.drag) return;
    var dx = event.clientX - ui.drag.startX;
    var dy = event.clientY - ui.drag.startY;
    if (Math.hypot(dx, dy) > 4) ui.drag.moved = true;
    if (!ui.drag.moved) return;
    var canvas = document.getElementById("map-canvas");
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    ui.drag.x = Math.max(8, Math.min(92, ui.drag.originX + (dx / rect.width) * 100));
    ui.drag.y = Math.max(10, Math.min(90, ui.drag.originY + (dy / rect.height) * 100));
    var node = document.querySelector('.map-node[data-channel-id="' + NS.util.cssEscape(ui.drag.id) + '"]');
    if (node) {
      node.style.left = ui.drag.x + "%";
      node.style.top = ui.drag.y + "%";
    }
    redrawWires();
  }

  function activateChannel(id) {
    if (ui.wire) {
      if (!ui.wireFrom) {
        ui.wireFrom = id;
        ui.selected = id;
        render();
        return;
      }
      if (ui.wireFrom === id) {
        ui.wireFrom = null;
        render();
        return;
      }
      var from = ui.wireFrom;
      ui.wireFrom = null;
      var result = NS.model.addWire(from, id);
      if (!result.ok) NS.ui.toast(result.error);
      return;
    }
    ui.selected = id;
    ui.selectedWire = null;
    render();
  }

  function onUp() {
    if (!ui.drag) return;
    var drag = ui.drag;
    ui.drag = null;
    if (drag.moved) {
      ui.selected = drag.id;
      NS.model.updateChannel(drag.id, { x: drag.x, y: drag.y });
      return;
    }
    activateChannel(drag.id);
  }

  function placeCatalog(catalogId) {
    var result = NS.model.addCatalogChannel(catalogId);
    if (!result.ok) {
      NS.ui.toast(result.error);
      return;
    }
    ui.selected = result.channel.id;
    if (result.existing) render();
  }

  function init() {
    var node = root();
    node.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("resize", NS.util.debounce(redrawWires, 120));
    node.addEventListener("submit", function (event) {
      event.preventDefault();
      if (event.target.id !== "lead-form") return;
      var lead = new FormData(event.target);
      var name = String(lead.get("name") || "");
      var blocked = NS.model.findOptOutByName(name);
      if (blocked) {
        NS.ui.confirm({
          title: "This name is on Do not contact",
          body: blocked.name + " already asked to stop. Add the name again only if you are sure this is a different person.",
          confirmLabel: "Add anyway",
          cancelLabel: "Leave them off",
          danger: true
        }).then(function (ok) {
          if (!ok) return;
          var again = NS.model.addLead({ name: name, channelId: lead.get("channel") || null });
          if (!again.ok) NS.ui.toast(again.error);
        });
        return;
      }
      var result = NS.model.addLead({ name: name, channelId: lead.get("channel") || null });
      if (!result.ok) NS.ui.toast(result.error);
    });
    node.addEventListener("change", function (event) {
      if (event.target.id === "channel-rename") {
        if (!ui.selected) return;
        NS.model.updateChannel(ui.selected, { name: event.target.value });
        return;
      }
      if (event.target.dataset.action === "assign-persona") {
        NS.model.assignPersona(event.target.dataset.personId, event.target.value);
      }
    });
    node.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      var mapNode = event.target.closest(".map-node");
      if (!mapNode || !node.contains(mapNode)) return;
      event.preventDefault();
      activateChannel(mapNode.dataset.channelId);
    });
    node.addEventListener("click", function (event) {
      if (event.target === node) {
        close();
        return;
      }
      var button = event.target.closest("[data-action]");
      if (!button) return;
      var action = button.dataset.action;
      if (action === "close-map") close();
      else if (action === "add-catalog") placeCatalog(button.dataset.catalog);
      else if (action === "add-network" || action === "add-custom") {
        var input = document.getElementById(action === "add-network" ? "network-name" : "custom-name");
        var added = NS.model.addExtra(input ? input.value : "", action === "add-network" ? "social" : "custom");
        if (!added.ok) {
          NS.ui.toast(added.error);
          return;
        }
        placeCatalog(added.extra.id);
      } else if (action === "toggle-map-action") {
        var channel = NS.model.get().awareness.channels.filter(function (item) { return item.id === button.dataset.channelId; })[0];
        if (!channel) return;
        var actions = Object.assign({}, channel.actions);
        actions[button.dataset.act] = !actions[button.dataset.act];
        NS.model.updateChannel(channel.id, { actions: actions });
      } else if (action === "toggle-wire") {
        ui.wire = !ui.wire;
        ui.wireFrom = null;
        render();
      } else if (action === "select-wire") {
        ui.selectedWire = button.dataset.wireId;
        ui.selected = null;
        render();
      } else if (action === "remove-wire") {
        NS.model.removeWire(button.dataset.wireId);
        ui.selectedWire = null;
      } else if (action === "remove-channel") {
        ui.selected = null;
        NS.model.removeChannel(button.dataset.channelId);
      } else if (action === "become-contact") {
        var movedIn = NS.model.convertToContact(button.dataset.personId);
        if (!movedIn.ok) NS.ui.toast(movedIn.error);
        else NS.ui.toast("They are in the plan. Consent is still checked on each message.");
      } else if (action === "opt-out") {
        NS.model.optOutPerson(button.dataset.personId);
        NS.ui.toast("Marked Do not contact. They stay off every message.");
      } else if (action === "restore-person") {
        NS.ui.confirm({
          title: "Hear from you again?",
          body: "Put them back only if they asked. Otherwise they stay on Do not contact so nobody messages them by mistake.",
          confirmLabel: "They asked to come back",
          cancelLabel: "Keep them off",
          danger: true
        }).then(function (ok) {
          if (!ok) return;
          NS.model.restorePerson(button.dataset.personId);
          NS.ui.toast("Back to new names. They are not in a message until you move them.");
        });
      } else if (action === "move-forward") {
        var moved = NS.model.movePersonForward(button.dataset.personId);
        if (!moved.ok) {
          NS.ui.toast(moved.error);
          return;
        }
        NS.ui.toast(moved.created
          ? "Added " + moved.stage.name + " and moved them there. This is not a consent check."
          : "Moved them to " + moved.stage.name + ".");
      }
    });
  }

  NS.channels = { init: init, open: open, close: close, isOpen: isOpen, sync: sync, redrawWires: redrawWires };
})(window.NodeCRM);
