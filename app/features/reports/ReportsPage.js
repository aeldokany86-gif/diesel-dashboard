"use client";

import { useMemo, useState } from "react";
import ReportToolbar from "./components/ReportToolbar";
import { printReport } from "./utils/printReport";
import { exportReportToExcel } from "./utils/exportReportToExcel";
import { fetchStationStockMovements } from "../../services/stationsService";

const OPERATIONS_REPORTS = [
  {
    id: "operations-summary",
    title: "Operations Summary Report",
    description:
      "Detailed operational transactions report including date, project, type, source, destination, quantity, cost and status.",
    available: true,
  },
  {
    id: "station-movements",
    title: "Station Movements Report",
    description:
      "Complete station stock ledger showing opening balance, inbound, outbound, balance after each movement and closing balance.",
    available: true,
  },
  {
    id: "fuel-suppliers",
    title: "Fuel Suppliers Report",
    description:
      "Supplier-focused report showing fuel deliveries, quantities, invoices, destination stations and total supplied value.",
    available: true,
  },
];

const ASSETS_REPORTS = [
  {
    id: "assets-master",
    title: "Assets Master Report",
    description:
      "Complete asset register including asset ID, type, category, assigned project, status, current odometer, lifetime odometer and fuel tank capacity.",
    available: false,
  },
  {
    id: "asset-movements",
    title: "Asset Movement Report",
    description:
      "Complete history of asset project assignments and transfers, including source project, destination project, effective date and approval status.",
    available: false,
  },
  {
    id: "asset-utilization",
    title: "Asset Utilization Report",
    description:
      "Asset utilization analysis including lifetime odometer, fuel consumption, refueling activity and operational usage.",
    available: false,
  },
];

const REPORT_MODULES = [
  {
    id: "operations",
    title: "Operations",
    description:
      "Operational transactions, station movements and fuel supplier reports.",
    icon: "⚙️",
    reports: OPERATIONS_REPORTS,
    available: true,
  },
  {
    id: "assets",
    title: "Assets",
    description:
      "Asset register, movement history and utilization reports.",
    icon: "🚜",
    reports: ASSETS_REPORTS,
    available: true,
  },
  {
    id: "stations",
    title: "Stations",
    description:
      "Station master data, stock performance and reconciliation reports.",
    icon: "⛽",
    reports: [],
    available: false,
  },
  {
    id: "team",
    title: "Team",
    description:
      "Team members, assignments, transfers and workforce activity reports.",
    icon: "👷",
    reports: [],
    available: false,
  },
  {
    id: "projects",
    title: "Projects",
    description:
      "Project summaries, operational activity and fuel performance reports.",
    icon: "📁",
    reports: [],
    available: false,
  },
  {
    id: "users",
    title: "Users",
    description:
      "User access, roles, account activity and administration reports.",
    icon: "👤",
    reports: [],
    available: false,
  },
];

const TABLE_HEADERS = [
  "Operation No.",
  "Date",
  "Project",
  "Operation Type",
  "Source",
  "Destination",
  "Quantity",
  "Cost",
  "Status",
];

const EMPTY_FILTERS = {
  dateFrom: "",
  dateTo: "",
  project: "all",
  asset: "all",
  operationType: "all",
  status: "all",
};

function normalizeValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getHeaderIndex(headers = [], aliases = []) {
  const normalizedHeaders = headers.map(normalizeValue);

  return (
    aliases
      .map(normalizeValue)
      .map((alias) => normalizedHeaders.indexOf(alias))
      .find((index) => index !== -1) ?? -1
  );
}

function getRowValue(row = [], headers = [], aliases = []) {
  const index = getHeaderIndex(headers, aliases);
  return index === -1 ? "" : row[index];
}

function getEmbeddedOperation(row) {
  if (!row) return null;

  return (
    row.__operation ||
    row.operation ||
    row.backendOperation ||
    row._operation ||
    null
  );
}

function getNumericValue(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }

  return 0;
}

function getOperationCost(row, headers = []) {
  const embeddedOperation = getEmbeddedOperation(row);

  return getNumericValue(
    embeddedOperation?.totalCostAtOperation,
    embeddedOperation?.totalCost,
    embeddedOperation?.total_cost_at_operation,
    embeddedOperation?.costAtOperation,
    embeddedOperation?.operationCost,
    getRowValue(row, headers, [
      "totalCostAtOperation",
      "total_cost_at_operation",
      "total_cost",
      "operation_cost",
      "cost",
    ])
  );
}

function formatOperationType(value) {
  return String(value || "-")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatReportDate(value) {
  if (!value) return "All dates";

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-GB");
}

function formatNumber(value, maximumFractionDigits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(number);
}

function formatMoney(value, currency = "SAR") {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";

  return `${formatNumber(number, 2)} ${currency}`;
}

function getProjectLabel(project) {
  return (
    project?.name ||
    project?.projectName ||
    project?.code ||
    project?.projectCode ||
    project?.id ||
    "-"
  );
}

function getAssetLabel(asset) {
  return (
    asset?.assetId ||
    asset?.equipmentNo ||
    asset?.equipmentNumber ||
    asset?.name ||
    asset?.id ||
    "-"
  );
}

function getAssetFilterValue(asset) {
  return (
    asset?.backendId ||
    asset?.assetBackendId ||
    asset?.databaseId ||
    asset?.id ||
    asset?.assetId ||
    asset?.equipmentNo ||
    asset?.equipmentNumber ||
    ""
  );
}

function getAssetCandidates(asset) {
  return [
    asset?.backendId,
    asset?.assetBackendId,
    asset?.databaseId,
    asset?.id,
    asset?.assetId,
    asset?.equipmentNo,
    asset?.equipmentNumber,
    asset?.equipment_no,
    asset?.equipment_number,
    asset?.name,
  ]
    .filter(Boolean)
    .map(normalizeValue);
}

function resolveAssetLabel(value, assets = []) {
  const normalizedValue = normalizeValue(value);
  if (!normalizedValue) return "-";

  const matchedAsset = assets.find((asset) =>
    getAssetCandidates(asset).includes(normalizedValue)
  );

  return matchedAsset ? getAssetLabel(matchedAsset) : value;
}

function findEntityProject(value, entities = []) {
  const normalizedValue = normalizeValue(value);
  if (!normalizedValue) return "";

  const matchedEntity = entities.find((entity) => {
    const candidates = [
      entity?.id,
      entity?.backendId,
      entity?.assetId,
      entity?.stationId,
      entity?.equipmentNo,
      entity?.equipmentNumber,
      entity?.name,
      entity?.stationName,
    ]
      .filter(Boolean)
      .map(normalizeValue);

    return candidates.includes(normalizedValue);
  });

  return (
    matchedEntity?.projectName ||
    matchedEntity?.project ||
    matchedEntity?.projectId ||
    matchedEntity?.projectCode ||
    ""
  );
}

function resolveProjectLabel({
  source,
  destination,
  projects = [],
  assets = [],
  stations = [],
}) {
  const rawProject =
    findEntityProject(source, stations) ||
    findEntityProject(destination, stations) ||
    findEntityProject(destination, assets);

  if (!rawProject) return "-";

  const normalizedProject = normalizeValue(rawProject);
  const matchedProject = projects.find((project) =>
    [
      project?.id,
      project?.backendId,
      project?.name,
      project?.projectName,
      project?.code,
      project?.projectCode,
    ]
      .filter(Boolean)
      .map(normalizeValue)
      .includes(normalizedProject)
  );

  return matchedProject ? getProjectLabel(matchedProject) : rawProject;
}

function getUserDisplayName(user) {
  return (
    user?.fullName ||
    user?.name ||
    user?.username ||
    user?.email ||
    "Current User"
  );
}

function getActiveFilterSummary(filters) {
  return [
    {
      label: "Period",
      value:
        filters.dateFrom || filters.dateTo
          ? `${formatReportDate(filters.dateFrom)} → ${formatReportDate(
              filters.dateTo
            )}`
          : "All dates",
    },
    {
      label: "Project",
      value: filters.project === "all" ? "All Projects" : filters.project,
    },
    {
      label: "Asset",
      value: filters.asset === "all" ? "All Assets" : filters.assetLabel || filters.asset,
    },
    {
      label: "Operation Type",
      value:
        filters.operationType === "all"
          ? "All Operation Types"
          : formatOperationType(filters.operationType),
    },
    {
      label: "Status",
      value:
        filters.status === "all"
          ? "All Statuses"
          : formatOperationType(filters.status),
    },
  ];
}


const STATION_MOVEMENT_FILTERS = {
  dateFrom: "",
  dateTo: "",
  projectId: "all",
  stationId: "all",
  movementType: "all",
  direction: "all",
};

const STATION_MOVEMENT_HEADERS = [
  "Reference",
  "Date",
  "Project",
  "Station",
  "Movement Type",
  "Related Entity",
  "Inbound",
  "Outbound",
  "Balance After",
  "Reason / Notes",
  "Status",
];

function getStationBackendId(station) {
  return (
    station?.backendId ||
    station?.stationBackendId ||
    station?.databaseId ||
    station?.id ||
    ""
  );
}

function getStationLabel(station) {
  return station?.stationId || station?.name || station?.id || "-";
}

function getProjectBackendId(project) {
  return (
    project?.backendId ||
    project?.projectBackendId ||
    project?.databaseId ||
    project?.id ||
    ""
  );
}

function formatMovementType(value) {
  return formatOperationType(value);
}

function getMovementReference(movement) {
  return (
    movement?.operation?.operationNo ||
    movement?.referenceNo ||
    movement?.referenceId ||
    movement?.id ||
    "-"
  );
}

function getMovementRelatedEntity(movement) {
  const operation = movement?.operation;

  if (operation) {
    const type = normalizeValue(movement?.movementType);

    if (type.includes("direct_refuel")) {
      return operation?.asset?.assetId || operation?.asset?.id || "Asset";
    }

    if (type.includes("transfer_out")) {
      return (
        operation?.destinationStation?.stationId ||
        operation?.destinationStation?.name ||
        "Destination Station"
      );
    }

    if (type.includes("transfer_in")) {
      return (
        operation?.sourceStation?.stationId ||
        operation?.sourceStation?.name ||
        "Source Station"
      );
    }

    if (type.includes("external_supply")) {
      return operation?.invoiceNumber
        ? `Invoice ${operation.invoiceNumber}`
        : "External Supplier";
    }
  }

  if (movement?.referenceType === "STATION_CREATE") return "Station Creation";
  if (movement?.referenceType === "PHYSICAL_STOCK_COUNT") return "Physical Stock Count";
  if (movement?.referenceType === "ZERO_BALANCE") return "Balance Reconciliation";

  return movement?.referenceType || "-";
}

function getMovementStatus(movement) {
  return movement?.operation?.status || movement?.referenceStatus || "COMPLETED";
}


const FUEL_SUPPLIER_FILTERS = {
  dateFrom: "",
  dateTo: "",
  project: "all",
  supplier: "all",
  station: "all",
  status: "all",
};

const FUEL_SUPPLIER_HEADERS = [
  "Operation No.",
  "Date",
  "Supplier",
  "Invoice No.",
  "Project",
  "Destination Station",
  "Quantity (L)",
  "Unit Price",
  "Total Cost",
  "Created By",
  "Status",
];

function getOperationField(row, headers, embeddedAliases = [], rowAliases = []) {
  const embeddedOperation = getEmbeddedOperation(row);

  for (const alias of embeddedAliases) {
    const value = embeddedOperation?.[alias];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return getRowValue(row, headers, rowAliases);
}

function FuelSuppliersReport({
  selectedReport,
  currentUser,
  currentCompany,
  projects = [],
  stations = [],
  data = [],
  headers = [],
  currency = "SAR",
  onBack,
}) {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [draftFilters, setDraftFilters] = useState(FUEL_SUPPLIER_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(FUEL_SUPPLIER_FILTERS);

  const supplyRows = useMemo(() => {
    return (data || [])
      .map((row, index) => {
        const embeddedOperation = getEmbeddedOperation(row);
        const operationType = getOperationField(
          row,
          headers,
          ["transactionType", "operationType", "type"],
          ["transaction_type", "operation_type", "type"]
        );

        if (normalizeValue(operationType).replaceAll(" ", "_") !== "external_supply") {
          return null;
        }

        const operationNo = getOperationField(
          row,
          headers,
          ["operationNo", "operationNumber", "referenceNo"],
          ["operation_id", "operation no", "operation_no", "reference_no"]
        );
        const transactionDate = getOperationField(
          row,
          headers,
          ["transactionDateTime", "transactionDate", "operationDate", "createdAt"],
          ["transaction_datetime", "transaction date", "operation_date", "date", "created_at"]
        );
        const supplier = getOperationField(
          row,
          headers,
          ["supplierName", "supplier", "vendorName", "externalSupplierName", "externalStationName"],
          ["supplier_name", "supplier", "vendor_name", "external_supplier_name", "external_station_name"]
        ) || "Unspecified Supplier";
        const invoiceNumber = getOperationField(
          row,
          headers,
          ["invoiceNumber", "invoiceNo", "supplierInvoiceNumber"],
          ["invoice_number", "invoice_no", "supplier_invoice_number"]
        );
        const destination = getOperationField(
          row,
          headers,
          ["destinationStationId", "destinationId", "destinationStationCode"],
          ["destination_station", "destination_station_id", "destination_id", "destination"]
        );
        const destinationLabel =
          embeddedOperation?.destinationStation?.stationId ||
          embeddedOperation?.destinationStation?.name ||
          destination ||
          "-";
        const quantity = getNumericValue(
          embeddedOperation?.dieselQuantity,
          embeddedOperation?.quantity,
          embeddedOperation?.fuelQuantity,
          getRowValue(row, headers, ["diesel_quantity", "quantity", "fuel_quantity"])
        );
        const totalCost = getOperationCost(row, headers);
        const explicitUnitPrice = getNumericValue(
          embeddedOperation?.unitPrice,
          embeddedOperation?.pricePerLiter,
          embeddedOperation?.literPrice,
          getRowValue(row, headers, ["unit_price", "price_per_liter", "liter_price"])
        );
        const unitPrice = explicitUnitPrice || (quantity > 0 ? totalCost / quantity : 0);
        const status = getOperationField(
          row,
          headers,
          ["status", "operationStatus"],
          ["operation_status", "status"]
        ) || "COMPLETED";
        const createdBy =
          embeddedOperation?.createdBy?.fullName ||
          embeddedOperation?.createdBy?.name ||
          embeddedOperation?.createdBy?.email ||
          getOperationField(
            row,
            headers,
            ["createdByName", "createdByUserName"],
            ["created_by", "created_by_name", "created_by_user"]
          ) ||
          "-";
        const project =
          embeddedOperation?.destinationStation?.project?.name ||
          embeddedOperation?.project?.name ||
          resolveProjectLabel({
            source: "",
            destination: destinationLabel,
            projects,
            assets: [],
            stations,
          });

        return {
          key: `${operationNo || "supply"}-${index}`,
          operationNo: operationNo || "-",
          transactionDate,
          supplier: String(supplier).trim() || "Unspecified Supplier",
          invoiceNumber: invoiceNumber || "-",
          project,
          destination: destinationLabel,
          quantity,
          unitPrice,
          totalCost,
          createdBy,
          status,
        };
      })
      .filter(Boolean);
  }, [data, headers, projects, stations]);

  const supplierOptions = useMemo(
    () => [...new Set(supplyRows.map((row) => row.supplier).filter(Boolean))].sort(),
    [supplyRows]
  );

  const stationOptions = useMemo(() => {
    const filtered =
      draftFilters.project === "all"
        ? supplyRows
        : supplyRows.filter(
            (row) => normalizeValue(row.project) === normalizeValue(draftFilters.project)
          );
    return [...new Set(filtered.map((row) => row.destination).filter(Boolean))].sort();
  }, [supplyRows, draftFilters.project]);

  const filteredRows = useMemo(() => {
    return supplyRows.filter((row) => {
      const rowDate = row.transactionDate ? new Date(row.transactionDate) : null;
      if (
        appliedFilters.dateFrom &&
        (!rowDate || rowDate < new Date(`${appliedFilters.dateFrom}T00:00:00`))
      ) return false;
      if (
        appliedFilters.dateTo &&
        (!rowDate || rowDate > new Date(`${appliedFilters.dateTo}T23:59:59`))
      ) return false;
      if (
        appliedFilters.project !== "all" &&
        normalizeValue(row.project) !== normalizeValue(appliedFilters.project)
      ) return false;
      if (
        appliedFilters.supplier !== "all" &&
        normalizeValue(row.supplier) !== normalizeValue(appliedFilters.supplier)
      ) return false;
      if (
        appliedFilters.station !== "all" &&
        normalizeValue(row.destination) !== normalizeValue(appliedFilters.station)
      ) return false;
      if (
        appliedFilters.status !== "all" &&
        normalizeValue(row.status) !== normalizeValue(appliedFilters.status)
      ) return false;
      return true;
    });
  }, [supplyRows, appliedFilters]);

  const totals = useMemo(() => ({
    deliveries: filteredRows.length,
    suppliers: new Set(filteredRows.map((row) => normalizeValue(row.supplier))).size,
    quantity: filteredRows.reduce((sum, row) => sum + row.quantity, 0),
    cost: filteredRows.reduce((sum, row) => sum + row.totalCost, 0),
  }), [filteredRows]);

  const supplierSummary = useMemo(() => {
    const groups = new Map();
    filteredRows.forEach((row) => {
      const key = normalizeValue(row.supplier) || "unspecified";
      const current = groups.get(key) || {
        supplier: row.supplier,
        deliveries: 0,
        quantity: 0,
        cost: 0,
      };
      current.deliveries += 1;
      current.quantity += row.quantity;
      current.cost += row.totalCost;
      groups.set(key, current);
    });
    return [...groups.values()].sort((a, b) => b.quantity - a.quantity);
  }, [filteredRows]);

  const filterSummary = useMemo(() => [
    {
      label: "Period",
      value:
        appliedFilters.dateFrom || appliedFilters.dateTo
          ? `${formatReportDate(appliedFilters.dateFrom)} → ${formatReportDate(appliedFilters.dateTo)}`
          : "All dates",
    },
    { label: "Project", value: appliedFilters.project === "all" ? "All Projects" : appliedFilters.project },
    { label: "Supplier", value: appliedFilters.supplier === "all" ? "All Suppliers" : appliedFilters.supplier },
    { label: "Station", value: appliedFilters.station === "all" ? "All Stations" : appliedFilters.station },
    { label: "Status", value: appliedFilters.status === "all" ? "All Statuses" : formatOperationType(appliedFilters.status) },
  ], [appliedFilters]);

  const reportMeta = {
    title: selectedReport?.title || "Fuel Suppliers Report",
    companyName: currentCompany?.name || "Fleet Fuel PRO",
    generatedBy: getUserDisplayName(currentUser),
    generatedAt: new Date().toLocaleString("en-GB"),
    filters: filterSummary,
  };

  const handlePrint = () => {
    printReport({
      ...reportMeta,
      totals: [
        { label: "Suppliers", value: totals.suppliers },
        { label: "Deliveries", value: totals.deliveries },
        { label: "Total Quantity", value: `${formatNumber(totals.quantity)} L` },
        { label: "Total Value", value: formatMoney(totals.cost, currency) },
      ],
      columns: FUEL_SUPPLIER_HEADERS,
      rows: filteredRows.map((row) => [
        row.operationNo,
        formatDateTime(row.transactionDate),
        row.supplier,
        row.invoiceNumber,
        row.project,
        row.destination,
        formatNumber(row.quantity),
        formatMoney(row.unitPrice, currency),
        formatMoney(row.totalCost, currency),
        row.createdBy,
        formatOperationType(row.status),
      ]),
      footerRow: [
        "Grand Total", "", "", "", "", "",
        formatNumber(totals.quantity), "", formatMoney(totals.cost, currency), "",
        `${totals.deliveries} deliveries`,
      ],
    });
  };

  const handleExport = () => {
    exportReportToExcel({
      fileName: "Fuel_Suppliers_Report",
      sheetName: "Fuel Suppliers",
      ...reportMeta,
      rows: filteredRows.map((row) => ({
        "Operation No.": row.operationNo,
        Date: formatDateTime(row.transactionDate),
        Supplier: row.supplier,
        "Invoice No.": row.invoiceNumber,
        Project: row.project,
        "Destination Station": row.destination,
        "Quantity (L)": row.quantity,
        [`Unit Price (${currency})`]: row.unitPrice,
        [`Total Cost (${currency})`]: row.totalCost,
        "Created By": row.createdBy,
        Status: formatOperationType(row.status),
      })),
      totals: {
        "Operation No.": "Grand Total",
        "Quantity (L)": totals.quantity,
        [`Total Cost (${currency})`]: totals.cost,
        Status: `${totals.deliveries} deliveries / ${totals.suppliers} suppliers`,
      },
    });
  };

  const handleFilterChange = (field, value) => {
    setDraftFilters((previous) => {
      const next = { ...previous, [field]: value };
      if (field === "project") next.station = "all";
      return next;
    });
  };

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setReportGenerated(true);
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    setDraftFilters(FUEL_SUPPLIER_FILTERS);
    setAppliedFilters(FUEL_SUPPLIER_FILTERS);
  };

  return (
    <div className="min-h-full bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1800px] space-y-5">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm font-bold text-slate-300 transition hover:border-amber-500/50 hover:text-amber-300">
                <span aria-hidden="true">←</span> Back to Reports
              </button>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400">Operations Reports</p>
              <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">{selectedReport?.title}</h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">{selectedReport?.description}</p>
              <p className="mt-2 text-xs font-extrabold text-amber-300">All quantities are shown in Liters (L).</p>
            </div>
            <ReportToolbar onOpenFilters={() => setFiltersOpen(true)} onPrint={handlePrint} onExport={handleExport} disabled={!reportGenerated || !filteredRows.length} />
          </div>
        </section>

        {!reportGenerated ? (
          <section className="rounded-2xl border border-amber-500/30 bg-slate-900/80 px-6 py-14 text-center shadow-xl shadow-black/10">
            <div className="mx-auto flex max-w-xl flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-3xl">🚚</div>
              <h2 className="mt-5 text-xl font-black text-white sm:text-2xl">Select supplier report filters first</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">Choose the period, project, supplier, destination station and status, then generate the report.</p>
              <button type="button" onClick={() => setFiltersOpen(true)} className="mt-6 rounded-xl border border-amber-500 bg-amber-500 px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-amber-400">Set Report Filters</button>
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {filterSummary.map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{item.label}</p>
                  <p className="mt-1 truncate text-sm font-extrabold text-slate-200">{item.value}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Suppliers", totals.suppliers],
                ["Deliveries", totals.deliveries],
                ["Total Quantity (L)", formatNumber(totals.quantity)],
                ["Total Supply Value", formatMoney(totals.cost, currency)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-amber-500/25 bg-slate-900/80 p-4 shadow-lg shadow-black/10">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-400">{label}</p>
                  <p className="mt-2 text-2xl font-black text-white">{value}</p>
                </div>
              ))}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/10">
              <div className="border-b border-slate-800 px-5 py-4">
                <h2 className="font-extrabold text-white">Supplier Summary</h2>
                <p className="mt-1 text-xs text-slate-500">Totals grouped by fuel supplier.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full border-collapse text-sm">
                  <thead className="bg-slate-950/90"><tr>{["Supplier", "Deliveries", "Total Quantity (L)", `Total Value (${currency})`].map((header) => <th key={header} className="border-b border-slate-800 px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">{header}</th>)}</tr></thead>
                  <tbody>
                    {supplierSummary.length ? supplierSummary.map((item) => (
                      <tr key={item.supplier} className="border-b border-slate-800/70 hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-extrabold text-amber-300">{item.supplier}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-200">{item.deliveries}</td>
                        <td className="px-4 py-3 text-right font-extrabold text-white">{formatNumber(item.quantity)}</td>
                        <td className="px-4 py-3 text-right font-extrabold text-emerald-300">{formatMoney(item.cost, currency)}</td>
                      </tr>
                    )) : <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-500">No supplier deliveries match the selected filters.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/10">
              <div className="flex flex-col gap-2 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div><h2 className="font-extrabold text-white">Fuel Delivery Details</h2><p className="mt-1 text-xs text-slate-500">{filteredRows.length} delivery record{filteredRows.length === 1 ? "" : "s"} found</p></div>
                <p className="text-xs font-bold text-amber-300">External Supply operations only</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[1750px] w-full border-collapse text-sm">
                  <thead className="bg-slate-950/90"><tr>{FUEL_SUPPLIER_HEADERS.map((header) => <th key={header} className="whitespace-nowrap border-b border-slate-800 px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">{header}</th>)}</tr></thead>
                  <tbody>
                    {filteredRows.length ? filteredRows.map((row) => (
                      <tr key={row.key} className="border-b border-slate-800/70 transition hover:bg-slate-800/30">
                        <td className="whitespace-nowrap px-3 py-3 font-bold text-amber-300">{row.operationNo}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-300">{formatDateTime(row.transactionDate)}</td>
                        <td className="whitespace-nowrap px-3 py-3 font-extrabold text-white">{row.supplier}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-300">{row.invoiceNumber}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-300">{row.project}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-300">{row.destination}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-extrabold text-white">{formatNumber(row.quantity)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right text-slate-300">{formatMoney(row.unitPrice, currency)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-extrabold text-emerald-300">{formatMoney(row.totalCost, currency)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-300">{row.createdBy}</td>
                        <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-300">{formatOperationType(row.status)}</td>
                      </tr>
                    )) : <tr><td colSpan={FUEL_SUPPLIER_HEADERS.length} className="px-6 py-12 text-center text-slate-500">No fuel supplier deliveries match the selected filters.</td></tr>}
                  </tbody>
                  <tfoot className="bg-slate-950/80"><tr className="font-black text-white"><td className="px-3 py-3" colSpan={6}>Grand Total</td><td className="px-3 py-3 text-right">{formatNumber(totals.quantity)}</td><td /><td className="px-3 py-3 text-right text-emerald-300">{formatMoney(totals.cost, currency)}</td><td /><td className="px-3 py-3 text-xs text-slate-400">{totals.deliveries} deliveries</td></tr></tfoot>
                </table>
              </div>
            </section>
          </>
        )}

        {filtersOpen ? (
          <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm">
            <button type="button" aria-label="Close filters" onClick={() => reportGenerated && setFiltersOpen(false)} className="absolute inset-0 h-full w-full" />
            <aside className="absolute right-0 top-0 z-10 flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-900 shadow-2xl shadow-black/50">
              <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
                <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Report Setup</p><h2 className="mt-1 text-xl font-black text-white">Fuel Supplier Filters</h2></div>
                {reportGenerated ? <button type="button" onClick={() => setFiltersOpen(false)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-bold text-slate-400 hover:text-white">Close</button> : null}
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">Date From</span><input type="date" value={draftFilters.dateFrom} onChange={(e) => handleFilterChange("dateFrom", e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500" /></label>
                  <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">Date To</span><input type="date" value={draftFilters.dateTo} onChange={(e) => handleFilterChange("dateTo", e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500" /></label>
                </div>
                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">Project</span><select value={draftFilters.project} onChange={(e) => handleFilterChange("project", e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"><option value="all">All Projects</option>{projects.map((project) => <option key={project.id || getProjectLabel(project)} value={getProjectLabel(project)}>{getProjectLabel(project)}</option>)}</select></label>
                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">Supplier</span><select value={draftFilters.supplier} onChange={(e) => handleFilterChange("supplier", e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"><option value="all">All Suppliers</option>{supplierOptions.map((supplier) => <option key={supplier} value={supplier}>{supplier}</option>)}</select></label>
                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">Destination Station</span><select value={draftFilters.station} onChange={(e) => handleFilterChange("station", e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"><option value="all">All Stations</option>{stationOptions.map((station) => <option key={station} value={station}>{station}</option>)}</select></label>
                <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">Status</span><select value={draftFilters.status} onChange={(e) => handleFilterChange("status", e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"><option value="all">All Statuses</option><option value="COMPLETED">Completed</option><option value="APPROVED">Approved</option><option value="PENDING">Pending</option><option value="PARTIALLY_APPROVED">Partially Approved</option><option value="REJECTED">Rejected</option></select></label>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-slate-800 px-5 py-4">
                <button type="button" onClick={resetFilters} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-slate-300 hover:border-slate-500 hover:text-white">Reset</button>
                <button type="button" onClick={applyFilters} className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-amber-400">{reportGenerated ? "Update Report" : "Generate Report"}</button>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StationMovementsReport({
  selectedReport,
  currentUser,
  currentCompany,
  projects = [],
  stations = [],
  onBack,
}) {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [draftFilters, setDraftFilters] = useState(STATION_MOVEMENT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(STATION_MOVEMENT_FILTERS);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedProjectId =
    draftFilters.projectId === "all" ? "" : draftFilters.projectId;

  const availableStations = useMemo(() => {
    if (!selectedProjectId) return stations;

    return stations.filter((station) => {
      const stationProject =
        station?.projectId ||
        station?.projectBackendId ||
        station?.project?.id ||
        station?.project ||
        "";

      return normalizeValue(stationProject) === normalizeValue(selectedProjectId);
    });
  }, [stations, selectedProjectId]);

  const rows = useMemo(
    () =>
      (movements || []).map((movement) => {
        const quantity = Number(movement?.quantity || 0);

        return {
          ...movement,
          key: movement?.id,
          reference: getMovementReference(movement),
          project:
            movement?.station?.project?.name ||
            movement?.station?.project?.code ||
            movement?.project?.name ||
            "-",
          station:
            movement?.station?.stationId ||
            movement?.station?.name ||
            movement?.stationId ||
            "-",
          relatedEntity: getMovementRelatedEntity(movement),
          inbound: quantity > 0 ? quantity : 0,
          outbound: quantity < 0 ? Math.abs(quantity) : 0,
          status: getMovementStatus(movement),
        };
      }),
    [movements]
  );

  const totals = useMemo(() => {
    if (!rows.length) {
      return { opening: 0, inbound: 0, outbound: 0, closing: 0 };
    }

    const stationGroups = new Map();

    rows.forEach((row) => {
      const key = row.stationId || row.station || "unknown-station";
      const group = stationGroups.get(key) || [];
      group.push(row);
      stationGroups.set(key, group);
    });

    let opening = 0;
    let closing = 0;

    stationGroups.forEach((group) => {
      const ordered = [...group].sort(
        (a, b) =>
          new Date(a.movementAt || a.createdAt).getTime() -
          new Date(b.movementAt || b.createdAt).getTime()
      );

      opening += getNumericValue(ordered[0]?.balanceBefore);
      closing += getNumericValue(ordered[ordered.length - 1]?.balanceAfter);
    });

    return {
      opening,
      inbound: rows.reduce((sum, row) => sum + row.inbound, 0),
      outbound: rows.reduce((sum, row) => sum + row.outbound, 0),
      closing,
    };
  }, [rows]);

  const filterSummary = useMemo(() => {
    const selectedProject = projects.find(
      (project) =>
        normalizeValue(getProjectBackendId(project)) ===
        normalizeValue(appliedFilters.projectId)
    );

    const selectedStation = stations.find(
      (station) =>
        normalizeValue(getStationBackendId(station)) ===
        normalizeValue(appliedFilters.stationId)
    );

    return [
      {
        label: "Period",
        value:
          appliedFilters.dateFrom || appliedFilters.dateTo
            ? `${formatReportDate(appliedFilters.dateFrom)} → ${formatReportDate(
                appliedFilters.dateTo
              )}`
            : "All dates",
      },
      {
        label: "Project",
        value:
          appliedFilters.projectId === "all"
            ? "All Projects"
            : getProjectLabel(selectedProject),
      },
      {
        label: "Station",
        value:
          appliedFilters.stationId === "all"
            ? "All Stations"
            : getStationLabel(selectedStation),
      },
      {
        label: "Movement Type",
        value:
          appliedFilters.movementType === "all"
            ? "All Movement Types"
            : formatMovementType(appliedFilters.movementType),
      },
      {
        label: "Direction",
        value:
          appliedFilters.direction === "all"
            ? "Inbound & Outbound"
            : formatMovementType(appliedFilters.direction),
      },
    ];
  }, [appliedFilters, projects, stations]);

  const reportMeta = {
    title: selectedReport?.title || "Station Movements Report",
    companyName: currentCompany?.name || "Fleet Fuel PRO",
    generatedBy: getUserDisplayName(currentUser),
    generatedAt: new Date().toLocaleString("en-GB"),
    filters: filterSummary,
  };

  const loadReport = async () => {
    setLoading(true);
    setError("");

    try {
      const companyId =
        currentCompany?.backendId ||
        currentCompany?.companyBackendId ||
        currentCompany?.id ||
        currentUser?.companyId ||
        "";

      const result = await fetchStationStockMovements({
        companyId,
        projectId:
          draftFilters.projectId === "all" ? "" : draftFilters.projectId,
        stationId:
          draftFilters.stationId === "all" ? "" : draftFilters.stationId,
        dateFrom: draftFilters.dateFrom,
        dateTo: draftFilters.dateTo,
        movementType: draftFilters.movementType,
        direction: draftFilters.direction,
      });

      setAppliedFilters(draftFilters);
      setMovements(Array.isArray(result) ? result : []);
      setReportGenerated(true);
      setFiltersOpen(false);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Failed to load station movements."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    printReport({
      ...reportMeta,
      totals: [
        { label: "Opening Balance (L)", value: formatNumber(totals.opening) },
        { label: "Total Inbound (L)", value: formatNumber(totals.inbound) },
        { label: "Total Outbound (L)", value: formatNumber(totals.outbound) },
        { label: "Closing Balance (L)", value: formatNumber(totals.closing) },
      ],
      columns: STATION_MOVEMENT_HEADERS,
      rows: rows.map((row) => [
        row.reference,
        formatDateTime(row.movementAt || row.createdAt),
        row.project,
        row.station,
        formatMovementType(row.movementType),
        row.relatedEntity,
        row.inbound ? formatNumber(row.inbound) : "-",
        row.outbound ? formatNumber(row.outbound) : "-",
        formatNumber(row.balanceAfter),
        row.reason || "-",
        formatMovementType(row.status),
      ]),
      footerRow: [
        "Totals",
        "",
        "",
        "",
        "",
        "",
        formatNumber(totals.inbound),
        formatNumber(totals.outbound),
        formatNumber(totals.closing),
        "",
        "",
      ],
    });
  };

  const handleExport = () => {
    exportReportToExcel({
      fileName: "Station_Movements_Report",
      sheetName: "Station Movements",
      ...reportMeta,
      rows: rows.map((row) => ({
        Reference: row.reference,
        Date: formatDateTime(row.movementAt || row.createdAt),
        Project: row.project,
        Station: row.station,
        "Movement Type": formatMovementType(row.movementType),
        "Related Entity": row.relatedEntity,
        "Inbound (L)": row.inbound || "",
        "Outbound (L)": row.outbound || "",
        "Balance After (L)": row.balanceAfter,
        "Reason / Notes": row.reason || "",
        Status: formatMovementType(row.status),
      })),
      totals: {
        Reference: "Totals",
        "Inbound (L)": totals.inbound,
        "Outbound (L)": totals.outbound,
        "Balance After (L)": totals.closing,
      },
    });
  };

  const handleFilterChange = (field, value) => {
    setDraftFilters((previous) => {
      const next = { ...previous, [field]: value };

      if (field === "projectId") {
        next.stationId = "all";
      }

      return next;
    });
  };

  const handleReset = () => {
    setDraftFilters(STATION_MOVEMENT_FILTERS);
    setAppliedFilters(STATION_MOVEMENT_FILTERS);
  };

  return (
    <div className="min-h-full bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1800px] space-y-5">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <button
                type="button"
                onClick={onBack}
                className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm font-bold text-slate-300 transition hover:border-amber-500/50 hover:text-amber-300"
              >
                <span aria-hidden="true">←</span>
                Back to Reports
              </button>

              <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400">
                Operations Reports
              </p>

              <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                {selectedReport?.title}
              </h1>

              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
                {selectedReport?.description}
              </p>

              <p className="mt-2 text-xs font-extrabold text-amber-300">
                All quantities are shown in Liters (L).
              </p>
            </div>

            <ReportToolbar
              onOpenFilters={() => setFiltersOpen(true)}
              onPrint={handlePrint}
              onExport={handleExport}
              disabled={!reportGenerated || !rows.length}
            />
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-200">
            {error}
          </section>
        ) : null}

        {!reportGenerated ? (
          <section className="rounded-2xl border border-amber-500/30 bg-slate-900/80 px-6 py-14 text-center shadow-xl shadow-black/10">
            <div className="mx-auto flex max-w-xl flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-3xl">
                ⛽
              </div>
              <h2 className="mt-5 text-xl font-black text-white sm:text-2xl">
                Select station movement filters first
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Choose the date range, project, station, movement type and
                direction, then generate the station stock ledger.
              </p>
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="mt-6 rounded-xl border border-amber-500 bg-amber-500 px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-amber-400"
              >
                Set Report Filters
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {filterSummary.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-slate-200">
                    {item.value}
                  </p>
                </div>
              ))}
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Opening Balance (L)", totals.opening],
                ["Total Inbound (L)", totals.inbound],
                ["Total Outbound (L)", totals.outbound],
                ["Closing Balance (L)", totals.closing],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-amber-500/25 bg-slate-900/80 p-4 shadow-lg shadow-black/10"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {formatNumber(value)}
                  </p>
                </div>
              ))}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/10">
              <div className="flex flex-col gap-2 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-extrabold text-white">Station Stock Ledger</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {rows.length} movement{rows.length === 1 ? "" : "s"} found
                  </p>
                </div>
                <p className="text-xs font-bold text-amber-300">
                  All quantities are shown in Liters (L)
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1550px] w-full border-collapse text-sm">
                  <thead className="bg-slate-950/90">
                    <tr>
                      {STATION_MOVEMENT_HEADERS.map((header) => (
                        <th
                          key={header}
                          className="border-b border-slate-800 px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-400"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length ? (
                      rows.map((row) => (
                        <tr
                          key={row.key}
                          className="border-b border-slate-800/70 transition hover:bg-slate-800/30"
                        >
                          <td className="px-3 py-3 font-bold text-amber-300">{row.reference}</td>
                          <td className="px-3 py-3 text-slate-300">{formatDateTime(row.movementAt || row.createdAt)}</td>
                          <td className="px-3 py-3 text-slate-300">{row.project}</td>
                          <td className="px-3 py-3 font-bold text-white">{row.station}</td>
                          <td className="px-3 py-3 text-slate-300">{formatMovementType(row.movementType)}</td>
                          <td className="px-3 py-3 text-slate-300">{row.relatedEntity}</td>
                          <td className="px-3 py-3 text-right font-extrabold text-emerald-300">{row.inbound ? formatNumber(row.inbound) : "-"}</td>
                          <td className="px-3 py-3 text-right font-extrabold text-red-300">{row.outbound ? formatNumber(row.outbound) : "-"}</td>
                          <td className="px-3 py-3 text-right font-black text-amber-300">{formatNumber(row.balanceAfter)}</td>
                          <td className="max-w-[260px] px-3 py-3 text-slate-400">{row.reason || "-"}</td>
                          <td className="px-3 py-3 font-bold text-slate-300">{formatMovementType(row.status)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={STATION_MOVEMENT_HEADERS.length} className="px-6 py-12 text-center text-slate-500">
                          No station movements match the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-950/80">
                    <tr className="font-black text-white">
                      <td className="px-3 py-3" colSpan={6}>Totals</td>
                      <td className="px-3 py-3 text-right text-emerald-300">{formatNumber(totals.inbound)}</td>
                      <td className="px-3 py-3 text-right text-red-300">{formatNumber(totals.outbound)}</td>
                      <td className="px-3 py-3 text-right text-amber-300">{formatNumber(totals.closing)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          </>
        )}

        {filtersOpen ? (
          <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm">
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => reportGenerated && setFiltersOpen(false)}
              className="absolute inset-0 h-full w-full"
            />

            <aside className="absolute right-0 top-0 z-10 flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-900 shadow-2xl shadow-black/50">
              <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                    Report Setup
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white">
                    Station Movement Filters
                  </h2>
                </div>
                {reportGenerated ? (
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-bold text-slate-400 hover:text-white"
                  >
                    Close
                  </button>
                ) : null}
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-300">Date From</span>
                    <input type="date" value={draftFilters.dateFrom} onChange={(event) => handleFilterChange("dateFrom", event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-500" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-300">Date To</span>
                    <input type="date" value={draftFilters.dateTo} onChange={(event) => handleFilterChange("dateTo", event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-500" />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">Project</span>
                  <select value={draftFilters.projectId} onChange={(event) => handleFilterChange("projectId", event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-500">
                    <option value="all">All Projects</option>
                    {projects.map((project) => (
                      <option key={getProjectBackendId(project) || getProjectLabel(project)} value={getProjectBackendId(project)}>
                        {getProjectLabel(project)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">Station</span>
                  <select value={draftFilters.stationId} onChange={(event) => handleFilterChange("stationId", event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-500">
                    <option value="all">All Stations</option>
                    {availableStations.map((station) => (
                      <option key={getStationBackendId(station) || getStationLabel(station)} value={getStationBackendId(station)}>
                        {getStationLabel(station)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">Movement Type</span>
                  <select value={draftFilters.movementType} onChange={(event) => handleFilterChange("movementType", event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-500">
                    <option value="all">All Movement Types</option>
                    <option value="OPENING_BALANCE">Opening Balance</option>
                    <option value="DIRECT_REFUEL_OUT">Direct Refuel Outbound</option>
                    <option value="INTERNAL_TRANSFER_IN">Internal Transfer Inbound</option>
                    <option value="INTERNAL_TRANSFER_OUT">Internal Transfer Outbound</option>
                    <option value="EXTERNAL_SUPPLY_IN">External Supply Inbound</option>
                    <option value="EXTERNAL_TRANSFER_IN">External Transfer Inbound</option>
                    <option value="EXTERNAL_TRANSFER_OUT">External Transfer Outbound</option>
                    <option value="PHYSICAL_ADJUSTMENT">Physical Adjustment</option>
                    <option value="ZERO_BALANCE">Zero Balance</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">Direction</span>
                  <select value={draftFilters.direction} onChange={(event) => handleFilterChange("direction", event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-500">
                    <option value="all">Inbound & Outbound</option>
                    <option value="inbound">Inbound</option>
                    <option value="outbound">Outbound</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-800 px-5 py-4">
                <button type="button" onClick={handleReset} disabled={loading} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-slate-300 transition hover:border-slate-500 hover:text-white disabled:opacity-50">
                  Reset
                </button>
                <button type="button" onClick={loadReport} disabled={loading} className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 transition hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60">
                  {loading ? "Generating..." : reportGenerated ? "Update Report" : "Generate Report"}
                </button>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ReportsPage({
  currentUser,
  currentCompany,
  projects = [],
  assets = [],
  stations = [],
  data = [],
  headers = [],
  currency = "SAR",
}) {
  const [selectedReportModule, setSelectedReportModule] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

  const availableAssets = useMemo(() => {
    if (draftFilters.project === "all") return assets;

    return assets.filter((asset) => {
      const assetProject =
        asset?.projectName ||
        asset?.project ||
        asset?.projectId ||
        asset?.projectCode ||
        "";

      return normalizeValue(assetProject) === normalizeValue(draftFilters.project);
    });
  }, [assets, draftFilters.project]);

  const reportRows = useMemo(() => {
    return (data || []).map((row, index) => {
      const operationNo = getRowValue(row, headers, [
        "operation_id",
        "operation no",
        "operation_no",
      ]);
      const transactionDate = getRowValue(row, headers, [
        "transaction_datetime",
        "transaction date",
        "date",
      ]);
      const operationType = getRowValue(row, headers, [
        "transaction_type",
        "operation_type",
      ]);
      const source = getRowValue(row, headers, [
        "source_station",
        "source",
      ]);
      const destination = getRowValue(row, headers, [
        "destination_id",
        "destination",
      ]);
      const quantity = getRowValue(row, headers, [
        "diesel_quantity",
        "quantity",
      ]);
      const status = getRowValue(row, headers, [
        "operation_status",
        "status",
      ]);
      const externalStation = getRowValue(row, headers, [
        "external_station_name",
      ]);

      const project = resolveProjectLabel({
        source,
        destination,
        projects,
        assets,
        stations,
      });

      return {
        key: `${operationNo || "operation"}-${index}`,
        operationNo: operationNo || "-",
        transactionDate,
        operationType,
        source: source || externalStation || "-",
        destination: destination || "-",
        destinationRaw: destination || "",
        asset: resolveAssetLabel(destination, assets),
        quantity: getNumericValue(quantity),
        cost: getOperationCost(row, headers),
        status: status || "COMPLETED",
        project,
      };
    });
  }, [data, headers, projects, assets, stations]);

  const filteredRows = useMemo(() => {
    return reportRows.filter((row) => {
      const rowDate = row.transactionDate
        ? new Date(row.transactionDate)
        : null;

      if (
        appliedFilters.dateFrom &&
        (!rowDate || rowDate < new Date(`${appliedFilters.dateFrom}T00:00:00`))
      ) {
        return false;
      }

      if (
        appliedFilters.dateTo &&
        (!rowDate || rowDate > new Date(`${appliedFilters.dateTo}T23:59:59`))
      ) {
        return false;
      }

      if (
        appliedFilters.project !== "all" &&
        normalizeValue(row.project) !== normalizeValue(appliedFilters.project)
      ) {
        return false;
      }

      if (appliedFilters.asset !== "all") {
        const selectedAsset = assets.find(
          (asset) =>
            normalizeValue(getAssetFilterValue(asset)) ===
            normalizeValue(appliedFilters.asset)
        );

        if (
          !selectedAsset ||
          !getAssetCandidates(selectedAsset).includes(
            normalizeValue(row.destinationRaw)
          )
        ) {
          return false;
        }
      }

      if (
        appliedFilters.operationType !== "all" &&
        normalizeValue(row.operationType) !==
          normalizeValue(appliedFilters.operationType)
      ) {
        return false;
      }

      if (
        appliedFilters.status !== "all" &&
        normalizeValue(row.status) !== normalizeValue(appliedFilters.status)
      ) {
        return false;
      }

      return true;
    });
  }, [reportRows, appliedFilters, assets]);

  const totals = useMemo(
    () =>
      filteredRows.reduce(
        (summary, row) => ({
          operations: summary.operations + 1,
          quantity: summary.quantity + getNumericValue(row.quantity),
          cost: summary.cost + getNumericValue(row.cost),
        }),
        { operations: 0, quantity: 0, cost: 0 }
      ),
    [filteredRows]
  );

  const filterSummary = useMemo(() => {
    const selectedAsset = assets.find(
      (asset) =>
        normalizeValue(getAssetFilterValue(asset)) ===
        normalizeValue(appliedFilters.asset)
    );

    return getActiveFilterSummary({
      ...appliedFilters,
      assetLabel:
        appliedFilters.asset === "all"
          ? "All Assets"
          : getAssetLabel(selectedAsset),
    });
  }, [appliedFilters, assets]);

  const exportRows = useMemo(
    () =>
      filteredRows.map((row) => ({
        "Operation No.": row.operationNo,
        Date: formatDateTime(row.transactionDate),
        Project: row.project,
        "Operation Type": formatOperationType(row.operationType),
        Source: row.source,
        Destination: row.destination,
        Quantity: row.quantity,
        [`Cost (${currency})`]: row.cost,
        Status: String(row.status || "COMPLETED").replaceAll("_", " "),
      })),
    [filteredRows, currency]
  );

  const reportMeta = {
    title: selectedReport?.title || "Operations Summary Report",
    companyName: currentCompany?.name || "Fleet Fuel PRO",
    generatedBy: getUserDisplayName(currentUser),
    generatedAt: new Date().toLocaleString("en-GB"),
    filters: filterSummary,
    totals: [
      { label: "Operations", value: totals.operations },
      { label: "Total Quantity", value: `${formatNumber(totals.quantity)} L` },
      { label: "Total Cost", value: formatMoney(totals.cost, currency) },
    ],
  };

  const handlePrint = () => {
    printReport({
      ...reportMeta,
      columns: TABLE_HEADERS,
      rows: filteredRows.map((row) => [
        row.operationNo,
        formatDateTime(row.transactionDate),
        row.project,
        formatOperationType(row.operationType),
        row.source,
        row.destination,
        formatNumber(row.quantity),
        formatMoney(row.cost, currency),
        String(row.status || "COMPLETED").replaceAll("_", " "),
      ]),
      footerRow: [
        "Grand Total",
        "",
        "",
        "",
        "",
        "",
        formatNumber(totals.quantity),
        formatMoney(totals.cost, currency),
        `${totals.operations} operation${totals.operations === 1 ? "" : "s"}`,
      ],
    });
  };

  const handleExport = () => {
    exportReportToExcel({
      fileName: "Operations_Summary_Report",
      sheetName: "Operations Summary",
      title: reportMeta.title,
      companyName: reportMeta.companyName,
      generatedBy: reportMeta.generatedBy,
      generatedAt: reportMeta.generatedAt,
      filters: filterSummary,
      rows: exportRows,
      totals: {
        "Operation No.": "Grand Total",
        Quantity: totals.quantity,
        [`Cost (${currency})`]: totals.cost,
        Status: `${totals.operations} operations`,
      },
    });
  };

  const handleOpenReport = (report) => {
    if (!report.available) return;

    setSelectedReport(report);
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setReportGenerated(false);
    setFiltersOpen(true);
  };

  const handleBackToReports = () => {
    setSelectedReport(null);
    setFiltersOpen(false);
    setReportGenerated(false);
  };

  const handleBackToModules = () => {
    setSelectedReportModule(null);
    setSelectedReport(null);
    setFiltersOpen(false);
    setReportGenerated(false);
  };

  const handleFilterChange = (field, value) => {
    setDraftFilters((previous) => {
      const next = {
        ...previous,
        [field]: value,
      };

      if (field === "project") {
        next.asset = "all";
      }

      return next;
    });
  };

  const handleResetFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  };

  const handleApplyFilters = () => {
    setAppliedFilters(draftFilters);
    setReportGenerated(true);
    setFiltersOpen(false);
  };

  if (selectedReport?.id === "fuel-suppliers") {
    return (
      <FuelSuppliersReport
        selectedReport={selectedReport}
        currentUser={currentUser}
        currentCompany={currentCompany}
        projects={projects}
        stations={stations}
        data={data}
        headers={headers}
        currency={currency}
        onBack={handleBackToReports}
      />
    );
  }

  if (selectedReport?.id === "station-movements") {
    return (
      <StationMovementsReport
        selectedReport={selectedReport}
        currentUser={currentUser}
        currentCompany={currentCompany}
        projects={projects}
        stations={stations}
        onBack={handleBackToReports}
      />
    );
  }

  if (selectedReport) {
    return (
      <div className="min-h-full bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1700px] space-y-5">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <button
                  type="button"
                  onClick={handleBackToReports}
                  className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm font-bold text-slate-300 transition hover:border-amber-500/50 hover:text-amber-300"
                >
                  <span aria-hidden="true">←</span>
                  Back to Reports
                </button>

                <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400">
                  Operations Reports
                </p>

                <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                  {selectedReport.title}
                </h1>

                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
                  {selectedReport.description}
                </p>
              </div>

              <ReportToolbar
                onOpenFilters={() => setFiltersOpen(true)}
                onPrint={handlePrint}
                onExport={handleExport}
                disabled={!reportGenerated || !filteredRows.length}
              />
            </div>
          </section>

          {!reportGenerated ? (
            <section className="rounded-2xl border border-amber-500/30 bg-slate-900/80 px-6 py-14 text-center shadow-xl shadow-black/10">
              <div className="mx-auto flex max-w-xl flex-col items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-3xl">
                  📊
                </div>

                <h2 className="mt-5 text-xl font-black text-white sm:text-2xl">
                  Select report filters first
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Choose the required date range, project, asset, operation type and
                  status, then generate the report to display its results.
                </p>

                <button
                  type="button"
                  onClick={() => setFiltersOpen(true)}
                  className="mt-6 rounded-xl border border-amber-500 bg-amber-500 px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-amber-400"
                >
                  Set Report Filters
                </button>
              </div>
            </section>
          ) : (
            <>
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {filterSummary.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3"
                  >
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-1 truncate text-sm font-extrabold text-slate-200">
                      {item.value}
                    </p>
                  </div>
                ))}
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/10">
                <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="font-extrabold text-white">Report Details</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Showing completed operations from the current accessible scope.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-slate-300">
                      {totals.operations} records
                    </span>
                    <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-blue-300">
                      {formatNumber(totals.quantity)} L
                    </span>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300">
                      {formatMoney(totals.cost, currency)}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[1250px] w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-950/80">
                      <tr>
                        {TABLE_HEADERS.map((header) => (
                          <th
                            key={header}
                            className="whitespace-nowrap border-b border-slate-800 px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-400"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRows.length ? (
                        <>
                          {filteredRows.map((row) => (
                            <tr
                              key={row.key}
                              className="border-b border-slate-800/80 transition hover:bg-slate-800/40"
                            >
                              <td className="whitespace-nowrap px-4 py-3 font-bold text-amber-300">
                                {row.operationNo}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                                {formatDateTime(row.transactionDate)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                                {row.project}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                                {formatOperationType(row.operationType)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                                {row.source}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                                {row.destination}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-white">
                                {formatNumber(row.quantity)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-emerald-300">
                                {formatMoney(row.cost, currency)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">
                                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-300">
                                  {String(row.status || "COMPLETED").replaceAll("_", " ")}
                                </span>
                              </td>
                            </tr>
                          ))}

                          <tr className="bg-slate-950/70">
                            <td
                              colSpan={6}
                              className="px-4 py-4 text-right text-sm font-black uppercase tracking-wider text-amber-300"
                            >
                              Grand Total
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-right font-black text-white">
                              {formatNumber(totals.quantity)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-right font-black text-emerald-300">
                              {formatMoney(totals.cost, currency)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-xs font-bold text-slate-400">
                              {totals.operations} operation
                              {totals.operations === 1 ? "" : "s"}
                            </td>
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td
                            colSpan={TABLE_HEADERS.length}
                            className="px-6 py-16 text-center"
                          >
                            <div className="mx-auto flex max-w-md flex-col items-center">
                              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-2xl">
                                📄
                              </div>
                              <h3 className="mt-4 font-extrabold text-white">
                                No operations match the selected filters
                              </h3>
                              <p className="mt-2 text-sm leading-6 text-slate-500">
                                Reset the filters or select a wider date range.
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>

        {filtersOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => setFiltersOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            />

            <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-slate-700 bg-slate-900 shadow-2xl shadow-black/40">
              <div className="flex items-start justify-between border-b border-slate-800 px-5 py-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                    Report Filters
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white">
                    Operations Summary
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/70 text-lg text-slate-400 transition hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-300">
                      Date From
                    </span>
                    <input
                      type="date"
                      value={draftFilters.dateFrom}
                      onChange={(event) =>
                        handleFilterChange("dateFrom", event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-300">
                      Date To
                    </span>
                    <input
                      type="date"
                      value={draftFilters.dateTo}
                      onChange={(event) =>
                        handleFilterChange("dateTo", event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-500"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Project
                  </span>
                  <select
                    value={draftFilters.project}
                    onChange={(event) =>
                      handleFilterChange("project", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-500"
                  >
                    <option value="all">All Projects</option>
                    {projects.map((project) => (
                      <option
                        key={project.id || project.name}
                        value={getProjectLabel(project)}
                      >
                        {getProjectLabel(project)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Asset
                  </span>
                  <select
                    value={draftFilters.asset}
                    onChange={(event) =>
                      handleFilterChange("asset", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-500"
                  >
                    <option value="all">All Assets</option>
                    {availableAssets.map((asset) => (
                      <option
                        key={getAssetFilterValue(asset) || getAssetLabel(asset)}
                        value={getAssetFilterValue(asset)}
                      >
                        {getAssetLabel(asset)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Operation Type
                  </span>
                  <select
                    value={draftFilters.operationType}
                    onChange={(event) =>
                      handleFilterChange("operationType", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-500"
                  >
                    <option value="all">All Operation Types</option>
                    <option value="Direct_Refuel">Direct Refuel</option>
                    <option value="Internal_Transfer">Internal Transfer</option>
                    <option value="External_Supply">External Supply</option>
                    <option value="External_Transfer">External Transfer</option>
                    <option value="External_Direct_Refuel">
                      External Direct Refuel
                    </option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Status
                  </span>
                  <select
                    value={draftFilters.status}
                    onChange={(event) =>
                      handleFilterChange("status", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-800 px-5 py-4">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-slate-300 transition hover:border-slate-500 hover:text-white"
                >
                  Reset
                </button>

                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 transition hover:bg-amber-400"
                >
                  {reportGenerated ? "Update Report" : "Generate Report"}
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>
    );
  }

  const activeModule = REPORT_MODULES.find(
    (module) => module.id === selectedReportModule
  );

  if (!selectedReportModule) {
    return (
      <div className="min-h-full bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1800px] space-y-5">
          <section className="rounded-2xl border border-amber-500/30 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
            <div className="mb-3 inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
              Fleet Fuel PRO Reporting Center
            </div>

            <h1 className="text-2xl font-black text-white sm:text-3xl">
              Reports
            </h1>

            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
              Select a system module to view its available reports.
            </p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {REPORT_MODULES.map((module) => {
              const availableReports = module.reports.filter(
                (report) => report.available
              ).length;
              const totalReports = module.reports.length;

              return (
                <button
                  key={module.id}
                  type="button"
                  disabled={!module.available}
                  onClick={() => setSelectedReportModule(module.id)}
                  className={`group min-h-[210px] rounded-2xl border p-5 text-left shadow-xl shadow-black/10 transition ${
                    module.available
                      ? "border-amber-500/30 bg-slate-900/80 hover:-translate-y-1 hover:border-amber-400/70 hover:bg-slate-900"
                      : "cursor-not-allowed border-slate-800 bg-slate-900/45 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-3xl ${
                        module.available
                          ? "border-amber-500/30 bg-amber-500/10"
                          : "border-slate-700 bg-slate-950/70 grayscale"
                      }`}
                    >
                      {module.icon}
                    </div>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${
                        module.available
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border-slate-700 bg-slate-950/70 text-slate-500"
                      }`}
                    >
                      {module.available ? "Open Module" : "Coming Soon"}
                    </span>
                  </div>

                  <h2 className="mt-5 text-xl font-black text-white">
                    {module.title}
                  </h2>

                  <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-400">
                    {module.description}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Reports
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-slate-200">
                        {totalReports
                          ? `${totalReports} Report${totalReports === 1 ? "" : "s"}`
                          : "Not added yet"}
                      </p>
                    </div>

                    {module.available ? (
                      <div className="text-right">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Available Now
                        </p>
                        <p className="mt-1 text-sm font-extrabold text-amber-300">
                          {availableReports}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1800px] space-y-5">
        <section className="rounded-2xl border border-amber-500/30 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
          <button
            type="button"
            onClick={handleBackToModules}
            className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm font-bold text-slate-300 transition hover:border-amber-500/50 hover:text-amber-300"
          >
            <span aria-hidden="true">←</span>
            Back to Report Modules
          </button>

          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-3xl">
              {activeModule?.icon}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400">
                Report Module
              </p>
              <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                {activeModule?.title} Reports
              </h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
                {activeModule?.description}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {(activeModule?.reports || []).map((report, index) => (
            <article
              key={report.id}
              className={`rounded-2xl border p-5 transition ${
                report.available
                  ? "border-amber-500/35 bg-slate-900/80 hover:border-amber-400/60"
                  : "border-slate-800 bg-slate-900/50 opacity-70"
              }`}
            >
              <div className="flex h-full flex-col gap-4 sm:flex-row sm:items-start">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm font-black ${
                    report.available
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      : "border-slate-700 bg-slate-950/70 text-slate-500"
                  }`}
                >
                  {index + 1}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-extrabold text-white">
                      {report.title}
                    </h3>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                        report.available
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border-slate-700 bg-slate-950/70 text-slate-500"
                      }`}
                    >
                      {report.available ? "Ready for QA" : "Coming Soon"}
                    </span>
                  </div>

                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">
                    {report.description}
                  </p>

                  <div className="mt-4">
                    <button
                      type="button"
                      disabled={!report.available}
                      onClick={() => handleOpenReport(report)}
                      className={`rounded-xl px-4 py-2.5 text-sm font-extrabold transition ${
                        report.available
                          ? "border border-amber-500 bg-amber-500 text-slate-950 hover:bg-amber-400"
                          : "cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-500"
                      }`}
                    >
                      {report.available ? "Open Report" : "Available Soon"}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
