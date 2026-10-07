(function (NS) {
  "use strict";

  var openId = null;
  var hold = false;

  function root() { return document.getElementById("dress"); }

  function persona() {
    return openId ? NS.model.personaById(openId) : null;
  }

  function specOf(person) {
    if (!person) return NS.avatars.blank("b2c");
    if (person.avatar) return NS.avatars.normalize(person.avatar);
    return NS.avatars.normalize(person.avatarSeed || 1);
  }

  function swatches(person, kind) {
    var spec = specOf(person);
    var book = NS.avatars.swatches();
    var colors = kind === "skin" ? book.skins : kind === "hair" ? book.hairs : (spec.formal ? book.formal : book.casual);
    var field = kind === "skin" ? "skin" : kind === "hair" ? "hair" : "attire";
    return colors.map(function (color, index) {
      var on = spec[field] === index;
      return '<button type="button" class="swatch' + (on ? " is-on" : "") + '" style="background:' + color + '" data-action="dress-trait" data-trait="' + field + '" data-value="' + index + '" aria-label="' + kind + " " + (index + 1) + '" aria-pressed="' + (on ? "true" : "false") + '"></button>';
    }).join("");
  }

  function render() {
    var person = persona();
    if (!person) {
      close();
      return;
    }
    var spec = specOf(person);
    var styles = NS.avatars.styles.map(function (label, index) {
      var on = spec.style === index;
      return '<button type="button" class="segmented-btn' + (on ? " is-on" : "") + '" data-action="dress-style" data-value="' + index + '" aria-pressed="' + (on ? "true" : "false") + '">' + label + "</button>";
    }).join("");
    root().innerHTML = '<form class="dress-card" role="dialog" aria-modal="true" aria-label="Edit ' + NS.util.esc(person.name) + '">' +
      '<button type="button" class="icon-btn dress-close" data-action="dress-close" aria-label="Close">' + NS.util.icon("close") + "</button>" +
      '<div class="avatar xl">' + NS.avatars.render(spec) + "</div>" +
      '<input class="dress-name" data-dress-name maxlength="48" aria-label="Name" value="' + NS.util.esc(person.name) + '">' +
      '<input class="dress-role" data-dress-role maxlength="48" aria-label="Role" placeholder="Role" value="' + NS.util.esc(person.role || "") + '">' +
      '<div class="trait-block"><span>Complexion</span><div class="swatches">' + swatches(person, "skin") + "</div></div>" +
      '<div class="trait-block"><span>Hair</span><div class="swatches">' + swatches(person, "hair") + "</div></div>" +
      '<div class="segmented dress-styles" role="radiogroup" aria-label="Hair style">' + styles + "</div>" +
      '<div class="trait-block"><span>' + (spec.formal ? "Jacket" : "Shirt") + '</span><div class="swatches">' + swatches(person, "attire") + "</div></div>" +
      '<div class="dress-switches">' +
      '<label class="check"><input data-action="dress-glasses" type="checkbox"' + (spec.glasses ? " checked" : "") + "> Glasses</label>" +
      '<label class="check"><input data-action="dress-icp" type="checkbox"' + (person.icp ? " checked" : "") + "> Best fit</label>" +
      "</div></form>";
    root().hidden = false;
  }

  function open(id) {
    if (!NS.model.personaById(id)) return;
    openId = id;
    render();
  }

  function close() {
    openId = null;
    var node = root();
    if (!node) return;
    node.hidden = true;
    node.innerHTML = "";
  }

  function isOpen() { return !!openId && root() && !root().hidden; }

  function applyAvatar(patch) {
    var person = persona();
    if (!person) return;
    var next = Object.assign({}, specOf(person), patch);
    next.preset = "";
    hold = true;
    NS.model.updatePersona(person.id, { avatar: next });
    hold = false;
    render();
  }

  function onClick(event) {
    if (event.target === root()) {
      close();
      return;
    }
    var button = event.target.closest("[data-action]");
    if (!button || !openId) return;
    var action = button.dataset.action;
    if (action === "dress-close") {
      close();
      return;
    }
    if (action === "dress-trait") {
      var patch = {};
      patch[button.dataset.trait] = Number(button.dataset.value);
      applyAvatar(patch);
    } else if (action === "dress-style") applyAvatar({ style: Number(button.dataset.value) });
  }

  function onChange(event) {
    var person = persona();
    if (!person) return;
    if (event.target.matches("[data-action='dress-glasses']")) {
      applyAvatar({ glasses: event.target.checked });
      return;
    }
    if (event.target.matches("[data-action='dress-icp']")) {
      hold = true;
      NS.model.updatePersona(person.id, { icp: event.target.checked });
      hold = false;
      render();
      return;
    }
    if (event.target.matches("[data-dress-name]")) {
      NS.model.updatePersona(person.id, { name: event.target.value });
      return;
    }
    if (event.target.matches("[data-dress-role]")) NS.model.updatePersona(person.id, { role: event.target.value });
  }

  function init() {
    var node = root();
    node.addEventListener("click", onClick);
    node.addEventListener("change", onChange);
    node.addEventListener("submit", function (event) { event.preventDefault(); });
    NS.model.subscribe(function () {
      if (openId && !hold) render();
    });
  }

  NS.dress = { init: init, open: open, close: close, isOpen: isOpen };
})(window.NodeCRM);
