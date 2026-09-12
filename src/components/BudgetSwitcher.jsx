import { useState } from "react";

export default function BudgetSwitcher({ budgets, activeId, onSwitch, onCreate, onRename, onDelete }) {
  const [newName, setNewName] = useState("");

  return (
    <div className="budget-switcher">
      <select value={activeId || ""} onChange={(e) => onSwitch(e.target.value)}>
        {budgets.length === 0 && <option value="">Aucun budget</option>}
        {budgets.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>

      <form
        className="budget-new"
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim()) { onCreate(newName.trim()); setNewName(""); }
        }}
      >
        <input
          placeholder="Nom du nouveau budget"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className="btn small" type="submit">+ Budget</button>
      </form>

      {activeId && (
        <div className="budget-actions">
          <button
            className="btn secondary small"
            onClick={() => {
              const current = budgets.find((b) => b.id === activeId);
              const name = prompt("Nouveau nom du budget :", current?.name || "");
              if (name && name.trim()) onRename(activeId, name.trim());
            }}
          >
            Renommer
          </button>
          <button
            className="btn danger small"
            onClick={() => {
              if (confirm("Supprimer ce budget et toutes ses entrées? Cette action est irréversible.")) {
                onDelete(activeId);
              }
            }}
          >
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}
