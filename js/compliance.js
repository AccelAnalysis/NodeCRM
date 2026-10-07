(function (NS) {
  "use strict";

  // Checklist copy for the prototype. Nothing here sends, dials, or blocks a real carrier.
  // A later product enforces this on the server. This file only keeps the plan honest in the UI.
  var DISCLAIMER = "This is a checklist, not legal advice. Have someone who knows the rules look before you send anything. Nothing in this prototype is sent.";

  var RISKS = [
    {
      re: /auto[\s-]?dial|robo[\s-]?call|predictive dial|power[\s-]?dial|automatic (call|dial|voice|text)|prerecorded|robo[\s-]?text/i,
      why: "This wording describes automatic calling, a recorded voice, or an automatic text. Those usually need prior express written consent, and this prototype will not dial or send anything. Keep the words only as a note that a person does the step by hand."
    },
    {
      re: /bought (this |the |a )?list|purchased list|scraped (list|contacts|numbers)|cold list|bought leads/i,
      why: "A bought or scraped list is a common way to message people who never agreed. Texts and many calls need consent from the person, not just a number you acquired. Keep this note only if you are sure you still have that consent."
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
      return "Texting more often than every few days is easy to feel like harassment. Use a faster pace only if they asked for it.";
    }
    if (channel.id === "phone" && days < 7) {
      return "Calling more than weekly needs a clear reason. Keep the slower pace unless they asked you to call sooner.";
    }
    if (channel.id === "email" && days < 2) {
      return "Emailing every day is a lot. A slower pace is the safer default.";
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
    if (!chosen.length) gaps.push("Pick what you will actually do.");
    var card = sender(state);
    if (channel.compliance.footer === "email" && !card.name) gaps.push("Add the name people should see as the sender.");
    if (channel.compliance.footer === "email" && !card.postal) gaps.push("Add the physical mailing address that goes on every marketing email.");
    var pace = paceWarning(channel, item);
    if (pace && !item.paceConfirmed) gaps.push(pace);
    if (riskyText(item) && !item.riskConfirmed) gaps.push("Change the wording that describes automatic contact or a bought list, or confirm it is only a note.");
    return gaps;
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
    if (channel.id === "phone") {
      return "Call only between 8:00 a.m. and 9:00 p.m. in their time zone. This prototype does not place the call.";
    }
    return "Text only between 8:00 a.m. and 9:00 p.m. in their time zone. This prototype does not send the text.";
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
    ready: ready,
    footer: footer,
    quietNote: quietNote,
    risk: risk,
    riskyText: riskyText,
    optedOut: optedOut
  };
})(window.NodeCRM);
