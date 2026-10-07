(function (NS) {
  "use strict";

  function uid(prefix) {
    return prefix + "_" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function debounce(fn, ms) {
    var timer;
    return function () {
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(null, args); }, ms);
    };
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(String(value));
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function icon(name) {
    var paths = {
      close: '<path d="M4.5 4.5 L11.5 11.5 M11.5 4.5 L4.5 11.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      plus: '<path d="M8 3.25 V12.75 M3.25 8 H12.75" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
      chevron: '<path d="M6 3.5 L11 8 L6 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
      left: '<path d="M10 3.5 L5 8 L10 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
      right: '<path d="M6 3.5 L11 8 L6 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
      up: '<path d="M4 10.2 L8 5.5 L12 10.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
      down: '<path d="M4 5.8 L8 10.5 L12 5.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
      edit: '<path d="M9.4 3.1 12.9 6.6 6.1 13.4 2.4 13.6 2.6 9.9 Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>'
    };
    return '<svg class="mini-icon" viewBox="0 0 16 16" aria-hidden="true">' + (paths[name] || "") + "</svg>";
  }

  NS.util = { uid: uid, esc: esc, clone: clone, debounce: debounce, cssEscape: cssEscape, icon: icon };
})(window.NodeCRM = window.NodeCRM || {});
