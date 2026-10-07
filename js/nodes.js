(function (NS) {
  "use strict";

  function dotColor(id) {
    return { email: "#7dcec4", sms: "#e8c98a", mail: "#e7b1a4", call: "#a9c0f5" }[id] || "#8e98a3";
  }

  function modeMark(mode) {
    if (mode === "cycle") {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8a5 5 0 0 1 8.5-2.2L17 7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M17 4.5 V7.5 H14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M17 16a5 5 0 0 1-8.5 2.2L7 17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M7 19.5 V16.5 H10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12 H17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M13 7.5 L18 12 L13 16.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function bubbleInner(node) {
    var dots = NS.registry.commChannels.filter(function (ch) {
      return node.comms[ch.id] && node.comms[ch.id].enabled;
    }).map(function (ch) {
      return '<i style="background:' + dotColor(ch.id) + '" title="' + NS.util.esc(ch.label) + '"></i>';
    }).join("");
    return '<span class="bubble-mode">' + modeMark(node.mode) + "</span>" +
      (dots ? '<span class="bubble-dots" aria-hidden="true">' + dots + "</span>" : "");
  }

  function cellHTML(persona, stage, animateId) {
    var node = NS.model.nodeAt(persona.id, stage.id);
    if (!node) {
      return '<div class="cell"><button type="button" class="bubble is-empty" data-action="create-node" data-testid="node-empty" data-persona-id="' + persona.id + '" data-stage-id="' + stage.id + '" aria-label="Create node for ' + NS.util.esc(persona.name) + " at " + NS.util.esc(stage.name) + '">' + NS.util.icon("plus") + "</button></div>";
    }
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var fresh = node.id === animateId ? (reduce ? " is-fade" : " is-new") : "";
    var configured = NS.model.isConfigured(node) ? " is-set" : "";
    var label = NS.model.nodeLabel(node) + ". " + NS.model.summary(node);
    return '<div class="cell"><button type="button" class="bubble is-filled' + configured + fresh + '" data-action="open-node" data-testid="node" data-node-id="' + node.id + '" data-persona-id="' + persona.id + '" data-stage-id="' + stage.id + '" aria-label="' + NS.util.esc(label) + '">' + bubbleInner(node) + "</button></div>";
  }

  function box(el, ancestor) {
    var x = 0;
    var y = 0;
    var node = el;
    while (node && node !== ancestor) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent;
    }
    return { x: x, y: y, w: el.offsetWidth, h: el.offsetHeight };
  }

  function line(x1, y1, x2, y2, drawing) {
    var len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 4) return "";
    var rounded = Math.round(len * 10) / 10;
    if (!drawing) {
      return '<line class="trace" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>';
    }
    return '<line class="trace is-drawing" style="--len:' + rounded + '" stroke-dasharray="' + rounded + '" stroke-dashoffset="' + rounded + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>';
  }

  // Horizontal stroke grows from the persona row. Vertical stroke grows from the stage column.
  function drawTraces(animateId) {
    var grid = document.getElementById("grid");
    var svg = document.getElementById("traces");
    if (!grid || !svg) return;
    var width = grid.offsetWidth;
    var height = grid.offsetHeight;
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var parts = [];
    NS.model.get().nodes.forEach(function (node) {
      var bubble = grid.querySelector('[data-node-id="' + NS.util.cssEscape(node.id) + '"]');
      var persona = grid.querySelector('.persona-cell[data-persona-id="' + NS.util.cssEscape(node.personaId) + '"]');
      var stage = grid.querySelector('.stage-head[data-stage-id="' + NS.util.cssEscape(node.stageId) + '"]');
      if (!bubble || !persona || !stage) return;
      var b = box(bubble, grid);
      var p = box(persona, grid);
      var s = box(stage, grid);
      var cx = b.x + b.w / 2;
      var cy = b.y + b.h / 2;
      var radius = b.w / 2;
      var drawing = node.id === animateId && !reduce;
      parts.push(line(s.x + s.w / 2, s.y + s.h, cx, cy - radius, drawing));
      parts.push(line(p.x + p.w, p.y + p.h / 2, cx - radius, cy, drawing));
    });
    svg.innerHTML = parts.join("");
  }

  function refreshBubble(nodeId) {
    var button = document.querySelector('[data-node-id="' + NS.util.cssEscape(nodeId) + '"]');
    var node = NS.model.findNode(nodeId);
    if (!button || !node) return;
    button.classList.toggle("is-set", NS.model.isConfigured(node));
    button.classList.remove("is-new");
    button.setAttribute("aria-label", NS.model.nodeLabel(node) + ". " + NS.model.summary(node));
    button.innerHTML = bubbleInner(node);
  }

  NS.nodes = {
    cellHTML: cellHTML,
    drawTraces: drawTraces,
    refreshBubble: refreshBubble
  };
})(window.NodeCRM);
