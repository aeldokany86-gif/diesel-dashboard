import { normalizeScopeValue } from "./helpers";

export const SAUDI_PROJECT_LOCATIONS = [
  "Riyadh Region",
  "Makkah Region",
  "Madinah Region",
  "Eastern Province",
  "Qassim Region",
  "Asir Region",
  "Tabuk Region",
  "Hail Region",
  "Northern Borders Region",
  "Jazan Region",
  "Najran Region",
  "Al Bahah Region",
  "Al Jouf Region",
];

export const EGYPT_PROJECT_LOCATIONS = [
  "Cairo Governorate",
  "Giza Governorate",
  "Alexandria Governorate",
  "Qalyubia Governorate",
  "Port Said Governorate",
  "Suez Governorate",
  "Dakahlia Governorate",
  "Sharqia Governorate",
  "Gharbia Governorate",
  "Monufia Governorate",
  "Beheira Governorate",
  "Kafr El Sheikh Governorate",
  "Damietta Governorate",
  "Ismailia Governorate",
  "Fayoum Governorate",
  "Beni Suef Governorate",
  "Minya Governorate",
  "Assiut Governorate",
  "Sohag Governorate",
  "Qena Governorate",
  "Luxor Governorate",
  "Aswan Governorate",
  "Red Sea Governorate",
  "New Valley Governorate",
  "Matrouh Governorate",
  "North Sinai Governorate",
  "South Sinai Governorate",
];

export const UAE_PROJECT_LOCATIONS = [
  "Abu Dhabi Emirate",
  "Dubai Emirate",
  "Sharjah Emirate",
  "Ajman Emirate",
  "Umm Al Quwain Emirate",
  "Ras Al Khaimah Emirate",
  "Fujairah Emirate",
];

export function normalizeCountryName(country) {
  return String(country || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
}

export function getProjectLocationOptionsByCountry(country) {
  const normalizedCountry = normalizeCountryName(country);

  if (
    normalizedCountry === "saudi arabia" ||
    normalizedCountry === "kingdom of saudi arabia" ||
    normalizedCountry === "ksa"
  ) {
    return SAUDI_PROJECT_LOCATIONS;
  }

  if (
    normalizedCountry === "egypt" ||
    normalizedCountry === "arab republic of egypt"
  ) {
    return EGYPT_PROJECT_LOCATIONS;
  }

  if (
    normalizedCountry === "united arab emirates" ||
    normalizedCountry === "uae"
  ) {
    return UAE_PROJECT_LOCATIONS;
  }

  return [];
}

export const PLATFORM_CONTEXT_ID = "PLATFORM";
export const PLATFORM_REAL_COMPANY_ID = "cmph898d701k6cm1g9sjttcoe";
export const PLATFORM_CONTEXT_CODE = "PLATFORM";
export const PLATFORM_CONTEXT_NAME = "Platform Console";

export const PLATFORM_COMPANY_OPTION = {
  id: PLATFORM_CONTEXT_ID,
  code: PLATFORM_CONTEXT_CODE,
  name: PLATFORM_CONTEXT_NAME,
  country: "",
  currency: "SAR",
  timezone: "Asia/Riyadh",
  language: "EN-AR",
  status: "Active",
  dataImportEnabled: false,
  isPlatformContext: true,
};

export function isPlatformContextValue(value) {
  const normalized = normalizeScopeValue(value);
  return (
    normalized === "platform" ||
    normalized === "platform console" ||
    normalized === normalizeScopeValue(PLATFORM_REAL_COMPANY_ID)
  );
}

export function isPlatformCompany(company) {
  if (!company) return false;

  return (
    Boolean(company.isPlatformContext) ||
    isPlatformContextValue(company.id) ||
    isPlatformContextValue(company.code) ||
    isPlatformContextValue(company.name)
  );
}

export function getPlatformCompany(companies = []) {
  return companies.find((company) => isPlatformCompany(company)) || null;
}

export function getPlatformCompanyId(companies = []) {
  return getPlatformCompany(companies)?.id || PLATFORM_CONTEXT_ID;
}

export function mergePlatformConsoleWithCompanies(companies = []) {
  const map = new Map();
  let hasRealPlatformCompany = false;

  companies.forEach((company) => {
    if (!company?.id) return;

    const key = normalizeScopeValue(company.id);

    if (isPlatformCompany(company)) {
      hasRealPlatformCompany = true;
      map.set(key, {
        ...company,
        code: company.code || PLATFORM_CONTEXT_CODE,
        name: company.name || PLATFORM_CONTEXT_NAME,
        isPlatformContext: true,
      });
      return;
    }

    map.set(key, company);
  });

  if (!hasRealPlatformCompany) {
    map.set(normalizeScopeValue(PLATFORM_COMPANY_OPTION.id), PLATFORM_COMPANY_OPTION);
  }

  return Array.from(map.values());
}


export function normalizeCompanyForState(company = {}) {
  const isActive =
    company.isActive === false ||
    normalizeScopeValue(company.status) === "inactive" ||
    normalizeScopeValue(company.status) === "disabled"
      ? false
      : true;

  return {
    id: company.id,
    name: company.name || company.id || "",
    code: company.code || "",
    country: company.country || "",
    city: company.city || "",
    currency: company.currency || "SAR",
    timezone: company.timezone || "Asia/Riyadh",
    language: company.language || "EN-AR",
    subscriptionPlan: company.subscriptionPlan || "trial",
    status: isActive ? "Active" : "Inactive",
    isActive,
    dataImportEnabled: Boolean(company.dataImportEnabled),
    isPlatformContext: Boolean(company.isPlatformContext) || isPlatformCompany(company),
    createdAt: company.createdAt || "",
    updatedAt: company.updatedAt || "",
  };
}

export const COUNTRY_SETTINGS_OPTIONS = [
  { country: "Saudi Arabia", currency: "SAR", timezone: "Asia/Riyadh" },
  { country: "United Arab Emirates", currency: "AED", timezone: "Asia/Dubai" },
  { country: "Qatar", currency: "QAR", timezone: "Asia/Qatar" },
  { country: "Kuwait", currency: "KWD", timezone: "Asia/Kuwait" },
  { country: "Bahrain", currency: "BHD", timezone: "Asia/Bahrain" },
  { country: "Oman", currency: "OMR", timezone: "Asia/Muscat" },
  { country: "Egypt", currency: "EGP", timezone: "Africa/Cairo" },
  { country: "Jordan", currency: "JOD", timezone: "Asia/Amman" },
  { country: "India", currency: "INR", timezone: "Asia/Kolkata" },
  { country: "Pakistan", currency: "PKR", timezone: "Asia/Karachi" },
  { country: "Turkey", currency: "TRY", timezone: "Europe/Istanbul" },
  { country: "United States", currency: "USD", timezone: "America/New_York" },
  { country: "United Kingdom", currency: "GBP", timezone: "Europe/London" },
  { country: "Germany", currency: "EUR", timezone: "Europe/Berlin" },
  { country: "France", currency: "EUR", timezone: "Europe/Paris" },
];

export function getCompanyCountrySettings(country) {
  return (
    COUNTRY_SETTINGS_OPTIONS.find((item) => item.country === country) ||
    COUNTRY_SETTINGS_OPTIONS[0]
  );
}

export function getCurrencyByCountry(country) {
  return getCompanyCountrySettings(country)?.currency || "USD";
}

export function getTimezoneByCountry(country) {
  return getCompanyCountrySettings(country)?.timezone || "Asia/Riyadh";
}

export function getCurrencyOptionsForCountry(country) {
  const countryCurrency = getCurrencyByCountry(country);

  return countryCurrency === "USD" ? ["USD"] : [countryCurrency, "USD"];
}

export function normalizeCurrencyForCountry(country, currency) {
  const allowedCurrencies = getCurrencyOptionsForCountry(country);
  return allowedCurrencies.includes(currency) ? currency : allowedCurrencies[0];
}

export function uniqueUsersById(users = []) {
  const map = new Map();

  users.forEach((user) => {
    if (!user?.id) return;
    map.set(normalizeScopeValue(user.id), user);
  });

  return Array.from(map.values());
}
export function isPlatformAdminUser(user) {
  return user?.role === "PlatformAdmin";
}

export function getItemCompanyId(item) {
  return item?.companyId || item?.company_id || item?.company || "";
}

export function companyMatches(itemCompanyId, companyId) {
  return normalizeScopeValue(itemCompanyId) === normalizeScopeValue(companyId);
}

export function makeTenantEntityKey(item, fallbackId = "") {
  const entityId = item?.id || fallbackId || "NO-ID";
  const companyId = getItemCompanyId(item) || item?.companyId || item?.company_id || "GLOBAL";
  return `${normalizeScopeValue(companyId) || "global"}::${normalizeScopeValue(entityId) || "no-id"}`;
}

export function tenantEntityMatches(item, id, companyId = "") {
  if (!item) return false;
  const sameId = normalizeScopeValue(item.id) === normalizeScopeValue(id);
  if (!sameId) return false;
  if (!companyId) return true;
  return companyMatches(getItemCompanyId(item), companyId);
}

export function isDuplicateEntityIdWithinCompany(items = [], id, companyId, excludeKey = "") {
  const nextKey = `${normalizeScopeValue(companyId)}::${normalizeScopeValue(id)}`;
  return items.some((item) => {
    const itemKey = makeTenantEntityKey(item);
    return itemKey === nextKey && itemKey !== excludeKey;
  });
}

export function filterDuplicateTenantEntities(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = makeTenantEntityKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function filterByCompany(items = [], companyId, user) {
  if (isPlatformAdminUser(user) && isPlatformContextValue(companyId)) return items;
  if (!companyId || isPlatformContextValue(companyId)) return [];
  return items.filter((item) => companyMatches(getItemCompanyId(item), companyId));
}

export function getCompanyIdFromProjectValue(projectValue, projects = []) {
  if (!projectValue) return "";
  const matchedProject = projects.find((project) =>
    normalizeScopeValue(project.id) === normalizeScopeValue(projectValue) ||
    normalizeScopeValue(project.name) === normalizeScopeValue(projectValue)
  );
  return matchedProject?.companyId || "";
}

export function getItemCompanyIdWithProjectFallback(item, projects = [], projectKey = "project") {
  return getItemCompanyId(item) || getCompanyIdFromProjectValue(item?.[projectKey], projects);
}

export function filterByCompanyWithProjectFallback(items = [], companyId, user, projects = [], projectKey = "project") {
  if (isPlatformAdminUser(user) && isPlatformContextValue(companyId)) return items;
  if (!companyId || isPlatformContextValue(companyId)) return [];
  return items.filter((item) =>
    companyMatches(getItemCompanyIdWithProjectFallback(item, projects, projectKey), companyId)
  );
}

export function buildCompaniesFromSources({ companies = [], users = [], fuelers = [], projects = [], assets = [], stations = [] }) {
  const map = new Map();

  companies.forEach((company) => {
    if (!company?.id) return;
    map.set(company.id, company);
  });

  [...users, ...fuelers, ...projects, ...assets, ...stations].forEach((item) => {
    const companyId = getItemCompanyId(item);
    if (!companyId || normalizeScopeValue(companyId) === "platform") return;
    if (!map.has(companyId)) {
      map.set(companyId, {
        id: companyId,
        name: companyId,
        country: "",
        currency: "SAR",
        timezone: "Asia/Riyadh",
        language: "EN-AR",
        status: "Active",
      });
    }
  });

  return mergePlatformConsoleWithCompanies(Array.from(map.values()));
}

