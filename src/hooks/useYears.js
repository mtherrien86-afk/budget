import { useState, useEffect } from "react";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export function useYears(budgetId) {
  const [yearDocs, setYearDocs] = useState({});

  useEffect(() => {
    if (!budgetId) { setYearDocs({}); return; }
    const unsub = onSnapshot(collection(db, "budgets", budgetId, "years"), (snap) => {
      const map = {};
      snap.docs.forEach((d) => { map[d.id] = d.data(); });
      setYearDocs(map);
    });
    return unsub;
  }, [budgetId]);

  const archiveYear = (year) =>
    setDoc(doc(db, "budgets", budgetId, "years", String(year)), { archived: true }, { merge: true });

  const unarchiveYear = (year) =>
    setDoc(doc(db, "budgets", budgetId, "years", String(year)), { archived: false }, { merge: true });

  const setStartingBalance = (year, value) =>
    setDoc(doc(db, "budgets", budgetId, "years", String(year)), { startingBalance: Number(value) || 0 }, { merge: true });

  const isArchived = (year) => !!yearDocs[String(year)]?.archived;
  const getStartingBalance = (year) => Number(yearDocs[String(year)]?.startingBalance) || 0;

  return { archiveYear, unarchiveYear, isArchived, setStartingBalance, getStartingBalance };
}
