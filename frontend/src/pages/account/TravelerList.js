/* eslint-disable */
import React, { useState, useEffect, useRef } from "react";
import TravelerHeader from "../../components/tables/TravelerHeader";
import TravelerFilter from "../../components/filters/TravelerFilter";
import TravelerTable from "../../components/tables/TravelerTable";
import AddTravelerForm from "../../components/forms/AddTravelerForm";
import "../../STYLES/traveller.css";
import { filterTravelers, emptyTravelerFilters } from "../../utils/travelerFilters";
import {
  createTraveler,
  deleteTraveler,
  listTravelers,
  updateTraveler,
} from "../../services/travelerService";

const STORAGE_KEY = "my_traveler_data";

/* ─── localStorage helpers ─────────────────────────────── */

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // quota exceeded — ignore
  }
}

/**
 * Merge API travelers with locally-stored travelers.
 * - API records (matched by id) win over local ones.
 * - Local-only records (no matching id in API list) are kept.
 * This ensures nothing disappears after a login, even if the
 * backend returns a partial or empty list.
 */
function mergeTravelers(apiList, localList) {
  const apiById = new Map(apiList.map((t) => [String(t.id), t]));
  const merged = [...apiList];

  for (const local of localList) {
    if (!apiById.has(String(local.id))) {
      merged.push(local); // keep local-only record
    }
  }

  return merged;
}

/* ─── component ────────────────────────────────────────── */

const TravelerList = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState(emptyTravelerFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyTravelerFilters);
  const [apiError, setApiError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const successTimeout = useRef(null);

  useEffect(() => {
    if (successTimeout.current !== null) {
      clearTimeout(successTimeout.current);
      successTimeout.current = null;
    }
    if (addSuccess) {
      successTimeout.current = setTimeout(() => {
        setAddSuccess("");
        successTimeout.current = null;
      }, 3000);
    }
    return () => {
      if (successTimeout.current !== null) {
        clearTimeout(successTimeout.current);
        successTimeout.current = null;
      }
    };
  }, [addSuccess]);

  // Seed from localStorage immediately — list is never blank on mount
  const [travelerData, setTravelerData] = useState(readLocal);

  // Keep localStorage in sync whenever travelerData changes
  useEffect(() => {
    writeLocal(travelerData);
  }, [travelerData]);

  // Sync from other tabs / windows
  useEffect(() => {
    const syncFromStorage = () => {
      setTravelerData((prev) => {
        const local = readLocal();
        return JSON.stringify(local) !== JSON.stringify(prev) ? local : prev;
      });
    };

    window.addEventListener("focus", syncFromStorage);
    window.addEventListener("storage", syncFromStorage);

    return () => {
      window.removeEventListener("focus", syncFromStorage);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  // Load from API and MERGE with local — never wipe local data
  useEffect(() => {
    let isMounted = true;

    const loadTravelers = async () => {
      try {
        const apiList = await listTravelers();
        if (!isMounted) return;

        if (Array.isArray(apiList)) {
          setTravelerData((prev) => {
            const merged = mergeTravelers(apiList, prev);
            writeLocal(merged);
            return merged;
          });
          setApiError("");
        }
      } catch (error) {
        if (!isMounted) return;
        // API failed — keep whatever is already in state (from localStorage seed)
        setApiError(
          error.message || "Could not sync with server. Showing local data."
        );
      }
    };

    loadTravelers();

    return () => {
      isMounted = false;
    };
  }, []);

  /* ─── CRUD ─────────────────────────────────────────────── */

  const handleAddTraveler = async (data) => {
    const created = await createTraveler(data);
    const createdList = Array.isArray(created) ? created : created ? [created] : [];
    setTravelerData((prev) => mergeTravelers(createdList, prev));
    setApiError("");
    try {
      const refreshed = await listTravelers();
      setTravelerData((prev) => mergeTravelers(refreshed, prev));
    } catch (error) {
      setApiError("Travelers were saved, but the list could not refresh. Please reload to sync.");
    }
    const count = Array.isArray(data) ? data.length : 1;
    setAddSuccess(count === 1 ? "Traveler saved successfully." : `${count} travelers saved successfully.`);
    handleClear();
    setShowAddForm(false);
  };

  const handleUpdateTraveler = async (id, updatedRow) => {
    // Optimistic update first
    setTravelerData((prev) =>
      prev.map((item) => (item.id === id ? updatedRow : item))
    );

    try {
      const updated = await updateTraveler(id, updatedRow);
      setTravelerData((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
      setApiError("");
    } catch (error) {
      setApiError(
        error.message || "Could not update on server. Updated locally."
      );
      // optimistic update already applied — no rollback needed
    }
  };

  const handleDeleteTraveler = async (id) => {
    if (!window.confirm("Delete this traveler?")) return;

    // Optimistic remove
    setTravelerData((prev) => prev.filter((item) => item.id !== id));

    try {
      await deleteTraveler(id);
      setApiError("");
    } catch (error) {
      setApiError(
        error.message || "Could not delete from server. Removed locally."
      );
      // already removed from local state — leave it removed
    }
  };

  /* ─── Filter / search ───────────────────────────────────── */

  const handleFilterChange = (nextFilters) => {
    setFilters(nextFilters);
  };
  const handleSearch = () => setAppliedFilters({ ...filters });
  const handleClear = () => {
    setFilters(emptyTravelerFilters());
    setAppliedFilters(emptyTravelerFilters());
  };
  const displayData = filterTravelers(travelerData, appliedFilters);

  /* ─── render ────────────────────────────────────────────── */

  return (
    <div className="traveller-container">
      {!showAddForm ? (
        <>
          <TravelerHeader
            onAdd={() => { setAddSuccess(""); setShowAddForm(true); }}
            onFilter={() => setShowFilter(!showFilter)}
            filterOpen={showFilter}
          />

          {apiError && (
            <p className="traveler-api-error">{apiError}</p>
          )}
          {addSuccess && <p className="traveler-add-success" role="status">{addSuccess}</p>}

          {showFilter && (
            <TravelerFilter
              filters={filters}
              setFilters={handleFilterChange}
              onSearch={handleSearch}
              onClear={handleClear}
            />
          )}

          <TravelerTable
            data={displayData}
            onUpdate={handleUpdateTraveler}
            onDelete={handleDeleteTraveler}
          />
        </>
      ) : (
        <AddTravelerForm
          onBack={() => setShowAddForm(false)}
          onSubmit={handleAddTraveler}
        />
      )}
    </div>
  );
};

export default TravelerList;
