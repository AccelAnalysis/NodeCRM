(function (NS) {
  "use strict";

  function commsFrom(spec) {
    var comms = NS.registry.blankComms();
    Object.keys(spec).forEach(function (id) {
      var key = id === "call" ? "phone" : id;
      var src = spec[id];
      if (!comms[key]) return;
      comms[key].enabled = true;
      if (src.interval) comms[key].cadence.interval = src.interval;
      if (src.unit) comms[key].cadence.unit = src.unit;
      Object.keys(src.copy || {}).forEach(function (field) {
        if (field in comms[key].copy) comms[key].copy[field] = src.copy[field];
      });
      Object.keys(src.actions || {}).forEach(function (action) {
        if (action in comms[key].actions) comms[key].actions[action] = !!src.actions[action];
      });
      Object.keys(src.checks || {}).forEach(function (check) {
        if (check in comms[key].checks) comms[key].checks[check] = !!src.checks[check];
      });
    });
    return comms;
  }

  // Extension point: push another object into this list for a built-in template.
  var BUILT_INS = [
    {
      id: "tpl_intro",
      name: "Introduction",
      description: "A short hello and one next step.",
      mode: "linear",
      exitAction: "They reply or book time",
      comms: commsFrom({
        email: {
          interval: 5,
          unit: "days",
          actions: { send: true },
          checks: { honest: true },
          copy: {
            subject: "A short introduction",
            body: "Who this is for, what you offer, and one clear way to take a next step."
          }
        }
      })
    },
    {
      id: "tpl_evaluation",
      name: "Active evaluation",
      description: "Stay present while they decide.",
      mode: "cycle",
      exitAction: "They commit or pass",
      comms: commsFrom({
        email: {
          interval: 1,
          unit: "weeks",
          actions: { series: true },
          checks: { honest: true },
          copy: {
            subject: "Still useful?",
            body: "A proof point, a question, and an easy way to talk."
          }
        },
        phone: {
          interval: 1,
          unit: "weeks",
          actions: { call: true },
          copy: {
            taskTitle: "Check in while they decide",
            script: "Ask what they are comparing and what would make this a fit. A person places this call."
          }
        }
      })
    },
    {
      id: "tpl_service",
      name: "Service delivery",
      description: "Set expectations once delivery starts.",
      mode: "linear",
      exitAction: "The first delivery milestone is done",
      comms: commsFrom({
        email: {
          interval: 3,
          unit: "days",
          actions: { send: true },
          checks: { honest: true },
          copy: {
            subject: "What happens next",
            body: "What they receive, when it happens, and how to get help."
          }
        },
        sms: {
          interval: 1,
          unit: "weeks",
          actions: { send: true },
          checks: { identity: true },
          copy: { body: "Reminder of the next step and who to contact." }
        }
      })
    },
    {
      id: "tpl_loyalty",
      name: "Loyalty rhythm",
      description: "A steady check-in after the work is underway.",
      mode: "cycle",
      exitAction: "They ask for something new or go quiet",
      comms: commsFrom({
        email: {
          interval: 1,
          unit: "months",
          actions: { series: true },
          checks: { honest: true },
          copy: {
            subject: "How is this going?",
            body: "One result worth noticing, and an offer to adjust."
          }
        }
      })
    },
    {
      id: "tpl_advocacy",
      name: "Bring someone with you",
      description: "Ask for an introduction when trust is established.",
      mode: "linear",
      exitAction: "They introduce someone or decline",
      comms: commsFrom({
        email: {
          interval: 2,
          unit: "weeks",
          actions: { send: true },
          checks: { honest: true },
          copy: {
            subject: "Who else should hear this?",
            body: "A simple way to introduce a peer, with the words they can forward."
          }
        },
        mail: {
          interval: 1,
          unit: "months",
          actions: { send: true },
          copy: {
            headline: "A note worth passing on",
            body: "A short physical note they can hand to someone else."
          }
        }
      })
    }
  ];

  function builtIns() {
    return NS.util.clone(BUILT_INS);
  }

  function all() {
    var user = (NS.model.get().templates || []).map(function (tpl) {
      return Object.assign({}, tpl, { builtIn: false, comms: NS.registry.mergeComms(tpl.comms, NS.model.get()) });
    });
    return builtIns().concat(user);
  }

  function byId(id) {
    return all().filter(function (tpl) { return tpl.id === id; })[0] || null;
  }

  NS.templates = { builtIns: builtIns, all: all, byId: byId };
})(window.NodeCRM);
