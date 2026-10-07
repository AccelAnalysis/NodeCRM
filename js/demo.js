(function (NS) {
  "use strict";

  function commsFor(spec) {
    var comms = NS.registry.blankComms();
    Object.keys(spec).forEach(function (id) {
      var key = id === "call" ? "phone" : id;
      if (!comms[key]) return;
      var src = spec[id];
      comms[key].enabled = true;
      if (src.interval) comms[key].cadence.interval = src.interval;
      if (src.unit) comms[key].cadence.unit = src.unit;
      Object.assign(comms[key].copy, src.copy || {});
      Object.keys(src.actions || {}).forEach(function (action) {
        if (action in comms[key].actions) comms[key].actions[action] = !!src.actions[action];
      });
      Object.keys(src.checks || {}).forEach(function (check) {
        if (check in comms[key].checks) comms[key].checks[check] = !!src.checks[check];
      });
    });
    return comms;
  }

  function build() {
    return {
      version: 1,
      market: {
        name: "Neighborhood specialty studios",
        description: "Independent studios that sell a service people come back for.",
        geo: {
          places: [
            { id: "geo_demo_austin", kind: "pin", label: "Austin", lat: 30.267, lng: -97.743, coverage: "radius", radiusMiles: 25, driveMinutes: 30 },
            { id: "geo_demo_tx", kind: "region", label: "Texas", lat: 31.48, lng: -99.33, coverage: "radius", radiusMiles: 280, driveMinutes: 30 }
          ]
        }
      },
      sender: { name: "Harbor Studio Co.", postal: "100 Example Street, Austin, TX 78701" },
      extras: [],
      segments: [
        {
          id: "seg_demo_owners",
          name: "Studio owners",
          description: "",
          audience: "b2b",
          params: { age: [], life: [], income: [], interests: [], role: ["owner"], size: ["2-10"], industry: [] },
          custom: []
        },
        {
          id: "seg_demo_regulars",
          name: "Regulars",
          description: "",
          audience: "b2c",
          params: { age: ["25-34", "35-44"], life: [], income: [], interests: ["fitness"], role: [], size: [], industry: [] },
          custom: []
        }
      ],
      personas: [
        {
          id: "per_demo_ren",
          segmentId: "seg_demo_owners",
          name: "Ren Park",
          role: "Owner",
          icp: true,
          icpNote: "Buys when the offer fits how the studio already runs.",
          avatarSeed: 4,
          avatar: { preset: "founder", skin: 2, hair: 0, style: 1, attire: 0, glasses: false, formal: true }
        },
        {
          id: "per_demo_chris",
          segmentId: "seg_demo_regulars",
          name: "Chris Adelayo",
          role: "Comes every week",
          icp: false,
          icpNote: "",
          avatarSeed: 18,
          avatar: { preset: "athlete", skin: 4, hair: 0, style: 1, attire: 5, glasses: false, formal: false }
        },
        {
          id: "per_demo_morgan",
          segmentId: "seg_demo_owners",
          name: "Morgan Ellis",
          role: "Director of operations",
          icp: true,
          icpNote: "Compares vendors across locations.",
          avatarSeed: 27,
          avatar: { preset: "operator", skin: 1, hair: 1, style: 0, attire: 1, glasses: false, formal: true }
        }
      ],
      stages: [
        { id: "stage_awareness", name: "Awareness", kind: "awareness" },
        { id: "stg_demo_consideration", name: "Consideration", kind: "standard", advanceOn: "form" },
        { id: "stg_demo_enrollment", name: "Enrollment", kind: "standard", advanceOn: "contract" }
      ],
      nodes: [
        {
          id: "nod_demo_ren",
          personaId: "per_demo_ren",
          stageId: "stage_awareness",
          mode: "linear",
          exitAction: "They reply or book a visit",
          templateId: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          comms: commsFor({
            email: {
              interval: 5,
              unit: "days",
              actions: { send: true },
              checks: { honest: true },
              copy: {
                subject: "A note for studio owners",
                body: "What the studio gets, who it is for, and one way to see it in person."
              }
            }
          })
        },
        {
          id: "nod_demo_morgan",
          personaId: "per_demo_morgan",
          stageId: "stg_demo_consideration",
          mode: "cycle",
          exitAction: "They ask for a proposal or pass",
          templateId: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          comms: commsFor({
            phone: {
              interval: 1,
              unit: "weeks",
              actions: { call: true },
              copy: {
                taskTitle: "Operations check-in",
                script: "Ask how they compare options across locations. A person places this call."
              }
            }
          })
        }
      ],
      awareness: {
        channels: [
          { id: "chn_demo_event", name: "Community talks", catalogId: "event", kind: "event", actions: { attend: true, host: false, speak: true }, x: 28, y: 32 },
          { id: "chn_demo_ref", name: "Partner studios", catalogId: "referral", kind: "referral", actions: { ask: true, thank: true, introduce: false }, x: 62, y: 40 },
          { id: "chn_demo_email", name: "Email", catalogId: "email", kind: "email", actions: { send: true, series: false, reply: false }, x: 44, y: 70 }
        ],
        wires: [
          { id: "wir_demo_1", from: "chn_demo_event", to: "chn_demo_email" }
        ],
        people: [
          { id: "ppl_demo_priya", name: "Priya Shah", status: "lead", channelId: "chn_demo_event", personaId: null, advancedStageId: null, note: "" },
          { id: "ppl_demo_andre", name: "Andre Walsh", status: "contact", channelId: "chn_demo_ref", personaId: "per_demo_ren", advancedStageId: null, note: "" },
          { id: "ppl_demo_stop", name: "Jordan Lee", status: "opted_out", channelId: "chn_demo_email", personaId: null, advancedStageId: null, note: "" }
        ]
      },
      templates: []
    };
  }

  function load() {
    NS.model.replaceAll(build());
  }

  NS.demo = { build: build, load: load };
})(window.NodeCRM);
