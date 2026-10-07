# NodeCRM

NodeCRM is a static customer-communications plane. Stages run across the top. Personas run down the side, grouped by segment. A node is the communications plan where one persona meets one stage.

Everything stays in this browser (`localStorage`). There is no backend, no build step, and no outbound sending.

## Open locally

Open `index.html` in a browser. Scripts are plain files, so a double-click works.

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

Pages publishes this public repository from `main`. The redesign is on the site after that branch updates.

## What you should see

An empty plane, not a setup wizard. The plane is the whole view. A translucent toolbar floats above it.

- The x-axis starts with **Awareness** and a **+** control for more stages.
- The y-axis starts with one block, **Define your market**. That is the only primary action on an empty plane.
- The background is bluish charcoal with a fine black stipple. There are no grid lines.

The interface follows Apple’s Human Interface Guidelines in a dark-first layout: system type, one accent, glass toolbar and sheets, and short motion. Sheets hold the wizard, node communications, confirms, and the channel map so the plane stays clear. If the system asks to reduce motion, lines and sheets fade instead of traveling. If it asks to reduce transparency, materials become solid.

The market wizard (reopen any time) asks for a target market, segments, and personas. Each segment becomes a row group. **ICP is a badge on a persona**, not its own row. Faces are generated and animated in the page.

**+** adds a stage with any name you choose. **Use these 7 stages** applies a general recommended pipeline:

1. Awareness
2. Consideration
3. Enrollment
4. Service — where you deliver the offering
5. Loyalty
6. Recurring Relationships
7. Advocacy

Every stage name can be renamed, including Awareness. The first stage keeps the channel map even if you rename it. A training company might rename Service to “Training & Experience” (that label shows up in the [AK9I operating system](https://accelanalysis.github.io/AK9I-Operating-System/#s13) as an example, not as NodeCRM’s vocabulary).

Click an empty bubble to create a node. A horizontal line grows from the persona and a vertical line grows from the stage until they meet the bubble. The communications panel then opens. Each node can clone another node, keep the copy and change cadence, keep the cadence and change the copy, rebuild, or start from a template. Channels are email, text/SMS, physical mail, and call tasks (tasks only — nothing is dialed). A node is either **linear** (advance when complete) or **cycle** (stay until an exit).

The first stage’s **Channel map** is a zoomed view: add acquisition channels, wire them, turn leads into contacts, and move contacts to the next stage (Consideration, unless you have already named that step something else).

**Sample market** loads a small demo. **Reset** clears this browser’s copy.

## File structure

```
index.html
.nojekyll
README.md
assets/
  favicon.svg
  stipple.svg
css/
  tokens.css
  base.css
  plane.css
  avatars.css
  ui.css
  wizard.css
  comms.css
  channels.css
js/
  util.js
  registry.js       # comm channels, acquisition kinds, node modes
  storage.js        # localStorage
  avatars.js        # generated faces
  templates.js      # built-in comms templates
  model.js          # state and mutations
  stages.js         # x-axis and recommended pipeline
  personas.js       # y-axis
  nodes.js          # bubbles and cross-lines
  plane.js          # grid
  wizard.js
  comms.js          # node configuration
  channels.js       # first-stage channel map
  ui.js
  demo.js
  app.js
```

## Extending

- Communications channels: `js/registry.js` `commChannels`. The panel, storage merge, and node markers read that list.
- Acquisition channel kinds on the map: `js/registry.js` `acquisitionKinds`.
- Built-in templates: `js/templates.js`.
- Recommended stage names: `js/stages.js` `RECOMMENDED`. Keep the first entry `kind: "awareness"` so the channel map has a home. Names are defaults; users can rename every stage.
- Avatar palettes and hair styles: `js/avatars.js`.

Workspace data is stored under the key `nodecrm.v1`. This redesign keeps that shape. A plane saved by the previous version loads as it is. If the saved value cannot be read, NodeCRM opens an empty plane instead of failing. **Reset** clears this browser’s copy.
