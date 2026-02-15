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
  speakers: [{ name: "" }],
  youthSpeakers: [{ name: "" }],
  musicalNumbers: [{ performer: "", title: "" }],
  intermediateItem: { type: "hymn", number: "", title: "", performer: "", placement: "after-youth" }, // type: "hymn" or "musical", placement: after-youth, after-speaker-1, etc.
  closingHymn: { number: "", title: "" },
  isFastSunday: false,
  isEaster: false,
  isChristmas: false,
  benediction: "",
  announcements: "",
  isPrimaryProgram: false,
  primaryProgramNotes: "",
};

const DEFAULT_SMART_TEXT = {
  openingText: "We will open our meeting by singing Hymn {hymnNumber}{hymnTitle}, after which {invocationName} will offer the invocation.",
  reverenceText: "Thank you for your reverence during the sacrament ordinance.",
  fastSundayNote: "Note: The conducting counselor will share their testimony, after which the floor will be opened for others to bear their testimonies.",
  fastSundayInstructions: "The remainder of the time is for the bearing of testimonies. We invite you to come forward and share your testimony, or stand and an Aaronic Priesthood holder will bring a microphone to you. We will plan to conclude at 5 minutes before the hour.",
  releasesText: "A release has been extended to the following individual{plural}:",
  releasesThanks: "Those who wish to express thanks for their service may show it by the uplifted hand.",
  sustainingsText: "The following individual{plural} {hasHave} been called to serve and we present {themThem} for your sustaining vote:",
  sustainingsVote: "Those in favor may manifest it by raising the right hand. Those opposed, if any, may manifest it.",
  ordinationsText: "The following will be ordained to the {office} in the Aaronic Priesthood:",
  appreciationText: "We appreciate those who have participated today. Thanks to our Chorister {choristerName} and our Organist {organistName} for the music. We will close by singing Hymn {closingHymnNumber}{closingHymnTitle}, after which {benedictionName} will offer the benediction."
};

const USER_ROLES = {
  ADMIN: 'administrator',
  EDITOR: 'editor',
  VIEWER: 'viewer'
};

const BIZ_SECTIONS = {
  releases: { itemLabel: "Release", fields: ["name", "calling"], labels: ["Name", "Calling"] },
  callings: { itemLabel: "Sustaining", fields: ["name", "calling"], labels: ["Name", "Calling"] },
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
function SettingsModal({ isOpen, onClose, nameGroups, onSaveNames, customHymns, onSaveHymns, smartText, onSaveSmartText }) {
  const [groups, setGroups] = useState(nameGroups);
  const [newName, setNewName] = useState({ presiding: "", conducting: "", chorister: "", organist: "" });
  const [hymns, setHymns] = useState(customHymns);
  const [newHymn, setNewHymn] = useState({ number: "", title: "" });
  const [csvFile, setCsvFile] = useState(null);
  const [textSettings, setTextSettings] = useState(smartText || DEFAULT_SMART_TEXT);
  const [tab, setTab] = useState("names"); // names | hymns | text

  useEffect(() => {
    setGroups(nameGroups);
    setHymns(customHymns);
    setTextSettings(smartText || DEFAULT_SMART_TEXT);
    setCsvFile(null);
  }, [nameGroups, customHymns, smartText]);

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

  const parseCsvLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Handle escaped quotes ""
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add the last field
    result.push(current.trim());
    return result;
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
        const parts = parseCsvLine(line);
        if (parts.length >= 2) {
          const number = parts[0].replace(/"/g, '').trim();
          const title = parts[1].replace(/"/g, '').trim();
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
  const handleSave = () => {
    onSaveNames(groups);
    onSaveHymns(hymns);
    if (onSaveSmartText) {
      onSaveSmartText(textSettings);
    }
    onClose();
  };

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
          <button style={tab === "text" ? M.tabActive : M.tab} type="button" onClick={() => setTab("text")}>Smart Text</button>
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
          {tab === "text" && (
            <div>
              <p style={M.groupHint}>Customize the text that appears in the printed agenda.</p>
              <div style={M.group}>
                <label style={M.groupLabel}>Opening Text</label>
                <textarea
                  style={{ ...M.input, height: "60px", fontFamily: "monospace", fontSize: "12px" }}
                  value={textSettings?.openingText || DEFAULT_SMART_TEXT.openingText}
                  onChange={e => setTextSettings(prev => ({ ...prev, openingText: e.target.value }))}
                />
              </div>
              <div style={M.group}>
                <label style={M.groupLabel}>Reverence Text</label>
                <textarea
                  style={{ ...M.input, height: "40px", fontFamily: "monospace", fontSize: "12px" }}
                  value={textSettings?.reverenceText || DEFAULT_SMART_TEXT.reverenceText}
                  onChange={e => setTextSettings(prev => ({ ...prev, reverenceText: e.target.value }))}
                />
              </div>
              <div style={M.group}>
                <label style={M.groupLabel}>Appreciation Text</label>
                <textarea
                  style={{ ...M.input, height: "80px", fontFamily: "monospace", fontSize: "12px" }}
                  value={textSettings?.appreciationText || DEFAULT_SMART_TEXT.appreciationText}
                  onChange={e => setTextSettings(prev => ({ ...prev, appreciationText: e.target.value }))}
                />
              </div>
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

// ── USER MANAGEMENT MODAL ──
function UserManagementModal({ isOpen, onClose, users, currentUser, onApproveUser, onUpdateUserRole, onRemoveUser }) {
  if (!isOpen) return null;

  const pendingUsers = users.filter(u => !u.approved);
  const activeUsers = users.filter(u => u.approved);

  return (
    <div style={S.modalOverlay}>
      <div style={S.modalContent}>
        <div style={S.modalHeader}>
          <h3 style={S.modalTitle}>User Management</h3>
          <button style={S.modalCloseBtn} type="button" onClick={onClose}>×</button>
        </div>

        <div style={S.modalBody}>
          {pendingUsers.length > 0 && (
            <div style={S.userSection}>
              <h4 style={S.sectionTitle}>Pending Approval ({pendingUsers.length})</h4>
              {pendingUsers.map(user => (
                <div key={user.id} style={S.userItem}>
                  <div style={S.userInfo}>
                    <strong>{user.username}</strong>
                    <span style={S.userEmail}>{user.email}</span>
                    <span style={S.userDate}>Registered: {new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div style={S.userActions}>
                    <button
                      style={S.approveBtn}
                      type="button"
                      onClick={() => onApproveUser(user.id)}
                    >
                      Approve
                    </button>
                    <button
                      style={S.rejectBtn}
                      type="button"
                      onClick={() => onRemoveUser(user.id)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={S.userSection}>
            <h4 style={S.sectionTitle}>Active Users ({activeUsers.length})</h4>
            {activeUsers.map(user => (
              <div key={user.id} style={S.userItem}>
                <div style={S.userInfo}>
                  <strong>{user.username}</strong>
                  <span style={S.userEmail}>{user.email}</span>
                  <span style={S.userRole}>Role: {user.role}</span>
                </div>
                {currentUser.id !== user.id && (
                  <div style={S.userActions}>
                    <select
                      style={S.roleSelect}
                      value={user.role}
                      onChange={(e) => onUpdateUserRole(user.id, e.target.value)}
                    >
                      <option value={USER_ROLES.VIEWER}>Viewer</option>
                      <option value={USER_ROLES.EDITOR}>Editor</option>
                      <option value={USER_ROLES.ADMIN}>Administrator</option>
                    </select>
                    <button
                      style={S.removeBtn}
                      type="button"
                      onClick={() => {
                        if (confirm(`Remove user "${user.username}"?`)) {
                          onRemoveUser(user.id);
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AUTHENTICATION COMPONENTS ──
function LoginForm({ onLogin, onSwitchToRegister }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setError("");
    const result = await onLogin(username.trim());
    setLoading(false);

    if (!result.success) {
      setError(result.error);
    }
  };

  return (
    <div style={S.authForm}>
      <h1 style={S.authTitle}>Sacrament Meeting Agenda</h1>
      <h2 style={S.authSubtitle}>Sign In</h2>
      <form onSubmit={handleSubmit}>
        <div style={S.authField}>
          <label style={S.fieldLabel}>Username</label>
          <input
            style={S.input}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
          />
        </div>
        {error && <p style={S.authError}>{error}</p>}
        <button style={S.authBtn} type="submit" disabled={loading}>
          {loading ? "Signing In..." : "Sign In"}
        </button>
      </form>
      <p style={S.authLink}>
        Don't have an account?{" "}
        <button style={S.authLinkBtn} type="button" onClick={onSwitchToRegister}>
          Register here
        </button>
      </p>
    </div>
  );
}

function RegisterForm({ onRegister, onSwitchToLogin, onPendingApproval }) {
  const [formData, setFormData] = useState({ username: "", email: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.email.trim()) return;

    setLoading(true);
    setError("");
    const result = await onRegister(formData);
    setLoading(false);

    if (result.success) {
      if (result.needsApproval) {
        onPendingApproval();
      }
    } else {
      setError(result.error || "Registration failed");
    }
  };

  return (
    <div style={S.authForm}>
      <h1 style={S.authTitle}>Sacrament Meeting Agenda</h1>
      <h2 style={S.authSubtitle}>Register</h2>
      <form onSubmit={handleSubmit}>
        <div style={S.authField}>
          <label style={S.fieldLabel}>Username</label>
          <input
            style={S.input}
            type="text"
            value={formData.username}
            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            placeholder="Choose a username"
          />
        </div>
        <div style={S.authField}>
          <label style={S.fieldLabel}>Email</label>
          <input
            style={S.input}
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="Enter your email"
          />
        </div>
        {error && <p style={S.authError}>{error}</p>}
        <button style={S.authBtn} type="submit" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
      <p style={S.authLink}>
        Already have an account?{" "}
        <button style={S.authLinkBtn} type="button" onClick={onSwitchToLogin}>
          Sign in here
        </button>
      </p>
    </div>
  );
}

function PendingApproval({ onBackToLogin }) {
  return (
    <div style={S.authForm}>
      <h1 style={S.authTitle}>Sacrament Meeting Agenda</h1>
      <h2 style={S.authSubtitle}>Account Pending Approval</h2>
      <p style={S.authMessage}>
        Your account has been created and is pending approval by an administrator.
        You'll be able to access the application once your account is approved.
      </p>
      <button style={S.authBtn} type="button" onClick={onBackToLogin}>
        Back to Sign In
      </button>
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

  // ── AUTHENTICATION & USER MANAGEMENT ──
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [smartText, setSmartText] = useState(DEFAULT_SMART_TEXT);
  const [authView, setAuthView] = useState("login"); // login, register, pending
  const [showUserManagement, setShowUserManagement] = useState(false);

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

  // ── AUTHENTICATION FUNCTIONS ──
  const loadUsersFromStorage = useCallback(async () => {
    try {
      const result = await storage.get("agenda-users");
      return JSON.parse(result.value);
    } catch {
      return [];
    }
  }, []);

  const saveUsers = useCallback(async (userList) => {
    setUsers(userList);
    try {
      await storage.set("agenda-users", JSON.stringify(userList));
    } catch (e) {
      console.error("Failed to save users:", e);
    }
  }, []);

  const registerUser = useCallback(async (userData) => {
    const existingUsers = await loadUsersFromStorage();
    const isFirstUser = existingUsers.length === 0;

    const newUser = {
      id: Date.now().toString(),
      username: userData.username,
      email: userData.email,
      role: isFirstUser ? USER_ROLES.ADMIN : USER_ROLES.VIEWER,
      approved: isFirstUser,
      createdAt: new Date().toISOString()
    };

    const updatedUsers = [...existingUsers, newUser];
    await saveUsers(updatedUsers);

    if (isFirstUser) {
      setCurrentUser(newUser);
      await storage.set("agenda-current-user", newUser.id);
      return { success: true, user: newUser };
    } else {
      return { success: true, needsApproval: true };
    }
  }, [saveUsers, loadUsersFromStorage]);

  const loginUser = useCallback(async (username) => {
    try {
      const result = await storage.get("agenda-users");
      const userList = JSON.parse(result.value);
      const user = userList.find(u => u.username === username);

      if (!user) {
        return { success: false, error: "User not found" };
      }

      if (!user.approved) {
        return { success: false, error: "Account pending approval" };
      }

      setCurrentUser(user);
      await storage.set("agenda-current-user", user.id);
      return { success: true, user };
    } catch {
      return { success: false, error: "Login failed" };
    }
  }, []);

  const hasPermission = useCallback((action) => {
    if (!currentUser) return false;

    switch (action) {
      case 'view':
        return [USER_ROLES.ADMIN, USER_ROLES.EDITOR, USER_ROLES.VIEWER].includes(currentUser.role);
      case 'edit':
        return [USER_ROLES.ADMIN, USER_ROLES.EDITOR].includes(currentUser.role);
      case 'admin':
        return currentUser.role === USER_ROLES.ADMIN;
      case 'wardBusiness':
        return [USER_ROLES.ADMIN, USER_ROLES.EDITOR].includes(currentUser.role);
      default:
        return false;
    }
  }, [currentUser]);

  const logoutUser = useCallback(async () => {
    setCurrentUser(null);
    await storage.delete("agenda-current-user");
  }, []);

  const approveUser = useCallback(async (userId) => {
    const userList = [...users];
    const userIndex = userList.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      userList[userIndex].approved = true;
      await saveUsers(userList);
    }
  }, [users, saveUsers]);

  const updateUserRole = useCallback(async (userId, newRole) => {
    const userList = [...users];
    const userIndex = userList.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      userList[userIndex].role = newRole;
      await saveUsers(userList);
    }
  }, [users, saveUsers]);

  const removeUser = useCallback(async (userId) => {
    const userList = users.filter(u => u.id !== userId);
    await saveUsers(userList);
  }, [users, saveUsers]);

  const toggle = useCallback((k) => setExpanded(p => ({ ...p, [k]: !p[k] })), []);

  if (loading) return <div style={S.loadWrap}><p style={S.loadText}>Loading...</p></div>;

  // ── AUTHENTICATION VIEWS ──
  if (!currentUser) {
    return (
      <div style={S.authContainer}>
        {authView === "login" ? (
          <LoginForm onLogin={loginUser} onSwitchToRegister={() => setAuthView("register")} />
        ) : authView === "register" ? (
          <RegisterForm onRegister={registerUser} onSwitchToLogin={() => setAuthView("login")} onPendingApproval={() => setAuthView("pending")} />
        ) : (
          <PendingApproval onBackToLogin={() => setAuthView("login")} />
        )}
      </div>
    );
  }

  if (!agenda) return <div style={S.loadWrap}><p style={S.loadText}>Loading...</p></div>;

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
          {agenda.announcements?.trim() && (
            <div style={{ ...S.pItem, flexDirection: "column" }}>
              <span style={S.pItemL}>Announcements</span>
              <div style={S.pAnnouncements}>
                {agenda.announcements.split('\n').filter(line => line.trim()).map((line, i) => (
                  <div key={i} style={S.pAnnouncementItem}>
                    <span style={S.pBullet}>•</span>
                    <span style={S.pAnnouncementText}>{line.trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={S.pSection}>
            <div style={S.pSectionTitle}>Opening</div>

            {/* Dynamic opening text */}
            {(agenda.openingHymn?.number || agenda.openingHymn?.title || agenda.invocation) && (
              <div style={S.pOpeningText}>
                We will open our meeting by singing Hymn{" "}
                {agenda.openingHymn?.number && `#${agenda.openingHymn.number}`}
                {agenda.openingHymn?.number && agenda.openingHymn?.title && " "}
                {agenda.openingHymn?.title && `"${agenda.openingHymn.title}"`}
                {agenda.invocation && `, after which ${agenda.invocation} will offer the invocation`}.
              </div>
            )}

            <HL label="Opening Hymn" h={agenda.openingHymn} />
            <div style={S.pItem}><span style={S.pItemL}>Invocation</span><span style={S.pItemV}>{agenda.invocation || "—"}</span></div>
          </div>
          {hasBiz && (
            <div style={S.pSection}>
              <div style={S.pSectionTitle}>Ward Business</div>
              {Object.entries(BIZ_SECTIONS).map(([key, cfg]) => {
                const items = agenda.wardBusiness[key]?.filter(it => Object.values(it).some(v => v?.trim()));
                if (!items?.length) return null;

                if (key === 'releases') {
                  return (
                    <div key={key} style={S.pBizSubSection}>
                      <div style={S.pSubSectionHeader}>Releases</div>
                      <div style={S.pReadingText}>
                        A release has been extended to the following individual{items.length > 1 ? 's' : ''}:
                      </div>
                      {items.map((it, i) => (
                        <div key={i} style={S.pNameItemClean}>
                          <span style={S.pNameTextBold}>{it.name}</span>
                          {it.calling && <span style={S.pCallingTextClean}> — {it.calling}</span>}
                        </div>
                      ))}
                      <div style={S.pReadingText}>
                        Those who wish to express thanks for their service may show it by the uplifted hand.
                      </div>
                    </div>
                  );
                }

                if (key === 'callings') {
                  return (
                    <div key={key} style={S.pBizSubSection}>
                      <div style={S.pSubSectionHeader}>Sustainings</div>
                      <div style={S.pReadingText}>
                        We propose that the following individual{items.length > 1 ? 's' : ''} be sustained. As your name is read please stand:
                      </div>
                      {items.map((it, i) => (
                        <div key={i} style={S.pNameItemClean}>
                          <span style={S.pNameTextBold}>{it.name}</span>
                          {it.calling && <span style={S.pCallingTextClean}> — {it.calling}</span>}
                        </div>
                      ))}
                      <div style={S.pReadingText}>
                        Those in favor show it by the uplifted hand.
                      </div>
                      <div style={S.pWaitText}>[Wait]</div>
                      <div style={S.pReadingText}>
                        Those opposed, if any, may show it.
                      </div>
                    </div>
                  );
                }

                if (key === 'ordinations') {
                  // Group ordinations by office
                  const groupedByOffice = items.reduce((acc, item) => {
                    const office = item.office || 'Unknown';
                    if (!acc[office]) acc[office] = [];
                    acc[office].push(item);
                    return acc;
                  }, {});

                  return (
                    <div key={key} style={S.pBizSubSection}>
                      <div style={S.pSubSectionHeader}>Ordinations</div>
                      {Object.entries(groupedByOffice).map(([office, officeItems], groupIndex) => {
                        const isDeacon = office === 'Deacon';
                        const names = officeItems.map(item => item.name).filter(Boolean);

                        if (names.length === 0) return null;

                        return (
                          <div key={office} style={{marginBottom: groupIndex < Object.keys(groupedByOffice).length - 1 ? 16 : 0}}>
                            <div style={S.pReadingText}>
                              We propose that {names.join(', ')}{isDeacon ? ' receive the Aaronic Priesthood and' : ''} be ordained to the office of {office} in the Aaronic Priesthood.
                            </div>
                            {names.map((name, i) => (
                              <div key={i} style={S.pNameItemClean}>
                                <span style={S.pNameTextBold}>{name}</span>
                              </div>
                            ))}
                            <div style={S.pReadingText}>
                              Those in favor may manifest it.
                            </div>
                            <div style={S.pWaitText}>[Wait]</div>
                            <div style={S.pReadingText}>
                              Those opposed, if any, may manifest it.
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                return (
                  <div key={key} style={S.pBizSubSection}>
                    <div style={S.pSubSectionHeader}>{cfg.itemLabel}s</div>
                    {items.map((it, i) => (
                      <div key={i} style={S.pNameItemClean}>
                        <span style={S.pNameTextBold}>{cfg.fields.map(f => it[f]).filter(Boolean).join(" — ")}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
              {agenda.wardBusiness.other?.trim() && (
                <div style={S.pBizSubSection}>
                  <div style={S.pSubSectionHeader}>Other</div>
                  <div style={S.pAnnouncements}>
                    {agenda.wardBusiness.other.split('\n').filter(line => line.trim()).map((line, i) => (
                      <div key={i} style={S.pAnnouncementItem}>
                        <span style={S.pBullet}>•</span>
                        <span style={S.pAnnouncementText}>{line.trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div style={S.pSection}>
            <div style={S.pSectionTitle}>Sacrament</div>

            {/* Dynamic sacrament preparation text */}
            {(agenda.sacramentHymn?.number || agenda.sacramentHymn?.title) && (
              <div style={S.pReadingText}>
                We will prepare for the sacrament by singing Hymn{" "}
                {agenda.sacramentHymn?.number && `#${agenda.sacramentHymn.number}`}
                {agenda.sacramentHymn?.number && agenda.sacramentHymn?.title && " "}
                {agenda.sacramentHymn?.title && `"${agenda.sacramentHymn.title}"`}
                {" "}after which the holders of the Aaronic Priesthood will administer and pass the sacrament.
              </div>
            )}

            <HL label="Sacrament Hymn" h={agenda.sacramentHymn} />
            <div style={S.pItem}><span style={S.pItemL}>Administration of the Sacrament</span></div>
          </div>
          <div style={S.pReadingText}>
            Thank you for your reverence during the sacrament ordinance.
          </div>
          <div style={S.pSection}>
            {agenda.isPrimaryProgram ? (
              <>
                <div style={S.pSectionTitle}>Primary Program</div>
                {agenda.primaryProgramNotes && <p style={S.pNote}>{agenda.primaryProgramNotes}</p>}
              </>
            ) : agenda.isFastSunday ? (
              <>
                <div style={S.pSectionTitle}>Testimony Meeting</div>
                <div style={S.pNote}>
                  Note: The conducting counselor will share their testimony, after which the floor will be opened for others to bear their testimonies.
                </div>
                <div style={S.pReadingText}>
                  The remainder of the time is for the bearing of testimonies. We invite you to come forward and share your testimony, or stand and an Aaronic Priesthood holder will bring a microphone to you. We will plan to conclude at 5 minutes before the hour.
                </div>
              </>
            ) : (
              <>
                <div style={S.pSectionTitle}>Program</div>
                {(() => {
                  const youthSpeakers = agenda.youthSpeakers.filter(s => s.name?.trim());
                  const speakers = agenda.speakers.filter(s => s.name?.trim());
                  const musicalNumbers = agenda.musicalNumbers.filter(m => m.performer?.trim() || m.title?.trim());
                  const intermediateItem = agenda.intermediateItem;
                  const items = [];

                  const renderIntermediateItem = () => {
                    if (!intermediateItem || (!intermediateItem.number && !intermediateItem.title && !intermediateItem.performer)) return null;

                    if (intermediateItem.type === "hymn") {
                      return (
                        <div key="intermediate-item" style={S.pItem}>
                          <span style={S.pItemL}>Intermediate Hymn</span>
                          <span style={S.pItemV}>{intermediateItem.number && `#${intermediateItem.number}`}{intermediateItem.number && intermediateItem.title && " — "}{intermediateItem.title}</span>
                        </div>
                      );
                    } else {
                      return (
                        <div key="intermediate-item" style={S.pItem}>
                          <span style={S.pItemL}>Musical Number</span>
                          <span style={S.pItemV}>{intermediateItem.title}{intermediateItem.title && intermediateItem.performer ? " — " : ""}{intermediateItem.performer}</span>
                        </div>
                      );
                    }
                  };

                  // Add youth speakers
                  youthSpeakers.forEach((s, i) => {
                    items.push(<div key={`ys${i}`} style={S.pItem}><span style={S.pItemL}>Youth Speaker</span><span style={S.pItemV}>{s.name}</span></div>);
                  });

                  // Check for intermediate item after youth speakers
                  if (intermediateItem?.placement === "after-youth") {
                    const item = renderIntermediateItem();
                    if (item) items.push(item);
                  }

                  // Add speakers with potential intermediate item placement
                  speakers.forEach((s, i) => {
                    items.push(<div key={`sp${i}`} style={S.pItem}><span style={S.pItemL}>Speaker</span><span style={S.pItemV}>{s.name}</span></div>);

                    // Check for intermediate item after this speaker
                    if (intermediateItem?.placement === `after-speaker-${i + 1}`) {
                      const item = renderIntermediateItem();
                      if (item) items.push(item);
                    }
                  });

                  // Add regular musical numbers (not the intermediate one)
                  musicalNumbers.forEach((m, i) => {
                    items.push(<div key={`mn${i}`} style={S.pItem}><span style={S.pItemL}>Musical Number</span><span style={S.pItemV}>{m.title}{m.title && m.performer ? " — " : ""}{m.performer}</span></div>);
                  });

                  return items;
                })()}
              </>
            )}
          </div>
          <div style={S.pSection}>
            <div style={S.pSectionTitle}>Closing</div>
            {agenda.intermediateItem?.placement === "before-closing" && (agenda.intermediateItem.number || agenda.intermediateItem.title || agenda.intermediateItem.performer) && (
              agenda.intermediateItem.type === "hymn" ? (
                <div style={S.pItem}>
                  <span style={S.pItemL}>Intermediate Hymn</span>
                  <span style={S.pItemV}>{agenda.intermediateItem.number && `#${agenda.intermediateItem.number}`}{agenda.intermediateItem.number && agenda.intermediateItem.title && " — "}{agenda.intermediateItem.title}</span>
                </div>
              ) : (
                <div style={S.pItem}>
                  <span style={S.pItemL}>Musical Number</span>
                  <span style={S.pItemV}>{agenda.intermediateItem.title}{agenda.intermediateItem.title && agenda.intermediateItem.performer ? " — " : ""}{agenda.intermediateItem.performer}</span>
                </div>
              )
            )}
            <div style={S.pReadingText}>
              We appreciate those who have participated today. Thanks to our Chorister {agenda.chorister || "[Name]"} and our Organist {agenda.organist || "[Name]"} for the music. We will close by singing Hymn {agenda.closingHymn?.number && `#${agenda.closingHymn.number}`}{agenda.closingHymn?.number && agenda.closingHymn?.title && " "}{agenda.closingHymn?.title || "[Title]"}, after which {agenda.benediction || "[Name]"} will offer the benediction.
            </div>
            <HL label="Closing Hymn" h={agenda.closingHymn} />
            <div style={S.pItem}><span style={S.pItemL}>Benediction</span><span style={S.pItemV}>{agenda.benediction || "—"}</span></div>
          </div>
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
          <span style={S.userInfo}>
            {currentUser.username} ({currentUser.role})
          </span>
          <button style={S.toolBtn} type="button" onClick={() => setShowSettings(true)}>⚙ Settings</button>
          {hasPermission('admin') && (
            <button style={S.toolBtn} type="button" onClick={() => setShowUserManagement(true)}>👥 Users</button>
          )}
          <button style={S.toolBtn} type="button" onClick={() => setView("history")}>📋 History</button>
          {hasPermission('edit') && (
            <>
              <button style={S.toolBtn} type="button" onClick={newAgenda}>＋ New</button>
              <button style={S.toolBtn} type="button" onClick={duplicateAgenda}>⧉ Next Week</button>
            </>
          )}
          <button style={S.toolBtn} type="button" onClick={() => setView("preview")}>🖨 Print</button>
          {hasPermission('edit') && (
            <button style={S.saveBtn} type="button" onClick={saveAgenda}>{saveStatus || "💾 Save"}</button>
          )}
          <button style={S.toolBtn} type="button" onClick={async () => {
            await logoutUser();
            window.location.reload();
          }}>🚪 Logout</button>
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

        <div style={S.fieldGroup}>
          <label style={S.fieldLabel}>Announcements</label>
          <textarea style={S.ta} rows={4}
            placeholder="Ward announcements (each line becomes a bullet point)&#10;Example:&#10;Relief Society meeting this Thursday&#10;Youth activity Saturday at 10 AM&#10;Fast Sunday next week"
            value={agenda.announcements}
            onChange={e => updateField("announcements", e.target.value)} />
        </div>

        <HymnInput label="Opening Hymn" hymn={agenda.openingHymn} onChange={v => updateField("openingHymn", v)} allHymns={allHymns} />
        <div style={S.fieldGroup}><label style={S.fieldLabel}>Invocation</label><input style={S.input} type="text" placeholder="Name" value={agenda.invocation} onChange={e => updateField("invocation", e.target.value)} /></div>

        {hasPermission('wardBusiness') && (
          <Section label="Ward Business" isOpen={expanded.wardBusiness} onToggle={() => toggle("wardBusiness")}>
            {Object.entries(BIZ_SECTIONS).map(([key, cfg]) => (
            <div key={key} style={S.bizSub}>
              <div style={S.subLabel}>{cfg.itemLabel}s</div>
              {(agenda.wardBusiness[key] || []).map((item, idx) => (
                <div key={`wb-${key}-${idx}`} style={S.listRow}>
                  {cfg.fields.map(f => {
                    // Special handling for ordination office field
                    if (key === 'ordinations' && f === 'office') {
                      return (
                        <select
                          key={`wb-${key}-${idx}-${f}`}
                          style={S.listIn}
                          value={item[f] || ""}
                          onChange={e => updateField(`wardBusiness.${key}.${idx}.${f}`, e.target.value)}
                        >
                          <option value="">— Select Office —</option>
                          <option value="Deacon">Deacon</option>
                          <option value="Teacher">Teacher</option>
                          <option value="Priest">Priest</option>
                        </select>
                      );
                    }
                    // Default input for other fields
                    return (
                      <input key={`wb-${key}-${idx}-${f}`} style={cfg.fields.length === 1 ? S.listFull : S.listIn}
                        type="text" placeholder={cfg.labels[cfg.fields.indexOf(f)]} value={item[f] || ""}
                        onChange={e => updateField(`wardBusiness.${key}.${idx}.${f}`, e.target.value)} />
                    );
                  })}
                  <button style={S.rmBtn} type="button" onClick={() => removeListItem(`wardBusiness.${key}`, idx)}>✕</button>
                </div>
              ))}
              <button style={S.addBtn} type="button" onClick={() => addListItem(`wardBusiness.${key}`, Object.fromEntries(cfg.fields.map(f => [f, ""])))}>+ Add {cfg.itemLabel}</button>
            </div>
          ))}
            <div style={S.bizSub}><div style={S.subLabel}>Other Business</div>
              <textarea style={S.ta} rows={3} placeholder="Other ward business (each line becomes a bullet point)&#10;Example:&#10;Stake conference next month&#10;Time change announcement" value={agenda.wardBusiness.other || ""} onChange={e => updateField("wardBusiness.other", e.target.value)} /></div>
          </Section>
        )}

        <HymnInput label="Sacrament Hymn" hymn={agenda.sacramentHymn} onChange={v => updateField("sacramentHymn", v)} allHymns={allHymns} />

        <Section label="Program Options" isOpen={expanded.primary} onToggle={() => toggle("primary")}>
          <div style={S.chkRow}><input type="checkbox" id="fs" checked={agenda.isFastSunday} onChange={e => {
            if (e.target.checked) {
              setAgenda(prev => ({ ...prev, isFastSunday: true, isPrimaryProgram: false, isEaster: false, isChristmas: false }));
            } else {
              updateField("isFastSunday", false);
            }
          }} style={S.chk} />
            <label htmlFor="fs" style={S.chkLbl}>This is Fast Sunday (testimony meeting)</label></div>

          <div style={S.chkRow}><input type="checkbox" id="pt" checked={agenda.isPrimaryProgram} onChange={e => {
            if (e.target.checked) {
              setAgenda(prev => ({ ...prev, isPrimaryProgram: true, isFastSunday: false, isEaster: false, isChristmas: false }));
            } else {
              updateField("isPrimaryProgram", false);
            }
          }} style={S.chk} />
            <label htmlFor="pt" style={S.chkLbl}>This week is the Primary Program</label></div>
          {agenda.isPrimaryProgram && <textarea style={S.ta} rows={3} placeholder="Program notes..." value={agenda.primaryProgramNotes} onChange={e => updateField("primaryProgramNotes", e.target.value)} />}

          <div style={S.chkRow}><input type="checkbox" id="es" checked={agenda.isEaster} onChange={e => {
            if (e.target.checked) {
              setAgenda(prev => ({ ...prev, isEaster: true, isFastSunday: false, isPrimaryProgram: false, isChristmas: false }));
            } else {
              updateField("isEaster", false);
            }
          }} style={S.chk} />
            <label htmlFor="es" style={S.chkLbl}>This is Easter Sunday</label></div>

          <div style={S.chkRow}><input type="checkbox" id="ch" checked={agenda.isChristmas} onChange={e => {
            if (e.target.checked) {
              setAgenda(prev => ({ ...prev, isChristmas: true, isFastSunday: false, isPrimaryProgram: false, isEaster: false }));
            } else {
              updateField("isChristmas", false);
            }
          }} style={S.chk} />
            <label htmlFor="ch" style={S.chkLbl}>This is Christmas Sunday</label></div>
        </Section>

        <Section label="Youth Speakers" isOpen={expanded.youthSpeakers} onToggle={() => toggle("youthSpeakers")}>
          {agenda.youthSpeakers.map((s, i) => (
            <div key={`yspk-${i}`} style={S.listRow}>
              <input style={S.listFull} type="text" placeholder="Name" value={s.name} onChange={e => updateField(`youthSpeakers.${i}.name`, e.target.value)} />
              <button style={S.rmBtn} type="button" onClick={() => removeListItem("youthSpeakers", i)}>✕</button>
            </div>
          ))}
          <button style={S.addBtn} type="button" onClick={() => addListItem("youthSpeakers", { name: "" })}>+ Add Youth Speaker</button>
        </Section>

        <Section label="Speakers" isOpen={expanded.speakers} onToggle={() => toggle("speakers")}>
          {agenda.speakers.map((s, i) => (
            <div key={`spk-${i}`} style={S.listRow}>
              <input style={S.listFull} type="text" placeholder="Name" value={s.name} onChange={e => updateField(`speakers.${i}.name`, e.target.value)} />
              <button style={S.rmBtn} type="button" onClick={() => removeListItem("speakers", i)}>✕</button>
            </div>
          ))}
          <button style={S.addBtn} type="button" onClick={() => addListItem("speakers", { name: "" })}>+ Add Speaker</button>
        </Section>

        {(agenda.isEaster || agenda.isChristmas) && (
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
        )}

        <div style={S.fieldGroup}>
          <label style={S.fieldLabel}>Intermediate Item</label>
          <div style={S.fRow}>
            <div style={S.fHalf}>
              <label style={S.fieldLabel}>Type</label>
              <select style={S.select} value={agenda.intermediateItem?.type || "hymn"} onChange={e => updateField("intermediateItem.type", e.target.value)}>
                <option value="hymn">Hymn</option>
                <option value="musical">Musical Number</option>
              </select>
            </div>
            <div style={S.fHalf}>
              <label style={S.fieldLabel}>Placement</label>
              <select style={S.select} value={agenda.intermediateItem?.placement || "after-youth"} onChange={e => updateField("intermediateItem.placement", e.target.value)}>
                <option value="after-youth">After Youth Speakers</option>
                {agenda.speakers.map((_, i) => (
                  <option key={`after-speaker-${i + 1}`} value={`after-speaker-${i + 1}`}>After Speaker {i + 1}</option>
                ))}
                <option value="before-closing">Before Closing Hymn (traditional)</option>
              </select>
            </div>
          </div>

          {agenda.intermediateItem?.type === "hymn" ? (
            <HymnInput label="Hymn" hymn={{ number: agenda.intermediateItem?.number || "", title: agenda.intermediateItem?.title || "" }}
              onChange={v => { updateField("intermediateItem.number", v.number); updateField("intermediateItem.title", v.title); }} allHymns={allHymns} />
          ) : (
            <div style={S.fRow}>
              <div style={S.fHalf}>
                <label style={S.fieldLabel}>Title</label>
                <input style={S.input} type="text" placeholder="Musical number title" value={agenda.intermediateItem?.title || ""} onChange={e => updateField("intermediateItem.title", e.target.value)} />
              </div>
              <div style={S.fHalf}>
                <label style={S.fieldLabel}>Performer(s)</label>
                <input style={S.input} type="text" placeholder="Performer(s)" value={agenda.intermediateItem?.performer || ""} onChange={e => updateField("intermediateItem.performer", e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <HymnInput label="Closing Hymn" hymn={agenda.closingHymn} onChange={v => updateField("closingHymn", v)} allHymns={allHymns} />

        <div style={S.fieldGroup}><label style={S.fieldLabel}>Benediction</label><input style={S.input} type="text" placeholder="Name" value={agenda.benediction} onChange={e => updateField("benediction", e.target.value)} /></div>
      </div>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)}
        nameGroups={nameGroups} onSaveNames={saveNameGroups}
        customHymns={customHymns} onSaveHymns={saveCustomHymns}
        smartText={smartText} onSaveSmartText={async (text) => {
          setSmartText(text);
          await storage.set("agenda-smart-text", JSON.stringify(text));
        }} />
      <UserManagementModal
        isOpen={showUserManagement}
        onClose={() => setShowUserManagement(false)}
        users={users}
        currentUser={currentUser}
        onApproveUser={approveUser}
        onUpdateUserRole={updateUserRole}
        onRemoveUser={removeUser}
      />
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
  // Authentication styles
  authContainer:{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,fontFamily:fs},
  authForm:{background:"#fff",padding:"2rem",borderRadius:12,border:`1px solid ${C.bd}`,boxShadow:"0 4px 16px rgba(0,0,0,0.08)",maxWidth:400,width:"100%",margin:"0 20px"},
  authTitle:{margin:"0 0 0.5rem",fontSize:20,fontFamily:ff,fontWeight:600,color:C.tx,textAlign:"center"},
  authSubtitle:{margin:"0 0 1.5rem",fontSize:16,fontFamily:fs,fontWeight:400,color:C.mt,textAlign:"center"},
  authField:{marginBottom:"1rem"},
  authBtn:{width:"100%",background:C.ac,border:"none",color:"#fff",padding:"10px 16px",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:600,fontFamily:fs,marginTop:"0.5rem"},
  authError:{color:"#d32f2f",fontSize:13,margin:"0.5rem 0 0",padding:0,textAlign:"center"},
  authMessage:{color:C.tx,fontSize:14,lineHeight:1.5,textAlign:"center",margin:"1rem 0 1.5rem"},
  authLink:{textAlign:"center",fontSize:13,color:C.mt,margin:"1rem 0 0"},
  authLinkBtn:{background:"none",border:"none",color:C.ac,cursor:"pointer",textDecoration:"underline",fontSize:13,fontFamily:fs},
  // Modal styles
  modalOverlay:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"20px"},
  modalContent:{background:"#fff",borderRadius:12,maxWidth:600,width:"100%",maxHeight:"90vh",overflow:"hidden",boxShadow:"0 10px 30px rgba(0,0,0,0.2)"},
  modalHeader:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 24px",borderBottom:`1px solid ${C.bd}`},
  modalTitle:{margin:0,fontSize:18,fontWeight:600,color:C.tx},
  modalCloseBtn:{background:"none",border:"none",fontSize:24,color:C.mt,cursor:"pointer",padding:0,lineHeight:1},
  modalBody:{padding:"20px 24px",maxHeight:"70vh",overflowY:"auto"},
  userSection:{marginBottom:"2rem"},
  sectionTitle:{fontSize:14,fontWeight:600,color:C.ac,marginBottom:"1rem",textTransform:"uppercase",letterSpacing:"0.05em"},
  userItem:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:C.bl,borderRadius:8,marginBottom:"0.5rem"},
  userInfo:{display:"flex",flexDirection:"column",gap:"4px"},
  userEmail:{fontSize:12,color:C.mt},
  userDate:{fontSize:12,color:C.mt},
  userRole:{fontSize:12,color:C.ac,fontWeight:500},
  userActions:{display:"flex",alignItems:"center",gap:"8px"},
  approveBtn:{background:"#4CAF50",border:"none",color:"#fff",padding:"6px 12px",borderRadius:6,cursor:"pointer",fontSize:12,fontFamily:fs},
  rejectBtn:{background:"#f44336",border:"none",color:"#fff",padding:"6px 12px",borderRadius:6,cursor:"pointer",fontSize:12,fontFamily:fs},
  removeBtn:{background:"#ff9800",border:"none",color:"#fff",padding:"6px 12px",borderRadius:6,cursor:"pointer",fontSize:12,fontFamily:fs},
  roleSelect:{padding:"6px 8px",borderRadius:6,border:`1px solid ${C.bd}`,fontSize:12,fontFamily:fs,marginRight:"8px"},
  container:{background:C.bg,minHeight:"100vh",fontFamily:fs,color:C.tx},
  toolbar:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",background:C.ac,color:"#fff",position:"sticky",top:0,zIndex:100,flexWrap:"wrap",gap:6},
  tbLeft:{display:"flex",alignItems:"center"},tbRight:{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"},
  appTitle:{margin:0,fontSize:17,fontFamily:ff,fontWeight:600,letterSpacing:"0.02em"},
  userInfo:{color:"rgba(255,255,255,0.8)",fontSize:12,fontFamily:fs,padding:"0 8px"},
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
  pItem:{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:"10px 12px",margin:"2px 0",background:"#fff",borderRadius:6,border:`1px solid ${C.bl}`,flexWrap:"wrap"},
  pItemL:{fontSize:14,fontWeight:600,color:C.tx,minWidth:"140px"},pItemV:{fontSize:14,color:C.tx,textAlign:"right",fontWeight:500},
  pNote:{margin:"3px 0 0",fontSize:12,color:C.mt,fontStyle:"italic",width:"100%"},
  pAnnouncements:{margin:"8px 0 0",width:"100%"},
  pAnnouncementItem:{display:"flex",alignItems:"flex-start",margin:"4px 0",lineHeight:1.4},
  pBullet:{color:C.ac,fontWeight:"bold",marginRight:8,fontSize:16,lineHeight:1},
  pAnnouncementText:{fontSize:13,color:C.tx,flex:1},
  pOpeningText:{padding:"12px 0",margin:"8px 0 16px",fontSize:14,color:C.tx,lineHeight:1.6,fontStyle:"italic",textAlign:"center",background:C.bl,borderRadius:8},
  pBizSec:{padding:"10px 0",margin:"6px 0",borderBottom:`1px solid ${C.bl}`},
  pSecT:{display:"block",fontSize:13,fontWeight:600,color:C.ac,marginBottom:6},
  pBizGrp:{marginBottom:16,padding:16,background:"#fff",borderRadius:8,border:`2px solid ${C.ac}`,boxShadow:"0 2px 8px rgba(0,0,0,0.1)"},pBizLbl:{display:"block",fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:C.ac,marginBottom:8,fontFamily:fs,textAlign:"center",background:C.bl,padding:"4px 8px",borderRadius:4},
  pBizItem:{fontSize:14,color:C.tx,padding:"4px 12px",margin:"2px 0",background:C.bl,borderRadius:4,lineHeight:1.5},
  pNameItem:{fontSize:16,padding:"6px 12px",margin:"2px 0",background:C.bl,borderRadius:4,textAlign:"left"},
  pNameText:{fontWeight:600,color:C.tx,fontSize:15},
  pCallingText:{fontWeight:400,color:C.mt,fontSize:14,fontStyle:"italic"},
  pBizSubSection:{marginBottom:20},
  pSubSectionHeader:{fontSize:16,fontWeight:700,color:C.ac,marginBottom:8,textAlign:"center",textTransform:"uppercase",letterSpacing:"0.1em"},
  pNameItemClean:{fontSize:15,padding:"4px 0",margin:"2px 0",textAlign:"left"},
  pNameTextBold:{fontWeight:700,color:C.tx,fontSize:15},
  pCallingTextClean:{fontWeight:400,color:C.tx,fontSize:15},
  pSection:{marginBottom:24,paddingBottom:16,borderBottom:`2px solid ${C.bd}`,pageBreakInside:"avoid"},
  pSectionTitle:{fontSize:18,fontWeight:600,marginBottom:12,textTransform:"uppercase",letterSpacing:"0.08em",textAlign:"center",background:`linear-gradient(135deg, ${C.ac} 0%, #5a7ba0 100%)`,color:"#fff",padding:"8px 16px",borderRadius:8,fontFamily:fs},
  pReadingText:{padding:"8px 12px",margin:"4px 0",fontSize:14,color:C.tx,lineHeight:1.6,fontStyle:"italic",background:C.bl,borderRadius:6},
  pWaitText:{padding:"4px 12px",margin:"2px 0",fontSize:12,color:C.mt,fontWeight:600,fontStyle:"normal",textAlign:"center",background:"#f8f8f8",borderRadius:4},
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
