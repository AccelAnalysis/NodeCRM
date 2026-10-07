(function (NS) {
  "use strict";

  function filler(count) {
    var html = "";
    var i;
    for (i = 0; i < count; i += 1) html += '<div class="cell cell-blank"></div>';
    return html;
  }

  function build(animateId) {
    var state = NS.model.get();
    var stages = state.stages;
    var html = ['<svg id="traces" class="traces" aria-hidden="true"></svg>'];
    html.push('<div class="corner"><p class="caption">Market</p><p class="corner-title">' +
      NS.util.esc(state.market ? (NS.model.marketTitle() || "Untitled market") : "Not set") + "</p></div>");
    stages.forEach(function (stage, index) {
      html.push(NS.stages.headerHTML(stage, index));
    });
    html.push(NS.stages.addCellHTML());

    if (!state.personas.length && !state.segments.length) {
      html.push(NS.personas.startBlockHTML());
      html.push(filler(stages.length + 1));
      return html.join("");
    }

    var grouped = state.segments.map(function (segment) {
      return {
        segment: segment,
        personas: state.personas.filter(function (persona) { return persona.segmentId === segment.id; })
      };
    });

    grouped.forEach(function (group) {
      html.push(NS.personas.segmentHTML(group.segment));
      if (!group.personas.length) {
        html.push('<div class="persona-cell persona-empty"><span>No personas in this segment yet.</span><button type="button" class="text-btn" data-action="open-wizard" data-step="3">Add a persona</button></div>');
        html.push(filler(stages.length + 1));
        return;
      }
      group.personas.forEach(function (persona) {
        html.push(NS.personas.cellHTML(persona));
        stages.forEach(function (stage) {
          html.push(NS.nodes.cellHTML(persona, stage, animateId));
        });
        html.push('<div class="cell cell-blank"></div>');
      });
    });
    html.push(NS.personas.addRowHTML());
    return html.join("");
  }

  function render(meta) {
    var grid = document.getElementById("grid");
    var scroll = document.getElementById("plane-scroll");
    if (!grid || !scroll) return;
    var top = scroll.scrollTop;
    var left = scroll.scrollLeft;
    var count = NS.model.get().stages.length;
    grid.style.gridTemplateColumns = "var(--persona-w) repeat(" + count + ", var(--stage-w)) 88px";
    grid.innerHTML = build(meta && meta.animateNodeId);
    NS.nodes.drawTraces(meta && meta.animateNodeId);
    scroll.scrollTop = top;
    scroll.scrollLeft = left;
  }

  function beginRename(button) {
    var id = button.dataset.stageId;
    var label = button.querySelector(".stage-label");
    var original = label ? label.textContent : "";
    var input = document.createElement("input");
    input.className = "stage-title-input";
    input.value = original;
    input.maxLength = 48;
    input.setAttribute("aria-label", "Stage name");
    button.replaceWith(input);
    input.focus();
    input.select();

    function finish(save, value) {
      if (input.dataset.lock === "1" && save === false) {
        render();
        return;
      }
      input.dataset.lock = "1";
      var next = value != null ? value : input.value;
      if (!save || next.trim() === original) {
        render();
        return;
      }
      var result = NS.model.renameStage(id, next);
      if (!result.ok) {
        input.dataset.lock = "";
        NS.ui.toast(result.error);
        input.focus();
      }
    }

    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        finish(true);
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        input.dataset.lock = "1";
        finish(false);
      }
    });
    input.addEventListener("blur", function () {
      if (input.dataset.lock === "1") return;
      var value = input.value;
      setTimeout(function () {
        if (input.dataset.lock === "1") return;
        finish(true, value);
      }, 0);
    });
  }

  function init() {
    window.addEventListener("resize", NS.util.debounce(function () {
      NS.nodes.drawTraces(null);
    }, 120));
  }

  NS.plane = { render: render, beginRename: beginRename, init: init };
})(window.NodeCRM);
