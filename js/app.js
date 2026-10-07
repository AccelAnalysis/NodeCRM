(function (NS) {
  "use strict";

  function syncChrome(state) {
    document.getElementById("market-label").textContent = state.market ? (NS.model.marketTitle() || "Untitled market") : "No market yet";
    document.getElementById("btn-personas").hidden = !state.market;
  }

  function onState(state, meta) {
    meta = meta || {};
    syncChrome(state);
    NS.ui.noteSaved(meta);
    if (NS.comms.isOpen() && !state.nodes.some(function (node) { return node.id === NS.comms.currentId(); })) {
      NS.comms.close();
    }
    if (meta.render === "none") {
      if (meta.nodeId) NS.nodes.refreshBubble(meta.nodeId);
      var summary = document.getElementById("comms-summary");
      var node = meta.nodeId && NS.model.findNode(meta.nodeId);
      if (summary && node) summary.textContent = NS.model.summary(node);
      return;
    }
    if (meta.render === "node") {
      if (meta.nodeId) NS.nodes.refreshBubble(meta.nodeId);
      NS.comms.sync(meta);
      return;
    }
    if (meta.render === "channels") {
      NS.channels.sync(meta);
      return;
    }
    NS.plane.render(meta);
    if (meta.render === "both") NS.channels.sync(meta);
    if (meta.animateNodeId) NS.comms.openAfterMotion(meta.animateNodeId);
    if (NS.comms.isOpen()) NS.comms.refreshHeading();
  }

  async function removeStage(id) {
    var stage = NS.model.stageById(id);
    if (!stage) return;
    var count = NS.model.get().nodes.filter(function (node) { return node.stageId === id; }).length;
    var ok = await NS.ui.confirm({
      title: "Remove " + stage.name + "?",
      body: count
        ? count + " node" + (count === 1 ? "" : "s") + " on this stage will be deleted."
        : "This stage will leave the plane.",
      confirmLabel: "Remove stage",
      danger: true
    });
    if (ok) NS.model.removeStage(id);
  }

  async function removePersona(id) {
    var persona = NS.model.personaById(id);
    if (!persona) return;
    var count = NS.model.get().nodes.filter(function (node) { return node.personaId === id; }).length;
    var ok = await NS.ui.confirm({
      title: "Remove " + persona.name + "?",
      body: count
        ? "Their row and " + count + " node" + (count === 1 ? "" : "s") + " will be deleted."
        : "Their row will leave the plane.",
      confirmLabel: "Remove persona",
      danger: true
    });
    if (ok) NS.model.removePersona(id);
  }

  async function sample() {
    if (!NS.model.isPristine()) {
      var ok = await NS.ui.confirm({
        title: "Load the sample market?",
        body: "This replaces the workspace stored in this browser.",
        confirmLabel: "Load sample"
      });
      if (!ok) return;
    }
    NS.comms.close();
    NS.channels.close();
    NS.wizard.close();
    if (NS.plan) NS.plan.close();
    NS.demo.load();
    NS.ui.toast("Sample market is on the plane. Email still needs a consent check before it counts as ready.");
  }

  async function reset() {
    if (NS.model.isPristine()) {
      NS.ui.toast("The plane is already empty.");
      return;
    }
    var ok = await NS.ui.confirm({
      title: "Clear this workspace?",
      body: "Market, personas, stages, nodes, and the channel map will be removed from this browser.",
      confirmLabel: "Clear workspace",
      danger: true
    });
    if (!ok) return;
    NS.comms.close();
    NS.channels.close();
    NS.wizard.close();
    if (NS.plan) NS.plan.close();
    NS.model.reset();
    NS.ui.toast("Workspace cleared.");
  }

  function handle(el) {
    var action = el.dataset.action;
    if (action === "open-wizard") NS.wizard.open(el.dataset.step || 1);
    else if (action === "open-map") NS.channels.open();
    else if (action === "create-node") {
      var existing = NS.model.nodeAt(el.dataset.personaId, el.dataset.stageId);
      if (existing) NS.comms.open(existing.id);
      else NS.model.createNode(el.dataset.personaId, el.dataset.stageId);
    } else if (action === "open-node") NS.comms.open(el.dataset.nodeId);
    else if (action === "rename-stage") NS.plane.beginRename(el);
    else if (action === "move-stage") NS.model.moveStage(el.dataset.stageId, Number(el.dataset.dir));
    else if (action === "remove-stage") removeStage(el.dataset.stageId);
    else if (action === "add-stage") NS.stages.openPopover(el);
    else if (action === "remove-persona") removePersona(el.dataset.personaId);
    else if (action === "sample") sample();
    else if (action === "reset") reset();
    else if (action === "check-plan") NS.plan.open();
  }

  function boot() {
    NS.model.init();
    NS.ui.init();
    NS.stages.init();
    NS.plane.init();
    NS.wizard.init();
    NS.comms.init();
    NS.channels.init();
    NS.plan.init();
    NS.model.subscribe(onState);
    syncChrome(NS.model.get());
    NS.plane.render();
    document.addEventListener("click", function (event) {
      var inside = event.target.closest("#wizard, #comms, #channel-map, #confirm, #plan, #stage-popover");
      if (!event.target.closest("#stage-popover")) NS.stages.closePopover();
      if (inside) return;
      var el = event.target.closest("[data-action]");
      if (!el) return;
      handle(el);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (NS.ui.confirmOpen()) return;
      if (NS.plan.isOpen()) NS.plan.close();
      else if (NS.comms.isOpen()) NS.comms.close();
      else if (NS.wizard.isOpen()) NS.wizard.close();
      else if (NS.channels.isOpen()) NS.channels.close();
      else NS.stages.closePopover();
    });
    document.documentElement.dataset.ready = "1";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window.NodeCRM);
