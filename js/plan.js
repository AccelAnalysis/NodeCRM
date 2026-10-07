(function (NS) {
  "use strict";

  function root() { return document.getElementById("plan"); }

  function lines() {
    var state = NS.model.get();
    var items = [];
    var card = NS.compliance.sender(state);
    if (card.name && card.postal) items.push({ level: "ok", text: "Sender card has a name and a mailing address." });
    else items.push({ level: "wait", text: "Add your name and mailing address before any marketing email can be ready." });
    if (!state.nodes.length) {
      items.push({ level: "wait", text: "No steps yet. Open a circle where a person meets a stage and pick a channel." });
    }
    state.nodes.forEach(function (node) {
      var label = NS.model.nodeLabel(node);
      var waiting = [];
      NS.registry.list(state).forEach(function (channel) {
        var item = node.comms[channel.id];
        if (!item || !item.enabled) return;
        var gaps = NS.compliance.missing(channel, item, state);
        if (gaps.length) waiting.push(channel.label + ": " + gaps[0]);
      });
      var enabled = NS.registry.list(state).some(function (channel) {
        return node.comms[channel.id] && node.comms[channel.id].enabled;
      });
      if (!enabled) items.push({ level: "wait", text: label + " — pick a channel." });
      else if (!waiting.length) items.push({ level: "ok", text: label + " — checklist complete." });
      else items.push({ level: "wait", text: label + " — " + waiting[0] });
    });
    var dnc = state.awareness.people.filter(function (person) { return person.status === "opted_out"; });
    if (dnc.length) items.push({ level: "ok", text: dnc.length + " " + (dnc.length === 1 ? "person is" : "people are") + " on Do not contact, so they stay off every message." });
    else items.push({ level: "ok", text: "Do not contact is empty. When someone asks to stop, mark them on the channel map." });
    return items;
  }

  function open() {
    var body = lines().map(function (item) {
      return '<li class="plan-line is-' + item.level + '">' + NS.util.esc(item.text) + "</li>";
    }).join("");
    root().innerHTML = '<div class="modal plan-sheet" role="dialog" aria-modal="true" aria-labelledby="plan-title">' +
      '<div class="sheet-grabber" aria-hidden="true"></div>' +
      '<h2 id="plan-title">Check the plan</h2>' +
      '<p>Walk the list. A step is ready only when its checklist is done. Nothing here is sent.</p>' +
      '<ul class="plan-list">' + body + "</ul>" +
      '<p class="legal-note">' + NS.util.esc(NS.compliance.DISCLAIMER) + "</p>" +
      '<div class="modal-actions"><button type="button" class="btn btn-primary" data-action="close-plan">Done</button></div></div>';
    root().hidden = false;
    var done = root().querySelector("[data-action='close-plan']");
    if (done) done.focus();
  }

  function close() {
    root().hidden = true;
    root().innerHTML = "";
  }

  function isOpen() { return root() && !root().hidden; }

  function init() {
    root().addEventListener("click", function (event) {
      if (event.target === root() || event.target.closest("[data-action='close-plan']")) close();
    });
  }

  NS.plan = { init: init, open: open, close: close, isOpen: isOpen };
})(window.NodeCRM);
