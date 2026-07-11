export function cleanCsvCell(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .trim()
    .replace(/^"(.*)"$/s, "$1")
    .replace(/""/g, '"')
    .trim();
}


export function parseCSV(csvText) {
  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let i = 0; i < String(csvText || "").length; i += 1) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      currentCell += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      currentRow.push(cleanCsvCell(currentCell));
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }

      currentRow.push(cleanCsvCell(currentCell));

      if (currentRow.some((cell) => String(cell).trim() !== "")) {
        rows.push(currentRow);
      }

      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  currentRow.push(cleanCsvCell(currentCell));

  if (currentRow.some((cell) => String(cell).trim() !== "")) {
    rows.push(currentRow);
  }

  return rows;
}


export function normalizeSystemUserStatus(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  if (["inactive", "disabled", "deactivated"].includes(normalized)) return "Inactive";
  if (["suspended", "blocked"].includes(normalized)) return "Suspended";
  return "Active";
}


export function normalizeScopeValue(value) {
  return String(value ?? "").trim().toLowerCase();
}


export function isActiveProject(project) {
  return normalizeScopeValue(project?.status || "Active") === "active";
}


export function hasAssignedProjectManager(project) {
  return Boolean(
    project?.projectManagerId ||
      project?.managerUserId ||
      project?.managerId ||
      project?.projectManager?.id
  );
}

export function filterActiveProjects(projects = []) {
  return projects.filter((project) => project?.id && isActiveProject(project));
}

export function filterAvailableProjects(projects = []) {
  return projects.filter(
    (project) => project?.id && isActiveProject(project) && hasAssignedProjectManager(project)
  );
}


export function normalizeBackendAssetStatusForState(status) {
  const normalized = String(status || "ACTIVE")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "INACTIVE") return "Inactive";
  return "Active";
}

export function normalizeBackendStationStatusForState(status) {
  const normalized = String(status || "ACTIVE")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "INACTIVE") return "Inactive";
  return "Active";
}


export function mapFrontendStationStatusForBackend(status) {
  const normalized = String(status || "ACTIVE")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "INACTIVE") return "INACTIVE";
  return "ACTIVE";
}

export function mapFrontendAssetStatusForBackend(status) {
  const normalized = String(status || "ACTIVE")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "INACTIVE") return "INACTIVE";
  return "ACTIVE";
}

export function mapBackendAssetForState(asset = {}) {
  const projectName =
    asset.project?.name ||
    asset.project?.code ||
    asset.projectName ||
    asset.projectId ||
    "-";

  return {
    backendId: asset.id || "",
    assetBackendId: asset.id || "",
    id: asset.assetId || asset.id || "",
    assetId: asset.assetId || asset.id || "",
    type: asset.type || "",
    category: asset.category || "",
    odometer:
      asset.currentOdometer === undefined || asset.currentOdometer === null
        ? "0"
        : String(asset.currentOdometer),
    currentOdometer: asset.currentOdometer ?? 0,
    fuelTank:
      asset.fuelTankCapacity === undefined || asset.fuelTankCapacity === null
        ? "0"
        : String(asset.fuelTankCapacity),
    fuelTankCapacity: asset.fuelTankCapacity ?? null,
    project: projectName,
    projectId: asset.projectId || asset.project?.id || "",
    projectCode: asset.project?.code || "",
    projectName,
    status: normalizeBackendAssetStatusForState(asset.status),
    companyId: asset.companyId || asset.company?.id || "",
    companyName: asset.company?.name || "",
    deletedAt: asset.deletedAt || "",
    source: "Backend",
    createdAt: asset.createdAt || "",
    updatedAt: asset.updatedAt || "",
  };
}


export function mapBackendStationForState(station = {}) {
  const projectName =
    station.project?.name ||
    station.project?.code ||
    station.projectName ||
    station.projectId ||
    "-";

  return {
    backendId: station.id || "",
    stationBackendId: station.id || "",
    id: station.stationId || station.id || "",
    stationId: station.stationId || station.id || "",
    name: station.name || station.stationName || station.stationId || station.id || "",
    type: station.type || "",
    capacity:
      station.capacity === undefined || station.capacity === null
        ? 0
        : Number(station.capacity) || 0,
    openingBalance:
      station.openingBalance === undefined || station.openingBalance === null
        ? 0
        : Number(station.openingBalance) || 0,
    currentStock:
      station.currentStock === undefined || station.currentStock === null
        ? Number(station.openingBalance || 0)
        : Number(station.currentStock) || 0,
    currentCounter:
      station.currentCounter === undefined || station.currentCounter === null
        ? 0
        : Number(station.currentCounter) || 0,
    openingCounter:
      station.currentCounter === undefined || station.currentCounter === null
        ? 0
        : Number(station.currentCounter) || 0,
    counter:
      station.currentCounter === undefined || station.currentCounter === null
        ? 0
        : Number(station.currentCounter) || 0,
    project: projectName,
    projectId: station.projectId || station.project?.id || "",
    projectCode: station.project?.code || "",
    projectName,
    status: normalizeBackendStationStatusForState(station.status),
    companyId: station.companyId || station.company?.id || "",
    companyName: station.company?.name || "",
    deletedAt: station.deletedAt || "",
    source: "Backend",
    createdAt: station.createdAt || "",
    updatedAt: station.updatedAt || "",
  };
}