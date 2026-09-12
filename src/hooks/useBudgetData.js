import { useState, useEffect } from "react";
import {
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { getYearDates, chunk } from "../utils/helpers";

export function useBudgetData(budgetId) {
  const [planItems, setPlanItems] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!budgetId) { setPlanItems([]); setEntries([]); setLoading(false); return; }
    setLoading(true);
    const unsub1 = onSnapshot(collection(db, "budgets", budgetId, "planItems"), (snap) => {
      setPlanItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsub2 = onSnapshot(collection(db, "budgets", budgetId, "entries"), (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => { unsub1(); unsub2(); };
  }, [budgetId]);

  const planCol = () => collection(db, "budgets", budgetId, "planItems");
  const entryCol = () => collection(db, "budgets", budgetId, "entries");

  const addPlanItem = () =>
    addDoc(planCol(), {
      label: "Nouvelle entrée",
      amount: 0,
      type: "monthly",
      weekday: 1,
      dayOfMonth: 1,
      specificDate: new Date().toISOString().slice(0, 10),
    });

  const deletePlanItem = (id) => deleteDoc(doc(planCol(), id));

  // Modifie un item planifié. Si le montant change, met à jour en cascade
  // toutes les entrées générées par cet item qui ont l'ancien montant
  // et qui ne sont ni payées ni confirmées.
  const updatePlanItem = async (id, patch) => {
    const current = planItems.find((p) => p.id === id);
    await updateDoc(doc(planCol(), id), patch);

    if (current && patch.amount !== undefined && Number(patch.amount) !== Number(current.amount)) {
      const oldAmount = Number(current.amount);
      const newAmount = Number(patch.amount);
      const toUpdate = entries.filter(
        (en) => en.planItemId === id && Number(en.amount) === oldAmount && !en.paid && !en.confirmed
      );
      for (const group of chunk(toUpdate, 400)) {
        const batch = writeBatch(db);
        group.forEach((en) => batch.update(doc(entryCol(), en.id), { amount: newAmount }));
        await batch.commit();
      }
    }
  };

  // Génère les entrées manquantes pour une année donnée, sans dupliquer
  // celles déjà créées pour un même item planifié + date.
  const generateYear = async (year) => {
    const toCreate = [];
    planItems.forEach((pi) => {
      getYearDates(pi, year).forEach((date) => {
        const exists = entries.some((en) => en.planItemId === pi.id && en.date === date);
        if (!exists) {
          toCreate.push({
            planItemId: pi.id,
            date,
            label: pi.label,
            amount: pi.amount,
            confirmed: false,
            paid: false,
            confirmationNumber: "",
            note: "",
          });
        }
      });
    });
    for (const group of chunk(toCreate, 400)) {
      const batch = writeBatch(db);
      group.forEach((data) => batch.set(doc(entryCol()), data));
      await batch.commit();
    }
  };

  const updateEntry = (id, patch) => updateDoc(doc(entryCol(), id), patch);
  const deleteEntry = (id) => deleteDoc(doc(entryCol(), id));

  const addEntry = (data) =>
    addDoc(entryCol(), {
      planItemId: null,
      confirmed: false,
      paid: false,
      confirmationNumber: "",
      note: "",
      ...data,
    });

  // Import en masse depuis un fichier CSV/XLSX (voir ImportSheet.jsx)
  const importEntries = async (rows) => {
    for (const group of chunk(rows, 400)) {
      const batch = writeBatch(db);
      group.forEach((data) =>
        batch.set(doc(entryCol()), {
          planItemId: null,
          confirmed: false,
          paid: false,
          confirmationNumber: "",
          note: "",
          ...data,
        })
      );
      await batch.commit();
    }
  };

  return {
    planItems, entries, loading,
    addPlanItem, updatePlanItem, deletePlanItem,
    generateYear, updateEntry, deleteEntry, addEntry, importEntries,
  };
}
