(function (NS) {
  "use strict";

  function root() { return document.getElementById("plan"); }

  function open() {
    var state = NS.model.get();
    var rows = [];
    if (!state.nodes.length) rows.push({ tone: "wait", title: "No steps", label: "Not ready", why: "" });
    state.nodes.forEach(function (node) {
      var any = false;
      NS.registry.list(state).forEach(function (channel) {
        var item = node.comms[channel.id];
        if (!item || !item.enabled) return;
        any = true;
        var st = NS.compliance.status(channel, item, state);
        rows.push({
          tone: st.tone === "ok" ? "ok" : "wait",
          title: NS.model.nodeLabel(node) + " · " + channel.label,
          label: st.label,
          why: st.whys.join(" · ")
        });
      });
      if (!any) rows.push({ tone: "wait", title: NS.model.nodeLabel(node), label: "No channel", why: "" });
    });
    var dnc = state.awareness.people.filter(function (person) { return person.status === "opted_out"; }).length;
    if (dnc) rows.push({ tone: "ok", title: "Do not contact", label: String(dnc), why: "" });
    var body = rows.map(function (row) {
      var why = row.why
        ? '<details class="disclosure is-quiet"><summary>Why?</summary><div class="disclosure-body"><p class="why-line">' + NS.util.esc(row.why) + "</p></div></details>"
        : "";
      return '<li class="plan-row"><span>' + NS.util.esc(row.title) + '</span><span class="status-pill is-' + row.tone + '">' + NS.util.esc(row.label) + "</span>" + why + "</li>";
    }).join("");
    root().innerHTML = '<div class="modal plan-sheet" role="dialog" aria-modal="true" aria-labelledby="plan-title">' +
      '<div class="sheet-grabber" aria-hidden="true"></div>' +
      '<h2 id="plan-title">Plan</h2>' +
      '<ul class="plan-list">' + body + "</ul>" +
      '<details class="disclosure is-quiet"><summary>Not legal advice</summary><div class="disclosure-body"><p class="why-line">' + NS.util.esc(NS.compliance.DISCLAIMER) + "</p></div></details>" +
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
