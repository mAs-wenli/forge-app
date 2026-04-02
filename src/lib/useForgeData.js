"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";

const defaultForge = {
  antiVision: "", vision: "", identity: "",
  visionHistory: [], actionLog: [],
  patternInterrupts: [
    { id: "pi1", time: "11:00", question: "今やっていることで私は何を避けている？" },
    { id: "pi2", time: "15:00", question: "この行動は最悪な未来に向かっている？理想の未来に向かっている？" },
    { id: "pi3", time: "21:00", question: "今日いちばん生きていた瞬間は？死んでいた瞬間は？" },
  ],
  goal1year: "", goalQuarter: "", goalMonth: "", goalWeek: "",
  dailyLog: {},
};

const defaultMirror = { goal: "", dialogueHistory: [], portrait: null };

const defaultData = { forge: defaultForge, mirror: defaultMirror };

export function useForgeData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [dataReady, setDataReady] = useState(false);
  const saveTimer = useRef(null);
  const supabaseRef = useRef(null);
  const userIdRef = useRef(null);

  // Load from Supabase
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        supabaseRef.current = supabase;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        userIdRef.current = user.id;

        const { data: row, error } = await supabase
          .from("user_data")
          .select("data")
          .eq("user_id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Load error:", error);
        }

        if (row && row.data) {
          const d = row.data;
          // Migrate missing fields
          if (!d.forge) d.forge = defaultForge;
          if (!d.mirror) d.mirror = defaultMirror;
          if (!d.forge.dailyLog) d.forge.dailyLog = {};
          if (!d.forge.patternInterrupts) d.forge.patternInterrupts = defaultForge.patternInterrupts;
          // Migrate old goal hierarchy into a domain if domains don't exist yet
          if (!d.forge.domains) {
            d.forge.domains = [];
            if (d.forge.goal1year || d.forge.goalQuarter || d.forge.goalMonth || d.forge.goalWeek) {
              d.forge.domains.push({
                id: "migrated", name: "メイン", emoji: "◆", color: "#C8793F",
                vision: "", goal1year: d.forge.goal1year || "", goalQuarter: d.forge.goalQuarter || "",
                goalMonth: d.forge.goalMonth || "", goalWeek: d.forge.goalWeek || "",
              });
            }
          }
          setData(d);
        } else {
          // First time: create initial row
          setData(defaultData);
          await supabase.from("user_data").upsert({
            user_id: user.id,
            data: defaultData,
          });
        }
        setDataReady(true);
      } catch (e) {
        console.error("Init error:", e);
        setData(defaultData);
        setDataReady(true);
      }
      setLoading(false);
    })();
  }, []);

  // Auto-save to Supabase on data change (debounced)
  useEffect(() => {
    if (!dataReady || !data || !userIdRef.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        const { error } = await supabaseRef.current
          .from("user_data")
          .update({ data })
          .eq("user_id", userIdRef.current);
        if (error) throw error;
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (e) {
        console.error("Save error:", e);
        setSaveStatus("error");
      }
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [data, dataReady]);

  const logout = useCallback(async () => {
    if (supabaseRef.current) await supabaseRef.current.auth.signOut();
    window.location.href = "/login";
  }, []);

  return { data, setData, loading, saveStatus, logout };
}
