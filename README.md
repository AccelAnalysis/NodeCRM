# NodeCRM

NodeCRM is a static customer-communications plane. Stages run across the top. Personas run down the side, grouped by who you can find. A node is one step in the nurturing sequence, where one persona meets one stage.

Everything stays in this browser (`localStorage`). There is no backend, no build step, and no outbound sending.

## Prototype, not the product

This repository is a planning prototype. It is not the CRM that will replace Attio.

A later product is a fresh build: accounts, a real database, permissions, delivery, and live audience data. Do not grow this prototype into that system. The communications plan you can click through here is the part worth keeping as a reference.

What works in the prototype:

- A light plane. Stages across, personas down, a step where they meet.
- A market map (regions, or a pin with a radius). The plain-language summary is stored with the market.
- Segments you build from people-or-companies traits, with a simple “can we find them?” read.
- Faces on the plane. Click one to adjust complexion, hair, and clothes.
- Channels chosen from a catalog. Each channel brings the actions that belong to it.
- A short status on every message step: Ready, or Needs consent. Why? opens the checklist.
- Clone a step, keep the words, or keep the timing. Starters are included.
- Company-agnostic labels. The recommended seven stages are a starting set you can rename.

What is only a sketch, or absent:

- Drive time is a straight line at about 25 mph. There is no road network and no paid key.
- “Likely findable” is a rule of thumb, not a data provider and not a promise a list exists.
- Compliance is in the interface. Nothing here sends, dials, or checks a real consent record. A later product has to enforce this on the server.
- The checklist is not legal advice.
- No login, no team, no Attio import, no delivery.

## Open locally

Open `index.html` in a browser. Scripts are plain files, so a double-click works. The map tiles need a network connection. The state list still works if search online does not.

From the repo root you can also serve it:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080/`.

## GitHub Pages

This repo is laid out for a project site from the repository root (`index.html` at `/`).

1. Open the repository **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Branch: `main`. Folder: `/ (root)`. Save.
4. Live site: `https://accelanalysis.github.io/NodeCRM/`

Pages publishes this public repository from `main`.

## What you should see

An empty plane, not a setup wizard. The plane is the whole view. A translucent toolbar floats above it.

- The x-axis starts with **Awareness** and a **+** control for more stages.
- The y-axis starts with one block, **Define your market**. That is the only primary action on an empty plane.
- The background is a calm light gray with a fine stipple. There are no grid lines.

The interface follows Apple’s Human Interface Guidelines in a light layout: system type, one teal accent, a glass toolbar, opaque white sheets, and short motion. The plane stays quiet. Longer notes sit behind Why?. If the system asks to reduce motion, lines and sheets fade instead of traveling. If it asks to reduce transparency, the toolbar becomes solid. Sheets are already opaque.

**Define your market** is four short steps. One group, and one trait group, at a time:

1. **Where.** Optional name, plus a map. Add a state, or click to drop a pin. A pin is miles around a point, or a drive-time sketch (15, 30, 45, or 60). The map line says what you selected.
2. **Find.** People or Companies, then one set of traits. A status says Findable, Narrow, or Hard to list. Why? has the short read.
3. **People.** One person. Pick a starting face, a name, and a role. Best-fit is a badge. Complexion, hair, and clothes are adjusted on the plane.
4. **Review.** Faces, the findability status, and the sender name and address.

**+** adds a stage with any name you choose. **Use these 7 stages** applies a general recommended pipeline:

1. Awareness
2. Consideration
3. Enrollment
4. Service — where you deliver the offering
5. Loyalty
6. Recurring Relationships
7. Advocacy

Every stage name can be renamed, including Awareness. The first stage keeps the channel map even if you rename it. A training company might rename Service to “Training & Experience” (that label shows up in the [AK9I operating system](https://accelanalysis.github.io/AK9I-Operating-System/#s13) as an example, not as NodeCRM’s vocabulary).

Click an empty bubble to start a step. The first empty bubble on a person says **Start**. The step sheet shows one channel at a time:

- **Add** opens a short menu. Direct is SMS, Email, and Phone. Social is LinkedIn, Instagram, Facebook, X, TikTok, and YouTube, plus a network you name. In person and on paper is expo, other event, met in person, referral, direct mail, and site visit. Something else is at the bottom of the menu.
- The selected channel shows its actions, how often, and a status: **Ready** or **Needs consent** (or **Not ready** when something else is still open). **Why?** opens the checks, quiet hours (8:00 a.m. to 9:00 p.m. local, for text and phone), and the lines added for you: mailing address and unsubscribe on email, “Reply STOP to opt out” on text.
- Email needs agreement, an honest subject, and a sender name plus physical mailing address. Unsubscribe means stop within 10 business days. A phone number alone is not consent to text. Phone is a task for a person. Nothing is dialed or auto-dialed.
- Wording that describes automatic dialing, a recorded voice, or a bought list asks you to confirm before it stays. A faster-than-default pace does the same.
- Do not contact stays on the channel map. Someone who asked to stop cannot move ahead until you confirm they asked to come back.

Faces sit on the plane, over the row, not inside a card. Click a face to change complexion, hair, clothes, and glasses for that person only.

Each stage after the first can carry one trigger, such as Form, Pitch, Contract, Service date, or Job complete. The suggested seven stages start with Form into Consideration, Contract into Enrollment, Service date into Service, Job complete into Loyalty, Renewal into Recurring Relationships, and Referral into Advocacy. On a step, the trigger button (Form → Consideration) is a local sketch of that advance. Nothing listens for a real form or contract.

**Plan** in the toolbar lists each step’s status. Why? shows what is still open. Not legal advice sits behind that same kind of disclosure.

A step can start from another step, keep the words and change the timing, keep the timing and change the words, or use a starter. Starters do not check consent for you.

The first stage’s **Channel map** uses the same menu. Add a channel, turn on its actions, connect channels, and move people forward. Moving someone ahead is not a consent check. The people list shows one group at a time: Stopped, New, In plan, or Ahead.

**Sample market** loads a small demo. The sample email is intentionally not ready until you check consent. **Reset** clears this browser’s copy.

## File structure

```
index.html
.nojekyll
README.md
assets/
  favicon.svg
  stipple.svg
  vendor/           # Leaflet, local so the page does not depend on a CDN
css/
  tokens.css
  base.css
  plane.css
  avatars.css
  ui.css
  wizard.css
  comms.css
  channels.css
  guide.css         # map, chips, checklist, reach
js/
  util.js
  registry.js       # channel catalog
  audience.js       # people / companies traits and the findability read
  compliance.js     # checklist rules, footers, risky wording
  geo.js            # market map and plain-language summary
  storage.js        # localStorage
  avatars.js        # preset faces
  templates.js      # starters
  model.js
  stages.js
  personas.js
  nodes.js
  plane.js
  wizard.js
  comms.js
  channels.js
  plan.js           # Plan status
  dress.js          # persona dress-up on the plane
  ui.js
  demo.js
  app.js
```

## Extending

- Channels: `js/registry.js`. Give each one actions and a `compliance` checklist. The step panel, the map, and storage read that list.
- Findability traits: `js/audience.js`.
- Checklist copy: `js/compliance.js`. Keep it in plain language. Do not pretend the browser can enforce a statute.
- Starters: `js/templates.js`. Leave consent unchecked.
- Stage triggers: `js/registry.js` `stageEvents`. A stage stores `advanceOn`. This is a sketch in the browser, not a live event.
- Recommended stage names: `js/stages.js` `RECOMMENDED`. Keep the first entry `kind: "awareness"`.
- Avatar presets: `js/avatars.js`.

Workspace data is stored under the key `nodecrm.v1`. Older planes still load. Missing fields become empty checklists, not errors. If the saved value cannot be read, NodeCRM opens an empty plane. **Reset** clears this browser’s copy.

Map tiles are © OpenStreetMap contributors. Place search uses the public Nominatim service when the network allows. The built-in state list does not.
