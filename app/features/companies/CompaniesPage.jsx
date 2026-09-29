// FILE: app/features/companies/CompaniesPage.jsx
// Replace only the CompaniesPage component file with this content.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";

import StatusBadge from "../../components/feedback/StatusBadge";
import ModalPortal from "../../components/ui/ModalPortal";
import Th from "../../components/ui/Th";
import Td from "../../components/ui/Td";
import Card from "../../components/ui/Card";

import {
  normalizeScopeValue,
  normalizeText,
  isSameText,
  formatNumber,
} from "../../lib/helpers";

import {
  COUNTRY_SETTINGS_OPTIONS,
  getCompanyCountrySettings,
  getCurrencyByCountry,
  getTimezoneByCountry,
  getCurrencyOptionsForCountry,
  normalizeCurrencyForCountry,
  normalizeCountryName,
  normalizeCompanyForState,
  isPlatformCompany,
  isPlatformContextValue,
  getPlatformCompanyId,
  companyMatches,
  isPlatformAdminUser,
  mergePlatformConsoleWithCompanies,
} from "../../lib/companyHelpers";

import {
  fetchCompanies,
  createCompanyRecord,
  updateCompanyRecord,
  updateCompanyStatus,
  updateCompanyDataImportAccess,
  updateCompanyMultiProjectAccess,
} from "../../services/companiesService";

import {
  buildCompanyIntegrationSettingsPayload,
  fetchCompanyIntegrationSettings,
  updateCompanyIntegrationSettings,
} from "../../services/integrationsService";

const COMPANY_CONTEXT_STORAGE_KEY = "fleetfuelpro_company_context";

const DEFAULT_INTEGRATION_FEATURES = {
  operationsSummary: true,
  operationsDetails: false,
  costData: false,
  stockData: false,
  stockMovements: false,
  webhooks: false,
};

const INTEGRATION_FEATURE_OPTIONS = [
  { key: "operationsSummary", label: "Operations Summary", description: "Aggregated fuel quantity and operation count by asset and period." },
  { key: "operationsDetails", label: "Operations Details", description: "Read-only detailed transaction data for completed operations." },
  { key: "costData", label: "Cost Data", description: "Allow external systems to receive fuel cost values." },
  { key: "stockData", label: "Stock Data", description: "Current station, project, and company fuel stock balances." },
  { key: "stockMovements", label: "Stock Movements", description: "Detailed inventory movement history and balance changes." },
  { key: "webhooks", label: "Webhooks", description: "Push approved integration events to external systems." },
];

const DEFAULT_WEBHOOK_EVENTS = {
  operationCompleted: true,
  operationCorrected: true,
  inventoryAdjusted: false,
};

const DEFAULT_EXTERNAL_MAPPING_SETTINGS = {
  enabled: false,
  manualEnabled: true,
  importEnabled: false,
};

const WEBHOOK_EVENT_OPTIONS = [
  {
    group: "Operations",
    key: "operationCompleted",
    event: "operation.completed",
    label: "Operation Completed",
    description: "Notify the external system when an operation is completed and approved.",
  },
  {
    group: "Operations",
    key: "operationCorrected",
    event: "operation.corrected",
    label: "Operation Corrected",
    description: "Notify the external system when an approved correction changes a completed operation.",
  },
  {
    group: "Inventory",
    key: "inventoryAdjusted",
    event: "inventory.adjusted",
    label: "Inventory Adjusted",
    description: "Notify the external system when an approved manual station inventory adjustment is applied.",
  },
];

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

const NETWORK_OFFLINE_MESSAGE = "No internet connection. Please check your connection and try again.";
const BACKEND_UNAVAILABLE_MESSAGE = "Connection to server is unavailable. Please try again.";

function isBrowserOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function isNetworkConnectionError(error) {
  if (isBrowserOffline()) return true;

  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toUpperCase();

  return (
    code === "ERR_NETWORK" ||
    code === "ECONNABORTED" ||
    message.includes("network error") ||
    message.includes("failed to fetch") ||
    (!error?.response && Boolean(error?.request))
  );
}

function getFriendlyApiErrorMessage(error, fallbackMessage = BACKEND_UNAVAILABLE_MESSAGE) {
  if (isNetworkConnectionError(error)) return NETWORK_OFFLINE_MESSAGE;

  const backendMessage = error?.response?.data?.message || error?.response?.data?.error;

  if (Array.isArray(backendMessage)) return backendMessage.join(" / ");
  if (backendMessage) return String(backendMessage);

  return fallbackMessage;
}

function canUseNetwork(showToastFn) {
  if (!isBrowserOffline()) return true;

  notifyUser(showToastFn, "warning", NETWORK_OFFLINE_MESSAGE);
  return false;
}

function logHandledApiIssue(label, error) {
  const safeLabel = String(label || "API request failed");
  const safeMessage = getFriendlyApiErrorMessage(error, BACKEND_UNAVAILABLE_MESSAGE);

  // Use warn instead of error for expected connection/backend failures so Next.js dev overlay does not block the UI.
  console.warn(`${safeLabel}: ${safeMessage}`);
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

export default function CompaniesPage({ companies = [], setCompanies, currentUser, contextCompanyId = "", showToast }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [updatingDataImportCompanyId, setUpdatingDataImportCompanyId] = useState("");
  const [updatingMultiProjectCompanyId, setUpdatingMultiProjectCompanyId] = useState("");
  const [integrationFeatureConfigs, setIntegrationFeatureConfigs] = useState({});
  const [integrationFeatureLoadingCompanyId, setIntegrationFeatureLoadingCompanyId] = useState("");
  const [integrationFeatureSaving, setIntegrationFeatureSaving] = useState(false);
  const [integrationFeatureModalTab, setIntegrationFeatureModalTab] = useState("api");
  const [integrationFeatureModal, setIntegrationFeatureModal] = useState({
    open: false,
    company: null,
    enabled: false,
    features: {
      operationsSummary: true,
      operationsDetails: false,
      costData: false,
      stockData: false,
      stockMovements: false,
      webhooks: false,
    },
    webhookEvents: { ...DEFAULT_WEBHOOK_EVENTS },
    externalMapping: { ...DEFAULT_EXTERNAL_MAPPING_SETTINGS },
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(COMPANY_CONTEXT_STORAGE_KEY) || "";
  });
  const [companyModalMode, setCompanyModalMode] = useState(null);
  const [savingCompany, setSavingCompany] = useState(false);
  const [companyConfirmModal, setCompanyConfirmModal] = useState({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    confirmTone: "amber",
    onConfirm: null,
  });
  const settingsRef = useRef(null);

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId) || null;
  const selectedCompanyIsEditable = Boolean(selectedCompany);
  const canManageCompanies = currentUser?.role === "PlatformAdmin";

  const emptyCompanyForm = {
    name: "",
    code: "",
    country: "Saudi Arabia",
    currency: "SAR",
    timezone: "Asia/Riyadh",
    language: "EN-AR",
  };

  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);

  useOutsideClick(settingsRef, () => setSettingsOpen(false));

  useEffect(() => {
    if (!canManageCompanies) {
      setIntegrationFeatureConfigs({});
      return;
    }

    const customerCompanies = companies.filter(
      (company) => company?.id && !company.isPlatformContext && !isPlatformCompany(company),
    );

    if (!customerCompanies.length) {
      setIntegrationFeatureConfigs({});
      return;
    }

    let cancelled = false;

    async function loadIntegrationSettings() {
      const results = await Promise.allSettled(
        customerCompanies.map(async (company) => {
          const config = await fetchCompanyIntegrationSettings(company.id);
          return [company.id, config];
        }),
      );

      if (cancelled) return;

      const nextConfigs = {};
      for (const result of results) {
        if (result.status === "fulfilled") {
          const [companyId, config] = result.value;
          nextConfigs[companyId] = config;
        }
      }

      setIntegrationFeatureConfigs(nextConfigs);
    }

    loadIntegrationSettings().catch((error) => {
      console.warn("Failed to load company Integration settings.", error);
    });

    return () => {
      cancelled = true;
    };
  }, [canManageCompanies, companies]);

  const companyScopeList = (() => {
    if (isPlatformAdminUser(currentUser)) {
      if (!contextCompanyId || isPlatformContextValue(contextCompanyId)) {
        return companies;
      }

      return companies.filter((company) => companyMatches(company.id, contextCompanyId));
    }

    if (currentUser?.companyId) {
      return companies.filter((company) => companyMatches(company.id, currentUser.companyId));
    }

    return [];
  })();

  const visibleCompanies = companyScopeList.filter((company) => {
    const q = normalizeScopeValue(search);
    if (!q) return true;

    return [
      company.id,
      company.name,
      company.code,
      company.country,
      company.city,
      company.currency,
      company.timezone,
      company.language,
      company.status,
    ]
      .filter(Boolean)
      .some((value) => normalizeScopeValue(value).includes(q));
  });

  const activeCompaniesCount = companyScopeList.filter((company) => company.isActive !== false).length;

  const refreshCompaniesFromBackend = async () => {
    try {
      const backendCompanies = await fetchCompanies();

      setCompanies(
        mergePlatformConsoleWithCompanies(backendCompanies)
          .map(normalizeCompanyForState)
          .filter((company) => company.id)
      );
    } catch (error) {
      logHandledApiIssue("Failed to refresh companies from backend", error);
      notifyUser(showToast, "warning", "Failed to refresh companies from backend.");
    }
  };

  const openAddCompanyModal = () => {
    if (!canManageCompanies) {
      notifyUser(showToast, "warning", "Only Platform Admin can add companies.");
      return;
    }

    setCompanyForm(emptyCompanyForm);
    setCompanyModalMode("add");
    setSettingsOpen(false);
  };

  const openEditCompanyModal = (companyToEdit = selectedCompany) => {
    if (!canManageCompanies) {
      notifyUser(showToast, "warning", "Only Platform Admin can edit companies.");
      return;
    }

    if (!companyToEdit) {
      notifyUser(showToast, "warning", "Please select a company to edit.");
      return;
    }

    setSelectedCompanyId(companyToEdit.id);
    setCompanyForm({
      name: companyToEdit.name || "",
      code: companyToEdit.code || "",
      country: companyToEdit.country || "Saudi Arabia",
      currency: normalizeCurrencyForCountry(
        companyToEdit.country || "Saudi Arabia",
        companyToEdit.currency || getCurrencyByCountry(companyToEdit.country || "Saudi Arabia")
      ),
      timezone: companyToEdit.timezone || getTimezoneByCountry(companyToEdit.country || "Saudi Arabia"),
      language: companyToEdit.language || "EN-AR",
    });

    setCompanyModalMode("edit");
    setSettingsOpen(false);
  };

  const closeCompanyModal = () => {
    if (savingCompany) return;
    setCompanyModalMode(null);
  };

  const handleCompanyFormChange = (field, value) => {
    if (field === "country") {
      const defaultCurrency = getCurrencyByCountry(value);
      const defaultTimezone = getTimezoneByCountry(value);

      setCompanyForm((prev) => ({
        ...prev,
        country: value,
        currency: defaultCurrency,
        timezone: defaultTimezone,
      }));

      return;
    }

    setCompanyForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveCompany = async (event) => {
    event?.preventDefault?.();

    const editingPlatformCompany =
      companyModalMode === "edit" && Boolean(selectedCompany?.isPlatformContext);

    const payload = {
      name: companyForm.name.trim(),
      code: editingPlatformCompany
        ? String(selectedCompany?.code || "PLATFORM").trim() || "PLATFORM"
        : companyForm.code.trim(),
      country: companyForm.country.trim(),
      currency: normalizeCurrencyForCountry(companyForm.country, companyForm.currency.trim()),
      timezone: companyForm.timezone.trim() || getTimezoneByCountry(companyForm.country),
      language: companyForm.language.trim() || "EN-AR",
    };

    if (!payload.name || !payload.code) {
      notifyUser(showToast, "warning", "Company name and code are required.");
      return;
    }

    setSavingCompany(true);

    try {
      if (companyModalMode === "add") {
        const savedCompanyData = await createCompanyRecord(payload);
        const savedCompany = normalizeCompanyForState(savedCompanyData);

        setCompanies((prev) =>
          mergePlatformConsoleWithCompanies([
            ...prev.filter((company) => !company.isPlatformContext),
            savedCompany,
          ])
            .map(normalizeCompanyForState)
            .filter((company) => company.id)
        );

        setSelectedCompanyId(savedCompany.id);
        notifyUser(showToast, "success", "Company added successfully.");
      }

      if (companyModalMode === "edit" && selectedCompanyIsEditable) {
        const savedCompanyData = await updateCompanyRecord(
          selectedCompany.id,
          payload
        );
        const savedCompany = normalizeCompanyForState(savedCompanyData);

        setCompanies((prev) =>
          mergePlatformConsoleWithCompanies(
            prev.map((company) =>
              company.id === savedCompany.id ? savedCompany : company
            )
          )
            .map(normalizeCompanyForState)
            .filter((company) => company.id)
        );

        notifyUser(showToast, "success", "Company updated successfully.");
      }

      setCompanyModalMode(null);
      await refreshCompaniesFromBackend();
    } catch (error) {
      logHandledApiIssue("Failed to save company", error);
      notifyUser(
        showToast,
        "warning",
        error?.response?.data?.message || "Failed to save company."
      );
    } finally {
      setSavingCompany(false);
    }
  };

  const executeCompanyStatusChange = async (company, nextIsActive) => {
    try {
      const updatedCompanyData = await updateCompanyStatus(
        company.id,
        nextIsActive
      );

      const updatedCompany = normalizeCompanyForState(updatedCompanyData);

      setCompanies((prev) =>
        mergePlatformConsoleWithCompanies(
          prev
            .filter((item) => !item.isPlatformContext)
            .map((item) => (item.id === updatedCompany.id ? updatedCompany : item))
        )
          .map(normalizeCompanyForState)
          .filter((item) => item.id)
      );

      notifyUser(
        showToast,
        "success",
        `Company ${nextIsActive ? "activated" : "deactivated"} successfully.`
      );
    } catch (error) {
      logHandledApiIssue("Failed to update company status", error);
      notifyUser(
        showToast,
        "warning",
        error?.response?.data?.message || "Failed to update company status."
      );
    }
  };

  const executeDataImportAccessChange = async (company, enabled) => {
    if (!company?.id || company.isPlatformContext) return;

    setUpdatingDataImportCompanyId(company.id);

    try {
      const updatedCompanyData = await updateCompanyDataImportAccess(
        company.id,
        enabled,
      );
      const updatedCompany = normalizeCompanyForState(updatedCompanyData);

      setCompanies((prev) =>
        mergePlatformConsoleWithCompanies(
          prev
            .filter((item) => !item.isPlatformContext)
            .map((item) =>
              item.id === updatedCompany.id ? updatedCompany : item,
            ),
        )
          .map(normalizeCompanyForState)
          .filter((item) => item.id),
      );

      notifyUser(
        showToast,
        "success",
        enabled
          ? t("dataImport.messages.accessEnabled")
          : t("dataImport.messages.accessDisabled"),
      );
    } catch (error) {
      logHandledApiIssue("Failed to update Data Import access", error);
      notifyUser(
        showToast,
        "warning",
        error?.response?.data?.message ||
          t("dataImport.messages.accessUpdateFailed"),
      );
    } finally {
      setUpdatingDataImportCompanyId("");
    }
  };

  const handleToggleDataImportAccess = (company) => {
    if (!canManageCompanies) {
      notifyUser(
        showToast,
        "warning",
        t("dataImport.messages.platformOnlyAccessControl"),
      );
      return;
    }

    if (!company || company.isPlatformContext) return;

    const nextEnabled = !Boolean(company.dataImportEnabled);
    const companyName = company.name || company.id;

    setCompanyConfirmModal({
      open: true,
      title: nextEnabled
        ? t("dataImport.confirm.enableTitle")
        : t("dataImport.confirm.disableTitle"),
      message: nextEnabled
        ? t("dataImport.confirm.enableMessage", { company: companyName })
        : t("dataImport.confirm.disableMessage", { company: companyName }),
      confirmLabel: nextEnabled
        ? t("dataImport.actions.enable")
        : t("dataImport.actions.disable"),
      confirmTone: nextEnabled ? "emerald" : "red",
      onConfirm: async () => {
        await executeDataImportAccessChange(company, nextEnabled);
      },
    });
  };

  const executeMultiProjectAccessChange = async (company, enabled) => {
    if (!company?.id || company.isPlatformContext) return;

    setUpdatingMultiProjectCompanyId(company.id);

    try {
      const updatedCompanyData = await updateCompanyMultiProjectAccess(
        company.id,
        enabled,
      );
      const updatedCompany = normalizeCompanyForState(updatedCompanyData);

      setCompanies((prev) =>
        mergePlatformConsoleWithCompanies(
          prev
            .filter((item) => !item.isPlatformContext)
            .map((item) =>
              item.id === updatedCompany.id ? updatedCompany : item,
            ),
        )
          .map(normalizeCompanyForState)
          .filter((item) => item.id),
      );

      notifyUser(
        showToast,
        "success",
        enabled
          ? t("multiProject.messages.accessEnabled")
          : t("multiProject.messages.accessDisabled"),
      );
    } catch (error) {
      logHandledApiIssue("Failed to update Multi-Project access", error);
      notifyUser(
        showToast,
        "warning",
        error?.response?.data?.message ||
          t("multiProject.messages.accessUpdateFailed"),
      );
    } finally {
      setUpdatingMultiProjectCompanyId("");
    }
  };

  const handleToggleMultiProjectAccess = (company) => {
    if (!canManageCompanies) {
      notifyUser(
        showToast,
        "warning",
        t("multiProject.messages.platformOnlyAccessControl"),
      );
      return;
    }

    if (!company || company.isPlatformContext) return;

    const nextEnabled = !Boolean(company.multiProjectEnabled);
    const companyName = company.name || company.id;

    setCompanyConfirmModal({
      open: true,
      title: nextEnabled
        ? t("multiProject.confirm.enableTitle")
        : t("multiProject.confirm.disableTitle"),
      message: nextEnabled
        ? t("multiProject.confirm.enableMessage", { company: companyName })
        : t("multiProject.confirm.disableMessage", { company: companyName }),
      confirmLabel: nextEnabled
        ? t("multiProject.actions.enable")
        : t("multiProject.actions.disable"),
      confirmTone: nextEnabled ? "emerald" : "red",
      onConfirm: async () => {
        await executeMultiProjectAccessChange(company, nextEnabled);
      },
    });
  };

  const openIntegrationFeatureModal = async (company) => {
    if (!canManageCompanies) {
      notifyUser(showToast, "warning", "Only Platform Admin can manage Integration access.");
      return;
    }

    if (!company?.id || company.isPlatformContext) return;

    const cachedConfig = integrationFeatureConfigs[company.id] || {};

    setIntegrationFeatureModalTab("api");
    setIntegrationFeatureModal({
      open: true,
      company,
      enabled: Boolean(cachedConfig.enabled),
      features: {
        ...DEFAULT_INTEGRATION_FEATURES,
        ...(cachedConfig.features || {}),
      },
      webhookEvents: {
        ...DEFAULT_WEBHOOK_EVENTS,
        ...(cachedConfig.webhookEvents || {}),
      },
      externalMapping: {
        ...DEFAULT_EXTERNAL_MAPPING_SETTINGS,
        ...(cachedConfig.externalMapping || {}),
      },
      clientLimit: cachedConfig.clientLimit || 5,
    });

    setIntegrationFeatureLoadingCompanyId(company.id);

    try {
      const backendConfig = await fetchCompanyIntegrationSettings(company.id);

      setIntegrationFeatureConfigs((current) => ({
        ...current,
        [company.id]: backendConfig,
      }));

      setIntegrationFeatureModal((current) => {
        if (current.company?.id !== company.id) return current;

        return {
          ...current,
          enabled: Boolean(backendConfig.enabled),
          features: {
            ...DEFAULT_INTEGRATION_FEATURES,
            ...(backendConfig.features || {}),
          },
          webhookEvents: {
            ...DEFAULT_WEBHOOK_EVENTS,
            ...(backendConfig.webhookEvents || {}),
          },
          externalMapping: {
            ...DEFAULT_EXTERNAL_MAPPING_SETTINGS,
            ...(backendConfig.externalMapping || {}),
          },
          clientLimit: backendConfig.clientLimit || 5,
        };
      });
    } catch (error) {
      logHandledApiIssue("Failed to load Integration settings", error);
      notifyUser(
        showToast,
        "warning",
        error?.response?.data?.message || "Failed to load Integration settings.",
      );
    } finally {
      setIntegrationFeatureLoadingCompanyId("");
    }
  };

  const closeIntegrationFeatureModal = (force = false) => {
    if (integrationFeatureSaving && !force) return;

    setIntegrationFeatureModalTab("api");
    setIntegrationFeatureModal({
      open: false,
      company: null,
      enabled: false,
      features: { ...DEFAULT_INTEGRATION_FEATURES },
      webhookEvents: { ...DEFAULT_WEBHOOK_EVENTS },
      externalMapping: { ...DEFAULT_EXTERNAL_MAPPING_SETTINGS },
      clientLimit: 5,
    });
  };

  const toggleIntegrationFeatureDraft = (featureKey) => {
    setIntegrationFeatureModal((current) => ({
      ...current,
      features: {
        ...current.features,
        [featureKey]: !Boolean(current.features?.[featureKey]),
      },
    }));
  };

  const toggleWebhookEventDraft = (eventKey) => {
    setIntegrationFeatureModal((current) => ({
      ...current,
      webhookEvents: {
        ...DEFAULT_WEBHOOK_EVENTS,
        ...(current.webhookEvents || {}),
        [eventKey]: !Boolean(current.webhookEvents?.[eventKey]),
      },
    }));
  };

  const toggleExternalMappingDraft = (field) => {
    setIntegrationFeatureModal((current) => {
      const currentMapping = {
        ...DEFAULT_EXTERNAL_MAPPING_SETTINGS,
        ...(current.externalMapping || {}),
      };

      if (field === "enabled") {
        const nextEnabled = !Boolean(currentMapping.enabled);
        return {
          ...current,
          externalMapping: {
            ...currentMapping,
            enabled: nextEnabled,
          },
        };
      }

      return {
        ...current,
        externalMapping: {
          ...currentMapping,
          [field]: !Boolean(currentMapping[field]),
        },
      };
    });
  };

  const saveIntegrationFeatures = async () => {
    const company = integrationFeatureModal.company;
    if (!company?.id || integrationFeatureSaving) return;

    setIntegrationFeatureSaving(true);

    try {
      const payload = buildCompanyIntegrationSettingsPayload({
        enabled: true,
        features: { ...integrationFeatureModal.features },
        webhookEvents: {
          ...DEFAULT_WEBHOOK_EVENTS,
          ...(integrationFeatureModal.webhookEvents || {}),
        },
        externalMapping: {
          ...DEFAULT_EXTERNAL_MAPPING_SETTINGS,
          ...(integrationFeatureModal.externalMapping || {}),
        },
        clientLimit:
          integrationFeatureModal.clientLimit ||
          integrationFeatureConfigs[company.id]?.clientLimit ||
          5,
      });

      const savedConfig = await updateCompanyIntegrationSettings(
        company.id,
        payload,
      );

      setIntegrationFeatureConfigs((current) => ({
        ...current,
        [company.id]: savedConfig,
      }));

      setIntegrationFeatureModal((current) => ({
        ...current,
        enabled: true,
      }));

      closeIntegrationFeatureModal(true);
      notifyUser(
        showToast,
        "success",
        `API Integration settings saved for ${company.name || company.id}.`,
      );
    } catch (error) {
      logHandledApiIssue("Failed to save Integration settings", error);
      notifyUser(
        showToast,
        "warning",
        error?.response?.data?.message || "Failed to save Integration settings.",
      );
    } finally {
      setIntegrationFeatureSaving(false);
    }
  };

  const disableIntegrationAccess = async () => {
    const company = integrationFeatureModal.company;
    if (!company?.id || integrationFeatureSaving) return;

    setIntegrationFeatureSaving(true);

    try {
      const savedConfig = await updateCompanyIntegrationSettings(company.id, {
        enabled: false,
      });

      setIntegrationFeatureConfigs((current) => ({
        ...current,
        [company.id]: savedConfig,
      }));

      setIntegrationFeatureModal((current) => ({
        ...current,
        enabled: false,
      }));

      closeIntegrationFeatureModal(true);
      notifyUser(
        showToast,
        "success",
        `API Integration disabled for ${company.name || company.id}.`,
      );
    } catch (error) {
      logHandledApiIssue("Failed to disable Integration", error);
      notifyUser(
        showToast,
        "warning",
        error?.response?.data?.message || "Failed to disable Integration.",
      );
    } finally {
      setIntegrationFeatureSaving(false);
    }
  };

  const closeCompanyConfirmModal = () => {
    setCompanyConfirmModal({
      open: false,
      title: "",
      message: "",
      confirmLabel: "Confirm",
      confirmTone: "amber",
      onConfirm: null,
    });
  };

  const handleToggleCompanyStatus = (company) => {
    if (!canManageCompanies) {
      notifyUser(showToast, "warning", "Only Platform Admin can change company status.");
      return;
    }

    if (company?.isPlatformContext) {
      notifyUser(showToast, "warning", "Platform Console is a virtual context and cannot be activated or deactivated.");
      return;
    }

    const nextIsActive = company.isActive === false;
    const actionLabel = nextIsActive ? "activate" : "deactivate";
    const companyName = company.name || company.id;

    setCompanyConfirmModal({
      open: true,
      title: nextIsActive ? "Activate Company" : "Deactivate Company",
      message: `Are you sure you want to ${actionLabel} ${companyName}?`,
      confirmLabel: nextIsActive ? "Activate" : "Deactivate",
      confirmTone: nextIsActive ? "emerald" : "red",
      onConfirm: async () => {
        await executeCompanyStatusChange(company, nextIsActive);
      },
    });
  };

  const exportCompaniesCSV = () => {
    const headers = [
      "Company Name",
      "Code",
      "Country",
      "Currency",
      "Timezone",
      "Language",
      "Status",
    ];

    const rows = visibleCompanies.map((company) => [
      company.name || "",
      company.code || "",
      company.country || "",
      company.currency || "",
      company.timezone || "",
      company.language || "",
      company.isActive === false ? "Inactive" : "Active",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];

    link.href = url;
    link.download = `fleet_fuel_pro_companies_${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setSettingsOpen(false);
    notifyUser(showToast, "success", "Companies CSV exported successfully.");
  };

  const printCompanies = () => {
    setSettingsOpen(false);

    const headers = [
      "Company Name",
      "Code",
      "Country",
      "Currency",
      "Timezone",
      "Language",
      "Status",
    ];

    const rowsHtml = visibleCompanies
      .map((company) => {
        const status = company.isActive === false ? "Inactive" : "Active";

        return `
          <tr>
            <td>${company.name || "-"}</td>
            <td>${company.code || "-"}</td>
            <td>${company.country || "-"}</td>
            <td>${company.currency || "-"}</td>
            <td>${company.timezone || "-"}</td>
            <td>${company.language || "-"}</td>
            <td>${status}</td>
          </tr>
        `;
      })
      .join("");

    const printWindow = window.open("", "_blank", "width=1100,height=750");

    if (!printWindow) {
      notifyUser(showToast, "warning", "Popup blocked. Please allow popups to print the companies table.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Fleet Fuel PRO - Companies</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #0f172a;
              padding: 24px;
            }
            h1 {
              margin: 0 0 6px;
              font-size: 22px;
            }
            p {
              margin: 0 0 18px;
              color: #475569;
              font-size: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 8px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background: #f1f5f9;
              font-weight: 700;
            }
          </style>
        </head>
        <body>
          <h1>Fleet Fuel PRO - Companies</h1>
          <p>Printed on ${new Date().toLocaleString("en-GB")}</p>
          <table>
            <thead>
              <tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="7">No companies found.</td></tr>`}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  if (currentUser?.role !== "PlatformAdmin") {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 p-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-300 font-bold">
          Companies console is available for Platform Admin only.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-4 sm:p-6 space-y-5">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-amber-300 font-bold">
              Fleet Fuel PRO Platform
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">Companies</h1>
            <p className="text-sm text-slate-400 mt-2 max-w-3xl">
              Multi-company foundation for Fleet Fuel PRO. Company ID is a hidden system context used for data isolation; users do not enter it in operational screens.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-[260px]">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-xl font-black text-amber-300">{companies.length}</p>
              <p className="text-xs text-slate-500">Companies</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-xl font-black text-emerald-300">
                {activeCompaniesCount}
              </p>
              <p className="text-xs text-slate-500">Active</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-xl font-black text-blue-300">
                {new Set(companies.map((company) => company.country).filter(Boolean)).size}
              </p>
              <p className="text-xs text-slate-500">Countries</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-xl font-black text-cyan-300">
                {new Set(companies.map((company) => company.currency).filter(Boolean)).size}
              </p>
              <p className="text-xs text-slate-500">Currencies</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, country, currency..."
            className="w-full sm:max-w-md rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400"
          />

          <div className="relative" ref={settingsRef}>
            <button
              type="button"
              onClick={() => setSettingsOpen((prev) => !prev)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-slate-200 hover:border-amber-400 hover:text-amber-300 transition"
              title="Companies settings"
              aria-label="Companies settings"
            >
              <span className="flex flex-col gap-1" aria-hidden="true">
                <span className="block h-0.5 w-5 rounded-full bg-current" />
                <span className="block h-0.5 w-5 rounded-full bg-current" />
                <span className="block h-0.5 w-5 rounded-full bg-current" />
              </span>
            </button>

            {settingsOpen && (
              <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
                <button
                  type="button"
                  onClick={openAddCompanyModal}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-200 hover:bg-slate-800"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">＋</span>
                  <span>Add Company</span>
                </button>
                <button
                  type="button"
                  onClick={exportCompaniesCSV}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-200 hover:bg-slate-800"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">⇩</span>
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={printCompanies}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-200 hover:bg-slate-800"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20">⎙</span>
                  <span>Print Table</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mb-3 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-xs text-slate-400">
          Click a real customer company name to open the edit screen. The internal database ID is hidden from the table and remains used only by the system APIs.
        </div>

        <div className="overflow-auto rounded-2xl border border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950 text-slate-300 sticky top-0">
              <tr>
                <th className="text-left p-3">Company Name</th>
                <th className="text-left p-3">Code</th>
                <th className="text-left p-3">Country</th>
                <th className="text-left p-3">Currency</th>
                <th className="text-left p-3">Timezone</th>
                <th className="text-left p-3">Language</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">{t("dataImport.accessLabel")}</th>
                <th className="text-left p-3">{t("multiProject.accessLabel")}</th>
                <th className="text-left p-3">API Integration</th>
              </tr>
            </thead>
            <tbody>
              {visibleCompanies.map((company) => {
                const isSelected = selectedCompanyId === company.id;
                const isActive = company.isActive !== false;

                return (
                  <tr
                    key={company.id}
                    className={`border-t border-slate-800 hover:bg-slate-800/40 ${
                      isSelected ? "bg-amber-400/10" : ""
                    }`}
                  >
                    <td className="p-3 font-bold text-slate-100">
                      <button
                        type="button"
                        onClick={() => openEditCompanyModal(company)}
                        className="font-black text-slate-100 cursor-pointer hover:text-amber-300 transition"
                        title={
                          company.isPlatformContext
                            ? "Edit Fleet Fuel PRO platform company name/settings"
                            : "Click to edit this company"
                        }
                      >
                        {company.name || company.id}
                      </button>
                    </td>
                    <td className="p-3 text-slate-300">{company.code || "-"}</td>
                    <td className="p-3 text-slate-300">{company.country || "-"}</td>
                    <td className="p-3 text-slate-300">{company.currency || "-"}</td>
                    <td className="p-3 text-slate-300">{company.timezone || "-"}</td>
                    <td className="p-3 text-slate-300">{company.language || "-"}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleToggleCompanyStatus(company);
                        }}
                        className={`rounded-full px-3 py-1 text-xs font-black border transition ${
                          isActive
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                            : "bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/20"
                        } ${company.isPlatformContext ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                        title={
                          company.isPlatformContext
                            ? "Platform Console cannot be changed"
                            : "Click to change company status"
                        }
                      >
                        {isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="p-3">
                      {company.isPlatformContext ? (
                        <span className="text-xs font-bold text-slate-500">—</span>
                      ) : (
                        <button
                          type="button"
                          disabled={updatingDataImportCompanyId === company.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleDataImportAccess(company);
                          }}
                          className={`rounded-full px-3 py-1 text-xs font-black border transition disabled:cursor-wait disabled:opacity-60 ${
                            company.dataImportEnabled
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                              : "bg-slate-500/10 text-slate-300 border-slate-500/30 hover:bg-slate-500/20"
                          }`}
                          title={t("dataImport.accessToggleHelp")}
                        >
                          {updatingDataImportCompanyId === company.id
                            ? t("common.saving")
                            : company.dataImportEnabled
                              ? t("dataImport.enabled")
                              : t("dataImport.disabled")}
                        </button>
                      )}
                    </td>
                    <td className="p-3">
                      {company.isPlatformContext ? (
                        <span className="text-xs font-bold text-slate-500">—</span>
                      ) : (
                        <button
                          type="button"
                          disabled={updatingMultiProjectCompanyId === company.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleMultiProjectAccess(company);
                          }}
                          className={`rounded-full px-3 py-1 text-xs font-black border transition disabled:cursor-wait disabled:opacity-60 ${
                            company.multiProjectEnabled
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                              : "bg-slate-500/10 text-slate-300 border-slate-500/30 hover:bg-slate-500/20"
                          }`}
                          title={t("multiProject.accessToggleHelp")}
                        >
                          {updatingMultiProjectCompanyId === company.id
                            ? t("common.saving")
                            : company.multiProjectEnabled
                              ? t("multiProject.enabled")
                              : t("multiProject.disabled")}
                        </button>
                      )}
                    </td>
                    <td className="p-3">
                      {company.isPlatformContext ? (
                        <span className="text-xs font-bold text-slate-500">—</span>
                      ) : (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openIntegrationFeatureModal(company);
                          }}
                          className={`rounded-full px-3 py-1 text-xs font-black border transition ${
                            integrationFeatureConfigs[company.id]?.enabled
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                              : "bg-slate-500/10 text-slate-300 border-slate-500/30 hover:bg-slate-500/20"
                          }`}
                          title="Configure the Integration features available to this company"
                        >
                          {integrationFeatureConfigs[company.id]?.enabled ? "Enabled" : "Disabled"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!visibleCompanies.length && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    No companies found. Add companies from Settings using the backend Companies API.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {integrationFeatureModal.open && (
        <ModalPortal>
          <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/60">
              <div className="shrink-0 border-b border-slate-800 px-5 pt-4 pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-amber-300 font-bold">
                      Integration Access
                    </p>
                    <h3 className="mt-1.5 text-lg font-black text-white">
                      {integrationFeatureModal.company?.name || "Company"}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Select which Integration capabilities this company purchased. Only these capabilities can appear to the customer Admin.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeIntegrationFeatureModal}
                    className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-black text-slate-300 hover:bg-slate-900"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="shrink-0 border-b border-slate-800 px-5">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setIntegrationFeatureModalTab("api")}
                    className={`border-b-2 px-4 py-3 text-sm font-black transition ${
                      integrationFeatureModalTab === "api"
                        ? "border-amber-400 text-amber-300"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    API Access
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntegrationFeatureModalTab("webhooks")}
                    className={`border-b-2 px-4 py-3 text-sm font-black transition ${
                      integrationFeatureModalTab === "webhooks"
                        ? "border-amber-400 text-amber-300"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>Webhooks</span>
                      <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-violet-200">
                        Advanced
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntegrationFeatureModalTab("mapping")}
                    className={`border-b-2 px-4 py-3 text-sm font-black transition ${
                      integrationFeatureModalTab === "mapping"
                        ? "border-amber-400 text-amber-300"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    External Mapping
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {integrationFeatureModalTab === "api" ? (
                  <div>
                    <div className="mb-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-300">
                        API Access
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Select the read-only API capabilities included for this company.
                      </p>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {INTEGRATION_FEATURE_OPTIONS
                        .filter((feature) => feature.key !== "webhooks")
                        .map((feature) => {
                          const selected = Boolean(
                            integrationFeatureModal.features?.[feature.key],
                          );

                          return (
                            <button
                              key={feature.key}
                              type="button"
                              onClick={() => toggleIntegrationFeatureDraft(feature.key)}
                              className={`text-left rounded-2xl border p-3.5 transition ${
                                selected
                                  ? "border-emerald-500/40 bg-emerald-500/10"
                                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-black ${
                                    selected
                                      ? "border-emerald-400 bg-emerald-400 text-slate-950"
                                      : "border-slate-600 bg-slate-950 text-transparent"
                                  }`}
                                >
                                  ✓
                                </span>
                                <span>
                                  <span className="block text-sm font-black text-white">
                                    {feature.label}
                                  </span>
                                  <span className="mt-1 block text-xs leading-5 text-slate-400">
                                    {feature.description}
                                  </span>
                                </span>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ) : integrationFeatureModalTab === "webhooks" ? (
                  <div>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">
                          Webhooks
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Enable event-driven delivery to external systems as an advanced add-on.
                        </p>
                      </div>
                      <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-violet-200">
                        Advanced Add-on
                      </span>
                    </div>

                    {INTEGRATION_FEATURE_OPTIONS
                      .filter((feature) => feature.key === "webhooks")
                      .map((feature) => {
                        const selected = Boolean(
                          integrationFeatureModal.features?.[feature.key],
                        );

                        return (
                          <button
                            key={feature.key}
                            type="button"
                            onClick={() => toggleIntegrationFeatureDraft(feature.key)}
                            className={`w-full text-left rounded-2xl border p-4 transition ${
                              selected
                                ? "border-violet-500/40 bg-violet-500/10"
                                : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-black ${
                                  selected
                                    ? "border-violet-400 bg-violet-400 text-slate-950"
                                    : "border-slate-600 bg-slate-950 text-transparent"
                                }`}
                              >
                                ✓
                              </span>
                              <span>
                                <span className="block text-sm font-black text-white">
                                  {feature.label}
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-slate-400">
                                  {feature.description}
                                </span>
                              </span>
                            </div>
                          </button>
                        );
                      })}

                    <div className={`mt-4 space-y-4 ${
                      integrationFeatureModal.features?.webhooks
                        ? ""
                        : "pointer-events-none opacity-45"
                    }`}>
                      {["Operations", "Inventory"].map((groupName) => {
                        const groupEvents = WEBHOOK_EVENT_OPTIONS.filter(
                          (eventOption) => eventOption.group === groupName,
                        );

                        return (
                          <div key={groupName}>
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                                {groupName}
                              </p>
                              {!integrationFeatureModal.features?.webhooks && (
                                <span className="text-[10px] font-bold text-slate-600">
                                  Enable Webhooks first
                                </span>
                              )}
                            </div>

                            <div className="space-y-2.5">
                              {groupEvents.map((eventOption) => {
                                const selected = Boolean(
                                  integrationFeatureModal.webhookEvents?.[eventOption.key],
                                );

                                return (
                                  <button
                                    key={eventOption.key}
                                    type="button"
                                    onClick={() => toggleWebhookEventDraft(eventOption.key)}
                                    className={`w-full rounded-2xl border p-3.5 text-left transition ${
                                      selected
                                        ? "border-violet-500/40 bg-violet-500/10"
                                        : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <span
                                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-black ${
                                          selected
                                            ? "border-violet-400 bg-violet-400 text-slate-950"
                                            : "border-slate-600 bg-slate-950 text-transparent"
                                        }`}
                                      >
                                        ✓
                                      </span>

                                      <span className="min-w-0">
                                        <span className="flex flex-wrap items-center gap-2">
                                          <span className="text-sm font-black text-white">
                                            {eventOption.label}
                                          </span>
                                          <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-0.5 font-mono text-[10px] text-sky-300">
                                            {eventOption.event}
                                          </span>
                                        </span>
                                        <span className="mt-1 block text-xs leading-5 text-slate-400">
                                          {eventOption.description}
                                        </span>
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300">
                        External Mapping
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Enable code mapping when Fleet Fuel PRO codes differ from codes used by an external ERP.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExternalMappingDraft("enabled")}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        integrationFeatureModal.externalMapping?.enabled
                          ? "border-cyan-500/40 bg-cyan-500/10"
                          : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-black ${
                            integrationFeatureModal.externalMapping?.enabled
                              ? "border-cyan-400 bg-cyan-400 text-slate-950"
                              : "border-slate-600 bg-slate-950 text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                        <span>
                          <span className="block text-sm font-black text-white">
                            Enable External Mapping
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-slate-400">
                            Allow this company to map Asset, Project, and Station codes to external system codes.
                          </span>
                        </span>
                      </div>
                    </button>

                    <div
                      className={`mt-4 grid gap-3 sm:grid-cols-2 ${
                        integrationFeatureModal.externalMapping?.enabled
                          ? ""
                          : "pointer-events-none opacity-45"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleExternalMappingDraft("manualEnabled")}
                        className={`rounded-2xl border p-4 text-left transition ${
                          integrationFeatureModal.externalMapping?.manualEnabled
                            ? "border-emerald-500/40 bg-emerald-500/10"
                            : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-black ${
                              integrationFeatureModal.externalMapping?.manualEnabled
                                ? "border-emerald-400 bg-emerald-400 text-slate-950"
                                : "border-slate-600 bg-slate-950 text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                          <span>
                            <span className="block text-sm font-black text-white">
                              Manual Mapping
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-slate-400">
                              Show the External Mapping page so the company Admin can add, edit, archive, and remove mappings manually.
                            </span>
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleExternalMappingDraft("importEnabled")}
                        className={`rounded-2xl border p-4 text-left transition ${
                          integrationFeatureModal.externalMapping?.importEnabled
                            ? "border-emerald-500/40 bg-emerald-500/10"
                            : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-black ${
                              integrationFeatureModal.externalMapping?.importEnabled
                                ? "border-emerald-400 bg-emerald-400 text-slate-950"
                                : "border-slate-600 bg-slate-950 text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                          <span>
                            <span className="block text-sm font-black text-white">
                              Bulk Import
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-slate-400">
                              Show External Mapping in Data Import Center for bulk onboarding from Excel.
                            </span>
                          </span>
                        </div>
                      </button>
                    </div>

                    {!integrationFeatureModal.externalMapping?.enabled && (
                      <p className="mt-3 text-xs font-bold text-slate-600">
                        Enable External Mapping first to configure Manual Mapping or Bulk Import.
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-[11px] leading-5 text-amber-100">
                  Company Integration entitlements are now saved to the Fleet Fuel PRO backend and database.
                </div>
              </div>

              <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-5 py-3.5">
                <div>
                  {integrationFeatureConfigs[integrationFeatureModal.company?.id]?.enabled && (
                    <button
                      type="button"
                      onClick={disableIntegrationAccess}
                      disabled={integrationFeatureSaving}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-black text-red-300 hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-60"
                    >
                      {integrationFeatureSaving ? "Saving..." : "Disable Integration"}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeIntegrationFeatureModal}
                    disabled={integrationFeatureSaving}
                    className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-black text-slate-300 hover:bg-slate-900 disabled:cursor-wait disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveIntegrationFeatures}
                    disabled={
                      integrationFeatureSaving ||
                      integrationFeatureLoadingCompanyId === integrationFeatureModal.company?.id
                    }
                    className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60"
                  >
                    {integrationFeatureSaving
                      ? "Saving..."
                      : integrationFeatureLoadingCompanyId === integrationFeatureModal.company?.id
                        ? "Loading..."
                        : integrationFeatureConfigs[integrationFeatureModal.company?.id]?.enabled
                          ? "Save Features"
                          : "Enable Integration"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {companyConfirmModal.open && (
        <ModalPortal>
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/60">
              <div className="border-b border-slate-800 px-6 pt-6 pb-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-amber-300 font-bold">
                  Fleet Fuel PRO Confirmation
                </p>
                <h3 className="mt-2 text-xl font-black text-white">
                  {companyConfirmModal.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  {companyConfirmModal.message}
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 bg-slate-900/50 px-6 py-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCompanyConfirmModal}
                  className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const action = companyConfirmModal.onConfirm;
                    closeCompanyConfirmModal();

                    if (typeof action === "function") {
                      await action();
                    }
                  }}
                  className={`rounded-2xl border px-5 py-3 text-sm font-black transition cursor-pointer ${
                    companyConfirmModal.confirmTone === "red"
                      ? "border-red-400/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                      : companyConfirmModal.confirmTone === "emerald"
                      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                      : "border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20"
                  }`}
                >
                  {companyConfirmModal.confirmLabel || "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {companyModalMode && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
            <form
              onSubmit={handleSaveCompany}
              className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-950 p-5 shadow-2xl"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-amber-300 font-bold">
                    Companies Management
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-white">
                    {companyModalMode === "add" ? "Add Company" : "Edit Company"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeCompanyModal}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold text-slate-300 hover:border-red-400 hover:text-red-300"
                >
                  Close
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold text-slate-400">Company Name *</span>
                  <input
                    value={companyForm.name}
                    onChange={(e) => handleCompanyFormChange("name", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-amber-400"
                    placeholder="ABC Contracting"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-400">Company Code *</span>
                  <input
                    value={companyForm.code}
                    onChange={(e) => handleCompanyFormChange("code", e.target.value)}
                    disabled={
                      companyModalMode === "edit" &&
                      Boolean(selectedCompany?.isPlatformContext)
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder="ABC"
                  />
                  {companyModalMode === "edit" &&
                    selectedCompany?.isPlatformContext && (
                      <p className="mt-2 text-[11px] text-amber-300">
                        PLATFORM is the fixed internal code for the Fleet Fuel PRO platform company.
                      </p>
                    )}
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-400">Country</span>
                  <select
                    value={companyForm.country}
                    onChange={(e) => handleCompanyFormChange("country", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-amber-400"
                  >
                    {COUNTRY_SETTINGS_OPTIONS.map((item) => (
                      <option key={item.country} value={item.country}>
                        {item.country}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-400">Currency</span>
                  <select
                    value={companyForm.currency}
                    onChange={(e) => handleCompanyFormChange("currency", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-amber-400"
                  >
                    {getCurrencyOptionsForCountry(companyForm.country).map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Currency is limited to the selected country currency or USD only.
                  </p>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-400">Timezone</span>
                  <select
                    value={companyForm.timezone}
                    onChange={(e) => handleCompanyFormChange("timezone", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-amber-400"
                  >
                    <option value={getTimezoneByCountry(companyForm.country)}>
                      {getTimezoneByCountry(companyForm.country)}
                    </option>
                  </select>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Timezone is automatically selected based on the company country.
                  </p>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-400">Language</span>
                  <input
                    value={companyForm.language}
                    onChange={(e) => handleCompanyFormChange("language", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-amber-400"
                    placeholder="EN-AR"
                  />
                </label>

              </div>

              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCompanyModal}
                  className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-300 hover:border-red-400 hover:text-red-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCompany}
                  className="rounded-2xl border border-amber-400/40 bg-amber-400/10 px-5 py-3 text-sm font-black text-amber-300 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingCompany ? "Saving..." : "Save Company"}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}


export function ForcePasswordChangePage({
  theme = "dark",
  currentUser,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  error,
  loading,
  onSubmit,
  onLogout,
}) {
  const { t } = useLanguage();

  return (
    <div
      data-theme={theme}
      className="theme-main-bg min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-6"
    >
      <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/95 shadow-2xl p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-6">
          <img
            src={theme === "dark" ? "/icons/fleet-fuel-pro-dark.png" : "/icons/fleet-fuel-pro-light.png"}
            alt="Fleet Fuel PRO"
            className="w-16 h-auto object-contain"
            draggable={false}
          />
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-amber-300 font-bold">
              {t("passwordChange.security")}
            </p>
            <h1 className="text-2xl font-black text-white mt-1">{t("passwordChange.title")}</h1>
          </div>
        </div>

        <p className="text-sm text-slate-400 leading-6 mb-6">
          {t("passwordChange.description")}
        </p>

        <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
          <p className="text-xs text-slate-400">{t("sidebar.signedInAs")}</p>
          <p className="mt-1 text-sm font-bold text-slate-100">{currentUser?.fullName || currentUser?.email || "User"}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <label className="block">
            <span className="text-xs font-bold text-slate-400">{t("passwordChange.currentPassword")}</span>
            <input
              value={currentPassword}
              onChange={(e) => setCurrentPassword?.(e.target.value)}
              type="password"
              placeholder={t("passwordChange.currentPlaceholder")}
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-400">{t("passwordChange.newPassword")}</span>
            <input
              value={newPassword}
              onChange={(e) => setNewPassword?.(e.target.value)}
              type="password"
              placeholder={t("passwordChange.newPlaceholder")}
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-400">{t("passwordChange.confirmPassword")}</span>
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword?.(e.target.value)}
              type="password"
              placeholder={t("passwordChange.confirmPlaceholder")}
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
            />
          </label>

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? t("passwordChange.changing") : t("passwordChange.submit")}
            </button>

            <button
              type="button"
              onClick={onLogout}
              disabled={loading}
              className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-300 hover:border-red-400 hover:text-red-300 transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("sidebar.logout")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
