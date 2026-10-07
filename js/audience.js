(function (NS) {
  "use strict";

  var b2c = {
    id: "b2c",
    label: "People",
    caption: "Sometimes called B2C",
    likely: "Age, home life, income, and broad interests show up on common consumer lists and ad audiences.",
    groups: [
      {
        id: "age",
        label: "Age",
        options: [
          ["18-24", "18–24"],
          ["25-34", "25–34"],
          ["35-44", "35–44"],
          ["45-54", "45–54"],
          ["55-64", "55–64"],
          ["65+", "65+"]
        ]
      },
      {
        id: "life",
        label: "Home life",
        options: [
          ["homeowner", "Homeowner"],
          ["renter", "Renter"],
          ["parent", "Parent"],
          ["pet", "Pet owner"],
          ["student", "Student"],
          ["retired", "Retired"]
        ]
      },
      {
        id: "income",
        label: "Household income",
        options: [
          ["under50", "Under $50k"],
          ["50-100", "$50–100k"],
          ["100-150", "$100–150k"],
          ["150+", "$150k+"]
        ]
      },
      {
        id: "interests",
        label: "Broad interests",
        options: [
          ["fitness", "Fitness"],
          ["home", "Home"],
          ["food", "Food"],
          ["travel", "Travel"],
          ["learning", "Learning"],
          ["local", "Local events"]
        ]
      }
    ]
  };

  var b2b = {
    id: "b2b",
    label: "Companies",
    caption: "Sometimes called B2B",
    likely: "Role, company size, and industry are how people usually search a professional network.",
    groups: [
      {
        id: "role",
        label: "Role",
        options: [
          ["owner", "Owner"],
          ["operator", "Operator"],
          ["buyer", "Buyer"],
          ["advisor", "Advisor"],
          ["ic", "Individual contributor"]
        ]
      },
      {
        id: "size",
        label: "Company size",
        options: [
          ["solo", "Solo"],
          ["2-10", "2–10"],
          ["11-50", "11–50"],
          ["51-200", "51–200"],
          ["201+", "201+"]
        ]
      },
      {
        id: "industry",
        label: "Industry",
        options: [
          ["local", "Local services"],
          ["health", "Health"],
          ["professional", "Professional"],
          ["retail", "Retail"],
          ["education", "Education"],
          ["trades", "Trades"]
        ]
      }
    ]
  };

  function spec(audience) {
    return audience === "b2b" ? b2b : b2c;
  }

  function allowed(audience) {
    var map = {};
    spec(audience).groups.forEach(function (group) {
      map[group.id] = {};
      group.options.forEach(function (option) { map[group.id][option[0]] = option[1]; });
    });
    return map;
  }

  function emptyParams() {
    return { age: [], life: [], income: [], interests: [], role: [], size: [], industry: [] };
  }

  function sanitize(audience, params) {
    var next = emptyParams();
    var map = allowed(audience === "b2b" ? "b2b" : "b2c");
    Object.keys(next).forEach(function (key) {
      var values = params && Array.isArray(params[key]) ? params[key] : [];
      next[key] = values.filter(function (value) { return map[key] && map[key][value]; });
    });
    return next;
  }

  function labelFor(audience, groupId, value) {
    var map = allowed(audience);
    return (map[groupId] && map[groupId][value]) || value;
  }

  function reach(segment) {
    if (!segment || (segment.audience !== "b2c" && segment.audience !== "b2b")) {
      return {
        level: "open",
        title: "Choose people or companies",
        detail: "People means households. Companies means someone in a role at a business."
      };
    }
    var book = spec(segment.audience);
    var used = book.groups.filter(function (group) {
      return segment.params && segment.params[group.id] && segment.params[group.id].length;
    });
    var custom = (segment.custom || []).length;
    if (!used.length && !custom) {
      return {
        level: "open",
        title: "Not specific yet",
        detail: "Pick a few traits you could actually search for."
      };
    }
    if (!used.length && custom) {
      return {
        level: "hard",
        title: "Hard to find as a list",
        detail: "Traits you invent help you remember who they are. They rarely come as a ready-made list."
      };
    }
    if (used.length <= 2 && !custom) {
      return { level: "likely", title: "Likely findable", detail: book.likely };
    }
    if (used.length === 3 && !custom) {
      return {
        level: "narrow",
        title: "Findable, but a smaller list",
        detail: "You can look. The overlap of this many traits is thinner."
      };
    }
    return {
      level: "hard",
      title: "Hard to find as a ready-made list",
      detail: "This is very specific. Expect to build the list by hand, or drop a trait."
    };
  }

  function suggestName(segment) {
    if (!segment || (segment.audience !== "b2c" && segment.audience !== "b2b")) return "";
    var book = spec(segment.audience);
    var parts = [];
    book.groups.forEach(function (group) {
      var values = segment.params && segment.params[group.id];
      if (values && values.length) parts.push(labelFor(segment.audience, group.id, values[0]));
    });
    if ((segment.custom || []).length && parts.length < 2) parts.push(segment.custom[0].label);
    return parts.slice(0, 2).join(", ");
  }

  NS.audience = {
    b2c: b2c,
    b2b: b2b,
    spec: spec,
    emptyParams: emptyParams,
    sanitize: sanitize,
    labelFor: labelFor,
    reach: reach,
    suggestName: suggestName
  };
})(window.NodeCRM);
