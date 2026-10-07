(function (NS) {
  "use strict";

  var ui = { selected: null, wire: false, wireFrom: null, selectedWire: null, drag: null };

  function root() { return document.getElementById("channel-map"); }

  function kindLabel(kind) {
    var found = NS.registry.acquisitionKinds.filter(function (item) { return item.id === kind; })[0];
    return found ? found.label : "Other";
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
    var advanceLabel = "Move to " + (advance ? advance.name : "Consideration");
    var channelOptions = '<option value="">No source channel</option>' + state.awareness.channels.map(function (channel) {
      return '<option value="' + channel.id + '">' + NS.util.esc(channel.name) + "</option>";
    }).join("");

    function cards(status) {
      return state.awareness.people.filter(function (person) { return person.status === status; }).map(function (person) {
        var channel = state.awareness.channels.filter(function (item) { return item.id === person.channelId; })[0];
        var source = channel ? '<span class="mini-chip">' + NS.util.esc(channel.name) + "</span>" : '<span class="mini-chip">No source</span>';
        var actions = "";
        if (status === "lead") {
          actions = '<button type="button" class="btn btn-primary" data-action="become-contact" data-person-id="' + person.id + '">Become contact</button>';
        } else if (status === "contact") {
          var options = '<option value=""' + (person.personaId ? "" : " selected") + ">Unassigned</option>" + state.personas.map(function (persona) {
            return '<option value="' + persona.id + '"' + (persona.id === person.personaId ? " selected" : "") + ">" + NS.util.esc(persona.name) + "</option>";
          }).join("");
          actions = '<label>Resembles persona<select data-action="assign-persona" data-person-id="' + person.id + '">' + options + "</select></label>" +
            '<button type="button" class="btn btn-primary" data-action="move-forward" data-person-id="' + person.id + '">' + NS.util.esc(advanceLabel) + "</button>";
        } else {
          var stage = NS.model.stageById(person.advancedStageId);
          actions = '<p class="fine">On ' + NS.util.esc(stage ? stage.name : "the next stage") + ".</p>";
        }
        return '<article class="person-card"><header><strong>' + NS.util.esc(person.name) + "</strong>" + source + "</header>" + actions + "</article>";
      }).join("");
    }

    return '<form id="lead-form" class="lead-form"><label>New lead<input name="name" maxlength="48" placeholder="Person name" required></label>' +
      '<label>Source channel<select name="channel">' + channelOptions + "</select></label>" +
      '<button type="submit" class="btn">Add lead</button></form>' +
      "<h3>Leads</h3>" + (cards("lead") || '<p class="fine">Leads show up from a channel.</p>') +
      "<h3>Contacts</h3>" + (cards("contact") || '<p class="fine">Turn a lead into a contact before they move on.</p>') +
      "<h3>Moved on</h3>" + (cards("advanced") || '<p class="fine">Contacts move to the next stage on the plane.</p>');
  }

  function inspectorHTML() {
    var channel = NS.model.get().awareness.channels.filter(function (item) { return item.id === ui.selected; })[0];
    if (!channel) return '<p class="fine">Select a channel to rename or remove it.</p>';
    var kinds = NS.registry.acquisitionKinds.map(function (kind) {
      return '<option value="' + kind.id + '"' + (kind.id === channel.kind ? " selected" : "") + ">" + kind.label + "</option>";
    }).join("");
    return '<label>Channel name<input id="channel-rename" maxlength="40" value="' + NS.util.esc(channel.name) + '"></label>' +
      '<label>Kind<select id="channel-kind">' + kinds + "</select></label>" +
      '<button type="button" class="btn btn-danger" data-action="remove-channel" data-channel-id="' + channel.id + '">Remove channel</button>';
  }

  function render() {
    var state = NS.model.get();
    var stage = NS.model.awarenessStage();
    var kinds = NS.registry.acquisitionKinds.map(function (kind) {
      return '<option value="' + kind.id + '">' + kind.label + "</option>";
    }).join("");
    var nodes = state.awareness.channels.map(function (channel) {
      var cls = "map-node";
      if (ui.selected === channel.id) cls += " is-selected";
      if (ui.wireFrom === channel.id) cls += " is-source";
      var pressed = ui.selected === channel.id || ui.wireFrom === channel.id;
      return '<div class="' + cls + '" role="button" tabindex="0" aria-pressed="' + (pressed ? "true" : "false") + '" aria-label="' + NS.util.esc(kindLabel(channel.kind) + ", " + channel.name) + '" data-channel-id="' + channel.id + '" style="left:' + channel.x + "%;top:" + channel.y + '%">' +
        '<span>' + NS.util.esc(kindLabel(channel.kind)) + "</span><strong>" + NS.util.esc(channel.name) + "</strong></div>";
    }).join("");
    var wireLabel = ui.wire ? "Wiring on" : "Wire channels";
    var wireExtra = ui.selectedWire ? '<button type="button" class="btn btn-danger" data-action="remove-wire" data-wire-id="' + ui.selectedWire + '">Remove wire</button>' : "";
    root().innerHTML = '<div class="map-sheet" role="dialog" aria-modal="true" aria-labelledby="map-title">' +
      '<header class="map-head"><button type="button" class="btn btn-plain" data-action="close-map">Done</button>' +
      '<div class="map-title-block"><h2 id="map-title">' + NS.util.esc(stage.name) + '</h2><p class="fine">Add channels and wire how attention moves. Leads become contacts, then move to the next stage.</p></div></header>' +
      '<div class="map-toolbar"><form id="channel-form"><input name="name" maxlength="40" required placeholder="Channel name" aria-label="Channel name"><select name="kind" aria-label="Channel kind">' + kinds + "</select>" +
      '<button type="submit" class="btn btn-primary">Add channel</button></form>' +
      '<button type="button" class="btn' + (ui.wire ? " is-on" : "") + '" data-action="toggle-wire" aria-pressed="' + (ui.wire ? "true" : "false") + '" data-testid="wire-toggle">' + wireLabel + "</button>" +
      wireExtra + "</div>" +
      '<div class="map-body"><div class="map-canvas-wrap"><div class="map-canvas" id="map-canvas" data-testid="map-canvas">' +
      '<svg id="map-wires" class="map-wires"></svg>' + nodes +
      (nodes ? "" : '<p class="map-empty">Add a channel to start the map.</p>') +
      '</div><div class="map-inspector" id="map-inspector">' + inspectorHTML() + "</div></div>" +
      '<aside class="people-pane" aria-label="Leads and contacts">' + peopleHTML() + "</aside></div></div>";
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

  function init() {
    var node = root();
    node.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("resize", NS.util.debounce(redrawWires, 120));
    node.addEventListener("submit", function (event) {
      event.preventDefault();
      if (event.target.id === "channel-form") {
        var data = new FormData(event.target);
        var name = String(data.get("name") || "").trim();
        if (!name) return;
        var channel = NS.model.addChannel({ name: name, kind: data.get("kind") });
        ui.selected = channel.id;
        return;
      }
      if (event.target.id === "lead-form") {
        var lead = new FormData(event.target);
        var result = NS.model.addLead({ name: lead.get("name"), channelId: lead.get("channel") || null });
        if (!result.ok) NS.ui.toast(result.error);
      }
    });
    node.addEventListener("change", function (event) {
      if (event.target.id === "channel-rename" || event.target.id === "channel-kind") {
        if (!ui.selected) return;
        NS.model.updateChannel(ui.selected, {
          name: document.getElementById("channel-rename").value,
          kind: document.getElementById("channel-kind").value
        });
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
      else if (action === "toggle-wire") {
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
        NS.model.convertToContact(button.dataset.personId);
        NS.ui.toast("Lead is now a contact.");
      } else if (action === "move-forward") {
        var moved = NS.model.movePersonForward(button.dataset.personId);
        if (!moved.ok) {
          NS.ui.toast(moved.error);
          return;
        }
        NS.ui.toast(moved.created
          ? "Added " + moved.stage.name + " and moved the contact there."
          : "Moved the contact to " + moved.stage.name + ".");
      }
    });
  }

  NS.channels = { init: init, open: open, close: close, isOpen: isOpen, sync: sync, redrawWires: redrawWires };
})(window.NodeCRM);
