(function (NS) {
  "use strict";

  var SKINS = ["#F3E4D8", "#E6C6AE", "#C99578", "#8C6048", "#5C4034", "#3E2C24"];
  var HAIRS = ["#2C2826", "#4A3A30", "#6B4534", "#A15E40", "#C4A56E", "#8A8C90", "#2C3848"];
  var CASUAL = ["#3C6E68", "#3E5870", "#6A5348", "#445C4C", "#5A5168", "#6A5C42"];
  var FORMAL = ["#243044", "#1E3A36", "#3A2E38", "#2C3340", "#3E3428", "#1C2A33"];
  var STYLES = ["Crop", "Side part", "Long", "Bun", "Curly", "Sweep"];

  var PRESETS = {
    b2c: [
      { id: "neighbor", label: "Neighbor", skin: 1, hair: 2, style: 1, attire: 0, glasses: false, formal: false },
      { id: "parent", label: "Parent", skin: 2, hair: 1, style: 2, attire: 1, glasses: false, formal: false },
      { id: "student", label: "Student", skin: 0, hair: 4, style: 4, attire: 2, glasses: false, formal: false },
      { id: "retiree", label: "Retiree", skin: 1, hair: 5, style: 0, attire: 3, glasses: true, formal: false },
      { id: "creator", label: "Creator", skin: 3, hair: 3, style: 5, attire: 4, glasses: false, formal: false },
      { id: "athlete", label: "Athlete", skin: 4, hair: 0, style: 1, attire: 5, glasses: false, formal: false }
    ],
    b2b: [
      { id: "founder", label: "Founder", skin: 2, hair: 0, style: 1, attire: 0, glasses: false, formal: true },
      { id: "operator", label: "Operator", skin: 1, hair: 1, style: 0, attire: 1, glasses: false, formal: true },
      { id: "buyer", label: "Buyer", skin: 3, hair: 2, style: 2, attire: 2, glasses: true, formal: true },
      { id: "advisor", label: "Advisor", skin: 4, hair: 5, style: 0, attire: 3, glasses: true, formal: true },
      { id: "specialist", label: "Specialist", skin: 0, hair: 4, style: 4, attire: 4, glasses: false, formal: true },
      { id: "executive", label: "Executive", skin: 5, hair: 6, style: 1, attire: 5, glasses: false, formal: true }
    ]
  };

  function rng(seed) {
    var x = (Number(seed) || 1) >>> 0 || 1;
    return function () {
      x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
      return x / 4294967296;
    };
  }

  function clamp(value, length) {
    var n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(length - 1, Math.floor(n));
  }

  function blank(audience) {
    var list = PRESETS[audience === "b2b" ? "b2b" : "b2c"];
    return Object.assign({}, list[0]);
  }

  function fromSeed(seed) {
    var random = rng(seed);
    return {
      preset: "",
      skin: Math.floor(random() * SKINS.length),
      hair: Math.floor(random() * HAIRS.length),
      style: Math.floor(random() * STYLES.length),
      attire: Math.floor(random() * CASUAL.length),
      glasses: random() > 0.72,
      formal: false,
      seed: Number(seed) || 1
    };
  }

  function normalize(input) {
    if (input && typeof input === "object") {
      var formal = !!input.formal;
      return {
        preset: String(input.preset || ""),
        skin: clamp(input.skin, SKINS.length),
        hair: clamp(input.hair, HAIRS.length),
        style: clamp(input.style, STYLES.length),
        attire: clamp(input.attire, formal ? FORMAL.length : CASUAL.length),
        glasses: !!input.glasses,
        formal: formal,
        seed: Number(input.seed) || hash(input)
      };
    }
    return fromSeed(input);
  }

  function hash(spec) {
    var n = 1 + ((Number(spec.skin) || 0) * 17 + (Number(spec.hair) || 0) * 13 + (Number(spec.style) || 0) * 7 + (spec.glasses ? 11 : 0));
    return (n % 9000) || 1;
  }

  function hairBack(style, hair) {
    if (style === 2) {
      return '<path d="M22 48 C16 72 18 90 26 96 H18 C8 76 12 52 22 40 Z" fill="' + hair + '"/>' +
        '<path d="M58 48 C64 72 62 90 54 96 H62 C72 76 68 52 58 40 Z" fill="' + hair + '"/>';
    }
    if (style === 3) return '<circle cx="40" cy="18" r="8" fill="' + hair + '"/>';
    return "";
  }

  function hairFront(style, hair) {
    if (style === 0) return '<ellipse cx="40" cy="28" rx="16" ry="8" fill="' + hair + '"/>';
    if (style === 1) return '<path d="M23 42 C24 20 56 20 57 42 C52 30 46 26 40 26 C34 26 28 30 23 42 Z" fill="' + hair + '"/>';
    if (style === 2) return '<path d="M24 40 C26 22 54 22 56 40 C50 30 45 27 40 27 C35 27 30 30 24 40 Z" fill="' + hair + '"/>';
    if (style === 3) return '<ellipse cx="40" cy="27" rx="15" ry="7" fill="' + hair + '"/>';
    if (style === 4) return '<g fill="' + hair + '"><circle cx="28" cy="30" r="7"/><circle cx="40" cy="23" r="8"/><circle cx="52" cy="30" r="7"/></g>';
    return '<path d="M22 38 C30 18 60 24 58 40 C46 28 34 26 22 36 Z" fill="' + hair + '"/>';
  }

  function clothes(formal, color, skin) {
    if (!formal) {
      return '<path d="M18 78 Q40 66 62 78 L66 96 H14 Z" fill="' + color + '"/>' +
        '<rect x="36" y="62" width="8" height="10" rx="3" fill="' + skin + '"/>';
    }
    return '<path d="M16 80 L28 70 L40 78 L52 70 L64 80 L66 96 H14 Z" fill="' + color + '"/>' +
      '<path d="M32 74 L40 84 L48 74 L44 96 H36 Z" fill="#f4f1ea"/>' +
      '<rect x="37" y="64" width="6" height="10" rx="2" fill="' + skin + '"/>';
  }

  function render(input) {
    var spec = normalize(input);
    var random = rng(spec.seed);
    var skin = SKINS[spec.skin];
    var hair = HAIRS[spec.hair];
    var palette = spec.formal ? FORMAL : CASUAL;
    var shirt = palette[clamp(spec.attire, palette.length)];
    var smile = (3.2 + random() * 3.4).toFixed(1);
    var blink = (3.2 + random() * 2.8).toFixed(2);
    var breath = (3 + random() * 1.8).toFixed(2);
    var phase = (-random() * 4).toFixed(2);
    var glasses = spec.glasses
      ? '<g fill="none" stroke="#1c242c" stroke-width="1.5"><circle cx="33" cy="44" r="5.3"/><circle cx="47" cy="44" r="5.3"/><path d="M38.2 44 H41.8"/></g>'
      : "";
    return '<svg class="avatar-svg" viewBox="0 0 80 96" aria-hidden="true" style="--blink:' + blink + 's;--breath:' + breath + 's;--phase:' + phase + 's">' +
      '<ellipse cx="40" cy="92" rx="16" ry="2.4" fill="#1d1d1f" opacity="0.12"/>' +
      '<g class="sway"><g class="breathe">' +
      clothes(spec.formal, shirt, skin) +
      hairBack(spec.style, hair) +
      '<ellipse cx="40" cy="44" rx="16.2" ry="18.2" fill="' + skin + '"/>' +
      '<ellipse cx="23.2" cy="46" rx="2.6" ry="3.4" fill="' + skin + '"/>' +
      '<ellipse cx="56.8" cy="46" rx="2.6" ry="3.4" fill="' + skin + '"/>' +
      hairFront(spec.style, hair) +
      '<ellipse cx="30" cy="52" rx="2.4" ry="1.1" fill="#c48b84" opacity="0.16"/>' +
      '<ellipse cx="50" cy="52" rx="2.4" ry="1.1" fill="#c48b84" opacity="0.16"/>' +
      '<g class="blink">' +
      '<ellipse cx="33.2" cy="45" rx="1.7" ry="2.05" fill="#1c1916"/>' +
      '<ellipse cx="46.8" cy="45" rx="1.7" ry="2.05" fill="#1c1916"/>' +
      '<circle cx="33.7" cy="44.3" r="0.45" fill="#fff" opacity="0.85"/>' +
      '<circle cx="47.3" cy="44.3" r="0.45" fill="#fff" opacity="0.85"/>' +
      "</g>" +
      glasses +
      '<path d="M35 53.2 Q40 ' + (52.6 + Number(smile) * 0.72) + ' 45 53.2" fill="none" stroke="#6d403c" stroke-width="1.15" stroke-linecap="round"/>' +
      "</g></g></svg>";
  }

  function presets(audience) {
    return PRESETS[audience === "b2b" ? "b2b" : "b2c"].map(function (preset) {
      return Object.assign({}, preset);
    });
  }

  function swatches() {
    return { skins: SKINS.slice(), hairs: HAIRS.slice(), styles: STYLES.slice(), casual: CASUAL.slice(), formal: FORMAL.slice() };
  }

  NS.avatars = {
    render: render,
    blank: blank,
    normalize: normalize,
    presets: presets,
    swatches: swatches,
    styles: STYLES
  };
})(window.NodeCRM);
