import { useState, useEffect, useCallback, useRef, memo } from "react";
import storage from "./storage";
import DEFAULT_HYMNS from "./hymns";

// ── CONSTANTS ──
const WARD_NAME = "Parrish Canyon";
const STAKE_NAME = "Centerville";

const EMPTY_AGENDA = {
  date: "",
  wardName: WARD_NAME,
  stakeName: STAKE_NAME,
  presiding: "",
  conducting: "",
  chorister: "",
  organist: "",
  openingHymn: { number: "", title: "" },
  invocation: "",
  wardBusiness: {
    callings: [{ name: "", calling: "" }],
    releases: [{ name: "", calling: "" }],
    ordinations: [{ name: "", office: "" }],
    babyBlessings: [{ name: "" }],
    confirmations: [{ name: "" }],
    newMembers: [{ name: "" }],
    other: "",
  },
  sacramentHymn: { number: "", title: "" },
  speakers: [{ name: "", topic: "" }],
  youthSpeakers: [{ name: "", topic: "" }],
  musicalNumbers: [{ performer: "", title: "" }],
  intermediateHymn: { number: "", title: "" },
  closingHymn: { number: "", title: "" },
  benediction: "",
  announcements: "",
  isPrimaryProgram: false,
  primaryProgramNotes: "",
};

const BIZ_SECTIONS = {
  callings: { itemLabel: "Calling", fields: ["name", "calling"], labels: ["Name", "Calling"] },
  releases: { itemLabel: "Release", fields: ["name", "calling"], labels: ["Name", "Calling"] },
  ordinations: { itemLabel: "Ordination", fields: ["name", "office"], labels: ["Name", "Office"] },
  babyBlessings: { itemLabel: "Baby Blessing", fields: ["name"], labels: ["Name"] },
  confirmations: { itemLabel: "Confirmation", fields: ["name"], labels: ["Name"] },
  newMembers: { itemLabel: "New Member", fields: ["name"], labels: ["Name"] },
};

function getNextSunday() {
  const d = new Date();
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
  // If today is Sunday, use today
  if (new Date().getDay() === 0) d.setDate(new Date().getDate());
  return d.toISOString().split("T")[0];
}

function formatDate(s) {
  if (!s) return "";
  return new Date(s + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

// ── COLLAPSIBLE SECTION ──
const Section = memo(function Section({ label, isOpen, onToggle, children }) {
  return (
    <div style={S.secBlock}>
      <button style={S.secToggle} onClick={onToggle} type="button">
        <span style={S.secArrow}>{isOpen ? "▾" : "▸"}</span>
        <span style={S.secLabel}>{label}</span>
      </button>
      {isOpen && <div style={S.secContent}>{children}</div>}
    </div>
  );
});

// ── HYMN INPUT ──
const HymnInput = memo(function HymnInput({ label, hymn, onChange, allHymns }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const ref = useRef(null);

  const onNum = (val) => {
    const num = parseInt(val);
    if (allHymns[num]) {
      onChange({ number: val, title: allHymns[num] });
      setSuggestions([]); setShowSug(false);
    } else {
      onChange({ number: val, title: val ? (hymn?.title || "") : "" });
    }
  };

  const onTitle = (val) => {
    onChange({ number: hymn?.number || "", title: val });
    if (val.length >= 2) {
      const l = val.toLowerCase();
      const m = Object.entries(allHymns).filter(([_, t]) => t.toLowerCase().includes(l)).slice(0, 8);
      setSuggestions(m); setShowSug(m.length > 0);
    } else { setSuggestions([]); setShowSug(false); }
  };

  const pick = (n, t) => { onChange({ number: String(n), title: t }); setSuggestions([]); setShowSug(false); };

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowSug(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div style={S.hymnRow} ref={ref}>
      <label style={S.fieldLabel}>{label}</label>
      <div style={S.hymnInputs}>
        <input style={S.hymnNum} type="text" placeholder="#" value={hymn?.number || ""} onChange={e => onNum(e.target.value)} />
        <div style={{ flex: 1, position: "relative" }}>
          <input style={S.hymnTitle} type="text" placeholder="Hymn title (type to search)" value={hymn?.title || ""}
            onChange={e => onTitle(e.target.value)} onFocus={() => { if (suggestions.length) setShowSug(true); }} />
          {showSug && (
            <div style={S.sugBox}>
              {suggestions.map(([n, t]) => (
                <button key={n} style={S.sugItem} type="button" onMouseDown={e => { e.preventDefault(); pick(n, t); }}>
                  <span style={S.sugNum}>#{n}</span> {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ── NAME DROPDOWN ──
const NameDropdown = memo(function NameDropdown({ label, value, options, onChange }) {
  const [isCustom, setIsCustom] = useState(false);

  if (options.length === 0) {
    return (<div><label style={S.fieldLabel}>{label}</label>
      <input style={S.input} type="text" placeholder="Name" value={value || ""} onChange={e => onChange(e.target.value)} /></div>);
  }
  if (isCustom || (value && !options.includes(value))) {
    return (<div><label style={S.fieldLabel}>{label}</label>
      <div style={{ display: "flex", gap: 6 }}>
        <input style={{ ...S.input, flex: 1 }} type="text" placeholder="Type a name" value={value || ""} onChange={e => onChange(e.target.value)} />
        <button style={S.switchBtn} type="button" onClick={() => { setIsCustom(false); onChange(""); }}>▾</button>
      </div></div>);
  }
  return (<div><label style={S.fieldLabel}>{label}</label>
    <select style={S.select} value={value || ""} onChange={e => { const v = e.target.value; if (v === "__custom__") { setIsCustom(true); onChange(""); } else { setIsCustom(false); onChange(v); } }}>
      <option value="">— Select —</option>
      {options.map((n, i) => <option key={i} value={n}>{n}</option>)}
      <option value="__custom__">Other (type a name)...</option>
    </select></div>);
});

// ── SETTINGS MODAL (names + hymns) ──
function SettingsModal({ isOpen, onClose, nameGroups, onSaveNames, customHymns, onSaveHymns }) {
  const [groups, setGroups] = useState(nameGroups);
  const [newName, setNewName] = useState({ presiding: "", conducting: "", chorister: "", organist: "" });
  const [hymns, setHymns] = useState(customHymns);
  const [newHymn, setNewHymn] = useState({ number: "", title: "" });
  const [csvFile, setCsvFile] = useState(null);
  const [tab, setTab] = useState("names"); // names | hymns

  useEffect(() => { setGroups(nameGroups); setHymns(customHymns); setCsvFile(null); }, [nameGroups, customHymns]);

  if (!isOpen) return null;

  const addName = (group) => {
    const v = newName[group]?.trim();
    if (!v) return;
    setGroups(p => ({ ...p, [group]: [...(p[group] || []), v] }));
    setNewName(p => ({ ...p, [group]: "" }));
  };
  const removeName = (group, idx) => {
    setGroups(p => ({ ...p, [group]: p[group].filter((_, i) => i !== idx) }));
  };
  const addHymn = () => {
    const num = newHymn.number.trim();
    const title = newHymn.title.trim();
    if (!num || !title) return;
    setHymns(p => ({ ...p, [num]: title }));
    setNewHymn({ number: "", title: "" });
  };
  const removeHymn = (num) => {
    setHymns(p => { const n = { ...p }; delete n[num]; return n; });
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      const newHymns = {};

      lines.forEach(line => {
        const parts = line.split(',').map(part => part.trim().replace(/"/g, ''));
        if (parts.length >= 2) {
          const number = parts[0];
          const title = parts[1];
          if (number && title) {
            newHymns[number] = title;
          }
        }
      });

      if (Object.keys(newHymns).length > 0) {
        setHymns(p => ({ ...p, ...newHymns }));
        setCsvFile(null);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };
  const handleSave = () => { onSaveNames(groups); onSaveHymns(hymns); onClose(); };

  const nameCfgs = {
    presiding: { label: "Presiding", hint: "Bishopric members, stake leaders, visiting authorities" },
    conducting: { label: "Conducting", hint: "Bishopric members, stake leaders, visiting authorities" },
    chorister: { label: "Choristers", hint: "Ward chorister(s)" },
    organist: { label: "Organists", hint: "Ward organist(s) / pianist(s)" },
  };

  return (
    <div style={M.overlay} onClick={onClose}>
      <div style={M.box} onClick={e => e.stopPropagation()}>
        <div style={M.header}>
          <h3 style={M.title}>Settings</h3>
          <button style={M.closeBtn} type="button" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div style={M.tabs}>
          <button style={tab === "names" ? M.tabActive : M.tab} type="button" onClick={() => setTab("names")}>Name Lists</button>
          <button style={tab === "hymns" ? M.tabActive : M.tab} type="button" onClick={() => setTab("hymns")}>Custom Hymns</button>
        </div>

        <div style={M.body}>
          {tab === "names" && Object.entries(nameCfgs).map(([key, cfg]) => (
            <div key={key} style={M.group}>
              <div style={M.groupLabel}>{cfg.label}</div>
              <div style={M.groupHint}>{cfg.hint}</div>
              <div style={M.nameList}>
                {(groups[key] || []).map((name, idx) => (
                  <div key={idx} style={M.nameTag}>
                    <span>{name}</span>
                    <button style={M.nameRemove} type="button" onClick={() => removeName(key, idx)}>✕</button>
                  </div>
                ))}
              </div>
              <div style={M.addRow}>
                <input style={M.addInput} type="text" placeholder="Add name..."
                  value={newName[key] || ""} onChange={e => setNewName(p => ({ ...p, [key]: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addName(key); } }} />
                <button style={M.addBtnS} type="button" onClick={() => addName(key)}>Add</button>
              </div>
            </div>
          ))}

          {tab === "hymns" && (
            <div>
              <p style={M.groupHint}>Add new hymns from "Hymns—For Home and Church" or other sources as they're released. These supplement the built-in 1985 hymnal.</p>

              <div style={M.csvSection}>
                <div style={M.csvLabel}>Upload CSV File</div>
                <p style={{ ...M.groupHint, marginBottom: 8 }}>Upload a CSV file with hymn numbers and titles (format: number,title)</p>
                <input type="file" accept=".csv" onChange={handleCsvUpload} style={M.csvInput} />
              </div>

              <div style={M.divider}>OR</div>

              <div style={{ ...M.addRow, marginBottom: 12 }}>
                <input style={{ ...M.addInput, width: 70, flex: "none" }} type="text" placeholder="#"
                  value={newHymn.number} onChange={e => setNewHymn(p => ({ ...p, number: e.target.value }))} />
                <input style={M.addInput} type="text" placeholder="Hymn title"
                  value={newHymn.title} onChange={e => setNewHymn(p => ({ ...p, title: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addHymn(); } }} />
                <button style={M.addBtnS} type="button" onClick={addHymn}>Add</button>
              </div>
              {Object.keys(hymns).length === 0 ? (
                <p style={{ ...M.groupHint, textAlign: "center", padding: 16 }}>No custom hymns added yet.</p>
              ) : (
                <div style={M.hymnList}>
                  {Object.entries(hymns).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([num, title]) => (
                    <div key={num} style={M.hymnItem}>
                      <span style={M.hymnNum}>#{num}</span>
                      <span style={M.hymnTitle}>{title}</span>
                      <button style={M.nameRemove} type="button" onClick={() => removeHymn(num)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={M.footer}>
          <button style={M.cancelBtn} type="button" onClick={onClose}>Cancel</button>
          <button style={M.saveBtn} type="button" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ──
export default function App() {
  const [agenda, setAgenda] = useState(null);
  const [nameGroups, setNameGroups] = useState({ presiding: [], conducting: [], chorister: [], organist: [] });
  const [customHymns, setCustomHymns] = useState({});
  const [allHymns, setAllHymns] = useState(DEFAULT_HYMNS);
  const [savedAgendas, setSavedAgendas] = useState([]);
  const [view, setView] = useState("edit");
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [expanded, setExpanded] = useState({
    wardBusiness: true, speakers: true, youthSpeakers: false,
    musicalNumbers: false, primary: false,
  });

  const agendaRef = useRef(null);
  agendaRef.current = agenda;

  // Merge default + custom hymns whenever custom changes
  useEffect(() => {
    setAllHymns({ ...DEFAULT_HYMNS, ...customHymns });
  }, [customHymns]);

  useEffect(() => {
    async function init() {
      try {
        let names = { presiding: [], conducting: [], chorister: [], organist: [] };
        try { const r = await storage.get("agenda-name-groups"); if (r?.value) names = JSON.parse(r.value); } catch {}
        // Migrate old "leadership" key to separate presiding/conducting
        if (names.leadership && !names.presiding) { names.presiding = [...names.leadership]; names.conducting = [...names.leadership]; delete names.leadership; }
        // Migrate old "music" key if present
        if (names.music && !names.chorister) { names.chorister = names.music; names.organist = [...names.music]; delete names.music; }
        if (!names.presiding) names.presiding = [];
        if (!names.conducting) names.conducting = [];
        if (!names.chorister) names.chorister = [];
        if (!names.organist) names.organist = [];
        setNameGroups(names);

        let ch = {};
        try { const r = await storage.get("agenda-custom-hymns"); if (r?.value) ch = JSON.parse(r.value); } catch {}
        setCustomHymns(ch);

        let list = [];
        try { const r = await storage.get("agenda-list"); if (r?.value) list = JSON.parse(r.value); } catch {}
        setSavedAgendas(list);

        setAgenda({ ...JSON.parse(JSON.stringify(EMPTY_AGENDA)), date: getNextSunday() });
      } catch {
        setAgenda({ ...JSON.parse(JSON.stringify(EMPTY_AGENDA)), date: getNextSunday() });
      }
      setLoading(false);
    }
    init();
  }, []);

  const updateField = useCallback((path, value) => {
    setAgenda(prev => {
      if (!prev) return prev;
      const keys = path.split(".");
      const next = { ...prev };
      if (keys.length === 1) { next[keys[0]] = value; return next; }
      if (keys.length === 2) {
        if (!isNaN(parseInt(keys[1]))) { next[keys[0]] = [...prev[keys[0]]]; next[keys[0]][parseInt(keys[1])] = value; }
        else { next[keys[0]] = { ...prev[keys[0]], [keys[1]]: value }; }
        return next;
      }
      if (keys.length === 3) {
        const [k0, k1, k2] = keys;
        if (k0 === "wardBusiness") {
          next.wardBusiness = { ...prev.wardBusiness, [k1]: [...prev.wardBusiness[k1]] };
          if (!isNaN(parseInt(k2))) next.wardBusiness[k1][parseInt(k2)] = value;
          else next.wardBusiness[k1] = { ...prev.wardBusiness[k1], [k2]: value };
        } else {
          next[k0] = [...prev[k0]];
          next[k0][parseInt(k1)] = { ...prev[k0][parseInt(k1)], [k2]: value };
        }
        return next;
      }
      if (keys.length === 4) {
        const [, section, idxStr, field] = keys;
        const idx = parseInt(idxStr);
        next.wardBusiness = { ...prev.wardBusiness };
        next.wardBusiness[section] = [...prev.wardBusiness[section]];
        next.wardBusiness[section][idx] = { ...prev.wardBusiness[section][idx], [field]: value };
        return next;
      }
      return next;
    });
  }, []);

  const addListItem = useCallback((section, template) => {
    setAgenda(prev => {
      if (!prev) return prev;
      const next = { ...prev };
      if (section.startsWith("wardBusiness.")) {
        const sub = section.split(".")[1];
        next.wardBusiness = { ...prev.wardBusiness, [sub]: [...prev.wardBusiness[sub], { ...template }] };
      } else { next[section] = [...prev[section], { ...template }]; }
      return next;
    });
  }, []);

  const removeListItem = useCallback((section, idx) => {
    setAgenda(prev => {
      if (!prev) return prev;
      const next = { ...prev };
      if (section.startsWith("wardBusiness.")) {
        const sub = section.split(".")[1];
        const arr = [...prev.wardBusiness[sub]];
        if (arr.length > 1) arr.splice(idx, 1);
        else arr[0] = Object.fromEntries(Object.keys(arr[0]).map(k => [k, ""]));
        next.wardBusiness = { ...prev.wardBusiness, [sub]: arr };
      } else {
        const arr = [...prev[section]];
        if (arr.length > 1) arr.splice(idx, 1);
        else arr[0] = Object.fromEntries(Object.keys(arr[0]).map(k => [k, ""]));
        next[section] = arr;
      }
      return next;
    });
  }, []);

  const saveAgenda = useCallback(async () => {
    const a = agendaRef.current;
    if (!a) return;
    try {
      await storage.set(`agenda:${a.date}`, JSON.stringify(a));
      setSavedAgendas(prev => {
        const nl = [...new Set([a.date, ...prev])].sort((x, y) => y.localeCompare(x));
        storage.set("agenda-list", JSON.stringify(nl)).catch(() => {});
        return nl;
      });
      setSaveStatus("Saved!"); setTimeout(() => setSaveStatus(""), 2000);
    } catch { setSaveStatus("Error"); setTimeout(() => setSaveStatus(""), 3000); }
  }, []);

  const saveNameGroups = useCallback(async (g) => {
    setNameGroups(g);
    try { await storage.set("agenda-name-groups", JSON.stringify(g)); } catch {}
  }, []);

  const saveCustomHymns = useCallback(async (h) => {
    setCustomHymns(h);
    try { await storage.set("agenda-custom-hymns", JSON.stringify(h)); } catch {}
  }, []);

  const loadAgenda = useCallback(async (date) => {
    try {
      const r = await storage.get(`agenda:${date}`);
      if (r?.value) {
        const loaded = JSON.parse(r.value);
        const merged = { ...JSON.parse(JSON.stringify(EMPTY_AGENDA)), ...loaded };
        merged.wardBusiness = { ...JSON.parse(JSON.stringify(EMPTY_AGENDA.wardBusiness)), ...(loaded.wardBusiness || {}) };
        setAgenda(merged); setView("edit");
      }
    } catch {}
  }, []);

  const deleteAgenda = useCallback(async (date) => {
    try {
      await storage.delete(`agenda:${date}`);
      setSavedAgendas(prev => {
        const nl = prev.filter(d => d !== date);
        storage.set("agenda-list", JSON.stringify(nl)).catch(() => {});
        return nl;
      });
    } catch {}
  }, []);

  const newAgenda = useCallback(() => {
    setAgenda({ ...JSON.parse(JSON.stringify(EMPTY_AGENDA)), date: getNextSunday() });
    setView("edit");
  }, []);

  const duplicateAgenda = useCallback(() => {
    setAgenda(prev => {
      if (!prev) return prev;
      const nd = new Date(prev.date + "T12:00:00");
      nd.setDate(nd.getDate() + 7);
      return {
        ...JSON.parse(JSON.stringify(EMPTY_AGENDA)),
        date: nd.toISOString().split("T")[0],
        presiding: prev.presiding, conducting: prev.conducting,
        chorister: prev.chorister, organist: prev.organist,
      };
    });
    setView("edit");
  }, []);

  const toggle = useCallback((k) => setExpanded(p => ({ ...p, [k]: !p[k] })), []);

  if (loading || !agenda) return <div style={S.loadWrap}><p style={S.loadText}>Loading...</p></div>;

  // ── PREVIEW ──
  if (view === "preview") {
    const hasBiz = Object.entries(agenda.wardBusiness).some(([k, v]) => {
      if (k === "other") return v?.trim();
      return Array.isArray(v) && v.some(it => Object.values(it).some(x => x?.trim()));
    });
    const HL = ({ label, h }) => {
      if (!h?.number && !h?.title) return null;
      return (<div style={S.pItem}><span style={S.pItemL}>{label}</span>
        <span style={S.pItemV}>{h.number && `#${h.number}`}{h.number && h.title && " — "}{h.title}</span></div>);
    };
    return (
      <div style={S.prevOuter}>
        <div style={S.noPrint}>
          <button style={S.backBtn} type="button" onClick={() => setView("edit")}>← Back to Edit</button>
          <button style={S.printBtn} type="button" onClick={() => window.print()}>🖨 Print</button>
        </div>
        <div style={S.printPage}>
          <div style={S.printHdr}>
            <h1 style={S.printT}>Sacrament Meeting</h1>
            <h2 style={S.printWard}>{agenda.wardName} Ward{agenda.stakeName ? ` — ${agenda.stakeName} Stake` : ""}</h2>
            <p style={S.printDate}>{formatDate(agenda.date)}</p>
          </div>
          <div style={S.printGrid}>
            {[["Presiding", agenda.presiding], ["Conducting", agenda.conducting], ["Chorister", agenda.chorister], ["Organist", agenda.organist]].map(([l, v]) => (
              <div key={l} style={S.printRow}><span style={S.printLbl}>{l}</span><span style={S.printVal}>{v || "—"}</span></div>
            ))}
          </div>
          <div style={S.printDiv} />
          {agenda.announcements?.trim() && <div style={{ ...S.pItem, flexDirection: "column" }}><span style={S.pItemL}>Announcements</span><p style={S.pNote}>{agenda.announcements}</p></div>}
          <HL label="Opening Hymn" h={agenda.openingHymn} />
          <div style={S.pItem}><span style={S.pItemL}>Invocation</span><span style={S.pItemV}>{agenda.invocation || "—"}</span></div>
          {hasBiz && (
            <div style={S.pBizSec}>
              <span style={S.pSecT}>Ward Business</span>
              {Object.entries(BIZ_SECTIONS).map(([key, cfg]) => {
                const items = agenda.wardBusiness[key]?.filter(it => Object.values(it).some(v => v?.trim()));
                if (!items?.length) return null;
                return (<div key={key} style={S.pBizGrp}><span style={S.pBizLbl}>{cfg.itemLabel}s</span>
                  {items.map((it, i) => <div key={i} style={S.pBizItem}>{cfg.fields.map(f => it[f]).filter(Boolean).join(" — ")}</div>)}</div>);
              })}
              {agenda.wardBusiness.other?.trim() && <div style={S.pBizGrp}><span style={S.pBizLbl}>Other</span><div style={S.pBizItem}>{agenda.wardBusiness.other}</div></div>}
            </div>
          )}
          <HL label="Sacrament Hymn" h={agenda.sacramentHymn} />
          <div style={S.pItem}><span style={S.pItemL}>Administration of the Sacrament</span></div>
          {agenda.isPrimaryProgram ? (
            <div style={S.pBizSec}><span style={S.pSecT}>Primary Program</span>{agenda.primaryProgramNotes && <p style={S.pNote}>{agenda.primaryProgramNotes}</p>}</div>
          ) : (<>
            {agenda.youthSpeakers.filter(s => s.name?.trim()).map((s, i) => <div key={`ys${i}`} style={S.pItem}><span style={S.pItemL}>Youth Speaker</span><span style={S.pItemV}>{s.name}{s.topic ? ` — ${s.topic}` : ""}</span></div>)}
            {agenda.speakers.filter(s => s.name?.trim()).map((s, i) => <div key={`sp${i}`} style={S.pItem}><span style={S.pItemL}>Speaker</span><span style={S.pItemV}>{s.name}{s.topic ? ` — ${s.topic}` : ""}</span></div>)}
            {agenda.musicalNumbers.filter(m => m.performer?.trim() || m.title?.trim()).map((m, i) => <div key={`mn${i}`} style={S.pItem}><span style={S.pItemL}>Musical Number</span><span style={S.pItemV}>{m.title}{m.title && m.performer ? " — " : ""}{m.performer}</span></div>)}
          </>)}
          <HL label="Intermediate Hymn" h={agenda.intermediateHymn} />
          <HL label="Closing Hymn" h={agenda.closingHymn} />
          <div style={S.pItem}><span style={S.pItemL}>Benediction</span><span style={S.pItemV}>{agenda.benediction || "—"}</span></div>
        </div>
        <style>{`@media print{.no-print{display:none!important}}`}</style>
      </div>
    );
  }

  // ── HISTORY ──
  if (view === "history") {
    return (
      <div style={S.container}>
        <div style={S.topBar}>
          <button style={S.backBtnDk} type="button" onClick={() => setView("edit")}>← Back</button>
          <h2 style={S.histTitle}>Saved Agendas</h2>
        </div>
        {savedAgendas.length === 0 ? <p style={S.empty}>No saved agendas yet.</p> : (
          <div style={S.histList}>
            {savedAgendas.map(d => (
              <div key={d} style={S.histItem}>
                <button style={S.histBtn} type="button" onClick={() => loadAgenda(d)}><span>{formatDate(d)}</span><span style={S.histArr}>→</span></button>
                <button style={S.histDel} type="button" onClick={() => { if (confirm("Delete this agenda?")) deleteAgenda(d); }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── EDIT ──
  return (
    <div style={S.container}>
      <div style={S.toolbar}>
        <div style={S.tbLeft}><h1 style={S.appTitle}>Sacrament Meeting</h1></div>
        <div style={S.tbRight}>
          <button style={S.toolBtn} type="button" onClick={() => setShowSettings(true)}>⚙ Settings</button>
          <button style={S.toolBtn} type="button" onClick={() => setView("history")}>📋 History</button>
          <button style={S.toolBtn} type="button" onClick={newAgenda}>＋ New</button>
          <button style={S.toolBtn} type="button" onClick={duplicateAgenda}>⧉ Next Week</button>
          <button style={S.toolBtn} type="button" onClick={() => setView("preview")}>🖨 Print</button>
          <button style={S.saveBtn} type="button" onClick={saveAgenda}>{saveStatus || "💾 Save"}</button>
        </div>
      </div>

      <div style={S.formBody}>
        <div style={S.fieldGroup}>
          <div style={S.fRow}>
            <div style={S.fHalf}><label style={S.fieldLabel}>Date</label><input style={S.input} type="date" value={agenda.date} onChange={e => updateField("date", e.target.value)} /></div>
          </div>
          <div style={S.fRow}>
            <div style={S.fHalf}><label style={S.fieldLabel}>Ward</label><input style={S.input} type="text" value={agenda.wardName} onChange={e => updateField("wardName", e.target.value)} /></div>
            <div style={S.fHalf}><label style={S.fieldLabel}>Stake</label><input style={S.input} type="text" value={agenda.stakeName} onChange={e => updateField("stakeName", e.target.value)} /></div>
          </div>
        </div>

        <div style={S.fieldGroup}>
          <div style={S.fRow}>
            <div style={S.fHalf}><NameDropdown label="Presiding" value={agenda.presiding} options={nameGroups.presiding || []} onChange={v => updateField("presiding", v)} /></div>
            <div style={S.fHalf}><NameDropdown label="Conducting" value={agenda.conducting} options={nameGroups.conducting || []} onChange={v => updateField("conducting", v)} /></div>
          </div>
          <div style={S.fRow}>
            <div style={S.fHalf}><NameDropdown label="Chorister" value={agenda.chorister} options={nameGroups.chorister || []} onChange={v => updateField("chorister", v)} /></div>
            <div style={S.fHalf}><NameDropdown label="Organist" value={agenda.organist} options={nameGroups.organist || []} onChange={v => updateField("organist", v)} /></div>
          </div>
        </div>

        <HymnInput label="Opening Hymn" hymn={agenda.openingHymn} onChange={v => updateField("openingHymn", v)} allHymns={allHymns} />
        <div style={S.fieldGroup}><label style={S.fieldLabel}>Invocation</label><input style={S.input} type="text" placeholder="Name" value={agenda.invocation} onChange={e => updateField("invocation", e.target.value)} /></div>

        <Section label="Ward Business" isOpen={expanded.wardBusiness} onToggle={() => toggle("wardBusiness")}>
          {Object.entries(BIZ_SECTIONS).map(([key, cfg]) => (
            <div key={key} style={S.bizSub}>
              <div style={S.subLabel}>{cfg.itemLabel}s</div>
              {(agenda.wardBusiness[key] || []).map((item, idx) => (
                <div key={`wb-${key}-${idx}`} style={S.listRow}>
                  {cfg.fields.map(f => (
                    <input key={`wb-${key}-${idx}-${f}`} style={cfg.fields.length === 1 ? S.listFull : S.listIn}
                      type="text" placeholder={cfg.labels[cfg.fields.indexOf(f)]} value={item[f] || ""}
                      onChange={e => updateField(`wardBusiness.${key}.${idx}.${f}`, e.target.value)} />
                  ))}
                  <button style={S.rmBtn} type="button" onClick={() => removeListItem(`wardBusiness.${key}`, idx)}>✕</button>
                </div>
              ))}
              <button style={S.addBtn} type="button" onClick={() => addListItem(`wardBusiness.${key}`, Object.fromEntries(cfg.fields.map(f => [f, ""])))}>+ Add {cfg.itemLabel}</button>
            </div>
          ))}
          <div style={S.bizSub}><div style={S.subLabel}>Other Business</div>
            <textarea style={S.ta} rows={2} placeholder="Any other ward business..." value={agenda.wardBusiness.other || ""} onChange={e => updateField("wardBusiness.other", e.target.value)} /></div>
        </Section>

        <HymnInput label="Sacrament Hymn" hymn={agenda.sacramentHymn} onChange={v => updateField("sacramentHymn", v)} allHymns={allHymns} />

        <Section label="Primary Program" isOpen={expanded.primary} onToggle={() => toggle("primary")}>
          <div style={S.chkRow}><input type="checkbox" id="pt" checked={agenda.isPrimaryProgram} onChange={e => updateField("isPrimaryProgram", e.target.checked)} style={S.chk} />
            <label htmlFor="pt" style={S.chkLbl}>This week is the Primary Program</label></div>
          {agenda.isPrimaryProgram && <textarea style={S.ta} rows={3} placeholder="Program notes..." value={agenda.primaryProgramNotes} onChange={e => updateField("primaryProgramNotes", e.target.value)} />}
        </Section>

        <Section label="Speakers" isOpen={expanded.speakers} onToggle={() => toggle("speakers")}>
          {agenda.speakers.map((s, i) => (
            <div key={`spk-${i}`} style={S.listRow}>
              <input style={S.listIn} type="text" placeholder="Name" value={s.name} onChange={e => updateField(`speakers.${i}.name`, e.target.value)} />
              <input style={S.listIn} type="text" placeholder="Topic" value={s.topic} onChange={e => updateField(`speakers.${i}.topic`, e.target.value)} />
              <button style={S.rmBtn} type="button" onClick={() => removeListItem("speakers", i)}>✕</button>
            </div>
          ))}
          <button style={S.addBtn} type="button" onClick={() => addListItem("speakers", { name: "", topic: "" })}>+ Add Speaker</button>
        </Section>

        <Section label="Youth Speakers" isOpen={expanded.youthSpeakers} onToggle={() => toggle("youthSpeakers")}>
          {agenda.youthSpeakers.map((s, i) => (
            <div key={`yspk-${i}`} style={S.listRow}>
              <input style={S.listIn} type="text" placeholder="Name" value={s.name} onChange={e => updateField(`youthSpeakers.${i}.name`, e.target.value)} />
              <input style={S.listIn} type="text" placeholder="Topic" value={s.topic} onChange={e => updateField(`youthSpeakers.${i}.topic`, e.target.value)} />
              <button style={S.rmBtn} type="button" onClick={() => removeListItem("youthSpeakers", i)}>✕</button>
            </div>
          ))}
          <button style={S.addBtn} type="button" onClick={() => addListItem("youthSpeakers", { name: "", topic: "" })}>+ Add Youth Speaker</button>
        </Section>

        <Section label="Musical Numbers / Special Items" isOpen={expanded.musicalNumbers} onToggle={() => toggle("musicalNumbers")}>
          {agenda.musicalNumbers.map((m, i) => (
            <div key={`mus-${i}`} style={S.listRow}>
              <input style={S.listIn} type="text" placeholder="Title" value={m.title} onChange={e => updateField(`musicalNumbers.${i}.title`, e.target.value)} />
              <input style={S.listIn} type="text" placeholder="Performer(s)" value={m.performer} onChange={e => updateField(`musicalNumbers.${i}.performer`, e.target.value)} />
              <button style={S.rmBtn} type="button" onClick={() => removeListItem("musicalNumbers", i)}>✕</button>
            </div>
          ))}
          <button style={S.addBtn} type="button" onClick={() => addListItem("musicalNumbers", { performer: "", title: "" })}>+ Add Musical Number</button>
        </Section>

        <HymnInput label="Intermediate Hymn" hymn={agenda.intermediateHymn} onChange={v => updateField("intermediateHymn", v)} allHymns={allHymns} />
        <HymnInput label="Closing Hymn" hymn={agenda.closingHymn} onChange={v => updateField("closingHymn", v)} allHymns={allHymns} />

        <div style={S.fieldGroup}><label style={S.fieldLabel}>Benediction</label><input style={S.input} type="text" placeholder="Name" value={agenda.benediction} onChange={e => updateField("benediction", e.target.value)} /></div>
        <div style={S.fieldGroup}><label style={S.fieldLabel}>Announcements</label><textarea style={S.ta} rows={3} placeholder="Ward announcements..." value={agenda.announcements} onChange={e => updateField("announcements", e.target.value)} /></div>
      </div>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)}
        nameGroups={nameGroups} onSaveNames={saveNameGroups}
        customHymns={customHymns} onSaveHymns={saveCustomHymns} />
      <style>{`@media print{body *{visibility:hidden!important}.no-print{display:none!important}}`}</style>
    </div>
  );
}

// ── STYLES ──
const C = { bg:"#FAF9F7", bd:"#E8E4DF", bl:"#F0EDE8", tx:"#2D2A26", mt:"#8A847B", ac:"#3D5A80", al:"#E8EEF4" };
const ff = "'Georgia','Times New Roman',serif";
const fs = "'Segoe UI','Helvetica Neue',Arial,sans-serif";

const S = {
  loadWrap:{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,fontFamily:fs},
  loadText:{color:C.mt,fontSize:14},
  container:{background:C.bg,minHeight:"100vh",fontFamily:fs,color:C.tx},
  toolbar:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",background:C.ac,color:"#fff",position:"sticky",top:0,zIndex:100,flexWrap:"wrap",gap:6},
  tbLeft:{display:"flex",alignItems:"center"},tbRight:{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"},
  appTitle:{margin:0,fontSize:17,fontFamily:ff,fontWeight:600,letterSpacing:"0.02em"},
  toolBtn:{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",color:"#fff",padding:"5px 10px",borderRadius:6,cursor:"pointer",fontSize:12,fontFamily:fs},
  saveBtn:{background:"#fff",border:"none",color:C.ac,padding:"5px 14px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:fs,minWidth:72},
  formBody:{maxWidth:680,margin:"0 auto",padding:"16px 14px 80px"},
  fieldGroup:{marginBottom:14},fRow:{display:"flex",gap:10},fHalf:{flex:1,marginBottom:10},
  fieldLabel:{display:"block",fontSize:11,fontWeight:600,color:C.mt,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3},
  input:{width:"100%",padding:"7px 9px",border:`1px solid ${C.bd}`,borderRadius:6,fontSize:14,fontFamily:fs,color:C.tx,background:"#fff",outline:"none",boxSizing:"border-box"},
  select:{width:"100%",padding:"7px 9px",border:`1px solid ${C.bd}`,borderRadius:6,fontSize:14,fontFamily:fs,color:C.tx,background:"#fff",outline:"none",boxSizing:"border-box",cursor:"pointer"},
  switchBtn:{background:C.al,border:`1px solid ${C.bd}`,borderRadius:6,padding:"6px 10px",cursor:"pointer",fontSize:12,color:C.ac,fontWeight:600},
  ta:{width:"100%",padding:"7px 9px",border:`1px solid ${C.bd}`,borderRadius:6,fontSize:14,fontFamily:fs,color:C.tx,background:"#fff",outline:"none",boxSizing:"border-box",resize:"vertical"},
  hymnRow:{marginBottom:14},hymnInputs:{display:"flex",gap:8},
  hymnNum:{width:56,padding:"7px 8px",border:`1px solid ${C.bd}`,borderRadius:6,fontSize:14,fontFamily:fs,color:C.tx,background:"#fff",outline:"none",textAlign:"center"},
  hymnTitle:{width:"100%",padding:"7px 9px",border:`1px solid ${C.bd}`,borderRadius:6,fontSize:14,fontFamily:fs,color:C.tx,background:"#fff",outline:"none",boxSizing:"border-box"},
  sugBox:{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:`1px solid ${C.bd}`,borderRadius:8,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",zIndex:50,maxHeight:220,overflowY:"auto",marginTop:2},
  sugItem:{display:"block",width:"100%",textAlign:"left",background:"none",border:"none",padding:"8px 12px",cursor:"pointer",fontSize:13,fontFamily:fs,color:C.tx,borderBottom:`1px solid ${C.bl}`},
  sugNum:{color:C.ac,fontWeight:600,marginRight:6},
  secBlock:{marginBottom:10,border:`1px solid ${C.bd}`,borderRadius:8,background:"#fff",overflow:"hidden"},
  secToggle:{display:"flex",alignItems:"center",width:"100%",background:"none",border:"none",padding:"10px 14px",cursor:"pointer",textAlign:"left",fontFamily:fs},
  secArrow:{fontSize:12,color:C.mt,marginRight:8,width:14},secLabel:{fontSize:13,fontWeight:600,color:C.tx},
  secContent:{padding:"0 14px 14px"},bizSub:{marginBottom:10},subLabel:{fontSize:11,fontWeight:600,color:C.ac,marginBottom:4},
  listRow:{display:"flex",gap:6,marginBottom:5,alignItems:"center"},
  listIn:{flex:1,padding:"6px 9px",border:`1px solid ${C.bd}`,borderRadius:6,fontSize:13,fontFamily:fs,color:C.tx,background:"#fff",outline:"none",boxSizing:"border-box"},
  listFull:{flex:1,padding:"6px 9px",border:`1px solid ${C.bd}`,borderRadius:6,fontSize:13,fontFamily:fs,color:C.tx,background:"#fff",outline:"none",boxSizing:"border-box"},
  rmBtn:{background:"none",border:"none",color:C.mt,cursor:"pointer",fontSize:14,padding:"2px 5px",borderRadius:4,lineHeight:1},
  addBtn:{background:"none",border:"none",color:C.ac,cursor:"pointer",fontSize:12,padding:"3px 0",fontFamily:fs,fontWeight:500},
  chkRow:{display:"flex",alignItems:"center",gap:8,marginBottom:8},chk:{accentColor:C.ac},chkLbl:{fontSize:13,color:C.tx},
  topBar:{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",borderBottom:`1px solid ${C.bd}`},
  backBtnDk:{background:"none",border:`1px solid ${C.bd}`,padding:"5px 12px",borderRadius:6,cursor:"pointer",fontSize:12,fontFamily:fs,color:C.tx},
  histTitle:{margin:0,fontSize:17,fontFamily:ff},histList:{maxWidth:580,margin:"16px auto",padding:"0 14px"},
  histItem:{display:"flex",alignItems:"center",marginBottom:5,background:"#fff",borderRadius:8,border:`1px solid ${C.bd}`,overflow:"hidden"},
  histBtn:{flex:1,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",background:"none",border:"none",cursor:"pointer",fontFamily:fs,fontSize:13,color:C.tx},
  histArr:{color:C.mt},histDel:{background:"none",border:"none",color:C.mt,cursor:"pointer",padding:"12px 14px",fontSize:13},
  empty:{textAlign:"center",color:C.mt,padding:36,fontSize:13},
  // Preview
  prevOuter:{background:C.bg,minHeight:"100vh",fontFamily:ff},
  noPrint:{display:"flex",gap:8,padding:"10px 18px",background:C.ac,className:"no-print"},
  backBtn:{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",color:"#fff",padding:"5px 12px",borderRadius:6,cursor:"pointer",fontSize:12,fontFamily:fs},
  printBtn:{background:"#fff",border:"none",color:C.ac,padding:"5px 14px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:fs},
  printPage:{maxWidth:620,margin:"0 auto",padding:"36px 28px 50px",background:"#fff",minHeight:"80vh"},
  printHdr:{textAlign:"center",marginBottom:24,borderBottom:`2px solid ${C.ac}`,paddingBottom:16},
  printT:{margin:0,fontSize:24,fontWeight:400,letterSpacing:"0.04em",color:C.ac},
  printWard:{margin:"5px 0 0",fontSize:15,fontWeight:400,color:C.tx},
  printDate:{margin:"5px 0 0",fontSize:13,color:C.mt},
  printGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 20px",marginBottom:18,padding:"10px 0"},
  printRow:{display:"flex",gap:6,alignItems:"baseline"},
  printLbl:{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em",color:C.mt,minWidth:72,fontFamily:fs},
  printVal:{fontSize:13,color:C.tx},printDiv:{height:1,background:C.bd,margin:"6px 0 16px"},
  pItem:{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:"7px 0",borderBottom:`1px solid ${C.bl}`,flexWrap:"wrap"},
  pItemL:{fontSize:13,fontWeight:600,color:C.tx},pItemV:{fontSize:13,color:C.tx,textAlign:"right"},
  pNote:{margin:"3px 0 0",fontSize:12,color:C.mt,fontStyle:"italic",width:"100%"},
  pBizSec:{padding:"10px 0",margin:"6px 0",borderBottom:`1px solid ${C.bl}`},
  pSecT:{display:"block",fontSize:13,fontWeight:600,color:C.ac,marginBottom:6},
  pBizGrp:{marginBottom:6},pBizLbl:{display:"block",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em",color:C.mt,marginBottom:1,fontFamily:fs},
  pBizItem:{fontSize:13,color:C.tx,paddingLeft:10,lineHeight:1.5},
};

const M = {
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16},
  box:{background:"#fff",borderRadius:12,width:"100%",maxWidth:520,maxHeight:"85vh",overflow:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.2)"},
  header:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:`1px solid ${C.bd}`},
  title:{margin:0,fontSize:16,fontFamily:ff,color:C.tx},
  closeBtn:{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.mt,padding:4},
  tabs:{display:"flex",borderBottom:`1px solid ${C.bd}`},
  tab:{flex:1,padding:"10px",background:"none",border:"none",cursor:"pointer",fontSize:13,fontFamily:fs,color:C.mt,textAlign:"center"},
  tabActive:{flex:1,padding:"10px",background:"none",border:"none",borderBottom:`2px solid ${C.ac}`,cursor:"pointer",fontSize:13,fontFamily:fs,color:C.ac,fontWeight:600,textAlign:"center"},
  body:{padding:"16px 20px"},
  group:{marginBottom:20},groupLabel:{fontSize:13,fontWeight:600,color:C.tx,marginBottom:2},
  groupHint:{fontSize:11,color:C.mt,marginBottom:8},
  nameList:{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8,minHeight:28},
  nameTag:{display:"flex",alignItems:"center",gap:4,background:C.al,padding:"4px 10px",borderRadius:20,fontSize:13,color:C.ac},
  nameRemove:{background:"none",border:"none",fontSize:12,cursor:"pointer",color:C.ac,padding:0,lineHeight:1},
  addRow:{display:"flex",gap:6},addInput:{flex:1,padding:"6px 10px",border:`1px solid ${C.bd}`,borderRadius:6,fontSize:13,fontFamily:fs,outline:"none"},
  addBtnS:{background:C.ac,color:"#fff",border:"none",padding:"6px 14px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:fs},
  hymnList:{maxHeight:300,overflowY:"auto"},
  hymnItem:{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.bl}`},
  hymnNum:{color:C.ac,fontWeight:600,fontSize:13,minWidth:40},hymnTitle:{flex:1,fontSize:13,color:C.tx},
  csvSection:{marginBottom:16,padding:12,background:C.bl,borderRadius:8},
  csvLabel:{fontSize:13,fontWeight:600,color:C.tx,marginBottom:4},
  csvInput:{width:"100%",padding:"6px 10px",border:`1px solid ${C.bd}`,borderRadius:6,fontSize:13,fontFamily:fs,cursor:"pointer"},
  divider:{textAlign:"center",margin:"16px 0",position:"relative",color:C.mt,fontSize:12,fontWeight:600},
  footer:{display:"flex",justifyContent:"flex-end",gap:8,padding:"12px 20px",borderTop:`1px solid ${C.bd}`},
  cancelBtn:{background:"none",border:`1px solid ${C.bd}`,padding:"6px 14px",borderRadius:6,cursor:"pointer",fontSize:12,fontFamily:fs,color:C.tx},
  saveBtn:{background:C.ac,color:"#fff",border:"none",padding:"6px 16px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:fs},
};
