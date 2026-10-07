(function (NS) {
  "use strict";

  // Centers are approximate. Circles sketch a region; they are not official borders.
  // Drive time uses a straight line at 25 mph because this prototype has no road-network key.
  var MPH = 25;
  var GAZETTEER = [
    ["Alabama", 32.78, -86.83, 150],
    ["Alaska", 64.07, -152.28, 400],
    ["Arizona", 34.27, -111.66, 180],
    ["Arkansas", 34.89, -92.44, 140],
    ["California", 37.18, -119.47, 270],
    ["Colorado", 39.00, -105.55, 180],
    ["Connecticut", 41.62, -72.73, 50],
    ["Delaware", 38.99, -75.51, 40],
    ["District of Columbia", 38.91, -77.01, 12],
    ["Florida", 28.63, -82.45, 220],
    ["Georgia", 32.64, -83.44, 160],
    ["Hawaii", 20.29, -156.37, 80],
    ["Idaho", 44.35, -114.61, 180],
    ["Illinois", 40.04, -89.20, 160],
    ["Indiana", 39.91, -86.28, 120],
    ["Iowa", 42.07, -93.50, 150],
    ["Kansas", 38.49, -98.38, 180],
    ["Kentucky", 37.53, -85.30, 140],
    ["Louisiana", 31.07, -92.00, 150],
    ["Maine", 45.37, -69.24, 140],
    ["Maryland", 39.06, -76.80, 80],
    ["Massachusetts", 42.26, -71.81, 70],
    ["Michigan", 44.35, -85.41, 180],
    ["Minnesota", 46.28, -94.31, 180],
    ["Mississippi", 32.74, -89.67, 140],
    ["Missouri", 38.36, -92.46, 160],
    ["Montana", 47.05, -109.63, 220],
    ["Nebraska", 41.54, -99.80, 180],
    ["Nevada", 39.33, -116.63, 200],
    ["New Hampshire", 43.68, -71.58, 60],
    ["New Jersey", 40.19, -74.67, 60],
    ["New Mexico", 34.41, -106.11, 180],
    ["New York", 42.95, -75.53, 160],
    ["North Carolina", 35.56, -79.39, 160],
    ["North Dakota", 47.45, -100.47, 160],
    ["Ohio", 40.29, -82.79, 130],
    ["Oklahoma", 35.59, -97.49, 160],
    ["Oregon", 43.93, -120.56, 180],
    ["Pennsylvania", 40.88, -77.80, 150],
    ["Rhode Island", 41.68, -71.56, 25],
    ["South Carolina", 33.92, -80.90, 120],
    ["South Dakota", 44.44, -100.23, 160],
    ["Tennessee", 35.86, -86.35, 150],
    ["Texas", 31.48, -99.33, 280],
    ["Utah", 39.32, -111.09, 150],
    ["Vermont", 44.07, -72.67, 55],
    ["Virginia", 37.52, -78.85, 150],
    ["Washington", 47.38, -120.45, 160],
    ["West Virginia", 38.64, -80.62, 100],
    ["Wisconsin", 44.62, -89.99, 150],
    ["Wyoming", 43.00, -107.55, 170]
  ];

  function milesForDrive(minutes) {
    var mins = Number(minutes) || 30;
    return Math.max(1, Math.round((mins / 60) * MPH));
  }

  function normalizePlace(raw) {
    if (!raw) return null;
    var lat = Number(raw.lat);
    var lng = Number(raw.lng);
    var hasPoint = Number.isFinite(lat) && Number.isFinite(lng);
    var kind = raw.kind === "pin" ? "pin" : "region";
    var coverage = raw.coverage === "drive" ? "drive" : "radius";
    var minutes = [15, 30, 45, 60].indexOf(Number(raw.driveMinutes)) >= 0 ? Number(raw.driveMinutes) : 30;
    var radius = Number(raw.radiusMiles);
    if (!Number.isFinite(radius) || radius < 1) radius = kind === "pin" ? (coverage === "drive" ? milesForDrive(minutes) : 25) : 40;
    radius = Math.max(1, Math.min(800, Math.round(radius)));
    var label = String(raw.label || "").trim();
    if (!label) label = kind === "pin" ? "Dropped pin" : "Region";
    if (!hasPoint && kind === "pin") return null;
    return {
      id: String(raw.id || NS.util.uid("geo")),
      kind: kind,
      label: label.slice(0, 80),
      lat: hasPoint ? Math.round(lat * 1000) / 1000 : null,
      lng: hasPoint ? Math.round(lng * 1000) / 1000 : null,
      coverage: kind === "pin" ? coverage : "radius",
      radiusMiles: radius,
      driveMinutes: minutes
    };
  }

  function normalizePlaces(list) {
    if (!Array.isArray(list)) return [];
    return list.map(normalizePlace).filter(Boolean).slice(0, 12);
  }

  function phrase(place) {
    if (place.kind === "region") return place.label;
    if (place.coverage === "drive") {
      return place.label + " (about a " + place.driveMinutes + "-minute drive)";
    }
    return place.label + " (within " + place.radiusMiles + " miles)";
  }

  function summary(geo) {
    var places = normalizePlaces(geo && geo.places);
    if (!places.length) return "";
    var bits = places.map(phrase);
    var sentence = bits.length === 1 ? bits[0] : bits.slice(0, -1).join(", ") + " and " + bits[bits.length - 1];
    return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
  }

  function localMatches(query) {
    var q = String(query || "").trim().toLowerCase();
    if (q.length < 2) return [];
    return GAZETTEER.filter(function (row) {
      return row[0].toLowerCase().indexOf(q) !== -1;
    }).slice(0, 6).map(function (row) {
      return { label: row[0], lat: row[1], lng: row[2], radiusMiles: row[3], source: "list" };
    });
  }

  function bboxRadius(bbox) {
    if (!bbox || bbox.length < 4) return 25;
    var south = Number(bbox[0]);
    var north = Number(bbox[1]);
    var west = Number(bbox[2]);
    var east = Number(bbox[3]);
    if (![south, north, west, east].every(Number.isFinite)) return 25;
    var mid = ((south + north) / 2) * Math.PI / 180;
    var dy = Math.abs(north - south) * 69;
    var dx = Math.abs(east - west) * 69 * Math.cos(mid);
    return Math.max(8, Math.min(500, Math.round(Math.max(dx, dy) / 2)));
  }

  function attach(container, draft) {
    if (!container) return { destroy: function () {} };
    var mapEl = container.querySelector("[data-geo-map]");
    var resultsEl = container.querySelector("[data-geo-results]");
    var chipsEl = container.querySelector("[data-geo-chips]");
    var summaryEl = container.querySelector("[data-geo-summary]");
    var searchEl = container.querySelector("[data-geo-search]");
    var map = null;
    var layer = null;
    var timer = null;
    var destroyed = false;
    var remote = [];

    function places() {
      draft.market.geo = draft.market.geo || { places: [] };
      draft.market.geo.places = normalizePlaces(draft.market.geo.places);
      return draft.market.geo.places;
    }

    function paintSummary() {
      var text = summary(draft.market.geo);
      if (summaryEl) {
        summaryEl.hidden = !text;
        summaryEl.textContent = text || "";
      }
    }

    function paintChips() {
      if (!chipsEl) return;
      var items = places();
      if (!items.length) {
        chipsEl.innerHTML = "";
        paintSummary();
        draw();
        return;
      }
      chipsEl.innerHTML = items.map(function (place) {
        var meta = place.kind === "region"
          ? "Region"
          : (place.coverage === "drive" ? place.driveMinutes + " min sketch" : place.radiusMiles + " miles");
        return '<span class="place-chip"><span>' + NS.util.esc(place.label) + '</span><small>' + meta + '</small>' +
          '<button type="button" class="icon-btn" data-geo-remove="' + NS.util.esc(place.id) + '" aria-label="Remove ' + NS.util.esc(place.label) + '">' + NS.util.icon("close") + "</button></span>";
      }).join("");
      paintSummary();
      draw();
    }

    function draw() {
      if (!map || !window.L) return;
      if (layer) layer.remove();
      layer = window.L.layerGroup().addTo(map);
      var bounds = [];
      places().forEach(function (place) {
        if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return;
        var latlng = [place.lat, place.lng];
        bounds.push(latlng);
        window.L.circleMarker(latlng, {
          radius: place.kind === "pin" ? 7 : 5,
          color: "#0c6e66",
          weight: 2,
          fillColor: "#0c6e66",
          fillOpacity: 0.9
        }).addTo(layer);
        var miles = place.kind === "pin" && place.coverage === "drive" ? milesForDrive(place.driveMinutes) : place.radiusMiles;
        window.L.circle(latlng, {
          radius: miles * 1609.34,
          color: "#0c6e66",
          weight: place.coverage === "drive" ? 1.5 : 1.25,
          dashArray: place.coverage === "drive" ? "6 6" : null,
          fillColor: "#0c6e66",
          fillOpacity: place.kind === "pin" ? 0.14 : 0.08
        }).addTo(layer);
      });
      if (bounds.length === 1) map.setView(bounds[0], 7);
      else if (bounds.length > 1) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 8 });
    }

    function addPlace(partial) {
      var next = normalizePlace(Object.assign({ id: NS.util.uid("geo") }, partial));
      if (!next) return;
      var items = places();
      var dup = items.some(function (place) {
        return place.label.toLowerCase() === next.label.toLowerCase() && place.kind === next.kind;
      });
      if (dup) {
        NS.ui.toast(next.label + " is already on the map.");
        return;
      }
      if (items.length >= 12) {
        NS.ui.toast("Twelve places is enough for this sketch.");
        return;
      }
      items.push(next);
      if (searchEl) searchEl.value = "";
      remote = [];
      paintResults();
      paintChips();
    }

    function paintResults() {
      if (!resultsEl || !searchEl) return;
      var query = searchEl.value.trim();
      var local = localMatches(query);
      var rows = local.map(function (item) {
        return '<button type="button" data-geo-add="region" data-label="' + NS.util.esc(item.label) + '" data-lat="' + item.lat + '" data-lng="' + item.lng + '" data-radius="' + item.radiusMiles + '">' +
          NS.util.esc(item.label) + "<span>Add this state</span></button>";
      });
      remote.forEach(function (item) {
        rows.push('<button type="button" data-geo-add="region" data-label="' + NS.util.esc(item.label) + '" data-lat="' + item.lat + '" data-lng="' + item.lng + '" data-radius="' + item.radiusMiles + '">' +
          NS.util.esc(item.label) + "<span>Add as a region</span></button>");
        rows.push('<button type="button" data-geo-add="pin" data-label="' + NS.util.esc(item.label) + '" data-lat="' + item.lat + '" data-lng="' + item.lng + '" data-radius="25">' +
          NS.util.esc(item.label) + "<span>Drop a pin here</span></button>");
      });
      resultsEl.innerHTML = rows.join("");
      resultsEl.hidden = !rows.length;
    }

    function searchRemote(query) {
      if (query.trim().length < 3) {
        remote = [];
        paintResults();
        return;
      }
      var url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=4&q=" + encodeURIComponent(query.trim());
      fetch(url, { headers: { Accept: "application/json" } }).then(function (response) {
        if (!response.ok) throw new Error("search failed");
        return response.json();
      }).then(function (data) {
        if (destroyed || !searchEl || searchEl.value.trim() !== query.trim()) return;
        remote = (data || []).map(function (item) {
          return {
            label: item.display_name.split(",").slice(0, 2).join(",").trim(),
            lat: Number(item.lat),
            lng: Number(item.lon),
            radiusMiles: bboxRadius(item.boundingbox)
          };
        }).filter(function (item) { return Number.isFinite(item.lat) && Number.isFinite(item.lng); });
        paintResults();
      }).catch(function () {
        remote = [];
        paintResults();
      });
    }

    function selectedPin() {
      var pins = places().filter(function (place) { return place.kind === "pin"; });
      return pins[pins.length - 1] || null;
    }

    function paintPinControls() {
      var box = container.querySelector("[data-geo-pin]");
      if (!box) return;
      var pin = selectedPin();
      if (!pin) {
        box.hidden = true;
        box.innerHTML = "";
        return;
      }
      box.hidden = false;
      var radius = pin.coverage === "drive" ? milesForDrive(pin.driveMinutes) : pin.radiusMiles;
      var minutes = [15, 30, 45, 60].map(function (value) {
        return '<button type="button" class="chip' + (pin.driveMinutes === value ? " is-on" : "") + '" data-geo-minutes="' + value + '">' + value + " min</button>";
      }).join("");
      box.innerHTML = '<div class="segmented" role="radiogroup" aria-label="How wide is the pin">' +
        '<button type="button" class="segmented-btn' + (pin.coverage !== "drive" ? " is-on" : "") + '" data-geo-coverage="radius">Miles</button>' +
        '<button type="button" class="segmented-btn' + (pin.coverage === "drive" ? " is-on" : "") + '" data-geo-coverage="drive">Drive time</button></div>' +
        (pin.coverage === "drive"
          ? '<div class="chip-row">' + minutes + '</div><details class="disclosure is-quiet"><summary>Why?</summary><div class="disclosure-body"><p class="why-line">' + pin.driveMinutes + " min is drawn as " + radius + " miles, straight line.</p></div></details>"
          : '<label class="slider-label"><strong>' + pin.radiusMiles + ' miles</strong><input data-geo-radius type="range" min="5" max="150" step="5" value="' + pin.radiusMiles + '" aria-label="Radius in miles"></label>');
    }

    if (mapEl && window.L) {
      map = window.L.map(mapEl, { scrollWheelZoom: false, attributionControl: true }).setView([39.8, -98.6], 4);
      window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);
      map.on("click", function (event) {
        var lat = event.latlng.lat;
        var lng = event.latlng.lng;
        var place = {
          kind: "pin",
          label: "Dropped pin",
          lat: lat,
          lng: lng,
          coverage: "radius",
          radiusMiles: 25,
          driveMinutes: 30
        };
        addPlace(place);
        var added = places()[places().length - 1];
        fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" + lat + "&lon=" + lng, {
          headers: { Accept: "application/json" }
        }).then(function (response) { return response.ok ? response.json() : null; }).then(function (data) {
          if (destroyed || !data || !added) return;
          var name = data.display_name ? data.display_name.split(",").slice(0, 2).join(",").trim() : "";
          if (!name) return;
          if (added.label === "Dropped pin") added.label = name;
          paintChips();
          paintPinControls();
        }).catch(function () {});
      });
      requestAnimationFrame(function () { if (map) map.invalidateSize(); });
    } else if (mapEl) {
      mapEl.innerHTML = '<p class="geo-fallback">The map did not load. You can still add a state from the search box.</p>';
    }

    container.addEventListener("click", function (event) {
      var add = event.target.closest("[data-geo-add]");
      if (add && container.contains(add)) {
        addPlace({
          kind: add.dataset.geoAdd === "pin" ? "pin" : "region",
          label: add.dataset.label,
          lat: Number(add.dataset.lat),
          lng: Number(add.dataset.lng),
          radiusMiles: Number(add.dataset.radius) || 25,
          coverage: "radius",
          driveMinutes: 30
        });
        paintPinControls();
        return;
      }
      var remove = event.target.closest("[data-geo-remove]");
      if (remove && container.contains(remove)) {
        draft.market.geo.places = places().filter(function (place) { return place.id !== remove.dataset.geoRemove; });
        paintChips();
        paintPinControls();
        return;
      }
      var coverage = event.target.closest("[data-geo-coverage]");
      if (coverage && container.contains(coverage)) {
        var pin = selectedPin();
        if (!pin) return;
        pin.coverage = coverage.dataset.geoCoverage === "drive" ? "drive" : "radius";
        if (pin.coverage === "drive") pin.radiusMiles = milesForDrive(pin.driveMinutes);
        paintChips();
        paintPinControls();
        return;
      }
      var minutes = event.target.closest("[data-geo-minutes]");
      if (minutes && container.contains(minutes)) {
        var drivePin = selectedPin();
        if (!drivePin) return;
        drivePin.coverage = "drive";
        drivePin.driveMinutes = Number(minutes.dataset.geoMinutes);
        drivePin.radiusMiles = milesForDrive(drivePin.driveMinutes);
        paintChips();
        paintPinControls();
      }
    });

    container.addEventListener("input", function (event) {
      if (event.target === searchEl) {
        clearTimeout(timer);
        var query = searchEl.value;
        paintResults();
        timer = setTimeout(function () { searchRemote(query); }, 450);
        return;
      }
      if (event.target.matches("[data-geo-radius]")) {
        var pin = selectedPin();
        if (!pin) return;
        pin.coverage = "radius";
        pin.radiusMiles = Number(event.target.value);
        var strong = container.querySelector(".slider-label strong");
        if (strong) strong.textContent = pin.radiusMiles + " miles";
        paintSummary();
        draw();
        if (chipsEl) {
          var small = chipsEl.querySelector("[data-geo-remove='" + NS.util.cssEscape(pin.id) + "']");
          var chip = small && small.parentNode.querySelector("small");
          if (chip) chip.textContent = pin.radiusMiles + " miles";
        }
      }
    });

    paintChips();
    paintPinControls();

    return {
      destroy: function () {
        destroyed = true;
        clearTimeout(timer);
        if (map) {
          map.remove();
          map = null;
        }
      },
      refresh: function () {
        paintChips();
        paintPinControls();
        if (map) map.invalidateSize();
      }
    };
  }

  function shell() {
    return '<div data-geo class="geo">' +
      '<label>Search a state or place<input data-geo-search data-testid="geo-search" type="text" maxlength="80" placeholder="Texas, or a city" autocomplete="off"></label>' +
      '<div class="geo-results" data-geo-results hidden></div>' +
      '<div class="geo-map" data-geo-map data-testid="geo-map" role="application" aria-label="Market map"></div>' +
      '<div data-geo-pin hidden></div>' +
      '<div class="chip-row" data-geo-chips></div>' +
      '<p class="geo-summary" data-geo-summary></p>' +
      "</div>";
  }

  NS.geo = {
    MPH: MPH,
    normalizePlaces: normalizePlaces,
    summary: summary,
    milesForDrive: milesForDrive,
    attach: attach,
    shell: shell,
    localMatches: localMatches
  };
})(window.NodeCRM);
