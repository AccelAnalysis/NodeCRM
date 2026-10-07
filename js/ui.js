(function (NS) {
  "use strict";

  var savedTimer = null;
  var toastTimer = null;

  function toast(message) {
    var el = document.getElementById("toast");
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 3200);
  }

  function noteSaved(meta) {
    if (meta && meta.saved === false) {
      toast("Could not save in this browser.");
      return;
    }
    var pill = document.getElementById("save-pill");
    pill.hidden = false;
    pill.classList.add("is-on");
    clearTimeout(savedTimer);
    savedTimer = setTimeout(function () { pill.classList.remove("is-on"); }, 1400);
  }

  function confirm(options) {
    var root = document.getElementById("confirm");
    root.hidden = false;
    root.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">' +
      '<h2 id="confirm-title">' + NS.util.esc(options.title) + "</h2>" +
      "<p>" + NS.util.esc(options.body) + "</p>" +
      '<div class="modal-actions">' +
      '<button type="button" class="btn btn-ghost" data-cancel>' + NS.util.esc(options.cancelLabel || "Cancel") + "</button>" +
      '<button type="button" class="btn ' + (options.danger ? "btn-danger" : "btn-primary") + '" data-ok>' + NS.util.esc(options.confirmLabel || "Confirm") + "</button>" +
      "</div></div>";
    var ok = root.querySelector("[data-ok]");
    ok.focus();
    return new Promise(function (resolve) {
      function close(value) {
        root.hidden = true;
        root.innerHTML = "";
        resolve(value);
      }
      root.querySelector("[data-ok]").addEventListener("click", function () { close(true); });
      root.querySelector("[data-cancel]").addEventListener("click", function () { close(false); });
      root.addEventListener("click", function (event) {
        if (event.target === root) close(false);
      }, { once: true });
      root.dataset.resolve = "1";
      root._close = close;
    });
  }

  function init() {
    document.getElementById("confirm").addEventListener("keydown", function (event) {
      if (event.key === "Escape" && document.getElementById("confirm")._close) {
        event.stopPropagation();
        document.getElementById("confirm")._close(false);
      }
    });
  }

  function confirmOpen() {
    return !document.getElementById("confirm").hidden;
  }

  NS.ui = {
    init: init,
    toast: toast,
    noteSaved: noteSaved,
    confirm: confirm,
    confirmOpen: confirmOpen
  };
})(window.NodeCRM);
