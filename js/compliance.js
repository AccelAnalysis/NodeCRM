(function (NS) {
  "use strict";

  // Checklist copy for the prototype. Nothing here sends, dials, or blocks a real carrier.
  // A later product enforces this on the server. This file only keeps the plan honest in the UI.
  var DISCLAIMER = "This is a checklist, not legal advice. Have someone who knows the rules look before you send anything. Nothing in this prototype is sent.";

  var RISKS = [
    {
      re: /auto[\s-]?dial|robo[\s-]?call|predictive dial|power[\s-]?dial|automatic (call|dial|voice|text)|prerecorded|robo[\s-]?text/i,
      why: "This describes automatic calling, a recorded voice, or an automatic text. Keep it only as a note that a person does the step by hand."
    },
    {
      re: /bought (this |the |a )?list|purchased list|scraped (list|contacts|numbers)|cold list|bought leads/i,
      why: "A bought or scraped list is not consent. Keep this only if you still have each person's yes."
    }
  ];

  function sender(state) {
    var card = (state && state.sender) || {};
    return {
      name: String(card.name || "").trim(),
      postal: String(card.postal || "").trim()
    };
  }

  function toDays(cadence) {
    var count = Number(cadence && cadence.interval) || 1;
    var unit = cadence && cadence.unit;
    if (unit === "weeks") return count * 7;
    if (unit === "months") return count * 30;
    return count;
  }

  function paceWarning(channel, item) {
    if (!channel || !item || !item.enabled) return "";
    var days = toDays(item.cadence);
    if (channel.id === "sms" && days < 3) {
      return "Texting this often needs them to have asked for it.";
    }
    if (channel.id === "phone" && days < 7) {
      return "Calling this often needs them to have asked for it.";
    }
    if (channel.id === "email" && days < 2) {
      return "Emailing every day needs them to have asked for it.";
    }
    return "";
  }

  function missing(channel, item, state) {
    var gaps = [];
    if (!channel || !item || !item.enabled) return gaps;
    (channel.compliance.checks || []).forEach(function (check) {
      if (check.required && !(item.checks && item.checks[check.id])) gaps.push(check.label);
    });
    var chosen = channel.actions.filter(function (action) { return item.actions && item.actions[action.id]; });
    if (!chosen.length) gaps.push("Pick an action");
    var card = sender(state);
    if (channel.compliance.footer === "email" && !card.name) gaps.push("Add a sender name");
    if (channel.compliance.footer === "email" && !card.postal) gaps.push("Add a mailing address");
    var pace = paceWarning(channel, item);
    if (pace && !item.paceConfirmed) gaps.push("Confirm this pace");
    if (riskyText(item) && !item.riskConfirmed) gaps.push("Check the wording");
    return gaps;
  }

  var CONSENT_IDS = { consent: 1, permission: 1, stop: 1 };

  function status(channel, item, state) {
    if (!item || !item.enabled) return { tone: "off", label: "", whys: [] };
    var gaps = missing(channel, item, state);
    if (!gaps.length) return { tone: "ok", label: "Ready", whys: [] };
    var needsConsent = (channel.compliance.checks || []).some(function (check) {
      return CONSENT_IDS[check.id] && check.required && !(item.checks && item.checks[check.id]);
    });
    return { tone: "wait", label: needsConsent ? "Needs consent" : "Not ready", whys: gaps };
  }

  function ready(channel, item, state) {
    return !!(item && item.enabled && missing(channel, item, state).length === 0);
  }

  function emailFooter(state) {
    var card = sender(state);
    return (card.name || "Your name") + "\n" +
      (card.postal || "Your street, city, state, and ZIP") + "\n" +
      "Unsubscribe with the link in the email. After they unsubscribe, stop within 10 business days.";
  }

  function smsFooter() {
    return "Reply STOP to opt out. Honor that request right away.";
  }

  function mailFooter(state) {
    var card = sender(state);
    return (card.name || "Your name") + " — say how they can refuse future mail.";
  }

  function footer(channel, state) {
    if (!channel || !channel.compliance) return "";
    if (channel.compliance.footer === "email") return emailFooter(state);
    if (channel.compliance.footer === "sms") return smsFooter();
    if (channel.compliance.footer === "mail") return mailFooter(state);
    return "";
  }

  function quietNote(channel) {
    if (!channel || !channel.compliance || !channel.compliance.quiet) return "";
    return "8:00 a.m.–9:00 p.m. in their time zone.";
  }

  function risk(text) {
    var value = String(text || "");
    var i;
    for (i = 0; i < RISKS.length; i += 1) {
      if (RISKS[i].re.test(value)) return RISKS[i];
    }
    return null;
  }

  function riskyText(item) {
    if (!item || !item.copy) return null;
    var keys = Object.keys(item.copy);
    var i;
    for (i = 0; i < keys.length; i += 1) {
      var hit = risk(item.copy[keys[i]]);
      if (hit) return hit;
    }
    return null;
  }

  function optedOut(person) {
    return person && person.status === "opted_out";
  }

  NS.compliance = {
    DISCLAIMER: DISCLAIMER,
    sender: sender,
    paceWarning: paceWarning,
    missing: missing,
    status: status,
    ready: ready,
    footer: footer,
    quietNote: quietNote,
    risk: risk,
    riskyText: riskyText,
    optedOut: optedOut
  };
})(window.NodeCRM);
