(function (NS) {
  "use strict";

  var SKINS = ["#F6E2D3", "#E7C2A4", "#C98A62", "#8D5A3C", "#5C3A28", "#3B2418"];
  var HAIRS = ["#1C1A19", "#3A2A22", "#6A3A2A", "#C4552A", "#D6B36A", "#8E8F92", "#243044"];
  var SHIRTS = ["#1F6A64", "#2E5A78", "#8A4E3B", "#3E5C45", "#6A5378", "#8A6A32"];

  function rng(seed) {
    var x = (Number(seed) || 1) >>> 0 || 1;
    return function () {
      x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
      return x / 4294967296;
    };
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

  function render(seed) {
    var random = rng(seed);
    var skin = SKINS[Math.floor(random() * SKINS.length)];
    var hair = HAIRS[Math.floor(random() * HAIRS.length)];
    var shirt = SHIRTS[Math.floor(random() * SHIRTS.length)];
    var style = Math.floor(random() * 6);
    var glasses = random() > 0.72;
    var smile = (3.2 + random() * 3.4).toFixed(1);
    var blink = (3.2 + random() * 2.8).toFixed(2);
    var breath = (3 + random() * 1.8).toFixed(2);
    var phase = (-random() * 4).toFixed(2);
    var glassesSvg = glasses
      ? '<g fill="none" stroke="#1c242c" stroke-width="1.5"><circle cx="33" cy="44" r="5.3"/><circle cx="47" cy="44" r="5.3"/><path d="M38.2 44 H41.8"/></g>'
      : "";
    return '<svg class="avatar-svg" viewBox="0 0 80 96" aria-hidden="true" style="--blink:' + blink + 's;--breath:' + breath + 's;--phase:' + phase + 's">' +
      '<ellipse cx="40" cy="91" rx="18" ry="3" fill="#05070a" opacity="0.3"/>' +
      '<g class="sway"><g class="breathe">' +
      '<path d="M16 78 Q40 64 64 78 L68 96 H12 Z" fill="' + shirt + '"/>' +
      '<rect x="35" y="60" width="10" height="12" rx="3" fill="' + skin + '"/>' +
      hairBack(style, hair) +
      '<ellipse cx="40" cy="43" rx="17" ry="19" fill="' + skin + '"/>' +
      '<ellipse cx="22.5" cy="45" rx="3.1" ry="4" fill="' + skin + '"/>' +
      '<ellipse cx="57.5" cy="45" rx="3.1" ry="4" fill="' + skin + '"/>' +
      hairFront(style, hair) +
      '<ellipse cx="29" cy="51" rx="3.2" ry="1.5" fill="#e09a90" opacity="0.35"/>' +
      '<ellipse cx="51" cy="51" rx="3.2" ry="1.5" fill="#e09a90" opacity="0.35"/>' +
      '<g class="blink">' +
      '<ellipse cx="33" cy="44" rx="2.05" ry="2.45" fill="#1a1714"/>' +
      '<ellipse cx="47" cy="44" rx="2.05" ry="2.45" fill="#1a1714"/>' +
      '<circle cx="33.7" cy="43.2" r="0.65" fill="#fff"/>' +
      '<circle cx="47.7" cy="43.2" r="0.65" fill="#fff"/>' +
      "</g>" +
      glassesSvg +
      '<path d="M34 52.5 Q40 ' + (52.5 + Number(smile)) + ' 46 52.5" fill="none" stroke="#6a3a38" stroke-width="1.35" stroke-linecap="round"/>' +
      "</g></g></svg>";
  }

  function shuffleSeed(seed) {
    var next = (Number(seed) || 1) + 1 + Math.floor(Math.random() * 997);
    return (next % 100000) || 1;
  }

  NS.avatars = { render: render, shuffleSeed: shuffleSeed };
})(window.NodeCRM);
