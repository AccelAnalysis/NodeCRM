(function (NS) {
  "use strict";

  // General recommended pipeline. Labels are a starting set, not a fixed vocabulary.
  // Stage 4 is Service: where the company delivers the offering. Rename freely.
  var RECOMMENDED = [
    { name: "Awareness", kind: "awareness", blurb: "Where attention first shows up" },
    { name: "Consideration", kind: "standard", blurb: "Where people weigh the fit" },
    { name: "Enrollment", kind: "standard", blurb: "Where they commit" },
    { name: "Service", kind: "standard", blurb: "Where you deliver the offering" },
    { name: "Loyalty", kind: "standard", blurb: "Where trust compounds" },
    { name: "Recurring Relationships", kind: "standard", blurb: "Where the work continues" },
    { name: "Advocacy", kind: "standard", blurb: "Where they bring others in" }
  ];

  function pencil() {
    return NS.util.icon("edit");
  }

  function headerHTML(stage, index, editing) {
    var count = NS.model.advancedCount(stage.id);
    var tools = "";
    if (stage.kind !== "awareness") {
      tools = '<div class="stage-tools">' +
        '<button type="button" class="icon-btn" data-action="move-stage" data-stage-id="' + stage.id + '" data-dir="-1" aria-label="Move ' + NS.util.esc(stage.name) + ' left"' + (index <= 1 ? " disabled" : "") + ">" + NS.util.icon("left") + "</button>" +
        '<button type="button" class="icon-btn" data-action="move-stage" data-stage-id="' + stage.id + '" data-dir="1" aria-label="Move ' + NS.util.esc(stage.name) + ' right"' + (index === NS.model.get().stages.length - 1 ? " disabled" : "") + ">" + NS.util.icon("right") + "</button>" +
        '<button type="button" class="icon-btn" data-action="remove-stage" data-stage-id="' + stage.id + '" aria-label="Remove ' + NS.util.esc(stage.name) + '">' + NS.util.icon("close") + "</button>" +
        "</div>";
    }
    var title = '<button type="button" class="stage-title" data-action="rename-stage" data-stage-id="' + stage.id + '" aria-label="Rename ' + NS.util.esc(stage.name) + '">' +
      '<span class="stage-label">' + NS.util.esc(stage.name) + "</span>" + pencil() + "</button>";
    var event = NS.registry.eventById(stage.advanceOn);
    var trigger = '<button type="button" class="advance-chip' + (event ? " is-set" : "") + '" data-action="open-trigger" data-stage-id="' + stage.id + '" aria-haspopup="menu" aria-label="When people enter ' + NS.util.esc(stage.name) + '">' +
      (event ? NS.util.esc(event.label) : "When") + "</button>";
    var extra = stage.kind === "awareness"
      ? '<button type="button" class="map-link" data-action="open-map">Channel map</button>'
      : trigger;
    var badge = count ? '<span class="count-pill" title="People moved here from the channel map">' + count + "</span>" : "";
    return '<div class="stage-head' + (stage.kind === "awareness" ? " is-awareness" : "") + '" data-stage-id="' + stage.id + '" data-testid="' + (stage.kind === "awareness" ? "stage-awareness" : "stage") + '">' +
      tools + title + extra + badge + "</div>";
  }

  function addCellHTML() {
    return '<div class="stage-add"><button type="button" class="add-stage" data-action="add-stage" data-testid="add-stage" aria-label="Add stage">' + NS.util.icon("plus") + "</button></div>";
  }

  function renderPopover(pop) {
    var names = RECOMMENDED.map(function (stage) { return NS.util.esc(stage.name); }).join(" · ");
    pop.innerHTML = '<form id="add-stage-form">' +
      "<label>Name<input name='name' maxlength='48' required placeholder='Name' autocomplete='off' aria-label='Stage name'></label>" +
      '<p class="form-error" data-error hidden></p>' +
      '<button type="submit" class="btn btn-primary">Add</button>' +
      "</form>" +
      '<div class="popover-divider"></div>' +
      '<p class="suggest-line">' + names + "</p>" +
      '<button type="button" class="btn btn-tinted btn-block" data-action="apply-recommended" data-testid="apply-recommended">Use these 7</button>';
  }

  function openPopover(anchor) {
    var pop = document.getElementById("stage-popover");
    renderPopover(pop);
    pop.hidden = false;
    var rect = anchor.getBoundingClientRect();
    var width = Math.min(340, window.innerWidth - 24);
    var left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    var top = rect.bottom + 8;
    pop.style.left = left + "px";
    pop.style.top = top + "px";
    var popHeight = pop.offsetHeight;
    if (top + popHeight > window.innerHeight - 12) {
      top = Math.max(12, rect.top - popHeight - 8);
      pop.style.top = top + "px";
    }
    var input = pop.querySelector("input");
    if (input) input.focus();
  }

  function closePopover() {
    var pop = document.getElementById("stage-popover");
    if (pop) pop.hidden = true;
  }

  function closeTrigger() {
    var menu = document.getElementById("trigger-menu");
    if (!menu) return;
    menu.hidden = true;
    menu.innerHTML = "";
  }

  function openTrigger(anchor) {
    var stage = NS.model.stageById(anchor.dataset.stageId);
    var menu = document.getElementById("trigger-menu");
    if (!stage || !menu) return;
    closePopover();
    var items = '<button type="button" class="menu-item' + (stage.advanceOn ? "" : " is-on") + '" role="menuitemradio" data-action="set-trigger" data-stage-id="' + stage.id + '" data-event="" aria-checked="' + (stage.advanceOn ? "false" : "true") + '">None</button>';
    NS.registry.stageEvents.forEach(function (event) {
      var on = stage.advanceOn === event.id;
      items += '<button type="button" class="menu-item' + (on ? " is-on" : "") + '" role="menuitemradio" data-action="set-trigger" data-stage-id="' + stage.id + '" data-event="' + event.id + '" aria-checked="' + (on ? "true" : "false") + '">' + NS.util.esc(event.label) + "</button>";
    });
    menu.innerHTML = '<div class="menu" role="menu" aria-label="Advance when">' + items + "</div>";
    menu.hidden = false;
    var rect = anchor.getBoundingClientRect();
    var width = Math.min(220, window.innerWidth - 24);
    var left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    var top = rect.bottom + 6;
    menu.style.left = left + "px";
    menu.style.top = top + "px";
    menu.style.width = width + "px";
    if (top + menu.offsetHeight > window.innerHeight - 12) {
      menu.style.top = Math.max(12, rect.top - menu.offsetHeight - 6) + "px";
    }
  }

  function showError(message) {
    var error = document.querySelector("#stage-popover [data-error]");
    if (!error) return;
    error.hidden = !message;
    error.textContent = message || "";
  }

  async function applyRecommended() {
    var plan = NS.model.planRecommended(RECOMMENDED);
    if (plan.already) {
      NS.ui.toast("Those stages are already on the plane. Rename any label you want.");
      closePopover();
      return;
    }
    if (plan.renames || plan.dropped.length) {
      var lines = ["Stage names will match the recommended pipeline. Nodes stay on columns that remain."];
      if (plan.dropped.length) {
        lines.push("Removed: " + plan.dropped.map(function (stage) { return stage.name; }).join(", ") + ".");
        if (plan.nodeLoss) lines.push(plan.nodeLoss + " node" + (plan.nodeLoss === 1 ? "" : "s") + " on removed stages will be deleted.");
      }
      var ok = await NS.ui.confirm({
        title: "Use the recommended 7 stages?",
        body: lines.join(" "),
        confirmLabel: "Apply stages"
      });
      if (!ok) return;
    }
    NS.model.applyRecommended(RECOMMENDED);
    closePopover();
    NS.ui.toast("Stages updated.");
  }

  function init() {
    var pop = document.getElementById("stage-popover");
    pop.addEventListener("submit", function (event) {
      event.preventDefault();
      var data = new FormData(event.target);
      var result = NS.model.addStage(data.get("name"));
      if (!result.ok) {
        showError(result.error);
        return;
      }
      closePopover();
    });
    pop.addEventListener("click", function (event) {
      var button = event.target.closest("[data-action='apply-recommended']");
      if (!button) return;
      applyRecommended();
    });
    var menu = document.getElementById("trigger-menu");
    menu.addEventListener("click", function (event) {
      var button = event.target.closest("[data-action='set-trigger']");
      if (!button) return;
      NS.model.setAdvance(button.dataset.stageId, button.dataset.event || "");
      closeTrigger();
    });
  }

  NS.stages = {
    RECOMMENDED: RECOMMENDED,
    headerHTML: headerHTML,
    addCellHTML: addCellHTML,
    openPopover: openPopover,
    closePopover: closePopover,
    openTrigger: openTrigger,
    closeTrigger: closeTrigger,
    init: init
  };
})(window.NodeCRM);
