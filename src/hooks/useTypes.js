import { useState, useEffect, useRef } from "react";
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

export const PRESET_PALETTE = [
  "#A73838", "#C97A4A", "#B4902C", "#4C7A57", "#2F8F8F",
  "#3B6EA5", "#5B5FC7", "#8B4FA0", "#B65C9A", "#6B7280",
];

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function useTypes(budgetId) {
  const [types, setTypes] = useState([]);
  const pendingRef = useRef(new Map()); // nom (minuscule) -> Promise<id> ou id, évite les doublons pendant un import

  useEffect(() => {
    if (!budgetId) { setTypes([]); return; }
    const unsub = onSnapshot(collection(db, "budgets", budgetId, "types"), (snap) => {
      setTypes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [budgetId]);

  const typeCol = () => collection(db, "budgets", budgetId, "types");

  const createType = async (name, color) => {
    const ref = await addDoc(typeCol(), { name: name.trim(), color });
    return ref.id;
  };

  const updateType = (id, patch) => updateDoc(doc(typeCol(), id), patch);
  const deleteType = (id) => deleteDoc(doc(typeCol(), id));

  // Retrouve un type existant par son nom (insensible à la casse), ou en crée
  // un nouveau avec une couleur par défaut déterministe. Sûr à appeler en
  // boucle (import, génération d'année) : ne crée jamais deux fois le même nom.
  const findOrCreateType = async (name) => {
    const clean = (name || "").trim();
    if (!clean) return null;
    const key = clean.toLowerCase();

    const existing = types.find((t) => t.name.trim().toLowerCase() === key);
    if (existing) return existing.id;

    if (pendingRef.current.has(key)) return pendingRef.current.get(key);

    const color = PRESET_PALETTE[hashString(key) % PRESET_PALETTE.length];
    const promise = createType(clean, color);
    pendingRef.current.set(key, promise);
    const id = await promise;
    pendingRef.current.set(key, id);
    return id;
  };

  return { types, createType, updateType, deleteType, findOrCreateType };
}
