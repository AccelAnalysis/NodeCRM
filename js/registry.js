(function (NS) {
  "use strict";

  // Extension point: add a communications channel here. The node panel,
  // storage shape, and bubble markers all read this list.
  var commChannels = [
    {
      id: "email",
      label: "Email",
      defaultInterval: 7,
      defaultUnit: "days",
      fields: [
        { key: "subject", label: "Subject", type: "text" },
        { key: "body", label: "Body", type: "textarea" }
      ]
    },
    {
      id: "sms",
      label: "Text / SMS",
      defaultInterval: 4,
      defaultUnit: "days",
      fields: [
        { key: "body", label: "Message", type: "textarea" }
      ]
    },
    {
      id: "mail",
      label: "Physical mail",
      defaultInterval: 1,
      defaultUnit: "months",
      fields: [
        { key: "headline", label: "Headline", type: "text" },
        { key: "body", label: "Letter", type: "textarea" }
      ]
    },
    {
      id: "call",
      label: "Call task",
      hint: "A task for someone to place the call. NodeCRM does not dial.",
      defaultInterval: 1,
      defaultUnit: "weeks",
      fields: [
        { key: "taskTitle", label: "Task title", type: "text" },
        { key: "script", label: "Call notes", type: "textarea" }
      ]
    }
  ];

  // Extension point: acquisition channels on the awareness-stage map.
  var acquisitionKinds = [
    { id: "referral", label: "Referral" },
    { id: "event", label: "Event" },
    { id: "social", label: "Social" },
    { id: "search", label: "Search" },
    { id: "content", label: "Content" },
    { id: "partner", label: "Partner" },
    { id: "outreach", label: "Outreach" },
    { id: "other", label: "Other" }
  ];

  var cadenceUnits = [
    { id: "days", label: "days" },
    { id: "weeks", label: "weeks" },
    { id: "months", label: "months" }
  ];

  var nodeModes = [
    { id: "linear", label: "Linear", hint: "Advances when this node's communications are complete." },
    { id: "cycle", label: "Cycle", hint: "Stays on this stage until the exit happens." }
  ];

  function channelById(id) {
    return commChannels.filter(function (ch) { return ch.id === id; })[0] || null;
  }

  function blankComms() {
    var comms = {};
    commChannels.forEach(function (ch) {
      var copy = {};
      ch.fields.forEach(function (field) { copy[field.key] = ""; });
      comms[ch.id] = {
        enabled: false,
        cadence: { interval: ch.defaultInterval, unit: ch.defaultUnit },
        copy: copy
      };
    });
    return comms;
  }

  function normalizeUnit(unit) {
    return cadenceUnits.some(function (item) { return item.id === unit; }) ? unit : "days";
  }

  function mergeComms(source) {
    var comms = blankComms();
    if (!source) return comms;
    commChannels.forEach(function (ch) {
      var incoming = source[ch.id];
      if (!incoming) return;
      comms[ch.id].enabled = !!incoming.enabled;
      var interval = Number(incoming.cadence && incoming.cadence.interval);
      comms[ch.id].cadence.interval = interval >= 1 && interval <= 365 ? interval : ch.defaultInterval;
      comms[ch.id].cadence.unit = normalizeUnit(incoming.cadence && incoming.cadence.unit);
      ch.fields.forEach(function (field) {
        if (incoming.copy && incoming.copy[field.key] != null) {
          comms[ch.id].copy[field.key] = String(incoming.copy[field.key]);
        }
      });
    });
    return comms;
  }

  NS.registry = {
    commChannels: commChannels,
    acquisitionKinds: acquisitionKinds,
    cadenceUnits: cadenceUnits,
    nodeModes: nodeModes,
    channelById: channelById,
    blankComms: blankComms,
    mergeComms: mergeComms,
    normalizeUnit: normalizeUnit
  };
})(window.NodeCRM);
