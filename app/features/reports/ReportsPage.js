"use client";

import { useEffect, useMemo, useState } from "react";
import ReportToolbar from "./components/ReportToolbar";
import { printReport } from "./utils/printReport";
import { exportReportToExcel } from "./utils/exportReportToExcel";
import { fetchStationStockMovements } from "../../services/stationsService";
import StationsReportsPage from "./stations/StationsReportsPage";
import EmployeesReportsPage from "./employees/EmployeesReportsPage";
import ProjectsReportsPage from "./projects/ProjectsReportsPage";
import CompaniesReportsPage from "./companies/CompaniesReportsPage";
import { fetchOperationsSummaryReport } from "../../services/operationsService";
import {
  fetchAssetTransferHistory,
  fetchAssetMeterHistory,
} from "../../services/assetsService";
import {
  fetchOdometerCorrectionHistory,
  fetchOperationCorrectionsReport,
} from "../../services/operationCorrectionsService";

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
    id: "operation-corrections",
    title: "Operation Corrections Report",
    description:
      "Complete audit report of operation correction requests showing changed fields, previous and new values, requester, reviewer, reason and final status.",
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
    available: true,
  },
  {
    id: "asset-transfer-history",
    title: "Asset Transfer History",
    description:
      "Complete history of single and bulk asset transfers, including transfer reference, source project, destination project, requester, transfer date and approval status.",
    available: true,
  },
  {
    id: "asset-meter-history",
    title: "Asset Meter History Report",
    description:
      "Complete chronological history of asset odometer readings, resets, meter cycles and lifetime readings.",
    available: true,
  },
];

const STATIONS_REPORTS = [
  {
    id: "station-counter-meter-history",
    title: "Station Counter Meter History Report",
    description:
      "Chronological history of station counter readings, operation events, counter resets, meter cycles and lifetime readings.",
    available: true,
  },
  {
    id: "station-master",
    title: "Station Master Report",
    description:
      "Complete station register including project, type, status, capacity, stock balance, current counter, lifetime counter and counter cycle.",
    available: true,
  },
  {
    id: "station-transfer",
    title: "Station Transfer Report",
    description:
      "Complete history of station transfer requests including source and destination projects, stock at transfer, requester, approvers, transfer date and approval status.",
    available: true,
  },
];

const TEAM_REPORTS = [
  {
    id: "employee-master",
    title: "Employee Master Report",
    description:
      "Complete company employee register including assignment, employment status, contact information and linked user account details.",
    available: true,
  },
  {
    id: "employee-transfer",
    title: "Employee Transfer Report",
    description:
      "Complete history of single and bulk employee transfers including batch reference, projects, approval stages and final status.",
    available: true,
  },
];

const PROJECTS_REPORTS = [
  {
    id: "projects-master",
    title: "Projects Master Report",
    description:
      "Complete project register including status, manager, assignments, fuel consumption, cost and current pricing components.",
    available: true,
  },
  {
    id: "project-fuel-price-history",
    title: "Project Fuel Price History Report",
    description:
      "Chronological history of project fuel prices including base price, delivery, VAT, effective date, changer and priced operations.",
    available: true,
  },
];

const COMPANIES_REPORTS = [
  {
    id: "companies-master",
    title: "Companies Master Report",
    description:
      "Platform-level company register including status, subscription, company resources, completed fuel operations and total fuel consumption.",
    available: true,
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
    description: "Asset register, movement history and utilization reports.",
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
    reports: STATIONS_REPORTS,
    available: true,
  },
  {
    id: "team",
    title: "Team",
    description:
      "Team members, assignments, transfers and workforce activity reports.",
    icon: "👷",
    reports: TEAM_REPORTS,
    available: true,
  },
  {
    id: "projects",
    title: "Projects",
    description:
      "Project summaries, operational activity and fuel performance reports.",
    icon: "📁",
    reports: PROJECTS_REPORTS,
    available: true,
  },
  {
    id: "companies",
    title: "Companies",
    description:
      "Platform-level company register, subscriptions and consolidated operating scale.",
    icon: "🏢",
    reports: COMPANIES_REPORTS,
    available: true,
    platformOnly: true,
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
  "Employee Code",
  "Employee Name",
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
  fuelerEmployeeId: "",
  status: "all",
};

function normalizeValue(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
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
    ]),
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


const DEFAULT_REPORT_PAGE_SIZE = 25;
const REPORT_PAGE_SIZE_OPTIONS = [10, 25, 50, "all"];

function useReportPagination(
  items = [],
  initialPageSize = DEFAULT_REPORT_PAGE_SIZE,
) {
  const normalizedInitialPageSize = REPORT_PAGE_SIZE_OPTIONS.includes(
    initialPageSize,
  )
    ? initialPageSize
    : DEFAULT_REPORT_PAGE_SIZE;

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(normalizedInitialPageSize);

  const totalItems = items.length;
  const showAll = pageSize === "all";
  const effectivePageSize = showAll
    ? Math.max(totalItems, 1)
    : Number(pageSize) || DEFAULT_REPORT_PAGE_SIZE;
  const totalPages = showAll
    ? 1
    : Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = showAll
    ? 0
    : (safeCurrentPage - 1) * effectivePageSize;
  const endIndex = showAll
    ? totalItems
    : Math.min(startIndex + effectivePageSize, totalItems);

  const paginatedItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex],
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const goToPage = (page) => {
    const nextPage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
    setCurrentPage(nextPage);
  };

  const setPageSize = (value) => {
    const nextSize =
      value === "all"
        ? "all"
        : REPORT_PAGE_SIZE_OPTIONS.includes(Number(value))
          ? Number(value)
          : DEFAULT_REPORT_PAGE_SIZE;

    setPageSizeState(nextSize);
    setCurrentPage(1);
  };

  const resetPage = () => setCurrentPage(1);

  return {
    paginatedItems,
    currentPage: safeCurrentPage,
    totalPages,
    totalItems,
    pageSize,
    startItem: totalItems ? startIndex + 1 : 0,
    endItem: endIndex,
    goToPage,
    setPageSize,
    resetPage,
  };
}

function ReportPagination({ pagination, itemLabel = "records" }) {
  if (!pagination || pagination.totalItems <= 0) return null;

  const {
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    startItem,
    endItem,
    goToPage,
    setPageSize,
  } = pagination;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-800 bg-slate-950/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
        <span>
          Showing <strong className="text-slate-200">{startItem}–{endItem}</strong>{" "}
          of <strong className="text-slate-200">{totalItems}</strong> {itemLabel}
        </span>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
          Rows per page
          <select
            value={pageSize}
            onChange={(event) => setPageSize(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs font-bold text-slate-200 outline-none focus:border-amber-500"
          >
            {REPORT_PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size === "all" ? "All" : size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-extrabold text-slate-300 transition hover:border-amber-500/60 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="min-w-[90px] text-center text-xs font-black text-slate-300">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-extrabold text-slate-300 transition hover:border-amber-500/60 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
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
    getAssetCandidates(asset).includes(normalizedValue),
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

function resolveOperationProjectLabel({
  embeddedOperation,
  source,
  destination,
  projects = [],
  assets = [],
  stations = [],
}) {
  const snapshotName =
    embeddedOperation?.projectNameAtOperation ||
    embeddedOperation?.projectSnapshotName ||
    "";

  if (snapshotName) return snapshotName;

  const snapshotId =
    embeddedOperation?.projectIdAtOperation ||
    embeddedOperation?.projectSnapshotId ||
    "";

  if (snapshotId) {
    const normalizedSnapshotId = normalizeValue(snapshotId);
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
        .includes(normalizedSnapshotId),
    );

    return matchedProject ? getProjectLabel(matchedProject) : snapshotId;
  }

  return resolveProjectLabel({
    source,
    destination,
    projects,
    assets,
    stations,
  });
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
      .includes(normalizedProject),
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
              filters.dateTo,
            )}`
          : "All dates",
    },
    {
      label: "Project",
      value: filters.project === "all" ? "All Projects" : filters.project,
    },
    {
      label: "Asset",
      value:
        filters.asset === "all"
          ? "All Assets"
          : filters.assetLabel || filters.asset,
    },
    {
      label: "Operation Type",
      value:
        filters.operationType === "all"
          ? "All Operation Types"
          : formatOperationType(filters.operationType),
    },
    {
      label: "Employee Code",
      value: filters.fuelerEmployeeId || "All Employees",
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

function getOperationEntityLabel(entity, preferredCodeFields = []) {
  for (const field of preferredCodeFields) {
    if (entity?.[field]) return entity[field];
  }
  return entity?.name || entity?.id || "";
}

function mapSummaryOperation(operation, index) {
  const type = String(operation?.type || "").toUpperCase();
  const sourceStation = getOperationEntityLabel(operation?.sourceStation, [
    "stationId",
    "stationCode",
    "code",
  ]);
  const destinationStation = getOperationEntityLabel(
    operation?.destinationStation,
    ["stationId", "stationCode", "code"],
  );
  const asset = getOperationEntityLabel(operation?.asset, [
    "assetId",
    "equipmentNo",
    "equipmentNumber",
    "code",
  ]);
  const externalSource =
    operation?.externalStationName ||
    operation?.supplierName ||
    operation?.externalSupplierName ||
    "";

  let source = sourceStation || externalSource || "-";
  let destination = asset || destinationStation || "-";

  if (type === "EXTERNAL_SUPPLY") {
    source = externalSource || "External Supplier";
    destination = destinationStation || "-";
  } else if (type === "EXTERNAL_DIRECT_REFUEL") {
    source = externalSource || "External Station";
    destination = asset || "-";
  } else if (type === "INTERNAL_TRANSFER" || type === "EXTERNAL_TRANSFER") {
    destination = destinationStation || asset || "-";
  }

  return {
    key: operation?.id || `${operation?.operationNo || "operation"}-${index}`,
    operationNo: operation?.operationNo || "-",
    transactionDate: operation?.operationDate || operation?.createdAt,
    operationType: operation?.type || "-",
    fuelerEmployeeId: operation?.fuelerEmployeeId || "-",
    fuelerName: operation?.fuelerName || "-",
    source,
    destination,
    destinationRaw:
      operation?.assetId ||
      operation?.asset?.id ||
      operation?.asset?.assetId ||
      operation?.destinationStationId ||
      destination,
    quantity: getNumericValue(operation?.quantity),
    cost: getNumericValue(
      operation?.totalCostAtOperation,
      operation?.totalCost,
    ),
    status: operation?.status || "COMPLETED",
    project:
      operation?.projectNameAtOperation ||
      operation?.project?.name ||
      operation?.sourceProjectNameAtOperation ||
      operation?.destinationProjectNameAtOperation ||
      "-",
  };
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
  if (movement?.referenceType === "PHYSICAL_STOCK_COUNT")
    return "Physical Stock Count";
  if (movement?.referenceType === "ZERO_BALANCE")
    return "Balance Reconciliation";

  return movement?.referenceType || "-";
}

function getMovementStatus(movement) {
  return (
    movement?.operation?.status || movement?.referenceStatus || "COMPLETED"
  );
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

function getOperationField(
  row,
  headers,
  embeddedAliases = [],
  rowAliases = [],
) {
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
          ["transaction_type", "operation_type", "type"],
        );

        if (
          normalizeValue(operationType).replaceAll(" ", "_") !==
          "external_supply"
        ) {
          return null;
        }

        const operationNo = getOperationField(
          row,
          headers,
          ["operationNo", "operationNumber", "referenceNo"],
          ["operation_id", "operation no", "operation_no", "reference_no"],
        );
        const transactionDate = getOperationField(
          row,
          headers,
          [
            "transactionDateTime",
            "transactionDate",
            "operationDate",
            "createdAt",
          ],
          [
            "transaction_datetime",
            "transaction date",
            "operation_date",
            "date",
            "created_at",
          ],
        );
        const supplier =
          getOperationField(
            row,
            headers,
            [
              "supplierName",
              "supplier",
              "vendorName",
              "externalSupplierName",
              "externalStationName",
            ],
            [
              "supplier_name",
              "supplier",
              "vendor_name",
              "external_supplier_name",
              "external_station_name",
            ],
          ) || "Unspecified Supplier";
        const invoiceNumber = getOperationField(
          row,
          headers,
          ["invoiceNumber", "invoiceNo", "supplierInvoiceNumber"],
          ["invoice_number", "invoice_no", "supplier_invoice_number"],
        );
        const destination = getOperationField(
          row,
          headers,
          ["destinationStationId", "destinationId", "destinationStationCode"],
          [
            "destination_station",
            "destination_station_id",
            "destination_id",
            "destination",
          ],
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
          getRowValue(row, headers, [
            "diesel_quantity",
            "quantity",
            "fuel_quantity",
          ]),
        );
        const totalCost = getOperationCost(row, headers);
        const explicitUnitPrice = getNumericValue(
          embeddedOperation?.unitPrice,
          embeddedOperation?.pricePerLiter,
          embeddedOperation?.literPrice,
          getRowValue(row, headers, [
            "unit_price",
            "price_per_liter",
            "liter_price",
          ]),
        );
        const unitPrice =
          explicitUnitPrice || (quantity > 0 ? totalCost / quantity : 0);
        const status =
          getOperationField(
            row,
            headers,
            ["status", "operationStatus"],
            ["operation_status", "status"],
          ) || "COMPLETED";
        const createdBy =
          embeddedOperation?.createdBy?.fullName ||
          embeddedOperation?.createdBy?.name ||
          embeddedOperation?.createdBy?.email ||
          getOperationField(
            row,
            headers,
            ["createdByName", "createdByUserName"],
            ["created_by", "created_by_name", "created_by_user"],
          ) ||
          "-";
        const project =
          embeddedOperation?.destinationStation?.project?.name ||
          embeddedOperation?.project?.name ||
          resolveOperationProjectLabel({
            embeddedOperation,
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
    () =>
      [
        ...new Set(supplyRows.map((row) => row.supplier).filter(Boolean)),
      ].sort(),
    [supplyRows],
  );

  const stationOptions = useMemo(() => {
    const filtered =
      draftFilters.project === "all"
        ? supplyRows
        : supplyRows.filter(
            (row) =>
              normalizeValue(row.project) ===
              normalizeValue(draftFilters.project),
          );
    return [
      ...new Set(filtered.map((row) => row.destination).filter(Boolean)),
    ].sort();
  }, [supplyRows, draftFilters.project]);

  const filteredRows = useMemo(() => {
    return supplyRows.filter((row) => {
      const rowDate = row.transactionDate
        ? new Date(row.transactionDate)
        : null;
      if (
        appliedFilters.dateFrom &&
        (!rowDate || rowDate < new Date(`${appliedFilters.dateFrom}T00:00:00`))
      )
        return false;
      if (
        appliedFilters.dateTo &&
        (!rowDate || rowDate > new Date(`${appliedFilters.dateTo}T23:59:59`))
      )
        return false;
      if (
        appliedFilters.project !== "all" &&
        normalizeValue(row.project) !== normalizeValue(appliedFilters.project)
      )
        return false;
      if (
        appliedFilters.supplier !== "all" &&
        normalizeValue(row.supplier) !== normalizeValue(appliedFilters.supplier)
      )
        return false;
      if (
        appliedFilters.station !== "all" &&
        normalizeValue(row.destination) !==
          normalizeValue(appliedFilters.station)
      )
        return false;
      if (
        appliedFilters.status !== "all" &&
        normalizeValue(row.status) !== normalizeValue(appliedFilters.status)
      )
        return false;
      return true;
    });
  }, [supplyRows, appliedFilters]);

  const pagination = useReportPagination(filteredRows);
  const paginatedRows = pagination.paginatedItems;

  const totals = useMemo(
    () => ({
      deliveries: filteredRows.length,
      suppliers: new Set(
        filteredRows.map((row) => normalizeValue(row.supplier)),
      ).size,
      quantity: filteredRows.reduce((sum, row) => sum + row.quantity, 0),
      cost: filteredRows.reduce((sum, row) => sum + row.totalCost, 0),
    }),
    [filteredRows],
  );

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

  const filterSummary = useMemo(
    () => [
      {
        label: "Period",
        value:
          appliedFilters.dateFrom || appliedFilters.dateTo
            ? `${formatReportDate(appliedFilters.dateFrom)} → ${formatReportDate(appliedFilters.dateTo)}`
            : "All dates",
      },
      {
        label: "Project",
        value:
          appliedFilters.project === "all"
            ? "All Projects"
            : appliedFilters.project,
      },
      {
        label: "Supplier",
        value:
          appliedFilters.supplier === "all"
            ? "All Suppliers"
            : appliedFilters.supplier,
      },
      {
        label: "Station",
        value:
          appliedFilters.station === "all"
            ? "All Stations"
            : appliedFilters.station,
      },
      {
        label: "Status",
        value:
          appliedFilters.status === "all"
            ? "All Statuses"
            : formatOperationType(appliedFilters.status),
      },
    ],
    [appliedFilters],
  );

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
        {
          label: "Total Quantity",
          value: `${formatNumber(totals.quantity)} L`,
        },
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
        "Grand Total",
        "",
        "",
        "",
        "",
        "",
        formatNumber(totals.quantity),
        "",
        formatMoney(totals.cost, currency),
        "",
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
    pagination.resetPage();
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    setDraftFilters(FUEL_SUPPLIER_FILTERS);
    setAppliedFilters(FUEL_SUPPLIER_FILTERS);
    pagination.resetPage();
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
                <span aria-hidden="true">←</span> Back to Reports
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
              disabled={!reportGenerated || !filteredRows.length}
            />
          </div>
        </section>

        {!reportGenerated ? (
          <section className="rounded-2xl border border-amber-500/30 bg-slate-900/80 px-6 py-14 text-center shadow-xl shadow-black/10">
            <div className="mx-auto flex max-w-xl flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-3xl">
                🚚
              </div>
              <h2 className="mt-5 text-xl font-black text-white sm:text-2xl">
                Select supplier report filters first
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Choose the period, project, supplier, destination station and
                status, then generate the report.
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
                  <p className="mt-1 truncate text-sm font-extrabold text-slate-200">
                    {item.value}
                  </p>
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
                <div
                  key={label}
                  className="rounded-2xl border border-amber-500/25 bg-slate-900/80 p-4 shadow-lg shadow-black/10"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">{value}</p>
                </div>
              ))}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/10">
              <div className="border-b border-slate-800 px-5 py-4">
                <h2 className="font-extrabold text-white">Supplier Summary</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Totals grouped by fuel supplier.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full border-collapse text-sm">
                  <thead className="bg-slate-950/90">
                    <tr>
                      {[
                        "Supplier",
                        "Deliveries",
                        "Total Quantity (L)",
                        `Total Value (${currency})`,
                      ].map((header) => (
                        <th
                          key={header}
                          className="border-b border-slate-800 px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-400"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {supplierSummary.length ? (
                      supplierSummary.map((item) => (
                        <tr
                          key={item.supplier}
                          className="border-b border-slate-800/70 hover:bg-slate-800/30"
                        >
                          <td className="px-4 py-3 font-extrabold text-amber-300">
                            {item.supplier}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-200">
                            {item.deliveries}
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-white">
                            {formatNumber(item.quantity)}
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-emerald-300">
                            {formatMoney(item.cost, currency)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-10 text-center text-slate-500"
                        >
                          No supplier deliveries match the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/10">
              <div className="flex flex-col gap-2 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-extrabold text-white">
                    Fuel Delivery Details
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {filteredRows.length} delivery record
                    {filteredRows.length === 1 ? "" : "s"} found
                  </p>
                </div>
                <p className="text-xs font-bold text-amber-300">
                  External Supply operations only
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[1750px] w-full border-collapse text-sm">
                  <thead className="bg-slate-950/90">
                    <tr>
                      {FUEL_SUPPLIER_HEADERS.map((header) => (
                        <th
                          key={header}
                          className="whitespace-nowrap border-b border-slate-800 px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-400"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length ? (
                      paginatedRows.map((row) => (
                        <tr
                          key={row.key}
                          className="border-b border-slate-800/70 transition hover:bg-slate-800/30"
                        >
                          <td className="whitespace-nowrap px-3 py-3 font-bold text-amber-300">
                            {row.operationNo}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                            {formatDateTime(row.transactionDate)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-extrabold text-white">
                            {row.supplier}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                            {row.invoiceNumber}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                            {row.project}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                            {row.destination}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right font-extrabold text-white">
                            {formatNumber(row.quantity)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right text-slate-300">
                            {formatMoney(row.unitPrice, currency)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right font-extrabold text-emerald-300">
                            {formatMoney(row.totalCost, currency)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                            {row.createdBy}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-300">
                            {formatOperationType(row.status)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={FUEL_SUPPLIER_HEADERS.length}
                          className="px-6 py-12 text-center text-slate-500"
                        >
                          No fuel supplier deliveries match the selected
                          filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-950/80">
                    <tr className="font-black text-white">
                      <td className="px-3 py-3" colSpan={6}>
                        Grand Total
                      </td>
                      <td className="px-3 py-3 text-right">
                        {formatNumber(totals.quantity)}
                      </td>
                      <td />
                      <td className="px-3 py-3 text-right text-emerald-300">
                        {formatMoney(totals.cost, currency)}
                      </td>
                      <td />
                      <td className="px-3 py-3 text-xs text-slate-400">
                        {totals.deliveries} deliveries
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <ReportPagination pagination={pagination} itemLabel="delivery records" />
            </section>
          </>
        )}

        {filtersOpen ? (
          <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm">
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => setFiltersOpen(false)}
              className="absolute inset-0 h-full w-full"
            />
            <aside className="absolute right-0 top-0 z-10 flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-900 shadow-2xl shadow-black/50">
              <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                    Report Setup
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white">
                    Fuel Supplier Filters
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Close filters"
                  onClick={() => setFiltersOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/70 text-lg text-slate-400 transition hover:text-white"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-300">
                      Date From
                    </span>
                    <input
                      type="date"
                      value={draftFilters.dateFrom}
                      onChange={(e) =>
                        handleFilterChange("dateFrom", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-300">
                      Date To
                    </span>
                    <input
                      type="date"
                      value={draftFilters.dateTo}
                      onChange={(e) =>
                        handleFilterChange("dateTo", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Project
                  </span>
                  <select
                    value={draftFilters.project}
                    onChange={(e) =>
                      handleFilterChange("project", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="all">All Projects</option>
                    {projects.map((project) => (
                      <option
                        key={project.id || getProjectLabel(project)}
                        value={getProjectLabel(project)}
                      >
                        {getProjectLabel(project)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Supplier
                  </span>
                  <select
                    value={draftFilters.supplier}
                    onChange={(e) =>
                      handleFilterChange("supplier", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="all">All Suppliers</option>
                    {supplierOptions.map((supplier) => (
                      <option key={supplier} value={supplier}>
                        {supplier}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Destination Station
                  </span>
                  <select
                    value={draftFilters.station}
                    onChange={(e) =>
                      handleFilterChange("station", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="all">All Stations</option>
                    {stationOptions.map((station) => (
                      <option key={station} value={station}>
                        {station}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Status
                  </span>
                  <select
                    value={draftFilters.status}
                    onChange={(e) =>
                      handleFilterChange("status", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="APPROVED">Approved</option>
                    <option value="PENDING">Pending</option>
                    <option value="PARTIALLY_APPROVED">
                      Partially Approved
                    </option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-slate-800 px-5 py-4">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-slate-300 hover:border-slate-500 hover:text-white"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={applyFilters}
                  className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-amber-400"
                >
                  {reportGenerated ? "Update Report" : "Generate Report"}
                </button>
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
  const [appliedFilters, setAppliedFilters] = useState(
    STATION_MOVEMENT_FILTERS,
  );
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

      return (
        normalizeValue(stationProject) === normalizeValue(selectedProjectId)
      );
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
    [movements],
  );

  const pagination = useReportPagination(rows);
  const paginatedRows = pagination.paginatedItems;

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
          new Date(b.movementAt || b.createdAt).getTime(),
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
        normalizeValue(appliedFilters.projectId),
    );

    const selectedStation = stations.find(
      (station) =>
        normalizeValue(getStationBackendId(station)) ===
        normalizeValue(appliedFilters.stationId),
    );

    return [
      {
        label: "Period",
        value:
          appliedFilters.dateFrom || appliedFilters.dateTo
            ? `${formatReportDate(appliedFilters.dateFrom)} → ${formatReportDate(
                appliedFilters.dateTo,
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
      pagination.resetPage();
      setFiltersOpen(false);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Failed to load station movements.",
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
    pagination.resetPage();
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
                  <h2 className="font-extrabold text-white">
                    Station Stock Ledger
                  </h2>
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
                      paginatedRows.map((row) => (
                        <tr
                          key={row.key}
                          className="border-b border-slate-800/70 transition hover:bg-slate-800/30"
                        >
                          <td className="px-3 py-3 font-bold text-amber-300">
                            {row.reference}
                          </td>
                          <td className="px-3 py-3 text-slate-300">
                            {formatDateTime(row.movementAt || row.createdAt)}
                          </td>
                          <td className="px-3 py-3 text-slate-300">
                            {row.project}
                          </td>
                          <td className="px-3 py-3 font-bold text-white">
                            {row.station}
                          </td>
                          <td className="px-3 py-3 text-slate-300">
                            {formatMovementType(row.movementType)}
                          </td>
                          <td className="px-3 py-3 text-slate-300">
                            {row.relatedEntity}
                          </td>
                          <td className="px-3 py-3 text-right font-extrabold text-emerald-300">
                            {row.inbound ? formatNumber(row.inbound) : "-"}
                          </td>
                          <td className="px-3 py-3 text-right font-extrabold text-red-300">
                            {row.outbound ? formatNumber(row.outbound) : "-"}
                          </td>
                          <td className="px-3 py-3 text-right font-black text-amber-300">
                            {formatNumber(row.balanceAfter)}
                          </td>
                          <td className="max-w-[260px] px-3 py-3 text-slate-400">
                            {row.reason || "-"}
                          </td>
                          <td className="px-3 py-3 font-bold text-slate-300">
                            {formatMovementType(row.status)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={STATION_MOVEMENT_HEADERS.length}
                          className="px-6 py-12 text-center text-slate-500"
                        >
                          No station movements match the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-950/80">
                    <tr className="font-black text-white">
                      <td className="px-3 py-3" colSpan={6}>
                        Totals
                      </td>
                      <td className="px-3 py-3 text-right text-emerald-300">
                        {formatNumber(totals.inbound)}
                      </td>
                      <td className="px-3 py-3 text-right text-red-300">
                        {formatNumber(totals.outbound)}
                      </td>
                      <td className="px-3 py-3 text-right text-amber-300">
                        {formatNumber(totals.closing)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <ReportPagination pagination={pagination} itemLabel="movements" />
            </section>
          </>
        )}

        {filtersOpen ? (
          <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm">
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => setFiltersOpen(false)}
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
                <button
                  type="button"
                  aria-label="Close filters"
                  onClick={() => setFiltersOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/70 text-lg text-slate-400 transition hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-2 gap-3">
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
                    value={draftFilters.projectId}
                    onChange={(event) =>
                      handleFilterChange("projectId", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-500"
                  >
                    <option value="all">All Projects</option>
                    {projects.map((project) => (
                      <option
                        key={
                          getProjectBackendId(project) ||
                          getProjectLabel(project)
                        }
                        value={getProjectBackendId(project)}
                      >
                        {getProjectLabel(project)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Station
                  </span>
                  <select
                    value={draftFilters.stationId}
                    onChange={(event) =>
                      handleFilterChange("stationId", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-500"
                  >
                    <option value="all">All Stations</option>
                    {availableStations.map((station) => (
                      <option
                        key={
                          getStationBackendId(station) ||
                          getStationLabel(station)
                        }
                        value={getStationBackendId(station)}
                      >
                        {getStationLabel(station)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Movement Type
                  </span>
                  <select
                    value={draftFilters.movementType}
                    onChange={(event) =>
                      handleFilterChange("movementType", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-500"
                  >
                    <option value="all">All Movement Types</option>
                    <option value="OPENING_BALANCE">Opening Balance</option>
                    <option value="DIRECT_REFUEL_OUT">
                      Direct Refuel Outbound
                    </option>
                    <option value="INTERNAL_TRANSFER_IN">
                      Internal Transfer Inbound
                    </option>
                    <option value="INTERNAL_TRANSFER_OUT">
                      Internal Transfer Outbound
                    </option>
                    <option value="EXTERNAL_SUPPLY_IN">
                      External Supply Inbound
                    </option>
                    <option value="EXTERNAL_TRANSFER_IN">
                      External Transfer Inbound
                    </option>
                    <option value="EXTERNAL_TRANSFER_OUT">
                      External Transfer Outbound
                    </option>
                    <option value="PHYSICAL_ADJUSTMENT">
                      Physical Adjustment
                    </option>
                    <option value="ZERO_BALANCE">Zero Balance</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Direction
                  </span>
                  <select
                    value={draftFilters.direction}
                    onChange={(event) =>
                      handleFilterChange("direction", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-500"
                  >
                    <option value="all">Inbound & Outbound</option>
                    <option value="inbound">Inbound</option>
                    <option value="outbound">Outbound</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-800 px-5 py-4">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-slate-300 transition hover:border-slate-500 hover:text-white disabled:opacity-50"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={loadReport}
                  disabled={loading}
                  className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 transition hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60"
                >
                  {loading
                    ? "Generating..."
                    : reportGenerated
                      ? "Update Report"
                      : "Generate Report"}
                </button>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const ASSETS_MASTER_FILTERS = {
  project: "all",
  assetType: "all",
  category: "all",
  status: "all",
  search: "",
};

const ASSETS_MASTER_HEADERS = [
  "Asset ID",
  "Asset Type",
  "Category",
  "Assigned Project",
  "Status",
  "Current Odometer",
  "Lifetime Odometer",
  "Fuel Tank Capacity (L)",
];

function getAssetProjectLabel(asset, projects = []) {
  const embeddedProject = asset?.project;
  if (embeddedProject && typeof embeddedProject === "object") {
    return getProjectLabel(embeddedProject);
  }

  const rawProject =
    asset?.projectName ||
    asset?.assignedProjectName ||
    asset?.projectCode ||
    asset?.projectId ||
    asset?.assignedProjectId ||
    "";

  if (!rawProject) return "Unassigned";

  const normalizedProject = normalizeValue(rawProject);
  const matchedProject = projects.find((project) =>
    [
      project?.id,
      project?.backendId,
      project?.projectBackendId,
      project?.name,
      project?.projectName,
      project?.code,
      project?.projectCode,
    ]
      .filter(Boolean)
      .map(normalizeValue)
      .includes(normalizedProject),
  );

  return matchedProject ? getProjectLabel(matchedProject) : String(rawProject);
}

function getAssetTypeLabel(asset) {
  return (
    asset?.assetType?.name ||
    asset?.assetTypeName ||
    asset?.typeName ||
    asset?.assetType ||
    asset?.type ||
    "-"
  );
}

function getAssetCategoryLabel(asset) {
  return (
    asset?.category?.name ||
    asset?.categoryName ||
    asset?.assetCategory ||
    asset?.category ||
    "-"
  );
}

function getAssetStatusLabel(asset) {
  if (asset?.deletedAt) return "DELETED";
  return asset?.status || asset?.assetStatus || "ACTIVE";
}

function getFirstAssetNumber(...values) {
  const validNumbers = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  const nonZeroValue = validNumbers.find((value) => value !== 0);
  return nonZeroValue ?? validNumbers[0] ?? 0;
}

function getAssetDataSources(asset) {
  return [
    asset,
    asset?.backendAsset,
    asset?.rawAsset,
    asset?.asset,
    asset?.data,
    asset?._raw,
  ].filter(Boolean);
}

function getAssetCurrentOdometer(asset) {
  const sources = getAssetDataSources(asset);

  return getFirstAssetNumber(
    ...sources.flatMap((source) => [
      source?.currentOdometerValue,
      source?.currentOdometer,
      source?.currentOdometerReading,
      source?.currentReading,
      source?.currentMeterReading,
      source?.odometer,
      source?.hourMeter,
      source?.meterReading,
    ]),
  );
}

function getAssetLifetimeOdometer(asset) {
  const sources = getAssetDataSources(asset);
  const storedLifetime = getFirstAssetNumber(
    ...sources.flatMap((source) => [
      source?.currentLifetimeOdometer,
      source?.lifetimeOdometer,
      source?.lifetimeOdometerReading,
      source?.lifetimeMeterReading,
      source?.totalLifetimeOdometer,
      source?.totalDistance,
      source?.lifetimeHours,
    ]),
  );

  const currentOdometer = getAssetCurrentOdometer(asset);
  const currentMeterCycle =
    getFirstAssetNumber(
      ...sources.flatMap((source) => [
        source?.currentMeterCycle,
        source?.meterCycle,
        source?.assetMeterCycleNumber,
      ]),
    ) || 1;

  if (storedLifetime === 0 && currentMeterCycle === 1 && currentOdometer > 0) {
    return currentOdometer;
  }

  return storedLifetime;
}

function getAssetTankCapacity(asset) {
  return getNumericValue(
    asset?.fuelTankCapacity,
    asset?.tankCapacity,
    asset?.dieselTankCapacity,
    asset?.fuelCapacity,
  );
}

function AssetsMasterReport({
  selectedReport,
  currentUser,
  currentCompany,
  projects = [],
  assets = [],
  onBack,
}) {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [draftFilters, setDraftFilters] = useState(ASSETS_MASTER_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(ASSETS_MASTER_FILTERS);

  const rows = useMemo(
    () =>
      (assets || []).map((asset, index) => ({
        key:
          asset?.backendId ||
          asset?.assetBackendId ||
          asset?.databaseId ||
          asset?.id ||
          `asset-${index}`,
        assetId: getAssetLabel(asset),
        assetType: getAssetTypeLabel(asset),
        category: getAssetCategoryLabel(asset),
        project: getAssetProjectLabel(asset, projects),
        status: getAssetStatusLabel(asset),
        currentOdometer: getAssetCurrentOdometer(asset),
        lifetimeOdometer: getAssetLifetimeOdometer(asset),
        tankCapacity: getAssetTankCapacity(asset),
      })),
    [assets, projects],
  );

  const projectOptions = useMemo(
    () => [...new Set(rows.map((row) => row.project).filter(Boolean))].sort(),
    [rows],
  );

  const assetTypeOptions = useMemo(
    () =>
      [
        ...new Set(
          rows
            .map((row) => row.assetType)
            .filter((value) => value && value !== "-"),
        ),
      ].sort(),
    [rows],
  );

  const categoryOptions = useMemo(
    () =>
      [
        ...new Set(
          rows
            .map((row) => row.category)
            .filter((value) => value && value !== "-"),
        ),
      ].sort(),
    [rows],
  );

  const statusOptions = useMemo(
    () => [...new Set(rows.map((row) => row.status).filter(Boolean))].sort(),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const search = normalizeValue(appliedFilters.search);

    return rows.filter((row) => {
      if (
        appliedFilters.project !== "all" &&
        normalizeValue(row.project) !== normalizeValue(appliedFilters.project)
      )
        return false;

      if (
        appliedFilters.assetType !== "all" &&
        normalizeValue(row.assetType) !==
          normalizeValue(appliedFilters.assetType)
      )
        return false;

      if (
        appliedFilters.category !== "all" &&
        normalizeValue(row.category) !== normalizeValue(appliedFilters.category)
      )
        return false;

      if (
        appliedFilters.status !== "all" &&
        normalizeValue(row.status) !== normalizeValue(appliedFilters.status)
      )
        return false;

      if (
        search &&
        ![
          row.assetId,
          row.assetType,
          row.category,
          row.project,
          row.status,
        ].some((value) => normalizeValue(value).includes(search))
      )
        return false;

      return true;
    });
  }, [rows, appliedFilters]);

  const pagination = useReportPagination(filteredRows);
  const paginatedRows = pagination.paginatedItems;

  const totals = useMemo(
    () => ({
      assets: filteredRows.length,
      active: filteredRows.filter(
        (row) => normalizeValue(row.status) === "active",
      ).length,
      inactive: filteredRows.filter(
        (row) => normalizeValue(row.status) === "inactive",
      ).length,
      deleted: filteredRows.filter(
        (row) => normalizeValue(row.status) === "deleted",
      ).length,
    }),
    [filteredRows],
  );

  const filterSummary = useMemo(
    () => [
      {
        label: "Project",
        value:
          appliedFilters.project === "all"
            ? "All Projects"
            : appliedFilters.project,
      },
      {
        label: "Asset Type",
        value:
          appliedFilters.assetType === "all"
            ? "All Asset Types"
            : appliedFilters.assetType,
      },
      {
        label: "Category",
        value:
          appliedFilters.category === "all"
            ? "All Categories"
            : appliedFilters.category,
      },
      {
        label: "Status",
        value:
          appliedFilters.status === "all"
            ? "All Statuses"
            : formatOperationType(appliedFilters.status),
      },
      { label: "Search", value: appliedFilters.search || "No search text" },
    ],
    [appliedFilters],
  );

  const reportMeta = {
    title: selectedReport?.title || "Assets Master Report",
    companyName: currentCompany?.name || "Fleet Fuel PRO",
    generatedBy: getUserDisplayName(currentUser),
    generatedAt: new Date().toLocaleString("en-GB"),
    filters: filterSummary,
  };

  const handlePrint = () => {
    printReport({
      ...reportMeta,
      totals: [
        { label: "Total Assets", value: totals.assets },
        { label: "Active Assets", value: totals.active },
        { label: "Inactive Assets", value: totals.inactive },
        { label: "Deleted Assets", value: totals.deleted },
      ],
      columns: ASSETS_MASTER_HEADERS,
      rows: filteredRows.map((row) => [
        row.assetId,
        row.assetType,
        row.category,
        row.project,
        formatOperationType(row.status),
        formatNumber(row.currentOdometer),
        formatNumber(row.lifetimeOdometer),
        formatNumber(row.tankCapacity),
      ]),
      footerRow: [
        "Total Assets",
        "",
        "",
        "",
        `${totals.assets} assets`,
        "",
        "",
        "",
      ],
    });
  };

  const handleExport = () => {
    exportReportToExcel({
      fileName: "Assets_Master_Report",
      sheetName: "Assets Master",
      ...reportMeta,
      rows: filteredRows.map((row) => ({
        "Asset ID": row.assetId,
        "Asset Type": row.assetType,
        Category: row.category,
        "Assigned Project": row.project,
        Status: formatOperationType(row.status),
        "Current Odometer": row.currentOdometer,
        "Lifetime Odometer": row.lifetimeOdometer,
        "Fuel Tank Capacity (L)": row.tankCapacity,
      })),
      totals: {
        "Asset ID": "Total Assets",
        Status: `${totals.assets} assets / ${totals.active} active / ${totals.inactive} inactive / ${totals.deleted} deleted`,
      },
    });
  };

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setReportGenerated(true);
    pagination.resetPage();
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    setDraftFilters(ASSETS_MASTER_FILTERS);
    setAppliedFilters(ASSETS_MASTER_FILTERS);
    pagination.resetPage();
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
                <span aria-hidden="true">←</span> Back to Reports
              </button>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400">
                Assets Reports
              </p>
              <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                {selectedReport?.title}
              </h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
                {selectedReport?.description}
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
                🚜
              </div>
              <h2 className="mt-5 text-xl font-black text-white sm:text-2xl">
                Select asset report filters first
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Choose the project, asset type, category and status, then
                generate the asset register.
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
                  <p className="mt-1 truncate text-sm font-extrabold text-slate-200">
                    {item.value}
                  </p>
                </div>
              ))}
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Total Assets", totals.assets],
                ["Active Assets", totals.active],
                ["Inactive Assets", totals.inactive],
                ["Deleted Assets", totals.deleted],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-amber-500/25 bg-slate-900/80 p-4 shadow-lg shadow-black/10"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">{value}</p>
                </div>
              ))}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/10">
              <div className="flex flex-col gap-2 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-extrabold text-white">
                    Assets Master Register
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {filteredRows.length} asset
                    {filteredRows.length === 1 ? "" : "s"} found
                  </p>
                </div>
                <p className="text-xs font-bold text-amber-300">
                  Master asset data
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1350px] w-full table-fixed border-collapse text-sm">
                  <colgroup>
                    <col className="w-[14%]" />
                    <col className="w-[14%]" />
                    <col className="w-[13%]" />
                    <col className="w-[13%]" />
                    <col className="w-[10%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                  </colgroup>
                  <thead className="bg-slate-950/90">
                    <tr>
                      {ASSETS_MASTER_HEADERS.map((header, index) => (
                        <th
                          key={header}
                          className={`whitespace-nowrap border-b border-slate-800 px-3 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400 ${index >= 5 ? "text-right" : "text-left"}`}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length ? (
                      paginatedRows.map((row) => (
                        <tr
                          key={row.key}
                          className="border-b border-slate-800/70 transition hover:bg-slate-800/30"
                        >
                          <td className="whitespace-nowrap px-3 py-3 font-extrabold text-amber-300">
                            {row.assetId}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                            {row.assetType}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                            {row.category}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-bold text-white">
                            {row.project}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-300">
                            {formatOperationType(row.status)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right font-extrabold text-white">
                            {formatNumber(row.currentOdometer)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right font-extrabold text-amber-300">
                            {formatNumber(row.lifetimeOdometer)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right font-extrabold text-emerald-300">
                            {formatNumber(row.tankCapacity)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={ASSETS_MASTER_HEADERS.length}
                          className="px-6 py-12 text-center text-slate-500"
                        >
                          No assets match the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-950/80">
                    <tr className="font-black text-white">
                      <td className="px-3 py-3" colSpan={4}>
                        Total Assets
                      </td>
                      <td className="px-3 py-3 text-amber-300">
                        {filteredRows.length}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <ReportPagination pagination={pagination} itemLabel="assets" />
            </section>
          </>
        )}

        {filtersOpen ? (
          <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm">
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => setFiltersOpen(false)}
              className="absolute inset-0 h-full w-full"
            />
            <aside className="absolute right-0 top-0 z-10 flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-900 shadow-2xl shadow-black/50">
              <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                    Report Setup
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white">
                    Assets Master Filters
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Close filters"
                  onClick={() => setFiltersOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/70 text-lg text-slate-400 transition hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Asset Search
                  </span>
                  <input
                    type="text"
                    value={draftFilters.search}
                    onChange={(event) =>
                      setDraftFilters((previous) => ({
                        ...previous,
                        search: event.target.value,
                      }))
                    }
                    placeholder="Asset ID, type, category or project"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Project
                  </span>
                  <select
                    value={draftFilters.project}
                    onChange={(event) =>
                      setDraftFilters((previous) => ({
                        ...previous,
                        project: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="all">All Projects</option>
                    {projectOptions.map((project) => (
                      <option key={project} value={project}>
                        {project}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Asset Type
                  </span>
                  <select
                    value={draftFilters.assetType}
                    onChange={(event) =>
                      setDraftFilters((previous) => ({
                        ...previous,
                        assetType: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="all">All Asset Types</option>
                    {assetTypeOptions.map((assetType) => (
                      <option key={assetType} value={assetType}>
                        {assetType}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Category
                  </span>
                  <select
                    value={draftFilters.category}
                    onChange={(event) =>
                      setDraftFilters((previous) => ({
                        ...previous,
                        category: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="all">All Categories</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Status
                  </span>
                  <select
                    value={draftFilters.status}
                    onChange={(event) =>
                      setDraftFilters((previous) => ({
                        ...previous,
                        status: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="all">All Statuses</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {formatOperationType(status)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-800 px-5 py-4">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-slate-300 hover:border-slate-500 hover:text-white"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={applyFilters}
                  className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-amber-400"
                >
                  {reportGenerated ? "Update Report" : "Generate Report"}
                </button>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const ASSET_TRANSFER_FILTERS = {
  dateFrom: "",
  dateTo: "",
  assetId: "all",
  sourceProjectId: "all",
  destinationProjectId: "all",
  requestedBy: "all",
  transferType: "all",
  status: "all",
  transferReference: "",
};

const ASSET_TRANSFER_HEADERS = [
  "Transfer Reference",
  "Asset ID",
  "Transfer Type",
  "From Project",
  "To Project",
  "Requested By",
  "Requested Date",
  "Approved / Rejected Date",
  "Transfer Date",
  "Status",
];

function getTransferAsset(transfer) {
  return transfer?.asset || transfer?.payload?.transfer?.asset || null;
}

function getTransferProject(transfer, side) {
  if (side === "from") {
    return (
      transfer?.fromProject || transfer?.payload?.transfer?.fromProject || null
    );
  }

  return transfer?.toProject || transfer?.payload?.transfer?.toProject || null;
}

function getTransferRequester(transfer) {
  return (
    transfer?.requestedBy ||
    transfer?.requester ||
    transfer?.requestedByUser ||
    transfer?.payload?.transfer?.requestedBy ||
    transfer?.payload?.transfer?.requester ||
    null
  );
}

function getTransferBatchId(transfer) {
  return (
    transfer?.transferBatchId ||
    transfer?.batchId ||
    transfer?.payload?.transferBatchId ||
    transfer?.payload?.transfer?.transferBatchId ||
    null
  );
}

function getTransferId(transfer) {
  return (
    transfer?.id ||
    transfer?.assetTransferId ||
    transfer?.payload?.assetTransferId ||
    transfer?.payload?.transfer?.id ||
    ""
  );
}

function makeTransferReference(transfer) {
  const batchId = getTransferBatchId(transfer);
  if (batchId) return batchId;

  const id = String(getTransferId(transfer) || "").replace(
    /^ASSET-TRANSFER-/i,
    "",
  );
  return id ? `ATR-${id.slice(-8).toUpperCase()}` : "ATR-UNKNOWN";
}

function getTransferUserLabel(transfer) {
  const requester = getTransferRequester(transfer);

  return (
    requester?.fullName ||
    requester?.name ||
    requester?.email ||
    transfer?.requestedByName ||
    transfer?.requesterName ||
    transfer?.requestedByUserName ||
    transfer?.requestedByUserId ||
    "-"
  );
}

function getTransferProjectLabel(transfer, side) {
  const project = getTransferProject(transfer, side);

  if (project) return getProjectLabel(project);

  return (
    (side === "from"
      ? transfer?.fromProjectName || transfer?.fromProjectId
      : transfer?.toProjectName || transfer?.toProjectId) || "-"
  );
}

function getTransferAssetLabel(transfer) {
  const asset = getTransferAsset(transfer);

  return (
    asset?.assetId ||
    asset?.equipmentNo ||
    asset?.equipmentNumber ||
    transfer?.assetCode ||
    transfer?.assetName ||
    transfer?.assetId ||
    "-"
  );
}

function AssetTransferHistoryReport({
  selectedReport,
  currentUser,
  currentCompany,
  projects = [],
  assets = [],
  onBack,
}) {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [draftFilters, setDraftFilters] = useState(ASSET_TRANSFER_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(ASSET_TRANSFER_FILTERS);
  const [transferHistory, setTransferHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTransferReference, setSelectedTransferReference] =
    useState(null);

  const rows = useMemo(
    () =>
      (transferHistory || []).map((transfer, index) => {
        const batchId = getTransferBatchId(transfer);
        const sourceProject = getTransferProject(transfer, "from");
        const destinationProject = getTransferProject(transfer, "to");
        const asset = getTransferAsset(transfer);
        const requester = getTransferRequester(transfer);

        return {
          key: getTransferId(transfer) || `asset-transfer-${index}`,
          transferReference: makeTransferReference(transfer),
          batchId: batchId || "-",
          assetId: getTransferAssetLabel(transfer),
          assetBackendId: asset?.id || transfer?.assetId || "",
          transferType: batchId ? "BULK" : "SINGLE",
          sourceProject: getTransferProjectLabel(transfer, "from"),
          sourceProjectId: sourceProject?.id || transfer?.fromProjectId || "",
          destinationProject: getTransferProjectLabel(transfer, "to"),
          destinationProjectId:
            destinationProject?.id || transfer?.toProjectId || "",
          requestedBy: getTransferUserLabel(transfer),
          requestedById: requester?.id || transfer?.requestedByUserId || "",
          requestedDate:
            transfer?.requestedAt ||
            transfer?.createdAt ||
            transfer?.payload?.transfer?.createdAt ||
            "",
          approvedDate:
            transfer?.approvedAt ||
            transfer?.payload?.transfer?.approvedAt ||
            "",
          rejectedDate:
            transfer?.rejectedAt ||
            transfer?.payload?.transfer?.rejectedAt ||
            "",
          reviewDate:
            transfer?.approvedAt ||
            transfer?.payload?.transfer?.approvedAt ||
            transfer?.rejectedAt ||
            transfer?.payload?.transfer?.rejectedAt ||
            "",
          transferDate:
            transfer?.appliedAt ||
            transfer?.payload?.transfer?.appliedAt ||
            transfer?.approvedAt ||
            transfer?.payload?.transfer?.approvedAt ||
            "",
          status:
            transfer?.status ||
            transfer?.payload?.transfer?.status ||
            "PENDING",
        };
      }),
    [transferHistory],
  );

  const selectedTransferGroup = useMemo(() => {
    if (!selectedTransferReference) return null;

    const matchedRows = rows.filter(
      (row) =>
        normalizeValue(row.transferReference) ===
        normalizeValue(selectedTransferReference),
    );

    if (!matchedRows.length) return null;

    const firstRow = matchedRows[0];

    return {
      transferReference: firstRow.transferReference,
      transferType: firstRow.transferType,
      batchId: firstRow.batchId,
      sourceProject: firstRow.sourceProject,
      destinationProject: firstRow.destinationProject,
      requestedBy: firstRow.requestedBy,
      requestedDate: firstRow.requestedDate,
      reviewDate: firstRow.reviewDate,
      transferDate: firstRow.transferDate,
      status: firstRow.status,
      assets: matchedRows.map((row) => ({
        key: row.key,
        assetId: row.assetId,
        status: row.status,
      })),
    };
  }, [rows, selectedTransferReference]);

  const requesterOptions = useMemo(() => {
    const options = new Map();

    rows.forEach((row) => {
      const key = row.requestedById || row.requestedBy;
      if (key && row.requestedBy && row.requestedBy !== "-") {
        options.set(String(key), row.requestedBy);
      }
    });

    return [...options.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const transferReferenceSearch = normalizeValue(
      appliedFilters.transferReference,
    );
    return rows.filter((row) => {
      const requestedDate = row.requestedDate
        ? new Date(row.requestedDate)
        : null;

      if (
        appliedFilters.dateFrom &&
        (!requestedDate ||
          requestedDate < new Date(`${appliedFilters.dateFrom}T00:00:00`))
      ) {
        return false;
      }

      if (
        appliedFilters.dateTo &&
        (!requestedDate ||
          requestedDate > new Date(`${appliedFilters.dateTo}T23:59:59`))
      ) {
        return false;
      }

      if (
        appliedFilters.assetId !== "all" &&
        normalizeValue(row.assetBackendId || row.assetId) !==
          normalizeValue(appliedFilters.assetId)
      ) {
        return false;
      }

      if (
        appliedFilters.sourceProjectId !== "all" &&
        normalizeValue(row.sourceProjectId) !==
          normalizeValue(appliedFilters.sourceProjectId)
      ) {
        return false;
      }

      if (
        appliedFilters.destinationProjectId !== "all" &&
        normalizeValue(row.destinationProjectId) !==
          normalizeValue(appliedFilters.destinationProjectId)
      ) {
        return false;
      }

      if (
        appliedFilters.requestedBy !== "all" &&
        ![
          normalizeValue(row.requestedById),
          normalizeValue(row.requestedBy),
        ].includes(normalizeValue(appliedFilters.requestedBy))
      ) {
        return false;
      }

      if (
        appliedFilters.transferType !== "all" &&
        normalizeValue(row.transferType) !==
          normalizeValue(appliedFilters.transferType)
      ) {
        return false;
      }

      if (
        appliedFilters.status !== "all" &&
        normalizeValue(row.status) !== normalizeValue(appliedFilters.status)
      ) {
        return false;
      }

      if (
        transferReferenceSearch &&
        !normalizeValue(row.transferReference).includes(transferReferenceSearch)
      ) {
        return false;
      }

      return true;
    });
  }, [rows, appliedFilters]);

  const pagination = useReportPagination(filteredRows);
  const paginatedRows = pagination.paginatedItems;

  const totals = useMemo(
    () => ({
      records: filteredRows.length,
      singleTransfers: filteredRows.filter(
        (row) => row.transferType === "SINGLE",
      ).length,
      bulkAssets: filteredRows.filter((row) => row.transferType === "BULK")
        .length,
      batches: new Set(
        filteredRows
          .map((row) => row.batchId)
          .filter((value) => value && value !== "-"),
      ).size,
    }),
    [filteredRows],
  );

  const filterSummary = useMemo(() => {
    const asset = assets.find(
      (item) =>
        normalizeValue(getAssetFilterValue(item)) ===
        normalizeValue(appliedFilters.assetId),
    );
    const sourceProject = projects.find(
      (item) =>
        normalizeValue(getProjectBackendId(item)) ===
        normalizeValue(appliedFilters.sourceProjectId),
    );
    const destinationProject = projects.find(
      (item) =>
        normalizeValue(getProjectBackendId(item)) ===
        normalizeValue(appliedFilters.destinationProjectId),
    );
    const requester = requesterOptions.find(
      (item) =>
        normalizeValue(item.value) ===
        normalizeValue(appliedFilters.requestedBy),
    );

    return [
      {
        label: "Period",
        value:
          appliedFilters.dateFrom || appliedFilters.dateTo
            ? `${formatReportDate(appliedFilters.dateFrom)} → ${formatReportDate(
                appliedFilters.dateTo,
              )}`
            : "All dates",
      },
      {
        label: "Asset",
        value:
          appliedFilters.assetId === "all"
            ? "All Assets"
            : getAssetLabel(asset),
      },
      {
        label: "Source Project",
        value:
          appliedFilters.sourceProjectId === "all"
            ? "All Projects"
            : getProjectLabel(sourceProject),
      },
      {
        label: "Destination Project",
        value:
          appliedFilters.destinationProjectId === "all"
            ? "All Projects"
            : getProjectLabel(destinationProject),
      },
      {
        label: "Requested By",
        value:
          appliedFilters.requestedBy === "all"
            ? "All Requesters"
            : requester?.label || appliedFilters.requestedBy,
      },
      {
        label: "Transfer Type",
        value:
          appliedFilters.transferType === "all"
            ? "Single & Bulk"
            : formatOperationType(appliedFilters.transferType),
      },
      {
        label: "Status",
        value:
          appliedFilters.status === "all"
            ? "All Statuses"
            : formatOperationType(appliedFilters.status),
      },
      {
        label: "Transfer Ref",
        value: appliedFilters.transferReference || "All References",
      },
    ];
  }, [appliedFilters, assets, projects, requesterOptions]);

  const reportMeta = {
    title: selectedReport?.title || "Asset Transfer History",
    companyName: currentCompany?.name || "Fleet Fuel PRO",
    generatedBy: getUserDisplayName(currentUser),
    generatedAt: new Date().toLocaleString("en-GB"),
    filters: filterSummary,
  };

  const handlePrint = () => {
    printReport({
      ...reportMeta,
      totals: [
        { label: "Transfer Records", value: totals.records },
        { label: "Single Transfers", value: totals.singleTransfers },
        { label: "Bulk Assets", value: totals.bulkAssets },
        { label: "Bulk Batches", value: totals.batches },
      ],
      columns: ASSET_TRANSFER_HEADERS,
      rows: filteredRows.map((row) => [
        row.transferReference,
        row.assetId,
        formatOperationType(row.transferType),
        row.sourceProject,
        row.destinationProject,
        row.requestedBy,
        formatDateTime(row.requestedDate),
        formatDateTime(row.reviewDate),
        formatDateTime(row.transferDate),
        formatOperationType(row.status),
      ]),
    });
  };

  const handleExport = () => {
    exportReportToExcel({
      fileName: "Asset_Transfer_History",
      sheetName: "Asset Transfers",
      ...reportMeta,
      rows: filteredRows.map((row) => ({
        "Transfer Ref": row.transferReference,
        "Batch ID": row.batchId === "-" ? "" : row.batchId,
        "Asset ID": row.assetId,
        "Transfer Type": formatOperationType(row.transferType),
        "From Project": row.sourceProject,
        "To Project": row.destinationProject,
        "Requested By": row.requestedBy,
        "Requested Date": formatDateTime(row.requestedDate),
        "Approved / Rejected Date": formatDateTime(row.reviewDate),
        "Transfer Date": formatDateTime(row.transferDate),
        Status: formatOperationType(row.status),
      })),
      totals: {
        "Transfer Ref": "Totals",
        "Asset ID": `${totals.records} records`,
        "Transfer Type": `${totals.singleTransfers} single / ${totals.bulkAssets} bulk assets`,
        Status: `${totals.batches} bulk batches`,
      },
    });
  };

  const handleFilterChange = (field, value) => {
    setDraftFilters((previous) => ({ ...previous, [field]: value }));
  };

  const applyFilters = async () => {
    setLoading(true);
    setError("");

    try {
      const companyId =
        currentCompany?.backendId ||
        currentCompany?.companyBackendId ||
        currentCompany?.id ||
        currentUser?.companyId ||
        "";

      const result = await fetchAssetTransferHistory({
        companyId,
      });

      setTransferHistory(Array.isArray(result) ? result : []);
      setAppliedFilters(draftFilters);
      setReportGenerated(true);
      pagination.resetPage();
      setFiltersOpen(false);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Failed to load asset transfer history.",
      );
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setDraftFilters(ASSET_TRANSFER_FILTERS);
    setAppliedFilters(ASSET_TRANSFER_FILTERS);
    pagination.resetPage();
  };

  return (
    <div className="min-h-full bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1900px] space-y-5">
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
                Assets Reports
              </p>
              <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                {selectedReport?.title}
              </h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
                {selectedReport?.description}
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

        {error ? (
          <section className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-200">
            {error}
          </section>
        ) : null}

        {!reportGenerated ? (
          <section className="rounded-2xl border border-amber-500/30 bg-slate-900/80 px-6 py-14 text-center shadow-xl shadow-black/10">
            <div className="mx-auto flex max-w-xl flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-3xl">
                🔁
              </div>
              <h2 className="mt-5 text-xl font-black text-white sm:text-2xl">
                Select asset transfer filters first
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Choose the period, asset, source project, destination project,
                requester, transfer type and status, then generate the report.
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
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
              {filterSummary.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-1 truncate text-sm font-extrabold text-slate-200">
                    {item.value}
                  </p>
                </div>
              ))}
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Transfer Records", totals.records],
                ["Single Transfer Records", totals.singleTransfers],
                ["Bulk Transfer Records", totals.bulkAssets],
                ["Unique Bulk Batches", totals.batches],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-amber-500/25 bg-slate-900/80 p-4 shadow-lg shadow-black/10"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">{value}</p>
                </div>
              ))}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/10">
              <div className="flex flex-col gap-2 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-extrabold text-white">
                    Asset Transfer Records
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {filteredRows.length} transfer record
                    {filteredRows.length === 1 ? "" : "s"} found
                  </p>
                </div>
                <p className="text-xs font-bold text-amber-300">
                  Single and bulk transfers
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1500px] w-full border-collapse text-sm">
                  <thead className="bg-slate-950/90">
                    <tr>
                      {ASSET_TRANSFER_HEADERS.map((header) => (
                        <th
                          key={header}
                          className="whitespace-nowrap border-b border-slate-800 px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-400"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length ? (
                      paginatedRows.map((row) => (
                        <tr
                          key={row.key}
                          className="border-b border-slate-800/70 transition hover:bg-slate-800/30"
                        >
                          <td className="whitespace-nowrap px-3 py-3">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedTransferReference(
                                  row.transferReference,
                                )
                              }
                              className="font-extrabold text-amber-300 underline-offset-4 transition hover:text-amber-200 hover:underline"
                            >
                              {row.transferReference}
                            </button>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-extrabold text-white">
                            {row.assetId}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                            {formatOperationType(row.transferType)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                            {row.sourceProject}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                            {row.destinationProject}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                            {row.requestedBy}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                            {formatDateTime(row.requestedDate)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                            {formatDateTime(row.reviewDate)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                            {formatDateTime(row.transferDate)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold ${
                                normalizeValue(row.status) === "approved"
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                  : normalizeValue(row.status) === "rejected"
                                    ? "border-red-500/30 bg-red-500/10 text-red-300"
                                    : normalizeValue(row.status) ===
                                        "partially_approved"
                                      ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
                                      : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                              }`}
                            >
                              {formatOperationType(row.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={ASSET_TRANSFER_HEADERS.length}
                          className="px-6 py-12 text-center text-slate-500"
                        >
                          No asset transfers match the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <ReportPagination pagination={pagination} itemLabel="transfers" />
            </section>
          </>
        )}

        {selectedTransferGroup ? (
          <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
            <button
              type="button"
              aria-label="Close transfer details"
              onClick={() => setSelectedTransferReference(null)}
              className="absolute inset-0 h-full w-full"
            />

            <section className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60">
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
                    Transfer Details
                  </p>
                  <h2 className="mt-1 break-all text-xl font-black text-white sm:text-2xl">
                    {selectedTransferGroup.transferReference}
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    {selectedTransferGroup.transferType === "BULK"
                      ? `${selectedTransferGroup.assets.length} assets included in this batch`
                      : "Single asset transfer"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTransferReference(null)}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-bold text-slate-300 transition hover:border-slate-500 hover:text-white"
                >
                  Close
                </button>
              </div>

              <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-5 py-5">
                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    [
                      "Transfer Type",
                      formatOperationType(selectedTransferGroup.transferType),
                    ],
                    ["From Project", selectedTransferGroup.sourceProject],
                    ["To Project", selectedTransferGroup.destinationProject],
                    ["Requested By", selectedTransferGroup.requestedBy],
                    [
                      "Requested Date",
                      formatDateTime(selectedTransferGroup.requestedDate),
                    ],
                    [
                      "Approved / Rejected Date",
                      formatDateTime(selectedTransferGroup.reviewDate),
                    ],
                    [
                      "Transfer Date",
                      formatDateTime(selectedTransferGroup.transferDate),
                    ],
                    [
                      "Status",
                      formatOperationType(selectedTransferGroup.status),
                    ],
                    ["Assets Count", selectedTransferGroup.assets.length],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                    >
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                        {label}
                      </p>
                      <p className="mt-1 break-words text-sm font-extrabold text-slate-200">
                        {value}
                      </p>
                    </div>
                  ))}
                </section>

                <section className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-4 py-3">
                    <div>
                      <h3 className="font-extrabold text-white">
                        Assets Included
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        All assets linked to this transfer reference
                      </p>
                    </div>
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-300">
                      {selectedTransferGroup.assets.length}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] border-collapse text-sm">
                      <thead className="bg-slate-950/90">
                        <tr>
                          {["No.", "Asset ID", "Status"].map((header) => (
                            <th
                              key={header}
                              className="border-b border-slate-800 px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-400"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTransferGroup.assets.map((asset, index) => (
                          <tr
                            key={asset.key}
                            className="border-b border-slate-800/70 last:border-b-0"
                          >
                            <td className="px-4 py-3 text-slate-500">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3 font-extrabold text-white">
                              {asset.assetId}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold ${
                                  normalizeValue(asset.status) === "approved"
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                    : normalizeValue(asset.status) ===
                                        "rejected"
                                      ? "border-red-500/30 bg-red-500/10 text-red-300"
                                      : normalizeValue(asset.status) ===
                                          "partially_approved"
                                        ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
                                        : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                }`}
                              >
                                {formatOperationType(asset.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </section>
          </div>
        ) : null}

        {filtersOpen ? (
          <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm">
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => setFiltersOpen(false)}
              className="absolute inset-0 h-full w-full"
            />

            <aside className="absolute right-0 top-0 z-10 flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-900 shadow-2xl shadow-black/50">
              <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                    Report Setup
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white">
                    Asset Transfer Filters
                  </h2>
                </div>

                <button
                  type="button"
                  aria-label="Close filters"
                  onClick={() => setFiltersOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/70 text-lg text-slate-400 transition hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-2 gap-3">
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
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
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
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Asset
                  </span>
                  <select
                    value={draftFilters.assetId}
                    onChange={(event) =>
                      handleFilterChange("assetId", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="all">All Assets</option>
                    {assets.map((asset) => (
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
                    Transfer Reference
                  </span>
                  <input
                    type="text"
                    value={draftFilters.transferReference}
                    onChange={(event) =>
                      handleFilterChange(
                        "transferReference",
                        event.target.value,
                      )
                    }
                    placeholder="ATB-... or ATR-..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Source Project
                  </span>
                  <select
                    value={draftFilters.sourceProjectId}
                    onChange={(event) =>
                      handleFilterChange("sourceProjectId", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="all">All Projects</option>
                    {projects.map((project) => (
                      <option
                        key={
                          getProjectBackendId(project) ||
                          getProjectLabel(project)
                        }
                        value={getProjectBackendId(project)}
                      >
                        {getProjectLabel(project)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Destination Project
                  </span>
                  <select
                    value={draftFilters.destinationProjectId}
                    onChange={(event) =>
                      handleFilterChange(
                        "destinationProjectId",
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="all">All Projects</option>
                    {projects.map((project) => (
                      <option
                        key={
                          getProjectBackendId(project) ||
                          getProjectLabel(project)
                        }
                        value={getProjectBackendId(project)}
                      >
                        {getProjectLabel(project)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Requested By
                  </span>
                  <select
                    value={draftFilters.requestedBy}
                    onChange={(event) =>
                      handleFilterChange("requestedBy", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="all">All Requesters</option>
                    {requesterOptions.map((requester) => (
                      <option key={requester.value} value={requester.value}>
                        {requester.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Transfer Type
                  </span>
                  <select
                    value={draftFilters.transferType}
                    onChange={(event) =>
                      handleFilterChange("transferType", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="all">Single & Bulk</option>
                    <option value="SINGLE">Single Transfer</option>
                    <option value="BULK">Bulk Transfer</option>
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
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="PARTIALLY_APPROVED">
                      Partially Approved
                    </option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-800 px-5 py-4">
                <button
                  type="button"
                  onClick={resetFilters}
                  disabled={loading}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-slate-300 hover:border-slate-500 hover:text-white disabled:opacity-50"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={applyFilters}
                  disabled={loading}
                  className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60"
                >
                  {loading
                    ? "Generating..."
                    : reportGenerated
                      ? "Update Report"
                      : "Generate Report"}
                </button>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const ASSET_METER_HISTORY_FILTERS = {
  dateFrom: "",
  dateTo: "",
  projectId: "all",
  assetId: "all",
  eventType: "all",
  meterCycle: "all",
};

const ASSET_METER_HISTORY_HEADERS = [
  "Date",
  "Asset",
  "Project",
  "Event Source",
  "Meter Cycle",
  "Previous Reading",
  "Current Reading",
  "Lifetime Reading",
  "Reason",
  "Reference",
  "Performed By",
];

function getCompanyBackendId(currentCompany, currentUser) {
  return (
    currentCompany?.backendId ||
    currentCompany?.companyBackendId ||
    currentCompany?.databaseId ||
    currentCompany?.id ||
    currentUser?.companyId ||
    ""
  );
}

function getOperationAssetBackendId(operation) {
  return (
    operation?.assetId ||
    operation?.asset?.id ||
    operation?.assetBackendId ||
    operation?.destinationAssetId ||
    ""
  );
}

function getOperationAssetCode(operation, row, headers = []) {
  return (
    operation?.asset?.assetId ||
    operation?.assetCode ||
    operation?.equipmentNo ||
    getRowValue(row, headers, [
      "asset_id",
      "asset",
      "equipment_no",
      "equipment_number",
      "destination_id",
      "destination",
    ]) ||
    "-"
  );
}

function getMeterEventLabel(eventType) {
  if (eventType === "RESET") return "Odometer Reset";
  if (eventType === "CORRECTION") return "Odometer Correction";
  return "Refuel Operation";
}

function AssetMeterHistoryReport({
  selectedReport,
  currentUser,
  currentCompany,
  projects = [],
  assets = [],
  data = [],
  headers = [],
  onBack,
}) {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [draftFilters, setDraftFilters] = useState(ASSET_METER_HISTORY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(
    ASSET_METER_HISTORY_FILTERS,
  );
  const [resetEvents, setResetEvents] = useState([]);
  const [correctionEvents, setCorrectionEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const availableAssets = useMemo(() => {
    if (draftFilters.projectId === "all") return assets;

    return assets.filter((asset) => {
      const projectId =
        asset?.projectId || asset?.project?.id || asset?.projectBackendId || "";
      return (
        normalizeValue(projectId) === normalizeValue(draftFilters.projectId)
      );
    });
  }, [assets, draftFilters.projectId]);

  const operationEvents = useMemo(() => {
    return (data || [])
      .map((row, index) => {
        const operation = getEmbeddedOperation(row);
        const reading = getNumericValue(
          operation?.odometer,
          operation?.currentOdometer,
          operation?.meterReading,
          getRowValue(row, headers, [
            "odometer",
            "odometer_reading",
            "meter_reading",
            "current_odometer",
          ]),
        );

        const hasReading = [
          operation?.odometer,
          operation?.currentOdometer,
          operation?.meterReading,
          getRowValue(row, headers, [
            "odometer",
            "odometer_reading",
            "meter_reading",
            "current_odometer",
          ]),
        ].some(
          (value) => value !== undefined && value !== null && value !== "",
        );

        if (!hasReading) return null;

        const eventDate =
          operation?.transactionDateTime ||
          operation?.transactionDate ||
          operation?.createdAt ||
          getRowValue(row, headers, [
            "transaction_datetime",
            "transaction_date",
            "operation_date",
            "date",
            "created_at",
          ]);

        const assetBackendId = getOperationAssetBackendId(operation);
        const assetCode = getOperationAssetCode(operation, row, headers);
        const projectId =
          operation?.asset?.projectId ||
          operation?.asset?.project?.id ||
          operation?.projectId ||
          "";
        const projectName =
          operation?.asset?.project?.name ||
          operation?.asset?.project?.code ||
          operation?.project?.name ||
          resolveProjectLabel({
            source: "",
            destination: assetCode,
            projects,
            assets,
            stations: [],
          });

        const previousReading = getNumericValue(
          operation?.previousOdometer,
          operation?.previousMeterReading,
          operation?.lastOdometer,
          getRowValue(row, headers, [
            "previous_odometer",
            "previous_meter_reading",
            "last_odometer",
          ]),
        );

        return {
          id: operation?.id || `operation-meter-${index}`,
          eventType: "REFUEL",
          eventSource: "REFUEL_OPERATION",
          eventDate,
          assetBackendId,
          assetId: assetCode,
          projectId,
          projectCode: operation?.asset?.project?.code || "",
          projectName: projectName || "-",
          previousReading,
          currentReading: reading,
          lifetimeReading: getNumericValue(
            operation?.lifetimeOdometer,
            operation?.assetLifetimeOdometer,
            getRowValue(row, headers, [
              "lifetime_odometer",
              "asset_lifetime_odometer",
            ]),
          ),
          previousMeterCycle:
            getNumericValue(operation?.assetMeterCycleNumber) || 1,
          meterCycle: getNumericValue(operation?.assetMeterCycleNumber) || 1,
          reason: "Refuel operation meter reading",
          reference:
            operation?.operationNo ||
            getRowValue(row, headers, [
              "operation_id",
              "operation_no",
              "operation no",
            ]) ||
            "-",
          performedBy:
            operation?.createdBy?.fullName ||
            operation?.createdBy?.email ||
            "-",
        };
      })
      .filter(Boolean);
  }, [data, headers, projects, assets]);

  const rows = useMemo(() => {
    /*
      Build one chronological meter timeline per asset before applying the
      visible report filters. Corrections remain independent audit events.

      The operations endpoint exposes the operation's final corrected value.
      To preserve the true audit trail, the first odometer correction for an
      operation restores that operation event's original reading from the
      correction old value. The correction row then shows old → new.
    */
    const correctionsByOperation = new Map();

    (correctionEvents || []).forEach((correction) => {
      const operationKey = normalizeValue(
        correction?.operationBackendId ||
          correction?.operationId ||
          correction?.operationNo ||
          correction?.operationReference ||
          "",
      );

      if (!operationKey) return;

      const operationCorrections =
        correctionsByOperation.get(operationKey) || [];
      operationCorrections.push(correction);
      correctionsByOperation.set(operationKey, operationCorrections);
    });

    correctionsByOperation.forEach((items) => {
      items.sort(
        (a, b) =>
          new Date(a.eventDate || a.appliedAt || a.createdAt).getTime() -
          new Date(b.eventDate || b.appliedAt || b.createdAt).getTime(),
      );
    });

    const restoredOperationEvents = operationEvents.map((event) => {
      const possibleKeys = [event?.id, event?.reference]
        .filter(Boolean)
        .map(normalizeValue);

      const firstCorrection = possibleKeys
        .map((key) => correctionsByOperation.get(key)?.[0])
        .find(Boolean);

      if (!firstCorrection) return event;

      const originalReading = Number(firstCorrection.previousReading);

      return Number.isFinite(originalReading)
        ? {
            ...event,
            currentReading: originalReading,
            operationalCurrentReading: Number(event.currentReading),
          }
        : event;
    });

    const eventsByAsset = new Map();

    [
      ...restoredOperationEvents,
      ...(correctionEvents || []),
      ...(resetEvents || []),
    ].forEach((event) => {
      const assetKey = normalizeValue(
        event?.assetBackendId || event?.assetId || "unknown-asset",
      );
      const assetEvents = eventsByAsset.get(assetKey) || [];
      assetEvents.push({ ...event });
      eventsByAsset.set(assetKey, assetEvents);
    });

    const timeline = [];

    eventsByAsset.forEach((assetEvents) => {
      const orderedEvents = [...assetEvents].sort((a, b) => {
        const timeDifference =
          new Date(a.eventDate || a.createdAt).getTime() -
          new Date(b.eventDate || b.createdAt).getTime();

        if (timeDifference !== 0) return timeDifference;

        // Deterministic ordering for equal timestamps: refuel first, then its
        // correction, then reset. This preserves operation → correction → reset.
        const eventPriority = { REFUEL: 1, CORRECTION: 2, RESET: 3 };
        return (
          (eventPriority[a.eventType] || 9) - (eventPriority[b.eventType] || 9)
        );
      });

      /*
        Keep the audit timeline and the operational meter chain separate.

        Corrections are displayed using their own application date, but they
        must not become the previous reading for a later refuel merely because
        the correction was applied later. Refuel and reset events alone advance
        the operational meter state.

        A corrected refuel may be displayed with its original reading so the
        audit trail remains visible, while `operationalCurrentReading` keeps the
        final corrected value that subsequent refuels and resets must follow.
      */
      let lastOperationalReading = null;

      orderedEvents.forEach((event) => {
        const displayedCurrentReading = Number(event.currentReading);
        const operationalCurrentReading = Number(
          event.operationalCurrentReading ?? event.currentReading,
        );
        const storedPreviousReading = Number(event.previousReading);

        const nextEvent = { ...event };

        if (event.eventType === "REFUEL") {
          nextEvent.previousReading =
            lastOperationalReading !== null
              ? lastOperationalReading
              : Number.isFinite(storedPreviousReading)
                ? storedPreviousReading
                : 0;

          if (Number.isFinite(operationalCurrentReading)) {
            lastOperationalReading = operationalCurrentReading;
          }
        } else if (event.eventType === "RESET") {
          nextEvent.previousReading =
            lastOperationalReading !== null
              ? lastOperationalReading
              : Number.isFinite(storedPreviousReading)
                ? storedPreviousReading
                : 0;

          if (Number.isFinite(displayedCurrentReading)) {
            lastOperationalReading = displayedCurrentReading;
          }
        }

        // CORRECTION remains an independent audit event. It does not advance
        // the operational chain because its final value is already reflected
        // in the corrected refuel event's operationalCurrentReading.
        timeline.push(nextEvent);
      });
    });

    const selectedAsset =
      appliedFilters.assetId === "all"
        ? null
        : assets.find(
            (asset) =>
              normalizeValue(getAssetFilterValue(asset)) ===
              normalizeValue(appliedFilters.assetId),
          );

    const selectedAssetCandidates = new Set(
      [
        normalizeValue(appliedFilters.assetId),
        ...(selectedAsset ? getAssetCandidates(selectedAsset) : []),
      ].filter(Boolean),
    );

    return timeline
      .filter((row) => {
        const rowDateValue = row.eventDate || row.createdAt;
        const rowDate = rowDateValue ? new Date(rowDateValue) : null;

        if (
          appliedFilters.dateFrom &&
          (!rowDate ||
            rowDate < new Date(`${appliedFilters.dateFrom}T00:00:00`))
        )
          return false;

        if (
          appliedFilters.dateTo &&
          (!rowDate ||
            rowDate > new Date(`${appliedFilters.dateTo}T23:59:59.999`))
        )
          return false;

        if (
          appliedFilters.projectId !== "all" &&
          normalizeValue(row.projectId) !==
            normalizeValue(appliedFilters.projectId)
        )
          return false;

        if (appliedFilters.assetId !== "all") {
          const rowAssetCandidates = [
            row.assetBackendId,
            row.assetId,
            row.assetCode,
          ]
            .filter(Boolean)
            .map(normalizeValue);

          if (
            !rowAssetCandidates.some((value) =>
              selectedAssetCandidates.has(value),
            )
          ) {
            return false;
          }
        }

        if (
          appliedFilters.eventType !== "all" &&
          normalizeValue(row.eventType) !==
            normalizeValue(appliedFilters.eventType)
        )
          return false;

        if (
          appliedFilters.meterCycle !== "all" &&
          String(row.meterCycle) !== String(appliedFilters.meterCycle)
        )
          return false;

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.eventDate || b.createdAt).getTime() -
          new Date(a.eventDate || a.createdAt).getTime(),
      );
  }, [operationEvents, correctionEvents, resetEvents, appliedFilters, assets]);

  const meterCycleOptions = useMemo(
    () =>
      [
        ...new Set(
          rows.map((row) => Number(row.meterCycle)).filter(Number.isFinite),
        ),
      ].sort((a, b) => a - b),
    [rows],
  );

  const pagination = useReportPagination(rows);
  const paginatedRows = pagination.paginatedItems;

  const totals = useMemo(
    () => ({
      events: rows.length,
      refuels: rows.filter((row) => row.eventType === "REFUEL").length,
      corrections: rows.filter((row) => row.eventType === "CORRECTION").length,
      resets: rows.filter((row) => row.eventType === "RESET").length,
    }),
    [rows],
  );

  const filterSummary = useMemo(() => {
    const selectedProject = projects.find(
      (project) =>
        normalizeValue(getProjectBackendId(project)) ===
        normalizeValue(appliedFilters.projectId),
    );
    const selectedAsset = assets.find(
      (asset) =>
        normalizeValue(getAssetFilterValue(asset)) ===
        normalizeValue(appliedFilters.assetId),
    );

    return [
      {
        label: "Period",
        value:
          appliedFilters.dateFrom || appliedFilters.dateTo
            ? `${formatReportDate(appliedFilters.dateFrom)} → ${formatReportDate(appliedFilters.dateTo)}`
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
        label: "Asset",
        value:
          appliedFilters.assetId === "all"
            ? "All Assets"
            : getAssetLabel(selectedAsset),
      },
      {
        label: "Event Type",
        value:
          appliedFilters.eventType === "all"
            ? "All Events"
            : formatOperationType(appliedFilters.eventType),
      },
      {
        label: "Meter Cycle",
        value:
          appliedFilters.meterCycle === "all"
            ? "All Cycles"
            : `Cycle ${appliedFilters.meterCycle}`,
      },
    ];
  }, [appliedFilters, projects, assets]);

  const reportMeta = {
    title: selectedReport?.title || "Asset Meter History Report",
    companyName: currentCompany?.name || "Fleet Fuel PRO",
    generatedBy: getUserDisplayName(currentUser),
    generatedAt: new Date().toLocaleString("en-GB"),
    filters: filterSummary,
  };

  const loadReport = async () => {
    setLoading(true);
    setError("");

    try {
      const companyId = getCompanyBackendId(currentCompany, currentUser);
      if (!companyId)
        throw new Error("Company ID is required to generate this report.");

      const reportParams = {
        companyId,
        projectId:
          draftFilters.projectId === "all" ? "" : draftFilters.projectId,
        assetId: draftFilters.assetId === "all" ? "" : draftFilters.assetId,
        dateFrom: draftFilters.dateFrom,
        dateTo: draftFilters.dateTo,
      };

      const [resetResult, correctionResult] = await Promise.all([
        fetchAssetMeterHistory(reportParams),
        fetchOdometerCorrectionHistory(reportParams),
      ]);

      setResetEvents(Array.isArray(resetResult) ? resetResult : []);
      setCorrectionEvents(
        Array.isArray(correctionResult) ? correctionResult : [],
      );
      setAppliedFilters(draftFilters);
      setReportGenerated(true);
      pagination.resetPage();
      setFiltersOpen(false);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Failed to load asset meter history.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    printReport({
      ...reportMeta,
      totals: [
        { label: "Total Meter Events", value: totals.events },
        { label: "Refuel Readings", value: totals.refuels },
        { label: "Odometer Corrections", value: totals.corrections },
        { label: "Meter Resets", value: totals.resets },
      ],
      columns: ASSET_METER_HISTORY_HEADERS,
      rows: rows.map((row) => [
        formatDateTime(row.eventDate || row.createdAt),
        row.assetId || "-",
        row.projectName || row.projectCode || "-",
        getMeterEventLabel(row.eventType),
        formatNumber(row.meterCycle, 0),
        formatNumber(row.previousReading),
        formatNumber(row.currentReading),
        formatNumber(row.lifetimeReading),
        row.reason || "-",
        row.reference || "-",
        row.performedBy || "-",
      ]),
    });
  };

  const handleExport = () => {
    exportReportToExcel({
      fileName: "Asset_Meter_History_Report",
      sheetName: "Meter History",
      ...reportMeta,
      rows: rows.map((row) => ({
        Date: formatDateTime(row.eventDate || row.createdAt),
        Asset: row.assetId || "-",
        Project: row.projectName || row.projectCode || "-",
        "Event Source": getMeterEventLabel(row.eventType),
        "Meter Cycle": row.meterCycle,
        "Previous Reading": row.previousReading,
        "Current Reading": row.currentReading,
        "Lifetime Reading": row.lifetimeReading,
        Reason: row.reason || "",
        Reference: row.reference || "",
        "Performed By": row.performedBy || "",
      })),
      totals: {
        Date: "Totals",
        Asset: `${totals.events} events`,
        Project: `${totals.refuels} refuel readings`,
        "Event Source": `${totals.corrections} corrections`,
        "Meter Cycle": `${totals.resets} resets`,
      },
    });
  };

  const handleFilterChange = (field, value) => {
    setDraftFilters((previous) => {
      const next = { ...previous, [field]: value };
      if (field === "projectId") next.assetId = "all";
      return next;
    });
  };

  const resetFilters = () => {
    setDraftFilters(ASSET_METER_HISTORY_FILTERS);
    setAppliedFilters(ASSET_METER_HISTORY_FILTERS);
    pagination.resetPage();
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
                <span aria-hidden="true">←</span> Back to Reports
              </button>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400">
                Assets Reports
              </p>
              <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                {selectedReport?.title}
              </h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
                {selectedReport?.description}
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
                ⏱️
              </div>
              <h2 className="mt-5 text-xl font-black text-white sm:text-2xl">
                Select asset meter filters first
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Choose the period, project, asset, event type and meter cycle,
                then generate the complete meter history.
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
                  <p className="mt-1 truncate text-sm font-extrabold text-slate-200">
                    {item.value}
                  </p>
                </div>
              ))}
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Total Meter Events", totals.events],
                ["Refuel Readings", totals.refuels],
                ["Odometer Corrections", totals.corrections],
                ["Meter Resets", totals.resets],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-amber-500/25 bg-slate-900/80 p-4 shadow-lg shadow-black/10"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">{value}</p>
                </div>
              ))}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/10">
              <div className="flex flex-col gap-2 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-extrabold text-white">
                    Asset Meter Timeline
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {rows.length} meter event{rows.length === 1 ? "" : "s"}{" "}
                    found
                  </p>
                </div>
                <p className="text-xs font-bold text-amber-300">
                  Refuel readings, corrections and odometer resets
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[1750px] w-full border-collapse text-sm">
                  <thead className="bg-slate-950/90">
                    <tr>
                      {ASSET_METER_HISTORY_HEADERS.map((header) => (
                        <th
                          key={header}
                          className="whitespace-nowrap border-b border-slate-800 px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-400"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length ? (
                      paginatedRows.map((row) => {
                        const isReset = row.eventType === "RESET";
                        const isCorrection = row.eventType === "CORRECTION";
                        const badgeClass = isReset
                          ? "border-purple-400/40 bg-purple-500/10 text-purple-300"
                          : isCorrection
                            ? "border-sky-400/40 bg-sky-500/10 text-sky-300"
                            : "border-emerald-400/40 bg-emerald-500/10 text-emerald-300";
                        const badgeLabel = isReset
                          ? "🔄 Odometer Reset"
                          : isCorrection
                            ? "✏️ Odometer Correction"
                            : "⛽ Refuel Operation";
                        return (
                          <tr
                            key={`${row.eventType}-${row.id}`}
                            className="border-b border-slate-800/70 transition hover:bg-slate-800/30"
                          >
                            <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                              {formatDateTime(row.eventDate || row.createdAt)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 font-extrabold text-white">
                              {row.assetId || "-"}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                              {row.projectName || row.projectCode || "-"}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold ${badgeClass}`}
                              >
                                {badgeLabel}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-center font-black text-amber-300">
                              {formatNumber(row.meterCycle, 0)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right text-slate-300">
                              {formatNumber(row.previousReading)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right font-extrabold text-white">
                              {formatNumber(row.currentReading)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right font-black text-amber-300">
                              {formatNumber(row.lifetimeReading)}
                            </td>
                            <td className="max-w-[280px] px-3 py-3 text-slate-400">
                              {row.reason || "-"}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-300">
                              {row.reference || "-"}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                              {row.performedBy || "-"}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={ASSET_METER_HISTORY_HEADERS.length}
                          className="px-6 py-12 text-center text-slate-500"
                        >
                          No asset meter events match the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <ReportPagination pagination={pagination} itemLabel="meter events" />
            </section>
          </>
        )}

        {filtersOpen ? (
          <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm">
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => setFiltersOpen(false)}
              className="absolute inset-0 h-full w-full"
            />
            <aside className="absolute right-0 top-0 z-10 flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-900 shadow-2xl shadow-black/50">
              <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                    Report Setup
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white">
                    Asset Meter Filters
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Close filters"
                  onClick={() => setFiltersOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/70 text-lg text-slate-400 transition hover:text-white"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-300">
                      Date From
                    </span>
                    <input
                      type="date"
                      value={draftFilters.dateFrom}
                      onChange={(e) =>
                        handleFilterChange("dateFrom", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-300">
                      Date To
                    </span>
                    <input
                      type="date"
                      value={draftFilters.dateTo}
                      onChange={(e) =>
                        handleFilterChange("dateTo", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Project
                  </span>
                  <select
                    value={draftFilters.projectId}
                    onChange={(e) =>
                      handleFilterChange("projectId", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="all">All Projects</option>
                    {projects.map((project) => (
                      <option
                        key={
                          getProjectBackendId(project) ||
                          getProjectLabel(project)
                        }
                        value={getProjectBackendId(project)}
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
                    value={draftFilters.assetId}
                    onChange={(e) =>
                      handleFilterChange("assetId", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
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
                    Event Type
                  </span>
                  <select
                    value={draftFilters.eventType}
                    onChange={(e) =>
                      handleFilterChange("eventType", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="all">All Events</option>
                    <option value="REFUEL">Refuel Operation</option>
                    <option value="CORRECTION">Odometer Correction</option>
                    <option value="RESET">Odometer Reset</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Meter Cycle
                  </span>
                  <select
                    value={draftFilters.meterCycle}
                    onChange={(e) =>
                      handleFilterChange("meterCycle", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="all">All Cycles</option>
                    {meterCycleOptions.map((cycle) => (
                      <option key={cycle} value={cycle}>
                        Cycle {cycle}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-slate-800 px-5 py-4">
                <button
                  type="button"
                  onClick={resetFilters}
                  disabled={loading}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-slate-300 hover:border-slate-500 hover:text-white disabled:opacity-50"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={loadReport}
                  disabled={loading}
                  className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60"
                >
                  {loading
                    ? "Generating..."
                    : reportGenerated
                      ? "Update Report"
                      : "Generate Report"}
                </button>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}


const OPERATION_CORRECTION_FILTERS = {
  dateFrom: "",
  dateTo: "",
  projectId: "all",
  operationNo: "",
  status: "all",
  fieldName: "all",
  operationType: "all",
};

const OPERATION_CORRECTION_HEADERS = [
  "Request Date",
  "Operation No.",
  "Operation Date",
  "Project",
  "Operation Type",
  "Field",
  "Old Value",
  "New Value",
  "Requested By",
  "Reviewed By",
  "Reason",
  "Status",
  "Applied / Rejected Date",
];

const OPERATION_CORRECTION_FIELDS = [
  "ASSET_ID",
  "SOURCE_STATION_ID",
  "DESTINATION_STATION_ID",
  "FUELER_ID",
  "QUANTITY",
  "ODOMETER",
  "STATION_COUNTER",
  "EXTERNAL_STATION_NAME",
  "INVOICE_NUMBER",
  "TOTAL_COST_AT_OPERATION",
  "NOTES",
];

const OPERATION_CORRECTION_TYPES = [
  "DIRECT_REFUEL",
  "EXTERNAL_DIRECT_REFUEL",
  "INTERNAL_TRANSFER",
  "EXTERNAL_TRANSFER",
  "EXTERNAL_SUPPLY",
];

function formatCorrectionValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function OperationCorrectionsReport({
  selectedReport,
  currentUser,
  currentCompany,
  projects = [],
  onBack,
}) {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [draftFilters, setDraftFilters] = useState(
    OPERATION_CORRECTION_FILTERS,
  );
  const [appliedFilters, setAppliedFilters] = useState(
    OPERATION_CORRECTION_FILTERS,
  );
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    applied: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pagination = useReportPagination(rows);
  const paginatedRows = pagination.paginatedItems;

  const filterSummary = useMemo(() => {
    const selectedProject = projects.find(
      (project) =>
        normalizeValue(getProjectBackendId(project)) ===
        normalizeValue(appliedFilters.projectId),
    );

    return [
      {
        label: "Period",
        value:
          appliedFilters.dateFrom || appliedFilters.dateTo
            ? `${formatReportDate(appliedFilters.dateFrom)} → ${formatReportDate(appliedFilters.dateTo)}`
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
        label: "Operation No.",
        value: appliedFilters.operationNo || "All Operations",
      },
      {
        label: "Field",
        value:
          appliedFilters.fieldName === "all"
            ? "All Fields"
            : formatOperationType(appliedFilters.fieldName),
      },
      {
        label: "Status",
        value:
          appliedFilters.status === "all"
            ? "All Statuses"
            : formatOperationType(appliedFilters.status),
      },
    ];
  }, [appliedFilters, projects]);

  const reportMeta = {
    title: selectedReport?.title || "Operation Corrections Report",
    companyName: currentCompany?.name || "Fleet Fuel PRO",
    generatedBy: getUserDisplayName(currentUser),
    generatedAt: new Date().toLocaleString("en-GB"),
    filters: filterSummary,
  };

  const loadReport = async () => {
    setLoading(true);
    setError("");

    try {
      const companyId = getCompanyBackendId(currentCompany, currentUser);

      if (!companyId) {
        throw new Error("Company ID is required to generate this report.");
      }

      const result = await fetchOperationCorrectionsReport(
        {
          companyId,
          projectId:
            draftFilters.projectId === "all"
              ? ""
              : draftFilters.projectId,
          operationNo: draftFilters.operationNo.trim(),
          status:
            draftFilters.status === "all" ? "" : draftFilters.status,
          fieldName:
            draftFilters.fieldName === "all"
              ? ""
              : draftFilters.fieldName,
          operationType:
            draftFilters.operationType === "all"
              ? ""
              : draftFilters.operationType,
          dateFrom: draftFilters.dateFrom,
          dateTo: draftFilters.dateTo,
        },
        currentUser,
      );

      setRows(Array.isArray(result.data) ? result.data : []);
      setSummary({
        total: Number(result.summary?.total || 0),
        pending: Number(result.summary?.pending || 0),
        approved: Number(result.summary?.approved || 0),
        applied: Number(result.summary?.applied || 0),
        rejected: Number(result.summary?.rejected || 0),
      });
      setAppliedFilters(draftFilters);
      setReportGenerated(true);
      pagination.resetPage();
      setFiltersOpen(false);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Failed to load operation corrections.",
      );
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setDraftFilters(OPERATION_CORRECTION_FILTERS);
    pagination.resetPage();
  };

  const handlePrint = () => {
    printReport({
      ...reportMeta,
      totals: [
        { label: "Total Corrections", value: summary.total },
        { label: "Pending", value: summary.pending },
        { label: "Applied", value: summary.applied },
        { label: "Rejected", value: summary.rejected },
      ],
      columns: OPERATION_CORRECTION_HEADERS,
      rows: rows.map((row) => [
        formatDateTime(row.requestDate),
        row.operationNo || "-",
        formatDateTime(row.operationDate),
        row.projectName || "-",
        formatOperationType(row.operationType),
        formatOperationType(row.fieldName),
        formatCorrectionValue(row.oldValueLabel ?? row.oldValue),
        formatCorrectionValue(row.newValueLabel ?? row.newValue),
        row.requestedBy || "-",
        row.reviewedBy || "-",
        row.reason || "-",
        formatOperationType(row.status),
        formatDateTime(row.appliedAt || row.rejectedAt),
      ]),
    });
  };

  const handleExport = () => {
    exportReportToExcel({
      fileName: "Operation_Corrections_Report",
      sheetName: "Corrections",
      ...reportMeta,
      rows: rows.map((row) => ({
        "Request Date": formatDateTime(row.requestDate),
        "Operation No.": row.operationNo || "",
        "Operation Date": formatDateTime(row.operationDate),
        Project: row.projectName || "",
        "Operation Type": formatOperationType(row.operationType),
        Field: formatOperationType(row.fieldName),
        "Old Value": formatCorrectionValue(row.oldValueLabel ?? row.oldValue),
        "New Value": formatCorrectionValue(row.newValueLabel ?? row.newValue),
        "Requested By": row.requestedBy || "",
        "Reviewed By": row.reviewedBy || "",
        Reason: row.reason || "",
        "Review Note": row.reviewNote || "",
        Status: formatOperationType(row.status),
        "Applied Date": row.appliedAt
          ? formatDateTime(row.appliedAt)
          : "",
        "Rejected Date": row.rejectedAt
          ? formatDateTime(row.rejectedAt)
          : "",
      })),
      totals: {
        "Request Date": "Totals",
        "Operation No.": summary.total,
        Project: `Pending: ${summary.pending}`,
        Field: `Applied: ${summary.applied}`,
        Status: `Rejected: ${summary.rejected}`,
      },
    });
  };

  return (
    <div className="min-h-full bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1900px] space-y-5">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <button
                type="button"
                onClick={onBack}
                className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm font-bold text-slate-300 transition hover:border-amber-500/50 hover:text-amber-300"
              >
                <span aria-hidden="true">←</span> Back to Reports
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
                ✎
              </div>
              <h2 className="mt-5 text-xl font-black text-white sm:text-2xl">
                Select correction report filters first
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Choose the period, project, operation, changed field and
                status, then generate the report.
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
                  <p className="mt-1 truncate text-sm font-extrabold text-slate-200">
                    {item.value}
                  </p>
                </div>
              ))}
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ["Total Corrections", summary.total],
                ["Pending", summary.pending],
                ["Approved", summary.approved],
                ["Applied", summary.applied],
                ["Rejected", summary.rejected],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-amber-500/25 bg-slate-900/80 p-4 shadow-lg shadow-black/10"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {formatNumber(value, 0)}
                  </p>
                </div>
              ))}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/10">
              <div className="flex flex-col gap-2 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-extrabold text-white">
                    Correction Request Details
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {rows.length} correction{rows.length === 1 ? "" : "s"} found
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[2200px] w-full border-collapse text-sm">
                  <thead className="bg-slate-950/90">
                    <tr>
                      {OPERATION_CORRECTION_HEADERS.map((header) => (
                        <th
                          key={header}
                          className="whitespace-nowrap border-b border-slate-800 px-3 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-400"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length ? (
                      paginatedRows.map((row) => (
                        <tr
                          key={row.correctionId || row.id}
                          className="border-b border-slate-800/70 transition hover:bg-slate-800/30"
                        >
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                            {formatDateTime(row.requestDate)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-bold text-amber-300">
                            {row.operationNo || "-"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                            {formatDateTime(row.operationDate)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                            {row.projectName || "-"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                            {formatOperationType(row.operationType)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-bold text-white">
                            {formatOperationType(row.fieldName)}
                          </td>
                          <td className="max-w-[240px] break-words px-3 py-3 text-red-200">
                            {formatCorrectionValue(row.oldValueLabel ?? row.oldValue)}
                          </td>
                          <td className="max-w-[240px] break-words px-3 py-3 text-emerald-300">
                            {formatCorrectionValue(row.newValueLabel ?? row.newValue)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                            {row.requestedBy || "-"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                            {row.reviewedBy || "-"}
                          </td>
                          <td className="max-w-[300px] break-words px-3 py-3 text-slate-400">
                            {row.reason || "-"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-bold text-amber-300">
                            {formatOperationType(row.status)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                            {formatDateTime(row.appliedAt || row.rejectedAt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={OPERATION_CORRECTION_HEADERS.length}
                          className="px-6 py-12 text-center text-slate-500"
                        >
                          No operation corrections match the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <ReportPagination pagination={pagination} itemLabel="corrections" />
            </section>
          </>
        )}

        {filtersOpen ? (
          <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm">
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => setFiltersOpen(false)}
              className="absolute inset-0 h-full w-full"
            />
            <aside className="absolute right-0 top-0 z-10 flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-900 shadow-2xl shadow-black/50">
              <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                    Report Setup
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white">
                    Correction Filters
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/70 text-lg text-slate-400 hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-300">
                      Date From
                    </span>
                    <input
                      type="date"
                      value={draftFilters.dateFrom}
                      onChange={(e) =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          dateFrom: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-300">
                      Date To
                    </span>
                    <input
                      type="date"
                      value={draftFilters.dateTo}
                      onChange={(e) =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          dateTo: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Project
                  </span>
                  <select
                    value={draftFilters.projectId}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        projectId: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="all">All Projects</option>
                    {projects.map((project) => (
                      <option
                        key={
                          getProjectBackendId(project) ||
                          getProjectLabel(project)
                        }
                        value={getProjectBackendId(project)}
                      >
                        {getProjectLabel(project)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Operation No.
                  </span>
                  <input
                    value={draftFilters.operationNo}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        operationNo: e.target.value,
                      }))
                    }
                    placeholder="Search operation number"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Changed Field
                  </span>
                  <select
                    value={draftFilters.fieldName}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        fieldName: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="all">All Fields</option>
                    {OPERATION_CORRECTION_FIELDS.map((field) => (
                      <option key={field} value={field}>
                        {formatOperationType(field)}
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
                    onChange={(e) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        operationType: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="all">All Operation Types</option>
                    {OPERATION_CORRECTION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {formatOperationType(type)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Status
                  </span>
                  <select
                    value={draftFilters.status}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="APPLIED">Applied</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-800 px-5 py-4">
                <button
                  type="button"
                  onClick={resetFilters}
                  disabled={loading}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-slate-300 hover:border-slate-500 hover:text-white disabled:opacity-50"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={loadReport}
                  disabled={loading}
                  className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60"
                >
                  {loading
                    ? "Generating..."
                    : reportGenerated
                      ? "Update Report"
                      : "Generate Report"}
                </button>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function isPlatformReportsUser(user) {
  const roleValues = [
    user?.role,
    user?.roleName,
    user?.role?.name,
    user?.userRole,
    user?.type,
  ]
    .filter(Boolean)
    .map((value) =>
      String(value)
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, ""),
    );

  return roleValues.some((value) =>
    ["platformadmin", "platformuser"].includes(value),
  );
}

export default function ReportsPage({
  currentUser,
  currentCompany,
  projects = [],
  assets = [],
  stations = [],
  assetTransferRequests = [],
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
  const [operationsReportRows, setOperationsReportRows] = useState([]);
  const [operationsReportLoading, setOperationsReportLoading] = useState(false);
  const [operationsReportError, setOperationsReportError] = useState("");

  const isPlatformUser = isPlatformReportsUser(currentUser);
  const visibleReportModules = isPlatformUser
    ? REPORT_MODULES.filter((module) => module.id === "companies")
    : REPORT_MODULES.filter((module) => !module.platformOnly);

  const availableAssets = useMemo(() => {
    if (draftFilters.project === "all") return assets;

    return assets.filter((asset) => {
      const assetProject =
        asset?.projectName ||
        asset?.project ||
        asset?.projectId ||
        asset?.projectCode ||
        "";

      return (
        normalizeValue(assetProject) === normalizeValue(draftFilters.project)
      );
    });
  }, [assets, draftFilters.project]);

  const reportRows = useMemo(() => {
    return operationsReportRows.map(mapSummaryOperation);
  }, [operationsReportRows]);

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
            normalizeValue(appliedFilters.asset),
        );

        if (
          !selectedAsset ||
          !getAssetCandidates(selectedAsset).includes(
            normalizeValue(row.destinationRaw),
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
        appliedFilters.fuelerEmployeeId &&
        normalizeValue(row.fuelerEmployeeId) !==
          normalizeValue(appliedFilters.fuelerEmployeeId)
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

  const operationsPagination = useReportPagination(filteredRows);
  const paginatedOperationRows = operationsPagination.paginatedItems;

  const totals = useMemo(
    () =>
      filteredRows.reduce(
        (summary, row) => ({
          operations: summary.operations + 1,
          quantity: summary.quantity + getNumericValue(row.quantity),
          cost: summary.cost + getNumericValue(row.cost),
        }),
        { operations: 0, quantity: 0, cost: 0 },
      ),
    [filteredRows],
  );

  const filterSummary = useMemo(() => {
    const selectedAsset = assets.find(
      (asset) =>
        normalizeValue(getAssetFilterValue(asset)) ===
        normalizeValue(appliedFilters.asset),
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
        "Employee Code": row.fuelerEmployeeId,
        "Employee Name": row.fuelerName,
        Source: row.source,
        Destination: row.destination,
        Quantity: row.quantity,
        [`Cost (${currency})`]: row.cost,
        Status: String(row.status || "COMPLETED").replaceAll("_", " "),
      })),
    [filteredRows, currency],
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
        row.fuelerEmployeeId,
        row.fuelerName,
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
    operationsPagination.resetPage();
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

  const handleApplyFilters = async () => {
    setOperationsReportLoading(true);
    setOperationsReportError("");

    try {
      const selectedProject = projects.find(
        (project) =>
          normalizeValue(getProjectLabel(project)) ===
          normalizeValue(draftFilters.project),
      );

      const result = await fetchOperationsSummaryReport(
        {
          dateFrom: draftFilters.dateFrom,
          dateTo: draftFilters.dateTo,
          projectId:
            draftFilters.project === "all"
              ? ""
              : getProjectBackendId(selectedProject),
          assetId: draftFilters.asset === "all" ? "" : draftFilters.asset,
          type:
            draftFilters.operationType === "all"
              ? ""
              : draftFilters.operationType.toUpperCase(),
          fuelerEmployeeId: draftFilters.fuelerEmployeeId.trim(),
          status: draftFilters.status === "all" ? "" : draftFilters.status,
        },
        currentUser,
      );

      setOperationsReportRows(result.rows);
      setAppliedFilters(draftFilters);
      setReportGenerated(true);
      operationsPagination.resetPage();
      setFiltersOpen(false);
    } catch (requestError) {
      setOperationsReportError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Failed to generate operations report.",
      );
    } finally {
      setOperationsReportLoading(false);
    }
  };

  if (selectedReport?.id === "companies-master") {
    return (
      <CompaniesReportsPage
        selectedReport={selectedReport}
        currentUser={currentUser}
        onBack={handleBackToReports}
      />
    );
  }

  if (
    [
      "station-counter-meter-history",
      "station-master",
      "station-transfer",
    ].includes(selectedReport?.id)
  ) {
    return (
      <StationsReportsPage
        selectedReport={selectedReport}
        currentUser={currentUser}
        currentCompany={currentCompany}
        projects={projects}
        stations={stations}
        onBack={handleBackToReports}
      />
    );
  }

  if (["employee-master", "employee-transfer"].includes(selectedReport?.id)) {
    return (
      <EmployeesReportsPage
        selectedReport={selectedReport}
        currentUser={currentUser}
        currentCompany={currentCompany}
        projects={projects}
        onBack={handleBackToReports}
      />
    );
  }

  if (
    ["projects-master", "project-fuel-price-history"].includes(
      selectedReport?.id,
    )
  ) {
    return (
      <ProjectsReportsPage
        selectedReport={selectedReport}
        currentUser={currentUser}
        currentCompany={currentCompany}
        projects={projects}
        onBack={handleBackToReports}
      />
    );
  }

  if (selectedReport?.id === "assets-master") {
    return (
      <AssetsMasterReport
        selectedReport={selectedReport}
        currentUser={currentUser}
        currentCompany={currentCompany}
        projects={projects}
        assets={assets}
        onBack={handleBackToReports}
      />
    );
  }

  if (selectedReport?.id === "asset-transfer-history") {
    return (
      <AssetTransferHistoryReport
        selectedReport={selectedReport}
        currentUser={currentUser}
        currentCompany={currentCompany}
        projects={projects}
        assets={assets}
        onBack={handleBackToReports}
      />
    );
  }

  if (selectedReport?.id === "asset-meter-history") {
    return (
      <AssetMeterHistoryReport
        selectedReport={selectedReport}
        currentUser={currentUser}
        currentCompany={currentCompany}
        projects={projects}
        assets={assets}
        data={data}
        headers={headers}
        onBack={handleBackToReports}
      />
    );
  }

  if (selectedReport?.id === "operation-corrections") {
    return (
      <OperationCorrectionsReport
        selectedReport={selectedReport}
        currentUser={currentUser}
        currentCompany={currentCompany}
        projects={projects}
        onBack={handleBackToReports}
      />
    );
  }

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
                  Choose the required date range, project, asset, operation
                  type, employee code and status, then generate the report.
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
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
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
                    <h2 className="font-extrabold text-white">
                      Report Details
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Showing completed operations from the current accessible
                      scope.
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
                  <table className="min-w-[1550px] w-full border-collapse text-left text-sm">
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
                          {paginatedOperationRows.map((row) => (
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
                              <td className="whitespace-nowrap px-4 py-3 font-bold text-sky-300">
                                {row.fuelerEmployeeId}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                                {row.fuelerName}
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
                                  {String(row.status || "COMPLETED").replaceAll(
                                    "_",
                                    " ",
                                  )}
                                </span>
                              </td>
                            </tr>
                          ))}

                          <tr className="bg-slate-950/70">
                            <td
                              colSpan={8}
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
                    <ReportPagination pagination={operationsPagination} itemLabel="operations" />
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

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Employee Code
                  </span>
                  <input
                    type="text"
                    value={draftFilters.fuelerEmployeeId}
                    onChange={(event) =>
                      handleFilterChange("fuelerEmployeeId", event.target.value)
                    }
                    placeholder="All employees"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-500"
                  />
                </label>

                {operationsReportError ? (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                    {operationsReportError}
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-800 px-5 py-4">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  disabled={operationsReportLoading}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-slate-300 transition hover:border-slate-500 hover:text-white"
                >
                  Reset
                </button>

                <button
                  type="button"
                  onClick={handleApplyFilters}
                  disabled={operationsReportLoading}
                  className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 transition hover:bg-amber-400"
                >
                  {operationsReportLoading
                    ? "Generating..."
                    : reportGenerated
                      ? "Update Report"
                      : "Generate Report"}
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>
    );
  }

  const activeModule = visibleReportModules.find(
    (module) => module.id === selectedReportModule,
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
            {visibleReportModules.map((module) => {
              const availableReports = module.reports.filter(
                (report) => report.available,
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
