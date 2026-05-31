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
  gold: "#D4A843",
};

const DOMAIN_COLORS = ["#6B8AFF","#C8793F","#E8593C","#4ADE80","#7B6BCC","#4A9E8E","#D4A843","#EF4444"];
const TIMEFRAMES = [{id:"1year",label:"1年"},{id:"quarter",label:"四半期"},{id:"month",label:"今月"},{id:"week",label:"今週"},{id:"",label:"期限なし"}];

const gid = () => "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const toDateStr = (d) => d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
const todayStr = () => toDateStr(new Date());
const timeNow = () => { const d = new Date(); return String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0"); };
const dayLabel = (ds) => { const d = new Date(ds + "T00:00:00"); return (d.getMonth()+1) + "/" + d.getDate() + " (" + ["日","月","火","水","木","金","土"][d.getDay()] + ")"; };

// ═══════ ORACLE: 決定論計算（検証済） ═══════
const O_reduceNum = (n, k = true) => { while (n > 9 && !(k && (n === 11 || n === 22 || n === 33))) n = String(n).split("").reduce((a, b) => a + Number(b), 0); return n; };
const O_reduceSingle = (n) => { while (n > 9) n = String(n).split("").reduce((a, b) => a + Number(b), 0); return n; };
const O_lifePath = (y, m, d) => O_reduceNum(`${y}${m}${d}`.split("").reduce((a, b) => a + Number(b), 0));
const O_PYTH = { a:1,b:2,c:3,d:4,e:5,f:6,g:7,h:8,i:9,j:1,k:2,l:3,m:4,n:5,o:6,p:7,q:8,r:9,s:1,t:2,u:3,v:4,w:5,x:6,y:7,z:8 };
const O_destinyNum = (r) => { const s = r.toLowerCase().replace(/[^a-z]/g, "").split("").reduce((a, c) => a + (O_PYTH[c] || 0), 0); return s ? O_reduceNum(s) : null; };
const O_ZODIAC = { 1:[19,"山羊座","水瓶座"],2:[18,"水瓶座","魚座"],3:[20,"魚座","牡羊座"],4:[19,"牡羊座","牡牛座"],5:[20,"牡牛座","双子座"],6:[21,"双子座","蟹座"],7:[22,"蟹座","獅子座"],8:[22,"獅子座","乙女座"],9:[22,"乙女座","天秤座"],10:[23,"天秤座","蠍座"],11:[22,"蠍座","射手座"],12:[21,"射手座","山羊座"] };
const O_sunSign = (m, d) => { const [c, a, b] = O_ZODIAC[m]; return d <= c ? a : b; };
const O_NINE = { 1:"一白水星",2:"二黒土星",3:"三碧木星",4:"四緑木星",5:"五黄土星",6:"六白金星",7:"七赤金星",8:"八白土星",9:"九紫火星" };
const O_nineStar = (y, m, d) => { let yr = y; if (m === 1 || (m === 2 && d <= 3)) yr -= 1; let st = 11 - O_reduceSingle(yr); if (st > 9) st -= 9; if (st < 1) st += 9; return O_NINE[st]; };
const O_STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const O_BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const O_STEM_EL = { 甲:"陽木",乙:"陰木",丙:"陽火",丁:"陰火",戊:"陽土",己:"陰土",庚:"陽金",辛:"陰金",壬:"陽水",癸:"陰水" };
const O_yearPillar = (y) => O_STEMS[((y - 4) % 10 + 10) % 10] + O_BRANCHES[((y - 4) % 12 + 12) % 12];
const O_jdn = (y, m, d) => { const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3; return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045; };
const O_dayPillar = (y, m, d) => { const i = ((O_jdn(y, m, d) % 60) + 47) % 60; return O_STEMS[i % 10] + O_BRANCHES[i % 12]; };
const O_seimei = (sei, mei) => { if (!sei.length || !mei.length) return null; const tenkaku = sei.reduce((a, b) => a + b, 0), chikaku = mei.reduce((a, b) => a + b, 0), jinkaku = sei[sei.length - 1] + mei[0], soukaku = tenkaku + chikaku; return { tenkaku, jinkaku, chikaku, gaikaku: soukaku - jinkaku, soukaku }; };
const O_age = (y, m, d) => { const n = new Date(); let age = n.getFullYear() - y; const had = (n.getMonth() + 1 > m) || (n.getMonth() + 1 === m && n.getDate() >= d); if (!had) age--; return age; };
const O_STROKES = { 舛:6,野:11,充:6,田:5,中:4,山:3,川:3,木:4,本:5,林:8,森:12,村:7,松:8,井:4,小:3,大:3,太:4,子:3,一:1,二:2,三:3,正:5,平:5,光:6,明:8,和:8,健:11,翔:12,陽:12,真:10,優:17,花:7,香:9,愛:13,結:12,口:3,上:3,下:3 };
const O_KANA = { あ:"a",い:"i",う:"u",え:"e",お:"o",か:"ka",き:"ki",く:"ku",け:"ke",こ:"ko",さ:"sa",し:"shi",す:"su",せ:"se",そ:"so",た:"ta",ち:"chi",つ:"tsu",て:"te",と:"to",な:"na",に:"ni",ぬ:"nu",ね:"ne",の:"no",は:"ha",ひ:"hi",ふ:"fu",へ:"he",ほ:"ho",ま:"ma",み:"mi",む:"mu",め:"me",も:"mo",や:"ya",ゆ:"yu",よ:"yo",ら:"ra",り:"ri",る:"ru",れ:"re",ろ:"ro",わ:"wa",を:"o",ん:"n",が:"ga",ぎ:"gi",ぐ:"gu",げ:"ge",ご:"go",ざ:"za",じ:"ji",ず:"zu",ぜ:"ze",ぞ:"zo",だ:"da",で:"de",ど:"do",ば:"ba",び:"bi",ぶ:"bu",べ:"be",ぼ:"bo",ぱ:"pa",ぴ:"pi",ぷ:"pu",ぺ:"pe",ぽ:"po",きゃ:"kya",きゅ:"kyu",きょ:"kyo",しゃ:"sha",しゅ:"shu",しょ:"sho",ちゃ:"cha",ちゅ:"chu",ちょ:"cho",りゃ:"rya",りゅ:"ryu",りょ:"ryo" };
const O_kanaToRomaji = (kana) => { let r = "", i = 0; const s = (kana||"").replace(/\s/g, ""); while (i < s.length) { const two = s.slice(i, i + 2); if (O_KANA[two]) { r += O_KANA[two]; i += 2; continue; } const one = s[i]; if (one === "っ" && i + 1 < s.length) { const nx = O_KANA[s[i + 1]] || ""; r += nx[0] || ""; i++; continue; } r += O_KANA[one] || ""; i++; } return r; };
const O_stripJSON = (t) => { const m = t.match(/\{[\s\S]*\}/); return m ? m[0] : t.replace(/```json|```/g, "").trim(); };

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
  // ORACLE state
  const [oracleView, setOracleView] = useState("base");
  const [oLoading, setOLoading] = useState(false);
  const [oErr, setOErr] = useState("");
  const [oShowDetail, setOShowDetail] = useState(false);
  const [oSei, setOSei] = useState(""); const [oMei, setOMei] = useState("");
  const [oYomi, setOYomi] = useState(""); const [oAlt, setOAlt] = useState("");
  const [oBy, setOBy] = useState(""); const [oBm, setOBm] = useState(""); const [oBd, setOBd] = useState("");
  const [oStrokes, setOStrokes] = useState({});
  const [oConfirmed, setOConfirmed] = useState(false);
  const [oReflect, setOReflect] = useState("");
  const [oHorizon, setOHorizon] = useState("1ヶ月");
  const [oFaceImg, setOFaceImg] = useState(null); // {data, mediaType, preview}
  const [oHandL, setOHandL] = useState(null);
  const [oHandR, setOHandR] = useState(null);
  const [expandedDomain, setExpandedDomain] = useState(null);
  const [editingDomainHeader, setEditingDomainHeader] = useState(null);
  const [domainHeaderDraft, setDomainHeaderDraft] = useState({ name: "", emoji: "" });
  const [addingDomain, setAddingDomain] = useState(false);
  const [newDomain, setNewDomain] = useState({ name: "", emoji: "", color: DOMAIN_COLORS[0] });
  const [addingGoalTo, setAddingGoalTo] = useState(null);
  const [newGoal, setNewGoal] = useState({ text: "", timeframe: "" });
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [editGoalDraft, setEditGoalDraft] = useState({ text: "", timeframe: "" });
  const [showAchieved, setShowAchieved] = useState({});

  useEffect(() => {
    if (!data) return;
    const dl = (data.forge.dailyLog || {})[selectedDate] || {};
    if (dl.top3) setTop3Draft(dl.top3.map(t => ({text: t.text, domainId: t.domainId || ""})).concat([{text:"",domainId:""},{text:"",domainId:""},{text:"",domainId:""}]).slice(0,3));
    else setTop3Draft([{text:"",domainId:""},{text:"",domainId:""},{text:"",domainId:""}]);
    setGratitudeDraft(dl.gratitude || ""); setJournalDraft(dl.journal || ""); setVisionCheckDraft(dl.visionCheck || "");
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
  const getActiveGoals = (domain) => (domain.goals || []).filter(g => g.status === "active");
  const getAchievedGoals = (domain) => (domain.goals || []).filter(g => g.status === "achieved");

  const startEdit = (f, v) => { setEditField(f); setTempText(v || ""); };
  const saveEdit = (field) => {
    if (field === "vision" && data.forge.vision && data.forge.vision !== tempText) {
      const hist = [...(data.forge.visionHistory || []), { date: todayStr(), text: data.forge.vision }];
      setData(d => ({ ...d, forge: { ...d.forge, vision: tempText, visionHistory: hist } }));
    } else if (["antiVision","identity","vision","northStar","reasonForBeing","values"].includes(field)) { updateForge(field, tempText); }
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

  // ── Domain goals ──
  const addDomain = () => {
    if (!newDomain.name.trim()) return;
    updateDomains(ds => [...ds, { id: gid(), name: newDomain.name.trim(), emoji: newDomain.emoji || "◆", color: newDomain.color, vision: "", goals: [] }]);
    setNewDomain({ name: "", emoji: "", color: DOMAIN_COLORS[(getDomains().length + 1) % DOMAIN_COLORS.length] });
    setAddingDomain(false);
  };
  const removeDomain = (id) => updateDomains(ds => ds.filter(d => d.id !== id));
  const addGoal = (domainId) => {
    if (!newGoal.text.trim()) return;
    updateDomains(ds => ds.map(d => d.id === domainId ? { ...d, goals: [...(d.goals || []), { id: gid(), text: newGoal.text.trim(), timeframe: newGoal.timeframe, status: "active", createdDate: todayStr() }] } : d));
    setNewGoal({ text: "", timeframe: "" }); setAddingGoalTo(null);
  };
  const achieveGoal = (domainId, goalId) => {
    updateDomains(ds => ds.map(d => d.id === domainId ? { ...d, goals: (d.goals || []).map(g => g.id === goalId ? { ...g, status: "achieved", achievedDate: todayStr() } : g) } : d));
  };
  const reactivateGoal = (domainId, goalId) => {
    updateDomains(ds => ds.map(d => d.id === domainId ? { ...d, goals: (d.goals || []).map(g => g.id === goalId ? { ...g, status: "active", achievedDate: undefined } : g) } : d));
  };
  const removeGoal = (domainId, goalId) => {
    updateDomains(ds => ds.map(d => d.id === domainId ? { ...d, goals: (d.goals || []).filter(g => g.id !== goalId) } : d));
  };
  const saveGoalEdit = (domainId) => {
    updateDomains(ds => ds.map(d => d.id === domainId ? { ...d, goals: (d.goals || []).map(g => g.id === editingGoalId ? { ...g, text: editGoalDraft.text, timeframe: editGoalDraft.timeframe } : g) } : d));
    setEditingGoalId(null);
  };

  // ── Daily Cycle ──
  const completeMorning = () => {
    const tasks = top3Draft.filter(t => t.text.trim()).map((t, i) => ({ id: "t" + (i+1), text: t.text.trim(), status: "undone", domainId: t.domainId || "" }));
    if (tasks.length === 0) return;
    updateDailyLog(selectedDate, { top3: tasks, gratitude: gratitudeDraft, morningDone: true }); setTodayPhase("day");
  };
  const updateTop3Status = (idx, status) => { const dl = getDailyLog(selectedDate); if (!dl.top3) return; updateDailyLog(selectedDate, { top3: dl.top3.map((t, i) => i === idx ? { ...t, status } : t) }); };
  const completeEvening = () => {
    const nextDay = (() => { const d = new Date(selectedDate + "T00:00:00"); d.setDate(d.getDate() + 1); return toDateStr(d); })();
    setData(d => {
      const log = { ...(d.forge.dailyLog || {}) }; const dayLog = { ...(log[selectedDate] || {}), journal: journalDraft, visionCheck: visionCheckDraft, eveningDone: true }; log[selectedDate] = dayLog;
      if (dayLog.top3) { const undone = dayLog.top3.filter(t => t.status === "undone"); if (undone.length > 0) { log[nextDay] = { ...(log[nextDay] || {}), top3: [...((log[nextDay] || {}).top3 || []), ...undone.map((t, i) => ({ id: "carry" + (i+1), text: t.text, status: "undone", domainId: t.domainId || "" }))] }; } }
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
      const domainCtx = domains.map(d => { const active = getActiveGoals(d); const achieved = getAchievedGoals(d); return d.name + ": Vision=" + (d.vision || "未設定") + (active.length ? " / 目標: " + active.map(g => g.text).join(", ") : "") + (achieved.length ? " / 達成済: " + achieved.map(g => g.text).join(", ") : ""); }).join("\n");
      const ctx = [data.forge.northStar && ("北極星: " + data.forge.northStar), data.forge.reasonForBeing && ("存在意義: " + data.forge.reasonForBeing), data.forge.values && ("価値観: " + data.forge.values), data.forge.antiVision && ("Anti-Vision: " + data.forge.antiVision), data.forge.vision && ("Vision: " + data.forge.vision), data.forge.identity && ("Identity: " + data.forge.identity), domains.length > 0 && ("領域:\n" + domainCtx)].filter(Boolean).join("\n");
      const logs = (data.forge.actionLog || []).slice(-5).map(l => "[" + l.tag + "] " + l.text).join("\n");
      const dl = getDailyLog(); const t3 = dl.top3 ? dl.top3.map(t => { const dom = getDomain(t.domainId); return "[" + t.status + "]" + (dom ? " [" + dom.name + "]" : "") + " " + t.text; }).join("\n") : "";
      const weekDates = getDailyLogDates().filter(d => d !== todayStr()).slice(0, 7);
      const weekCtx = weekDates.map(d => { const wdl = getDailyLog(d); if (!wdl.top3) return ""; return d + ": " + wdl.top3.map(t => (t.status === "done" ? "○" : t.status === "partial" ? "△" : "×")).join(" "); }).filter(Boolean).join("\n");
      const res = await fetch("/api/mirror", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: "あなたはMIRRORの対話AIです。ユーザーのありのままを映す鏡。評価せず励まさず事実を映す。問いを投げかけ気づきを促す。\n\nコンテキスト:\n" + ctx + "\n\nログ:\n" + logs + "\n\nTop3:\n" + t3 + "\n\n過去7日:\n" + weekCtx + "\n\n2〜4文+1つの問い。",
          messages: newMsgs.map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })) }) });
      const result = await res.json(); const finalMsgs = [...newMsgs, { role: "assistant", text: result.text || "接続エラー", time: timeNow() }];
      setMirrorMessages(finalMsgs); const hist = [...(data.mirror.dialogueHistory || [])]; const ti = hist.findIndex(h => h.date === todayStr());
      if (ti >= 0) hist[ti] = { date: todayStr(), messages: finalMsgs }; else hist.push({ date: todayStr(), messages: finalMsgs }); updateMirror("dialogueHistory", hist);
    } catch (err) { console.error(err); setMirrorMessages([...newMsgs, { role: "assistant", text: "接続エラー", time: timeNow() }]); }
    setAiLoading(false);
  };
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mirrorMessages]);

  // ORACLE: 保存済みの入力値を初回だけ画面に復元（早期returnより前＝フック規則を守る）
  useEffect(() => {
    const ip = data?.oracle?.input;
    if (ip && !oSei && !oMei) { setOSei(ip.sei||""); setOMei(ip.mei||""); setOYomi(ip.yomi||""); setOAlt(ip.alt||""); setOBy(ip.by||""); setOBm(ip.bm||""); setOBd(ip.bd||""); setOStrokes(ip.strokes||{}); }
    setOracleView(data?.oracle?.base ? "base" : "setup");
  }, [data?.oracle]); // eslint-disable-line

  // ── Computed ──
  const nextInterrupt = useMemo(() => { if (!data) return null; return (data.forge.patternInterrupts || []).find(pi => pi.time > timeNow()) || null; }, [data, section, todayPhase]);
  const todayLogs = useMemo(() => data ? (data.forge.actionLog || []).filter(l => l.date === selectedDate).reverse() : [], [data, selectedDate]);
  const stats = useMemo(() => {
    if (!data) return { streak: 0, weekDone: 0, weekTotal: 0, pureCount: 0, fearCount: 0, domainDist: {} };
    const dates = Object.keys(data.forge.dailyLog || {}).sort().reverse(); let streak = 0; const today = todayStr();
    for (const d of dates) { const dl = (data.forge.dailyLog || {})[d]; if (dl && dl.morningDone) streak++; else if (d !== today) break; }
    let weekDone = 0, weekTotal = 0; const domainDist = {};
    dates.slice(0, 7).forEach(d => { const dl = (data.forge.dailyLog || {})[d]; if (dl && dl.top3) { dl.top3.forEach(t => { weekTotal++; if (t.status === "done") weekDone++; if (t.domainId) domainDist[t.domainId] = (domainDist[t.domainId] || 0) + 1; }); } });
    const recent = (data.forge.actionLog || []).slice(-30);
    return { streak, weekDone, weekTotal, pureCount: recent.filter(l => l.tag === "pure").length, fearCount: recent.filter(l => l.tag === "fear").length, domainDist };
  }, [data]);

  if (loading || !data) return (<div style={{ background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: T.textMuted, fontSize: 14 }}>Loading...</div></div>);

  const NAV = [{ id: "today", icon: "◉", label: "Today" }, { id: "foundation", icon: "△", label: "Foundation" }, { id: "mirror", icon: "◇", label: "Mirror" }, { id: "oracle", icon: "✷", label: "Oracle" }, { id: "history", icon: "◫", label: "History" }];
  const tagColors = { pure: T.teal, fear: T.coral, unknown: T.textDim };
  const tagLabels = { pure: "純粋", fear: "恐怖", unknown: "不明" };
  const statusIcons = { done: "○", partial: "△", undone: "×" }; const statusColors = { done: T.green, partial: T.morning, undone: T.red };
  const dl = getDailyLog(selectedDate); const isViewingToday = selectedDate === todayStr();
  const shiftDate = (days) => { const d = new Date(selectedDate + "T00:00:00"); d.setDate(d.getDate() + days); setSelectedDate(toDateStr(d)); };
  const domains = getDomains(); const tfLabel = (tf) => (TIMEFRAMES.find(t => t.id === tf) || {}).label || "";

  // ── Render helpers ──
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

  const renderDomainPills = (selectedId, onSelect) => { if (domains.length === 0) return null; return (<div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 4 }}>{domains.map(d => (<button key={d.id} onClick={() => onSelect(selectedId === d.id ? "" : d.id)} style={{ ...btnSm, fontSize: 9, padding: "2px 8px", borderRadius: 10, background: selectedId === d.id ? d.color + "25" : "transparent", color: selectedId === d.id ? d.color : T.textDim, border: "1px solid " + (selectedId === d.id ? d.color + "60" : T.border) }}>{d.emoji} {d.name}</button>))}</div>); };

  const renderDomainGoalTree = () => {
    const activeDomains = domains.filter(d => d.vision || getActiveGoals(d).length > 0);
    if (activeDomains.length === 0 && !data.forge.vision) return null;
    return (<div style={{ marginBottom: 16 }}>
      {data.forge.vision && (<div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 6, borderLeft: "2px solid " + T.accent, background: T.accent + "08", marginBottom: 4 }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: T.accent, width: 50, flexShrink: 0 }}>VISION</span>
        <span style={{ fontSize: 12, color: T.text, fontFamily: "var(--fc)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.forge.vision}</span>
      </div>)}
      {activeDomains.map(d => { const active = getActiveGoals(d); const weekGoal = active.find(g => g.timeframe === "week"); const topGoal = weekGoal || active[0]; return (<div key={d.id} style={{ marginLeft: 12, marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6, borderLeft: "2px solid " + d.color, background: d.color + "08" }}>
          <span style={{ fontSize: 11 }}>{d.emoji}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: d.color, flex: 1 }}>{d.name}</span>
          {topGoal && <span style={{ fontSize: 10, color: T.textMuted, fontFamily: "var(--fc)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "55%" }}>{topGoal.timeframe ? tfLabel(topGoal.timeframe) + ": " : ""}{topGoal.text}</span>}
        </div>
        {d.vision && !topGoal && (<div style={{ marginLeft: 28, fontSize: 10, color: T.textDim, fontStyle: "italic", padding: "2px 0" }}>{d.vision}</div>)}
      </div>); })}
    </div>);
  };

  const renderDomainDistribution = () => {
    const total = Object.values(stats.domainDist).reduce((s, v) => s + v, 0);
    if (total === 0 || domains.length === 0) return null;
    return (<div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
      <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>7日間のエネルギー配分</div>
      <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>{domains.map(d => { const count = stats.domainDist[d.id] || 0; if (count === 0) return null; return (<div key={d.id} style={{ width: (count / total * 100) + "%", background: d.color }} />); })}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{domains.map(d => { const count = stats.domainDist[d.id] || 0; if (count === 0) return null; return (<div key={d.id} style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: d.color }} /><span style={{ fontSize: 9, color: T.textMuted }}>{d.emoji}{d.name} {Math.round(count / total * 100)}%</span></div>); })}</div>
    </div>);
  };

  const renderStats = () => {
    const dotDays = []; for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const ds = toDateStr(d); const ddl = getDailyLog(ds); const isToday = ds === todayStr(); let level = 0;
      if (ddl.morningDone) { level = 1; if (ddl.top3) { const done = ddl.top3.filter(t => t.status === "done").length; if (done > 0 && done < ddl.top3.length) level = 2; else if (done === ddl.top3.length) level = 3; } if (ddl.eveningDone && level >= 3) level = 4; }
      dotDays.push({ date: ds, day: d.getDate(), dow: ["日","月","火","水","木","金","土"][d.getDay()], level, isToday }); }
    const dotColors = ["transparent", T.accent + "30", T.accent + "55", T.accent + "88", T.accent];
    const dotBorders = ["1px solid " + T.border, "1px solid " + T.accent + "40", "1px solid " + T.accent + "55", "1px solid " + T.accent + "88", "1px solid " + T.accent];
    const hasAnyData = stats.streak > 0 || stats.weekTotal > 0 || dotDays.some(d => d.level > 0);
    if (!hasAnyData) return null;
    const pureRatio = stats.pureCount + stats.fearCount > 0 ? Math.round(stats.pureCount / (stats.pureCount + stats.fearCount) * 100) : null;
    return (<div style={{ marginBottom: 16 }}>
      <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 6 }}>{dotDays.map(d => (<div key={d.date} onClick={() => { if (!d.isToday) { setHistoryDate(d.date); setHistoryMonth(d.date.slice(0,7)); setSection("history"); } }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: d.isToday ? "default" : "pointer" }}><div style={{ fontSize: 8, color: d.isToday ? T.accent : T.textDim, fontFamily: "var(--fm)" }}>{d.dow}</div><div style={{ width: d.isToday ? 26 : 22, height: d.isToday ? 26 : 22, borderRadius: 4, background: d.level > 0 ? dotColors[d.level] : "transparent", border: d.isToday ? "1.5px solid " + T.accent : dotBorders[d.level], display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 8, color: d.level >= 3 ? "#fff" : d.level > 0 ? T.accent : T.textDim, fontFamily: "var(--fm)", fontWeight: d.isToday ? 600 : 400 }}>{d.day}</span></div></div>))}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 4 }}>{[["未記録",0],["開始",1],["進行",2],["達成",3],["完遂",4]].map(([label,lv]) => (<div key={lv} style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: lv > 0 ? dotColors[lv] : "transparent", border: lv === 0 ? "1px solid " + T.border : "none" }} /><span style={{ fontSize: 8, color: T.textDim }}>{label}</span></div>))}</div>
      </div>
      {renderDomainDistribution()}
      <div style={{ display: "flex", gap: 8 }}>
        {stats.streak > 0 && <div style={{ flex: 1, background: T.surface, border: "1px solid " + T.border, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 600, color: T.accent, fontFamily: "var(--fm)" }}>{stats.streak}</div><div style={{ fontSize: 8, color: T.textDim, textTransform: "uppercase" }}>連続日数</div></div>}
        {stats.weekTotal > 0 && <div style={{ flex: 1, background: T.surface, border: "1px solid " + T.border, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 600, color: T.green, fontFamily: "var(--fm)" }}>{Math.round(stats.weekDone / stats.weekTotal * 100)}%</div><div style={{ fontSize: 8, color: T.textDim, textTransform: "uppercase" }}>週間達成率</div></div>}
        {pureRatio !== null && <div style={{ flex: 1, background: T.surface, border: "1px solid " + T.border, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 600, color: T.teal, fontFamily: "var(--fm)" }}>{pureRatio}%</div><div style={{ fontSize: 8, color: T.textDim, textTransform: "uppercase" }}>純粋率</div></div>}
      </div>
    </div>);
  };

  const renderTop3Display = (task, idx) => { const dom = getDomain(task.domainId); return (<div key={task.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: T.surface, border: "1px solid " + T.border, borderRadius: 6, marginBottom: 4 }}>
    <span style={{ fontSize: 12, fontWeight: 600, color: T.morning, fontFamily: "var(--fm)", width: 16, textAlign: "center", flexShrink: 0 }}>{idx+1}</span>
    {dom && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: dom.color + "20", color: dom.color, flexShrink: 0 }}>{dom.emoji}</span>}
    <span style={{ flex: 1, fontSize: 12, color: task.status === "done" ? T.textDim : T.text, textDecoration: task.status === "done" ? "line-through" : "none" }}>{task.text}</span>
    <div style={{ display: "flex", gap: 3 }}>{["done","partial","undone"].map(s => (<button key={s} onClick={() => updateTop3Status(idx, s)} style={{ ...btnSm, fontSize: 12, padding: "2px 6px", color: task.status === s ? statusColors[s] : T.textDim, background: task.status === s ? statusColors[s] + "15" : "transparent", border: "1px solid " + (task.status === s ? statusColors[s] + "50" : "transparent"), borderRadius: 4 }}>{statusIcons[s]}</button>))}</div>
  </div>); };

  // ── Goal card for Foundation ──
  const renderGoalItem = (g, domainId, domainColor) => {
    const isEditing = editingGoalId === g.id;
    if (g.status === "achieved") return (
      <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: T.green + "08", borderRadius: 6, marginBottom: 4, border: "1px solid " + T.green + "20" }}>
        <span style={{ color: T.gold, fontSize: 12 }}>★</span>
        <span style={{ flex: 1, fontSize: 12, color: T.textMuted, fontFamily: "var(--fc)" }}>{g.text}</span>
        {g.timeframe && <span style={{ fontSize: 9, color: T.textDim, padding: "1px 6px", borderRadius: 8, background: T.surface }}>{tfLabel(g.timeframe)}</span>}
        <span style={{ fontSize: 9, color: T.green }}>{g.achievedDate}</span>
        <button onClick={() => reactivateGoal(domainId, g.id)} style={{ ...btnSm, color: T.textDim, fontSize: 9 }}>戻す</button>
      </div>
    );
    if (isEditing) return (
      <div key={g.id} style={{ padding: "8px 10px", background: T.surface, borderRadius: 6, marginBottom: 4, border: "1px solid " + domainColor + "40" }}>
        <input value={editGoalDraft.text} onChange={e => setEditGoalDraft(p => ({...p, text: e.target.value}))} style={{ ...inputBase, width: "100%", marginBottom: 6 }} autoFocus onKeyDown={e => e.key === "Enter" && saveGoalEdit(domainId)} />
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {TIMEFRAMES.map(tf => (<button key={tf.id} onClick={() => setEditGoalDraft(p => ({...p, timeframe: tf.id}))} style={{ ...btnSm, fontSize: 9, padding: "2px 6px", color: editGoalDraft.timeframe === tf.id ? domainColor : T.textDim, border: "1px solid " + (editGoalDraft.timeframe === tf.id ? domainColor + "60" : T.border), background: editGoalDraft.timeframe === tf.id ? domainColor + "15" : "transparent", borderRadius: 8 }}>{tf.label}</button>))}
          <div style={{ flex: 1 }} />
          <button onClick={() => saveGoalEdit(domainId)} style={{ ...btnSm, color: T.green, fontSize: 10 }}>✓</button>
          <button onClick={() => setEditingGoalId(null)} style={{ ...btnSm, color: T.textDim, fontSize: 10 }}>×</button>
        </div>
      </div>
    );
    return (
      <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: T.surface, borderRadius: 6, marginBottom: 4, border: "1px solid " + T.border }}>
        {g.timeframe && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: domainColor + "15", color: domainColor, flexShrink: 0 }}>{tfLabel(g.timeframe)}</span>}
        <span style={{ flex: 1, fontSize: 12, color: T.text, fontFamily: "var(--fc)" }}>{g.text}</span>
        <button onClick={() => achieveGoal(domainId, g.id)} title="達成" style={{ ...btnSm, color: T.green, fontSize: 12, padding: "2px 6px" }}>★</button>
        <button onClick={() => { setEditingGoalId(g.id); setEditGoalDraft({ text: g.text, timeframe: g.timeframe }); }} style={{ ...btnSm, color: T.textDim, fontSize: 9 }}>編集</button>
        <button onClick={() => removeGoal(domainId, g.id)} style={{ ...btnSm, color: T.textDim, fontSize: 9 }}>×</button>
      </div>
    );
  };

  // ═══════ TODAY ═══════
  const TodayView = () => {
    const selDate = new Date(selectedDate + "T00:00:00"); const dayNames = ["日","月","火","水","木","金","土"];
    const dateLabel = selDate.getFullYear() + "." + String(selDate.getMonth()+1).padStart(2,"0") + "." + String(selDate.getDate()).padStart(2,"0") + " (" + dayNames[selDate.getDay()] + ")";
    return (<div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <button onClick={() => shiftDate(-1)} style={{ ...btnSm, color: T.textMuted, border: "1px solid " + T.border, padding: "4px 10px", fontSize: 14 }}>←</button>
          <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 11, color: isViewingToday ? T.textDim : T.morning, letterSpacing: "0.1em", textTransform: "uppercase" }}>{dateLabel}</div><h1 style={{ fontSize: 26, fontWeight: 400, color: T.text, fontFamily: "var(--fc)", margin: 0 }}>{isViewingToday ? "Today" : dayLabel(selectedDate)}</h1></div>
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

      {todayPhase === "morning" && (<div>
        {dl.morningDone ? (<div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: T.green, fontSize: 14 }}>✓</span><span style={{ fontSize: 13, color: T.textMuted }}>Morning 完了</span></div><button onClick={() => updateDailyLog(selectedDate, { morningDone: false })} style={{ ...btnSm, color: T.textDim, border: "1px solid " + T.border, padding: "3px 10px" }}>修正する</button></div>
          {dl.gratitude && <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8, padding: "6px 10px", background: T.surface, borderRadius: 6 }}><span style={{ color: T.morning, fontSize: 9, fontWeight: 600, marginRight: 6 }}>感謝</span>{dl.gratitude}</div>}
          {dl.top3 && dl.top3.map((task, idx) => { const dom = getDomain(task.domainId); return (<div key={task.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 12, borderBottom: "1px solid " + T.border + "33" }}><span style={{ fontWeight: 600, color: T.morning, fontFamily: "var(--fm)", width: 16, textAlign: "center", flexShrink: 0 }}>{idx+1}</span>{dom && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 8, background: dom.color + "20", color: dom.color }}>{dom.emoji}</span>}<span style={{ color: task.status === "done" ? T.textDim : T.text }}>{task.text}</span></div>); })}
        </div>) : (<div>
          {renderDomainGoalTree()}
          <div style={{ marginBottom: 12 }}><input value={gratitudeDraft} onChange={e => setGratitudeDraft(e.target.value)} placeholder="今朝、感謝していることは？（任意）" style={{ ...inputBase, width: "100%", fontSize: 12 }} /></div>
          <div style={{ fontSize: 13, color: T.textDim, fontFamily: "var(--fc)", fontStyle: "italic", lineHeight: 1.7, marginBottom: 14, padding: "10px 14px", background: T.morningDim, borderRadius: 8, border: "1px solid " + T.morning + "22" }}>この流れに今日1ミリでも近づくための、小さな行動を3つ。</div>
          {[0,1,2].map(i => (<div key={i} style={{ marginBottom: 10 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 14, fontWeight: 600, color: T.morning, fontFamily: "var(--fm)", width: 20, textAlign: "center", flexShrink: 0 }}>{i+1}</span><input value={top3Draft[i].text} onChange={e => { const d = [...top3Draft]; d[i] = { ...d[i], text: e.target.value }; setTop3Draft(d); }} placeholder={i === 2 ? "（任意）" : "タスクを入力..."} style={{ ...inputBase, flex: 1 }} /></div><div style={{ marginLeft: 28 }}>{renderDomainPills(top3Draft[i].domainId, (id) => { const d = [...top3Draft]; d[i] = { ...d[i], domainId: id }; setTop3Draft(d); })}</div></div>))}
          <button onClick={completeMorning} disabled={!top3Draft[0].text.trim()} style={{ ...btnPrimary, width: "100%", marginTop: 8, opacity: top3Draft[0].text.trim() ? 1 : 0.4 }}>Morning 完了 ✓</button>
        </div>)}
      </div>)}

      {todayPhase === "day" && (<div>
        {renderStats()}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          <div style={{ background: T.coralDim, border: "1px solid " + T.coral + "22", borderRadius: 8, padding: "10px 12px" }}><div style={{ fontSize: 9, fontWeight: 600, color: T.coral, textTransform: "uppercase", marginBottom: 3 }}>Anti-Vision</div><div style={{ fontSize: 11, color: data.forge.antiVision ? T.text : T.textDim, fontFamily: "var(--fc)", lineHeight: 1.5 }}>{data.forge.antiVision || "未設定"}</div></div>
          <div style={{ background: T.accentDim, border: "1px solid " + T.accent + "22", borderRadius: 8, padding: "10px 12px" }}><div style={{ fontSize: 9, fontWeight: 600, color: T.accent, textTransform: "uppercase", marginBottom: 3 }}>Vision</div><div style={{ fontSize: 11, color: data.forge.vision ? T.text : T.textDim, fontFamily: "var(--fc)", lineHeight: 1.5 }}>{data.forge.vision || "未設定"}</div></div>
        </div>
        {dl.top3 && dl.top3.length > 0 && (<div style={{ marginBottom: 14 }}><div style={{ fontSize: 10, fontWeight: 600, color: T.morning, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Top 3</div>{dl.top3.map((task, idx) => renderTop3Display(task, idx))}</div>)}
        {!dl.morningDone && (<div onClick={() => setTodayPhase("morning")} style={{ background: T.morningDim, border: "1px solid " + T.morning + "22", borderRadius: 8, padding: "12px 14px", cursor: "pointer", marginBottom: 14 }}><div style={{ fontSize: 10, fontWeight: 600, color: T.morning, textTransform: "uppercase", marginBottom: 2 }}>Morning</div><div style={{ fontSize: 12, color: T.text }}>タップして始める</div></div>)}
        {nextInterrupt && (<div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}><div style={{ background: T.accentDim, borderRadius: 6, padding: "4px 8px", fontFamily: "var(--fm)", fontSize: 11, fontWeight: 600, color: T.accent, flexShrink: 0 }}>{nextInterrupt.time}</div><div style={{ fontSize: 12, color: T.text, fontFamily: "var(--fc)" }}>{nextInterrupt.question}</div></div>)}
        <div style={{ marginBottom: 14 }}><div style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>行動ログ</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}><input value={logInput} onChange={e => setLogInput(e.target.value)} placeholder="今やったこと・感じたこと..." style={{ ...inputBase, flex: 1, fontSize: 12 }} onKeyDown={e => e.key === "Enter" && addLog()} /><div style={{ display: "flex", gap: 2 }}>{["pure","fear","unknown"].map(tag => (<button key={tag} onClick={() => setLogTag(tag)} style={{ ...btnSm, fontSize: 9, padding: "3px 6px", background: logTag === tag ? tagColors[tag] + "25" : "transparent", color: logTag === tag ? tagColors[tag] : T.textDim, border: "1px solid " + (logTag === tag ? tagColors[tag] + "50" : T.border) }}>{tagLabels[tag]}</button>))}</div><button onClick={() => addLog()} style={{ ...btnPrimary, padding: "4px 10px", fontSize: 12 }}>+</button></div>
          {todayLogs.slice(0,5).map(l => (<div key={l.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: "1px solid " + T.border + "33" }}><span style={{ fontSize: 9, fontFamily: "var(--fm)", color: T.textDim, flexShrink: 0 }}>{l.time}</span><span style={{ width: 4, height: 4, borderRadius: "50%", background: tagColors[l.tag], flexShrink: 0 }} /><span style={{ fontSize: 11, color: T.text, flex: 1 }}>{l.text}</span></div>))}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div onClick={() => setSection("mirror")} style={{ background: T.tealDim, border: "1px solid " + T.teal + "22", borderRadius: 8, padding: "10px 12px", cursor: "pointer" }}><div style={{ fontSize: 9, fontWeight: 600, color: T.teal, textTransform: "uppercase", marginBottom: 2 }}>Mirror</div><div style={{ fontSize: 11, color: T.text }}>鏡に向かう</div></div>
          <div onClick={() => setTodayPhase("evening")} style={{ background: T.eveningDim, border: "1px solid " + T.evening + "22", borderRadius: 8, padding: "10px 12px", cursor: "pointer" }}><div style={{ fontSize: 9, fontWeight: 600, color: T.evening, textTransform: "uppercase", marginBottom: 2 }}>Evening</div><div style={{ fontSize: 11, color: T.text }}>振り返る</div></div>
        </div>
      </div>)}

      {todayPhase === "evening" && (<div>
        {dl.eveningDone ? (<div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: T.green, fontSize: 14 }}>✓</span><span style={{ fontSize: 13, color: T.textMuted }}>Evening 完了</span></div><button onClick={() => updateDailyLog(selectedDate, { eveningDone: false })} style={{ ...btnSm, color: T.textDim, border: "1px solid " + T.border, padding: "3px 10px" }}>修正する</button></div>
          {dl.top3 && dl.top3.map((task, idx) => { const dom = getDomain(task.domainId); return (<div key={task.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", fontSize: 12, borderBottom: "1px solid " + T.border + "33" }}><span style={{ color: statusColors[task.status] }}>{statusIcons[task.status]}</span>{dom && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 8, background: dom.color + "20", color: dom.color }}>{dom.emoji}</span>}<span style={{ color: task.status === "done" ? T.textDim : T.text }}>{task.text}</span></div>); })}
          {dl.journal && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 8, padding: "6px 10px", background: T.surface, borderRadius: 6, borderLeft: "2px solid " + T.evening }}><span style={{ color: T.evening, fontSize: 9, fontWeight: 600, marginRight: 6 }}>Journal</span>{dl.journal}</div>}
          {dl.visionCheck && <div style={{ fontSize: 11, color: T.textDim, marginTop: 4, fontStyle: "italic" }}>{dl.visionCheck}</div>}
        </div>) : (<div>
          {dl.top3 && dl.top3.length > 0 && (<div style={{ marginBottom: 16 }}><div style={{ fontSize: 12, color: T.textDim, fontFamily: "var(--fc)", fontStyle: "italic", marginBottom: 10 }}>今日の Top 3 はどうでしたか？</div>{dl.top3.map((task, idx) => { const dom = getDomain(task.domainId); return (<div key={task.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: T.surface, border: "1px solid " + T.border, borderRadius: 6, marginBottom: 4 }}>{dom && <span style={{ fontSize: 10, color: dom.color }}>{dom.emoji}</span>}<span style={{ flex: 1, fontSize: 12, color: T.text }}>{task.text}</span><div style={{ display: "flex", gap: 4 }}>{["done","partial","undone"].map(s => (<button key={s} onClick={() => updateTop3Status(idx, s)} style={{ ...btnSm, fontSize: 13, padding: "3px 8px", color: task.status === s ? statusColors[s] : T.textDim, border: "1.5px solid " + (task.status === s ? statusColors[s] : T.border), background: task.status === s ? statusColors[s] + "15" : "transparent", borderRadius: 6 }}>{statusIcons[s]}</button>))}</div></div>); })}</div>)}
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
    <div style={{ marginBottom: 28 }}><h1 style={{ fontSize: 26, fontWeight: 400, color: T.text, fontFamily: "var(--fc)", margin: 0 }}>Foundation</h1><div style={{ fontSize: 12, color: T.textDim, marginTop: 4 }}>自分の核心。恐怖と方向。人生の領域。</div></div>

    <div style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Core — 不変の核</div>
    <div style={{ fontSize: 11, color: T.textDim, marginBottom: 12, fontFamily: "var(--fc)", fontStyle: "italic" }}>全て任意。空でもいい。行動の蓄積から浮かび上がったときに書く。</div>
    {renderEditableCard("北極星", data.forge.northStar, "northStar", T.accent, "自分の人生を一文で", false, "自分はどこに向かうのか？")}
    {renderEditableCard("存在意義", data.forge.reasonForBeing, "reasonForBeing", "#7A2A10", "自分はなぜここにいるのか", true, "なぜ存在しているのか？何のために？")}
    {renderEditableCard("価値観", data.forge.values, "values", "#534AB7", "自分が信じること、大切にすること", true, "何を信じ、何を大切にしているか？")}
    <div style={{ background: T.surface, border: "1px solid " + (oracleBase ? T.accent + "55" : T.border), borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: oracleBase ? 8 : 0 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: oracleBase ? T.accent : T.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>✷ 命式 — 生まれ持った核</div>
        <button onClick={() => setSection("oracle")} style={{ ...btnSm, fontSize: 10, color: T.textMuted, border: "1px solid " + T.border, borderRadius: 6, padding: "3px 8px" }}>{oracleBase ? "詳しく見る" : "設定する"}</button>
      </div>
      {oracleBase ? (<div><div style={{ fontSize: 14, color: T.text, lineHeight: 1.6, marginBottom: 8 }}>{oracleBase.headline}</div><div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{(oracleBase.essence||[]).map((e,i) => <div key={i} style={{ fontSize: 12, color: T.textMuted, paddingLeft: 10, borderLeft: "2px solid " + T.accent + "66" }}>{e}</div>)}</div></div>) : (<div style={{ fontSize: 12, color: T.textDim, marginTop: 6 }}>複数の占術から「生まれ持った型」を読み解きます。Oracleタブで設定できます。</div>)}
    </div>

    <div style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 28, marginBottom: 10 }}>Core — 恐怖と方向</div>
    {renderEditableCard("Anti-Vision — 燃料", data.forge.antiVision, "antiVision", T.coral, "「絶対にこうなりたくない」を一文で", true)}
    {renderEditableCard("Vision — 方向", data.forge.vision, "vision", T.accent, "「自分はこれから何に向かうべきか」を一文で", true)}
    {renderEditableCard("Identity — 私は誰になるのか", data.forge.identity, "identity", T.teal, "理想を手にしたあなたはどんなタイプの人間か？", true)}

    <div style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 28, marginBottom: 10 }}>Balance Wheel — 人生の領域</div>
    <div style={{ fontSize: 11, color: T.textDim, marginBottom: 12, fontFamily: "var(--fc)", fontStyle: "italic" }}>領域ごとにVisionと目標を設定。目標は複数追加でき、達成すると成果として残ります。</div>

    {domains.map(d => {
      const isExp = expandedDomain === d.id; const isEditingHeader = editingDomainHeader === d.id;
      const active = getActiveGoals(d); const achieved = getAchievedGoals(d);
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
            <span style={{ fontSize: 10, color: T.textDim }}>{active.length}目標{achieved.length > 0 ? " / ★" + achieved.length : ""}</span>
            <span onClick={() => setExpandedDomain(isExp ? null : d.id)} style={{ fontSize: 10, color: T.textDim, cursor: "pointer", padding: "4px 8px" }}>{isExp ? "▼" : "▶"}</span>
          </>)}
        </div>
        {isExp && (<div style={{ background: T.surfaceAlt, border: "1px solid " + T.border, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "14px 18px" }}>
          {renderEditableCard("Vision", d.vision, "domain:" + d.id + ":vision", d.color, "この領域で目指す姿", true)}

          <div style={{ fontSize: 10, fontWeight: 600, color: d.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, marginTop: 12 }}>目標</div>
          {active.map(g => renderGoalItem(g, d.id, d.color))}

          {addingGoalTo === d.id ? (<div style={{ padding: "8px 10px", background: T.surface, borderRadius: 6, marginBottom: 4, border: "1px dashed " + d.color + "40" }}>
            <input value={newGoal.text} onChange={e => setNewGoal(p => ({...p, text: e.target.value}))} placeholder="目標を入力..." style={{ ...inputBase, width: "100%", marginBottom: 6 }} autoFocus onKeyDown={e => e.key === "Enter" && addGoal(d.id)} />
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {TIMEFRAMES.map(tf => (<button key={tf.id} onClick={() => setNewGoal(p => ({...p, timeframe: tf.id}))} style={{ ...btnSm, fontSize: 9, padding: "2px 6px", color: newGoal.timeframe === tf.id ? d.color : T.textDim, border: "1px solid " + (newGoal.timeframe === tf.id ? d.color + "60" : T.border), background: newGoal.timeframe === tf.id ? d.color + "15" : "transparent", borderRadius: 8 }}>{tf.label}</button>))}
              <div style={{ flex: 1 }} />
              <button onClick={() => addGoal(d.id)} style={{ ...btnPrimary, padding: "4px 12px" }}>追加</button>
              <button onClick={() => { setAddingGoalTo(null); setNewGoal({ text: "", timeframe: "" }); }} style={{ ...btnSm, color: T.textDim }}>×</button>
            </div>
          </div>) : (<button onClick={() => setAddingGoalTo(d.id)} style={{ ...btnSm, color: T.textDim, border: "1px dashed " + T.border, padding: "6px 12px", width: "100%", marginBottom: 4 }}>+ 目標を追加</button>)}

          {achieved.length > 0 && (<div style={{ marginTop: 12 }}>
            <div onClick={() => setShowAchieved(p => ({...p, [d.id]: !p[d.id]}))} style={{ fontSize: 10, color: T.gold, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
              <span>★ 達成した目標 ({achieved.length})</span><span style={{ fontSize: 9 }}>{showAchieved[d.id] ? "▼" : "▶"}</span>
            </div>
            {showAchieved[d.id] && achieved.map(g => renderGoalItem(g, d.id, d.color))}
          </div>)}
          <button onClick={() => removeDomain(d.id)} style={{ ...btnSm, color: T.red, fontSize: 10, marginTop: 12 }}>この領域を削除</button>
        </div>)}
      </div>);
    })}

    {addingDomain ? (<div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 10, padding: "14px 18px", marginTop: 8 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}><input value={newDomain.emoji} onChange={e => setNewDomain(p => ({...p, emoji: e.target.value}))} placeholder="絵文字" style={{ ...inputBase, width: 50, textAlign: "center" }} maxLength={2} /><input value={newDomain.name} onChange={e => setNewDomain(p => ({...p, name: e.target.value}))} placeholder="領域名（例: 本業DX）" style={{ ...inputBase, flex: 1 }} autoFocus onKeyDown={e => e.key === "Enter" && addDomain()} /></div>
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>{DOMAIN_COLORS.map(c => (<div key={c} onClick={() => setNewDomain(p => ({...p, color: c}))} style={{ width: 20, height: 20, borderRadius: "50%", background: c, cursor: "pointer", border: newDomain.color === c ? "2px solid #fff" : "2px solid transparent" }} />))}</div>
      <div style={{ display: "flex", gap: 8 }}><button onClick={addDomain} style={{ ...btnPrimary, padding: "6px 14px" }}>追加</button><button onClick={() => setAddingDomain(false)} style={{ ...btnSm, color: T.textMuted }}>キャンセル</button></div>
    </div>) : (<button onClick={() => setAddingDomain(true)} style={{ ...btnSm, color: T.textMuted, border: "1px dashed " + T.border, padding: "8px 16px", width: "100%", marginTop: 8 }}>+ 領域を追加</button>)}

    {data.forge.visionHistory?.length > 0 && (<div style={{ marginTop: 24 }}><div style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Vision の変遷</div>{data.forge.visionHistory.map((v, i) => (<div key={i} style={{ display: "flex", gap: 8, padding: "4px 0", borderBottom: "1px solid " + T.border + "44", fontSize: 11 }}><span style={{ color: T.textDim, fontFamily: "var(--fm)", flexShrink: 0 }}>{v.date}</span><span style={{ color: T.textMuted, fontFamily: "var(--fc)" }}>{v.text}</span></div>))}</div>)}
    <div style={{ marginTop: 24 }}><div style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Pattern Interrupts</div>{(data.forge.patternInterrupts || []).map(pi => (<div key={pi.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid " + T.border + "44" }}><span style={{ fontFamily: "var(--fm)", fontSize: 11, color: T.accent, fontWeight: 600, flexShrink: 0 }}>{pi.time}</span><span style={{ fontSize: 12, color: T.text, fontFamily: "var(--fc)" }}>{pi.question}</span></div>))}</div>
  </div>);

  // ═══════ MIRROR ═══════
  const MirrorView = () => (<div style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - 80px)" }}>
    <div style={{ marginBottom: 12 }}><h1 style={{ fontSize: 26, fontWeight: 400, color: T.text, fontFamily: "var(--fc)", margin: 0 }}>Mirror</h1><div style={{ fontSize: 12, color: T.textDim, marginTop: 4 }}>ありのままを映す。事実だけ。</div></div>
    <div style={{ flex: 1, overflowY: "auto", padding: "4px 0", minHeight: 200 }}>
      {mirrorMessages.length === 0 && (<div style={{ textAlign: "center", padding: "32px 16px", color: T.textDim }}><div style={{ fontSize: 24, marginBottom: 8, opacity: 0.3 }}>◇</div><div style={{ fontSize: 12, fontFamily: "var(--fc)", lineHeight: 1.8 }}>何でも話しかけてください。<br/>鏡はただ映すだけです。</div></div>)}
      {mirrorMessages.map((msg, i) => (<div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 8, padding: "0 4px" }}><div style={{ maxWidth: "80%", padding: "8px 12px", borderRadius: 10, background: msg.role === "user" ? T.accent + "20" : T.surface, border: "1px solid " + (msg.role === "user" ? T.accent + "30" : T.border) }}><div style={{ fontSize: 12, color: T.text, lineHeight: 1.7, fontFamily: "var(--fc)", whiteSpace: "pre-wrap" }}>{msg.text}</div><div style={{ fontSize: 9, color: T.textDim, marginTop: 3, textAlign: "right" }}>{msg.time}</div></div></div>))}
      {aiLoading && (<div style={{ padding: "8px 12px", borderRadius: 10, background: T.surface, border: "1px solid " + T.border, display: "inline-block", marginLeft: 4 }}><div style={{ fontSize: 12, color: T.textDim }}>...</div></div>)}
      <div ref={chatEndRef} />
    </div>
    <div style={{ display: "flex", gap: 6, padding: "10px 0 4px", borderTop: "1px solid " + T.border }}><input value={mirrorInput} onChange={e => setMirrorInput(e.target.value)} placeholder="鏡に向かって話す..." style={{ ...inputBase, flex: 1, fontSize: 13, padding: "8px 12px" }} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMirrorMessage(); } }} /><button onClick={sendMirrorMessage} disabled={aiLoading || !mirrorInput.trim()} style={{ ...btnPrimary, padding: "8px 16px", opacity: aiLoading || !mirrorInput.trim() ? 0.4 : 1 }}>送信</button></div>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>{cells.map((cell, i) => { if (!cell) return <div key={"e"+i} />; const isSel = historyDate === cell.date; return (<div key={cell.date} onClick={() => !cell.isFuture && setHistoryDate(isSel ? null : cell.date)} style={{ aspectRatio: "1", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: isSel ? T.accent + "30" : cell.level > 0 ? dotColors[cell.level] : "transparent", border: cell.isToday ? "1.5px solid " + T.accent : isSel ? "1.5px solid " + T.accent : "1px solid " + (cell.level > 0 ? dotColors[cell.level] : T.border + "60"), cursor: cell.isFuture ? "default" : "pointer", opacity: cell.isFuture ? 0.3 : 1 }}><span style={{ fontSize: 11, color: cell.level >= 3 ? "#fff" : cell.isToday ? T.accent : cell.level > 0 ? T.accent : T.textDim, fontFamily: "var(--fm)", fontWeight: cell.isToday ? 600 : 400 }}>{cell.day}</span></div>); })}</div>
      </div>
      {historyDate && (<div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 10, padding: "16px 18px" }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: T.accent, marginBottom: 12, fontFamily: "var(--fm)" }}>{dayLabel(historyDate)}</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>{sDl?.morningDone && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: T.morning + "20", color: T.morning }}>Morning ✓</span>}{sDl?.eveningDone && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: T.evening + "20", color: T.evening }}>Evening ✓</span>}{!sDl?.morningDone && <span style={{ fontSize: 9, color: T.textDim }}>記録なし</span>}</div>
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
  // ═══════ ORACLE handlers + view ═══════
  const oracleBase = data.oracle?.base || null;
  const oracleLogs = data.oracle?.logs || [];

  const oSeiChars = oSei.split(""); const oMeiChars = oMei.split("");
  const oAllChars = [...oSeiChars, ...oMeiChars];
  const oStrokeOf = (ch) => oStrokes[ch] !== undefined ? oStrokes[ch] : (O_STROKES[ch] ?? "");
  const oSeiStrokes = oSeiChars.map(oStrokeOf), oMeiStrokes = oMeiChars.map(oStrokeOf);
  const oAllValid = oAllChars.length > 0 && [...oSeiStrokes, ...oMeiStrokes].every((s) => typeof s === "number" && s > 0);
  const oPreview = oAllValid ? O_seimei(oSeiStrokes, oMeiStrokes) : null;

  const oCallAPI = async (prompt, maxTokens, images) => { const res = await fetch("/api/oracle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, maxTokens, images }) }); const j = await res.json(); if (j.error) throw new Error(j.error); return j.text || ""; };
  const patchOracle = (patch) => setData(d => ({ ...d, oracle: { ...(d.oracle || {}), ...patch } }));

  const oGenerateBase = async () => {
    setOErr("");
    if (!oSei || !oMei || !oBy || !oBm || !oBd) { setOErr("姓・名・生年月日は必須です"); return; }
    if (!oAllValid) { setOErr("すべての文字の画数を入力してください"); return; }
    if (!oConfirmed) { setOErr("画数の確認チェックを入れてください"); return; }
    const y = +oBy, m = +oBm, d = +oBd;
    const romaji = O_kanaToRomaji(oYomi); const dp = O_dayPillar(y, m, d);
    const calc = { 数秘術: { ライフパス: O_lifePath(y, m, d), 運命数: romaji ? O_destinyNum(romaji) : null }, 西洋占星術: { 太陽星座: O_sunSign(m, d) }, 九星気学: { 本命星: O_nineStar(y, m, d) }, 四柱推命: { 年柱: O_yearPillar(y), 日柱: dp, 日主: O_STEM_EL[dp[0]] + "（" + dp[0] + "）" }, 姓名判断: O_seimei(oSeiStrokes, oMeiStrokes) };
    const prompt = `あなたは複数の占術を統合する熟練の鑑定士です。以下は既に正確に計算済みのデータです。再計算せず解釈・統合してください。
【対象】${oSei}${oMei}（${oYomi}）${oAlt ? "／通称: " + oAlt : ""}　${y}年${m}月${d}日生（現在${O_age(y,m,d)}歳・誕生日${m}月${d}日）
【計算済データ】${JSON.stringify(calc)}
【表現の指針 — 最重要】
・バーナム効果（誰にでも当てはまる無難な表現）を厳禁。これがあると価値ゼロ。
  悪い例（禁止）:「思慮深く内に情熱を秘めている」「人との調和を大切にする」「慎重だが行動力もある」
  良い例:「初対面は聞き役、3回目以降に本音を出す」「決断前に必ず数字を並べ、揃わないと動けない」「頼まれると断れず巻き取り、自分の時間を失う」
・それぞれの主張に、どの占術の何（例:日主乙木／本命星◯／地格◯画）から導いたか根拠を一言添える。
・断定を恐れない。外れる可能性のある具体的な主張をする。無難な一般論は最も価値が低い。
・職業は実在の職種名を複数。環境は状況で描く（評価軸・スピード感・人間関係・裁量）。時期は年代で。予言的な過剰具体化（特定の年の特定の出来事）はしない。
・予言でなく自己理解の鏡として、生年月日由来と名前由来という独立した源の一致点を信頼度の高い収束として扱う。
以下のJSON【のみ】で返答（マークダウン・前置き不要）：
{"headline":"一言で(20字前後・具体)","essence":["核の特徴3つ各15字前後"],"careers":["向く職業6つ具体"],"environment_thrive":"活きる環境2文具体","environment_avoid":"枯れる環境2文具体","strengths":[{"title":"強み8字以内","detail":"行動レベル1-2文"}],"cautions":[{"title":"注意点8字以内","detail":"行動レベル1-2文"}],"timing":"運の流れと伸びる年代2文","convergence":[{"theme":"収束した型","detail":"2文","sources":["占術名"]}],"divergence":[{"theme":"分かれる点","detail":"2文"}],"business":"ビジネス示唆3-4文具体","systems":[{"name":"占術名","reading":"要点2文"}]}
strengths/cautionsは各3つ。`;
    setOLoading(true);
    try {
      const raw = await oCallAPI(prompt, 3500);
      const parsed = JSON.parse(O_stripJSON(raw));
      const nb = { ...parsed, calc, meta: { sei: oSei, mei: oMei, yomi: oYomi, y, m, d } };
      setOShowDetail(false); setOracleView("base");
      patchOracle({ base: nb, input: { sei: oSei, mei: oMei, yomi: oYomi, alt: oAlt, by: oBy, bm: oBm, bd: oBd, strokes: oStrokes } });
    } catch (e) { setOErr("生成に失敗しました。もう一度。(" + e.message + ")"); }
    setOLoading(false);
  };

  const oGenerateDaily = async (reflectText) => {
    const txt = (reflectText || oReflect).trim();
    if (!txt || !oracleBase) return;
    setOErr(""); setOLoading(true);
    const conv = (oracleBase.convergence || []).map((c) => c.theme).join("、");
    const prompt = `この人の固定の型：${oracleBase.headline}。要点：${(oracleBase.essence||[]).join("／")}。収束：${conv}。
【今日の振り返り】${txt}
この人の「型」というレンズで今日を読み解いてください。運勢予報ではなく「あなたの型から見ると今日のこれはこう」という解釈。「〜すべき」でなく流れに乗る言い方で。150〜200字、温かく、具体的な小さな次の一歩を一つ。プレーンテキストのみ。`;
    try {
      const text = await oCallAPI(prompt, 800);
      const nl = [{ date: todayStr(), reflection: txt, reading: text.trim(), ts: Date.now() }, ...oracleLogs];
      setOReflect("");
      patchOracle({ logs: nl });
    } catch (e) { setOErr("生成に失敗しました。(" + e.message + ")"); }
    setOLoading(false);
  };

  // 中長期レビュー
  const oReviews = data.oracle?.reviews || [];
  // 期間全体から満遍なくサンプリング（最新偏重を避ける）
  const oSampleAcross = (arr, n) => { if (arr.length <= n) return arr; const step = (arr.length - 1) / (n - 1); const out = []; for (let i = 0; i < n; i++) out.push(arr[Math.round(i * step)]); return [...new Set(out)]; };
  const oGatherReflections = (horizon) => {
    const dl = data.forge?.dailyLog || {};
    const days = { "1ヶ月": 30, "3ヶ月": 90, "半年": 180, "1年": 365, "3年": 1095, "10年+": 36500 }[horizon] || 90;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const allDates = Object.keys(dl).filter(dt => dt >= cutoffStr).sort(); // 古い順
    const total = allDates.length;
    const sampled = oSampleAcross(allDates, 45); // 期間全体から最大45件を均等抽出
    const parts = sampled.map(dt => { const e = dl[dt]; const bits = []; if (e.journal) bits.push("振:" + e.journal); if (e.gratitude) bits.push("感謝:" + e.gratitude); if (e.visionCheck) bits.push("確認:" + e.visionCheck); if (e.top3) bits.push("Top3:" + e.top3.map(t => t.text + "(" + (t.status||"") + ")").join("/")); return bits.length ? dt + " " + bits.join(" ") : null; }).filter(Boolean);
    const ol = (data.oracle?.logs || []).filter(l => l.date >= cutoffStr).sort((a, b) => a.date.localeCompare(b.date));
    const oracleDaily = oSampleAcross(ol, 15).map(l => l.date + " " + l.reflection);
    return { parts, total, oracleDaily, olTotal: ol.length };
  };
  const oGenerateReview = async () => {
    if (!oracleBase) return;
    setOErr(""); setOLoading(true);
    const g = oGatherReflections(oHorizon);
    const longHorizon = ["1年", "3年", "10年+"].includes(oHorizon);
    const ageStr = oracleBase.meta ? `この人は現在${O_age(oracleBase.meta.y, oracleBase.meta.m, oracleBase.meta.d)}歳（${oracleBase.meta.y}年${oracleBase.meta.m}月${oracleBase.meta.d}日生）。年齢は正確なので推測しないこと。` : "";
    const prompt = `あなたは複数の占術を統合する熟練の鑑定士です。この人の「中長期レビュー（${oHorizon}）」を書いてください。
${ageStr}

【命式（固定の型）】${oracleBase.headline}／要点:${(oracleBase.essence||[]).join("・")}／収束:${(oracleBase.convergence||[]).map(c=>c.theme).join("、")}／運の流れ:${oracleBase.timing}
【記録の範囲】この${oHorizon}でFORGEに${g.total}日分の振り返りが蓄積。直近偏重を避けるため、期間全体から時系列順に代表${g.parts.length}件を均等抽出（古い順）:
${g.parts.join(" ｜ ") || "（記録少なめ）"}
【型解釈ログ ${g.olTotal}件から抜粋】${g.oracleDaily.join(" ｜ ") || "（なし）"}

【書き方 — 重要】
- 直近の数日に引っ張られず、上の記録全体を見て、この期間に【繰り返し現れるテーマ】【時間とともに変化したこと】【始めたが続かなかったこと】を総合的に拾うこと。
- 時間軸は「${oHorizon}」。${longHorizon ? "長期なので命式（生まれ持った大きな流れ・運の周期）を主役に、記録は傾向の裏付けに使う。" : "短中期なので記録の流れを主役に、命式をレンズに使う。"}
- 予言ではなく「この期間、あなたの型から見るとこういう流れにある。だからこう構えると流れに乗れる」という解釈。具体的に。「〜すべき」でなく流れに乗る言い方で。350字程度。
- 最後に、この期間の小さな指針を1つ。
プレーンテキストのみ。`;
    try {
      const text = await oCallAPI(prompt, 1400);
      const nr = [{ horizon: oHorizon, date: todayStr(), text: text.trim(), ts: Date.now() }, ...oReviews];
      patchOracle({ reviews: nr });
    } catch (e) { setOErr("生成に失敗しました。(" + e.message + ")"); }
    setOLoading(false);
  };

  // 顔相・手相
  const oPhysio = data.oracle?.physiognomy || [];
  const oReadImage = (file, setter) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const max = 1024; let { width, height } = img;
        if (width > max || height > max) { const r = Math.min(max / width, max / height); width = Math.round(width * r); height = Math.round(height * r); }
        const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        setter({ data: dataUrl.split(",")[1], mediaType: "image/jpeg", preview: dataUrl });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
  const oGeneratePhysiognomy = async () => {
    if (!oFaceImg && !oHandL && !oHandR) { setOErr("顔または手のひらの写真を選んでください"); return; }
    setOErr(""); setOLoading(true);
    const prev = oPhysio[0];
    const images = []; const labels = [];
    if (oFaceImg) { images.push({ data: oFaceImg.data, mediaType: oFaceImg.mediaType }); labels.push("顔"); }
    if (oHandL) { images.push({ data: oHandL.data, mediaType: oHandL.mediaType }); labels.push("左手のひら"); }
    if (oHandR) { images.push({ data: oHandR.data, mediaType: oHandR.mediaType }); labels.push("右手のひら"); }
    const hasFace = !!oFaceImg; const hasHand = !!(oHandL || oHandR);
    const prompt = `あなたは観相学（顔相・手相）の熟練鑑定士です。添付画像を読み解いてください。
画像は順に【${labels.join("→")}】です。
${oracleBase ? `この人の命式（参考）：${oracleBase.headline}／${(oracleBase.essence||[]).join("・")}${oracleBase.meta ? `／現在${O_age(oracleBase.meta.y, oracleBase.meta.m, oracleBase.meta.d)}歳` : ""}` : ""}
${prev ? `【前回の相（${prev.date}）】${prev.text}\n→ 今回、前回からの変化があれば必ず指摘してください（観相学では相は心の状態を映し、変化します）。` : ""}

【書き方】
- 予言ではなく「今のあなたの状態が相にこう表れている」という自己理解の鏡として。
- ${hasFace ? "顔相（表情の傾向・気の充実・対人面）。" : ""}${hasHand ? "手相（生命線・知能線・感情線などの印象）。" : ""}
- ${(oHandL && oHandR) ? "左手は生まれ持った傾向、右手は現在の状態として、両手の違い（先天と後天のギャップ）も読んでください。" : ""}具体的に。
- 過度に断定せず、相が示す傾向として。${(oHandL && oHandR) ? "300" : "250"}字程度。${prev ? "前回との変化を1文入れる。" : ""}
プレーンテキストのみ。`;
    try {
      const text = await oCallAPI(prompt, 1200, images);
      const np = [{ date: todayStr(), text: text.trim(), hasFace, hasHand, ts: Date.now() }, ...oPhysio];
      patchOracle({ physiognomy: np });
      setOFaceImg(null); setOHandL(null); setOHandR(null);
    } catch (e) { setOErr("生成に失敗しました。(" + e.message + ")"); }
    setOLoading(false);
  };

  // 暦の節目チェック
  const oCheckpoint = (() => {
    const d = new Date(); const day = d.getDate(); const mon = d.getMonth() + 1;
    if (mon === 1 && day === 1) return "新年";
    if (oracleBase?.meta && d.getMonth() + 1 === oracleBase.meta.m && day === oracleBase.meta.d) return "誕生日";
    if (day === 1 && [1, 4, 7, 10].includes(mon)) return "四半期初め";
    if (day === 1) return "月初め";
    return null;
  })();

  const oChip = { fontSize: 13, padding: "6px 12px", borderRadius: 6, background: T.surfaceAlt, border: "1px solid " + T.border, color: T.text };
  const oLab = { fontSize: 11, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontFamily: "var(--fm)" };
  const oSec = (c, t) => <div style={{ fontSize: 12, color: c, margin: "20px 0 8px", letterSpacing: "0.04em", fontFamily: "var(--fm)" }}>{t}</div>;

  const OracleView = () => (<div>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
      <div><h1 style={{ fontSize: 24, fontWeight: 400, color: T.text, fontFamily: "var(--fc)", margin: 0 }}>Oracle</h1><div style={{ fontSize: 12, color: T.textDim, marginTop: 2 }}>複数の占術を三角測量する自己理解の鏡</div></div>
      {oracleBase && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{[["base","結果"],["daily","型から見た今日"],["review","中長期"],["physio","相"],["setup","再設定"]].map(([id,lb]) => <button key={id} onClick={() => setOracleView(id)} style={{ ...btnSm, border: "1px solid "+(oracleView===id?T.accent:T.border), color: oracleView===id?T.accent:T.textMuted, borderRadius: 8, padding: "5px 10px" }}>{lb}</button>)}</div>}
    </div>
    {oErr && <div style={{ background: T.surface, border: "1px solid "+T.red, borderRadius: 8, padding: "12px 14px", color: T.red, fontSize: 13, marginBottom: 12 }}>{oErr}</div>}

    {oracleView === "setup" && (<div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div><div style={oLab}>姓（漢字）</div><input style={{ ...inputBase, width: "100%" }} value={oSei} onChange={e => { setOSei(e.target.value); setOConfirmed(false); }} placeholder="山田" /></div>
        <div><div style={oLab}>名（漢字）</div><input style={{ ...inputBase, width: "100%" }} value={oMei} onChange={e => { setOMei(e.target.value); setOConfirmed(false); }} placeholder="太郎" /></div>
      </div>
      <div style={{ marginBottom: 12 }}><div style={oLab}>よみがな</div><input style={{ ...inputBase, width: "100%" }} value={oYomi} onChange={e => setOYomi(e.target.value)} placeholder="やまだ たろう" /></div>
      <div style={{ marginBottom: 12 }}><div style={oLab}>通称・ビジネスネーム（任意）</div><input style={{ ...inputBase, width: "100%" }} value={oAlt} onChange={e => setOAlt(e.target.value)} placeholder="任意" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div><div style={oLab}>生年</div><input style={{ ...inputBase, width: "100%" }} value={oBy} onChange={e => setOBy(e.target.value)} placeholder="1990" /></div>
        <div><div style={oLab}>月</div><input style={{ ...inputBase, width: "100%" }} value={oBm} onChange={e => setOBm(e.target.value)} placeholder="5" /></div>
        <div><div style={oLab}>日</div><input style={{ ...inputBase, width: "100%" }} value={oBd} onChange={e => setOBd(e.target.value)} placeholder="15" /></div>
      </div>
      {oAllChars.length > 0 && (<div style={{ background: T.surface, border: "1px solid "+(oConfirmed?T.green:T.morning), borderRadius: 8, padding: "16px", marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: T.morning, marginBottom: 4 }}>⚠ 画数の確認（唯一、人の確認が必要な項目）</div>
        <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.7, marginBottom: 12 }}>姓名判断は<b style={{ color: T.textMuted }}>康熙字典の画数</b>を使います。部首は特殊カウント（さんずい氵=4／くさかんむり艹=6／しんにょう辶=7／てへん扌=4）。下の値を必ず確認してください。</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>{oAllChars.map((ch, i) => { const known = O_STROKES[ch] !== undefined || oStrokes[ch] !== undefined; return (<div key={i} style={{ textAlign: "center" }}><div style={{ fontSize: 20, marginBottom: 4 }}>{ch}</div><input style={{ ...inputBase, width: 54, textAlign: "center", borderColor: known?T.border:T.morning }} value={oStrokeOf(ch)} onChange={e => { setOStrokes(p => ({ ...p, [ch]: e.target.value === "" ? "" : Math.max(0, +e.target.value) })); setOConfirmed(false); }} placeholder="?" /><div style={{ fontSize: 9, color: known?T.textDim:T.morning, marginTop: 2 }}>{known?"参考値":"要入力"}</div></div>); })}</div>
        {oPreview && <div style={{ background: T.bg, borderRadius: 6, padding: "10px 12px", fontSize: 12, color: T.textMuted, marginBottom: 12, fontFamily: "var(--fm)" }}>五格： 天<b style={{ color: T.text }}>{oPreview.tenkaku}</b>・人<b style={{ color: T.text }}>{oPreview.jinkaku}</b>・地<b style={{ color: T.text }}>{oPreview.chikaku}</b>・外<b style={{ color: T.text }}>{oPreview.gaikaku}</b>・総<b style={{ color: T.text }}>{oPreview.soukaku}</b></div>}
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: oConfirmed?T.green:T.textMuted }}><input type="checkbox" checked={oConfirmed} onChange={e => setOConfirmed(e.target.checked)} disabled={!oAllValid} style={{ width: 16, height: 16, accentColor: T.green }} />この画数で確定して占う（確認しました）</label>
      </div>)}
      <button onClick={oGenerateBase} disabled={oLoading || !oConfirmed} style={{ ...btnPrimary, width: "100%", padding: "11px", opacity: (oLoading||!oConfirmed)?0.5:1 }}>{oLoading ? "統合中…（数秒）" : "占う"}</button>
      <div style={{ fontSize: 11, color: T.textDim, marginTop: 10, lineHeight: 1.7 }}>※ 数秘・星座・九星・干支は端末側で正確に計算（検証済）。AIは解釈と収束/発散の抽出のみ。画数だけ康熙慣習のため確認を必須にしています。</div>
    </div>)}

    {oracleView === "base" && oracleBase && (<div>
      <div style={{ background: T.surface, border: "1px solid "+T.accent, borderRadius: 8, padding: "18px" }}>
        <div style={{ fontSize: 10, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontFamily: "var(--fm)" }}>あなたを一言で</div>
        <div style={{ fontSize: 17, lineHeight: 1.6, fontWeight: 500, marginBottom: 14 }}>{oracleBase.headline}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{(oracleBase.essence||[]).map((e,i) => <div key={i} style={{ fontSize: 14, color: T.textMuted, paddingLeft: 14, borderLeft: "2px solid "+T.accent, lineHeight: 1.6 }}>{e}</div>)}</div>
      </div>
      {oSec(T.teal, "◆ 向いている職業・役割")}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{(oracleBase.careers||[]).map((c,i) => <span key={i} style={oChip}>{c}</span>)}</div>
      {oSec(T.green, "◆ いるべき環境")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: T.surface, borderLeft: "2px solid "+T.green, borderRadius: "0 8px 8px 0", padding: "14px 16px" }}><div style={{ fontSize: 11, color: T.green, marginBottom: 6 }}>活きる環境</div><div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.7 }}>{oracleBase.environment_thrive}</div></div>
        <div style={{ background: T.surface, borderLeft: "2px solid "+T.red, borderRadius: "0 8px 8px 0", padding: "14px 16px" }}><div style={{ fontSize: 11, color: T.red, marginBottom: 6 }}>枯れる環境</div><div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.7 }}>{oracleBase.environment_avoid}</div></div>
      </div>
      {oSec(T.text, "◆ 強み")}
      {(oracleBase.strengths||[]).map((s,i) => <div key={i} style={{ background: T.surface, border: "1px solid "+T.border, borderRadius: 8, padding: "12px 16px", marginBottom: 8 }}><span style={{ fontSize: 13, fontWeight: 600, color: T.teal }}>{s.title}</span><span style={{ fontSize: 13, color: T.textMuted, marginLeft: 10, lineHeight: 1.6 }}>{s.detail}</span></div>)}
      {oSec(T.text, "◆ 注意点")}
      {(oracleBase.cautions||[]).map((s,i) => <div key={i} style={{ background: T.surface, border: "1px solid "+T.border, borderRadius: 8, padding: "12px 16px", marginBottom: 8 }}><span style={{ fontSize: 13, fontWeight: 600, color: T.morning }}>{s.title}</span><span style={{ fontSize: 13, color: T.textMuted, marginLeft: 10, lineHeight: 1.6 }}>{s.detail}</span></div>)}
      {oSec(T.evening, "◆ 運の流れ・伸びる時期")}
      <div style={{ background: T.surface, border: "1px solid "+T.border, borderRadius: 8, padding: "14px 16px", fontSize: 13, color: T.textMuted, lineHeight: 1.8 }}>{oracleBase.timing}</div>
      <button onClick={() => setOShowDetail(!oShowDetail)} style={{ ...btnSm, border: "1px solid "+T.border, color: T.textMuted, borderRadius: 8, width: "100%", padding: "11px", marginTop: 18 }}>{oShowDetail ? "詳細を閉じる ▲" : "もっと詳しく見る（収束・発散・占術別・計算値）▼"}</button>
      {oShowDetail && (<div>
        {oSec(T.teal, "◆ 収束 — 独立した占術が一致する点（強い信号）")}
        {(oracleBase.convergence||[]).map((c,i) => <div key={i} style={{ background: T.surface, borderLeft: "2px solid "+T.teal, borderRadius: "0 8px 8px 0", padding: "14px 16px", marginBottom: 8 }}><div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{c.theme}</div><div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.7, marginBottom: 6 }}>{c.detail}</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{(c.sources||[]).map((s,j) => <span key={j} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: T.tealDim, color: T.teal }}>{s}</span>)}</div></div>)}
        {oSec(T.morning, "◆ 発散 — 占術で分かれる点（選択の余地）")}
        {(oracleBase.divergence||[]).map((c,i) => <div key={i} style={{ background: T.surface, borderLeft: "2px solid "+T.morning, borderRadius: "0 8px 8px 0", padding: "14px 16px", marginBottom: 8 }}><div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{c.theme}</div><div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.7 }}>{c.detail}</div></div>)}
        {oSec(T.evening, "◆ ビジネス示唆")}
        <div style={{ background: T.surface, borderLeft: "2px solid "+T.evening, borderRadius: "0 8px 8px 0", padding: "14px 16px", fontSize: 13, color: T.textMuted, lineHeight: 1.8 }}>{oracleBase.business}</div>
        {oSec(T.textDim, "◆ 各占術の読み")}
        {(oracleBase.systems||[]).map((s,i) => <div key={i} style={{ background: T.surface, border: "1px solid "+T.border, borderRadius: 8, padding: "14px 16px", marginBottom: 8 }}><div style={{ fontSize: 13, fontWeight: 500, color: T.accent, marginBottom: 4 }}>{s.name}</div><div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.7 }}>{s.reading}</div></div>)}
        {oSec(T.textDim, "◆ 計算済みデータ（決定論）")}
        <div style={{ background: T.surfaceAlt, border: "1px solid "+T.border, borderRadius: 8, padding: "14px 16px", fontSize: 12, color: T.textMuted, lineHeight: 1.9, fontFamily: "var(--fm)" }}>数秘LP <b style={{ color: T.text }}>{oracleBase.calc.数秘術.ライフパス}</b>{oracleBase.calc.数秘術.運命数!=null && <> ／ 運命数 <b style={{ color: T.text }}>{oracleBase.calc.数秘術.運命数}</b></>} ／ 星座 <b style={{ color: T.text }}>{oracleBase.calc.西洋占星術.太陽星座}</b> ／ 本命星 <b style={{ color: T.text }}>{oracleBase.calc.九星気学.本命星}</b><br/>年柱 <b style={{ color: T.text }}>{oracleBase.calc.四柱推命.年柱}</b> ／ 日柱 <b style={{ color: T.text }}>{oracleBase.calc.四柱推命.日柱}</b> ／ 日主 <b style={{ color: T.text }}>{oracleBase.calc.四柱推命.日主}</b>{oracleBase.calc.姓名判断 && <><br/>姓名判断 天{oracleBase.calc.姓名判断.tenkaku}・人{oracleBase.calc.姓名判断.jinkaku}・地{oracleBase.calc.姓名判断.chikaku}・外{oracleBase.calc.姓名判断.gaikaku}・総<b style={{ color: T.text }}>{oracleBase.calc.姓名判断.soukaku}</b></>}</div>
      </div>)}
    </div>)}

    {oracleView === "daily" && oracleBase && (<div>
      <div style={{ marginBottom: 10 }}><div style={oLab}>今日の振り返り</div><textarea style={{ ...inputBase, width: "100%", minHeight: 90, resize: "vertical" }} value={oReflect} onChange={e => setOReflect(e.target.value)} placeholder="今日あったこと・感じたこと…" /></div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => oGenerateDaily()} disabled={oLoading || !oReflect.trim()} style={{ ...btnPrimary, opacity: (oLoading||!oReflect.trim())?0.5:1 }}>{oLoading ? "読み解き中…" : "型から読み解く"}</button>
        {getDailyLog().journal && <button onClick={() => oGenerateDaily(getDailyLog().journal)} disabled={oLoading} style={{ ...btnSm, border: "1px solid "+T.border, color: T.textMuted, borderRadius: 8, padding: "7px 12px", opacity: oLoading?0.5:1 }}>今夜のジャーナルを使う</button>}
      </div>
      <div style={{ marginTop: 22 }}>{oracleLogs.length === 0 && <div style={{ fontSize: 12, color: T.textDim }}>まだ記録がありません。</div>}{oracleLogs.map((l,i) => <div key={i} style={{ background: T.surface, border: "1px solid "+T.border, borderRadius: 8, padding: "14px 16px", marginBottom: 10 }}><div style={{ fontSize: 10, color: T.textDim, marginBottom: 8, fontFamily: "var(--fm)" }}>{l.date}</div><div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.6, marginBottom: 10, paddingLeft: 10, borderLeft: "2px solid "+T.border }}>{l.reflection}</div><div style={{ fontSize: 14, color: T.text, lineHeight: 1.8 }}>{l.reading}</div></div>)}</div>
    </div>)}

    {oracleView === "review" && oracleBase && (<div>
      {oCheckpoint && <div style={{ background: T.accentDim, border: "1px solid "+T.accent+"55", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: T.accent }}>今日は「{oCheckpoint}」です。節目のレビューを残すのに良いタイミングです。</div>}
      <div style={oLab}>時間軸を選ぶ</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>{["1ヶ月","3ヶ月","半年","1年","3年","10年+"].map(h => <button key={h} onClick={() => setOHorizon(h)} style={{ ...btnSm, padding: "6px 12px", borderRadius: 8, border: "1px solid "+(oHorizon===h?T.accent:T.border), color: oHorizon===h?T.accent:T.textMuted, background: oHorizon===h?T.accentDim:"transparent" }}>{h}</button>)}</div>
      <button onClick={oGenerateReview} disabled={oLoading} style={{ ...btnPrimary, opacity: oLoading?0.5:1 }}>{oLoading ? "読み解き中…" : oHorizon + "の流れを読む"}</button>
      <div style={{ fontSize: 11, color: T.textDim, marginTop: 8, lineHeight: 1.7 }}>短い時間軸ほど最近の行動記録、長い時間軸ほど命式（生まれ持った流れ）が主役になります。</div>
      <div style={{ marginTop: 22 }}>{oReviews.length === 0 && <div style={{ fontSize: 12, color: T.textDim }}>まだレビューがありません。</div>}{oReviews.map((r,i) => <div key={i} style={{ background: T.surface, border: "1px solid "+T.border, borderRadius: 8, padding: "14px 16px", marginBottom: 10 }}><div style={{ fontSize: 10, color: T.accent, marginBottom: 8, fontFamily: "var(--fm)" }}>{r.horizon}　<span style={{ color: T.textDim }}>{r.date}</span></div><div style={{ fontSize: 14, color: T.text, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{r.text}</div></div>)}</div>
    </div>)}

    {oracleView === "physio" && oracleBase && (<div>
      <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.7, marginBottom: 14 }}>顔相・手相は心の状態を映し、ゆっくり変化します。節目ごとに撮ると<b style={{ color: T.textMuted }}>変化を追える</b>のが狙いです。正確に追うため、毎回<b style={{ color: T.textMuted }}>正面・無表情・明るい場所</b>で撮ってください。</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div><div style={oLab}>顔写真（正面）</div><input type="file" accept="image/*" onChange={e => oReadImage(e.target.files?.[0], setOFaceImg)} style={{ fontSize: 11, color: T.textMuted, width: "100%" }} />{oFaceImg && <img src={oFaceImg.preview} alt="" style={{ width: "100%", borderRadius: 8, marginTop: 8, maxHeight: 140, objectFit: "cover" }} />}</div>
        <div><div style={oLab}>左手のひら</div><input type="file" accept="image/*" onChange={e => oReadImage(e.target.files?.[0], setOHandL)} style={{ fontSize: 11, color: T.textMuted, width: "100%" }} />{oHandL && <img src={oHandL.preview} alt="" style={{ width: "100%", borderRadius: 8, marginTop: 8, maxHeight: 140, objectFit: "cover" }} />}</div>
        <div><div style={oLab}>右手のひら</div><input type="file" accept="image/*" onChange={e => oReadImage(e.target.files?.[0], setOHandR)} style={{ fontSize: 11, color: T.textMuted, width: "100%" }} />{oHandR && <img src={oHandR.preview} alt="" style={{ width: "100%", borderRadius: 8, marginTop: 8, maxHeight: 140, objectFit: "cover" }} />}</div>
      </div>
      <div style={{ fontSize: 10, color: T.textDim, marginBottom: 10, lineHeight: 1.6 }}>左手＝生まれ持った傾向、右手＝現在の状態、として両手の違いも読み解きます。片手だけ・顔だけでもOKです。</div>
      <button onClick={oGeneratePhysiognomy} disabled={oLoading || (!oFaceImg && !oHandL && !oHandR)} style={{ ...btnPrimary, opacity: (oLoading || (!oFaceImg && !oHandL && !oHandR))?0.5:1 }}>{oLoading ? "読み解き中…" : "相を読む"}</button>
      <div style={{ fontSize: 10, color: T.textDim, marginTop: 8 }}>※ 写真は読み解きに使うだけで保存しません。残るのは読み解き結果と日付だけです。</div>
      <div style={{ marginTop: 22 }}>{oPhysio.length === 0 && <div style={{ fontSize: 12, color: T.textDim }}>まだ記録がありません。</div>}{oPhysio.map((p,i) => <div key={i} style={{ background: T.surface, border: "1px solid "+T.border, borderRadius: 8, padding: "14px 16px", marginBottom: 10 }}><div style={{ fontSize: 10, color: T.textDim, marginBottom: 8, fontFamily: "var(--fm)" }}>{p.date}　{p.hasFace && "顔相"}{p.hasFace && p.hasHand && "・"}{p.hasHand && "手相"}{i === 0 && oPhysio.length > 1 && <span style={{ color: T.accent }}>　最新</span>}</div><div style={{ fontSize: 14, color: T.text, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{p.text}</div></div>)}</div>
    </div>)}
  </div>);

  const navItem = (n) => (<div key={n.id} onClick={() => setSection(n.id)} title={n.label} style={{ width: 38, height: 38, borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: section === n.id ? T.accentDim : "transparent", color: section === n.id ? T.accent : T.textDim, fontSize: 14 }}><span>{n.icon}</span><span style={{ fontSize: 7, marginTop: 1 }}>{n.label}</span></div>);
  return (<div className="forge-shell">
    <nav className="forge-sidebar"><div style={{ fontSize: 18, marginBottom: 16, color: T.accent, fontWeight: 600, fontFamily: "var(--fc)" }}>F</div>{NAV.map(navItem)}<div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}><div style={{ fontSize: 7, color: saveStatus === "saved" ? T.green : saveStatus === "saving" ? T.morning : saveStatus === "error" ? T.red : "transparent", textAlign: "center", lineHeight: 1.2 }}>{saveStatus === "saved" ? "保存済✓" : saveStatus === "saving" ? "保存中" : saveStatus === "error" ? "失敗" : "　"}</div><button onClick={logout} title="ログアウト" style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", fontSize: 10, padding: 4 }}>↩</button></div></nav>
    <main className="forge-main">{section === "today" && TodayView()}{section === "foundation" && FoundationView()}{section === "mirror" && MirrorView()}{section === "oracle" && OracleView()}{section === "history" && HistoryView()}</main>
    <nav className="forge-bottomnav">{NAV.map(n => (<div key={n.id} onClick={() => setSection(n.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 12px", cursor: "pointer", color: section === n.id ? T.accent : T.textDim }}><span style={{ fontSize: 18 }}>{n.icon}</span><span style={{ fontSize: 9 }}>{n.label}</span></div>))}</nav>
  </div>);
}

const inputBase = { background: "#0A0C13", color: "#E4E2DC", border: "1px solid #232738", borderRadius: 6, padding: "7px 10px", fontSize: 12, fontFamily: "var(--fj)" };
const btnSm = { background: "transparent", border: "none", borderRadius: 5, padding: "3px 6px", fontSize: 11, cursor: "pointer", fontFamily: "var(--fj)" };
const btnPrimary = { background: "#C8793F", color: "#fff", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--fj)" };
