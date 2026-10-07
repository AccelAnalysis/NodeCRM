(function (NS) {
  "use strict";

  var KEY = "nodecrm.v1";

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object") return null;
      return data;
    } catch (err) {
      return null;
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      return false;
    }
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch (err) { /* private mode */ }
  }

  NS.storage = { KEY: KEY, load: load, save: save, clear: clear };
})(window.NodeCRM);
