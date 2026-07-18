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

export const mapBackendProjectForState = (project = {}) => ({
    backendId: project.id || "",
    id: project.code || project.id || "",
    code: project.code || project.id || "",
    name: project.name || project.code || project.id || "",
    location: project.location || "",
    description: project.description || "",
    status: project.isActive === false ? "Inactive" : "Active",
    isActive: project.isActive !== false,
    approvalStatus: "Approved",
    companyId: project.companyId || project.company?.id || "",
    companyName: project.company?.name || "",
    projectManagerId: project.projectManagerId || project.projectManager?.id || "",
    projectManagerName: project.projectManager?.fullName || "",
    projectManagerEmail: project.projectManager?.email || "",
    currentFuelPrice: Number(project.currentFuelPrice || 0),
    fuelPriceCurrency: project.fuelPriceCurrency || project.company?.currency || "SAR",
    fuelPriceEffectiveFrom: project.fuelPriceEffectiveFrom || "",
    source: "Backend",
    createdAt: project.createdAt || "",
    updatedAt: project.updatedAt || "",
  });

export const mapBackendEmployeeStatusForState = (status) => {
    const normalized = String(status || "")
      .trim()
      .toUpperCase();

    if (normalized === "VACATION") return "In Vacation";
    if (normalized === "RETIRED_RESIGNED") return "Retired / Resigned";
    return "On Duty";
  };

export const mapFrontendEmployeeStatusForBackend = (status) => {
    const normalized = String(status || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");

    if (normalized === "vacation" || normalized === "invacation") return "VACATION";
    if (
      normalized === "retiredresigned" ||
      normalized === "retired/resigned" ||
      normalized === "retired" ||
      normalized === "resigned"
    ) {
      return "RETIRED_RESIGNED";
    }

    return "ON_DUTY";
  };

export const mapBackendEmployeeForState = (employee = {}) => {
    const linkedUserRole = getLinkedUserRoleNameFromEmployee(employee);

    return {
      backendId: employee.id || "",
      id: employee.employeeId || employee.id || "",
      employeeId: employee.employeeId || employee.id || "",
      name: employee.name || "",
      mobile: employee.phone || "",
      phone: employee.phone || "",
      email: employee.email || "",
      projectId: employee.projectId || employee.project?.id || "",
      projectName:
        employee.project?.name ||
        employee.project?.code ||
        employee.projectId ||
        "-",
      project: employee.project?.name || employee.projectId || "-",
      companyId: employee.companyId || employee.company?.id || "",
      linkedUserId: employee.linkedUserId || employee.linkedUser?.id || "",
      linkedUserName: employee.linkedUser?.fullName || "",
      linkedUserIsActive: employee.linkedUser?.isActive !== false,
      linkedUserRole,
      linkedUserRoleName: employee.linkedUser?.role?.name || employee.linkedUser?.roleName || "",
      systemRole: linkedUserRole,
      role: employee.jobTitle || "Operator",
      jobTitle: employee.jobTitle || "Operator",
      status: mapBackendEmployeeStatusForState(employee.status),
      userStatus:
        (employee.linkedUserId || employee.linkedUser?.id) &&
        employee.linkedUser?.isActive !== false
          ? "Linked"
          : "Not Linked",
      source: "Backend",
      createdAt: employee.createdAt || "",
      updatedAt: employee.updatedAt || "",
    };
  };


 export const getLinkedUserRoleNameFromEmployee = (employee = {}) =>
    normalizeBackendRoleName(
      employee?.linkedUser?.role?.name ||
        employee?.linkedUser?.roleName ||
        employee?.linkedUser?.role ||
        ""
    );

export function normalizeBackendRoleName(roleName) {
  const normalized = String(roleName || "").trim();
  const compact = normalized.toLowerCase().replace(/[\s_-]+/g, "");

  if (compact === "platformuser" || compact === "platformadmin") return "PlatformAdmin";
  if (compact === "topmanagement") return "TopManagement";
  if (compact === "admin") return "Admin";
  if (compact === "manager") return "Manager";
  if (compact === "supervisor") return "Supervisor";
  if (compact === "officer") return "Officer";
  if (compact === "operator") return "Operator";

  return normalized || "Operator";
}


export function toFrontendOperationType(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_")
    .toLowerCase()
    .split("_")
    .map((part, index) =>
      index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join("_");
}

export function isBackendStationOperationType(value) {
  const normalized = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return ["INTERNAL_TRANSFER", "EXTERNAL_SUPPLY", "EXTERNAL_TRANSFER"].includes(normalized);
}


export function mapBackendOperationForState(operation = {}) {
  const type = toFrontendOperationType(operation.type);

  const sourceStationDisplay =
    operation.sourceStation?.stationId ||
    operation.sourceStation?.stationCode ||
    operation.sourceStation?.code ||
    operation.sourceStation?.name ||
    operation.sourceStationId ||
    "";

  const destinationStationDisplay =
    operation.destinationStation?.stationId ||
    operation.destinationStation?.stationCode ||
    operation.destinationStation?.code ||
    operation.destinationStation?.name ||
    operation.destinationStationId ||
    "";

  const assetDisplay =
    operation.asset?.assetId ||
    operation.asset?.assetCode ||
    operation.asset?.code ||
    operation.assetId ||
    "";

  const destinationId = assetDisplay || destinationStationDisplay;

  const requestedByDisplay =
    operation.requestedBy?.fullName ||
    operation.requestedBy?.name ||
    operation.requestedBy?.email ||
    operation.requestedByUserId ||
    "";

  const stationCounterValue =
    operation.stationCounter === undefined || operation.stationCounter === null
      ? ""
      : String(operation.stationCounter);

  const odometerValue =
    operation.odometer === undefined || operation.odometer === null
      ? ""
      : String(operation.odometer);

  const row = [
    operation.operationNo || operation.id || "",
    operation.completedAt || operation.createdAt || "",
    type,
    sourceStationDisplay,
    requestedByDisplay,
    destinationId,
    operation.quantity === undefined || operation.quantity === null
      ? ""
      : String(operation.quantity),
    isBackendStationOperationType(operation.type)
      ? stationCounterValue || odometerValue
      : odometerValue,
    stationCounterValue,
    operation.externalStationName || "",
    operation.invoiceNumber || "",
    operation.status || "",
    operation.id || "",
  ];

  // Keep the full backend operation hidden on the row so detail modals can access
  // non-table fields such as attachments without adding noisy columns to the UI.
  row.__operation = operation;
  row.__attachments = operation.attachments || [];

  return row;
}

export function normalizeHeader(value) {
  return cleanCsvCell(value)
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function normalizeText(value) {
  return cleanCsvCell(value)
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function getDuplicateIdError(inputId, existingItems = [], label = "ID") {
  const normalizedInputId = normalizeText(inputId);

  if (!normalizedInputId) return "";

  const alreadyExists = existingItems.some((item) =>
    normalizeText(item?.id) === normalizedInputId
  );

  return alreadyExists ? `${label} already exists. Please use a unique ID.` : "";
}

export function isSameText(a, b) {
  return normalizeText(a) === normalizeText(b);
}

export function getHeaderIndex(headers, possibleNames) {
  const cleanHeaders = headers.map((header) => normalizeHeader(header));

  for (const name of possibleNames) {
    const index = cleanHeaders.indexOf(normalizeHeader(name));

    if (index !== -1) return index;
  }

  return -1;
}

export function getValue(row, headers, possibleNames) {
  const index = getHeaderIndex(headers, possibleNames);

  return index !== -1 ? cleanCsvCell(row[index]) : "";
}
 
export function formatNumber(value) {
  const number = Number(value);
 
  if (isNaN(number)) return value || "-";
 
  return number.toLocaleString("en-US");
}

export function makeFieldLabel(field) {
  return String(field || "Field")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}