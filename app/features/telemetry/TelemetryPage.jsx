    "use client";

    import { useCallback, useEffect, useMemo, useRef, useState } from "react";
    import {
      assignTelemetryDevice,
      createTelemetryDevice,
      fetchLatestTelemetry,
      fetchTelemetryAssets,
      fetchTelemetryDevices,
      unassignTelemetryDevice,
      updateTelemetryDevice,
    } from "../../services/telemetryService";

    const OFFLINE_TIMEOUT_MS = 10 * 60 * 1000;

    const TELEMETRY_INTEGRATIONS = [
      {
        key: "XIRGO_LX45_EA_XG_IOTM",
        label: "Xirgo LX45-EA",
        vendor: "XIRGO",
        model: "LX45-EA",
        protocol: "XG_IOTM",
        transport: "MQTT",
      },
      {
        key: "TELTONIKA_FMC650_CODEC8E",
        label: "Teltonika FMC650",
        vendor: "TELTONIKA",
        model: "FMC650",
        protocol: "CODEC_8_EXTENDED",
        transport: "TCP",
      },
    ];


    const formatDateTime = (value) => {
      if (!value) return "—";
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
    };

    const assetLabel = (device) => device?.asset?.assetId || "Unassigned";

    const connectionStatus = (lastSeenAt) => {
      if (!lastSeenAt) return "NEVER CONNECTED";
      const seen = new Date(lastSeenAt).getTime();
      if (!Number.isFinite(seen)) return "UNKNOWN";
      return Date.now() - seen <= OFFLINE_TIMEOUT_MS ? "ONLINE" : "OFFLINE";
    };

    const errorText = (error, fallback) => {
      const message = error?.response?.data?.message || error?.message || fallback;
      return Array.isArray(message) ? message.join(", ") : String(message);
    };

    const statusClass = (status) =>
      String(status).toUpperCase() === "ACTIVE"
        ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        : "border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200";

    const connectionClass = (status) => {
      if (status === "ONLINE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
      if (status === "OFFLINE") return "border-rose-200 bg-rose-50 text-rose-700";
      return "border-slate-200 bg-slate-50 text-slate-600";
    };

    function Modal({ open, title, onClose, children, width = "max-w-3xl" }) {
      if (!open) return null;
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4">
          <div className={`max-h-[92vh] w-full ${width} overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl`}>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              <button type="button" onClick={onClose} className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100">×</button>
            </div>
            <div className="max-h-[calc(92vh-68px)] overflow-auto">{children}</div>
          </div>
        </div>
      );
    }

    function AssetPicker({ device, assets, devices, disabled, onRequestChange }) {
      const [open, setOpen] = useState(false);
      const [query, setQuery] = useState("");
      const ref = useRef(null);

      useEffect(() => {
        const close = (event) => {
          if (!ref.current?.contains(event.target)) setOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
      }, []);

      const occupied = new Set(
        devices.filter((item) => item.id !== device.id && item.assetId).map((item) => item.assetId),
      );
      const options = assets
        .filter((asset) => !occupied.has(asset.id) || asset.id === device.assetId)
        .filter((asset) => {
          const q = query.trim().toLowerCase();
          return !q || [asset.assetId, asset.type, asset.category].filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q));
        })
        .sort((a, b) => String(a.assetId || "").localeCompare(String(b.assetId || ""), undefined, { numeric: true }));

      return (
        <div ref={ref} className="relative min-w-[170px]">
          <button type="button" disabled={disabled} onClick={() => { setOpen((v) => !v); setQuery(""); }}
            className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left font-semibold text-blue-700 hover:bg-slate-50 disabled:opacity-60">
            <span>{assetLabel(device)}</span><span className="text-[10px] text-slate-400">▼</span>
          </button>
          {open && (
            <div className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="border-b border-slate-200 p-2">
                <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search asset number..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <div className="max-h-64 overflow-auto p-1">
                <button type="button" onClick={() => { onRequestChange(""); setOpen(false); }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-slate-100">
                  Unassigned
                </button>
                {options.map((asset) => (
                  <button key={asset.id} type="button" onClick={() => { onRequestChange(asset.id); setOpen(false); }}
                    className="w-full rounded-lg px-3 py-2 text-left hover:bg-orange-50">
                    <div className="text-sm font-semibold text-slate-800">{asset.assetId}</div>
                    <div className="truncate text-xs text-slate-500">{[asset.type, asset.category].filter(Boolean).join(" · ")}</div>
                  </button>
                ))}
                {!options.length && <div className="px-3 py-5 text-center text-sm text-slate-400">No available assets found.</div>}
              </div>
            </div>
          )}
        </div>
      );
    }

    function FormAssetPicker({ value, assets, devices, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  useEffect(() => { const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);
  const options = assets.filter((a) => !devices.some((d) => d.assetId === a.id)).filter((a) => { const q=query.trim().toLowerCase(); return !q || [a.assetId,a.type,a.category].filter(Boolean).some((v)=>String(v).toLowerCase().includes(q)); }).sort((a,b)=>String(a.assetId||"").localeCompare(String(b.assetId||""),undefined,{numeric:true}));
  const selected = assets.find((a)=>a.id===value);
  return <div ref={ref} className="relative mt-1.5">
    <button type="button" disabled={disabled} onClick={()=>{setOpen((v)=>!v);setQuery("");}} className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"><span>{selected?.assetId || "Unassigned"}</span><span className="text-[10px] opacity-60">▼</span></button>
    {open && <div className="absolute left-0 top-full z-[120] mt-1 w-full min-w-[280px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-200 p-2 dark:border-slate-700"><input autoFocus value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search asset number..." className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:border-slate-600 dark:bg-slate-950 dark:text-white" /></div>
      <div className="max-h-60 overflow-auto p-1"><button type="button" onClick={()=>{onChange("");setOpen(false);}} className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800">Unassigned</button>
      {options.map((a)=><button key={a.id} type="button" onClick={()=>{onChange(a.id);setOpen(false);}} className="w-full rounded-md px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"><div className="text-sm font-semibold text-slate-900 dark:text-white">{a.assetId}</div><div className="truncate text-xs text-slate-500 dark:text-slate-400">{[a.type,a.category].filter(Boolean).join(" · ")}</div></button>)}
      {!options.length && <div className="px-3 py-5 text-center text-sm opacity-60">No available assets found.</div>}</div></div>}
  </div>;
}

export default function TelemetryPage({ companyId = "" }) {
      const [devices, setDevices] = useState([]);
      const [assets, setAssets] = useState([]);
      const [search, setSearch] = useState("");
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState("");
      const [detailsDevice, setDetailsDevice] = useState(null);
      const [latest, setLatest] = useState(null);
      const [latestLoading, setLatestLoading] = useState(false);
      const [addOpen, setAddOpen] = useState(false);
      const [addError, setAddError] = useState("");
      const [saving, setSaving] = useState(false);
      const [busy, setBusy] = useState("");
      const [confirmStatus, setConfirmStatus] = useState(null);
      const [confirmAsset, setConfirmAsset] = useState(null);
      const [sensorDetails, setSensorDetails] = useState(null);
      const emptyForm = { integrationKey: "", vendor: "", model: "", hardwareId: "", protocol: "", transport: "", firmwareVersion: "", assetId: "" };
      const [form, setForm] = useState(emptyForm);

      const load = useCallback(async () => {
        if (!companyId) return;
        setLoading(true); setError("");
        try {
          const [deviceRows, assetRows] = await Promise.all([
            fetchTelemetryDevices({ companyId }),
            fetchTelemetryAssets(companyId),
          ]);
          setDevices(deviceRows);
          setAssets(assetRows.filter((a) => !a.deletedAt && String(a.status || "").toUpperCase() !== "RETIRED"));
        } catch (e) {
          setError(errorText(e, "Failed to load telemetry devices."));
        } finally { setLoading(false); }
      }, [companyId]);

      const loadLatest = useCallback(async (id) => {
        if (!id) return;
        setLatestLoading(true);
        try { setLatest(await fetchLatestTelemetry(id)); }
        catch (e) { setLatest(null); setError(errorText(e, "Failed to load latest telemetry.")); }
        finally { setLatestLoading(false); }
      }, []);

      useEffect(() => { void load(); }, [load]);
      useEffect(() => { if (detailsDevice?.id) void loadLatest(detailsDevice.id); else setLatest(null); }, [detailsDevice?.id, loadLatest]);

      const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return devices;
        return devices.filter((d) => [d.vendor, d.model, d.hardwareId, assetLabel(d), d.status, connectionStatus(d.lastSeenAt)]
          .filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
      }, [devices, search]);

      const readings = useMemo(() => Object.entries(latest?.parameters || {})
        .map(([parameterCode, item]) => ({ parameterCode, ...(item || {}) }))
        .sort((a, b) => a.parameterCode.localeCompare(b.parameterCode)), [latest]);

      const changeIntegration = (integrationKey) => {
        const integration = TELEMETRY_INTEGRATIONS.find((item) => item.key === integrationKey);

        setForm((current) => ({
          ...current,
          integrationKey,
          vendor: integration?.vendor || "",
          model: integration?.model || "",
          protocol: integration?.protocol || "",
          transport: integration?.transport || "",
        }));
      };

      const createDevice = async (event) => {
        event.preventDefault();
        if (!form.integrationKey || !form.vendor.trim() || !form.hardwareId.trim()) {
          setAddError("Supported Integration and Hardware ID are required."); return;
        }
        setSaving(true); setAddError("");
        try {
          const created = await createTelemetryDevice({
            companyId, vendor: form.vendor.trim(), model: form.model.trim() || null,
            hardwareId: form.hardwareId.trim(), protocol: form.protocol.trim() || null,
            transport: form.transport || null, firmwareVersion: form.firmwareVersion.trim() || null, status: "ACTIVE",
          });
          if (form.assetId) await assignTelemetryDevice(created.id, { companyId, assetId: form.assetId });
          setAddOpen(false); setForm(emptyForm); await load();
        } catch (e) { setAddError(errorText(e, "Failed to add telemetry device.")); }
        finally { setSaving(false); }
      };

      const changeStatus = async () => {
        const { device, nextStatus } = confirmStatus || {};
        if (!device) return;
        setBusy(`status:${device.id}`);
        setError("");
        try {
          await updateTelemetryDevice(device.id, { status: nextStatus });

          // Update only the changed device locally.
          // Do not reload the full devices/assets page for a single status change.
          setDevices((current) =>
            current.map((item) =>
              item.id === device.id ? { ...item, status: nextStatus } : item
            )
          );

          if (detailsDevice?.id === device.id) {
            setDetailsDevice((current) =>
              current ? { ...current, status: nextStatus } : current
            );
          }

          setConfirmStatus(null);
        } catch (e) {
          setError(errorText(e, "Failed to update device status."));
          setConfirmStatus(null);
        } finally {
          setBusy("");
        }
      };

      const changeAsset = async () => {
        const { device, assetId } = confirmAsset || {};
        if (!device) return;
        setBusy(`asset:${device.id}`);
        setError("");
        try {
          if (assetId) {
            await assignTelemetryDevice(device.id, { companyId, assetId });
          } else {
            await unassignTelemetryDevice(device.id, companyId);
          }

          const nextAsset = assetId
            ? assets.find((asset) => asset.id === assetId) || null
            : null;

          // Update only the changed assignment locally.
          // Keep the rest of the table visible and avoid re-fetching all assets.
          setDevices((current) =>
            current.map((item) =>
              item.id === device.id
                ? { ...item, assetId: assetId || null, asset: nextAsset }
                : item
            )
          );

          if (detailsDevice?.id === device.id) {
            setDetailsDevice((current) =>
              current
                ? { ...current, assetId: assetId || null, asset: nextAsset }
                : current
            );
          }

          setConfirmAsset(null);
        } catch (e) {
          setError(errorText(e, "Failed to update asset assignment."));
          setConfirmAsset(null);
        } finally {
          setBusy("");
        }
      };

      return (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Telemetry</h1>
              <p className="mt-1 text-sm text-slate-500">Manage telemetry devices, asset assignments and connection status.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setForm(emptyForm); setAddError(""); setAddOpen(true); }}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">+ Add Device</button>
              <button type="button" onClick={() => void load()}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Refresh</button>
            </div>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="font-bold text-slate-900">Telemetry Devices</h2><p className="text-xs text-slate-500">{devices.length} registered devices</p></div>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search device, hardware ID or asset..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400 sm:w-80" />
            </div>

            {error && <div className="m-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

            <div className="overflow-x-auto overflow-y-visible pb-72">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-orange-700">
                  <tr>
                    {["#","Device","Hardware ID","Asset","Status","Connection","Last Seen"].map((h) =>
                      <th key={h} className="border-b border-r border-slate-300 px-4 py-3 last:border-r-0">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Loading devices...</td></tr> :
                  !filtered.length ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No telemetry devices found.</td></tr> :
                  filtered.map((device, index) => {
                    const connection = connectionStatus(device.lastSeenAt);
                    const status = String(device.status || "INACTIVE").toUpperCase();
                    return (
                      <tr key={device.id} className="hover:bg-slate-50/70">
                        <td className="border-b border-r border-slate-200 px-4 py-3 text-slate-500">{index + 1}</td>
                        <td className="border-b border-r border-slate-200 px-4 py-3">
                          <button type="button" onClick={() => setDetailsDevice(device)}
                            className="font-bold text-blue-800 hover:text-orange-600 hover:underline">
                            {[device.vendor, device.model].filter(Boolean).join(" ") || "Telemetry Device"}
                          </button>
                        </td>
                        <td className="border-b border-r border-slate-200 px-4 py-3">{device.hardwareId || "—"}</td>
                        <td className="border-b border-r border-slate-200 px-2 py-2">
                          <AssetPicker device={device} assets={assets} devices={devices} disabled={busy === `asset:${device.id}`}
                            onRequestChange={(assetId) => { if ((device.assetId || "") !== assetId) setConfirmAsset({ device, assetId }); }} />
                        </td>
                        <td className="border-b border-r border-slate-200 px-4 py-3">
                          <button type="button" disabled={busy === `status:${device.id}`}
                            onClick={() => setConfirmStatus({ device, nextStatus: status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })}
                            className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(status)}`}>{status}</button>
                        </td>
                        <td className="border-b border-r border-slate-200 px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${connectionClass(connection)}`}>
                            <span className={`h-2 w-2 rounded-full ${connection === "ONLINE" ? "bg-emerald-500" : connection === "OFFLINE" ? "bg-rose-500" : "bg-slate-400"}`} />
                            {connection}
                          </span>
                        </td>
                        <td className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-slate-600">{formatDateTime(device.lastSeenAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <Modal open={addOpen} title="Add Telemetry Device" onClose={() => !saving && setAddOpen(false)} width="max-w-2xl">
            <form onSubmit={createDevice} className="space-y-5 p-5">
              {addError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{addError}</div>}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                  Supported Integration *
                  <select
                    value={form.integrationKey}
                    onChange={(e) => changeIntegration(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-orange-400"
                  >
                    <option value="">Select supported device integration</option>
                    {TELEMETRY_INTEGRATIONS.map((integration) => (
                      <option key={integration.key} value={integration.key}>
                        {integration.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Vendor
                  <input
                    value={form.vendor}
                    readOnly
                    placeholder="Selected automatically"
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-700"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Model
                  <input
                    value={form.model}
                    readOnly
                    placeholder="Selected automatically"
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-700"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Protocol
                  <input
                    value={form.protocol}
                    readOnly
                    placeholder="Selected automatically"
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-700"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Transport
                  <input
                    value={form.transport}
                    readOnly
                    placeholder="Selected automatically"
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-700"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                  Hardware ID *
                  <input
                    value={form.hardwareId}
                    onChange={(e) => setForm((f) => ({ ...f, hardwareId: e.target.value }))}
                    placeholder="IMEI / serial / hardware identifier"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-orange-400"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Firmware Version
                  <input
                    value={form.firmwareVersion}
                    onChange={(e) => setForm((f) => ({ ...f, firmwareVersion: e.target.value }))}
                    placeholder="Optional"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-orange-400"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Initial Asset
                  <FormAssetPicker value={form.assetId} assets={assets} devices={devices} disabled={saving} onChange={(assetId) => setForm((f) => ({ ...f, assetId }))} />
                </label>
              </div>
              <div className="flex justify-center gap-3">
                <button type="button" onClick={() => setAddOpen(false)} className="min-w-28 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={saving} className="min-w-28 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60">{saving ? "Adding..." : "Add Device"}</button>
              </div>
            </form>
          </Modal>

          <Modal
            open={Boolean(detailsDevice)}
            title={
              detailsDevice
                ? `${[detailsDevice.vendor, detailsDevice.model].filter(Boolean).join(" ") || "Telemetry Device"} - ${assetLabel(detailsDevice)}`
                : "Telemetry Device"
            }
            onClose={() => { setDetailsDevice(null); setSensorDetails(null); }}
            width="max-w-3xl"
          >
            {detailsDevice && <div className="bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
              <div className="px-5 pt-4">
                <div className="flex items-center justify-between gap-4 border-b border-slate-300 pb-2 dark:border-slate-700">
                  <div className="text-sm">
                    <span className="font-semibold">Sensor Readings</span>
                    <span className="ml-2 opacity-60">· {latest?.parameterCount ?? readings.length} sensors</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadLatest(detailsDevice.id)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium dark:border-slate-700"
                  >
                    {latestLoading ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_80px_110px_70px] gap-3 border-b border-slate-300 py-2 text-[11px] font-semibold uppercase dark:border-slate-700">
                  <div>Sensor</div><div>ID</div><div className="text-right">Value</div><div>Unit</div>
                </div>

                {latestLoading && !readings.length
                  ? <div className="py-8 text-center text-sm opacity-60">Loading telemetry...</div>
                  : !readings.length
                    ? <div className="py-8 text-center text-sm opacity-60">No telemetry readings received yet.</div>
                    : readings.map((r) => (
                      <div key={r.parameterCode} className="grid grid-cols-[minmax(0,1fr)_80px_110px_70px] items-center gap-3 py-2.5 text-sm">
                        <button type="button" onClick={() => setSensorDetails(r)} className="truncate text-left font-medium hover:underline">{r.parameterCode}</button>
                        <button type="button" onClick={() => setSensorDetails(r)} className="text-left tabular-nums opacity-70 hover:underline">{r.vendorSensorId || "—"}</button>
                        <div className="text-right text-base font-semibold tabular-nums">{r.value == null ? "—" : typeof r.value === "object" ? JSON.stringify(r.value) : String(r.value)}</div>
                        <div className="opacity-70">{r.unit || "—"}</div>
                      </div>
                    ))}
              </div>

              <details className="mx-5 mt-2 border-t border-slate-300 py-3 text-xs dark:border-slate-700">
                <summary className="cursor-pointer select-none font-medium">Technical information</summary>
                <div className="mt-3 grid gap-x-6 gap-y-2 pb-1 sm:grid-cols-2">
                  <div><span className="opacity-60">Hardware ID:</span> {detailsDevice.hardwareId || "—"}</div>
                  <div><span className="opacity-60">Vendor:</span> {detailsDevice.vendor || "—"}</div>
                  <div><span className="opacity-60">Model:</span> {detailsDevice.model || "—"}</div>
                  <div><span className="opacity-60">Protocol:</span> {detailsDevice.protocol || "—"}</div>
                  <div><span className="opacity-60">Transport:</span> {detailsDevice.transport || "—"}</div>
                  <div><span className="opacity-60">Firmware:</span> {detailsDevice.firmwareVersion || "—"}</div>
                  <div className="sm:col-span-2"><span className="opacity-60">Last seen:</span> {formatDateTime(detailsDevice.lastSeenAt)}</div>
                </div>
              </details>
            </div>}
          </Modal>

          <Modal open={Boolean(sensorDetails)} title="Sensor Details" onClose={() => setSensorDetails(null)} width="max-w-md">
            {sensorDetails && <div className="bg-white px-5 py-4 text-sm text-slate-950 dark:bg-slate-950 dark:text-white"><div className="border-b border-slate-300 pb-3 dark:border-slate-700"><div className="text-base font-semibold">{sensorDetails.parameterCode}</div><div className="mt-1 text-xs opacity-60">Sensor ID: {sensorDetails.vendorSensorId || "—"}</div></div><div className="space-y-2 pt-4"><div className="flex justify-between gap-6"><span className="opacity-60">Value</span><span className="font-semibold">{sensorDetails.value == null ? "—" : typeof sensorDetails.value === "object" ? JSON.stringify(sensorDetails.value) : String(sensorDetails.value)} {sensorDetails.unit || ""}</span></div><div className="flex justify-between gap-6"><span className="opacity-60">Source</span><span>{sensorDetails.dataSource || "—"}</span></div><div className="flex justify-between gap-6"><span className="opacity-60">Parameter Code</span><span>{sensorDetails.parameterCode || "—"}</span></div><div className="flex justify-between gap-6"><span className="opacity-60">Reading At</span><span className="text-right">{formatDateTime(sensorDetails.readingAt)}</span></div><div className="flex justify-between gap-6"><span className="opacity-60">Received At</span><span className="text-right">{formatDateTime(sensorDetails.receivedAt)}</span></div></div></div>}
          </Modal>

          <Modal open={Boolean(confirmStatus)} title="Change Device Status" onClose={() => !busy && setConfirmStatus(null)} width="max-w-md">
            <div className="p-5 text-center"><p className="text-sm text-slate-700">Change this device to <strong>{confirmStatus?.nextStatus}</strong>?</p>
              <div className="mt-5 flex justify-center gap-3"><button type="button" onClick={() => setConfirmStatus(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Cancel</button><button type="button" onClick={() => void changeStatus()} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white">Confirm</button></div>
            </div>
          </Modal>

          <Modal open={Boolean(confirmAsset)} title="Change Asset Assignment" onClose={() => !busy && setConfirmAsset(null)} width="max-w-md">
            <div className="p-5 text-center"><p className="text-sm text-slate-700">{confirmAsset?.assetId ? `Assign this device to asset ${assets.find((a) => a.id === confirmAsset.assetId)?.assetId || ""}?` : "Move this device to Unassigned stock?"}</p>
              <div className="mt-5 flex justify-center gap-3"><button type="button" onClick={() => setConfirmAsset(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Cancel</button><button type="button" onClick={() => void changeAsset()} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white">Confirm</button></div>
            </div>
          </Modal>
        </div>
      );
    }
