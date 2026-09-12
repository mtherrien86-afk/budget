import { useState, useEffect } from "react";
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, getDocs, writeBatch, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { chunk } from "../utils/helpers";

export function useBudgets(user) {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setBudgets([]); setLoading(false); return; }
    const q = query(
      collection(db, "budgets"),
      where("ownerUid", "==", user.uid),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setBudgets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const createBudget = (name) =>
    addDoc(collection(db, "budgets"), {
      name,
      ownerUid: user.uid,
      createdAt: serverTimestamp(),
    });

  const renameBudget = (id, name) => updateDoc(doc(db, "budgets", id), { name });

  // Firestore ne supprime pas les sous-collections automatiquement :
  // on vide planItems + entries avant de supprimer le budget lui-même.
  const deleteBudget = async (id) => {
    for (const sub of ["planItems", "entries", "years"]) {
      const snap = await getDocs(collection(db, "budgets", id, sub));
      for (const group of chunk(snap.docs, 400)) {
        const batch = writeBatch(db);
        group.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }
    await deleteDoc(doc(db, "budgets", id));
  };

  return { budgets, loading, createBudget, renameBudget, deleteBudget };
}
