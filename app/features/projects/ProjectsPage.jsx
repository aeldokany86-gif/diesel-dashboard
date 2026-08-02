"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import StatusBadge from "../../components/feedback/StatusBadge";
import ModalPortal from "../../components/ui/ModalPortal";
import Th from "../../components/ui/Th";
import Td from "../../components/ui/Td";
import Card from "../../components/ui/Card";

import {
  formatNumber,
  getHeaderIndex,
  isSameText,
  normalizeBackendRoleName,
  normalizeScopeValue,
  normalizeSystemUserStatus,
  normalizeText,
} from "../../lib/helpers";

import { getOperationTotalCostAtOperation } from "../../lib/operationHelpers";

import { updateProjectFuelPrice } from "../../services/projectsService";

import { fetchUsers } from "../../services/usersService";

import {
  companyMatches,
  getProjectLocationOptionsByCountry,
  isPlatformContextValue,
  makeTenantEntityKey,
  uniqueUsersById,
} from "../../lib/companyHelpers";

function notifyUser(showToastFn, type, message) {
  const safeType = type || "info";
  const safeMessage = String(message ?? "");

  if (typeof showToastFn === "function") {
    showToastFn(safeType, safeMessage);
    return;
  }

  // Avoid browser-native alert boxes so the UI remains consistent.
  if (safeType === "warning" || safeType === "error") {
    console.warn(safeMessage);
  } else {
    console.log(safeMessage);
  }
}

function formatProjectFuelPriceDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roundFuelPrice(value) {
  return (
    Math.round((Number(value || 0) + Number.EPSILON) * 1_000_000) / 1_000_000
  );
}

function calculateFuelPricing(baseValue, transportValue, vatValue) {
  const basePricePerLiter = Number(baseValue);
  const transportCostPerLiter = Number(transportValue);
  const vatRate = Number(vatValue);

  const isValid =
    Number.isFinite(basePricePerLiter) &&
    basePricePerLiter > 0 &&
    Number.isFinite(transportCostPerLiter) &&
    transportCostPerLiter >= 0 &&
    Number.isFinite(vatRate) &&
    vatRate >= 0 &&
    vatRate <= 100;

  if (!isValid) {
    return {
      isValid: false,
      basePricePerLiter: 0,
      transportCostPerLiter: 0,
      vatRate: 0,
      netPricePerLiter: 0,
      vatAmountPerLiter: 0,
      grossPricePerLiter: 0,
    };
  }

  const netPricePerLiter = roundFuelPrice(
    basePricePerLiter + transportCostPerLiter,
  );
  const vatAmountPerLiter = roundFuelPrice(netPricePerLiter * (vatRate / 100));

  return {
    isValid: true,
    basePricePerLiter: roundFuelPrice(basePricePerLiter),
    transportCostPerLiter: roundFuelPrice(transportCostPerLiter),
    vatRate: roundFuelPrice(vatRate),
    netPricePerLiter,
    vatAmountPerLiter,
    grossPricePerLiter: roundFuelPrice(netPricePerLiter + vatAmountPerLiter),
  };
}

function hasProjectPricingComponents(project) {
  return (
    project?.currentBaseFuelPrice !== null &&
    project?.currentBaseFuelPrice !== undefined
  );
}

function useOutsideClick(ref, callback) {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, callback]);
}

function useSmartDropdownPosition(ref, isOpen, menuWidth = 260) {
  const [menuAlign, setMenuAlign] = useState("left");

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const updateMenuPosition = () => {
      const element = ref?.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const safePadding = 16;
      const viewportWidth = window.innerWidth || 0;

      const spaceIfOpenRight = viewportWidth - rect.left - safePadding;
      const spaceIfOpenLeft = rect.right - safePadding;

      if (spaceIfOpenRight >= menuWidth) {
        setMenuAlign("left");
      } else if (spaceIfOpenLeft >= menuWidth) {
        setMenuAlign("right");
      } else {
        setMenuAlign("right");
      }
    };

    updateMenuPosition();

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [ref, isOpen, menuWidth]);

  return menuAlign;
}

function getSmartDropdownClass(menuAlign, widthClass = "w-64") {
  return `absolute ${menuAlign === "right" ? "right-0" : "left-0"} mt-3 ${widthClass} max-w-[calc(100vw-1.5rem)]`;
}

export default function ProjectsPage({
  projects = [],
  assets = [],
  stations = [],
  fuelers = [],
  data = [],
  headers = [],
  showToast,
  currency = "SAR",
  getLiterPriceByDate,
  assetProjectHistory = [],
  currentUser,
  currentCompany = null,
  currentCompanyId = "",
  hasPermission = () => false,
  trackActivity = () => {},
  submitApprovalRequest = () => {},
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onProjectFuelPriceUpdated,
  onAssignProjectManager,
  users = [],
  theme = "dark",
}) {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectOperationSearch, setProjectOperationSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [localProjects, setLocalProjects] = useState([]);
  const [newProject, setNewProject] = useState({
    id: "",
    name: "",
    status: "Active",
    location: "",
    initialBasePricePerLiter: "",
    initialTransportCostPerLiter: "0",
    initialVatRate: "15",
    approvalStatus: "Pending Approval",
  });

  const [fuelPriceModalOpen, setFuelPriceModalOpen] = useState(false);
  const [selectedProjectForFuelPrice, setSelectedProjectForFuelPrice] =
    useState(null);
  const [fuelPriceSaving, setFuelPriceSaving] = useState(false);
  const [fuelPriceForm, setFuelPriceForm] = useState({
    basePricePerLiter: "",
    transportCostPerLiter: "0",
    vatRate: "15",
    effectiveFrom: "",
    reason: "",
  });

  const fuelPricePreview = useMemo(
    () =>
      calculateFuelPricing(
        fuelPriceForm.basePricePerLiter,
        fuelPriceForm.transportCostPerLiter,
        fuelPriceForm.vatRate,
      ),
    [
      fuelPriceForm.basePricePerLiter,
      fuelPriceForm.transportCostPerLiter,
      fuelPriceForm.vatRate,
    ],
  );

  const newProjectPricingPreview = useMemo(
    () =>
      calculateFuelPricing(
        newProject.initialBasePricePerLiter,
        newProject.initialTransportCostPerLiter,
        newProject.initialVatRate,
      ),
    [
      newProject.initialBasePricePerLiter,
      newProject.initialTransportCostPerLiter,
      newProject.initialVatRate,
    ],
  );

  const openFuelPriceModal = (project) => {
    if (!hasPermission("projects", "edit")) {
      showToast?.(
        "warning",
        "Read-only access: you cannot update project fuel price.",
      );
      return;
    }

    if (!project?.backendId) {
      showToast?.(
        "warning",
        "Project must be saved in backend before updating fuel price.",
      );
      return;
    }

    setSelectedProjectForFuelPrice(project);
    setFuelPriceForm({
      basePricePerLiter: hasProjectPricingComponents(project)
        ? String(project.currentBaseFuelPrice)
        : "",
      transportCostPerLiter:
        project.currentTransportCostPerLiter === null ||
        project.currentTransportCostPerLiter === undefined
          ? "0"
          : String(project.currentTransportCostPerLiter),
      vatRate:
        project.currentVatRate === null || project.currentVatRate === undefined
          ? "15"
          : String(project.currentVatRate),
      effectiveFrom: new Date().toISOString().slice(0, 16),
      reason: "",
    });
    setFuelPriceModalOpen(true);
  };

  const closeFuelPriceModal = () => {
    setFuelPriceModalOpen(false);
    setSelectedProjectForFuelPrice(null);
    setFuelPriceForm({
      basePricePerLiter: "",
      transportCostPerLiter: "0",
      vatRate: "15",
      effectiveFrom: "",
      reason: "",
    });
    setFuelPriceSaving(false);
  };

  const saveProjectFuelPrice = async () => {
    if (!selectedProjectForFuelPrice?.backendId) {
      showToast?.("warning", "Project backend ID is required.");
      return;
    }

    const pricing = calculateFuelPricing(
      fuelPriceForm.basePricePerLiter,
      fuelPriceForm.transportCostPerLiter,
      fuelPriceForm.vatRate,
    );

    if (!pricing.isValid) {
      showToast?.(
        "warning",
        "Enter a base fuel price above zero, a non-negative delivery cost, and VAT between 0% and 100%.",
      );
      return;
    }

    if (!fuelPriceForm.effectiveFrom) {
      showToast?.("warning", "Effective date is required.");
      return;
    }

    setFuelPriceSaving(true);

    try {
      const updatedPrice =
        (await updateProjectFuelPrice(selectedProjectForFuelPrice.backendId, {
          basePricePerLiter: pricing.basePricePerLiter,
          transportCostPerLiter: pricing.transportCostPerLiter,
          vatRate: pricing.vatRate,
          effectiveFrom: new Date(fuelPriceForm.effectiveFrom).toISOString(),
          reason:
            fuelPriceForm.reason?.trim() ||
            "Project component fuel price update",
          ...(currentUser?.id ? { createdByUserId: currentUser.id } : {}),
        })) || {};
      const nextCurrency =
        updatedPrice.currency ||
        selectedProjectForFuelPrice.fuelPriceCurrency ||
        currentCompany?.currency ||
        currency ||
        "SAR";
      const nextEffectiveFrom =
        updatedPrice.effectiveFrom ||
        new Date(fuelPriceForm.effectiveFrom).toISOString();

      const isEffectiveNow =
        new Date(nextEffectiveFrom).getTime() <= Date.now();
      let refreshedProject = null;

      if (typeof onProjectFuelPriceUpdated === "function") {
        refreshedProject = await onProjectFuelPriceUpdated(
          selectedProjectForFuelPrice,
        );
      } else {
        // Local-only fallback for standalone use without the parent state callback.
        const patchProject = (project) => ({
          ...project,
          ...(isEffectiveNow
            ? {
                currentFuelPrice: pricing.netPricePerLiter,
                currentBaseFuelPrice: pricing.basePricePerLiter,
                currentTransportCostPerLiter: pricing.transportCostPerLiter,
                currentVatRate: pricing.vatRate,
                currentGrossFuelPrice: pricing.grossPricePerLiter,
                fuelPriceEffectiveFrom: nextEffectiveFrom,
              }
            : {}),
          fuelPriceCurrency: nextCurrency,
        });

        setLocalProjects((prev) => {
          const key = normalizeScopeValue(selectedProjectForFuelPrice.id);
          const exists = prev.some(
            (project) => normalizeScopeValue(project.id) === key,
          );

          if (exists) {
            return prev.map((project) =>
              normalizeScopeValue(project.id) === key
                ? patchProject(project)
                : project,
            );
          }

          return [...prev, patchProject(selectedProjectForFuelPrice)];
        });
      }

      if (
        selectedProject &&
        normalizeScopeValue(selectedProject.id) ===
          normalizeScopeValue(selectedProjectForFuelPrice.id)
      ) {
        if (refreshedProject) {
          setSelectedProject(refreshedProject);
        } else if (isEffectiveNow) {
          setSelectedProject((prev) =>
            prev
              ? {
                  ...prev,
                  currentFuelPrice: pricing.netPricePerLiter,
                  currentBaseFuelPrice: pricing.basePricePerLiter,
                  currentTransportCostPerLiter: pricing.transportCostPerLiter,
                  currentVatRate: pricing.vatRate,
                  currentGrossFuelPrice: pricing.grossPricePerLiter,
                  fuelPriceEffectiveFrom: nextEffectiveFrom,
                }
              : prev,
          );
        }
      }

      trackActivity?.(
        "Update Project Fuel Price",
        "projects",
        `${selectedProjectForFuelPrice.id} fuel price set to ${pricing.netPricePerLiter} ${nextCurrency}/L net and ${pricing.grossPricePerLiter} ${nextCurrency}/L including VAT.`,
      );

      showToast?.(
        "success",
        isEffectiveNow
          ? "Project fuel price updated successfully."
          : `Fuel price scheduled for ${formatProjectFuelPriceDate(nextEffectiveFrom)}.`,
      );
      closeFuelPriceModal();
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        "Failed to update project fuel price.";

      notifyUser(
        typeof showToast !== "undefined" ? showToast : null,
        "warning",
        Array.isArray(backendMessage)
          ? backendMessage.join(", ")
          : backendMessage,
      );
    } finally {
      setFuelPriceSaving(false);
    }
  };

  const [backendProjectManagers, setBackendProjectManagers] = useState([]);
  const [pendingManagerConfirmation, setPendingManagerConfirmation] =
    useState(null);
  const [managerSaving, setManagerSaving] = useState(false);

  const [statusEdit, setStatusEdit] = useState(null);
  const [pendingProjectConfirmation, setPendingProjectConfirmation] =
    useState(null);
  const [projectRejection, setProjectRejection] = useState(null);
  const currentCompanyCountry = currentCompany?.country || "";
  const projectLocationOptions = getProjectLocationOptionsByCountry(
    currentCompanyCountry,
  );
  const shouldUseLocationDropdown = projectLocationOptions.length > 0;
  const [projectDeleteTarget, setProjectDeleteTarget] = useState(null);
  const settingsRef = useRef(null);
  const settingsMenuAlign = useSmartDropdownPosition(
    settingsRef,
    showSettings,
    224,
  );

  useOutsideClick(settingsRef, () => setShowSettings(false));

  useEffect(() => {
    if (!shouldUseLocationDropdown) return;
    if (!newProject.location) return;
    if (projectLocationOptions.includes(newProject.location)) return;

    setNewProject((prev) => ({
      ...prev,
      location: "",
    }));
  }, [shouldUseLocationDropdown, projectLocationOptions.join("|")]);

  useEffect(() => {
    async function loadProjectManagerOptions() {
      if (currentUser?.role !== "Admin") {
        setBackendProjectManagers([]);
        return;
      }

      if (!currentCompanyId || isPlatformContextValue(currentCompanyId)) {
        setBackendProjectManagers([]);
        return;
      }

      // page.js already supplies users. Avoid another Users API request
      // every time ProjectsPage mounts when usable data is already present.
      if (Array.isArray(users) && users.length > 0) {
        setBackendProjectManagers([]);
        return;
      }

      try {
        const backendUsers = await fetchUsers({
          companyId: currentCompanyId,
        });

        setBackendProjectManagers(
          backendUsers
            .map((user) => ({
              id: user.id,
              fullName: user.fullName || user.name || user.email || "",
              email: user.email || "",
              companyId: user.companyId || "",
              role: normalizeBackendRoleName(
                user.role?.name || user.roleName || user.role || "",
              ),
              status: user.isActive === false ? "Inactive" : "Active",
            }))
            .filter((user) => user.id),
        );
      } catch (error) {
        console.warn("Failed to load project manager options.", error);
        setBackendProjectManagers([]);
      }
    }

    loadProjectManagerOptions();
  }, [currentUser?.role, currentCompanyId, users]);

  const projectManagerOptions = useMemo(() => {
    const combinedUsers = uniqueUsersById([
      ...users,
      ...backendProjectManagers,
    ]);

    return combinedUsers
      .filter((user) => {
        const role = normalizeBackendRoleName(
          user.roleName || user.role || user.role?.name || "",
        );
        const status = normalizeSystemUserStatus(
          user.status || (user.isActive === false ? "Inactive" : "Active"),
        );

        return (
          user.id &&
          role === "Manager" &&
          status === "Active" &&
          companyMatches(user.companyId, currentCompanyId)
        );
      })
      .sort((a, b) =>
        String(a.fullName || a.email || "").localeCompare(
          String(b.fullName || b.email || ""),
        ),
      );
  }, [users, backendProjectManagers, currentCompanyId]);

  const isAdminProjectManagerEditor = currentUser?.role === "Admin";

  const getProjectManagerDisplayName = (project) => {
    if (project?.projectManagerName) return project.projectManagerName;

    const manager = projectManagerOptions.find(
      (user) =>
        normalizeScopeValue(user.id) ===
        normalizeScopeValue(project?.projectManagerId),
    );

    return manager?.fullName || manager?.email || "Unassigned";
  };

  const requestProjectManagerChange = (project, managerUserId) => {
    if (!isAdminProjectManagerEditor) {
      showToast?.("warning", "Only Admin can change the Project Manager.");
      return;
    }

    if (!project?.backendId) {
      showToast?.(
        "warning",
        "Project must be saved in backend before assigning a manager.",
      );
      return;
    }

    if (!managerUserId) {
      showToast?.("warning", "Please select a Project Manager.");
      return;
    }

    if (
      normalizeScopeValue(project.projectManagerId) ===
      normalizeScopeValue(managerUserId)
    ) {
      return;
    }

    const manager = projectManagerOptions.find(
      (user) =>
        normalizeScopeValue(user.id) === normalizeScopeValue(managerUserId),
    );

    setPendingManagerConfirmation({
      project,
      managerUserId,
      managerName: manager?.fullName || manager?.email || managerUserId,
      oldManagerName: getProjectManagerDisplayName(project),
    });
  };

  const confirmProjectManagerChange = async () => {
    if (!pendingManagerConfirmation) return;

    setManagerSaving(true);

    try {
      const updatedProject =
        typeof onAssignProjectManager === "function"
          ? await onAssignProjectManager(
              pendingManagerConfirmation.project,
              pendingManagerConfirmation.managerUserId,
            )
          : null;

      if (!updatedProject) {
        setLocalProjects((prev) =>
          prev.map((project) =>
            isSameText(project.id, pendingManagerConfirmation.project.id)
              ? {
                  ...project,
                  projectManagerId: pendingManagerConfirmation.managerUserId,
                  projectManagerName: pendingManagerConfirmation.managerName,
                }
              : project,
          ),
        );
      }

      if (
        selectedProject &&
        isSameText(selectedProject.id, pendingManagerConfirmation.project.id)
      ) {
        setSelectedProject((prev) => ({
          ...prev,
          ...(updatedProject || {}),
          projectManagerId:
            updatedProject?.projectManagerId ||
            pendingManagerConfirmation.managerUserId,
          projectManagerName:
            updatedProject?.projectManagerName ||
            pendingManagerConfirmation.managerName,
        }));
      }

      trackActivity?.(
        "Change Project Manager",
        "projects",
        `${pendingManagerConfirmation.project.id} manager changed to ${pendingManagerConfirmation.managerName}.`,
      );

      showToast?.("success", "Project Manager changed successfully.");
      setPendingManagerConfirmation(null);
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message || "Failed to change Project Manager.";
      notifyUser(
        typeof showToast !== "undefined" ? showToast : null,
        "warning",
        Array.isArray(backendMessage)
          ? backendMessage.join(", ")
          : backendMessage,
      );
    } finally {
      setManagerSaving(false);
    }
  };

  const operationIdIndex = getHeaderIndex(headers, [
    "operation_id",
    "Operation ID",
    "operation id",
    "transaction_id",
    "Transaction ID",
    "id",
  ]);

  const dateIndex = getHeaderIndex(headers, [
    "transaction_datetime",
    "Transaction datetime",
    "transaction datetime",
    "date",
  ]);

  const typeIndex = getHeaderIndex(headers, [
    "transaction_type",
    "Transaction type",
    "transaction type",
    "operation_type",
    "Operation type",
  ]);

  const sourceIndex = getHeaderIndex(headers, [
    "source_station",
    "Source station",
    "source station",
    "source_station_id",
    "station_id",
  ]);

  const destinationIndex = getHeaderIndex(headers, [
    "destination_id",
    "Destination ID",
    "destination id",
    "destination",
  ]);

  const dieselIndex = getHeaderIndex(headers, [
    "diesel_quantity",
    "Diesel quantity",
    "diesel quantity",
    "quantity",
    "qty",
  ]);

  const fuelerIndex = getHeaderIndex(headers, [
    "fueler_id",
    "Operator ID",
    "fueler id",
    "fueler",
  ]);

  const odometerIndex = getHeaderIndex(headers, [
    "odometer_at_fueling",
    "Odometer at fueling",
    "odometer at fueling",
    "odometer",
  ]);

  const allProjects = useMemo(() => {
    const baseProjects = projects.map((project) => ({
      ...project,
      approvalStatus: project.approvalStatus || "Approved",
    }));

    return Object.values(
      [...baseProjects, ...localProjects].reduce((acc, project) => {
        if (!project?.id) return acc;
        acc[normalizeText(project.id)] = project;
        return acc;
      }, {}),
    );
  }, [projects, localProjects]);

  const matchProject = (value, project) => {
    return isSameText(value, project.id) || isSameText(value, project.name);
  };

  const getProjectAssets = (project) => {
    return assets.filter((asset) => {
      const currentProject = getAssetProjectByDate(
        asset.id,
        new Date().toISOString(),
      );

      return matchProject(currentProject, project);
    });
  };

  const getProjectStations = (project) => {
    return stations.filter((station) => matchProject(station.project, project));
  };

  const getProjectFuelers = (project) => {
    return fuelers.filter((fueler) =>
      matchProject(fueler.projectName, project),
    );
  };

  const parseProjectDate = (rawDate) => {
    if (!rawDate) return null;
    const d = new Date(rawDate);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  };

  const formatProjectDate = (rawDate) => {
    const d = parseProjectDate(rawDate);
    if (!d) return rawDate || "-";

    return d.toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAssetProjectByDate = (assetId, transactionDate) => {
    const asset = assets.find((item) => item.id === assetId);
    const operationDate = parseProjectDate(transactionDate);

    if (!assetId || !operationDate) {
      return asset?.project || "-";
    }

    const history = assetProjectHistory
      .filter((item) => item.assetId === assetId)
      .filter((item) => item.effectiveDate)
      .sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate));

    if (history.length === 0) {
      return asset?.project || "-";
    }

    let project = history[0]?.oldProject || asset?.project || "-";

    history.forEach((item) => {
      const effectiveDate = new Date(item.effectiveDate);

      if (
        !Number.isNaN(effectiveDate.getTime()) &&
        effectiveDate <= operationDate
      ) {
        project = item.newProject || project;
      }
    });

    return project || asset?.project || "-";
  };

  const directRefuelOperationsByProject = useMemo(() => {
    const lookup = new Map();

    const addOperation = (projectValue, item) => {
      const normalizedProject = normalizeScopeValue(projectValue);
      if (!normalizedProject) return;

      if (!lookup.has(normalizedProject)) {
        lookup.set(normalizedProject, []);
      }

      lookup.get(normalizedProject).push(item);
    };

    data.forEach((row, originalIndex) => {
      const operationType = typeIndex !== -1 ? row[typeIndex] : "";

      if (!isSameText(operationType, "Direct_Refuel")) {
        return;
      }

      const destination = destinationIndex !== -1 ? row[destinationIndex] : "";
      const transactionDate = dateIndex !== -1 ? row[dateIndex] : "";

      const embeddedOperation =
        row?.__operation || row?.operation || row?.backendOperation || null;

      const projectAtOperation =
        embeddedOperation?.projectNameAtOperation ||
        embeddedOperation?.projectIdAtOperation ||
        getAssetProjectByDate(destination, transactionDate);

      addOperation(projectAtOperation, {
        row,
        originalIndex,
      });
    });

    lookup.forEach((items) => {
      items.sort((a, b) => {
        const da =
          dateIndex !== -1
            ? parseProjectDate(a.row[dateIndex])?.getTime() || 0
            : 0;
        const db =
          dateIndex !== -1
            ? parseProjectDate(b.row[dateIndex])?.getTime() || 0
            : 0;

        return db - da;
      });
    });

    return lookup;
  }, [
    data,
    typeIndex,
    destinationIndex,
    dateIndex,
    assets,
    assetProjectHistory,
  ]);

  const getDirectRefuelOperations = (project) => {
    const projectKeys = [
      project?.id,
      project?.backendId,
      project?.name,
      project?.code,
      project?.projectCode,
    ]
      .filter(Boolean)
      .map(normalizeScopeValue);

    for (const key of projectKeys) {
      const operations = directRefuelOperationsByProject.get(key);
      if (operations) return operations;
    }

    return [];
  };

  const getFilteredProjectOperations = (project) => {
    const search = projectOperationSearch.trim().toLowerCase();
    const operations = getDirectRefuelOperations(project);

    if (!search) return operations;

    return operations.filter((item) => {
      const row = item.row;
      const searchableValues = [
        operationIdIndex !== -1
          ? row[operationIdIndex]
          : item.originalIndex + 1,
        dateIndex !== -1 ? row[dateIndex] : "",
        sourceIndex !== -1 ? row[sourceIndex] : "",
        fuelerIndex !== -1 ? row[fuelerIndex] : "",
        destinationIndex !== -1 ? row[destinationIndex] : "",
        dieselIndex !== -1 ? row[dieselIndex] : "",
        odometerIndex !== -1 ? row[odometerIndex] : "",
      ];

      return searchableValues.some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(search),
      );
    });
  };

  const getOperationLiterPrice = (row) => {
    const date = dateIndex !== -1 ? row[dateIndex] : "";
    return getLiterPriceByDate ? getLiterPriceByDate(date) : 2.33;
  };

  const projectSummary = useMemo(() => {
    const now = new Date().toISOString();

    return allProjects.map((project) => {
      const assignedAssetsCount = assets.filter((asset) => {
        const currentProject = getAssetProjectByDate(asset.id, now);
        return matchProject(currentProject, project);
      }).length;

      const assignedStationsCount = stations.filter((station) =>
        matchProject(station.project, project),
      ).length;

      const assignedFuelersCount = fuelers.filter((fueler) =>
        matchProject(fueler.projectName, project),
      ).length;

      const directRefuelOperations = getDirectRefuelOperations(project);

      let dieselQty = 0;
      let dieselCost = 0;
      const projectFuelPrice = Number(project.currentFuelPrice || 0);

      directRefuelOperations.forEach((item) => {
        const diesel =
          dieselIndex !== -1 ? parseFloat(item.row[dieselIndex]) || 0 : 0;

        dieselQty += diesel;

        const storedCost = getOperationTotalCostAtOperation(item.row);

        if (storedCost > 0) {
          dieselCost += storedCost;
          return;
        }

        const fallbackPrice =
          projectFuelPrice > 0
            ? projectFuelPrice
            : getOperationLiterPrice(item.row);

        dieselCost += diesel * fallbackPrice;
      });

      return {
        ...project,
        projectManagerName: getProjectManagerDisplayName(project),
        assignedAssetsCount,
        assignedStationsCount,
        assignedFuelersCount,
        operationsCount: directRefuelOperations.length,
        dieselQty,
        dieselCost,
      };
    });
  }, [
    allProjects,
    assets,
    stations,
    fuelers,
    assetProjectHistory,
    directRefuelOperationsByProject,
    dieselIndex,
    dateIndex,
    getLiterPriceByDate,
    projectManagerOptions,
  ]);

  const filteredProjects = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return projectSummary.filter((project) => {
      return (
        !search ||
        String(project.id || "")
          .toLowerCase()
          .includes(search) ||
        String(project.name || "")
          .toLowerCase()
          .includes(search) ||
        String(project.status || "")
          .toLowerCase()
          .includes(search)
      );
    });
  }, [projectSummary, searchTerm]);

  const projectTotals = useMemo(() => {
    return projectSummary.reduce(
      (totals, project) => {
        if (isSameText(project.status, "Active")) {
          totals.activeProjects += 1;
        } else {
          totals.inactiveProjects += 1;
        }

        totals.totalDiesel += project.dieselQty;
        totals.totalCost += project.dieselCost;
        return totals;
      },
      {
        activeProjects: 0,
        inactiveProjects: 0,
        totalDiesel: 0,
        totalCost: 0,
      },
    );
  }, [projectSummary]);

  const { activeProjects, inactiveProjects, totalDiesel, totalCost } =
    projectTotals;

  const closeForm = () => {
    setShowForm(false);
    setPendingProjectConfirmation(null);
    setProjectRejection(null);
    setNewProject({
      id: "",
      name: "",
      status: "Active",
      location: "",
      initialBasePricePerLiter: "",
      initialTransportCostPerLiter: "0",
      initialVatRate: "15",
      approvalStatus: "Pending Approval",
    });
  };

  const showProjectRejection = ({
    title = "Project cannot be created",
    message,
    hint = "",
  }) => {
    setPendingProjectConfirmation(null);
    setProjectRejection({
      title,
      message,
      hint,
    });
    setShowForm(true);
  };

  const goBackToProjectForm = () => {
    setProjectRejection(null);
    setShowForm(true);
  };

  const cancelProjectCreation = () => {
    setProjectRejection(null);
    closeForm();
  };

  const saveProject = async () => {
    if (!hasPermission("projects", "add")) {
      showProjectRejection({
        title: "Action not allowed",
        message: "Read-only access: you cannot add projects.",
        hint: "Contact your system admin if you believe you should have permission to add projects.",
      });
      return;
    }

    if (!currentCompanyId || isPlatformContextValue(currentCompanyId)) {
      showProjectRejection({
        title: "Company is required",
        message: "Please select a customer company before adding projects.",
        hint: "Projects must always be linked to a real customer company.",
      });
      return;
    }

    if (!newProject.id.trim()) {
      showProjectRejection({
        title: "Project ID is required",
        message: "Please enter Project ID.",
        hint: "Project ID will be locked after creation, so make sure it is correct.",
      });
      return;
    }

    if (!newProject.name.trim()) {
      showProjectRejection({
        title: "Project Name is required",
        message: "Please enter Project Name.",
        hint: "Project Name will be locked after creation, so make sure it is correct.",
      });
      return;
    }

    const initialPricing = calculateFuelPricing(
      newProject.initialBasePricePerLiter,
      newProject.initialTransportCostPerLiter,
      newProject.initialVatRate,
    );

    if (!initialPricing.isValid) {
      showProjectRejection({
        title: "Valid initial pricing is required",
        message:
          "Enter a base fuel price above zero, a non-negative delivery cost, and VAT between 0% and 100%.",
        hint: "Net and VAT-inclusive prices are calculated automatically by the backend.",
      });
      return;
    }

    const duplicatedProject = allProjects.find((project) =>
      isSameText(project.id, newProject.id),
    );
    if (duplicatedProject) {
      const duplicateStatus = duplicatedProject.status || "Existing";
      showProjectRejection({
        title: "Project ID cannot be reused",
        message: `Project ID ${newProject.id.trim()} already exists as ${duplicateStatus} and cannot be reused.`,
        hint: "Use a new Project ID. Project IDs remain reserved for audit and historical records.",
      });
      return;
    }

    setProjectRejection(null);
    setPendingProjectConfirmation({
      id: newProject.id.trim(),
      name: newProject.name.trim(),
      status: newProject.status || "Active",
      location: newProject.location || "",
      description: newProject.description || "",
      initialBasePricePerLiter: initialPricing.basePricePerLiter,
      initialTransportCostPerLiter: initialPricing.transportCostPerLiter,
      initialVatRate: initialPricing.vatRate,
      initialNetPricePerLiter: initialPricing.netPricePerLiter,
      initialGrossPricePerLiter: initialPricing.grossPricePerLiter,
    });
  };

  const confirmCreateProject = async () => {
    if (!pendingProjectConfirmation) return;

    try {
      if (typeof onCreateProject === "function") {
        await onCreateProject({
          companyId: currentCompanyId,
          code: pendingProjectConfirmation.id,
          name: pendingProjectConfirmation.name,
          location: pendingProjectConfirmation.location || "",
          description: pendingProjectConfirmation.description || "",
          initialBasePricePerLiter: Number(
            pendingProjectConfirmation.initialBasePricePerLiter,
          ),
          initialTransportCostPerLiter: Number(
            pendingProjectConfirmation.initialTransportCostPerLiter,
          ),
          initialVatRate: Number(pendingProjectConfirmation.initialVatRate),
          isActive: isSameText(pendingProjectConfirmation.status, "Active"),
        });

        trackActivity?.(
          "Add Project",
          "projects",
          `${pendingProjectConfirmation.id} created from backend.`,
        );
        showToast?.("success", "Project saved successfully.");
        closeForm();
        return;
      }

      setLocalProjects((prev) => [
        ...prev,
        {
          ...pendingProjectConfirmation,
          companyId: currentCompanyId,
          source: "Local Pending Add",
          createdAt: new Date().toISOString(),
        },
      ]);

      showToast?.(
        "success",
        "Project saved locally and ready for backend submission.",
      );
      closeForm();
    } catch (error) {
      const rawBackendMessage =
        error?.response?.data?.message || "Failed to save project.";

      const normalizedBackendMessage = Array.isArray(rawBackendMessage)
        ? rawBackendMessage.join(", ")
        : String(rawBackendMessage || "Failed to save project.");

      const friendlyMessage =
        normalizedBackendMessage.toLowerCase().includes("previously used") ||
        normalizedBackendMessage.toLowerCase().includes("cannot be reused") ||
        normalizedBackendMessage.toLowerCase().includes("unique") ||
        normalizedBackendMessage.toLowerCase().includes("duplicate") ||
        normalizedBackendMessage.toLowerCase().includes("already")
          ? "Project ID already exists in system history and cannot be reused."
          : normalizedBackendMessage;

      showProjectRejection({
        title: "Project cannot be created",
        message: friendlyMessage,
        hint: "Use a new Project ID. Project IDs remain reserved even after soft delete.",
      });
    }
  };

  const openStatusEdit = (project) => {
    if (!hasPermission("projects", "edit")) {
      showToast?.(
        "warning",
        "Read-only access: you cannot change project status.",
      );
      return;
    }

    setStatusEdit({
      id: project.id,
      name: project.name,
      oldStatus: project.status || "Inactive",
      newStatus: isSameText(project.status, "Active") ? "Inactive" : "Active",
      reason: "",
    });
  };

  const saveStatusEdit = async () => {
    if (!hasPermission("projects", "edit")) {
      showToast?.(
        "warning",
        "Read-only access: you cannot save project status changes.",
      );
      setStatusEdit(null);
      return;
    }

    if (!statusEdit) return;

    const baseProject = allProjects.find((project) =>
      isSameText(project.id, statusEdit.id),
    );

    try {
      if (typeof onUpdateProject === "function" && baseProject?.backendId) {
        await onUpdateProject(baseProject, {
          isActive: isSameText(statusEdit.newStatus, "Active"),
        });
      } else {
        setLocalProjects((prev) => {
          const exists = prev.some((project) =>
            isSameText(project.id, statusEdit.id),
          );

          if (exists) {
            return prev.map((project) =>
              isSameText(project.id, statusEdit.id)
                ? {
                    ...project,
                    status: statusEdit.newStatus,
                    approvalStatus: "Approved",
                    statusChangeReason: "Status changed by confirmation",
                    statusChangedAt: new Date().toISOString(),
                  }
                : project,
            );
          }

          return [
            ...prev,
            {
              ...baseProject,
              status: statusEdit.newStatus,
              approvalStatus: "Approved",
              source: "Local Status Update",
              statusChangeReason: "Status changed by confirmation",
              statusChangedAt: new Date().toISOString(),
            },
          ];
        });
      }

      trackActivity?.(
        "Change Project Status",
        "projects",
        `${statusEdit.id} status changed to ${statusEdit.newStatus}.`,
      );
      showToast?.("success", "Project status changed successfully.");
      setStatusEdit(null);
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message || "Failed to change project status.";
      notifyUser(
        typeof showToast !== "undefined" ? showToast : null,
        "warning",
        Array.isArray(backendMessage)
          ? backendMessage.join(", ")
          : backendMessage,
      );
    }
  };

  const deleteProject = async (project) => {
    if (!hasPermission("projects", "delete")) {
      showToast?.("warning", "Read-only access: you cannot delete projects.");
      return;
    }

    setProjectDeleteTarget(project);
  };

  const confirmDeleteProject = async () => {
    if (!projectDeleteTarget) return;

    try {
      if (
        typeof onDeleteProject === "function" &&
        projectDeleteTarget?.backendId
      ) {
        await onDeleteProject(projectDeleteTarget);
      } else {
        setLocalProjects((prev) =>
          prev.filter((item) => !isSameText(item.id, projectDeleteTarget.id)),
        );
      }

      if (
        selectedProject &&
        isSameText(selectedProject.id, projectDeleteTarget.id)
      ) {
        setSelectedProject(null);
      }

      trackActivity?.(
        "Delete Project",
        "projects",
        `${projectDeleteTarget.id} was soft deleted.`,
      );
      showToast?.("success", "Project deleted successfully.");
      setProjectDeleteTarget(null);
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message || "Failed to delete project.";
      notifyUser(
        typeof showToast !== "undefined" ? showToast : null,
        "warning",
        Array.isArray(backendMessage)
          ? backendMessage.join(", ")
          : backendMessage,
      );
    }
  };

  const exportRowsToCSV = (fileName, csvHeaders, csvRows) => {
    const csvContent = [csvHeaders, ...csvRows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];

    link.href = url;
    link.download = `${fileName}_${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportProjectsCSV = () => {
    exportRowsToCSV(
      "projects_cards_summary",
      [
        "#",
        "Project ID",
        "Project Name",
        "Status",
        "Approval Status",
        "Project Manager",
        "Assigned Assets",
        "Assigned Stations",
        "Assigned Fuelers",
        "Direct Refuel Operations",
        "Diesel Qty",
        "Base Fuel Price / L",
        "Delivery Cost / L",
        "Operational Price Excl. VAT / L",
        "VAT Rate %",
        "Price Incl. VAT / L",
        "Fuel Price Currency",
        "Fuel Price Effective From",
        "Total Cost",
      ],
      filteredProjects.map((project, i) => [
        i + 1,
        project.id,
        project.name,
        project.status,
        project.approvalStatus,
        project.projectManagerName || "Unassigned",
        project.assignedAssetsCount,
        project.assignedStationsCount,
        project.assignedFuelersCount,
        project.operationsCount,
        project.dieselQty,
        project.currentBaseFuelPrice ?? "",
        project.currentTransportCostPerLiter ?? "",
        project.currentFuelPrice || 0,
        project.currentVatRate ?? "",
        project.currentGrossFuelPrice ?? "",
        project.fuelPriceCurrency || currency,
        project.fuelPriceEffectiveFrom || "",
        project.dieselCost,
      ]),
    );

    setShowSettings(false);
  };

  const printProjectsCards = () => {
    const cardsElement = document.getElementById("projects-cards-print-area");
    if (!cardsElement) return;

    const printWindow = window.open("", "", "width=1400,height=900");

    printWindow.document.write(`
      <html>
        <head>
          <title>Projects / Sites Cards</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 25px; color: #111; }
            h2 { margin-bottom: 8px; font-size: 22px; }
            .report-meta { margin-bottom: 18px; font-size: 12px; color: #555; }
            .print-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
            .project-card-print { border: 1px solid #ccc; border-radius: 14px; padding: 14px; break-inside: avoid; }
            .project-title { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
            .project-id { font-size: 12px; color: #555; margin-bottom: 12px; }
            .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
            .metric { background: #f3f4f6; border-radius: 10px; padding: 8px; }
            .label { font-size: 11px; color: #666; }
            .value { font-size: 15px; font-weight: bold; margin-top: 3px; }
          </style>
        </head>
        <body>
          <h2>Projects / Sites Cards</h2>
          <div class="report-meta">Generated at: ${new Date().toLocaleString()}</div>
          ${cardsElement.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    setShowSettings(false);
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white overflow-y-auto h-screen">
      <div className="fleet-page-shell w-full max-w-[1920px] mx-auto px-2 sm:px-3 lg:px-4 xl:px-5 2xl:px-8 py-3 sm:py-4 lg:py-5 text-[12px] lg:text-[13px]">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Projects / Sites</h1>
            <p className="text-gray-400">
              Project cards, direct refuel tracking, and site assignment
              overview
            </p>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto min-w-0">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search projects..."
              className="h-[48px] flex-1 min-w-0 bg-gray-800 border border-gray-700 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none text-white placeholder:text-slate-400 px-3 lg:px-4 rounded-xl w-full sm:max-w-[320px] text-[12px] lg:text-sm transition-all"
            />

            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="h-[48px] shrink-0 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 px-3 lg:px-4 rounded-xl transition"
              >
                Clear
              </button>
            )}

            <div
              ref={settingsRef}
              className="relative shrink-0 settings-layer-safe cursor-pointer"
            >
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="h-[48px] w-[48px] cursor-pointer flex items-center justify-center bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-yellow-400 text-yellow-400 rounded-xl transition"
                title="Projects settings"
              >
                ☰
              </button>

              {showSettings && (
                <div
                  className={`${getSmartDropdownClass(settingsMenuAlign, "w-48").replace("mt-3", "mt-2")} bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-[10020] overflow-visible`}
                >
                  {hasPermission("projects", "add") && (
                    <button
                      onClick={() => {
                        setShowForm(true);
                        setShowSettings(false);
                      }}
                      className="block w-full cursor-pointer text-left px-4 py-3 hover:bg-slate-800 transition text-white"
                    >
                      + Add Project
                    </button>
                  )}

                  <button
                    onClick={exportProjectsCSV}
                    className="block w-full cursor-pointer text-left px-4 py-3 hover:bg-slate-800 transition text-white border-t border-gray-700"
                  >
                    Export CSV
                  </button>

                  <button
                    onClick={printProjectsCards}
                    className="block w-full cursor-pointer text-left px-4 py-3 hover:bg-slate-800 transition text-white border-t border-gray-700"
                  >
                    Print Cards
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-3 mb-4 min-w-0">
          <Card
            title="Total Projects"
            value={formatNumber(projectSummary.length)}
          />
          <Card title="Active Projects" value={formatNumber(activeProjects)} />
          <Card
            title="Inactive Projects"
            value={formatNumber(inactiveProjects)}
          />
          <Card title="Total Quantity (L)" value={formatNumber(totalDiesel)} />
          <Card
            title={`Total Cost (${currency})`}
            value={formatNumber(totalCost)}
          />
        </div>

        <div className="bg-gray-800 rounded-2xl shadow overflow-hidden border border-gray-700 mb-4">
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-amber-300">
                Projects Cards
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                {filteredProjects.length} cards shown from{" "}
                {projectSummary.length} projects
              </p>
            </div>
          </div>

          <div
            id="projects-cards-print-area"
            className="print-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4 overflow-x-hidden min-w-0"
          >
            {filteredProjects.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-600 bg-slate-950/60 p-8 text-center shadow-inner shadow-black/20">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/40 bg-amber-400/10 text-2xl">
                  🏗️
                </div>
                <h3 className="text-lg font-extrabold text-slate-100">
                  No projects found
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Add your first project for this company, or adjust the search
                  filter to show existing projects.
                </p>
              </div>
            )}

            {filteredProjects.map((project) => (
              <div
                key={makeTenantEntityKey(project)}
                className={`project-card-print group relative overflow-hidden rounded-2xl p-4 shadow-xl transition duration-200 hover:-translate-y-0.5 min-w-0 ${
                  theme === "light"
                    ? "bg-white border border-slate-300 shadow-slate-200/80 hover:border-amber-400"
                    : "bg-gradient-to-br from-slate-950 via-gray-900 to-slate-900 border border-slate-700/90 shadow-black/20 hover:border-amber-400/80"
                }`}
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400/90 via-blue-400/60 to-transparent" />

                <div className="flex justify-between items-start gap-3 mb-4 pt-1">
                  <div className="min-w-0">
                    <button
                      onClick={() => {
                        setSelectedProject(project);
                        setProjectOperationSearch("");
                      }}
                      className={`project-title cursor-pointer text-left text-base sm:text-lg font-extrabold transition block truncate ${
                        theme === "light"
                          ? "text-blue-900 hover:text-amber-700"
                          : "text-blue-200 group-hover:text-amber-300"
                      }`}
                    >
                      {project.name || project.id}
                    </button>

                    <p
                      className={`project-id text-[11px] mt-1 ${
                        theme === "light" ? "text-slate-600" : "text-slate-400"
                      }`}
                    >
                      <span
                        className={
                          theme === "light"
                            ? "text-slate-500"
                            : "text-slate-500"
                        }
                      >
                        Project ID:
                      </span>{" "}
                      <span
                        className={`font-semibold ${
                          theme === "light"
                            ? "text-slate-800"
                            : "text-slate-300"
                        }`}
                      >
                        {project.id}
                      </span>
                    </p>

                    <div
                      className={`mt-3 rounded-xl border px-3 py-2 ${
                        theme === "light"
                          ? "border-slate-300 bg-slate-50"
                          : "border-slate-700 bg-slate-950/70"
                      }`}
                    >
                      <p
                        className={`text-[10px] uppercase tracking-[0.16em] font-bold ${
                          theme === "light"
                            ? "text-slate-500"
                            : "text-slate-400"
                        }`}
                      >
                        Project Manager
                      </p>

                      {isAdminProjectManagerEditor ? (
                        <select
                          value={project.projectManagerId || ""}
                          onChange={(event) =>
                            requestProjectManagerChange(
                              project,
                              event.target.value,
                            )
                          }
                          className={`mt-1 w-full cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-bold outline-none transition ${
                            theme === "light"
                              ? "border-slate-300 bg-white text-slate-800 focus:border-amber-500"
                              : "border-slate-700 bg-slate-900 text-slate-100 focus:border-amber-400"
                          }`}
                        >
                          <option value="">Assign manager</option>
                          {projectManagerOptions.map((manager) => (
                            <option key={manager.id} value={manager.id}>
                              {manager.fullName || manager.email}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p
                          className={`mt-1 truncate text-sm font-extrabold ${
                            theme === "light"
                              ? "text-slate-800"
                              : "text-slate-100"
                          }`}
                        >
                          {project.projectManagerName || "Unassigned"}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openFuelPriceModal(project)}
                      className={`mt-3 w-full cursor-pointer rounded-xl border px-3 py-2 text-left transition hover:-translate-y-0.5 ${
                        theme === "light"
                          ? "border-emerald-200 bg-emerald-50 text-slate-900 hover:border-emerald-400 hover:bg-emerald-100"
                          : "border-emerald-500/30 bg-emerald-500/10 text-slate-100 hover:border-emerald-300/70 hover:bg-emerald-500/15"
                      }`}
                      title="Update project fuel price"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p
                            className={`text-[10px] font-bold uppercase tracking-[0.16em] ${
                              theme === "light"
                                ? "text-emerald-700"
                                : "text-emerald-300"
                            }`}
                          >
                            Operational Price (Excl. VAT)
                          </p>
                          <p className="mt-1 text-lg font-extrabold">
                            {formatNumber(project.currentFuelPrice || 0)}{" "}
                            {project.fuelPriceCurrency || currency}/L
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                            theme === "light"
                              ? "bg-white text-emerald-700 border border-emerald-200"
                              : "bg-slate-950/70 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          Edit
                        </span>
                      </div>
                      <p
                        className={`mt-1 text-[11px] ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}
                      >
                        Effective:{" "}
                        {formatProjectFuelPriceDate(
                          project.fuelPriceEffectiveFrom,
                        )}
                      </p>
                      {hasProjectPricingComponents(project) ? (
                        <div
                          className={`mt-2 grid grid-cols-2 gap-2 border-t pt-2 text-[11px] ${
                            theme === "light"
                              ? "border-emerald-200 text-slate-600"
                              : "border-emerald-500/20 text-slate-300"
                          }`}
                        >
                          <span>
                            Base:{" "}
                            {formatNumber(project.currentBaseFuelPrice || 0)} +
                            Delivery:{" "}
                            {formatNumber(
                              project.currentTransportCostPerLiter || 0,
                            )}
                          </span>
                          <span className="text-right font-bold">
                            Incl. VAT:{" "}
                            {formatNumber(project.currentGrossFuelPrice || 0)}{" "}
                            {project.fuelPriceCurrency || currency}/L
                          </span>
                        </div>
                      ) : (
                        <p
                          className={`mt-2 border-t pt-2 text-[11px] ${
                            theme === "light"
                              ? "border-amber-200 text-amber-700"
                              : "border-amber-500/20 text-amber-300"
                          }`}
                        >
                          Legacy combined price · component and VAT breakdown
                          unavailable
                        </p>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {hasPermission("projects", "edit") ? (
                      <button
                        onClick={() => openStatusEdit(project)}
                        title="Click to change status"
                        className="cursor-pointer rounded-full transition hover:scale-105"
                      >
                        <StatusBadge status={project.status || "Inactive"} />
                      </button>
                    ) : (
                      <StatusBadge status={project.status || "Inactive"} />
                    )}

                    {hasPermission("projects", "delete") && (
                      <button
                        onClick={() => deleteProject(project)}
                        title="Delete project"
                        className={`h-8 w-8 cursor-pointer flex items-center justify-center rounded-full border transition hover:scale-105 ${
                          theme === "light"
                            ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
                            : "border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/25 hover:text-red-100"
                        }`}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 min-w-0">
                  <div
                    className={`metric rounded-xl p-2 lg:p-3 border min-w-0 shadow-inner ${
                      theme === "light"
                        ? "bg-slate-50 border-slate-300 shadow-slate-200/70"
                        : "bg-slate-950/70 border-slate-700/80 shadow-black/10"
                    }`}
                  >
                    <p
                      className={`label text-[11px] ${theme === "light" ? "text-slate-500" : "text-gray-400"}`}
                    >
                      Assets
                    </p>

                    <p
                      className={`value text-xl font-bold mt-1 ${
                        theme === "light" ? "text-slate-900" : "text-white"
                      }`}
                    >
                      {formatNumber(project.assignedAssetsCount)}
                    </p>
                  </div>

                  <div
                    className={`metric rounded-xl p-2 lg:p-3 border min-w-0 shadow-inner ${
                      theme === "light"
                        ? "bg-slate-50 border-slate-300 shadow-slate-200/70"
                        : "bg-slate-950/70 border-slate-700/80 shadow-black/10"
                    }`}
                  >
                    <p
                      className={`label text-[11px] ${theme === "light" ? "text-slate-500" : "text-gray-400"}`}
                    >
                      Stations
                    </p>

                    <p
                      className={`value text-xl font-bold mt-1 ${
                        theme === "light" ? "text-slate-900" : "text-white"
                      }`}
                    >
                      {formatNumber(project.assignedStationsCount)}
                    </p>
                  </div>

                  <div
                    className={`metric rounded-xl p-2 lg:p-3 border min-w-0 shadow-inner ${
                      theme === "light"
                        ? "bg-slate-50 border-slate-300 shadow-slate-200/70"
                        : "bg-slate-950/70 border-slate-700/80 shadow-black/10"
                    }`}
                  >
                    <p
                      className={`label text-[11px] ${theme === "light" ? "text-slate-500" : "text-gray-400"}`}
                    >
                      Fuelers
                    </p>

                    <p
                      className={`value text-xl font-bold mt-1 ${
                        theme === "light" ? "text-slate-900" : "text-white"
                      }`}
                    >
                      {formatNumber(project.assignedFuelersCount)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-0">
                  <div
                    className={`metric rounded-xl p-2 lg:p-3 border min-w-0 shadow-inner ${
                      theme === "light"
                        ? "bg-slate-50 border-slate-300 shadow-slate-200/70"
                        : "bg-slate-950/70 border-slate-700/80 shadow-black/10"
                    }`}
                  >
                    <p
                      className={`label text-[11px] ${theme === "light" ? "text-slate-500" : "text-gray-400"}`}
                    >
                      Direct Refuel
                    </p>

                    <p className="value text-xl font-bold text-yellow-500 mt-1">
                      {formatNumber(project.operationsCount)}
                    </p>
                  </div>

                  <div
                    className={`metric rounded-xl p-2 lg:p-3 border min-w-0 shadow-inner ${
                      theme === "light"
                        ? "bg-slate-50 border-slate-300 shadow-slate-200/70"
                        : "bg-slate-950/70 border-slate-700/80 shadow-black/10"
                    }`}
                  >
                    <p
                      className={`label text-[11px] ${theme === "light" ? "text-slate-500" : "text-gray-400"}`}
                    >
                      Qty Liters
                    </p>

                    <p className="value text-xl font-bold text-emerald-500 mt-1">
                      {formatNumber(project.dieselQty)}
                    </p>
                  </div>

                  <div
                    className={`metric rounded-xl p-2 lg:p-3 border min-w-0 shadow-inner ${
                      theme === "light"
                        ? "bg-slate-50 border-slate-300 shadow-slate-200/70"
                        : "bg-slate-950/70 border-slate-700/80 shadow-black/10"
                    }`}
                  >
                    <p
                      className={`label text-[11px] ${theme === "light" ? "text-slate-500" : "text-gray-400"}`}
                    >
                      Cost
                    </p>

                    <p className="value text-base sm:text-lg font-bold text-blue-600 mt-1">
                      {formatNumber(project.dieselCost)}
                    </p>
                  </div>
                </div>

                <div
                  className={`mt-4 flex justify-between items-center text-xs border-t pt-3 ${
                    theme === "light"
                      ? "text-slate-500 border-slate-300"
                      : "text-gray-400 border-gray-700"
                  }`}
                >
                  <span>Approval: {project.approvalStatus || "Approved"}</span>
                  <span>{currency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {fuelPriceModalOpen && selectedProjectForFuelPrice && (
          <ModalPortal>
            <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
              <div
                className={`w-full max-w-xl overflow-hidden rounded-3xl border shadow-2xl ${
                  theme === "light"
                    ? "border-slate-300 bg-white text-slate-950 shadow-slate-300/70"
                    : "border-emerald-500/30 bg-slate-950 text-white shadow-black/40"
                }`}
              >
                <div
                  className={`flex items-start justify-between gap-3 border-b p-5 ${
                    theme === "light"
                      ? "border-slate-200 bg-slate-50"
                      : "border-slate-800 bg-slate-900"
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-400">
                      Project fuel pricing
                    </p>
                    <h2 className="mt-1 text-xl font-extrabold">
                      Update Fuel Price
                    </h2>
                    <p
                      className={`mt-1 text-sm ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}
                    >
                      {selectedProjectForFuelPrice.name ||
                        selectedProjectForFuelPrice.id}
                    </p>
                  </div>

                  <button
                    onClick={closeFuelPriceModal}
                    className={`h-9 w-9 rounded-full text-xl transition ${
                      theme === "light"
                        ? "bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500"
                        : "bg-slate-800 text-slate-400 hover:bg-red-500/20 hover:text-red-300"
                    }`}
                    disabled={fuelPriceSaving}
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4 p-5">
                  <div
                    className={`rounded-2xl border p-4 ${
                      theme === "light"
                        ? "border-slate-200 bg-slate-50"
                        : "border-slate-800 bg-slate-900/70"
                    }`}
                  >
                    <p
                      className={`text-xs ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}
                    >
                      Current project fuel price
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-emerald-400">
                      {formatNumber(
                        selectedProjectForFuelPrice.currentFuelPrice || 0,
                      )}{" "}
                      {selectedProjectForFuelPrice.fuelPriceCurrency ||
                        currency}
                      /L
                    </p>
                    {hasProjectPricingComponents(
                      selectedProjectForFuelPrice,
                    ) ? (
                      <div
                        className={`mt-2 grid grid-cols-2 gap-2 text-xs ${theme === "light" ? "text-slate-600" : "text-slate-300"}`}
                      >
                        <span>
                          Base:{" "}
                          {formatNumber(
                            selectedProjectForFuelPrice.currentBaseFuelPrice,
                          )}{" "}
                          {currency}/L
                        </span>
                        <span>
                          Delivery:{" "}
                          {formatNumber(
                            selectedProjectForFuelPrice.currentTransportCostPerLiter,
                          )}{" "}
                          {currency}/L
                        </span>
                        <span>
                          VAT:{" "}
                          {formatNumber(
                            selectedProjectForFuelPrice.currentVatRate,
                          )}
                          %
                        </span>
                        <span>
                          Incl. VAT:{" "}
                          {formatNumber(
                            selectedProjectForFuelPrice.currentGrossFuelPrice,
                          )}{" "}
                          {currency}/L
                        </span>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs font-semibold text-amber-500">
                        Legacy combined price — its base, delivery and VAT
                        components are unavailable.
                      </p>
                    )}
                    <p
                      className={`mt-2 text-xs ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}
                    >
                      Effective:{" "}
                      {formatProjectFuelPriceDate(
                        selectedProjectForFuelPrice.fuelPriceEffectiveFrom,
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="text-sm font-bold">
                        Base Fuel Price / L
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={fuelPriceForm.basePricePerLiter}
                        onChange={(event) =>
                          setFuelPriceForm((prev) => ({
                            ...prev,
                            basePricePerLiter: event.target.value,
                          }))
                        }
                        className={`mt-2 w-full rounded-xl border px-4 py-3 outline-none transition ${
                          theme === "light"
                            ? "border-slate-300 bg-white text-slate-900 focus:border-emerald-500"
                            : "border-slate-700 bg-slate-900 text-white focus:border-emerald-400"
                        }`}
                        placeholder="1.70"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold">
                        Delivery Cost / L
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={fuelPriceForm.transportCostPerLiter}
                        onChange={(event) =>
                          setFuelPriceForm((prev) => ({
                            ...prev,
                            transportCostPerLiter: event.target.value,
                          }))
                        }
                        className={`mt-2 w-full rounded-xl border px-4 py-3 outline-none transition ${theme === "light" ? "border-slate-300 bg-white text-slate-900 focus:border-emerald-500" : "border-slate-700 bg-slate-900 text-white focus:border-emerald-400"}`}
                        placeholder="0.30"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold">VAT Rate %</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={fuelPriceForm.vatRate}
                        onChange={(event) =>
                          setFuelPriceForm((prev) => ({
                            ...prev,
                            vatRate: event.target.value,
                          }))
                        }
                        className={`mt-2 w-full rounded-xl border px-4 py-3 outline-none transition ${theme === "light" ? "border-slate-300 bg-white text-slate-900 focus:border-emerald-500" : "border-slate-700 bg-slate-900 text-white focus:border-emerald-400"}`}
                        placeholder="15"
                      />
                    </div>
                  </div>

                  <div
                    className={`grid grid-cols-1 gap-3 rounded-2xl border p-4 sm:grid-cols-3 ${theme === "light" ? "border-emerald-200 bg-emerald-50" : "border-emerald-500/30 bg-emerald-500/10"}`}
                  >
                    <div>
                      <p className="text-xs opacity-70">
                        Operational price excl. VAT
                      </p>
                      <p className="mt-1 font-extrabold">
                        {fuelPricePreview?.isValid
                          ? formatNumber(fuelPricePreview.netPricePerLiter)
                          : "-"}{" "}
                        {currency}/L
                      </p>
                    </div>
                    <div>
                      <p className="text-xs opacity-70">VAT per liter</p>
                      <p className="mt-1 font-extrabold">
                        {fuelPricePreview?.isValid
                          ? formatNumber(fuelPricePreview.vatAmountPerLiter)
                          : "-"}{" "}
                        {currency}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs opacity-70">Price incl. VAT</p>
                      <p className="mt-1 font-extrabold text-emerald-500">
                        {fuelPricePreview?.isValid
                          ? formatNumber(fuelPricePreview.grossPricePerLiter)
                          : "-"}{" "}
                        {currency}/L
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold">Effective From</label>
                    <input
                      type="datetime-local"
                      value={fuelPriceForm.effectiveFrom}
                      onChange={(event) =>
                        setFuelPriceForm((prev) => ({
                          ...prev,
                          effectiveFrom: event.target.value,
                        }))
                      }
                      className={`mt-2 w-full rounded-xl border px-4 py-3 outline-none transition ${
                        theme === "light"
                          ? "border-slate-300 bg-white text-slate-900 focus:border-emerald-500"
                          : "border-slate-700 bg-slate-900 text-white focus:border-emerald-400"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold">Reason</label>
                    <textarea
                      rows={3}
                      value={fuelPriceForm.reason}
                      onChange={(event) =>
                        setFuelPriceForm((prev) => ({
                          ...prev,
                          reason: event.target.value,
                        }))
                      }
                      className={`mt-2 w-full resize-none rounded-xl border px-4 py-3 outline-none transition ${
                        theme === "light"
                          ? "border-slate-300 bg-white text-slate-900 focus:border-emerald-500"
                          : "border-slate-700 bg-slate-900 text-white focus:border-emerald-400"
                      }`}
                      placeholder="Example: Fuel price with transport cost for this project"
                    />
                  </div>
                </div>

                <div
                  className={`flex justify-end gap-3 border-t p-5 ${
                    theme === "light"
                      ? "border-slate-200 bg-slate-50"
                      : "border-slate-800 bg-slate-900"
                  }`}
                >
                  <button
                    onClick={closeFuelPriceModal}
                    disabled={fuelPriceSaving}
                    className={`rounded-xl px-4 py-2 font-bold transition ${
                      theme === "light"
                        ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                        : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                    }`}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={saveProjectFuelPrice}
                    disabled={fuelPriceSaving}
                    className="rounded-xl bg-emerald-500 px-4 py-2 font-extrabold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {fuelPriceSaving ? "Saving..." : "Save Fuel Price"}
                  </button>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}

        {selectedProject && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] p-3">
            <div className="bg-gray-900 text-white w-[1200px] max-h-[90vh] rounded-3xl shadow-2xl border border-gray-700 overflow-hidden">
              <div className="p-3 sm:p-5 border-b border-gray-700 flex justify-between items-start gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-yellow-400 italic underline">
                    Project Direct Refuel Operations
                  </h2>
                  <p className="text-gray-400 mt-1">
                    Project:{" "}
                    <span className="text-blue-300 font-semibold">
                      {selectedProject.name || selectedProject.id}
                    </span>
                  </p>
                  <p className="text-gray-400 mt-1 text-sm">
                    Project Manager:{" "}
                    <span className="text-emerald-300 font-semibold">
                      {selectedProject.projectManagerName || "Unassigned"}
                    </span>
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedProject(null);
                    setProjectOperationSearch("");
                  }}
                  className="text-gray-400 hover:text-red-400 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 p-3 sm:p-4 lg:p-5 border-b border-gray-800">
                <Card
                  title="Assets"
                  value={formatNumber(selectedProject.assignedAssetsCount)}
                />
                <Card
                  title="Stations"
                  value={formatNumber(selectedProject.assignedStationsCount)}
                />
                <Card
                  title="Fuelers"
                  value={formatNumber(selectedProject.assignedFuelersCount)}
                />
                <Card
                  title="Direct Refuel"
                  value={formatNumber(selectedProject.operationsCount)}
                />
                <Card
                  title="Qty Liters"
                  value={formatNumber(selectedProject.dieselQty)}
                />
              </div>

              <div className="p-5 overflow-auto max-h-[62vh]">
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-5 flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-amber-300">
                      Direct Refuel Operations Table
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {getFilteredProjectOperations(selectedProject).length}{" "}
                      shown from{" "}
                      {getDirectRefuelOperations(selectedProject).length}{" "}
                      operations
                    </p>
                  </div>

                  <input
                    value={projectOperationSearch}
                    onChange={(e) => setProjectOperationSearch(e.target.value)}
                    placeholder="Search by operation, equipment, station, fueler..."
                    className="bg-gray-900 border border-gray-700 focus:border-yellow-400 outline-none rounded-xl px-3 lg:px-4 py-2 lg:py-3 text-white w-full sm:min-w-[280px] lg:min-w-[360px] text-[12px] lg:text-sm"
                  />
                </div>

                <table className="min-w-[860px] lg:min-w-[980px] xl:min-w-[1100px] w-full border-collapse text-[11px] sm:text-xs lg:text-sm">
                  <thead className="bg-slate-800 sticky top-0 z-[1] shadow-sm">
                    <tr>
                      <Th>#</Th>
                      <Th>Date</Th>
                      <Th>Operation ID</Th>
                      <Th>Station</Th>
                      <Th>Fueler</Th>
                      <Th>Equipment</Th>
                      <Th>Liters</Th>
                      <Th>Odometer</Th>
                      <Th>Cost</Th>
                    </tr>
                  </thead>

                  <tbody>
                    {getFilteredProjectOperations(selectedProject).map(
                      (item, i) => {
                        const row = item.row;
                        const diesel =
                          dieselIndex !== -1
                            ? parseFloat(row[dieselIndex]) || 0
                            : 0;
                        const selectedProjectFuelPrice = Number(
                          selectedProject.currentFuelPrice || 0,
                        );
                        const storedCost =
                          getOperationTotalCostAtOperation(row);
                        const cost =
                          storedCost > 0
                            ? storedCost
                            : diesel *
                              (selectedProjectFuelPrice > 0
                                ? selectedProjectFuelPrice
                                : getOperationLiterPrice(row));

                        return (
                          <tr
                            key={item.originalIndex}
                            className="hover:bg-slate-800/70 transition-colors duration-150"
                          >
                            <Td>{i + 1}</Td>
                            <Td>
                              {dateIndex !== -1
                                ? formatProjectDate(row[dateIndex])
                                : "-"}
                            </Td>
                            <Td>
                              {operationIdIndex !== -1
                                ? row[operationIdIndex]
                                : item.originalIndex + 1}
                            </Td>
                            <Td>
                              {sourceIndex !== -1
                                ? row[sourceIndex] || "-"
                                : "-"}
                            </Td>
                            <Td>
                              {fuelerIndex !== -1
                                ? row[fuelerIndex] || "-"
                                : "-"}
                            </Td>
                            <Td strong>
                              {destinationIndex !== -1
                                ? row[destinationIndex] || "-"
                                : "-"}
                            </Td>
                            <Td>{formatNumber(diesel)}</Td>
                            <Td>
                              {odometerIndex !== -1
                                ? formatNumber(row[odometerIndex])
                                : "-"}
                            </Td>
                            <Td>
                              {formatNumber(cost)} {currency}
                            </Td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>

                {getFilteredProjectOperations(selectedProject).length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    No matching Direct Refuel operations found for this project.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {statusEdit && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10010] p-3">
            <div className="bg-white text-black w-[520px] rounded-2xl shadow-2xl p-6">
              <div className="flex justify-between items-center mb-5 border-b pb-3">
                <h2 className="text-xl sm:text-2xl font-bold">
                  Change Project Status
                </h2>
                <button
                  onClick={() => setStatusEdit(null)}
                  className="text-gray-500 hover:text-black text-xl"
                >
                  ×
                </button>
              </div>

              <div className="bg-gray-100 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-600">Project</p>
                <p className="text-base sm:text-lg font-bold">
                  {statusEdit.name || statusEdit.id}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  {statusEdit.oldStatus} →{" "}
                  <span className="font-bold">{statusEdit.newStatus}</span>
                </p>
              </div>

              <p className="text-sm text-gray-600 mb-5">
                This status change will be saved directly after confirmation
                without reason or password.
              </p>

              <div className="flex justify-end gap-3 border-t border-slate-700/80 px-6 py-5 bg-slate-950/90">
                <button
                  onClick={() => setStatusEdit(null)}
                  className="bg-gray-200 px-3 lg:px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>

                <button
                  onClick={saveStatusEdit}
                  className="bg-amber-500 hover:bg-amber-400 text-black px-3 lg:px-4 py-2 rounded-lg font-bold"
                >
                  Save Status Change
                </button>
              </div>
            </div>
          </div>
        )}

        {pendingManagerConfirmation && (
          <ModalPortal>
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
              <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-amber-400/40 bg-slate-950 text-white shadow-2xl shadow-black/40">
                <div className="border-b border-slate-700 bg-gradient-to-r from-slate-900 to-slate-800 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">
                    Admin confirmation
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold">
                    Change Project Manager
                  </h2>
                </div>

                <div className="space-y-4 p-5">
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 text-sm leading-6 text-slate-300">
                    <p>
                      Project:{" "}
                      <span className="font-extrabold text-blue-200">
                        {pendingManagerConfirmation.project?.name ||
                          pendingManagerConfirmation.project?.id}
                      </span>
                    </p>
                    <p>
                      Current Manager:{" "}
                      <span className="font-bold text-slate-100">
                        {pendingManagerConfirmation.oldManagerName ||
                          "Unassigned"}
                      </span>
                    </p>
                    <p>
                      New Manager:{" "}
                      <span className="font-bold text-emerald-300">
                        {pendingManagerConfirmation.managerName}
                      </span>
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">
                    Only Admin can change the Project Manager. This change will
                    be applied immediately after confirmation and does not
                    require approval workflow.
                  </div>
                </div>

                <div className="flex flex-col justify-end gap-3 border-t border-slate-700 bg-slate-950 p-5 sm:flex-row">
                  <button
                    onClick={() => setPendingManagerConfirmation(null)}
                    disabled={managerSaving}
                    className="rounded-xl border border-slate-600 bg-slate-900 px-5 py-2.5 font-bold text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={confirmProjectManagerChange}
                    disabled={managerSaving}
                    className="rounded-xl bg-amber-500 px-5 py-2.5 font-extrabold text-slate-950 shadow-lg shadow-amber-950/30 transition hover:bg-amber-400 disabled:opacity-60"
                  >
                    {managerSaving ? "Saving..." : "Confirm Change"}
                  </button>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}

        {projectRejection && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10090] p-3">
            <div className="bg-slate-950 text-white w-full max-w-[540px] rounded-3xl shadow-2xl border border-red-400/30 overflow-hidden">
              <div className="p-5 border-b border-slate-700 bg-gradient-to-r from-red-950/70 to-slate-900 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-red-300 font-bold">
                    Creation rejected
                  </p>
                  <h2 className="text-xl sm:text-2xl font-extrabold mt-1">
                    {projectRejection.title}
                  </h2>
                </div>

                <button
                  onClick={cancelProjectCreation}
                  className="h-9 w-9 rounded-full border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  ×
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4">
                  <p className="text-sm font-bold text-red-200">
                    {projectRejection.message}
                  </p>

                  {projectRejection.hint && (
                    <p className="text-xs text-red-100/80 mt-2 leading-5">
                      {projectRejection.hint}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 text-xs leading-5 text-slate-300">
                  You can go back to correct the project details, or cancel the
                  creation process completely.
                </div>
              </div>

              <div className="p-5 border-t border-slate-700 flex flex-col sm:flex-row justify-end gap-3 bg-slate-950">
                <button
                  onClick={cancelProjectCreation}
                  className="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  onClick={goBackToProjectForm}
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold shadow-lg shadow-amber-500/10 transition cursor-pointer"
                >
                  Back to Add Project
                </button>
              </div>
            </div>
          </div>
        )}

        {pendingProjectConfirmation && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10080] p-3">
            <div className="bg-slate-950 text-white w-full max-w-[560px] rounded-3xl shadow-2xl border border-amber-400/30 overflow-hidden">
              <div className="p-5 border-b border-slate-700 bg-gradient-to-r from-slate-900 to-slate-800 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-amber-300 font-bold">
                    Final confirmation
                  </p>
                  <h2 className="text-xl sm:text-2xl font-extrabold mt-1">
                    Create Project
                  </h2>
                </div>
                <button
                  onClick={() => setPendingProjectConfirmation(null)}
                  className="h-9 w-9 rounded-full border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800 transition"
                >
                  ×
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-400 text-xs">Project ID</p>
                      <p className="font-bold text-blue-200 mt-1">
                        {pendingProjectConfirmation.id}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Status</p>
                      <p className="font-bold text-emerald-200 mt-1">
                        {pendingProjectConfirmation.status}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-slate-400 text-xs">Project Name</p>
                      <p className="font-bold text-white mt-1">
                        {pendingProjectConfirmation.name}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-slate-400 text-xs">Location</p>
                      <p className="font-bold text-slate-200 mt-1">
                        {pendingProjectConfirmation.location || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Base / L</p>
                      <p className="mt-1 font-bold">
                        {formatNumber(
                          pendingProjectConfirmation.initialBasePricePerLiter,
                        )}{" "}
                        {currency}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Delivery / L</p>
                      <p className="mt-1 font-bold">
                        {formatNumber(
                          pendingProjectConfirmation.initialTransportCostPerLiter,
                        )}{" "}
                        {currency}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">
                        Operational excl. VAT
                      </p>
                      <p className="mt-1 font-bold">
                        {formatNumber(
                          pendingProjectConfirmation.initialNetPricePerLiter,
                        )}{" "}
                        {currency}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">VAT</p>
                      <p className="mt-1 font-bold">
                        {formatNumber(
                          pendingProjectConfirmation.initialVatRate,
                        )}
                        %
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-slate-400 text-xs">
                        Price incl. VAT / L
                      </p>
                      <p className="mt-1 font-extrabold text-emerald-300">
                        {formatNumber(
                          pendingProjectConfirmation.initialGrossPricePerLiter,
                        )}{" "}
                        {currency}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4">
                  <p className="text-sm font-bold text-amber-200">
                    This data cannot be edited later.
                  </p>
                  <p className="text-xs text-amber-100/80 mt-1 leading-5">
                    Please confirm that Project ID, name, and location are
                    correct before creating this project.
                  </p>
                </div>
              </div>

              <div className="p-5 border-t border-slate-700 flex flex-col sm:flex-row justify-end gap-3 bg-slate-950">
                <button
                  onClick={() => {
                    setPendingProjectConfirmation(null);
                    setShowForm(true);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-800 transition"
                >
                  Review Again
                </button>
                <button
                  onClick={confirmCreateProject}
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold shadow-lg shadow-amber-500/10 transition"
                >
                  Confirm & Create
                </button>
              </div>
            </div>
          </div>
        )}

        {projectDeleteTarget && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10030] p-3">
            <div className="bg-slate-950 text-white w-full max-w-[520px] rounded-3xl shadow-2xl border border-red-400/30 overflow-hidden">
              <div className="p-5 border-b border-slate-700 bg-gradient-to-r from-red-950/70 to-slate-900 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-red-300 font-bold">
                    Soft delete
                  </p>
                  <h2 className="text-xl sm:text-2xl font-extrabold mt-1">
                    Delete Project?
                  </h2>
                </div>
                <button
                  onClick={() => setProjectDeleteTarget(null)}
                  className="h-9 w-9 rounded-full border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800 transition"
                >
                  ×
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
                  <p className="text-xs text-slate-400">Project</p>
                  <p className="font-extrabold text-white mt-1">
                    {projectDeleteTarget.name || projectDeleteTarget.id}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    Project ID: {projectDeleteTarget.id}
                  </p>
                </div>

                <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4">
                  <p className="text-sm font-bold text-red-200">
                    The project will be hidden from active screens.
                  </p>
                  <p className="text-xs text-red-100/80 mt-1 leading-5">
                    This is a soft delete. The record will remain in the
                    database for audit history and future reference.
                  </p>
                </div>
              </div>

              <div className="p-5 border-t border-slate-700 flex flex-col sm:flex-row justify-end gap-3 bg-slate-950">
                <button
                  onClick={() => setProjectDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteProject}
                  className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-extrabold shadow-lg shadow-red-500/10 transition"
                >
                  Delete Project
                </button>
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <ModalPortal>
            <div className="fixed inset-0 z-[10030] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
              <div className="w-[95%] max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-amber-400/25 bg-slate-950 text-slate-100 shadow-2xl shadow-black/50">
                <div className="flex items-start justify-between gap-4 border-b border-slate-700 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-6 py-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">
                      Projects / Sites
                    </p>
                    <h2 className="mt-1 text-2xl font-extrabold text-white">
                      Add Project
                    </h2>
                  </div>

                  <button
                    onClick={closeForm}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-600 text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-5 px-6 py-5">
                  <div className="rounded-2xl border border-amber-400/60 bg-gradient-to-r from-amber-950/95 via-slate-900 to-slate-950 p-4 shadow-lg shadow-black/20">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-300/60 bg-amber-400/15 font-black text-amber-200">
                        !
                      </span>

                      <div>
                        <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-amber-300">
                          Data lock warning
                        </p>
                        <p className="mt-1 text-base font-extrabold text-white">
                          Please verify project details before saving
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-300">
                          Project ID, name, location, and description will be
                          locked after creation. You can only change the project
                          status later from the Active / Inactive badge.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center sm:gap-4">
                      <label className="font-semibold text-slate-300">
                        Project ID
                      </label>
                      <input
                        value={newProject.id}
                        onChange={(e) =>
                          setNewProject({ ...newProject, id: e.target.value })
                        }
                        placeholder="Example: PRJ-001"
                        className="col-span-2 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center sm:gap-4">
                      <label className="font-semibold text-slate-300">
                        Project Name
                      </label>
                      <input
                        value={newProject.name}
                        onChange={(e) =>
                          setNewProject({ ...newProject, name: e.target.value })
                        }
                        placeholder="Example: NEOM Site A"
                        className="col-span-2 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center sm:gap-4">
                      <label className="font-semibold text-slate-300">
                        Status
                      </label>
                      <select
                        value={newProject.status}
                        onChange={(e) =>
                          setNewProject({
                            ...newProject,
                            status: e.target.value,
                          })
                        }
                        className="col-span-2 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                      >
                        <option value="">Select status</option>
                        {["Active", "Inactive"].map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center sm:gap-4">
                      <label className="font-semibold text-slate-300">
                        Location
                      </label>

                      {shouldUseLocationDropdown ? (
                        <select
                          value={newProject.location}
                          onChange={(e) =>
                            setNewProject({
                              ...newProject,
                              location: e.target.value,
                            })
                          }
                          className="col-span-2 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                        >
                          <option value="">
                            Select location for{" "}
                            {currentCompanyCountry || "company country"}
                          </option>
                          {projectLocationOptions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={newProject.location}
                          onChange={(e) =>
                            setNewProject({
                              ...newProject,
                              location: e.target.value,
                            })
                          }
                          placeholder={
                            currentCompanyCountry
                              ? `Enter location in ${currentCompanyCountry}`
                              : "Enter location manually"
                          }
                          className="col-span-2 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                        />
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                      <p className="mb-3 font-bold text-amber-300">
                        Initial Fuel Pricing
                      </p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-300">
                            Base Price / L
                          </label>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={newProject.initialBasePricePerLiter}
                            onChange={(e) =>
                              setNewProject({
                                ...newProject,
                                initialBasePricePerLiter: e.target.value,
                              })
                            }
                            placeholder="1.70"
                            className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-300">
                            Delivery / L
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={newProject.initialTransportCostPerLiter}
                            onChange={(e) =>
                              setNewProject({
                                ...newProject,
                                initialTransportCostPerLiter: e.target.value,
                              })
                            }
                            placeholder="0.30"
                            className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-300">
                            VAT %
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={newProject.initialVatRate}
                            onChange={(e) =>
                              setNewProject({
                                ...newProject,
                                initialVatRate: e.target.value,
                              })
                            }
                            placeholder="15"
                            className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                        <span>
                          Operational:{" "}
                          <b>
                            {newProjectPricingPreview?.isValid
                              ? formatNumber(
                                  newProjectPricingPreview.netPricePerLiter,
                                )
                              : "-"}{" "}
                            {currency}/L
                          </b>
                        </span>
                        <span>
                          VAT/L:{" "}
                          <b>
                            {newProjectPricingPreview?.isValid
                              ? formatNumber(
                                  newProjectPricingPreview.vatAmountPerLiter,
                                )
                              : "-"}{" "}
                            {currency}
                          </b>
                        </span>
                        <span className="text-emerald-300">
                          Incl. VAT:{" "}
                          <b>
                            {newProjectPricingPreview?.isValid
                              ? formatNumber(
                                  newProjectPricingPreview.grossPricePerLiter,
                                )
                              : "-"}{" "}
                            {currency}/L
                          </b>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-end gap-3 border-t border-slate-700 bg-slate-950/95 px-6 py-5 sm:flex-row">
                  <button
                    onClick={closeForm}
                    className="rounded-xl border border-slate-600 bg-slate-900 px-5 py-2.5 font-bold text-slate-200 transition hover:bg-slate-800"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={saveProject}
                    className="rounded-xl bg-emerald-500 px-5 py-2.5 font-extrabold text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400"
                  >
                    Save Project
                  </button>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}
      </div>
    </div>
  );
}
