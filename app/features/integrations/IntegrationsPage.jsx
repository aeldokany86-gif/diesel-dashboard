"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import {
  createIntegrationClient,
  fetchIntegrationClients,
  rotateIntegrationClientKey,
  updateIntegrationClient,
  updateIntegrationClientStatus,
  getExternalIntegrationApiBaseUrl,
  testExternalIntegrationEndpoint,
} from "../../services/integrationsService";

const DEFAULT_COMPANY_INTEGRATION_FEATURES = {
  operationsSummary: false,
  operationsDetails: false,
  costData: false,
  stockData: false,
  stockMovements: false,
  webhooks: false,
};

const SCOPE_TO_COMPANY_FEATURE = {
  "operations.summary": "operationsSummary",
  "operations.details": "operationsDetails",
  "cost.read": "costData",
  "stock.read": "stockData",
  "stock.movements.read": "stockMovements",
};

const SCOPE_OPTIONS = [
  {
    key: "operations.summary",
    labelEn: "Operations Summary",
    labelAr: "ملخص العمليات",
    descriptionEn:
      "Fuel quantity and operation count aggregated by asset and period.",
    descriptionAr:
      "إجمالي كمية الوقود وعدد العمليات مجمعة حسب المعدة والفترة.",
  },
  {
    key: "operations.details",
    labelEn: "Operations Details",
    labelAr: "تفاصيل العمليات",
    descriptionEn:
      "Full read-only transaction details for approved/completed operations.",
    descriptionAr:
      "تفاصيل كاملة للعمليات المعتمدة والمكتملة للقراءة فقط.",
  },
  {
    key: "cost.read",
    labelEn: "Cost Data",
    labelAr: "بيانات التكلفة",
    descriptionEn:
      "Expose fuel cost values together with allowed operation data.",
    descriptionAr: "إظهار قيم تكلفة الوقود مع بيانات العمليات المسموح بها.",
  },
  {
    key: "stock.read",
    labelEn: "Current Fuel Stock",
    labelAr: "المخزون الحالي للوقود",
    descriptionEn: "Station, project and company current stock balances.",
    descriptionAr: "أرصدة المخزون الحالية للمحطات والمشاريع والشركة.",
  },
  {
    key: "stock.movements.read",
    labelEn: "Stock Movements",
    labelAr: "حركات المخزون",
    descriptionEn: "Read inventory movement history and stock adjustments.",
    descriptionAr: "قراءة سجل حركات المخزون وتسويات الرصيد.",
  },
];

const EXTERNAL_API_ENDPOINTS = {
  "operations.summary": {
    path: "/integration/v1/operations/summary",
    method: "GET",
    live: true,
    labelEn: "Operations Summary",
    labelAr: "ملخص العمليات",
    noteEn: "Requires dateFrom and dateTo. Asset Code is optional.",
    noteAr: "يتطلب dateFrom و dateTo، ويمكن تحديد كود المعدة اختياريًا.",
  },
  "operations.details": {
    path: "/integration/v1/operations/details",
    method: "GET",
    live: false,
    labelEn: "Operations Details",
    labelAr: "تفاصيل العمليات",
    noteEn: "Planned for the next read-only API phase.",
    noteAr: "مخطط له في المرحلة التالية من Read-Only API.",
  },
  "stock.read": {
    path: "/integration/v1/stock",
    method: "GET",
    live: true,
    labelEn: "Current Fuel Stock",
    labelAr: "المخزون الحالي للوقود",
    noteEn: "Returns current stock for the whole company, a selected project, or one inventory-owner station inside that project.",
    noteAr: "يعرض المخزون الحالي لكل الشركة أو لمشروع محدد أو لمحطة مالكة للمخزون داخل المشروع المختار.",
  },
  "stock.movements.read": {
    path: "/integration/v1/stock/movements",
    method: "GET",
    live: false,
    labelEn: "Stock Movements",
    labelAr: "حركات المخزون",
    noteEn: "Planned for the next read-only API phase.",
    noteAr: "مخطط له في المرحلة التالية من Read-Only API.",
  },
};

const TESTABLE_ENDPOINT_KEYS = ["operations.summary", "stock.read"];

function Pill({ children, tone = "slate" }) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : tone === "amber"
        ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
        : tone === "red"
          ? "border-red-500/30 bg-red-500/10 text-red-300"
          : "border-slate-700 bg-slate-900 text-slate-300";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${toneClass}`}
    >
      {children}
    </span>
  );
}

function apiErrorMessage(error, fallback) {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message;

  if (Array.isArray(message)) return message.join(" / ");
  return message ? String(message) : fallback;
}

function sortedScopes(scopes = []) {
  return [...scopes].filter(Boolean).sort();
}

function scopesEqual(a = [], b = []) {
  return JSON.stringify(sortedScopes(a)) === JSON.stringify(sortedScopes(b));
}

export default function IntegrationsPage({
  currentUser,
  currentCompany,
  companyIntegrationConfig,
  showToast,
}) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const tx = (en, ar) => (isAr ? ar : en);

  const resolvedCompanyIntegrationConfig = companyIntegrationConfig || {
    enabled: false,
    features: { ...DEFAULT_COMPANY_INTEGRATION_FEATURES },
    webhookEvents: {
      operationCompleted: false,
      operationCorrected: false,
      inventoryAdjusted: false,
    },
    externalMapping: {
      enabled: false,
      manualEnabled: false,
      importEnabled: false,
    },
    clientLimit: 5,
  };

  const companyId = currentCompany?.id || currentUser?.companyId || "";
  const integrationEnabled = Boolean(
    resolvedCompanyIntegrationConfig.enabled,
  );
  const companyFeatures =
    resolvedCompanyIntegrationConfig.features ||
    DEFAULT_COMPANY_INTEGRATION_FEATURES;

  const isScopeIncluded = (scopeKey) =>
    Boolean(companyFeatures[SCOPE_TO_COMPANY_FEATURE[scopeKey]]);

  const webhooksIncluded = Boolean(companyFeatures.webhooks);
  const availableScopeKeys = SCOPE_OPTIONS.filter((scope) =>
    isScopeIncluded(scope.key),
  ).map((scope) => scope.key);

  const [integrations, setIntegrations] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [clientMeta, setClientMeta] = useState({
    clientLimit: resolvedCompanyIntegrationConfig.clientLimit || 5,
    usedClients: 0,
    remainingClients: resolvedCompanyIntegrationConfig.clientLimit || 5,
  });
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScopes, setNewScopes] = useState([]);

  const [activeTab, setActiveTab] = useState("overview");
  const [scopeDraft, setScopeDraft] = useState([]);
  const [savingScopes, setSavingScopes] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [rotatingKey, setRotatingKey] = useState(false);

  const [secretModal, setSecretModal] = useState({
    open: false,
    apiKey: "",
    title: "",
    notice: "",
  });
  const [secretCopied, setSecretCopied] = useState(false);

  const [confirmAction, setConfirmAction] = useState({
    open: false,
    type: "",
  });

  const [testEndpointKey, setTestEndpointKey] = useState("operations.summary");
  const [testApiKey, setTestApiKey] = useState("");
  const [testDateFrom, setTestDateFrom] = useState("2026-09-01");
  const [testDateTo, setTestDateTo] = useState("2026-09-30");
  const [testAssetCode, setTestAssetCode] = useState("");
  const [assetOptions, setAssetOptions] = useState([]);
  const [assetSearch, setAssetSearch] = useState("");
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false);
  const [loadingAssetOptions, setLoadingAssetOptions] = useState(false);
  const [assetOptionsError, setAssetOptionsError] = useState("");

  const [stockProjectId, setStockProjectId] = useState("");
  const [stockStationId, setStockStationId] = useState("");
  const [stockProjects, setStockProjects] = useState([]);
  const [stockStations, setStockStations] = useState([]);
  const [loadingStockOptions, setLoadingStockOptions] = useState(false);
  const [stockOptionsError, setStockOptionsError] = useState("");

  const [testingApi, setTestingApi] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState("");
  const apiBaseUrl = getExternalIntegrationApiBaseUrl();

  const selected = useMemo(
    () =>
      integrations.find((item) => item.id === selectedId) ||
      integrations[0] ||
      null,
    [integrations, selectedId],
  );

  const filteredAssetOptions = useMemo(() => {
    const query = String(assetSearch || "").trim().toLowerCase();

    if (!query) return assetOptions;

    return assetOptions.filter((assetCode) =>
      String(assetCode || "").toLowerCase().includes(query),
    );
  }, [assetOptions, assetSearch]);

  const stockStationsForSelectedProject = useMemo(() => {
    if (!stockProjectId) return [];

    return stockStations.filter(
      (station) => station.projectId === stockProjectId,
    );
  }, [stockStations, stockProjectId]);

  const refreshClients = async ({ keepSelection = true } = {}) => {
    if (!integrationEnabled || !companyId) return;

    setLoadingClients(true);
    setLoadError("");

    try {
      const result = await fetchIntegrationClients();
      setIntegrations(result.clients);
      setClientMeta({
        clientLimit: result.clientLimit,
        usedClients: result.usedClients,
        remainingClients: result.remainingClients,
      });

      setSelectedId((current) => {
        if (
          keepSelection &&
          current &&
          result.clients.some((client) => client.id === current)
        ) {
          return current;
        }

        return result.clients[0]?.id || "";
      });
    } catch (error) {
      const message = apiErrorMessage(
        error,
        tx(
          "Failed to load Integration Clients.",
          "تعذر تحميل عملاء التكامل.",
        ),
      );
      setLoadError(message);
      showToast?.("error", message);
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    if (!integrationEnabled || !companyId) {
      setIntegrations([]);
      setSelectedId("");
      return;
    }

    refreshClients({ keepSelection: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrationEnabled, companyId]);

  useEffect(() => {
    setScopeDraft(selected?.scopes || []);
  }, [selected?.id, selected?.updatedAt]);

  const openCreateModal = () => {
    if (clientMeta.remainingClients <= 0) {
      showToast?.(
        "warning",
        tx(
          `This company has reached its Integration Client limit (${clientMeta.clientLimit}).`,
          `وصلت الشركة إلى الحد الأقصى لعملاء التكامل (${clientMeta.clientLimit}).`,
        ),
      );
      return;
    }

    setNewName("");
    setNewScopes(availableScopeKeys.slice(0, 2));
    setShowCreateModal(true);
  };

  const toggleNewScope = (scopeKey) => {
    if (!isScopeIncluded(scopeKey)) return;

    setNewScopes((current) =>
      current.includes(scopeKey)
        ? current.filter((item) => item !== scopeKey)
        : [...current, scopeKey],
    );
  };

  const toggleScopeDraft = (scopeKey) => {
    if (!isScopeIncluded(scopeKey)) return;

    setScopeDraft((current) =>
      current.includes(scopeKey)
        ? current.filter((item) => item !== scopeKey)
        : [...current, scopeKey],
    );
  };

  const handleCreateClient = async () => {
    const safeName = newName.trim();

    if (!safeName) {
      showToast?.(
        "warning",
        tx("Integration name is required.", "اسم التكامل مطلوب."),
      );
      return;
    }

    setCreatingClient(true);

    try {
      const result = await createIntegrationClient({
        name: safeName,
        scopes: newScopes.filter((scope) => isScopeIncluded(scope)),
      });

      setShowCreateModal(false);
      setNewName("");
      setNewScopes([]);

      await refreshClients({ keepSelection: false });
      setSelectedId(result.client.id);

      setSecretModal({
        open: true,
        apiKey: result.apiKey,
        title: tx(
          "Integration Client Created",
          "تم إنشاء عميل التكامل",
        ),
        notice:
          result.apiKeyNotice ||
          tx(
            "Save this API key now. The full key will not be shown again.",
            "احفظ مفتاح API الآن. لن يتم عرض المفتاح الكامل مرة أخرى.",
          ),
      });
      setSecretCopied(false);

      showToast?.(
        "success",
        tx(
          "Integration Client created successfully.",
          "تم إنشاء عميل التكامل بنجاح.",
        ),
      );
    } catch (error) {
      showToast?.(
        "error",
        apiErrorMessage(
          error,
          tx(
            "Failed to create Integration Client.",
            "تعذر إنشاء عميل التكامل.",
          ),
        ),
      );
    } finally {
      setCreatingClient(false);
    }
  };

  const handleSaveScopes = async () => {
    if (!selected) return;

    setSavingScopes(true);

    try {
      const updated = await updateIntegrationClient(selected.id, {
        scopes: scopeDraft.filter((scope) => isScopeIncluded(scope)),
      });

      setIntegrations((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      );
      setScopeDraft(updated.scopes);

      showToast?.(
        "success",
        tx("API scopes updated.", "تم تحديث صلاحيات API."),
      );
    } catch (error) {
      showToast?.(
        "error",
        apiErrorMessage(
          error,
          tx("Failed to update scopes.", "تعذر تحديث الصلاحيات."),
        ),
      );
    } finally {
      setSavingScopes(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selected) return;

    setChangingStatus(true);

    try {
      const nextEnabled = selected.status !== "ACTIVE";
      const updated = await updateIntegrationClientStatus(
        selected.id,
        nextEnabled,
      );

      setIntegrations((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      );

      showToast?.(
        "success",
        nextEnabled
          ? tx("Integration Client enabled.", "تم تفعيل عميل التكامل.")
          : tx("Integration Client disabled.", "تم إيقاف عميل التكامل."),
      );
    } catch (error) {
      showToast?.(
        "error",
        apiErrorMessage(
          error,
          tx(
            "Failed to change Integration Client status.",
            "تعذر تغيير حالة عميل التكامل.",
          ),
        ),
      );
    } finally {
      setChangingStatus(false);
      setConfirmAction({ open: false, type: "" });
    }
  };

  const handleRotateKey = async () => {
    if (!selected) return;

    setRotatingKey(true);

    try {
      const result = await rotateIntegrationClientKey(selected.id);

      setIntegrations((current) =>
        current.map((item) =>
          item.id === result.client.id ? result.client : item,
        ),
      );

      setSecretModal({
        open: true,
        apiKey: result.apiKey,
        title: tx("API Key Rotated", "تم تغيير مفتاح API"),
        notice:
          result.apiKeyNotice ||
          tx(
            "Save the new key now. The previous key is no longer valid.",
            "احفظ المفتاح الجديد الآن. المفتاح السابق لم يعد صالحًا.",
          ),
      });
      setSecretCopied(false);

      showToast?.(
        "success",
        tx("API key rotated successfully.", "تم تغيير مفتاح API بنجاح."),
      );
    } catch (error) {
      showToast?.(
        "error",
        apiErrorMessage(
          error,
          tx("Failed to rotate API key.", "تعذر تغيير مفتاح API."),
        ),
      );
    } finally {
      setRotatingKey(false);
      setConfirmAction({ open: false, type: "" });
    }
  };

  useEffect(() => {
    setTestApiKey("");
    setTestResult(null);
    setTestError("");

    if (
      selected?.scopes?.includes("operations.summary")
    ) {
      setTestEndpointKey("operations.summary");
    } else if (selected?.scopes?.includes("stock.read")) {
      setTestEndpointKey("stock.read");
    }
  }, [selected?.id]);

  const loadAssetOptions = async () => {
    if (!selected) return;

    if (!selected.scopes.includes("operations.summary")) {
      setAssetOptionsError(
        tx(
          "Operations Summary scope is required to load the asset list.",
          "صلاحية ملخص العمليات مطلوبة لتحميل قائمة المعدات.",
        ),
      );
      return;
    }

    if (!testApiKey.trim()) {
      setAssetOptionsError(
        tx(
          "Enter the API key first to load assets for the selected period.",
          "أدخل مفتاح API أولًا لتحميل معدات الفترة المختارة.",
        ),
      );
      return;
    }

    if (!testDateFrom || !testDateTo) {
      setAssetOptionsError(
        tx(
          "Select dateFrom and dateTo first.",
          "اختر تاريخ البداية والنهاية أولًا.",
        ),
      );
      return;
    }

    setLoadingAssetOptions(true);
    setAssetOptionsError("");

    try {
      const summaryEndpoint = EXTERNAL_API_ENDPOINTS["operations.summary"];

      const result = await testExternalIntegrationEndpoint({
        clientId: selected.clientId,
        apiKey: testApiKey,
        endpoint: summaryEndpoint.path,
        params: {
          dateFrom: testDateFrom,
          dateTo: testDateTo,
        },
      });

      const summaryRows = Array.isArray(result?.data?.data)
        ? result.data.data
        : [];

      const uniqueAssetCodes = Array.from(
        new Set(
          summaryRows
            .map((row) => String(row?.assetCode || "").trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      setAssetOptions(uniqueAssetCodes);

      if (
        testAssetCode &&
        !uniqueAssetCodes.includes(testAssetCode)
      ) {
        setTestAssetCode("");
      }
    } catch (error) {
      setAssetOptions([]);
      setAssetOptionsError(
        apiErrorMessage(
          error,
          tx(
            "Failed to load assets for this period.",
            "تعذر تحميل معدات هذه الفترة.",
          ),
        ),
      );
    } finally {
      setLoadingAssetOptions(false);
    }
  };

  const loadStockOptions = async () => {
    if (!selected) return;

    if (!selected.scopes.includes("stock.read")) {
      setStockOptionsError(
        tx(
          "Current Fuel Stock scope is required to load projects and stations.",
          "صلاحية المخزون الحالي مطلوبة لتحميل المشاريع والمحطات.",
        ),
      );
      return;
    }

    if (!testApiKey.trim()) {
      setStockOptionsError(
        tx(
          "Enter the API key first to load stock projects and stations.",
          "أدخل مفتاح API أولًا لتحميل مشاريع ومحطات المخزون.",
        ),
      );
      return;
    }

    setLoadingStockOptions(true);
    setStockOptionsError("");

    try {
      const stockEndpoint = EXTERNAL_API_ENDPOINTS["stock.read"];

      const result = await testExternalIntegrationEndpoint({
        clientId: selected.clientId,
        apiKey: testApiKey,
        endpoint: stockEndpoint.path,
        params: {},
      });

      const payload = result?.data || {};
      const projects = Array.isArray(payload?.projects)
        ? payload.projects
            .filter((project) => project?.projectId)
            .map((project) => ({
              projectId: project.projectId,
              projectCode: project.projectCode || "",
              projectName: project.projectName || project.projectCode || project.projectId,
            }))
        : [];

      const stations = Array.isArray(payload?.stations)
        ? payload.stations
            .filter((station) => station?.stationId && station?.projectId)
            .map((station) => ({
              stationId: station.stationId,
              stationCode: station.stationCode || "",
              stationName: station.stationName || station.stationCode || station.stationId,
              projectId: station.projectId,
            }))
        : [];

      setStockProjects(projects);
      setStockStations(stations);

      if (
        stockProjectId &&
        !projects.some((project) => project.projectId === stockProjectId)
      ) {
        setStockProjectId("");
        setStockStationId("");
      }

      if (
        stockStationId &&
        !stations.some(
          (station) =>
            station.stationId === stockStationId &&
            station.projectId === stockProjectId,
        )
      ) {
        setStockStationId("");
      }
    } catch (error) {
      setStockProjects([]);
      setStockStations([]);
      setStockOptionsError(
        apiErrorMessage(
          error,
          tx(
            "Failed to load stock projects and stations.",
            "تعذر تحميل مشاريع ومحطات المخزون.",
          ),
        ),
      );
    } finally {
      setLoadingStockOptions(false);
    }
  };

  const handleTestApi = async () => {
    if (!selected) return;

    const endpointConfig = EXTERNAL_API_ENDPOINTS[testEndpointKey];

    if (!endpointConfig?.live) {
      setTestError(
        tx(
          "This endpoint is not connected yet.",
          "هذا الـ endpoint غير متصل حتى الآن.",
        ),
      );
      return;
    }

    if (!selected.scopes.includes(testEndpointKey)) {
      setTestError(
        tx(
          "This Integration Client does not have the required scope.",
          "عميل التكامل لا يملك الصلاحية المطلوبة.",
        ),
      );
      return;
    }

    if (!testApiKey.trim()) {
      setTestError(
        tx(
          "Paste the API key temporarily to run the test. It will not be saved.",
          "الصق مفتاح API مؤقتًا لتنفيذ الاختبار. لن يتم حفظه.",
        ),
      );
      return;
    }

    setTestingApi(true);
    setTestError("");
    setTestResult(null);

    try {
      const params =
        testEndpointKey === "operations.summary"
          ? {
              dateFrom: testDateFrom,
              dateTo: testDateTo,
              assetCode: testAssetCode.trim() || undefined,
            }
          : testEndpointKey === "stock.read"
            ? {
                projectId: stockProjectId || undefined,
                stationId: stockProjectId
                  ? stockStationId || undefined
                  : undefined,
              }
            : {};

      const result = await testExternalIntegrationEndpoint({
        clientId: selected.clientId,
        apiKey: testApiKey,
        endpoint: endpointConfig.path,
        params,
      });

      setTestResult(result);
      showToast?.(
        "success",
        tx("External API test succeeded.", "نجح اختبار External API."),
      );
    } catch (error) {
      const status = error?.status ? `HTTP ${error.status} — ` : "";
      setTestError(
        `${status}${apiErrorMessage(
          error,
          tx("External API test failed.", "فشل اختبار External API."),
        )}`,
      );
    } finally {
      setTestingApi(false);
    }
  };

  const copySecret = async () => {
    if (!secretModal.apiKey) return;

    try {
      await navigator.clipboard.writeText(secretModal.apiKey);
      setSecretCopied(true);
      showToast?.(
        "success",
        tx("API key copied.", "تم نسخ مفتاح API."),
      );
    } catch {
      showToast?.(
        "warning",
        tx(
          "Copy failed. Select the key and copy it manually.",
          "تعذر النسخ. حدد المفتاح وانسخه يدويًا.",
        ),
      );
    }
  };

  if (!integrationEnabled) {
    return (
      <div className="min-h-screen p-4 text-slate-100 sm:p-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
            {tx("Integration Access", "صلاحية التكامل")}
          </p>
          <h1 className="mt-2 text-2xl font-black text-white">
            {tx(
              "Integrations are not enabled for this company",
              "التكاملات غير مفعلة لهذه الشركة",
            )}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {tx(
              "The Fleet Fuel PRO Platform Admin must enable API Integration for your company before this page can be used.",
              "يجب أن يقوم مدير منصة Fleet Fuel PRO بتفعيل API Integration للشركة قبل استخدام هذه الصفحة.",
            )}
          </p>
        </div>
      </div>
    );
  }

  const scopeDraftChanged = selected
    ? !scopesEqual(scopeDraft, selected.scopes)
    : false;

  return (
    <div className="min-h-screen p-4 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
              {tx("ERP & External Systems", "أنظمة ERP والأنظمة الخارجية")}
            </p>
            <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
              {tx("Integrations", "التكاملات")}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              {tx(
                "Create separate credentials and API permissions for each approved external system.",
                "أنشئ بيانات دخول وصلاحيات API مستقلة لكل نظام خارجي معتمد.",
              )}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Pill tone="emerald">
                {tx("Backend connected", "متصل بالباك اند")}
              </Pill>
              <Pill>
                {currentCompany?.name ||
                  currentUser?.companyName ||
                  tx("Current company", "الشركة الحالية")}
              </Pill>
              <Pill tone="emerald">
                {tx("Admin only", "للأدمن فقط")}
              </Pill>
              <Pill tone={clientMeta.remainingClients > 0 ? "amber" : "red"}>
                {clientMeta.usedClients} / {clientMeta.clientLimit}{" "}
                {tx("clients used", "عميل مستخدم")}
              </Pill>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            disabled={
              loadingClients ||
              clientMeta.remainingClients <= 0
            }
            className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + {tx("Create Integration", "إنشاء تكامل")}
          </button>
        </div>

        {loadError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-300">
            {loadError}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
            <div className="border-b border-slate-800 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-black text-white">
                    {tx("Integration Clients", "عملاء التكامل")}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {tx(
                      "Each external system has independent credentials and scopes.",
                      "كل نظام خارجي له بيانات دخول وصلاحيات مستقلة.",
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => refreshClients()}
                  disabled={loadingClients}
                  className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] font-black text-slate-400 hover:bg-slate-800 disabled:opacity-50"
                >
                  {loadingClients
                    ? tx("Loading...", "تحميل...")
                    : tx("Refresh", "تحديث")}
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              {loadingClients && integrations.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  {tx(
                    "Loading Integration Clients...",
                    "جارٍ تحميل عملاء التكامل...",
                  )}
                </div>
              ) : integrations.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="font-black text-slate-300">
                    {tx(
                      "No Integration Clients yet",
                      "لا يوجد عملاء تكامل حتى الآن",
                    )}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {tx(
                      "Create the first client when an ERP or external system is ready to connect.",
                      "أنشئ أول عميل عندما يكون نظام ERP أو النظام الخارجي جاهزًا للربط.",
                    )}
                  </p>
                </div>
              ) : (
                integrations.map((item) => {
                  const active = item.id === selected?.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full px-4 py-4 text-start transition ${
                        active
                          ? "bg-amber-400/10"
                          : "hover:bg-slate-800/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-black text-slate-100">
                          {item.name}
                        </span>
                        <Pill
                          tone={
                            item.status === "ACTIVE"
                              ? "emerald"
                              : "slate"
                          }
                        >
                          {item.status === "ACTIVE"
                            ? tx("Active", "نشط")
                            : tx("Disabled", "موقوف")}
                        </Pill>
                      </div>
                      <p className="mt-2 truncate text-xs text-slate-500">
                        {item.clientId}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {item.scopes.length} {tx("scopes", "صلاحيات")}
                      </p>
                    </button>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-500">
              {tx("Remaining client slots", "عدد العملاء المتبقي")}:{" "}
              <span className="font-black text-slate-300">
                {clientMeta.remainingClients}
              </span>
            </div>
          </aside>

          <section className="min-w-0 space-y-4">
            {!selected ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-10 text-center">
                <p className="font-black text-slate-300">
                  {tx(
                    "Create an Integration Client to begin.",
                    "أنشئ عميل تكامل للبدء.",
                  )}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {tx(
                    "The client represents one external connection such as SAP, Oracle, or another ERP service.",
                    "العميل يمثل اتصالًا خارجيًا مستقلًا مثل SAP أو Oracle أو أي نظام ERP آخر.",
                  )}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-black text-white">
                          {selected.name}
                        </h2>
                        <Pill
                          tone={
                            selected.status === "ACTIVE"
                              ? "emerald"
                              : "slate"
                          }
                        >
                          {selected.status === "ACTIVE"
                            ? tx("Active", "نشط")
                            : tx("Disabled", "موقوف")}
                        </Pill>
                      </div>
                      <p className="mt-2 text-sm text-slate-400">
                        {tx(
                          "Independent external credential set for this company.",
                          "بيانات دخول خارجية مستقلة خاصة بهذه الشركة.",
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={rotatingKey || changingStatus}
                        onClick={() =>
                          setConfirmAction({
                            open: true,
                            type: "rotate",
                          })
                        }
                        className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-black text-amber-200 hover:bg-amber-400/20 disabled:opacity-50"
                      >
                        {rotatingKey
                          ? tx("Rotating...", "جارٍ التغيير...")
                          : tx("Rotate API Key", "تغيير مفتاح API")}
                      </button>

                      <button
                        type="button"
                        disabled={changingStatus || rotatingKey}
                        onClick={() =>
                          setConfirmAction({
                            open: true,
                            type: "status",
                          })
                        }
                        className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-black text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                      >
                        {changingStatus
                          ? tx("Saving...", "جارٍ الحفظ...")
                          : selected.status === "ACTIVE"
                            ? tx("Disable", "إيقاف")
                            : tx("Enable", "تفعيل")}
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Client ID
                      </p>
                      <p className="mt-1 break-all text-sm font-black text-white">
                        {selected.clientId}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        API Key
                      </p>
                      <p className="mt-1 text-sm font-black text-white">
                        {selected.keyPrefix || "—"}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-600">
                        {tx(
                          "Full key is never stored for display.",
                          "لا يتم الاحتفاظ بالمفتاح الكامل لعرضه.",
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        {tx("Last Used", "آخر استخدام")}
                      </p>
                      <p className="mt-1 text-sm font-black text-white">
                        {selected.lastUsedAt
                          ? new Date(selected.lastUsedAt).toLocaleString()
                          : "—"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        {tx("Created", "تاريخ الإنشاء")}
                      </p>
                      <p className="mt-1 text-sm font-black text-white">
                        {selected.createdAt
                          ? new Date(selected.createdAt).toLocaleString()
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60">
                  <div className="flex overflow-x-auto border-b border-slate-800">
                    {[
                      ["overview", tx("Overview", "نظرة عامة")],
                      ["scopes", tx("API Access", "صلاحيات API")],
                      ["webhooks", "Webhooks"],
                      ["logs", tx("Logs", "السجلات")],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveTab(key)}
                        className={`shrink-0 px-4 py-3 text-sm font-black transition ${
                          activeTab === key
                            ? "border-b-2 border-amber-400 text-amber-300"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="p-4 sm:p-5">
                    {activeTab === "overview" && (
                      <div className="space-y-4">
                        <div className="grid gap-4 xl:grid-cols-2">
                          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                            <h3 className="font-black text-white">
                              {tx("What this client is", "ما هو عميل التكامل؟")}
                            </h3>
                            <p className="mt-3 text-sm leading-6 text-slate-400">
                              {tx(
                                "This client is a real external-system identity. Its Client ID and API Key authenticate requests independently from normal Fleet Fuel PRO users.",
                                "هذا العميل هو هوية حقيقية للنظام الخارجي. يستخدم Client ID وAPI Key للمصادقة بصورة مستقلة عن مستخدمي Fleet Fuel PRO العاديين.",
                              )}
                            </p>
                          </div>

                          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h3 className="font-black text-white">
                                {tx("Read-Only API Status", "حالة Read-Only API")}
                              </h3>
                              <Pill tone="emerald">
                                {tx("Live", "يعمل")}
                              </Pill>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-slate-400">
                              {tx(
                                "API Key authentication, Operations Summary, Current Fuel Stock, scope enforcement, and company entitlement checks are connected.",
                                "تم ربط مصادقة API Key وملخص العمليات والمخزون الحالي والتحقق من الصلاحيات واشتراك الشركة.",
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                            {tx("External API Base URL", "الرابط الأساسي للـ External API")}
                          </p>
                          <code className="mt-2 block break-all rounded-lg border border-slate-800 bg-black/30 p-3 text-xs text-sky-300">
                            {apiBaseUrl || "—"}
                          </code>
                        </div>

                        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h3 className="font-black text-white">
                                {tx("Test External API", "اختبار External API")}
                              </h3>
                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                {tx(
                                  "The API key is used only for this browser request and is never saved by this page.",
                                  "يُستخدم مفتاح API لهذا الطلب فقط داخل المتصفح ولا يتم حفظه في الصفحة.",
                                )}
                              </p>
                            </div>
                            <Pill tone="amber">
                              {selected.clientId}
                            </Pill>
                          </div>

                          <div className="mt-4 grid gap-3 lg:grid-cols-2">
                            <div>
                              <label className="text-xs font-black text-slate-400">
                                {tx("Endpoint", "Endpoint")}
                              </label>
                              <select
                                value={testEndpointKey}
                                onChange={(event) => {
                                  const nextEndpoint = event.target.value;
                                  setTestEndpointKey(nextEndpoint);
                                  setTestResult(null);
                                  setTestError("");

                                  if (nextEndpoint !== "stock.read") {
                                    setStockProjectId("");
                                    setStockStationId("");
                                  }
                                }}
                                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                              >
                                {TESTABLE_ENDPOINT_KEYS.map((scopeKey) => {
                                  const endpoint = EXTERNAL_API_ENDPOINTS[scopeKey];
                                  const allowed = selected.scopes.includes(scopeKey);
                                  return (
                                    <option
                                      key={scopeKey}
                                      value={scopeKey}
                                      disabled={!allowed}
                                    >
                                      {tx(endpoint.labelEn, endpoint.labelAr)}
                                      {allowed
                                        ? ""
                                        : tx(" — scope not enabled", " — الصلاحية غير مفعلة")}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>

                            <div>
                              <label className="text-xs font-black text-slate-400">
                                API Key
                              </label>
                              <input
                                type="password"
                                autoComplete="off"
                                value={testApiKey}
                                onChange={(event) => setTestApiKey(event.target.value)}
                                placeholder="ffp_live_..."
                                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>

                          {testEndpointKey === "operations.summary" && (
                            <div className="mt-3 grid gap-3 md:grid-cols-3">
                              <div>
                                <label className="text-xs font-black text-slate-400">
                                  dateFrom
                                </label>
                                <input
                                  type="date"
                                  value={testDateFrom}
                                  onChange={(event) => {
                                    setTestDateFrom(event.target.value);
                                    setTestAssetCode("");
                                    setAssetOptions([]);
                                    setAssetSearch("");
                                  }}
                                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-black text-slate-400">
                                  dateTo
                                </label>
                                <input
                                  type="date"
                                  value={testDateTo}
                                  onChange={(event) => {
                                    setTestDateTo(event.target.value);
                                    setTestAssetCode("");
                                    setAssetOptions([]);
                                    setAssetSearch("");
                                  }}
                                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                                />
                              </div>
                              <div className="relative">
                                <label className="text-xs font-black text-slate-400">
                                  {tx("Asset", "المعدة")}
                                </label>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    const nextOpen = !assetDropdownOpen;
                                    setAssetDropdownOpen(nextOpen);
                                    setAssetSearch("");
                                    if (
                                      nextOpen &&
                                      assetOptions.length === 0 &&
                                      !loadingAssetOptions
                                    ) {
                                      await loadAssetOptions();
                                    }
                                  }}
                                  className="mt-1 flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-left text-sm text-white outline-none hover:border-slate-600 focus:border-amber-400"
                                >
                                  <span className="truncate">
                                    {testAssetCode ||
                                      tx("All Assets", "كل المعدات")}
                                  </span>
                                  <span className="ml-2 text-slate-500">▼</span>
                                </button>

                                {assetDropdownOpen && (
                                  <div className="absolute bottom-full z-30 mb-1 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">
                                    <div className="border-b border-slate-800 p-2">
                                      <input
                                        autoFocus
                                        value={assetSearch}
                                        onChange={(event) =>
                                          setAssetSearch(event.target.value)
                                        }
                                        placeholder={tx(
                                          "Search asset code...",
                                          "ابحث برقم المعدة...",
                                        )}
                                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                                      />
                                    </div>

                                    <div className="max-h-56 overflow-y-auto py-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setTestAssetCode("");
                                          setAssetDropdownOpen(false);
                                          setAssetSearch("");
                                        }}
                                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                                          !testAssetCode
                                            ? "bg-amber-400/10 font-black text-amber-200"
                                            : "text-slate-300 hover:bg-slate-900"
                                        }`}
                                      >
                                        <span>{tx("All Assets", "كل المعدات")}</span>
                                        {!testAssetCode && <span>✓</span>}
                                      </button>

                                      {loadingAssetOptions ? (
                                        <div className="px-3 py-3 text-xs text-slate-500">
                                          {tx(
                                            "Loading assets for this period...",
                                            "جارٍ تحميل معدات هذه الفترة...",
                                          )}
                                        </div>
                                      ) : filteredAssetOptions.length ? (
                                        filteredAssetOptions.map((assetCode) => (
                                          <button
                                            key={assetCode}
                                            type="button"
                                            onClick={() => {
                                              setTestAssetCode(assetCode);
                                              setAssetDropdownOpen(false);
                                              setAssetSearch("");
                                            }}
                                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                                              testAssetCode === assetCode
                                                ? "bg-amber-400/10 font-black text-amber-200"
                                                : "text-slate-300 hover:bg-slate-900"
                                            }`}
                                          >
                                            <span>{assetCode}</span>
                                            {testAssetCode === assetCode && (
                                              <span>✓</span>
                                            )}
                                          </button>
                                        ))
                                      ) : (
                                        <div className="px-3 py-3 text-xs text-slate-500">
                                          {assetOptionsError ||
                                            tx(
                                              "No assets found for this period.",
                                              "لا توجد معدات لها عمليات في هذه الفترة.",
                                            )}
                                        </div>
                                      )}
                                    </div>

                                    <div className="border-t border-slate-800 p-2">
                                      <button
                                        type="button"
                                        onClick={loadAssetOptions}
                                        disabled={loadingAssetOptions}
                                        className="w-full rounded-lg border border-slate-700 px-3 py-2 text-xs font-black text-slate-300 hover:bg-slate-900 disabled:opacity-50"
                                      >
                                        {loadingAssetOptions
                                          ? tx("Loading...", "جارٍ التحميل...")
                                          : tx(
                                              "Refresh asset list",
                                              "تحديث قائمة المعدات",
                                            )}
                                      </button>
                                    </div>
                                  </div>
                                )}

                                <p className="mt-1 text-[10px] leading-4 text-slate-600">
                                  {tx(
                                    "Shows only assets with operations in the selected period. Search is by asset code only.",
                                    "تظهر فقط المعدات التي لها عمليات خلال الفترة المختارة. البحث برقم المعدة فقط.",
                                  )}
                                </p>
                              </div>
                            </div>
                          )}

                          {testEndpointKey === "stock.read" && (
                            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                              <div>
                                <label className="text-xs font-black text-slate-400">
                                  {tx("Project", "المشروع")}
                                </label>
                                <select
                                  value={stockProjectId}
                                  onFocus={() => {
                                    if (
                                      stockProjects.length === 0 &&
                                      !loadingStockOptions
                                    ) {
                                      loadStockOptions();
                                    }
                                  }}
                                  onChange={(event) => {
                                    setStockProjectId(event.target.value);
                                    setStockStationId("");
                                    setTestResult(null);
                                  }}
                                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                                >
                                  <option value="">
                                    {tx("All Projects", "كل المشاريع")}
                                  </option>
                                  {stockProjects.map((project) => (
                                    <option
                                      key={project.projectId}
                                      value={project.projectId}
                                    >
                                      {project.projectCode
                                        ? `${project.projectCode} — ${project.projectName}`
                                        : project.projectName}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-xs font-black text-slate-400">
                                  {tx("Station", "المحطة")}
                                </label>
                                <select
                                  value={stockStationId}
                                  disabled={!stockProjectId}
                                  onChange={(event) => {
                                    setStockStationId(event.target.value);
                                    setTestResult(null);
                                  }}
                                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <option value="">
                                    {stockProjectId
                                      ? tx("All Stations", "كل المحطات")
                                      : tx(
                                          "Select a project first",
                                          "اختر مشروعًا أولًا",
                                        )}
                                  </option>
                                  {stockStationsForSelectedProject.map((station) => (
                                    <option
                                      key={station.stationId}
                                      value={station.stationId}
                                    >
                                      {station.stationCode
                                        ? `${station.stationCode} — ${station.stationName}`
                                        : station.stationName}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="lg:col-span-2 flex flex-wrap items-center gap-3">
                                <button
                                  type="button"
                                  onClick={loadStockOptions}
                                  disabled={loadingStockOptions}
                                  className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-black text-slate-300 hover:bg-slate-900 disabled:opacity-50"
                                >
                                  {loadingStockOptions
                                    ? tx("Loading...", "جارٍ التحميل...")
                                    : tx(
                                        "Refresh projects & stations",
                                        "تحديث المشاريع والمحطات",
                                      )}
                                </button>

                                {stockOptionsError && (
                                  <span className="text-xs font-bold text-red-300">
                                    {stockOptionsError}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={handleTestApi}
                              disabled={
                                testingApi ||
                                selected.status !== "ACTIVE" ||
                                !selected.scopes.includes(testEndpointKey)
                              }
                              className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {testingApi
                                ? tx("Testing...", "جارٍ الاختبار...")
                                : tx("Run API Test", "تشغيل اختبار API")}
                            </button>

                            {selected.status !== "ACTIVE" && (
                              <span className="text-xs font-bold text-red-300">
                                {tx(
                                  "Enable this client before testing.",
                                  "فعّل عميل التكامل قبل الاختبار.",
                                )}
                              </span>
                            )}
                          </div>

                          {testError && (
                            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-300">
                              {testError}
                            </div>
                          )}

                          {testResult && (
                            <div className="mt-4 overflow-hidden rounded-xl border border-emerald-500/20 bg-black/30">
                              <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
                                <span className="text-xs font-black text-emerald-300">
                                  HTTP {testResult.status}
                                </span>
                                <span className="text-[10px] text-slate-600">
                                  {tx("Live backend response", "استجابة حقيقية من الباك اند")}
                                </span>
                              </div>
                              <pre
                                dir="ltr"
                                className="max-h-80 overflow-auto p-3 text-left text-xs leading-5 text-slate-300"
                              >
                                {JSON.stringify(testResult.data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === "scopes" && (
                      <div className="space-y-4">
                        <div className="space-y-3">
                          {SCOPE_OPTIONS.map((scope) => {
                            const included = isScopeIncluded(scope.key);
                            const checked =
                              included && scopeDraft.includes(scope.key);

                            return (
                              <label
                                key={scope.key}
                                className={`flex gap-3 rounded-xl border p-4 ${
                                  included
                                    ? "cursor-pointer border-slate-800 bg-slate-950/40 hover:border-slate-700"
                                    : "cursor-not-allowed border-slate-800/70 bg-slate-950/20 opacity-55"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={!included || savingScopes}
                                  onChange={() =>
                                    toggleScopeDraft(scope.key)
                                  }
                                  className="mt-1"
                                />

                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-black text-white">
                                      {tx(scope.labelEn, scope.labelAr)}
                                    </p>
                                    <code className="text-[11px] text-slate-500">
                                      {scope.key}
                                    </code>
                                    <Pill
                                      tone={
                                        included ? "emerald" : "slate"
                                      }
                                    >
                                      {included
                                        ? tx(
                                            "Available by company plan",
                                            "متاح ضمن خطة الشركة",
                                          )
                                        : tx(
                                            "Not included in company plan",
                                            "غير مشمول في خطة الشركة",
                                          )}
                                    </Pill>
                                  </div>
                                  <p className="mt-1 text-xs leading-5 text-slate-500">
                                    {tx(
                                      scope.descriptionEn,
                                      scope.descriptionAr,
                                    )}
                                  </p>

                                  {scope.key === "cost.read" ? (
                                    <div className="mt-2 rounded-lg border border-slate-800 bg-black/20 px-3 py-2 text-[11px] leading-5 text-slate-500">
                                      {tx(
                                        "Modifier permission: when enabled, allowed operation endpoints can include cost fields. It does not have a separate endpoint.",
                                        "صلاحية إضافية: عند تفعيلها يمكن للـ endpoints المسموح بها عرض بيانات التكلفة. ليس لها endpoint مستقل.",
                                      )}
                                    </div>
                                  ) : EXTERNAL_API_ENDPOINTS[scope.key] ? (
                                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-black/20 px-3 py-2">
                                      <code className="text-[11px] text-sky-300">
                                        {EXTERNAL_API_ENDPOINTS[scope.key].method}{" "}
                                        {EXTERNAL_API_ENDPOINTS[scope.key].path}
                                      </code>
                                      <Pill
                                        tone={
                                          EXTERNAL_API_ENDPOINTS[scope.key].live
                                            ? "emerald"
                                            : "slate"
                                        }
                                      >
                                        {EXTERNAL_API_ENDPOINTS[scope.key].live
                                          ? tx("Live", "يعمل")
                                          : tx("Coming soon", "قريبًا")}
                                      </Pill>
                                      <span className="w-full text-[10px] leading-4 text-slate-600">
                                        {tx(
                                          EXTERNAL_API_ENDPOINTS[scope.key].noteEn,
                                          EXTERNAL_API_ENDPOINTS[scope.key].noteAr,
                                        )}
                                      </span>
                                    </div>
                                  ) : null}
                                </div>
                              </label>
                            );
                          })}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                          <p className="text-xs text-slate-500">
                            {tx(
                              "A client can only receive scopes that the Platform Admin enabled for the company.",
                              "لا يمكن إعطاء العميل صلاحية لم يقم Platform Admin بتفعيلها للشركة.",
                            )}
                          </p>

                          <button
                            type="button"
                            onClick={handleSaveScopes}
                            disabled={
                              !scopeDraftChanged || savingScopes
                            }
                            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            {savingScopes
                              ? tx("Saving...", "جارٍ الحفظ...")
                              : tx("Save Scopes", "حفظ الصلاحيات")}
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === "webhooks" && (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-black text-white">
                                Webhooks
                              </p>
                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                {tx(
                                  "Company entitlement is already controlled by the Platform Admin.",
                                  "صلاحية Webhooks على مستوى الشركة يتحكم بها Platform Admin بالفعل.",
                                )}
                              </p>
                            </div>
                            <Pill
                              tone={
                                webhooksIncluded ? "emerald" : "slate"
                              }
                            >
                              {webhooksIncluded
                                ? tx(
                                    "Included for company",
                                    "مشمولة للشركة",
                                  )
                                : tx(
                                    "Not included",
                                    "غير مشمولة",
                                  )}
                            </Pill>
                          </div>
                        </div>

                        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-slate-400">
                          {tx(
                            "Per-client webhook URL, signing secret, event subscriptions, delivery retries, and delivery logs will be added in the dedicated Webhooks phase. The read-only API is already active.",
                            "سيتم إضافة رابط Webhook لكل عميل ومفتاح التوقيع واشتراكات الأحداث وإعادة المحاولة وسجلات التسليم في مرحلة Webhooks المخصصة. الـ Read-Only API يعمل بالفعل.",
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === "logs" && (
                      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/30 p-8 text-center">
                        <p className="font-black text-slate-300">
                          {tx(
                            "No API logs yet",
                            "لا توجد سجلات API حتى الآن",
                          )}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          {tx(
                            "Persistent request logging will be connected in the Logs phase. API Key authentication and live external endpoints are already active.",
                            "سيتم ربط سجل الطلبات الدائم في مرحلة Logs. مصادقة API Key والـ endpoints الخارجية الحقيقية تعمل بالفعل.",
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
              <div>
                <h2 className="text-xl font-black text-white">
                  {tx("Create Integration Client", "إنشاء عميل تكامل")}
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {tx(
                    "This creates real credentials in the backend. The full API key will be shown only once after creation.",
                    "سيتم إنشاء بيانات دخول حقيقية في الباك اند. سيتم عرض مفتاح API الكامل مرة واحدة فقط بعد الإنشاء.",
                  )}
                </p>
              </div>
              <button
                type="button"
                disabled={creatingClient}
                onClick={() => setShowCreateModal(false)}
                className="text-xl text-slate-500 hover:text-white disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <label className="text-sm font-black text-slate-300">
                  {tx("Integration Name", "اسم التكامل")}
                </label>
                <input
                  value={newName}
                  disabled={creatingClient}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="SAP Production"
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400 disabled:opacity-60"
                />
              </div>

              <div>
                <p className="text-sm font-black text-slate-300">
                  {tx("Allowed API Data", "بيانات API المسموح بها")}
                </p>
                <div className="mt-2 space-y-2">
                  {SCOPE_OPTIONS.map((scope) => {
                    const included = isScopeIncluded(scope.key);

                    return (
                      <label
                        key={scope.key}
                        className={`flex gap-3 rounded-xl border p-3 ${
                          included
                            ? "cursor-pointer border-slate-800 bg-slate-900/60 hover:border-slate-700"
                            : "cursor-not-allowed border-slate-800/70 bg-slate-950/40 opacity-55"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={
                            included && newScopes.includes(scope.key)
                          }
                          disabled={!included || creatingClient}
                          onChange={() => toggleNewScope(scope.key)}
                          className="mt-1"
                        />
                        <span>
                          <span className="flex flex-wrap items-center gap-2 text-sm font-black text-white">
                            {tx(scope.labelEn, scope.labelAr)}
                            {!included && (
                              <span className="text-[10px] font-bold text-slate-500">
                                {tx("Not included", "غير مشمول")}
                              </span>
                            )}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">
                            {tx(
                              scope.descriptionEn,
                              scope.descriptionAr,
                            )}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-sky-400/20 bg-sky-400/5 p-4 text-xs leading-5 text-slate-400">
                {tx(
                  "One Integration Client normally represents one independent external connection. For example, one SAP connection can use one client; separate SAP Finance and SAP Assets credentials can use separate clients when isolation is required.",
                  "عميل التكامل يمثل عادة اتصالًا خارجيًا مستقلًا. مثلًا يمكن لاتصال SAP واحد استخدام عميل واحد، ويمكن إنشاء عميل منفصل لـ SAP Finance وآخر لـ SAP Assets إذا كانت هناك حاجة لعزل الصلاحيات وبيانات الدخول.",
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 p-5">
              <button
                type="button"
                disabled={creatingClient}
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-black text-slate-300 hover:bg-slate-900 disabled:opacity-50"
              >
                {tx("Cancel", "إلغاء")}
              </button>
              <button
                type="button"
                disabled={creatingClient || !newName.trim()}
                onClick={handleCreateClient}
                className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingClient
                  ? tx("Creating...", "جارٍ الإنشاء...")
                  : tx("Create Client", "إنشاء العميل")}
              </button>
            </div>
          </div>
        </div>
      )}

      {secretModal.open && (
        <div className="fixed inset-0 z-[1000002] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-emerald-500/30 bg-slate-950 shadow-2xl">
            <div className="border-b border-slate-800 p-5">
              <Pill tone="emerald">
                {tx("Show once", "يظهر مرة واحدة")}
              </Pill>
              <h2 className="mt-3 text-xl font-black text-white">
                {secretModal.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-amber-200">
                {secretModal.notice}
              </p>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  API Key
                </p>
                <div className="mt-2 rounded-xl border border-slate-700 bg-black/30 p-4">
                  <code className="block break-all select-all text-sm leading-6 text-emerald-300">
                    {secretModal.apiKey}
                  </code>
                </div>
              </div>

              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs leading-5 text-red-200">
                {tx(
                  "Store this key securely in the external system or a secrets manager. Fleet Fuel PRO stores only a hash and cannot display this full key later.",
                  "احفظ المفتاح بشكل آمن في النظام الخارجي أو مدير أسرار. Fleet Fuel PRO يحتفظ فقط ببصمة Hash ولن يستطيع عرض المفتاح الكامل لاحقًا.",
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 p-5">
              <button
                type="button"
                onClick={copySecret}
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-black text-emerald-300 hover:bg-emerald-500/20"
              >
                {secretCopied
                  ? tx("Copied", "تم النسخ")
                  : tx("Copy API Key", "نسخ مفتاح API")}
              </button>
              <button
                type="button"
                onClick={() =>
                  setSecretModal({
                    open: false,
                    apiKey: "",
                    title: "",
                    notice: "",
                  })
                }
                className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-300"
              >
                {tx("I saved the key", "حفظت المفتاح")}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAction.open && selected && (
        <div className="fixed inset-0 z-[1000001] flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
            <div className="p-5">
              <h2 className="text-lg font-black text-white">
                {confirmAction.type === "rotate"
                  ? tx("Rotate API Key?", "تغيير مفتاح API؟")
                  : selected.status === "ACTIVE"
                    ? tx(
                        "Disable Integration Client?",
                        "إيقاف عميل التكامل؟",
                      )
                    : tx(
                        "Enable Integration Client?",
                        "تفعيل عميل التكامل؟",
                      )}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {confirmAction.type === "rotate"
                  ? tx(
                      "The current API key will become invalid immediately. The new full key will be shown only once.",
                      "المفتاح الحالي سيتوقف فورًا، وسيتم عرض المفتاح الجديد كاملًا مرة واحدة فقط.",
                    )
                  : selected.status === "ACTIVE"
                    ? tx(
                        "The external system will no longer be allowed to authenticate with this client once API authentication is enabled.",
                        "لن يُسمح للنظام الخارجي باستخدام هذا العميل بعد تفعيل مصادقة API.",
                      )
                    : tx(
                        "This client will be re-enabled with the same Client ID, scopes, and current API key.",
                        "سيتم إعادة تفعيل العميل بنفس Client ID والصلاحيات ومفتاح API الحالي.",
                      )}
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 p-5">
              <button
                type="button"
                onClick={() =>
                  setConfirmAction({ open: false, type: "" })
                }
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-black text-slate-300 hover:bg-slate-900"
              >
                {tx("Cancel", "إلغاء")}
              </button>
              <button
                type="button"
                onClick={
                  confirmAction.type === "rotate"
                    ? handleRotateKey
                    : handleToggleStatus
                }
                className={`rounded-xl px-4 py-2.5 text-sm font-black ${
                  confirmAction.type === "rotate"
                    ? "bg-amber-400 text-slate-950 hover:bg-amber-300"
                    : selected.status === "ACTIVE"
                      ? "bg-red-500 text-white hover:bg-red-400"
                      : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                }`}
              >
                {confirmAction.type === "rotate"
                  ? tx("Rotate Key", "تغيير المفتاح")
                  : selected.status === "ACTIVE"
                    ? tx("Disable", "إيقاف")
                    : tx("Enable", "تفعيل")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
