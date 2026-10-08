// Renders one engine decision (src/shared/engine.js) as plain DOM: the inputs, the stage reached,
// every leading candidate with its separate connection to each input, the penalties, the final
// score, notable rejections and the strong pool the word was drawn from. Used by the developer
// panel (?debug=gary) and the private review screen. English only: these are developer tools.

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) node.setAttribute(k, v === true ? "" : String(v));
  for (const child of children.flat()) if (child != null && child !== false) node.append(child instanceof Node ? child : String(child));
  return node;
};
const n2 = x => (typeof x === "number" ? x.toFixed(2) : "");
const n3 = x => (typeof x === "number" ? x.toFixed(3) : "");

/** One line describing the scoring formula, from the decision's own logged configuration. */
export function formulaLine(config) {
  if (!config) return "";
  const w = config.weights, c = config.connection;
  return `final = ${w.connection} × connection + ${w.familiarity} × familiarity + ${w.cue} × cue − one-sided − generic − piece; ` +
    `connection = ${c.weak} × weaker side + ${c.strong} × stronger side (heuristic scores, not probabilities)`;
}

/**
 * @param {any} d an engine decision (or an older one without an engine version)
 * @param {{selected?: string, character?: string}} [options]
 */
export function decisionView(d, options = {}) {
  if (!d) return el("p", {class: "dv-empty"}, "No decision recorded for this round.");
  if (!d.engine) return el("p", {class: "dv-empty"}, `Decision from an older engine (no detailed record). Selected: ${String(d.selected || options.selected || "").toUpperCase()}.`);
  const pair = d.pair ? d.pair.map(w => w.toUpperCase()).join(" + ") : "(opening move)";
  const inputs = (d.inputs || []).map(i => `${i.word.toUpperCase()}${i.known ? ` → ${i.ids.join(" + ")}` : " (unknown to the word graph)"}`).join("; ");
  const facts = [
    ["Engine", `${d.engine} · ${d.dataset}`],
    options.character ? ["Character", `${options.character} (same baseline engine for every character)`] : null,
    ["Latest pair", pair],
    ["Inputs", inputs || "(none)"],
    ["Stage", `${d.stage}${d.lowQuality ? " · LOW QUALITY (automated indicator)" : ""}`],
    ["Selected word", String(d.selected).toUpperCase()],
    d.bands
      ? ["Neighbourhood", Object.entries(d.bands).map(([band, words]) => `${band}: ${words.map(w => w.toUpperCase()).join(", ") || "—"}`).join(" · ")]
      : ["Strong pool", (d.pool || []).map(w => w.toUpperCase()).join(", ") || "(none)"],
    d.band ? ["Band drawn", `${d.band} (shares ${Object.entries(d.config?.sampling?.shares || {}).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(", ")})`] : null,
    ["Blocked words", String(d.blockedCount ?? "")],
    ["Candidates generated", String(d.generated ?? "")],
    ["Seed", String(d.seed ?? "")]
  ].filter(Boolean);
  const dl = el("dl", {class: "dv-facts"}, ...facts.flatMap(([k, v]) => [el("dt", {}, k), el("dd", {class: k === "Selected word" ? "gd-selected" : null}, v)]));
  const [a = "A", b = "B"] = (d.pair || ["A", "B"]).map(w => w.toUpperCase());
  const table = (d.candidates || []).length
    ? el("table", {class: "dv-candidates gd-candidates"},
      el("caption", {}, `Candidate words (reached: ${d.stage}; stage 1 = linked to both words … 6 = only one word). ${formulaLine(d.config)}`),
      el("thead", {}, el("tr", {}, ...["#", "word", "stage", "band", "sources", `→ ${a}`, `→ ${b}`, "weaker", "connection", "familiarity", "cue", "penalties", "final"].map(x => el("th", {scope: "col"}, x)))),
      el("tbody", {}, ...d.candidates.map(c => el("tr", {class: c.word === d.selected ? "gd-pick" : null},
        el("td", {}, String(c.rank)), el("td", {}, c.word), el("td", {}, String(c.stage)), el("td", {}, c.band || ""), el("td", {}, (c.sources || []).join(", ")),
        el("td", {}, `${n2(c.relA)} ${c.kindA}`), el("td", {}, `${n2(c.relB)} ${c.kindB}`), el("td", {}, n2(c.weak)),
        el("td", {}, n3(c.connection)), el("td", {}, n2(c.familiarity)), el("td", {}, n2(c.cue)),
        el("td", {}, [c.oneSided ? `one-sided −${n2(c.oneSided)}` : "", c.generic ? `generic −${n2(c.generic)}` : "", c.piece ? `piece −${n2(c.piece)}` : ""].filter(Boolean).join(", ") || "—"),
        el("td", {}, n3(c.final))))))
    : el("p", {class: "dv-candidates gd-candidates"}, d.pair ? "No scored candidates (fallback word)." : "Opening move: a friendly, familiar word at random.");
  const rejected = (d.rejected || []).length
    ? el("div", {class: "dv-rejected"}, el("strong", {}, "Notable rejected words: "), d.rejected.map(r => `${r.word} (${r.reason})`).join("; "))
    : null;
  return el("div", {class: "decision-view"}, dl, table, rejected);
}
