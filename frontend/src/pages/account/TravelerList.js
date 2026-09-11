/* eslint-disable */
import React, { useState, useEffect } from "react";
import TravelerHeader from "../../components/tables/TravelerHeader";
import TravelerFilter from "../../components/filters/TravelerFilter";
import TravelerTable from "../../components/tables/TravelerTable";
import AddTravelerForm from "../../components/forms/AddTravelerForm";
import "../../STYLES/traveller.css";
import {
  createTraveler,
  deleteTraveler,
  listTravelers,
  normalizeTraveler,
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
  const [filters, setFilters] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
  });
  const [filteredData, setFilteredData] = useState([]);
  const [apiError, setApiError] = useState("");

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
    const fallbackTraveler = normalizeTraveler({
      id: Date.now(),
      type: data.type,
      title: data.title,
      firstName: data.firstName,
      lastName: data.lastName,
      name: `${data.title} ${data.firstName} ${data.lastName}`,
      email: data.email,
      mobile: data.phone,
      gender: data.gender,
      dob: data.dob,
      passportNo: data.passportNo,
      country: data.country,
      age: new Date().getFullYear() - new Date(data.dob).getFullYear(),
    });

    try {
      const created = await createTraveler(data);
      setTravelerData((prev) => [...prev, created]);
      setApiError("");
    } catch (error) {
      setApiError(
        error.message || "Could not save to server. Saved locally."
      );
      setTravelerData((prev) => [...prev, fallbackTraveler]);
    } finally {
      setShowAddForm(false);
    }
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

  const handleSearch = () => {
    const result = travelerData.filter((item) => {
      if (
        filters.name &&
        !String(item.name || "")
          .toLowerCase()
          .includes(filters.name.toLowerCase())
      )
        return false;
      if (
        filters.email &&
        !String(item.email || "")
          .toLowerCase()
          .includes(filters.email.toLowerCase())
      )
        return false;
      if (
        filters.phone &&
        !String(item.mobile || "").includes(filters.phone)
      )
        return false;
      return true;
    });
    setFilteredData(result);
  };

  const handleClear = () => {
    setFilters({ id: "", name: "", email: "", phone: "" });
    setFilteredData([]);
  };

  const isFiltering = filters.name || filters.email || filters.phone;
  const displayData =
    isFiltering || filteredData.length > 0 ? filteredData : travelerData;

  /* ─── render ────────────────────────────────────────────── */

  return (
    <div className="traveller-container">
      {!showAddForm ? (
        <>
          <TravelerHeader
            onAdd={() => setShowAddForm(true)}
            onFilter={() => setShowFilter(!showFilter)}
          />

          {apiError && (
            <p className="traveler-api-error">{apiError}</p>
          )}

          {showFilter && (
            <TravelerFilter
              filters={filters}
              setFilters={setFilters}
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