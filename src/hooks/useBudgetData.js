import { useState, useEffect } from "react";
import {
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { getYearDates, chunk, entryYear } from "../utils/helpers";

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
      intervalWeeks: 1,
      dayOfMonth: 1,
      intervalMonths: 1,
      startMonth: 1,
      occurrenceCount: 0,
      specificMonth: new Date().getMonth() + 1,
      specificDay: new Date().getDate(),
    });

  const deletePlanItem = (id) => deleteDoc(doc(planCol(), id));

  // Modifie un item planifié. Si le montant change, met à jour en cascade
  // toutes les entrées générées par cet item qui ont l'ancien montant
  // et qui ne sont ni payées ni confirmées.
  const updatePlanItem = async (id, patch) => {
    const current = planItems.find((p) => p.id === id);
    setPlanItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    await updateDoc(doc(planCol(), id), patch);

    if (current && patch.amount !== undefined && Number(patch.amount) !== Number(current.amount)) {
      const oldAmount = Number(current.amount);
      const newAmount = Number(patch.amount);
      const toUpdate = entries.filter(
        (en) => en.planItemId === id && Number(en.amount) === oldAmount && !en.paid && !en.confirmed
      );
      const toUpdateIds = new Set(toUpdate.map((en) => en.id));
      setEntries((prev) => prev.map((en) => (toUpdateIds.has(en.id) ? { ...en, amount: newAmount } : en)));
      for (const group of chunk(toUpdate, 400)) {
        const batch = writeBatch(db);
        group.forEach((en) => batch.update(doc(entryCol(), en.id), { amount: newAmount }));
        await batch.commit();
      }
    }
  };

  // Génère les entrées manquantes pour une année donnée, sans dupliquer
  // celles déjà créées pour un même item planifié + date. `typeIdByPlanItem`
  // (fourni par l'appelant, qui a résolu/créé les types au préalable) attribue
  // un type à chaque entrée générée.
  const generateYear = async (year, typeIdByPlanItem = {}) => {
    const toCreate = [];
    planItems.forEach((pi) => {
      getYearDates(pi, year).forEach((date) => {
        const exists = entries.some((en) => en.planItemId === pi.id && en.date === date);
        if (!exists) {
          toCreate.push({
            planItemId: pi.id,
            date,
            year,
            label: pi.label,
            typeId: typeIdByPlanItem[pi.id] || null,
            amount: pi.amount,
            confirmed: false,
            paid: false,
            confirmationNumber: "",
            note: "",
            order: 0,
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

  // Mise à jour optimiste : on applique le changement localement tout de
  // suite (couleurs, cases à cocher, etc. réagissent instantanément) puis on
  // envoie l'écriture réelle à Firestore, qui confirmera/corrigera ensuite.
  const updateEntry = (id, patch) => {
    setEntries((prev) => prev.map((en) => (en.id === id ? { ...en, ...patch } : en)));
    return updateDoc(doc(entryCol(), id), patch);
  };

  const deleteEntry = (id) => {
    setEntries((prev) => prev.filter((en) => en.id !== id));
    return deleteDoc(doc(entryCol(), id));
  };

  // `data.year` doit toujours être fourni par l'appelant (le composant sait
  // dans quel onglet-année il se trouve) — la date, elle, reste optionnelle.
  const addEntry = (data) =>
    addDoc(entryCol(), {
      planItemId: null,
      typeId: null,
      confirmed: false,
      paid: false,
      confirmationNumber: "",
      note: "",
      date: "",
      order: Date.now(),
      ...data,
    });

  // Supprime toutes les entrées d'une année donnée (avec ou sans date précise),
  // pour repartir à zéro.
  const clearYear = async (year) => {
    const toDelete = entries.filter((en) => entryYear(en) === Number(year));
    for (const group of chunk(toDelete, 400)) {
      const batch = writeBatch(db);
      group.forEach((en) => batch.delete(doc(entryCol(), en.id)));
      await batch.commit();
    }
  };

  // Import en masse depuis un fichier CSV/XLSX (voir ImportSheet.jsx) —
  // conserve l'ordre des lignes du fichier via le champ "order" et déduit
  // l'année de chaque ligne à partir de sa date.
  const importEntries = async (rows) => {
    const withOrder = rows.map((data, i) => ({
      order: i,
      year: data.date ? Number(String(data.date).slice(0, 4)) : null,
      ...data,
    }));
    for (const group of chunk(withOrder, 400)) {
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
    generateYear, updateEntry, deleteEntry, addEntry, importEntries, clearYear,
  };
}
