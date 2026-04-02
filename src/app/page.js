"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useForgeData } from "@/lib/useForgeData";

const T = {
  bg: "#0A0C13", surface: "#12151E", surfaceAlt: "#171B26",
  border: "#232738", borderLight: "#2E3348",
  text: "#E4E2DC", textMuted: "#8A8880", textDim: "#5A5850",
  accent: "#C8793F", accentDim: "rgba(200,121,63,0.12)",
  teal: "#4A9E8E", tealDim: "rgba(74,158,142,0.12)",
  blue: "#6B8AFF", green: "#4ADE80", red: "#EF4444",
  coral: "#E8593C", coralDim: "rgba(232,89,60,0.10)",
  morning: "#D4A843", morningDim: "rgba(212,168,67,0.10)",
  evening: "#7B6BCC", eveningDim: "rgba(123,107,204,0.10)",
};

const DOMAIN_COLORS = ["#6B8AFF","#C8793F","#E8593C","#4ADE80","#7B6BCC","#4A9E8E","#D4A843","#EF4444"];

const gid = () => "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const toDateStr = (d) => d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
const todayStr = () => toDateStr(new Date());
const timeNow = () => { const d = new Date(); return String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0"); };
const dayLabel = (ds) => { const d = new Date(ds + "T00:00:00"); return (d.getMonth()+1) + "/" + d.getDate() + " (" + ["日","月","火","水","木","金","土"][d.getDay()] + ")"; };

export default function ForgePage() {
  const { data, setData, loading, saveStatus, logout } = useForgeData();
  const [section, setSection] = useState("today");
  const [editField, setEditField] = useState(null);
  const [tempText, setTempText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [mirrorInput, setMirrorInput] = useState("");
  const [mirrorMessages, setMirrorMessages] = useState([]);
  const [logInput, setLogInput] = useState("");
  const [logTag, setLogTag] = useState("unknown");
  const chatEndRef = useRef(null);
  const [todayPhase, setTodayPhase] = useState("day");
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [top3Draft, setTop3Draft] = useState([{text:"",domainId:""},{text:"",domainId:""},{text:"",domainId:""}]);
  const [gratitudeDraft, setGratitudeDraft] = useState("");
  const [journalDraft, setJournalDraft] = useState("");
  const [visionCheckDraft, setVisionCheckDraft] = useState("");
  const [historyDate, setHistoryDate] = useState(null);
  const [historyMonth, setHistoryMonth] = useState(() => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0"); });
  const [expandedDomain, setExpandedDomain] = useState(null);
  const [editingDomainHeader, setEditingDomainHeader] = useState(null);
  const [domainHeaderDraft, setDomainHeaderDraft] = useState({ name: "", emoji: "" });
  const [addingDomain, setAddingDomain] = useState(false);
  const [newDomain, setNewDomain] = useState({ name: "", emoji: "", color: DOMAIN_COLORS[0] });

  // ── Restore drafts ──
  useEffect(() => {
    if (!data) return;
    const dl = (data.forge.dailyLog || {})[selectedDate] || {};
    if (dl.top3) setTop3Draft(dl.top3.map(t => ({text: t.text, domainId: t.domainId || ""})).concat([{text:"",domainId:""},{text:"",domainId:""},{text:"",domainId:""}]).slice(0,3));
    else setTop3Draft([{text:"",domainId:""},{text:"",domainId:""},{text:"",domainId:""}]);
    setGratitudeDraft(dl.gratitude || "");
    setJournalDraft(dl.journal || "");
    setVisionCheckDraft(dl.visionCheck || "");
    setTodayPhase(dl.morningDone ? "day" : "morning");
    if (selectedDate === todayStr() && data.mirror?.dialogueHistory?.length > 0) {
      const latest = data.mirror.dialogueHistory[data.mirror.dialogueHistory.length - 1];
      if (latest.date === todayStr()) setMirrorMessages(latest.messages || []);
    }
  }, [selectedDate, !data]);

  // ── Helpers ──
  const updateForge = (k, v) => setData(d => ({ ...d, forge: { ...d.forge, [k]: v } }));
  const updateMirror = (k, v) => setData(d => ({ ...d, mirror: { ...d.mirror, [k]: v } }));
  const getDailyLog = (date) => data ? ((data.forge.dailyLog || {})[date || todayStr()] || {}) : {};
  const updateDailyLog = (date, ups) => setData(d => { const log = { ...(d.forge.dailyLog || {}) }; log[date] = { ...(log[date] || {}), ...ups }; return { ...d, forge: { ...d.forge, dailyLog: log } }; });
  const getDailyLogDates = () => data ? Object.keys(data.forge.dailyLog || {}).sort().reverse() : [];
  const getDomains = () => (data && data.forge.domains) || [];
  const getDomain = (id) => getDomains().find(d => d.id === id);
  const updateDomains = (updater) => setData(d => ({ ...d, forge: { ...d.forge, domains: typeof updater === "function" ? updater(d.forge.domains || []) : updater } }));

  const startEdit = (f, v) => { setEditField(f); setTempText(v || ""); };
  const saveEdit = (field) => {
    if (field === "vision" && data.forge.vision && data.forge.vision !== tempText) {
      const hist = [...(data.forge.visionHistory || []), { date: todayStr(), text: data.forge.vision }];
      setData(d => ({ ...d, forge: { ...d.forge, vision: tempText, visionHistory: hist } }));
    } else if (["antiVision","identity","vision"].includes(field)) { updateForge(field, tempText); }
    else if (field.startsWith("domain:")) {
      const [,domainId, key] = field.split(":");
      updateDomains(ds => ds.map(d => d.id === domainId ? { ...d, [key]: tempText } : d));
    }
    setEditField(null); setTempText("");
  };

  const addLog = (text, tag) => {
    const t = text || logInput; if (!t.trim()) return;
    updateForge("actionLog", [...(data.forge.actionLog || []), { id: gid(), date: selectedDate, time: timeNow(), text: t.trim(), tag: tag || logTag }]);
    if (!text) { setLogInput(""); setLogTag("unknown"); }
  };

  const addDomain = () => {
    if (!newDomain.name.trim()) return;
    updateDomains(ds => [...ds, { id: gid(), name: newDomain.name.trim(), emoji: newDomain.emoji || "◆", color: newDomain.color, vision: "", goal1year: "", goalQuarter: "", goalMonth: "", goalWeek: "" }]);
    setNewDomain({ name: "", emoji: "", color: DOMAIN_COLORS[(getDomains().length + 1) % DOMAIN_COLORS.length] });
    setAddingDomain(false);
  };
  const removeDomain = (id) => updateDomains(ds => ds.filter(d => d.id !== id));

  // ── Daily Cycle ──
  const completeMorning = () => {
    const tasks = top3Draft.filter(t => t.text.trim()).map((t, i) => ({ id: "t" + (i+1), text: t.text.trim(), status: "undone", domainId: t.domainId || "" }));
    if (tasks.length === 0) return;
    updateDailyLog(selectedDate, { top3: tasks, gratitude: gratitudeDraft, morningDone: true });
    setTodayPhase("day");
  };
  const updateTop3Status = (idx, status) => {
    const dl = getDailyLog(selectedDate); if (!dl.top3) return;
    updateDailyLog(selectedDate, { top3: dl.top3.map((t, i) => i === idx ? { ...t, status } : t) });
  };
  const completeEvening = () => {
    const nextDay = (() => { const d = new Date(selectedDate + "T00:00:00"); d.setDate(d.getDate() + 1); return toDateStr(d); })();
    setData(d => {
      const log = { ...(d.forge.dailyLog || {}) };
      const dayLog = { ...(log[selectedDate] || {}), journal: journalDraft, visionCheck: visionCheckDraft, eveningDone: true };
      log[selectedDate] = dayLog;
      if (dayLog.top3) {
        const undone = dayLog.top3.filter(t => t.status === "undone");
        if (undone.length > 0) {
          log[nextDay] = { ...(log[nextDay] || {}), top3: [...((log[nextDay] || {}).top3 || []), ...undone.map((t, i) => ({ id: "carry" + (i+1), text: t.text, status: "undone", domainId: t.domainId || "" }))] };
        }
      }
      return { ...d, forge: { ...d.forge, dailyLog: log } };
    });
  };

  // ── Mirror AI ──
  const sendMirrorMessage = async () => {
    if (!mirrorInput.trim() || aiLoading) return;
    const userMsg = { role: "user", text: mirrorInput.trim(), time: timeNow() };
    const newMsgs = [...mirrorMessages, userMsg]; setMirrorMessages(newMsgs); setMirrorInput(""); setAiLoading(true);
    try {
      const domains = getDomains();
      const domainCtx = domains.map(d => d.name + ": " + (d.vision || "未設定")).join("\n");
      const ctx = [data.forge.antiVision && ("Anti-Vision: " + data.forge.antiVision), data.forge.vision && ("Vision: " + data.forge.vision), data.forge.identity && ("Identity: " + data.forge.identity), domains.length > 0 && ("領域:\n" + domainCtx)].filter(Boolean).join("\n");
      const logs = (data.forge.actionLog || []).slice(-5).map(l => "[" + l.tag + "] " + l.text).join("\n");
      const dl = getDailyLog(); const t3 = dl.top3 ? dl.top3.map(t => { const dom = getDomain(t.domainId); return "[" + t.status + "]" + (dom ? " [" + dom.name + "]" : "") + " " + t.text; }).join("\n") : "";
      const weekDates = getDailyLogDates().filter(d => d !== todayStr()).slice(0, 7);
      const weekCtx = weekDates.map(d => { const wdl = getDailyLog(d); if (!wdl.top3) return ""; return d + ": " + wdl.top3.map(t => { const dom = getDomain(t.domainId); return (t.status === "done" ? "○" : t.status === "partial" ? "△" : "×") + (dom ? dom.name[0] : ""); }).join(" "); }).filter(Boolean).join("\n");
      // Domain distribution for last 7 days
      const domDist = {};
      weekDates.concat([todayStr()]).forEach(d => { const wdl = getDailyLog(d); if (wdl.top3) wdl.top3.forEach(t => { if (t.domainId) { domDist[t.domainId] = (domDist[t.domainId] || 0) + 1; } }); });
      const distCtx = Object.entries(domDist).map(([id, count]) => { const dom = getDomain(id); return dom ? dom.name + ": " + count + "件" : ""; }).filter(Boolean).join(", ");

      const res = await fetch("/api/mirror", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: "あなたはMIRRORの対話AIです。ユーザーのありのままを映す鏡。評価せず励まさず事実を映す。問いを投げかけ気づきを促す。\n\nコンテキスト:\n" + ctx + "\n\nログ:\n" + logs + "\n\nTop3:\n" + t3 + "\n\n過去7日:\n" + weekCtx + "\n\n領域分布(7日):" + distCtx + "\n\n2〜4文+1つの問い。",
          messages: newMsgs.map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })),
        }),
      });
      const result = await res.json(); const aiText = result.text || "接続エラー";
      const finalMsgs = [...newMsgs, { role: "assistant", text: aiText, time: timeNow() }];
      setMirrorMessages(finalMsgs);
      const hist = [...(data.mirror.dialogueHistory || [])]; const ti = hist.findIndex(h => h.date === todayStr());
      if (ti >= 0) hist[ti] = { date: todayStr(), messages: finalMsgs }; else hist.push({ date: todayStr(), messages: finalMsgs });
      updateMirror("dialogueHistory", hist);
    } catch (err) { console.error(err); setMirrorMessages([...newMsgs, { role: "assistant", text: "接続エラー", time: timeNow() }]); }
    setAiLoading(false);
  };
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mirrorMessages]);

  // ── Computed ──
  const nextInterrupt = useMemo(() => {
    if (!data) return null;
    return (data.forge.patternInterrupts || []).find(pi => pi.time > timeNow()) || null;
  }, [data, section, todayPhase]);
  const todayLogs = useMemo(() => data ? (data.forge.actionLog || []).filter(l => l.date === selectedDate).reverse() : [], [data, selectedDate]);

  const stats = useMemo(() => {
    if (!data) return { streak: 0, weekDone: 0, weekTotal: 0, pureCount: 0, fearCount: 0, domainDist: {} };
    const dates = Object.keys(data.forge.dailyLog || {}).sort().reverse();
    let streak = 0; const today = todayStr();
    for (const d of dates) { const dl = (data.forge.dailyLog || {})[d]; if (dl && dl.morningDone) streak++; else if (d !== today) break; }
    let weekDone = 0, weekTotal = 0; const domainDist = {};
    dates.slice(0, 7).forEach(d => { const dl = (data.forge.dailyLog || {})[d]; if (dl && dl.top3) { dl.top3.forEach(t => { weekTotal++; if (t.status === "done") weekDone++; if (t.domainId) domainDist[t.domainId] = (domainDist[t.domainId] || 0) + 1; }); } });
    const recent = (data.forge.actionLog || []).slice(-30);
    return { streak, weekDone, weekTotal, pureCount: recent.filter(l => l.tag === "pure").length, fearCount: recent.filter(l => l.tag === "fear").length, domainDist };
  }, [data]);

  if (loading || !data) return (<div style={{ background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: T.textMuted, fontSize: 14 }}>Loading...</div></div>);

  const NAV = [{ id: "today", icon: "◉", label: "Today" }, { id: "foundation", icon: "△", label: "Foundation" }, { id: "mirror", icon: "◇", label: "Mirror" }, { id: "history", icon: "◫", label: "History" }];
  const tagColors = { pure: T.teal, fear: T.coral, unknown: T.textDim };
  const tagLabels = { pure: "純粋", fear: "恐怖", unknown: "不明" };
  const statusIcons = { done: "○", partial: "△", undone: "×" };
  const statusColors = { done: T.green, partial: T.morning, undone: T.red };
  const dl = getDailyLog(selectedDate);
  const isViewingToday = selectedDate === todayStr();
  const shiftDate = (days) => { const d = new Date(selectedDate + "T00:00:00"); d.setDate(d.getDate() + days); setSelectedDate(toDateStr(d)); };
  const domains = getDomains();

  // ── Render: Editable Card ──
  const renderEditableCard = (label, value, field, accent, placeholder, multiline, question) => (
    <div key={field} style={{ background: T.surface, border: "1px solid " + T.border, borderLeft: "3px solid " + accent, borderRadius: 10, padding: "16px 20px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: question ? 4 : 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: accent, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
        {editField !== field && <button onClick={() => startEdit(field, value)} style={{ ...btnSm, color: T.textMuted }}>編集</button>}
      </div>
      {question && <div style={{ fontSize: 12, color: T.textDim, marginBottom: 8, fontStyle: "italic", fontFamily: "var(--fc)" }}>{question}</div>}
      {editField === field ? (<div>
        {multiline ? <textarea value={tempText} onChange={e => setTempText(e.target.value)} rows={3} placeholder={placeholder} style={{ ...inputBase, width: "100%", resize: "vertical", minHeight: 60 }} autoFocus />
        : <input value={tempText} onChange={e => setTempText(e.target.value)} placeholder={placeholder} style={{ ...inputBase, width: "100%" }} autoFocus onKeyDown={e => e.key === "Enter" && saveEdit(field)} />}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}><button onClick={() => saveEdit(field)} style={{ ...btnPrimary }}>保存</button><button onClick={() => setEditField(null)} style={{ ...btnSm, color: T.textMuted }}>キャンセル</button></div>
      </div>) : (<div style={{ fontSize: 14, color: value ? T.text : T.textDim, lineHeight: 1.7, fontFamily: "var(--fc)", fontStyle: value ? "normal" : "italic" }}>{value || placeholder}</div>)}
    </div>
  );

  // ── Render: Domain pill (for Top 3 tagging) ──
  const renderDomainPills = (selectedId, onSelect) => {
    if (domains.length === 0) return null;
    return (<div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 4 }}>
      {domains.map(d => (<button key={d.id} onClick={() => onSelect(selectedId === d.id ? "" : d.id)} style={{
        ...btnSm, fontSize: 9, padding: "2px 8px", borderRadius: 10,
        background: selectedId === d.id ? d.color + "25" : "transparent",
        color: selectedId === d.id ? d.color : T.textDim,
        border: "1px solid " + (selectedId === d.id ? d.color + "60" : T.border),
      }}>{d.emoji} {d.name}</button>))}
    </div>);
  };

  // ── Render: Domain Goal Tree (Morning) ──
  const renderDomainGoalTree = () => {
    const activeDomains = domains.filter(d => d.vision || d.goalWeek || d.goalMonth || d.goalQuarter || d.goal1year);
    if (activeDomains.length === 0 && !data.forge.vision) return null;
    return (<div style={{ marginBottom: 16 }}>
      {data.forge.vision && (<div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 6, borderLeft: "2px solid " + T.accent, background: T.accent + "08", marginBottom: 4 }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: T.accent, width: 50, flexShrink: 0 }}>VISION</span>
        <span style={{ fontSize: 12, color: T.text, fontFamily: "var(--fc)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.forge.vision}</span>
      </div>)}
      {activeDomains.map(d => (<div key={d.id} style={{ marginLeft: 12, marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6, borderLeft: "2px solid " + d.color, background: d.color + "08" }}>
          <span style={{ fontSize: 11 }}>{d.emoji}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: d.color, flex: 1 }}>{d.name}</span>
          {d.goalWeek && <span style={{ fontSize: 10, color: T.textMuted, fontFamily: "var(--fc)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>今週: {d.goalWeek}</span>}
        </div>
        {d.vision && !d.goalWeek && (<div style={{ marginLeft: 28, fontSize: 10, color: T.textDim, fontStyle: "italic", padding: "2px 0" }}>{d.vision}</div>)}
      </div>))}
    </div>);
  };

  // ── Render: Domain distribution bar ──
  const renderDomainDistribution = () => {
    const total = Object.values(stats.domainDist).reduce((s, v) => s + v, 0);
    if (total === 0 || domains.length === 0) return null;
    return (<div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
      <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>7日間のエネルギー配分</div>
      <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
        {domains.map(d => { const count = stats.domainDist[d.id] || 0; if (count === 0) return null; return (<div key={d.id} style={{ width: (count / total * 100) + "%", background: d.color, transition: "width 0.3s" }} />); })}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {domains.map(d => { const count = stats.domainDist[d.id] || 0; if (count === 0) return null; return (<div key={d.id} style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: d.color }} />
          <span style={{ fontSize: 9, color: T.textMuted }}>{d.emoji}{d.name} {Math.round(count / total * 100)}%</span>
        </div>); })}
      </div>
    </div>);
  };

  // ── Render: Stats (14-day dots) ──
  const renderStats = () => {
    const dotDays = [];
    for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const ds = toDateStr(d); const ddl = getDailyLog(ds); const isToday = ds === todayStr(); let level = 0;
      if (ddl.morningDone) { level = 1; if (ddl.top3) { const done = ddl.top3.filter(t => t.status === "done").length; if (done > 0 && done < ddl.top3.length) level = 2; else if (done === ddl.top3.length) level = 3; } if (ddl.eveningDone && level >= 3) level = 4; }
      dotDays.push({ date: ds, day: d.getDate(), dow: ["日","月","火","水","木","金","土"][d.getDay()], level, isToday }); }
    const dotColors = ["transparent", T.accent + "30", T.accent + "55", T.accent + "88", T.accent];
    const dotBorders = ["1px solid " + T.border, "1px solid " + T.accent + "40", "1px solid " + T.accent + "55", "1px solid " + T.accent + "88", "1px solid " + T.accent];
    const hasAnyData = stats.streak > 0 || stats.weekTotal > 0 || dotDays.some(d => d.level > 0);
    if (!hasAnyData) return null;
    const pureRatio = stats.pureCount + stats.fearCount > 0 ? Math.round(stats.pureCount / (stats.pureCount + stats.fearCount) * 100) : null;
    return (<div style={{ marginBottom: 16 }}>
      <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 6 }}>
          {dotDays.map(d => (<div key={d.date} onClick={() => { if (!d.isToday) { setHistoryDate(d.date); setHistoryMonth(d.date.slice(0,7)); setSection("history"); } }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: d.isToday ? "default" : "pointer" }}>
            <div style={{ fontSize: 8, color: d.isToday ? T.accent : T.textDim, fontFamily: "var(--fm)" }}>{d.dow}</div>
            <div style={{ width: d.isToday ? 26 : 22, height: d.isToday ? 26 : 22, borderRadius: 4, background: d.level > 0 ? dotColors[d.level] : "transparent", border: d.isToday ? "1.5px solid " + T.accent : dotBorders[d.level], display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 8, color: d.level >= 3 ? "#fff" : d.level > 0 ? T.accent : T.textDim, fontFamily: "var(--fm)", fontWeight: d.isToday ? 600 : 400 }}>{d.day}</span>
            </div>
          </div>))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 4 }}>
          {[["未記録",0],["開始",1],["進行",2],["達成",3],["完遂",4]].map(([label,lv]) => (<div key={lv} style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: lv > 0 ? dotColors[lv] : "transparent", border: lv === 0 ? "1px solid " + T.border : "none" }} /><span style={{ fontSize: 8, color: T.textDim }}>{label}</span></div>))}
        </div>
      </div>
      {renderDomainDistribution()}
      <div style={{ display: "flex", gap: 8 }}>
        {stats.streak > 0 && <div style={{ flex: 1, background: T.surface, border: "1px solid " + T.border, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 600, color: T.accent, fontFamily: "var(--fm)" }}>{stats.streak}</div><div style={{ fontSize: 8, color: T.textDim, textTransform: "uppercase" }}>連続日数</div></div>}
        {stats.weekTotal > 0 && <div style={{ flex: 1, background: T.surface, border: "1px solid " + T.border, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 600, color: T.green, fontFamily: "var(--fm)" }}>{Math.round(stats.weekDone / stats.weekTotal * 100)}%</div><div style={{ fontSize: 8, color: T.textDim, textTransform: "uppercase" }}>週間達成率</div></div>}
        {pureRatio !== null && <div style={{ flex: 1, background: T.surface, border: "1px solid " + T.border, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 600, color: T.teal, fontFamily: "var(--fm)" }}>{pureRatio}%</div><div style={{ fontSize: 8, color: T.textDim, textTransform: "uppercase" }}>純粋率</div></div>}
      </div>
    </div>);
  };

  // ── Render: Top 3 task with domain tag ──
  const renderTop3Display = (task, idx) => {
    const dom = getDomain(task.domainId);
    return (<div key={task.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: T.surface, border: "1px solid " + T.border, borderRadius: 6, marginBottom: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: T.morning, fontFamily: "var(--fm)", width: 16, textAlign: "center", flexShrink: 0 }}>{idx+1}</span>
      {dom && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: dom.color + "20", color: dom.color, flexShrink: 0 }}>{dom.emoji}</span>}
      <span style={{ flex: 1, fontSize: 12, color: task.status === "done" ? T.textDim : T.text, textDecoration: task.status === "done" ? "line-through" : "none" }}>{task.text}</span>
      <div style={{ display: "flex", gap: 3 }}>
        {["done","partial","undone"].map(s => (<button key={s} onClick={() => updateTop3Status(idx, s)} style={{ ...btnSm, fontSize: 12, padding: "2px 6px", color: task.status === s ? statusColors[s] : T.textDim, background: task.status === s ? statusColors[s] + "15" : "transparent", border: "1px solid " + (task.status === s ? statusColors[s] + "50" : "transparent"), borderRadius: 4 }}>{statusIcons[s]}</button>))}
      </div>
    </div>);
  };

  // ═══════ TODAY ═══════
  const TodayView = () => {
    const selDate = new Date(selectedDate + "T00:00:00"); const dayNames = ["日","月","火","水","木","金","土"];
    const dateLabel = selDate.getFullYear() + "." + String(selDate.getMonth()+1).padStart(2,"0") + "." + String(selDate.getDate()).padStart(2,"0") + " (" + dayNames[selDate.getDay()] + ")";
    return (<div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <button onClick={() => shiftDate(-1)} style={{ ...btnSm, color: T.textMuted, border: "1px solid " + T.border, padding: "4px 10px", fontSize: 14 }}>←</button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: isViewingToday ? T.textDim : T.morning, letterSpacing: "0.1em", textTransform: "uppercase" }}>{dateLabel}</div>
            <h1 style={{ fontSize: 26, fontWeight: 400, color: T.text, fontFamily: "var(--fc)", margin: 0 }}>{isViewingToday ? "Today" : dayLabel(selectedDate)}</h1>
          </div>
          <button onClick={() => shiftDate(1)} disabled={isViewingToday} style={{ ...btnSm, color: isViewingToday ? T.border : T.textMuted, border: "1px solid " + T.border, padding: "4px 10px", fontSize: 14, cursor: isViewingToday ? "default" : "pointer" }}>→</button>
        </div>
        {!isViewingToday && (<div style={{ textAlign: "center" }}><button onClick={() => setSelectedDate(todayStr())} style={{ ...btnSm, color: T.accent, fontSize: 11, padding: "2px 10px", border: "1px solid " + T.accent + "44" }}>今日に戻る</button></div>)}
      </div>
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid " + T.border }}>
        {[["morning","☀","Morning",T.morning,dl.morningDone],["day","◉","Day",T.accent,false],["evening","☽","Evening",T.evening,dl.eveningDone]].map(([id,icon,label,color,done]) => (
          <div key={id} onClick={() => setTodayPhase(id)} style={{ flex: 1, padding: "8px 0", textAlign: "center", cursor: "pointer", borderBottom: todayPhase===id ? "2px solid "+color : "2px solid transparent", color: todayPhase===id ? color : T.textDim, position: "relative" }}>
            <div style={{ fontSize: 13 }}>{icon}</div><div style={{ fontSize: 9, marginTop: 2 }}>{label}</div>
            {done && <div style={{ position: "absolute", top: 4, right: "calc(50% - 22px)", width: 5, height: 5, borderRadius: "50%", background: T.green }} />}
          </div>))}
      </div>

      {/* MORNING */}
      {todayPhase === "morning" && (<div>
        {dl.morningDone ? (<div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: T.green, fontSize: 14 }}>✓</span><span style={{ fontSize: 13, color: T.textMuted }}>Morning 完了</span></div>
            <button onClick={() => updateDailyLog(selectedDate, { morningDone: false })} style={{ ...btnSm, color: T.textDim, border: "1px solid " + T.border, padding: "3px 10px" }}>修正する</button>
          </div>
          {dl.gratitude && <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8, padding: "6px 10px", background: T.surface, borderRadius: 6 }}><span style={{ color: T.morning, fontSize: 9, fontWeight: 600, marginRight: 6 }}>感謝</span>{dl.gratitude}</div>}
          {dl.top3 && dl.top3.map((task, idx) => { const dom = getDomain(task.domainId); return (<div key={task.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 12, borderBottom: "1px solid " + T.border + "33" }}>
            <span style={{ fontWeight: 600, color: T.morning, fontFamily: "var(--fm)", width: 16, textAlign: "center", flexShrink: 0 }}>{idx+1}</span>
            {dom && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 8, background: dom.color + "20", color: dom.color }}>{dom.emoji}</span>}
            <span style={{ color: task.status === "done" ? T.textDim : T.text, textDecoration: task.status === "done" ? "line-through" : "none" }}>{task.text}</span>
          </div>); })}
        </div>
        ) : (<div>
          {renderDomainGoalTree()}
          <div style={{ marginBottom: 12 }}><input value={gratitudeDraft} onChange={e => setGratitudeDraft(e.target.value)} placeholder="今朝、感謝していることは？（任意）" style={{ ...inputBase, width: "100%", fontSize: 12 }} /></div>
          <div style={{ fontSize: 13, color: T.textDim, fontFamily: "var(--fc)", fontStyle: "italic", lineHeight: 1.7, marginBottom: 14, padding: "10px 14px", background: T.morningDim, borderRadius: 8, border: "1px solid " + T.morning + "22" }}>この流れに今日1ミリでも近づくための、小さな行動を3つ。</div>
          {[0,1,2].map(i => (<div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.morning, fontFamily: "var(--fm)", width: 20, textAlign: "center", flexShrink: 0 }}>{i+1}</span>
              <input value={top3Draft[i].text} onChange={e => { const d = [...top3Draft]; d[i] = { ...d[i], text: e.target.value }; setTop3Draft(d); }} placeholder={i === 2 ? "（任意）" : "タスクを入力..."} style={{ ...inputBase, flex: 1 }} />
            </div>
            <div style={{ marginLeft: 28 }}>{renderDomainPills(top3Draft[i].domainId, (id) => { const d = [...top3Draft]; d[i] = { ...d[i], domainId: id }; setTop3Draft(d); })}</div>
          </div>))}
          <button onClick={completeMorning} disabled={!top3Draft[0].text.trim()} style={{ ...btnPrimary, width: "100%", marginTop: 8, opacity: top3Draft[0].text.trim() ? 1 : 0.4 }}>Morning 完了 ✓</button>
        </div>)}
      </div>)}

      {/* DAY */}
      {todayPhase === "day" && (<div>
        {renderStats()}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          <div style={{ background: T.coralDim, border: "1px solid " + T.coral + "22", borderRadius: 8, padding: "10px 12px" }}><div style={{ fontSize: 9, fontWeight: 600, color: T.coral, textTransform: "uppercase", marginBottom: 3 }}>Anti-Vision</div><div style={{ fontSize: 11, color: data.forge.antiVision ? T.text : T.textDim, fontFamily: "var(--fc)", lineHeight: 1.5 }}>{data.forge.antiVision || "未設定"}</div></div>
          <div style={{ background: T.accentDim, border: "1px solid " + T.accent + "22", borderRadius: 8, padding: "10px 12px" }}><div style={{ fontSize: 9, fontWeight: 600, color: T.accent, textTransform: "uppercase", marginBottom: 3 }}>Vision</div><div style={{ fontSize: 11, color: data.forge.vision ? T.text : T.textDim, fontFamily: "var(--fc)", lineHeight: 1.5 }}>{data.forge.vision || "未設定"}</div></div>
        </div>
        {dl.top3 && dl.top3.length > 0 && (<div style={{ marginBottom: 14 }}><div style={{ fontSize: 10, fontWeight: 600, color: T.morning, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Top 3</div>{dl.top3.map((task, idx) => renderTop3Display(task, idx))}</div>)}
        {!dl.morningDone && (<div onClick={() => setTodayPhase("morning")} style={{ background: T.morningDim, border: "1px solid " + T.morning + "22", borderRadius: 8, padding: "12px 14px", cursor: "pointer", marginBottom: 14 }}><div style={{ fontSize: 10, fontWeight: 600, color: T.morning, textTransform: "uppercase", marginBottom: 2 }}>Morning</div><div style={{ fontSize: 12, color: T.text }}>タップして始める</div></div>)}
        {nextInterrupt && (<div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}><div style={{ background: T.accentDim, borderRadius: 6, padding: "4px 8px", fontFamily: "var(--fm)", fontSize: 11, fontWeight: 600, color: T.accent, flexShrink: 0 }}>{nextInterrupt.time}</div><div style={{ fontSize: 12, color: T.text, fontFamily: "var(--fc)" }}>{nextInterrupt.question}</div></div>)}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>行動ログ</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
            <input value={logInput} onChange={e => setLogInput(e.target.value)} placeholder="今やったこと・感じたこと..." style={{ ...inputBase, flex: 1, fontSize: 12 }} onKeyDown={e => e.key === "Enter" && addLog()} />
            <div style={{ display: "flex", gap: 2 }}>{["pure","fear","unknown"].map(tag => (<button key={tag} onClick={() => setLogTag(tag)} style={{ ...btnSm, fontSize: 9, padding: "3px 6px", background: logTag === tag ? tagColors[tag] + "25" : "transparent", color: logTag === tag ? tagColors[tag] : T.textDim, border: "1px solid " + (logTag === tag ? tagColors[tag] + "50" : T.border) }}>{tagLabels[tag]}</button>))}</div>
            <button onClick={() => addLog()} style={{ ...btnPrimary, padding: "4px 10px", fontSize: 12 }}>+</button>
          </div>
          {todayLogs.slice(0,5).map(l => (<div key={l.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: "1px solid " + T.border + "33" }}><span style={{ fontSize: 9, fontFamily: "var(--fm)", color: T.textDim, flexShrink: 0 }}>{l.time}</span><span style={{ width: 4, height: 4, borderRadius: "50%", background: tagColors[l.tag], flexShrink: 0 }} /><span style={{ fontSize: 11, color: T.text, flex: 1 }}>{l.text}</span></div>))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div onClick={() => setSection("mirror")} style={{ background: T.tealDim, border: "1px solid " + T.teal + "22", borderRadius: 8, padding: "10px 12px", cursor: "pointer" }}><div style={{ fontSize: 9, fontWeight: 600, color: T.teal, textTransform: "uppercase", marginBottom: 2 }}>Mirror</div><div style={{ fontSize: 11, color: T.text }}>鏡に向かう</div></div>
          <div onClick={() => setTodayPhase("evening")} style={{ background: T.eveningDim, border: "1px solid " + T.evening + "22", borderRadius: 8, padding: "10px 12px", cursor: "pointer" }}><div style={{ fontSize: 9, fontWeight: 600, color: T.evening, textTransform: "uppercase", marginBottom: 2 }}>Evening</div><div style={{ fontSize: 11, color: T.text }}>振り返る</div></div>
        </div>
      </div>)}

      {/* EVENING */}
      {todayPhase === "evening" && (<div>
        {dl.eveningDone ? (<div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: T.green, fontSize: 14 }}>✓</span><span style={{ fontSize: 13, color: T.textMuted }}>Evening 完了</span></div>
            <button onClick={() => updateDailyLog(selectedDate, { eveningDone: false })} style={{ ...btnSm, color: T.textDim, border: "1px solid " + T.border, padding: "3px 10px" }}>修正する</button>
          </div>
          {dl.top3 && dl.top3.map((task, idx) => { const dom = getDomain(task.domainId); return (<div key={task.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", fontSize: 12, borderBottom: "1px solid " + T.border + "33" }}>
            <span style={{ color: statusColors[task.status] }}>{statusIcons[task.status]}</span>
            {dom && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 8, background: dom.color + "20", color: dom.color }}>{dom.emoji}</span>}
            <span style={{ color: task.status === "done" ? T.textDim : T.text, textDecoration: task.status === "done" ? "line-through" : "none" }}>{task.text}</span>
          </div>); })}
          {dl.journal && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 8, padding: "6px 10px", background: T.surface, borderRadius: 6, borderLeft: "2px solid " + T.evening }}><span style={{ color: T.evening, fontSize: 9, fontWeight: 600, marginRight: 6 }}>Journal</span>{dl.journal}</div>}
          {dl.visionCheck && <div style={{ fontSize: 11, color: T.textDim, marginTop: 4, fontStyle: "italic" }}>{dl.visionCheck}</div>}
        </div>
        ) : (<div>
          {dl.top3 && dl.top3.length > 0 && (<div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: T.textDim, fontFamily: "var(--fc)", fontStyle: "italic", marginBottom: 10 }}>今日の Top 3 はどうでしたか？</div>
            {dl.top3.map((task, idx) => { const dom = getDomain(task.domainId); return (<div key={task.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: T.surface, border: "1px solid " + T.border, borderRadius: 6, marginBottom: 4 }}>
              {dom && <span style={{ fontSize: 10, color: dom.color }}>{dom.emoji}</span>}
              <span style={{ flex: 1, fontSize: 12, color: T.text }}>{task.text}</span>
              <div style={{ display: "flex", gap: 4 }}>{["done","partial","undone"].map(s => (<button key={s} onClick={() => updateTop3Status(idx, s)} style={{ ...btnSm, fontSize: 13, padding: "3px 8px", color: task.status === s ? statusColors[s] : T.textDim, border: "1.5px solid " + (task.status === s ? statusColors[s] : T.border), background: task.status === s ? statusColors[s] + "15" : "transparent", borderRadius: 6 }}>{statusIcons[s]}</button>))}</div>
            </div>); })}
          </div>)}
          {!dl.top3 && <div style={{ fontSize: 12, color: T.textDim, padding: 16, textAlign: "center" }}>Morning が未完了です</div>}
          <div style={{ marginBottom: 12 }}><div style={{ fontSize: 12, color: T.textDim, fontFamily: "var(--fc)", fontStyle: "italic", marginBottom: 6 }}>今日気づいたこと・学び</div><textarea value={journalDraft} onChange={e => setJournalDraft(e.target.value)} rows={3} placeholder="ジャーナル..." style={{ ...inputBase, width: "100%", resize: "vertical", minHeight: 50 }} /></div>
          <div style={{ marginBottom: 16 }}><div style={{ fontSize: 12, color: T.textDim, fontFamily: "var(--fc)", fontStyle: "italic", marginBottom: 6 }}>今日の積み重ねは、Visionに向かっていましたか？</div><input value={visionCheckDraft} onChange={e => setVisionCheckDraft(e.target.value)} placeholder="任意" style={{ ...inputBase, width: "100%" }} /></div>
          {dl.top3 && dl.top3.filter(t => t.status === "undone").length > 0 && (<div style={{ fontSize: 11, color: T.textDim, marginBottom: 12, padding: "8px 12px", background: T.surface, borderRadius: 6, borderLeft: "2px solid " + T.morning }}><span style={{ color: T.morning, fontWeight: 600 }}>明日へ持越:</span> {dl.top3.filter(t => t.status === "undone").map(t => t.text).join(", ")}</div>)}
          <button onClick={completeEvening} style={{ ...btnPrimary, width: "100%" }}>Evening 完了 ✓</button>
        </div>)}
      </div>)}
      {getDailyLogDates().filter(d => d !== todayStr()).length > 0 && (<div onClick={() => setSection("history")} style={{ marginTop: 20, textAlign: "center", padding: "10px 0", cursor: "pointer", color: T.textDim, fontSize: 11 }}>過去の記録を見る →</div>)}
    </div>);
  };

  // ═══════ FOUNDATION ═══════
  const FoundationView = () => (<div>
    <div style={{ marginBottom: 28 }}><h1 style={{ fontSize: 26, fontWeight: 400, color: T.text, fontFamily: "var(--fc)", margin: 0 }}>Foundation</h1><div style={{ fontSize: 12, color: T.textDim, marginTop: 4 }}>恐怖と方向。アイデンティティ。人生の領域。</div></div>

    <div style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Core</div>
    {renderEditableCard("Anti-Vision — 燃料", data.forge.antiVision, "antiVision", T.coral, "「絶対にこうなりたくない」を一文で", true)}
    {renderEditableCard("Vision — 方向", data.forge.vision, "vision", T.accent, "「自分はこれから何に向かうべきか」を一文で", true)}
    {renderEditableCard("Identity — 私は誰になるのか", data.forge.identity, "identity", T.teal, "理想を手にしたあなたはどんなタイプの人間か？", true)}

    {/* Balance Wheel */}
    <div style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 28, marginBottom: 10 }}>Balance Wheel — 人生の領域</div>
    <div style={{ fontSize: 11, color: T.textDim, marginBottom: 12, fontFamily: "var(--fc)", fontStyle: "italic" }}>自分にとって大切な領域を定義し、それぞれにVisionとゴールを設定。全て任意、空でもOK。</div>

    {domains.map(d => {
      const isExp = expandedDomain === d.id;
      const isEditingHeader = editingDomainHeader === d.id;
      const filled = [d.vision, d.goal1year, d.goalQuarter, d.goalMonth, d.goalWeek].filter(Boolean).length;
      return (<div key={d.id} style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: T.surface, border: "1px solid " + (isExp ? d.color + "40" : T.border), borderRadius: isExp ? "10px 10px 0 0" : 10 }}>
          {isEditingHeader ? (<>
            <input value={domainHeaderDraft.emoji} onChange={e => setDomainHeaderDraft(p => ({...p, emoji: e.target.value}))} style={{ ...inputBase, width: 40, textAlign: "center", padding: "4px" }} maxLength={2} />
            <input value={domainHeaderDraft.name} onChange={e => setDomainHeaderDraft(p => ({...p, name: e.target.value}))} style={{ ...inputBase, flex: 1, padding: "4px 8px" }} autoFocus onKeyDown={e => { if (e.key === "Enter") { updateDomains(ds => ds.map(x => x.id === d.id ? { ...x, name: domainHeaderDraft.name, emoji: domainHeaderDraft.emoji || "◆" } : x)); setEditingDomainHeader(null); } }} />
            <button onClick={() => { updateDomains(ds => ds.map(x => x.id === d.id ? { ...x, name: domainHeaderDraft.name, emoji: domainHeaderDraft.emoji || "◆" } : x)); setEditingDomainHeader(null); }} style={{ ...btnSm, color: T.green, fontSize: 11 }}>✓</button>
            <button onClick={() => setEditingDomainHeader(null)} style={{ ...btnSm, color: T.textDim, fontSize: 11 }}>×</button>
          </>) : (<>
            <span onClick={(e) => { e.stopPropagation(); setEditingDomainHeader(d.id); setDomainHeaderDraft({ name: d.name, emoji: d.emoji }); }} style={{ fontSize: 16, cursor: "pointer" }}>{d.emoji}</span>
            <span onClick={(e) => { e.stopPropagation(); setEditingDomainHeader(d.id); setDomainHeaderDraft({ name: d.name, emoji: d.emoji }); }} style={{ fontSize: 14, fontWeight: 500, color: d.color, flex: 1, cursor: "pointer" }}>{d.name}</span>
            <span style={{ fontSize: 10, color: T.textDim }}>{filled}/5</span>
            <span onClick={() => setExpandedDomain(isExp ? null : d.id)} style={{ fontSize: 10, color: T.textDim, cursor: "pointer", padding: "4px 8px" }}>{isExp ? "▼" : "▶"}</span>
          </>)}
        </div>
        {isExp && (<div style={{ background: T.surfaceAlt, border: "1px solid " + T.border, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "14px 18px" }}>
          {renderEditableCard("Vision", d.vision, "domain:" + d.id + ":vision", d.color, "この領域で目指す姿", true)}
          {renderEditableCard("1年ゴール", d.goal1year, "domain:" + d.id + ":goal1year", d.color, "1年後の状態", false, "1年後に達成していれば？")}
          {renderEditableCard("四半期", d.goalQuarter, "domain:" + d.id + ":goalQuarter", d.color, "今四半期の焦点", false)}
          {renderEditableCard("今月", d.goalMonth, "domain:" + d.id + ":goalMonth", d.color, "今月の一歩", false)}
          {renderEditableCard("今週", d.goalWeek, "domain:" + d.id + ":goalWeek", d.color, "今週の焦点", false)}
          <button onClick={() => removeDomain(d.id)} style={{ ...btnSm, color: T.red, fontSize: 10, marginTop: 8 }}>この領域を削除</button>
        </div>)}
      </div>);
    })}

    {/* Add domain */}
    {addingDomain ? (<div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 10, padding: "14px 18px", marginTop: 8 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input value={newDomain.emoji} onChange={e => setNewDomain(p => ({...p, emoji: e.target.value}))} placeholder="絵文字" style={{ ...inputBase, width: 50, textAlign: "center" }} maxLength={2} />
        <input value={newDomain.name} onChange={e => setNewDomain(p => ({...p, name: e.target.value}))} placeholder="領域名（例: 本業DX）" style={{ ...inputBase, flex: 1 }} autoFocus onKeyDown={e => e.key === "Enter" && addDomain()} />
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {DOMAIN_COLORS.map(c => (<div key={c} onClick={() => setNewDomain(p => ({...p, color: c}))} style={{ width: 20, height: 20, borderRadius: "50%", background: c, cursor: "pointer", border: newDomain.color === c ? "2px solid #fff" : "2px solid transparent" }} />))}
      </div>
      <div style={{ display: "flex", gap: 8 }}><button onClick={addDomain} style={{ ...btnPrimary, padding: "6px 14px" }}>追加</button><button onClick={() => setAddingDomain(false)} style={{ ...btnSm, color: T.textMuted }}>キャンセル</button></div>
    </div>) : (
      <button onClick={() => setAddingDomain(true)} style={{ ...btnSm, color: T.textMuted, border: "1px dashed " + T.border, padding: "8px 16px", width: "100%", marginTop: 8 }}>+ 領域を追加</button>
    )}

    {/* Vision History & Pattern Interrupts */}
    {data.forge.visionHistory?.length > 0 && (<div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Vision の変遷</div>
      {data.forge.visionHistory.map((v, i) => (<div key={i} style={{ display: "flex", gap: 8, padding: "4px 0", borderBottom: "1px solid " + T.border + "44", fontSize: 11 }}><span style={{ color: T.textDim, fontFamily: "var(--fm)", flexShrink: 0 }}>{v.date}</span><span style={{ color: T.textMuted, fontFamily: "var(--fc)" }}>{v.text}</span></div>))}
    </div>)}
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Pattern Interrupts</div>
      {(data.forge.patternInterrupts || []).map(pi => (<div key={pi.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid " + T.border + "44" }}><span style={{ fontFamily: "var(--fm)", fontSize: 11, color: T.accent, fontWeight: 600, flexShrink: 0 }}>{pi.time}</span><span style={{ fontSize: 12, color: T.text, fontFamily: "var(--fc)" }}>{pi.question}</span></div>))}
    </div>
  </div>);

  // ═══════ MIRROR ═══════
  const MirrorView = () => (<div style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - 80px)" }}>
    <div style={{ marginBottom: 12 }}><h1 style={{ fontSize: 26, fontWeight: 400, color: T.text, fontFamily: "var(--fc)", margin: 0 }}>Mirror</h1><div style={{ fontSize: 12, color: T.textDim, marginTop: 4 }}>ありのままを映す。事実だけ。</div></div>
    <div style={{ flex: 1, overflowY: "auto", padding: "4px 0", minHeight: 200 }}>
      {mirrorMessages.length === 0 && (<div style={{ textAlign: "center", padding: "32px 16px", color: T.textDim }}><div style={{ fontSize: 24, marginBottom: 8, opacity: 0.3 }}>◇</div><div style={{ fontSize: 12, fontFamily: "var(--fc)", lineHeight: 1.8 }}>何でも話しかけてください。<br/>鏡はただ映すだけです。</div></div>)}
      {mirrorMessages.map((msg, i) => (<div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 8, padding: "0 4px" }}>
        <div style={{ maxWidth: "80%", padding: "8px 12px", borderRadius: 10, background: msg.role === "user" ? T.accent + "20" : T.surface, border: "1px solid " + (msg.role === "user" ? T.accent + "30" : T.border) }}>
          <div style={{ fontSize: 12, color: T.text, lineHeight: 1.7, fontFamily: "var(--fc)", whiteSpace: "pre-wrap" }}>{msg.text}</div>
          <div style={{ fontSize: 9, color: T.textDim, marginTop: 3, textAlign: "right" }}>{msg.time}</div>
        </div>
      </div>))}
      {aiLoading && (<div style={{ padding: "8px 12px", borderRadius: 10, background: T.surface, border: "1px solid " + T.border, display: "inline-block", marginLeft: 4 }}><div style={{ fontSize: 12, color: T.textDim }}>...</div></div>)}
      <div ref={chatEndRef} />
    </div>
    <div style={{ display: "flex", gap: 6, padding: "10px 0 4px", borderTop: "1px solid " + T.border }}>
      <input value={mirrorInput} onChange={e => setMirrorInput(e.target.value)} placeholder="鏡に向かって話す..." style={{ ...inputBase, flex: 1, fontSize: 13, padding: "8px 12px" }} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMirrorMessage(); } }} />
      <button onClick={sendMirrorMessage} disabled={aiLoading || !mirrorInput.trim()} style={{ ...btnPrimary, padding: "8px 16px", opacity: aiLoading || !mirrorInput.trim() ? 0.4 : 1 }}>送信</button>
    </div>
  </div>);

  // ═══════ HISTORY ═══════
  const HistoryView = () => {
    const [year, monthStr] = historyMonth.split("-"); const yr = parseInt(year); const mo = parseInt(monthStr) - 1;
    const firstDay = new Date(yr, mo, 1).getDay(); const daysInMonth = new Date(yr, mo + 1, 0).getDate();
    const prevMonth = () => { const d = new Date(yr, mo - 1, 1); setHistoryMonth(d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0")); setHistoryDate(null); };
    const nextMonth = () => { const d = new Date(yr, mo + 1, 1); setHistoryMonth(d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0")); setHistoryDate(null); };
    const dotColors = ["transparent", T.accent + "30", T.accent + "55", T.accent + "88", T.accent];
    const cells = []; for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) { const ds = yr + "-" + String(mo+1).padStart(2,"0") + "-" + String(d).padStart(2,"0"); const ddl = getDailyLog(ds); let level = 0;
      if (ddl.morningDone) { level = 1; if (ddl.top3) { const done = ddl.top3.filter(t => t.status === "done").length; if (done > 0 && done < ddl.top3.length) level = 2; else if (done === ddl.top3.length) level = 3; } if (ddl.eveningDone && level >= 3) level = 4; }
      cells.push({ day: d, date: ds, level, isToday: ds === todayStr(), isFuture: ds > todayStr() }); }
    const sDl = historyDate ? getDailyLog(historyDate) : null;
    const sLogs = historyDate ? (data.forge.actionLog || []).filter(l => l.date === historyDate) : [];
    const sMirror = historyDate ? (data.mirror.dialogueHistory || []).find(h => h.date === historyDate) : null;
    return (<div>
      <div style={{ marginBottom: 24 }}><h1 style={{ fontSize: 26, fontWeight: 400, color: T.text, fontFamily: "var(--fc)", margin: 0 }}>History</h1><div style={{ fontSize: 12, color: T.textDim, marginTop: 4 }}>日々の蓄積を振り返る</div></div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}><button onClick={prevMonth} style={{ ...btnSm, color: T.textMuted, border: "1px solid " + T.border, padding: "6px 12px" }}>←</button><span style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{yr}年{mo+1}月</span><button onClick={nextMonth} style={{ ...btnSm, color: T.textMuted, border: "1px solid " + T.border, padding: "6px 12px" }}>→</button></div>
      <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 10, padding: "12px 10px", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>{["日","月","火","水","木","金","土"].map(d => (<div key={d} style={{ textAlign: "center", fontSize: 9, color: T.textDim, padding: "2px 0" }}>{d}</div>))}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {cells.map((cell, i) => { if (!cell) return <div key={"e"+i} />; const isSel = historyDate === cell.date; return (
            <div key={cell.date} onClick={() => !cell.isFuture && setHistoryDate(isSel ? null : cell.date)} style={{ aspectRatio: "1", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: isSel ? T.accent + "30" : cell.level > 0 ? dotColors[cell.level] : "transparent", border: cell.isToday ? "1.5px solid " + T.accent : isSel ? "1.5px solid " + T.accent : "1px solid " + (cell.level > 0 ? dotColors[cell.level] : T.border + "60"), cursor: cell.isFuture ? "default" : "pointer", opacity: cell.isFuture ? 0.3 : 1 }}>
              <span style={{ fontSize: 11, color: cell.level >= 3 ? "#fff" : cell.isToday ? T.accent : cell.level > 0 ? T.accent : T.textDim, fontFamily: "var(--fm)", fontWeight: cell.isToday ? 600 : 400 }}>{cell.day}</span>
            </div>); })}
        </div>
      </div>
      {historyDate && (<div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 10, padding: "16px 18px" }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: T.accent, marginBottom: 12, fontFamily: "var(--fm)" }}>{dayLabel(historyDate)}</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {sDl?.morningDone && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: T.morning + "20", color: T.morning }}>Morning ✓</span>}
          {sDl?.eveningDone && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: T.evening + "20", color: T.evening }}>Evening ✓</span>}
          {!sDl?.morningDone && <span style={{ fontSize: 9, color: T.textDim }}>記録なし</span>}
        </div>
        {sDl?.gratitude && <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 8 }}><span style={{ color: T.morning, fontWeight: 600, fontSize: 10, marginRight: 6 }}>感謝</span>{sDl.gratitude}</div>}
        {sDl?.top3 && (<div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, fontWeight: 600, color: T.morning, textTransform: "uppercase", marginBottom: 6 }}>Top 3</div>{sDl.top3.map(t => { const dom = getDomain(t.domainId); return (<div key={t.id} style={{ display: "flex", gap: 6, padding: "4px 0", fontSize: 12 }}><span style={{ color: statusColors[t.status] }}>{statusIcons[t.status]}</span>{dom && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 8, background: dom.color + "20", color: dom.color }}>{dom.emoji}</span>}<span style={{ color: t.status === "done" ? T.textDim : T.text }}>{t.text}</span></div>); })}</div>)}
        {sDl?.journal && (<div style={{ marginBottom: 12, padding: "8px 12px", background: T.surfaceAlt, borderRadius: 6, borderLeft: "2px solid " + T.evening }}><div style={{ fontSize: 10, fontWeight: 600, color: T.evening, textTransform: "uppercase", marginBottom: 4 }}>Journal</div><div style={{ fontSize: 12, color: T.text, lineHeight: 1.7, fontFamily: "var(--fc)" }}>{sDl.journal}</div></div>)}
        {sDl?.visionCheck && <div style={{ fontSize: 11, color: T.textDim, fontStyle: "italic", marginBottom: 12 }}>{sDl.visionCheck}</div>}
        {sLogs.length > 0 && (<div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", marginBottom: 6 }}>行動ログ</div>{sLogs.map(l => (<div key={l.id} style={{ display: "flex", gap: 6, padding: "3px 0", fontSize: 11, borderBottom: "1px solid " + T.border + "33" }}><span style={{ fontSize: 9, fontFamily: "var(--fm)", color: T.textDim }}>{l.time}</span><span style={{ width: 4, height: 4, borderRadius: "50%", background: tagColors[l.tag] }} /><span style={{ color: T.text }}>{l.text}</span></div>))}</div>)}
        {sMirror?.messages?.length > 0 && (<div><div style={{ fontSize: 10, fontWeight: 600, color: T.teal, textTransform: "uppercase", marginBottom: 6 }}>Mirror 対話</div>{sMirror.messages.map((msg, i) => (<div key={i} style={{ padding: "4px 0", fontSize: 11, borderBottom: "1px solid " + T.border + "22" }}><span style={{ color: msg.role === "user" ? T.accent : T.teal, fontWeight: 500, marginRight: 6 }}>{msg.role === "user" ? "You" : "Mirror"}</span><span style={{ color: T.text, fontFamily: "var(--fc)" }}>{msg.text.length > 120 ? msg.text.slice(0,120) + "..." : msg.text}</span></div>))}</div>)}
      </div>)}
    </div>);
  };

  // ═══════ LAYOUT ═══════
  const navItem = (n) => (<div key={n.id} onClick={() => setSection(n.id)} title={n.label} style={{ width: 38, height: 38, borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: section === n.id ? T.accentDim : "transparent", color: section === n.id ? T.accent : T.textDim, fontSize: 14 }}><span>{n.icon}</span><span style={{ fontSize: 7, marginTop: 1 }}>{n.label}</span></div>);
  return (<div className="forge-shell">
    <nav className="forge-sidebar">
      <div style={{ fontSize: 18, marginBottom: 16, color: T.accent, fontWeight: 600, fontFamily: "var(--fc)" }}>F</div>
      {NAV.map(navItem)}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ fontSize: 7, color: saveStatus === "saved" ? T.green : saveStatus === "saving" ? T.morning : saveStatus === "error" ? T.red : "transparent", textAlign: "center", lineHeight: 1.2 }}>{saveStatus === "saved" ? "保存済✓" : saveStatus === "saving" ? "保存中" : saveStatus === "error" ? "失敗" : "　"}</div>
        <button onClick={logout} title="ログアウト" style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", fontSize: 10, padding: 4 }}>↩</button>
      </div>
    </nav>
    <main className="forge-main">
      {section === "today" && TodayView()}
      {section === "foundation" && FoundationView()}
      {section === "mirror" && MirrorView()}
      {section === "history" && HistoryView()}
    </main>
    <nav className="forge-bottomnav">
      {NAV.map(n => (<div key={n.id} onClick={() => setSection(n.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 12px", cursor: "pointer", color: section === n.id ? T.accent : T.textDim }}><span style={{ fontSize: 18 }}>{n.icon}</span><span style={{ fontSize: 9 }}>{n.label}</span></div>))}
    </nav>
  </div>);
}

const inputBase = { background: "#0A0C13", color: "#E4E2DC", border: "1px solid #232738", borderRadius: 6, padding: "7px 10px", fontSize: 12, fontFamily: "var(--fj)" };
const btnSm = { background: "transparent", border: "none", borderRadius: 5, padding: "3px 6px", fontSize: 11, cursor: "pointer", fontFamily: "var(--fj)" };
const btnPrimary = { background: "#C8793F", color: "#fff", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--fj)" };
