(function (NS) {
  "use strict";

  // Catalog of channels. The map, the node checklist, and storage all read this.
  // Custom networks are added per workspace and appended by list().
  function channel(partial) {
    return partial;
  }

  var direct = [
    channel({
      id: "sms",
      label: "SMS",
      group: "direct",
      hint: "A text message. This prototype does not send it.",
      defaultInterval: 4,
      defaultUnit: "days",
      dot: "#0c6e66",
      actions: [
        { id: "send", label: "Send a text" },
        { id: "reply", label: "Reply to their text" },
        { id: "follow", label: "Send a follow-up text" }
      ],
      fields: [{ key: "body", label: "What the text says", type: "textarea" }],
      compliance: {
        quiet: true,
        footer: "sms",
        checks: [
          { id: "consent", label: "Each person gave express consent to receive texts. A phone number by itself is not a yes.", required: true },
          { id: "identity", label: "The text says who you are.", required: true }
        ]
      }
    }),
    channel({
      id: "email",
      label: "Email",
      group: "direct",
      hint: "A marketing email. Every one needs your mailing address and a way to unsubscribe.",
      defaultInterval: 7,
      defaultUnit: "days",
      dot: "#2457b5",
      actions: [
        { id: "send", label: "Send one email" },
        { id: "series", label: "Send the next email in the series" },
        { id: "reply", label: "Reply to their email" }
      ],
      fields: [
        { key: "subject", label: "Subject line", type: "text" },
        { key: "body", label: "What the email says", type: "textarea" }
      ],
      compliance: {
        quiet: false,
        footer: "email",
        checks: [
          { id: "consent", label: "These people agreed to hear from you by email.", required: true },
          { id: "honest", label: "The subject line matches what the email is actually about.", required: true }
        ]
      }
    }),
    channel({
      id: "phone",
      label: "Phone",
      group: "direct",
      hint: "A task for a person to place the call. NodeCRM does not dial, and it will not auto-dial.",
      defaultInterval: 1,
      defaultUnit: "weeks",
      dot: "#5b4db8",
      aliases: ["call"],
      actions: [
        { id: "call", label: "A person calls them" },
        { id: "voicemail", label: "A person leaves a voicemail" },
        { id: "callback", label: "Book a time to talk" }
      ],
      fields: [
        { key: "taskTitle", label: "Task title", type: "text" },
        { key: "script", label: "What the caller should say", type: "textarea" }
      ],
      compliance: {
        quiet: true,
        footer: null,
        checks: [
          { id: "consent", label: "They agreed to a call. Do not use an automatic dialer or a prerecorded voice.", required: true },
          { id: "manual", label: "A person will place this call. This step is only a reminder.", required: true }
        ]
      }
    })
  ];

  var social = [
    channel({
      id: "linkedin",
      label: "LinkedIn",
      group: "social",
      hint: "Stop if they ask. Don't pretend to be someone else.",
      defaultInterval: 3,
      defaultUnit: "days",
      dot: "#0a66c2",
      actions: [
        { id: "connect", label: "Send a connection request" },
        { id: "message", label: "Send a message" },
        { id: "comment", label: "Comment" }
      ]
    }),
    channel({
      id: "instagram",
      label: "Instagram",
      group: "social",
      hint: "Stop if they ask. Don't pretend to be someone else.",
      defaultInterval: 3,
      defaultUnit: "days",
      dot: "#c13584",
      actions: [
        { id: "follow", label: "Follow" },
        { id: "dm", label: "Send a direct message" },
        { id: "comment", label: "Comment" }
      ]
    }),
    channel({
      id: "facebook",
      label: "Facebook",
      group: "social",
      hint: "Stop if they ask. Don't pretend to be someone else.",
      defaultInterval: 4,
      defaultUnit: "days",
      dot: "#1877f2",
      actions: [
        { id: "post", label: "Post on the page" },
        { id: "message", label: "Send a Messenger note" },
        { id: "comment", label: "Comment" }
      ]
    }),
    channel({
      id: "x",
      label: "X",
      group: "social",
      hint: "Stop if they ask. Don't pretend to be someone else.",
      defaultInterval: 3,
      defaultUnit: "days",
      dot: "#1d1d1f",
      actions: [
        { id: "post", label: "Post" },
        { id: "reply", label: "Reply" },
        { id: "dm", label: "Send a direct message" }
      ]
    }),
    channel({
      id: "tiktok",
      label: "TikTok",
      group: "social",
      hint: "Stop if they ask. Don't pretend to be someone else.",
      defaultInterval: 4,
      defaultUnit: "days",
      dot: "#111111",
      actions: [
        { id: "post", label: "Post" },
        { id: "comment", label: "Comment" },
        { id: "reply", label: "Reply" }
      ]
    }),
    channel({
      id: "youtube",
      label: "YouTube",
      group: "social",
      hint: "Stop if they ask. Don't pretend to be someone else.",
      defaultInterval: 1,
      defaultUnit: "weeks",
      dot: "#d21f1f",
      actions: [
        { id: "comment", label: "Comment" },
        { id: "post", label: "Community post" },
        { id: "link", label: "Put a link in the description" }
      ]
    })
  ];

  var physical = [
    channel({
      id: "expo",
      label: "Expo",
      group: "physical",
      hint: "A booth or a hall. Ask before you add someone to email or text.",
      defaultInterval: 1,
      defaultUnit: "months",
      dot: "#b56a1c",
      actions: [
        { id: "booth", label: "Talk at the booth" },
        { id: "badge", label: "Follow up on a badge scan" },
        { id: "talk", label: "Give a short talk" }
      ]
    }),
    channel({
      id: "event",
      label: "Other event",
      group: "physical",
      hint: "Any gathering that is not an expo. Ask before you add someone to email or text.",
      defaultInterval: 1,
      defaultUnit: "months",
      dot: "#b56a1c",
      actions: [
        { id: "attend", label: "Attend" },
        { id: "host", label: "Host" },
        { id: "speak", label: "Speak" }
      ]
    }),
    channel({
      id: "met",
      label: "Met in person",
      group: "physical",
      hint: "You already spoke. Ask before you add them to email or text.",
      defaultInterval: 3,
      defaultUnit: "days",
      dot: "#3d7a4a",
      actions: [
        { id: "note", label: "Write down the conversation" },
        { id: "follow", label: "Follow up" }
      ]
    }),
    channel({
      id: "referral",
      label: "Referral",
      group: "physical",
      hint: "Someone introduced you. The new person still has to agree before email or text.",
      defaultInterval: 1,
      defaultUnit: "weeks",
      dot: "#8a6a22",
      actions: [
        { id: "ask", label: "Ask for an introduction" },
        { id: "thank", label: "Thank the person who introduced you" },
        { id: "introduce", label: "Make an introduction" }
      ]
    }),
    channel({
      id: "mail",
      label: "Direct mail",
      group: "physical",
      hint: "Paper they can hold. Say who you are and how to refuse more mail.",
      defaultInterval: 1,
      defaultUnit: "months",
      dot: "#a15b4d",
      actions: [
        { id: "send", label: "Send a piece" },
        { id: "track", label: "Note who responded" }
      ],
      fields: [
        { key: "headline", label: "Headline", type: "text" },
        { key: "body", label: "What the piece says", type: "textarea" }
      ]
    }),
    channel({
      id: "visit",
      label: "Site visit",
      group: "physical",
      hint: "You go to them. Ask before you add them to email or text.",
      defaultInterval: 1,
      defaultUnit: "months",
      dot: "#2f6f62",
      actions: [
        { id: "schedule", label: "Schedule the visit" },
        { id: "walk", label: "Walk the site" },
        { id: "materials", label: "Leave materials" }
      ]
    })
  ];

  social.forEach(attachSocialChecks);
  physical.forEach(attachPhysicalChecks);

  function attachSocialChecks(item) {
    item.fields = item.fields || [{ key: "note", label: "Note", type: "textarea" }];
    item.compliance = {
      quiet: false,
      footer: null,
      checks: [
        { id: "stop", label: "If they ask you to stop, you will stop.", required: true },
        { id: "honest", label: "You will use your real name and your real company.", required: true }
      ]
    };
  }

  function attachPhysicalChecks(item) {
    item.fields = item.fields || [{ key: "note", label: "Note", type: "textarea" }];
    var inPerson = item.id !== "mail";
    item.compliance = {
      quiet: false,
      footer: item.id === "mail" ? "mail" : null,
      checks: inPerson
        ? [{ id: "permission", label: "You will ask before you add them to email or text.", required: true }]
        : [{ id: "identity", label: "The piece says who sent it and how to refuse future mail.", required: true }]
    };
  }

  var commChannels = direct.concat(social).concat(physical);

  var KIND_TO_CATALOG = {
    referral: "referral",
    event: "event",
    email: "email",
    sms: "sms",
    mail: "mail",
    call: "phone",
    phone: "phone",
    expo: "expo",
    met: "met",
    visit: "visit",
    linkedin: "linkedin",
    instagram: "instagram",
    facebook: "facebook",
    x: "x",
    tiktok: "tiktok",
    youtube: "youtube"
  };

  var cadenceUnits = [
    { id: "days", label: "days" },
    { id: "weeks", label: "weeks" },
    { id: "months", label: "months" }
  ];

  var nodeModes = [
    { id: "linear", label: "Then move on", hint: "When this step is done, they move to the next stage." },
    { id: "cycle", label: "Stay on this step", hint: "They stay here until the exit you name." }
  ];

  function extraChannel(extra) {
    var socialActions = [
      { id: "post", label: "Post" },
      { id: "message", label: "Message" },
      { id: "comment", label: "Comment" }
    ];
    var customActions = [
      { id: "reach", label: "Reach out" },
      { id: "follow", label: "Follow up" }
    ];
    var isSocial = extra.group === "social";
    return {
      id: extra.id,
      label: extra.name,
      group: isSocial ? "social" : "custom",
      custom: true,
      hint: isSocial ? "A network you added. Stop if they ask." : "A channel you named. Stop if they ask.",
      defaultInterval: 7,
      defaultUnit: "days",
      dot: "#6e6e73",
      actions: isSocial ? socialActions : customActions,
      fields: [{ key: "note", label: "Note", type: "textarea" }],
      compliance: {
        quiet: false,
        footer: null,
        checks: [
          { id: "stop", label: "If they ask you to stop, you will stop.", required: true }
        ]
      }
    };
  }

  function extrasOf(state) {
    return (state && state.extras) || [];
  }

  function list(state) {
    return commChannels.concat(extrasOf(state).map(extraChannel));
  }

  function channelById(id, state) {
    var key = id === "call" ? "phone" : id;
    return list(state).filter(function (item) { return item.id === key; })[0] || null;
  }

  function groups(state) {
    var extras = extrasOf(state).map(extraChannel);
    return [
      {
        id: "direct",
        label: "Email, text, and phone",
        hint: "The channels with the strictest U.S. rules.",
        items: direct
      },
      {
        id: "social",
        label: "Social networks",
        hint: "Pick the network. Add one if yours is missing.",
        allowNetwork: true,
        items: social.concat(extras.filter(function (item) { return item.group === "social"; }))
      },
      {
        id: "physical",
        label: "In person and on paper",
        hint: "Events, visits, referrals, and mail.",
        items: physical
      },
      {
        id: "custom",
        label: "Something else",
        hint: "Only if nothing above fits.",
        secondary: true,
        allowCustom: true,
        items: extras.filter(function (item) { return item.group === "custom"; })
      }
    ];
  }

  function blankOne(ch) {
    var copy = {};
    var actions = {};
    var checks = {};
    ch.fields.forEach(function (field) { copy[field.key] = ""; });
    ch.actions.forEach(function (action) { actions[action.id] = false; });
    (ch.compliance.checks || []).forEach(function (check) { checks[check.id] = false; });
    return {
      enabled: false,
      actions: actions,
      checks: checks,
      cadence: { interval: ch.defaultInterval, unit: ch.defaultUnit },
      copy: copy,
      paceConfirmed: false,
      riskConfirmed: false
    };
  }

  function blankComms(state) {
    var comms = {};
    list(state).forEach(function (ch) { comms[ch.id] = blankOne(ch); });
    return comms;
  }

  function normalizeUnit(unit) {
    return cadenceUnits.some(function (item) { return item.id === unit; }) ? unit : "days";
  }

  function mergeComms(source, state) {
    var comms = blankComms(state);
    if (!source) return comms;
    list(state).forEach(function (ch) {
      var incoming = source[ch.id];
      if (!incoming && ch.aliases) {
        ch.aliases.forEach(function (alias) {
          if (!incoming && source[alias]) incoming = source[alias];
        });
      }
      if (!incoming) return;
      var item = comms[ch.id];
      item.enabled = !!incoming.enabled;
      var interval = Number(incoming.cadence && incoming.cadence.interval);
      item.cadence.interval = interval >= 1 && interval <= 365 ? interval : ch.defaultInterval;
      item.cadence.unit = normalizeUnit(incoming.cadence && incoming.cadence.unit);
      ch.fields.forEach(function (field) {
        if (incoming.copy && incoming.copy[field.key] != null) item.copy[field.key] = String(incoming.copy[field.key]);
      });
      ch.actions.forEach(function (action) {
        if (incoming.actions && incoming.actions[action.id] != null) item.actions[action.id] = !!incoming.actions[action.id];
      });
      (ch.compliance.checks || []).forEach(function (check) {
        if (incoming.checks && incoming.checks[check.id] != null) item.checks[check.id] = !!incoming.checks[check.id];
      });
      item.paceConfirmed = !!incoming.paceConfirmed;
      item.riskConfirmed = !!incoming.riskConfirmed;
    });
    return comms;
  }

  function catalogIdForKind(kind) {
    return KIND_TO_CATALOG[kind] || null;
  }

  NS.registry = {
    commChannels: commChannels,
    cadenceUnits: cadenceUnits,
    nodeModes: nodeModes,
    list: list,
    groups: groups,
    channelById: channelById,
    extraChannel: extraChannel,
    blankComms: blankComms,
    mergeComms: mergeComms,
    normalizeUnit: normalizeUnit,
    catalogIdForKind: catalogIdForKind
  };
})(window.NodeCRM);
