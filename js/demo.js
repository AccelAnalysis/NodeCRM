(function (NS) {
  "use strict";

  function commsFor(spec) {
    var comms = NS.registry.blankComms();
    Object.keys(spec).forEach(function (id) {
      comms[id].enabled = true;
      if (spec[id].interval) comms[id].cadence.interval = spec[id].interval;
      if (spec[id].unit) comms[id].cadence.unit = spec[id].unit;
      Object.assign(comms[id].copy, spec[id].copy || {});
    });
    return comms;
  }

  function build() {
    return {
      version: 1,
      market: {
        name: "Neighborhood specialty studios",
        description: "Independent studios that sell a service people come back for."
      },
      segments: [
        { id: "seg_demo_owners", name: "Studio owners", description: "" },
        { id: "seg_demo_multi", name: "Multi-site operators", description: "" }
      ],
      personas: [
        { id: "per_demo_ren", segmentId: "seg_demo_owners", name: "Ren Park", role: "Owner", icp: true, icpNote: "Buys when the offer fits how the studio already runs.", avatarSeed: 4 },
        { id: "per_demo_chris", segmentId: "seg_demo_owners", name: "Chris Adelayo", role: "Studio lead", icp: false, icpNote: "", avatarSeed: 18 },
        { id: "per_demo_morgan", segmentId: "seg_demo_multi", name: "Morgan Ellis", role: "Director of operations", icp: true, icpNote: "Compares vendors across locations.", avatarSeed: 27 }
      ],
      stages: [
        { id: "stage_awareness", name: "Awareness", kind: "awareness" },
        { id: "stg_demo_consideration", name: "Consideration", kind: "standard" },
        { id: "stg_demo_enrollment", name: "Enrollment", kind: "standard" }
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
            call: {
              interval: 1,
              unit: "weeks",
              copy: {
                taskTitle: "Operations check-in",
                script: "Ask how they compare options across locations. Do not dial automatically — this is a task."
              }
            }
          })
        }
      ],
      awareness: {
        channels: [
          { id: "chn_demo_talks", name: "Community talks", kind: "event", x: 24, y: 30 },
          { id: "chn_demo_partners", name: "Partner studios", kind: "partner", x: 62, y: 38 },
          { id: "chn_demo_letter", name: "Newsletter", kind: "content", x: 42, y: 68 }
        ],
        wires: [
          { id: "wir_demo_1", from: "chn_demo_talks", to: "chn_demo_letter" }
        ],
        people: [
          { id: "ppl_demo_priya", name: "Priya Shah", status: "lead", channelId: "chn_demo_talks", personaId: null, advancedStageId: null, note: "" },
          { id: "ppl_demo_andre", name: "Andre Walsh", status: "contact", channelId: "chn_demo_partners", personaId: "per_demo_ren", advancedStageId: null, note: "" }
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
