import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { useBudgets } from "./hooks/useBudgets";
import { useBudgetData } from "./hooks/useBudgetData";
import { useYears } from "./hooks/useYears";
import { useTheme } from "./hooks/useTheme";
import { entryYear } from "./utils/helpers";
import Login from "./components/Login";
import BudgetSwitcher from "./components/BudgetSwitcher";
import PlanTab from "./components/PlanTab";
import YearTab from "./components/YearTab";
import EntryEditor from "./components/EntryEditor";
import ImportSheet from "./components/ImportSheet";

const CURRENT_YEAR = new Date().getFullYear();

export default function App() {
  const auth = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const { budgets, createBudget, renameBudget, deleteBudget } = useBudgets(auth.user);
  const [activeBudgetId, setActiveBudgetId] = useState(null);
  const [activeTab, setActiveTab] = useState(CURRENT_YEAR); // "plan" ou une année (nombre)
  const [editing, setEditing] = useState(null);
  const [importing, setImporting] = useState(false);

  // Sélectionne automatiquement le premier budget quand la liste arrive,
  // ou si le budget actif a été supprimé.
  useEffect(() => {
    if (budgets.length === 0) { setActiveBudgetId(null); return; }
    if (!budgets.some((b) => b.id === activeBudgetId)) {
      setActiveBudgetId(budgets[0].id);
    }
  }, [budgets, activeBudgetId]);

  const data = useBudgetData(activeBudgetId);
  const years = useYears(activeBudgetId);

  if (auth.loading) return <div className="loading-screen">Chargement…</div>;
  if (!auth.user) return <Login auth={auth} />;

  const entryYears = Array.from(new Set(data.entries.map(entryYear).filter((y) => y !== null)));
  const allYears = Array.from(new Set([CURRENT_YEAR, ...entryYears])).sort((a, b) => a - b);
  const activeYears = [CURRENT_YEAR, ...allYears.filter((y) => y !== CURRENT_YEAR && !years.isArchived(y))];
  const archivedYears = allYears.filter((y) => y !== CURRENT_YEAR && years.isArchived(y));

  const handleGenerateYear = async (year) => {
    await data.generateYear(year);
    setActiveTab(year);
  };

  const activeTabIsYear = typeof activeTab === "number";
  const yearEntries = activeTabIsYear
    ? data.entries.filter((en) => entryYear(en) === activeTab)
    : [];

  return (
    <div className="app-root">
      <div className="header">
        <div className="header-top">
          <div>
            <h1 className="serif">Le grand livre</h1>
            <p>Planifiez vos paiements récurrents, puis générez-les sur toute l'année.</p>
          </div>
          <div className="header-actions">
            <button className="btn secondary small" onClick={toggleTheme}>
              {theme === "dark" ? "☀️ Clair" : "🌙 Sombre"}
            </button>
            <button className="btn secondary small" onClick={auth.logout}>Déconnexion</button>
          </div>
        </div>

        <BudgetSwitcher
          budgets={budgets}
          activeId={activeBudgetId}
          onSwitch={setActiveBudgetId}
          onCreate={createBudget}
          onRename={renameBudget}
          onDelete={deleteBudget}
        />
      </div>

      {!activeBudgetId ? (
        <div className="content">
          <p className="empty-hint">Crée un premier budget ci-dessus pour commencer.</p>
        </div>
      ) : (
        <>
          <div className="tabs">
            {activeYears.map((y) => (
              <button
                key={y}
                className={`tab-btn ${activeTab === y ? "active" : ""}`}
                onClick={() => setActiveTab(y)}
              >
                {y === CURRENT_YEAR ? `Année ${y}` : y}
              </button>
            ))}
            <button
              className={`tab-btn ${activeTab === "plan" ? "active" : ""}`}
              onClick={() => setActiveTab("plan")}
            >
              Planification
            </button>

            {archivedYears.length > 0 && (
              <select
                className="archive-select"
                value=""
                onChange={(e) => { if (e.target.value) setActiveTab(Number(e.target.value)); }}
              >
                <option value="">Archives…</option>
                {archivedYears.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
          </div>

          <div className="content">
            {activeTab === "plan" && (
              <PlanTab
                planItems={data.planItems}
                updatePlanItem={data.updatePlanItem}
                addPlanItem={data.addPlanItem}
                deletePlanItem={data.deletePlanItem}
                generateYear={handleGenerateYear}
                onOpenImport={() => setImporting(true)}
              />
            )}

            {activeTabIsYear && (
              <YearTab
                year={activeTab}
                entries={yearEntries}
                openEditor={setEditing}
                updateEntry={data.updateEntry}
                archived={years.isArchived(activeTab)}
                onArchiveToggle={() =>
                  years.isArchived(activeTab) ? years.unarchiveYear(activeTab) : years.archiveYear(activeTab)
                }
                startingBalance={years.getStartingBalance(activeTab)}
                setStartingBalance={(v) => years.setStartingBalance(activeTab, v)}
                onClearYear={() => data.clearYear(activeTab)}
              />
            )}
          </div>
        </>
      )}

      {editing && (
        <EntryEditor
          entry={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            if (editing.isNew) data.addEntry(patch);
            else data.updateEntry(editing.id, patch);
            setEditing(null);
          }}
          onDelete={() => { data.deleteEntry(editing.id); setEditing(null); }}
        />
      )}

      {importing && (
        <ImportSheet
          onClose={() => setImporting(false)}
          onImport={async (rows) => {
            await data.importEntries(rows);
            setImporting(false);
            setActiveTab(CURRENT_YEAR);
          }}
        />
      )}
    </div>
  );
}
