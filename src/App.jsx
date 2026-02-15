import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import DEFAULT_HYMNS from "./hymns";
import DEFAULT_NAMES from "./names";
import api, { connectWebSocket, addWebSocketListener } from "./api";

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
    releases: [{ name: "", calling: "" }],
    sustainings: [{ name: "", calling: "" }],
    baptismsConfirmations: [{ name: "", type: "" }],
    newMembers: [{ name: "", from: "" }],
    ordinations: [{ name: "", office: "" }],
    other: ""
  },
  sacramentHymn: { number: "", title: "" },
  isFastSunday: false,
  speakers: [{ name: "", topic: "", intermediateMusic: null }],
  youthSpeakers: [{ name: "", topic: "", intermediateMusic: null }],
  musicalNumbers: [{ performers: "", title: "" }],
  isPrimaryProgram: false,
  primaryTheme: "",
  primaryPresiding: "",
  primaryConducting: "",
  primaryOpeningHymn: { number: "", title: "" },
  primaryClosingHymn: { number: "", title: "" },
  isEaster: false,
  isChristmas: false,
  christmasTheme: "The Light of the World",
  closingHymn: { number: "", title: "" },
  benediction: ""
};

const DEFAULT_SMART_TEXT = {
  openingText: "",
  reverenceText: "Thank you for your reverence during the sacrament ordinance.",
  appreciationText: "We appreciate those who have participated today. Thanks to our Chorister ${agenda.chorister} and our Organist ${agenda.organist} for the music. We will close by singing hymn #${agenda.closingHymn.number} \"${agenda.closingHymn.title}\" after which ${agenda.benediction} will offer the benediction."
};

const USER_ROLES = {
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER'
};

const BIZ_SECTIONS = {
  releases: { itemLabel: "Release", fields: ["name", "calling"], labels: ["Name", "Calling"] },
  sustainings: { itemLabel: "Sustaining", fields: ["name", "calling"], labels: ["Name", "Calling"] },
  baptismsConfirmations: { itemLabel: "Baptism/Confirmation", fields: ["name", "type"], labels: ["Name", "Type (Baptism/Confirmation)"] },
  newMembers: { itemLabel: "New Member", fields: ["name", "from"], labels: ["Name", "Moving from"] },
  ordinations: { itemLabel: "Ordination", fields: ["name", "office"], labels: ["Name", "Office"] }
};

// ── UTILITIES ──
function getNextSunday() {
  const today = new Date();
  const day = today.getDay();
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilSunday);
  return nextSunday.toISOString().split('T')[0];
}

// ── HYMN INPUT COMPONENT ──
const HymnInput = memo(({ label, hymn, onChange, allHymns }) => {
  return (
    <div style={S.fieldGroup}>
      <label style={S.fieldLabel}>{label}</label>
      <div style={S.hymnRow}>
        <input style={S.hymnNum} type="text" placeholder="#" value={hymn.number}
          onChange={e => onChange({ ...hymn, number: e.target.value, title: allHymns[e.target.value] || hymn.title })} />
        <input style={S.hymnTitle} type="text" placeholder="Hymn title" value={hymn.title}
          onChange={e => onChange({ ...hymn, title: e.target.value })} />
      </div>
    </div>
  );
});

// ── NAME DROPDOWN COMPONENT ──
const NameDropdown = memo(({ label, value, options, onChange }) => (
  <div>
    <label style={S.fieldLabel}>{label}</label>
    <select style={S.input} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">— Select {label} —</option>
      {[...options].sort((a, b) => a.localeCompare(b)).map(name => (
        <option key={name} value={name}>{name}</option>
      ))}
    </select>
  </div>
));

// ── SECTION COMPONENT ──
const Section = memo(({ label, isOpen, onToggle, children }) => (
  <div style={S.section}>
    <div style={S.sectionHeader} onClick={onToggle}>
      <span style={S.sectionTitle}>{label}</span>
      <span style={S.sectionToggle}>{isOpen ? "−" : "+"}</span>
    </div>
    {isOpen && <div style={S.sectionBody}>{children}</div>}
  </div>
));

// ── AUTHENTICATION COMPONENTS ──
function LoginForm({ onLogin, onSwitchToRegister }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await api.login(username.trim(), password);
      onLogin(result.user);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={A.container}>
      <div style={A.form}>
        <h2 style={A.title}>Login to Sacrament Agenda</h2>
        {error && <div style={A.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <input style={A.input} type="text" placeholder="Username" value={username}
            onChange={e => setUsername(e.target.value)} disabled={loading} />
          <input style={A.input} type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} disabled={loading} />
          <button style={A.button} type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p style={A.switchText}>
          Don't have an account? <button style={A.switchLink} onClick={onSwitchToRegister}>Register here</button>
        </p>
      </div>
    </div>
  );
}

function RegisterForm({ onRegister, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    username: "", email: "", password: "", fullName: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { username, email, password, fullName } = formData;

    if (!username.trim() || !email.trim() || !password.trim() || !fullName.trim()) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await api.register({
        username: username.trim(),
        email: email.trim(),
        password,
        fullName: fullName.trim()
      });

      if (result.isFirstUser) {
        onRegister(result.user);
      } else {
        onRegister({ requiresApproval: true });
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={A.container}>
      <div style={A.form}>
        <h2 style={A.title}>Register for Sacrament Agenda</h2>
        {error && <div style={A.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <input style={A.input} type="text" placeholder="Full Name" value={formData.fullName}
            onChange={e => setFormData(p => ({ ...p, fullName: e.target.value }))} disabled={loading} />
          <input style={A.input} type="text" placeholder="Username" value={formData.username}
            onChange={e => setFormData(p => ({ ...p, username: e.target.value }))} disabled={loading} />
          <input style={A.input} type="email" placeholder="Email" value={formData.email}
            onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} disabled={loading} />
          <input style={A.input} type="password" placeholder="Password (min 6 characters)" value={formData.password}
            onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} disabled={loading} />
          <button style={A.button} type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>
        <p style={A.switchText}>
          Already have an account? <button style={A.switchLink} onClick={onSwitchToLogin}>Login here</button>
        </p>
      </div>
    </div>
  );
}

function PendingApproval() {
  return (
    <div style={A.container}>
      <div style={A.form}>
        <h2 style={A.title}>Account Pending Approval</h2>
        <p style={A.message}>
          Your account has been created and is waiting for approval from an administrator.
          You will be able to access the application once your account is approved.
        </p>
        <p style={A.message}>
          Please check back later or contact your ward administrator.
        </p>
      </div>
    </div>
  );
}

// ── SETTINGS MODAL ──
function SettingsModal({ isOpen, onClose, nameGroups, onSaveNames, customHymns, onSaveHymns, smartText, onSaveSmartText }) {
  const [groups, setGroups] = useState(nameGroups);
  const [newName, setNewName] = useState({ presiding: "", conducting: "", chorister: "", organist: "" });
  const [hymns, setHymns] = useState(customHymns);
  const [newHymn, setNewHymn] = useState({ number: "", title: "" });
  const [csvFile, setCsvFile] = useState(null);
  const [textSettings, setTextSettings] = useState(smartText || DEFAULT_SMART_TEXT);
  const [tab, setTab] = useState("names");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setGroups(nameGroups);
    setHymns(customHymns);
    setTextSettings(smartText || DEFAULT_SMART_TEXT);
    setCsvFile(null);
  }, [nameGroups, customHymns, smartText]);

  if (!isOpen) return null;

  const addName = async (group) => {
    const v = newName[group]?.trim();
    if (!v) return;

    setLoading(true);
    try {
      const updatedGroups = await api.addName(group, v);
      setGroups(updatedGroups);
      onSaveNames(updatedGroups);
      setNewName(p => ({ ...p, [group]: "" }));
    } catch (error) {
      console.error('Failed to add name:', error);
      alert('Failed to add name: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const removeName = async (group, idx) => {
    const nameToRemove = groups[group][idx];

    setLoading(true);
    try {
      const updatedGroups = await api.removeName(group, nameToRemove);
      setGroups(updatedGroups);
      onSaveNames(updatedGroups);
    } catch (error) {
      console.error('Failed to remove name:', error);
      alert('Failed to remove name: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const addHymn = async () => {
    const num = newHymn.number.trim();
    const title = newHymn.title.trim();
    if (!num || !title) return;

    setLoading(true);
    try {
      const updatedHymns = await api.addCustomHymn(num, title);
      setHymns(updatedHymns);
      onSaveHymns(updatedHymns);
      setNewHymn({ number: "", title: "" });
    } catch (error) {
      console.error('Failed to add hymn:', error);
      alert('Failed to add hymn: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const removeHymn = async (num) => {
    setLoading(true);
    try {
      const updatedHymns = await api.removeCustomHymn(num);
      setHymns(updatedHymns);
      onSaveHymns(updatedHymns);
    } catch (error) {
      console.error('Failed to remove hymn:', error);
      alert('Failed to remove hymn: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const parseCsvLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
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
        setLoading(true);
        try {
          for (const [number, title] of Object.entries(newHymns)) {
            await api.addCustomHymn(number, title);
          }
          const updatedHymns = await api.getCustomHymns();
          setHymns(updatedHymns);
          onSaveHymns(updatedHymns);
          setCsvFile(null);
          e.target.value = '';
        } catch (error) {
          console.error('Failed to upload hymns:', error);
          alert('Failed to upload hymns: ' + error.message);
        } finally {
          setLoading(false);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (onSaveSmartText) {
        await api.updateSmartText(textSettings);
        onSaveSmartText(textSettings);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save smart text:', error);
      alert('Failed to save smart text: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const nameCfgs = {
    presiding: { label: "Presiding", hint: "Bishopric members, stake leaders, visiting authorities (shared across all users)" },
    conducting: { label: "Conducting", hint: "Bishopric members, stake leaders, visiting authorities (shared across all users)" },
    chorister: { label: "Choristers", hint: "Ward chorister(s) (shared across all users)" },
    organist: { label: "Organists", hint: "Ward organist(s) / pianist(s) (shared across all users)" },
  };

  return (
    <div style={M.overlay} onClick={onClose}>
      <div style={M.box} onClick={e => e.stopPropagation()}>
        <div style={M.header}>
          <h3 style={M.title}>Settings</h3>
          <button style={M.closeBtn} type="button" onClick={onClose}>✕</button>
        </div>

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
                    <button style={M.nameRemove} type="button" onClick={() => removeName(key, idx)} disabled={loading}>✕</button>
                  </div>
                ))}
              </div>
              <div style={M.addRow}>
                <input style={M.addInput} type="text" placeholder="Add name..."
                  value={newName[key] || ""} onChange={e => setNewName(p => ({ ...p, [key]: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addName(key); } }}
                  disabled={loading} />
                <button style={M.addBtnS} type="button" onClick={() => addName(key)} disabled={loading}>
                  {loading ? "..." : "Add"}
                </button>
              </div>
            </div>
          ))}

          {tab === "hymns" && (
            <div>
              <p style={M.groupHint}>Add new hymns from "Hymns—For Home and Church" or other sources as they're released. These supplement the built-in 1985 hymnal and are shared across all users.</p>

              <div style={M.csvSection}>
                <div style={M.csvLabel}>Upload CSV File</div>
                <p style={{ ...M.groupHint, marginBottom: 8 }}>Upload a CSV file with hymn numbers and titles (format: number,title)</p>
                <input type="file" accept=".csv" onChange={handleCsvUpload} style={M.csvInput} disabled={loading} />
              </div>

              <div style={M.divider}>OR</div>

              <div style={{ ...M.addRow, marginBottom: 12 }}>
                <input style={{ ...M.addInput, width: 70, flex: "none" }} type="text" placeholder="#"
                  value={newHymn.number} onChange={e => setNewHymn(p => ({ ...p, number: e.target.value }))}
                  disabled={loading} />
                <input style={M.addInput} type="text" placeholder="Hymn title"
                  value={newHymn.title} onChange={e => setNewHymn(p => ({ ...p, title: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addHymn(); } }}
                  disabled={loading} />
                <button style={M.addBtnS} type="button" onClick={addHymn} disabled={loading}>
                  {loading ? "..." : "Add"}
                </button>
              </div>
              {Object.keys(hymns).length === 0 ? (
                <p style={{ ...M.groupHint, textAlign: "center", padding: 16 }}>No custom hymns added yet.</p>
              ) : (
                <div style={M.hymnList}>
                  {Object.entries(hymns).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([num, title]) => (
                    <div key={num} style={M.hymnItem}>
                      <span style={M.hymnNum}>#{num}</span>
                      <span style={M.hymnTitle}>{title}</span>
                      <button style={M.nameRemove} type="button" onClick={() => removeHymn(num)} disabled={loading}>✕</button>
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
                  disabled={loading}
                />
              </div>
              <div style={M.group}>
                <label style={M.groupLabel}>Reverence Text</label>
                <textarea
                  style={{ ...M.input, height: "40px", fontFamily: "monospace", fontSize: "12px" }}
                  value={textSettings?.reverenceText || DEFAULT_SMART_TEXT.reverenceText}
                  onChange={e => setTextSettings(prev => ({ ...prev, reverenceText: e.target.value }))}
                  disabled={loading}
                />
              </div>
              <div style={M.group}>
                <label style={M.groupLabel}>Appreciation Text</label>
                <textarea
                  style={{ ...M.input, height: "80px", fontFamily: "monospace", fontSize: "12px" }}
                  value={textSettings?.appreciationText || DEFAULT_SMART_TEXT.appreciationText}
                  onChange={e => setTextSettings(prev => ({ ...prev, appreciationText: e.target.value }))}
                  disabled={loading}
                />
              </div>
            </div>
          )}
        </div>

        <div style={M.footer}>
          <button style={M.cancelBtn} type="button" onClick={onClose} disabled={loading}>Cancel</button>
          <button style={M.saveBtn} type="button" onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── USER MANAGEMENT MODAL ──
function UserManagementModal({ isOpen, onClose, users, currentUser, onApproveUser, onUpdateUserRole, onRemoveUser }) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleApprove = async (userId) => {
    setLoading(true);
    try {
      await onApproveUser(userId);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, role) => {
    setLoading(true);
    try {
      await onUpdateUserRole(userId, role);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId) => {
    if (confirm('Are you sure you want to remove this user?')) {
      setLoading(true);
      try {
        await onRemoveUser(userId);
      } finally {
        setLoading(false);
      }
    }
  };

  const activeUsers = users.filter(u => u.approved);
  const pendingUsers = users.filter(u => !u.approved);

  return (
    <div style={M.overlay} onClick={onClose}>
      <div style={M.box} onClick={e => e.stopPropagation()}>
        <div style={M.header}>
          <h3 style={M.title}>User Management</h3>
          <button style={M.closeBtn} type="button" onClick={onClose}>✕</button>
        </div>

        <div style={M.body}>
          <div style={M.userSection}>
            <h4 style={M.userSectionTitle}>Active Users ({activeUsers.length})</h4>
            {activeUsers.length === 0 ? (
              <p style={M.emptyState}>No active users</p>
            ) : (
              <div style={M.userList}>
                {activeUsers.map(user => (
                  <div key={user.id} style={M.userItem}>
                    <div style={M.userInfo}>
                      <div style={M.userName}>{user.full_name}</div>
                      <div style={M.userDetails}>@{user.username} • {user.email}</div>
                    </div>
                    <div style={M.userActions}>
                      <select
                        style={M.roleSelect}
                        value={user.role}
                        onChange={e => handleRoleChange(user.id, e.target.value)}
                        disabled={loading || user.id === currentUser.id}
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="EDITOR">Editor</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                      {user.id !== currentUser.id && (
                        <button
                          style={M.removeBtn}
                          onClick={() => handleRemove(user.id)}
                          disabled={loading}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {pendingUsers.length > 0 && (
            <div style={M.userSection}>
              <h4 style={M.userSectionTitle}>Pending Approval ({pendingUsers.length})</h4>
              <div style={M.userList}>
                {pendingUsers.map(user => (
                  <div key={user.id} style={M.userItem}>
                    <div style={M.userInfo}>
                      <div style={M.userName}>{user.full_name}</div>
                      <div style={M.userDetails}>@{user.username} • {user.email}</div>
                    </div>
                    <div style={M.userActions}>
                      <button
                        style={M.approveBtn}
                        onClick={() => handleApprove(user.id)}
                        disabled={loading}
                      >
                        {loading ? "..." : "Approve"}
                      </button>
                      <button
                        style={M.removeBtn}
                        onClick={() => handleRemove(user.id)}
                        disabled={loading}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={M.footer}>
          <button style={M.cancelBtn} type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ──
export default function App() {
  const [agenda, setAgenda] = useState(null);
  const [nameGroups, setNameGroups] = useState(DEFAULT_NAMES);
  const [customHymns, setCustomHymns] = useState({});
  const [allHymns, setAllHymns] = useState(DEFAULT_HYMNS);
  const [savedAgendas, setSavedAgendas] = useState([]);
  const [view, setView] = useState("edit");
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const printRef = useRef(null);
  const [expanded, setExpanded] = useState({
    wardBusiness: false, speakers: false, youthSpeakers: false,
    musicalNumbers: false, primary: false,
  });

  // ── AUTHENTICATION & USER MANAGEMENT ──
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [smartText, setSmartText] = useState(DEFAULT_SMART_TEXT);
  const [authView, setAuthView] = useState("login");

  // Merge default + custom hymns whenever custom changes
  useEffect(() => {
    setAllHymns({ ...DEFAULT_HYMNS, ...customHymns });
  }, [customHymns]);

  // Initialize app data and check for existing auth
  useEffect(() => {
    async function init() {
      try {
        // Try to get current user (will work if we have a valid token)
        try {
          const userResult = await api.getCurrentUser();
          setCurrentUser(userResult.user);
        } catch (error) {
          // No valid session, user needs to login
          console.log('No valid session found');
        }

        // Load shared data
        try {
          const [nameGroupsResult, customHymnsResult, smartTextResult, agendasResult] = await Promise.all([
            api.getNameGroups().catch(() => DEFAULT_NAMES),
            api.getCustomHymns().catch(() => ({})),
            api.getSmartText().catch(() => DEFAULT_SMART_TEXT),
            api.getSavedAgendas().catch(() => [])
          ]);

          setNameGroups(nameGroupsResult);
          setCustomHymns(customHymnsResult);
          setSmartText(smartTextResult);
          setSavedAgendas(agendasResult);
        } catch (error) {
          console.error('Failed to load app data:', error);
        }

        setAgenda({ ...JSON.parse(JSON.stringify(EMPTY_AGENDA)), date: getNextSunday() });
      } catch (error) {
        console.error('App initialization error:', error);
        setAgenda({ ...JSON.parse(JSON.stringify(EMPTY_AGENDA)), date: getNextSunday() });
      }
      setLoading(false);
    }
    init();
  }, []);

  // Set up WebSocket for real-time updates
  useEffect(() => {
    if (currentUser) {
      const ws = connectWebSocket();

      const removeListener = addWebSocketListener((message) => {
        console.log('WebSocket message received:', message);

        switch (message.type) {
          case 'NAMES_UPDATED':
            setNameGroups(message.nameGroups);
            break;
          case 'HYMNS_UPDATED':
            setCustomHymns(message.hymns);
            break;
          case 'SMART_TEXT_UPDATED':
            setSmartText(message.smartText);
            break;
          case 'USER_REGISTERED':
          case 'USER_APPROVED':
          case 'USER_ROLE_UPDATED':
          case 'USER_REMOVED':
            // Reload users if we're an admin
            if (currentUser.role === 'ADMIN') {
              loadUsers();
            }
            break;
        }
      });

      return removeListener;
    }
  }, [currentUser]);

  // Load users (admin only)
  const loadUsers = useCallback(async () => {
    if (currentUser?.role === 'ADMIN') {
      try {
        const userList = await api.getUsers();
        setUsers(userList);
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    }
  }, [currentUser]);

  // Load users when currentUser changes and user is admin
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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
      const keys = section.split(".");
      const next = { ...prev };
      if (keys.length === 1) {
        next[keys[0]] = [...prev[keys[0]], template];
      } else if (keys.length === 2) {
        next[keys[0]] = { ...prev[keys[0]] };
        next[keys[0]][keys[1]] = [...prev[keys[0]][keys[1]], template];
      }
      return next;
    });
  }, []);

  const removeListItem = useCallback((section, idx) => {
    setAgenda(prev => {
      const keys = section.split(".");
      const next = { ...prev };
      if (keys.length === 1) {
        next[keys[0]] = prev[keys[0]].filter((_, i) => i !== idx);
      } else if (keys.length === 2) {
        next[keys[0]] = { ...prev[keys[0]] };
        next[keys[0]][keys[1]] = prev[keys[0]][keys[1]].filter((_, i) => i !== idx);
      }
      return next;
    });
  }, []);

  const toggle = useCallback((section) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const saveAgenda = useCallback(async () => {
    if (!agenda?.date) return;

    setSaveStatus("Saving...");
    try {
      await api.saveAgenda(agenda.date, agenda);

      // Update saved agendas list
      const updatedList = await api.getSavedAgendas();
      setSavedAgendas(updatedList);

      setSaveStatus("Saved!");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus("Error");
      setTimeout(() => setSaveStatus(""), 3000);
    }
  }, [agenda]);

  const loadAgenda = useCallback(async (date) => {
    try {
      const agendaData = await api.getAgenda(date);
      setAgenda(agendaData);
      setView("edit");
    } catch (error) {
      console.error('Load failed:', error);
      alert('Failed to load agenda: ' + error.message);
    }
  }, []);

  const saveNameGroups = useCallback(async (groups) => {
    setNameGroups(groups);
  }, []);

  const saveCustomHymns = useCallback(async (hymns) => {
    setCustomHymns(hymns);
  }, []);

  // ── AUTHENTICATION FUNCTIONS ──
  const handleLogin = useCallback((user) => {
    setCurrentUser(user);
  }, []);

  const handleRegister = useCallback((result) => {
    if (result.requiresApproval) {
      setAuthView("pending");
    } else {
      setCurrentUser(result);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await api.logout();
      setCurrentUser(null);
      setUsers([]);
      setAuthView("login");
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  const approveUser = useCallback(async (userId) => {
    try {
      await api.approveUser(userId);
      await loadUsers();
    } catch (error) {
      console.error('Approve user error:', error);
      alert('Failed to approve user: ' + error.message);
    }
  }, [loadUsers]);

  const updateUserRole = useCallback(async (userId, role) => {
    try {
      await api.updateUserRole(userId, role);
      await loadUsers();
    } catch (error) {
      console.error('Update user role error:', error);
      alert('Failed to update user role: ' + error.message);
    }
  }, [loadUsers]);

  const removeUser = useCallback(async (userId) => {
    try {
      await api.removeUser(userId);
      await loadUsers();
    } catch (error) {
      console.error('Remove user error:', error);
      alert('Failed to remove user: ' + error.message);
    }
  }, [loadUsers]);

  const hasPermission = useCallback((permission) => {
    if (!currentUser) return false;
    switch (permission) {
      case 'wardBusiness': return currentUser.role !== 'VIEWER';
      case 'edit': return currentUser.role !== 'VIEWER';
      case 'userManagement': return currentUser.role === 'ADMIN';
      default: return true;
    }
  }, [currentUser]);

  // Show loading screen
  if (loading) {
    return (
      <div style={S.loadingContainer}>
        <div style={S.loading}>Loading...</div>
      </div>
    );
  }

  // Show authentication if not logged in
  if (!currentUser) {
    if (authView === "pending") {
      return <PendingApproval />;
    } else if (authView === "register") {
      return <RegisterForm onRegister={handleRegister} onSwitchToLogin={() => setAuthView("login")} />;
    } else {
      return <LoginForm onLogin={handleLogin} onSwitchToRegister={() => setAuthView("register")} />;
    }
  }

  // Main application render
  return (
    <div style={S.app}>
      <div style={S.toolbar}>
        <div style={S.toolLeft}>
          <div style={S.userInfo}>
            <span style={S.userName}>{currentUser.full_name}</span>
            <span style={S.userRole}>({currentUser.role.toLowerCase()})</span>
          </div>
          <button style={S.toolBtn} type="button" onClick={() => setView(view === "edit" ? "print" : "edit")}>
            {view === "edit" ? "📄 Print View" : "✏️ Edit View"}
          </button>
          <button style={S.toolBtn} type="button" onClick={() => setShowSettings(true)}>⚙️ Settings</button>
          {hasPermission('userManagement') && (
            <button style={S.toolBtn} type="button" onClick={() => setShowUserManagement(true)}>
              👥 Users ({users.filter(u => u.approved).length})
            </button>
          )}
        </div>
        <div style={S.toolRight}>
          {hasPermission('edit') && (
            <button style={S.saveBtn} type="button" onClick={saveAgenda}>{saveStatus || "💾 Save"}</button>
          )}
          <button style={S.toolBtn} type="button" onClick={handleLogout}>🚪 Logout</button>
        </div>
      </div>

      {view === "edit" ? (
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
                      if (key === 'baptismsConfirmations' && f === 'type') {
                        return (
                          <select
                            key={`wb-${key}-${idx}-${f}`}
                            style={S.listIn}
                            value={item[f] || ""}
                            onChange={e => updateField(`wardBusiness.${key}.${idx}.${f}`, e.target.value)}
                          >
                            <option value="">— Select Type —</option>
                            <option value="Baptism">Baptism</option>
                            <option value="Confirmation">Confirmation</option>
                          </select>
                        );
                      }
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
              <label htmlFor="pt" style={S.chkLbl}>This is Primary Program</label></div>

            {agenda.isPrimaryProgram && (
              <div style={S.primaryDetails}>
                <div style={S.fieldGroup}><label style={S.fieldLabel}>Primary Theme</label><input style={S.input} type="text" placeholder="Program theme" value={agenda.primaryTheme} onChange={e => updateField("primaryTheme", e.target.value)} /></div>
                <div style={S.fRow}>
                  <div style={S.fHalf}><NameDropdown label="Primary Presiding" value={agenda.primaryPresiding} options={nameGroups.presiding || []} onChange={v => updateField("primaryPresiding", v)} /></div>
                  <div style={S.fHalf}><NameDropdown label="Primary Conducting" value={agenda.primaryConducting} options={nameGroups.conducting || []} onChange={v => updateField("primaryConducting", v)} /></div>
                </div>
                <HymnInput label="Primary Opening Hymn" hymn={agenda.primaryOpeningHymn} onChange={v => updateField("primaryOpeningHymn", v)} allHymns={allHymns} />
                <HymnInput label="Primary Closing Hymn" hymn={agenda.primaryClosingHymn} onChange={v => updateField("primaryClosingHymn", v)} allHymns={allHymns} />
              </div>
            )}

            <div style={S.chkRow}><input type="checkbox" id="es" checked={agenda.isEaster} onChange={e => {
              if (e.target.checked) {
                setAgenda(prev => ({ ...prev, isEaster: true, isFastSunday: false, isPrimaryProgram: false, isChristmas: false }));
              } else {
                updateField("isEaster", false);
              }
            }} style={S.chk} />
              <label htmlFor="es" style={S.chkLbl}>This is Easter Sunday</label></div>

            <div style={S.chkRow}><input type="checkbox" id="cs" checked={agenda.isChristmas} onChange={e => {
              if (e.target.checked) {
                setAgenda(prev => ({ ...prev, isChristmas: true, isFastSunday: false, isPrimaryProgram: false, isEaster: false }));
              } else {
                updateField("isChristmas", false);
              }
            }} style={S.chk} />
              <label htmlFor="cs" style={S.chkLbl}>This is Christmas program</label></div>

            {agenda.isChristmas && (
              <div style={S.fieldGroup}><label style={S.fieldLabel}>Christmas Theme</label><input style={S.input} type="text" value={agenda.christmasTheme} onChange={e => updateField("christmasTheme", e.target.value)} /></div>
            )}
          </Section>

          {!agenda.isFastSunday && !agenda.isPrimaryProgram && !agenda.isEaster && !agenda.isChristmas && (
            <>
              <Section label="Youth Speakers" isOpen={expanded.youthSpeakers} onToggle={() => toggle("youthSpeakers")}>
                {agenda.youthSpeakers.map((speaker, idx) => (
                  <div key={`ys-${idx}`} style={S.speakerBlock}>
                    <div style={S.listRow}>
                      <input style={S.listIn} type="text" placeholder="Name" value={speaker.name} onChange={e => updateField(`youthSpeakers.${idx}.name`, e.target.value)} />
                      <input style={S.listIn} type="text" placeholder="Topic" value={speaker.topic} onChange={e => updateField(`youthSpeakers.${idx}.topic`, e.target.value)} />
                      <button style={S.rmBtn} type="button" onClick={() => removeListItem("youthSpeakers", idx)}>✕</button>
                    </div>
                    <div style={S.intermediateRow}>
                      <label style={S.intermediateLabel}>Intermediate music after this speaker:</label>
                      <select style={S.intermediateSelect} value={speaker.intermediateMusic?.type || ""} onChange={e => {
                        const type = e.target.value;
                        if (type === "") {
                          updateField(`youthSpeakers.${idx}.intermediateMusic`, null);
                        } else {
                          updateField(`youthSpeakers.${idx}.intermediateMusic`, { type, hymn: { number: "", title: "" }, musical: { performers: "", title: "" } });
                        }
                      }}>
                        <option value="">None</option>
                        <option value="hymn">Intermediate Hymn</option>
                        <option value="musical">Musical Number</option>
                      </select>
                      {speaker.intermediateMusic?.type === "hymn" && (
                        <div style={S.hymnRow}>
                          <input style={S.hymnNum} type="text" placeholder="#" value={speaker.intermediateMusic.hymn.number}
                            onChange={e => updateField(`youthSpeakers.${idx}.intermediateMusic.hymn`, { ...speaker.intermediateMusic.hymn, number: e.target.value, title: allHymns[e.target.value] || speaker.intermediateMusic.hymn.title })} />
                          <input style={S.hymnTitle} type="text" placeholder="Hymn title" value={speaker.intermediateMusic.hymn.title}
                            onChange={e => updateField(`youthSpeakers.${idx}.intermediateMusic.hymn`, { ...speaker.intermediateMusic.hymn, title: e.target.value })} />
                        </div>
                      )}
                      {speaker.intermediateMusic?.type === "musical" && (
                        <div style={S.hymnRow}>
                          <input style={S.hymnTitle} type="text" placeholder="Performers" value={speaker.intermediateMusic.musical.performers}
                            onChange={e => updateField(`youthSpeakers.${idx}.intermediateMusic.musical`, { ...speaker.intermediateMusic.musical, performers: e.target.value })} />
                          <input style={S.hymnTitle} type="text" placeholder="Title" value={speaker.intermediateMusic.musical.title}
                            onChange={e => updateField(`youthSpeakers.${idx}.intermediateMusic.musical`, { ...speaker.intermediateMusic.musical, title: e.target.value })} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <button style={S.addBtn} type="button" onClick={() => addListItem("youthSpeakers", { name: "", topic: "", intermediateMusic: null })}>+ Add Youth Speaker</button>
              </Section>

              <Section label="Speakers" isOpen={expanded.speakers} onToggle={() => toggle("speakers")}>
                {agenda.speakers.map((speaker, idx) => (
                  <div key={`sp-${idx}`} style={S.speakerBlock}>
                    <div style={S.listRow}>
                      <input style={S.listIn} type="text" placeholder="Name" value={speaker.name} onChange={e => updateField(`speakers.${idx}.name`, e.target.value)} />
                      <input style={S.listIn} type="text" placeholder="Topic" value={speaker.topic} onChange={e => updateField(`speakers.${idx}.topic`, e.target.value)} />
                      <button style={S.rmBtn} type="button" onClick={() => removeListItem("speakers", idx)}>✕</button>
                    </div>
                    <div style={S.intermediateRow}>
                      <label style={S.intermediateLabel}>Intermediate music after this speaker:</label>
                      <select style={S.intermediateSelect} value={speaker.intermediateMusic?.type || ""} onChange={e => {
                        const type = e.target.value;
                        if (type === "") {
                          updateField(`speakers.${idx}.intermediateMusic`, null);
                        } else {
                          updateField(`speakers.${idx}.intermediateMusic`, { type, hymn: { number: "", title: "" }, musical: { performers: "", title: "" } });
                        }
                      }}>
                        <option value="">None</option>
                        <option value="hymn">Intermediate Hymn</option>
                        <option value="musical">Musical Number</option>
                      </select>
                      {speaker.intermediateMusic?.type === "hymn" && (
                        <div style={S.hymnRow}>
                          <input style={S.hymnNum} type="text" placeholder="#" value={speaker.intermediateMusic.hymn.number}
                            onChange={e => updateField(`speakers.${idx}.intermediateMusic.hymn`, { ...speaker.intermediateMusic.hymn, number: e.target.value, title: allHymns[e.target.value] || speaker.intermediateMusic.hymn.title })} />
                          <input style={S.hymnTitle} type="text" placeholder="Hymn title" value={speaker.intermediateMusic.hymn.title}
                            onChange={e => updateField(`speakers.${idx}.intermediateMusic.hymn`, { ...speaker.intermediateMusic.hymn, title: e.target.value })} />
                        </div>
                      )}
                      {speaker.intermediateMusic?.type === "musical" && (
                        <div style={S.hymnRow}>
                          <input style={S.hymnTitle} type="text" placeholder="Performers" value={speaker.intermediateMusic.musical.performers}
                            onChange={e => updateField(`speakers.${idx}.intermediateMusic.musical`, { ...speaker.intermediateMusic.musical, performers: e.target.value })} />
                          <input style={S.hymnTitle} type="text" placeholder="Title" value={speaker.intermediateMusic.musical.title}
                            onChange={e => updateField(`speakers.${idx}.intermediateMusic.musical`, { ...speaker.intermediateMusic.musical, title: e.target.value })} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <button style={S.addBtn} type="button" onClick={() => addListItem("speakers", { name: "", topic: "", intermediateMusic: null })}>+ Add Speaker</button>
              </Section>

              <Section label="Musical Numbers" isOpen={expanded.musicalNumbers} onToggle={() => toggle("musicalNumbers")}>
                {agenda.musicalNumbers.map((music, idx) => (
                  <div key={`mn-${idx}`} style={S.listRow}>
                    <input style={S.listIn} type="text" placeholder="Performers" value={music.performers} onChange={e => updateField(`musicalNumbers.${idx}.performers`, e.target.value)} />
                    <input style={S.listIn} type="text" placeholder="Title" value={music.title} onChange={e => updateField(`musicalNumbers.${idx}.title`, e.target.value)} />
                    <button style={S.rmBtn} type="button" onClick={() => removeListItem("musicalNumbers", idx)}>✕</button>
                  </div>
                ))}
                <button style={S.addBtn} type="button" onClick={() => addListItem("musicalNumbers", { performers: "", title: "" })}>+ Add Musical Number</button>
              </Section>
            </>
          )}

          <HymnInput label="Closing Hymn" hymn={agenda.closingHymn} onChange={v => updateField("closingHymn", v)} allHymns={allHymns} />
          <div style={S.fieldGroup}><label style={S.fieldLabel}>Benediction</label><input style={S.input} type="text" placeholder="Name" value={agenda.benediction} onChange={e => updateField("benediction", e.target.value)} /></div>
        </div>
      ) : (
        <div style={P.container} ref={printRef}>
          {/* Print view content would go here - keeping original print logic */}
          <div style={P.page}>
            <div style={P.header}>
              <h1 style={P.title}>SACRAMENT MEETING</h1>
              <div style={P.ward}>{agenda.wardName} Ward</div>
              <div style={P.stake}>{agenda.stakeName} Stake</div>
              <div style={P.date}>{new Date(agenda.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>

            {/* Opening text */}
            {smartText.openingText && (
              <div style={P.readingText}>{smartText.openingText}</div>
            )}

            <div style={P.section}>
              <div style={P.sectionTitle}>PRESIDING AND CONDUCTING</div>
              {agenda.presiding && <div style={P.item}><strong>Presiding:</strong> {agenda.presiding}</div>}
              {agenda.conducting && <div style={P.item}><strong>Conducting:</strong> {agenda.conducting}</div>}
              {agenda.chorister && <div style={P.item}><strong>Chorister:</strong> {agenda.chorister}</div>}
              {agenda.organist && <div style={P.item}><strong>Organist:</strong> {agenda.organist}</div>}
            </div>

            {agenda.announcements && (
              <div style={P.section}>
                <div style={P.sectionTitle}>ANNOUNCEMENTS</div>
                <div style={P.announcements}>
                  {agenda.announcements.split('\n').filter(line => line.trim()).map((line, idx) => (
                    <div key={idx} style={P.announcementItem}>• {line.trim()}</div>
                  ))}
                </div>
              </div>
            )}

            <div style={P.section}>
              <div style={P.sectionTitle}>ORDER OF SERVICE</div>

              {agenda.openingHymn.number && (
                <div style={P.item}>
                  <strong>Opening Hymn:</strong> #{agenda.openingHymn.number} "{agenda.openingHymn.title}"
                </div>
              )}

              {agenda.invocation && (
                <div style={P.item}><strong>Invocation:</strong> {agenda.invocation}</div>
              )}

              {hasPermission('wardBusiness') && Object.entries(BIZ_SECTIONS).some(([key]) =>
                (agenda.wardBusiness[key] || []).some(item => Object.values(item).some(val => val.trim()))
              ) && (
                <div style={P.section}>
                  <div style={P.sectionTitle}>WARD BUSINESS</div>
                  {Object.entries(BIZ_SECTIONS).map(([key, cfg]) => {
                    const items = (agenda.wardBusiness[key] || []).filter(item =>
                      Object.values(item).some(val => val && val.trim())
                    );
                    if (items.length === 0) return null;
                    return (
                      <div key={key}>
                        <div style={P.bizTitle}>{cfg.itemLabel}s:</div>
                        {items.map((item, idx) => (
                          <div key={idx} style={P.bizItem}>
                            {key === 'ordinations'
                              ? `${item.name} - ${item.office}`
                              : key === 'baptismsConfirmations'
                              ? `${item.name} - ${item.type}`
                              : key === 'newMembers'
                              ? `${item.name} - ${item.from}`
                              : `${item.name} - ${item.calling}`
                            }
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  {agenda.wardBusiness.other && agenda.wardBusiness.other.trim() && (
                    <div>
                      <div style={P.bizTitle}>Other Business:</div>
                      {agenda.wardBusiness.other.split('\n').filter(line => line.trim()).map((line, idx) => (
                        <div key={idx} style={P.bizItem}>• {line.trim()}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {agenda.sacramentHymn.number && (
                <div style={P.item}>
                  <strong>Sacrament Hymn:</strong> #{agenda.sacramentHymn.number} "{agenda.sacramentHymn.title}"
                </div>
              )}

              <div style={P.item}><strong>Administration of the Sacrament</strong></div>

              {/* Reverence text */}
              {smartText.reverenceText && (
                <div style={P.readingText}>{smartText.reverenceText}</div>
              )}

              {agenda.isFastSunday && (
                <div style={P.item}><strong>Fast and Testimony Meeting</strong></div>
              )}

              {agenda.isPrimaryProgram && (
                <>
                  <div style={P.item}><strong>Primary Program: "{agenda.primaryTheme}"</strong></div>
                  {agenda.primaryPresiding && <div style={P.item}>Primary Presiding: {agenda.primaryPresiding}</div>}
                  {agenda.primaryConducting && <div style={P.item}>Primary Conducting: {agenda.primaryConducting}</div>}
                  {agenda.primaryOpeningHymn.number && (
                    <div style={P.item}>Primary Opening Hymn: #{agenda.primaryOpeningHymn.number} "{agenda.primaryOpeningHymn.title}"</div>
                  )}
                  {agenda.primaryClosingHymn.number && (
                    <div style={P.item}>Primary Closing Hymn: #{agenda.primaryClosingHymn.number} "{agenda.primaryClosingHymn.title}"</div>
                  )}
                </>
              )}

              {agenda.isEaster && (
                <div style={P.item}><strong>Easter Sunday Program</strong></div>
              )}

              {agenda.isChristmas && (
                <div style={P.item}><strong>Christmas Program: "{agenda.christmasTheme}"</strong></div>
              )}

              {!agenda.isFastSunday && !agenda.isPrimaryProgram && !agenda.isEaster && !agenda.isChristmas && (
                <>
                  {agenda.youthSpeakers.filter(s => s.name.trim() || s.topic.trim()).map((speaker, idx) => (
                    <React.Fragment key={idx}>
                      <div style={P.item}>
                        <strong>Youth Speaker:</strong> {speaker.name} {speaker.topic && `- "${speaker.topic}"`}
                      </div>
                      {speaker.intermediateMusic && (
                        <div style={P.item}>
                          {speaker.intermediateMusic.type === 'hymn' && speaker.intermediateMusic.hymn.number && (
                            <>
                              <strong>Intermediate Hymn:</strong> {`#${speaker.intermediateMusic.hymn.number} "${speaker.intermediateMusic.hymn.title}"`}
                            </>
                          )}
                          {speaker.intermediateMusic.type === 'musical' && speaker.intermediateMusic.musical.performers && (
                            <div>
                              <strong>Musical Number:</strong> {speaker.intermediateMusic.musical.performers} {speaker.intermediateMusic.musical.title && `- "${speaker.intermediateMusic.musical.title}"`}
                            </div>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  ))}

                  {agenda.speakers.filter(s => s.name.trim() || s.topic.trim()).map((speaker, idx) => (
                    <React.Fragment key={idx}>
                      <div style={P.item}>
                        <strong>Speaker:</strong> {speaker.name} {speaker.topic && `- "${speaker.topic}"`}
                      </div>
                      {speaker.intermediateMusic && (
                        <div style={P.item}>
                          {speaker.intermediateMusic.type === 'hymn' && speaker.intermediateMusic.hymn.number && (
                            <>
                              <strong>Intermediate Hymn:</strong> {`#${speaker.intermediateMusic.hymn.number} "${speaker.intermediateMusic.hymn.title}"`}
                            </>
                          )}
                          {speaker.intermediateMusic.type === 'musical' && speaker.intermediateMusic.musical.performers && (
                            <div>
                              <strong>Musical Number:</strong> {speaker.intermediateMusic.musical.performers} {speaker.intermediateMusic.musical.title && `- "${speaker.intermediateMusic.musical.title}"`}
                            </div>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  ))}

                  {agenda.musicalNumbers.filter(m => m.performers.trim() || m.title.trim()).map((music, idx) => (
                    <div key={idx} style={P.item}>
                      <strong>Musical Number:</strong> {music.performers} {music.title && `- "${music.title}"`}
                    </div>
                  ))}
                </>
              )}

              {agenda.closingHymn.number && (
                <div style={P.item}>
                  <strong>Closing Hymn:</strong> #{agenda.closingHymn.number} "{agenda.closingHymn.title}"
                </div>
              )}

              {agenda.benediction && (
                <div style={P.item}><strong>Benediction:</strong> {agenda.benediction}</div>
              )}

              {/* Appreciation text with variable substitution */}
              {smartText.appreciationText && (
                <div style={P.readingText}>
                  {smartText.appreciationText
                    .replace(/\$\{agenda\.chorister\}/g, agenda.chorister || '[Chorister]')
                    .replace(/\$\{agenda\.organist\}/g, agenda.organist || '[Organist]')
                    .replace(/\$\{agenda\.closingHymn\.number\}/g, agenda.closingHymn.number || '[#]')
                    .replace(/\$\{agenda\.closingHymn\.title\}/g, agenda.closingHymn.title || '[Hymn Title]')
                    .replace(/\$\{agenda\.benediction\}/g, agenda.benediction || '[Benediction]')
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)}
        nameGroups={nameGroups} onSaveNames={saveNameGroups}
        customHymns={customHymns} onSaveHymns={saveCustomHymns}
        smartText={smartText} onSaveSmartText={setSmartText} />

      <UserManagementModal
        isOpen={showUserManagement}
        onClose={() => setShowUserManagement(false)}
        users={users}
        currentUser={currentUser}
        onApproveUser={approveUser}
        onUpdateUserRole={updateUserRole}
        onRemoveUser={removeUser}
      />
    </div>
  );
}

// ── STYLES ──
const C = { bg: "#f8f9fa", fg: "#fff", bd: "#e9ecef", tx: "#212529", mt: "#6c757d", ac: "#4a90e2", bl: "#e3f2fd" };
const fs = '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif';

const S = {
  app: { fontFamily: fs, backgroundColor: C.bg, minHeight: "100vh" },
  loadingContainer: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: fs },
  loading: { fontSize: "18px", color: C.tx },
  toolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", backgroundColor: C.fg, borderBottom: `1px solid ${C.bd}`, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  toolLeft: { display: "flex", alignItems: "center", gap: "12px" },
  toolRight: { display: "flex", alignItems: "center", gap: "12px" },
  userInfo: { display: "flex", alignItems: "center", gap: "4px", marginRight: "8px" },
  userName: { fontWeight: "600", color: C.tx },
  userRole: { fontSize: "12px", color: C.mt },
  toolBtn: { padding: "6px 12px", border: `1px solid ${C.bd}`, borderRadius: "4px", background: C.fg, color: C.tx, cursor: "pointer", fontSize: "14px", fontFamily: fs },
  saveBtn: { padding: "6px 12px", border: "none", borderRadius: "4px", background: C.ac, color: C.fg, cursor: "pointer", fontSize: "14px", fontWeight: "600", fontFamily: fs },
  formBody: { padding: "24px", maxWidth: "800px", margin: "0 auto" },
  fieldGroup: { marginBottom: "20px" },
  fieldLabel: { display: "block", marginBottom: "6px", fontWeight: "600", color: C.tx, fontSize: "14px" },
  input: { width: "100%", padding: "10px", border: `1px solid ${C.bd}`, borderRadius: "6px", fontSize: "14px", fontFamily: fs, height: "40px", boxSizing: "border-box" },
  ta: { width: "100%", padding: "10px", border: `1px solid ${C.bd}`, borderRadius: "6px", fontSize: "14px", fontFamily: fs, resize: "vertical", boxSizing: "border-box" },
  fRow: { display: "flex", gap: "16px", marginBottom: "12px" },
  fHalf: { flex: 1 },
  section: { border: `1px solid ${C.bd}`, borderRadius: "8px", marginBottom: "16px", overflow: "hidden" },
  sectionHeader: { padding: "12px 16px", backgroundColor: C.bl, borderBottom: `1px solid ${C.bd}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontWeight: "600", color: C.tx },
  sectionToggle: { color: C.mt, fontSize: "18px" },
  sectionBody: { padding: "16px" },
  chkRow: { display: "flex", alignItems: "center", marginBottom: "12px" },
  chk: { marginRight: "8px" },
  chkLbl: { fontSize: "14px", color: C.tx },
  primaryDetails: { marginTop: "12px", padding: "12px", backgroundColor: C.bg, borderRadius: "6px" },
  hymnRow: { display: "flex", gap: "8px", marginBottom: "8px" },
  hymnNum: { width: "60px" },
  hymnTitle: { flex: 1 },
  bizSub: { marginBottom: "16px" },
  subLabel: { fontWeight: "600", marginBottom: "8px", color: C.tx },
  listRow: { display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" },
  listIn: { flex: 1, padding: "10px", border: `1px solid ${C.bd}`, borderRadius: "4px", fontSize: "14px", height: "40px", boxSizing: "border-box" },
  listFull: { flex: 1, padding: "10px", border: `1px solid ${C.bd}`, borderRadius: "4px", fontSize: "14px", height: "40px", boxSizing: "border-box" },
  addBtn: { padding: "6px 12px", border: `1px solid ${C.ac}`, borderRadius: "4px", background: C.fg, color: C.ac, cursor: "pointer", fontSize: "12px", fontFamily: fs },
  rmBtn: { padding: "4px 8px", border: `1px solid #dc3545`, borderRadius: "4px", background: "#dc3545", color: C.fg, cursor: "pointer", fontSize: "12px" },
  speakerBlock: { marginBottom: "12px", padding: "8px", border: `1px solid ${C.bd}`, borderRadius: "4px", backgroundColor: C.bg },
  intermediateRow: { marginTop: "8px", fontSize: "12px" },
  intermediateLabel: { display: "block", marginBottom: "4px", color: C.mt, fontSize: "12px" },
  intermediateSelect: { padding: "10px", border: `1px solid ${C.bd}`, borderRadius: "4px", fontSize: "14px", marginBottom: "4px", height: "40px", boxSizing: "border-box" }
};

const A = {
  container: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: C.bg, fontFamily: fs },
  form: { backgroundColor: C.fg, padding: "32px", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", width: "100%", maxWidth: "400px" },
  title: { textAlign: "center", marginBottom: "24px", color: C.tx, fontSize: "24px", fontWeight: "600" },
  input: { width: "100%", padding: "12px", border: `1px solid ${C.bd}`, borderRadius: "6px", fontSize: "14px", marginBottom: "16px", fontFamily: fs, height: "48px", boxSizing: "border-box" },
  button: { width: "100%", padding: "12px", backgroundColor: C.ac, color: C.fg, border: "none", borderRadius: "6px", fontSize: "16px", fontWeight: "600", cursor: "pointer", fontFamily: fs },
  error: { backgroundColor: "#f8d7da", color: "#721c24", padding: "8px", borderRadius: "4px", marginBottom: "16px", fontSize: "14px" },
  switchText: { textAlign: "center", marginTop: "16px", color: C.mt, fontSize: "14px" },
  switchLink: { background: "none", border: "none", color: C.ac, cursor: "pointer", textDecoration: "underline", fontFamily: fs },
  message: { color: C.tx, lineHeight: 1.5, marginBottom: "12px" }
};

const M = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  box: { backgroundColor: C.fg, borderRadius: "8px", width: "90%", maxWidth: "600px", maxHeight: "80vh", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: `1px solid ${C.bd}` },
  title: { margin: 0, fontSize: "18px", fontWeight: "600", color: C.tx },
  closeBtn: { background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: C.mt, padding: "0", width: "24px", height: "24px" },
  tabs: { display: "flex", borderBottom: `1px solid ${C.bd}` },
  tab: { flex: 1, padding: "12px", background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: C.mt, borderBottom: "2px solid transparent", fontFamily: fs },
  tabActive: { flex: 1, padding: "12px", background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: C.ac, borderBottom: `2px solid ${C.ac}`, fontWeight: "600", fontFamily: fs },
  body: { padding: "24px", maxHeight: "400px", overflowY: "auto" },
  footer: { display: "flex", justifyContent: "flex-end", gap: "12px", padding: "16px 24px", borderTop: `1px solid ${C.bd}` },
  cancelBtn: { padding: "8px 16px", border: `1px solid ${C.bd}`, borderRadius: "4px", background: C.fg, color: C.tx, cursor: "pointer", fontSize: "14px", fontFamily: fs },
  saveBtn: { padding: "8px 16px", border: "none", borderRadius: "4px", background: C.ac, color: C.fg, cursor: "pointer", fontSize: "14px", fontWeight: "600", fontFamily: fs },
  group: { marginBottom: "24px" },
  groupLabel: { fontSize: "16px", fontWeight: "600", marginBottom: "8px", color: C.tx },
  groupHint: { fontSize: "12px", color: C.mt, marginBottom: "12px" },
  nameList: { display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" },
  nameTag: { display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", backgroundColor: C.bl, borderRadius: "4px", fontSize: "12px" },
  nameRemove: { background: "none", border: "none", color: "#dc3545", cursor: "pointer", fontSize: "14px", padding: "0", width: "16px", height: "16px" },
  addRow: { display: "flex", gap: "8px", alignItems: "center" },
  addInput: { flex: 1, padding: "10px", border: `1px solid ${C.bd}`, borderRadius: "4px", fontSize: "14px", fontFamily: fs, height: "40px", boxSizing: "border-box" },
  addBtnS: { padding: "6px 12px", border: `1px solid ${C.ac}`, borderRadius: "4px", background: C.ac, color: C.fg, cursor: "pointer", fontSize: "12px", fontFamily: fs },
  input: { width: "100%", padding: "10px", border: `1px solid ${C.bd}`, borderRadius: "4px", fontSize: "14px", fontFamily: fs, height: "40px", boxSizing: "border-box" },
  csvSection: { marginBottom: "16px", padding: "12px", backgroundColor: C.bg, borderRadius: "6px" },
  csvLabel: { fontWeight: "600", marginBottom: "8px", color: C.tx },
  csvInput: { width: "100%", padding: "6px", border: `1px solid ${C.bd}`, borderRadius: "4px", fontSize: "12px" },
  divider: { textAlign: "center", margin: "16px 0", color: C.mt, fontSize: "12px", fontWeight: "600" },
  hymnList: { maxHeight: "200px", overflowY: "auto", border: `1px solid ${C.bd}`, borderRadius: "4px" },
  hymnItem: { display: "flex", alignItems: "center", gap: "8px", padding: "8px", borderBottom: `1px solid ${C.bd}`, fontSize: "12px" },
  hymnNum: { fontWeight: "600", color: C.ac, minWidth: "30px" },
  hymnTitle: { flex: 1 },
  userSection: { marginBottom: "24px" },
  userSectionTitle: { fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: C.tx },
  userList: { display: "flex", flexDirection: "column", gap: "8px" },
  userItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", border: `1px solid ${C.bd}`, borderRadius: "6px" },
  userInfo: { flex: 1 },
  userName: { fontWeight: "600", color: C.tx, fontSize: "14px" },
  userDetails: { fontSize: "12px", color: C.mt, marginTop: "2px" },
  userActions: { display: "flex", gap: "8px", alignItems: "center" },
  roleSelect: { padding: "10px", border: `1px solid ${C.bd}`, borderRadius: "4px", fontSize: "14px", fontFamily: fs, height: "40px", boxSizing: "border-box" },
  approveBtn: { padding: "4px 8px", background: "#28a745", color: C.fg, border: "none", borderRadius: "4px", fontSize: "12px", cursor: "pointer", fontFamily: fs },
  removeBtn: { padding: "4px 8px", background: "#dc3545", color: C.fg, border: "none", borderRadius: "4px", fontSize: "12px", cursor: "pointer", fontFamily: fs },
  emptyState: { textAlign: "center", color: C.mt, fontStyle: "italic", padding: "16px" }
};

const P = {
  container: { backgroundColor: C.fg, fontFamily: fs },
  page: { width: "8.5in", minHeight: "11in", margin: "0 auto", padding: "0.5in", fontSize: "12px", lineHeight: 1.4, color: C.tx },
  header: { textAlign: "center", marginBottom: "32px", paddingBottom: "16px", borderBottom: `2px solid ${C.ac}` },
  title: { fontSize: "28px", fontWeight: "700", color: C.ac, margin: "0 0 8px 0", letterSpacing: "1px" },
  ward: { fontSize: "18px", fontWeight: "600", color: C.tx, margin: "4px 0" },
  stake: { fontSize: "16px", color: C.mt, margin: "2px 0" },
  date: { fontSize: "14px", color: C.mt, fontWeight: "500", marginTop: "8px" },
  section: { marginBottom: "24px", paddingBottom: "16px", borderBottom: `2px solid ${C.bd}`, pageBreakInside: "avoid" },
  sectionTitle: { fontSize: "18px", fontWeight: 600, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center", background: `linear-gradient(135deg, ${C.ac} 0%, #5a7ba0 100%)`, color: "#fff", padding: "8px 16px", borderRadius: 8, fontFamily: fs },
  item: { marginBottom: "8px", fontSize: "14px", lineHeight: 1.6 },
  announcements: { marginLeft: "16px" },
  announcementItem: { marginBottom: "4px", lineHeight: 1.5 },
  bizTitle: { fontWeight: "600", color: C.ac, marginBottom: "4px", fontSize: "14px" },
  bizItem: { fontSize: 14, color: C.tx, padding: "4px 12px", margin: "2px 0", background: C.bl, borderRadius: 4, lineHeight: 1.5 },
  readingText: { padding: "8px 12px", margin: "4px 0", fontSize: 14, color: C.tx, lineHeight: 1.6, fontStyle: "italic", background: C.bl, borderRadius: 6 },
  callingText: { fontWeight: 400, color: C.mt, fontSize: 14, fontStyle: "italic" }
};