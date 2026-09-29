"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "fleetfuelpro_external_mapping_records";

const ENTITY_TYPES = ["ASSET", "PROJECT", "STATION"];

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getInternalCode(item, entityType) {
  if (!item) return "";
  if (entityType === "ASSET") {
    return item.assetId || item.assetCode || item.equipmentNo || item.id || "";
  }
  if (entityType === "PROJECT") {
    return item.code || item.projectCode || item.id || "";
  }
  return item.stationId || item.stationCode || item.id || "";
}

function getInternalLabel(item, entityType) {
  const code = getInternalCode(item, entityType);
  const name =
    entityType === "PROJECT"
      ? item?.name || item?.projectName
      : entityType === "STATION"
        ? item?.name || item?.stationName
        : item?.type || item?.category;
  return name ? `${code} — ${name}` : code;
}

export default function ExternalMappingPage({
  currentCompany,
  currentCompanyId = "",
  assets = [],
  projects = [],
  stations = [],
  showToast,
}) {
  const companyId = currentCompany?.id || currentCompanyId || "";
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [clientFilter, setClientFilter] = useState("ALL");
  const [modal, setModal] = useState({
    open: false,
    mode: "add",
    editingId: "",
    integrationClient: "ERP Test",
    entityType: "ASSET",
    internalCode: "",
    externalCode: "",
  });

  useEffect(() => {
    if (!companyId || typeof window === "undefined") {
      setRecords([]);
      return;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const all = raw ? JSON.parse(raw) : {};
      setRecords(Array.isArray(all?.[companyId]) ? all[companyId] : []);
    } catch {
      setRecords([]);
    }
  }, [companyId]);

  const persist = (nextRecords) => {
    setRecords(nextRecords);
    if (typeof window === "undefined" || !companyId) return;

    let all = {};
    try {
      all = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      all = {};
    }

    all[companyId] = nextRecords;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  };

  const integrationClients = useMemo(() => {
    const fromRecords = records.map((row) => row.integrationClient).filter(Boolean);
    return Array.from(new Set(["ERP Test", ...fromRecords]));
  }, [records]);

  const entityOptions = useMemo(() => {
    if (modal.entityType === "PROJECT") return projects;
    if (modal.entityType === "STATION") return stations;
    return assets;
  }, [modal.entityType, assets, projects, stations]);

  const filteredRecords = useMemo(() => {
    const q = normalize(search);
    return records.filter((row) => {
      if (entityFilter !== "ALL" && row.entityType !== entityFilter) return false;
      if (clientFilter !== "ALL" && row.integrationClient !== clientFilter) return false;
      if (!q) return true;
      return [
        row.entityType,
        row.integrationClient,
        row.internalCode,
        row.externalCode,
        row.status,
      ]
        .filter(Boolean)
        .some((value) => normalize(value).includes(q));
    });
  }, [records, search, entityFilter, clientFilter]);

  const openAdd = () => {
    setModal({
      open: true,
      mode: "add",
      editingId: "",
      integrationClient: integrationClients[0] || "ERP Test",
      entityType: "ASSET",
      internalCode: "",
      externalCode: "",
    });
  };

  const openEdit = (row) => {
    setModal({
      open: true,
      mode: "edit",
      editingId: row.id,
      integrationClient: row.integrationClient,
      entityType: row.entityType,
      internalCode: row.internalCode,
      externalCode: row.externalCode,
    });
  };

  const closeModal = () => setModal((current) => ({ ...current, open: false }));

  const saveMapping = () => {
    const integrationClient = String(modal.integrationClient || "").trim();
    const entityType = String(modal.entityType || "").trim().toUpperCase();
    const internalCode = String(modal.internalCode || "").trim();
    const externalCode = String(modal.externalCode || "").trim();

    if (!integrationClient || !entityType || !internalCode || !externalCode) {
      showToast?.("warning", "Integration client, entity, and external code are required.");
      return;
    }

    const duplicate = records.find(
      (row) =>
        row.id !== modal.editingId &&
        row.integrationClient === integrationClient &&
        row.entityType === entityType &&
        normalize(row.internalCode) === normalize(internalCode),
    );

    if (duplicate) {
      showToast?.("warning", "This Fleet Fuel entity already has a mapping for the selected integration client.");
      return;
    }

    if (modal.mode === "edit") {
      persist(
        records.map((row) =>
          row.id === modal.editingId
            ? {
                ...row,
                integrationClient,
                entityType,
                internalCode,
                externalCode,
                updatedAt: new Date().toISOString(),
              }
            : row,
        ),
      );
      showToast?.("success", "External mapping updated.");
    } else {
      persist([
        {
          id: `MAP-${Date.now()}`,
          integrationClient,
          entityType,
          internalCode,
          externalCode,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ...records,
      ]);
      showToast?.("success", "External mapping added.");
    }

    closeModal();
  };

  const toggleStatus = (row) => {
    const nextStatus = row.status === "INACTIVE" ? "ACTIVE" : "INACTIVE";
    persist(
      records.map((item) =>
        item.id === row.id
          ? { ...item, status: nextStatus, updatedAt: new Date().toISOString() }
          : item,
      ),
    );
    showToast?.("success", `Mapping ${nextStatus === "ACTIVE" ? "activated" : "archived"}.`);
  };

  const removeMapping = (row) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Remove mapping ${row.internalCode} → ${row.externalCode}?`,
      );
      if (!confirmed) return;
    }
    persist(records.filter((item) => item.id !== row.id));
    showToast?.("success", "External mapping removed.");
  };

  return (
    <div className="min-h-screen p-4 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
              Integration
            </p>
            <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
              External Mapping
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Match Fleet Fuel PRO Asset, Project, and Station codes with codes used by external ERP systems.
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              {currentCompany?.name || currentCompanyId || "—"}
            </p>
          </div>

          <button
            type="button"
            onClick={openAdd}
            className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-300"
          >
            + Add Mapping
          </button>
        </div>

        <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 lg:grid-cols-[minmax(220px,1fr)_180px_220px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Fleet Fuel or external code..."
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
          />
          <select
            value={entityFilter}
            onChange={(event) => setEntityFilter(event.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
          >
            <option value="ALL">All entity types</option>
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={clientFilter}
            onChange={(event) => setClientFilter(event.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
          >
            <option value="ALL">All integration clients</option>
            {integrationClients.map((client) => (
              <option key={client} value={client}>{client}</option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Fleet Fuel Code</th>
                  <th className="px-4 py-3">External Code</th>
                  <th className="px-4 py-3">Integration Client</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      No external mappings yet. Add one manually or use Bulk Import when the backend import workflow is connected.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((row) => (
                    <tr key={row.id} className="text-slate-200">
                      <td className="px-4 py-3 font-black">{row.entityType}</td>
                      <td className="px-4 py-3 font-mono text-sky-300">{row.internalCode}</td>
                      <td className="px-4 py-3 font-mono text-amber-300">{row.externalCode}</td>
                      <td className="px-4 py-3">{row.integrationClient}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${
                          row.status === "INACTIVE"
                            ? "border-slate-600 bg-slate-800 text-slate-400"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        }`}>
                          {row.status === "INACTIVE" ? "Archived" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEdit(row)} className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-black text-sky-300">
                            Edit
                          </button>
                          <button onClick={() => toggleStatus(row)} className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-black text-amber-300">
                            {row.status === "INACTIVE" ? "Activate" : "Archive"}
                          </button>
                          <button onClick={() => removeMapping(row)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-black text-red-300">
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-5 text-amber-100">
          Frontend prototype only. Manual mappings are stored locally in this browser until the backend mapping service is connected.
        </div>
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl">
            <div className="border-b border-slate-800 px-6 py-5">
              <h2 className="text-xl font-black text-white">
                {modal.mode === "edit" ? "Edit External Mapping" : "Add External Mapping"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Select the Fleet Fuel entity, then enter the code used by the external system.
              </p>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-xs font-black text-slate-400">
                  Integration Client
                </label>
                <select
                  value={modal.integrationClient}
                  onChange={(event) => setModal((current) => ({ ...current, integrationClient: event.target.value }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
                >
                  {integrationClients.map((client) => (
                    <option key={client} value={client}>{client}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-black text-slate-400">
                  Entity Type
                </label>
                <select
                  value={modal.entityType}
                  onChange={(event) =>
                    setModal((current) => ({
                      ...current,
                      entityType: event.target.value,
                      internalCode: "",
                    }))
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
                >
                  {ENTITY_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-black text-slate-400">
                  Fleet Fuel Entity
                </label>
                <select
                  value={modal.internalCode}
                  onChange={(event) => setModal((current) => ({ ...current, internalCode: event.target.value }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
                >
                  <option value="">Select entity...</option>
                  {entityOptions.map((item) => {
                    const code = getInternalCode(item, modal.entityType);
                    if (!code) return null;
                    return (
                      <option key={`${modal.entityType}-${code}`} value={code}>
                        {getInternalLabel(item, modal.entityType)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-black text-slate-400">
                  External Code
                </label>
                <input
                  value={modal.externalCode}
                  onChange={(event) => setModal((current) => ({ ...current, externalCode: event.target.value }))}
                  placeholder="Example: EQ-9987"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">
              <button type="button" onClick={closeModal} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-black text-slate-300">
                Cancel
              </button>
              <button type="button" onClick={saveMapping} className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950">
                Save Mapping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
