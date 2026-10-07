(function (NS) {
  "use strict";

  var SKINS = ["#F3E4D8", "#E6C6AE", "#C99578", "#8C6048", "#5C4034", "#3E2C24"];
  var HAIRS = ["#2C2826", "#4A3A30", "#6B4534", "#A15E40", "#C4A56E", "#8A8C90", "#2C3848"];
  var SHIRTS = ["#3C6E68", "#3E5870", "#6A5348", "#445C4C", "#5A5168", "#6A5C42"];

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
      '<ellipse cx="40" cy="92" rx="16" ry="2.4" fill="#05070a" opacity="0.18"/>' +
      '<g class="sway"><g class="breathe">' +
      '<path d="M18 78 Q40 66 62 78 L66 96 H14 Z" fill="' + shirt + '"/>' +
      '<rect x="36" y="62" width="8" height="10" rx="3" fill="' + skin + '"/>' +
      hairBack(style, hair) +
      '<ellipse cx="40" cy="44" rx="16.2" ry="18.2" fill="' + skin + '"/>' +
      '<ellipse cx="23.2" cy="46" rx="2.6" ry="3.4" fill="' + skin + '"/>' +
      '<ellipse cx="56.8" cy="46" rx="2.6" ry="3.4" fill="' + skin + '"/>' +
      hairFront(style, hair) +
      '<ellipse cx="30" cy="52" rx="2.4" ry="1.1" fill="#c48b84" opacity="0.16"/>' +
      '<ellipse cx="50" cy="52" rx="2.4" ry="1.1" fill="#c48b84" opacity="0.16"/>' +
      '<g class="blink">' +
      '<ellipse cx="33.2" cy="45" rx="1.7" ry="2.05" fill="#1c1916"/>' +
      '<ellipse cx="46.8" cy="45" rx="1.7" ry="2.05" fill="#1c1916"/>' +
      '<circle cx="33.7" cy="44.3" r="0.45" fill="#fff" opacity="0.85"/>' +
      '<circle cx="47.3" cy="44.3" r="0.45" fill="#fff" opacity="0.85"/>' +
      "</g>" +
      glassesSvg +
      '<path d="M35 53.2 Q40 ' + (52.6 + Number(smile) * 0.72) + ' 45 53.2" fill="none" stroke="#6d403c" stroke-width="1.15" stroke-linecap="round"/>' +
      "</g></g></svg>";
  }

  function shuffleSeed(seed) {
    var next = (Number(seed) || 1) + 1 + Math.floor(Math.random() * 997);
    return (next % 100000) || 1;
  }

  NS.avatars = { render: render, shuffleSeed: shuffleSeed };
})(window.NodeCRM);
