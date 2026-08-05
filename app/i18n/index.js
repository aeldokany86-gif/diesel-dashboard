import en from "./translations/en";
import ar from "./translations/ar";

const DEFAULT_LANGUAGE = "en";

const dictionaries = {
  en,
  ar,
};

function getNestedValue(source, path) {
  return String(path || "")
    .split(".")
    .filter(Boolean)
    .reduce((value, segment) => value?.[segment], source);
}

function interpolate(template, variables = {}) {
  return String(template).replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (_, key) => {
    const value = variables[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function translate(language, key, variables = {}) {
  const selectedDictionary = dictionaries[language] || dictionaries[DEFAULT_LANGUAGE];
  const translatedValue = getNestedValue(selectedDictionary, key);
  const fallbackValue = getNestedValue(dictionaries[DEFAULT_LANGUAGE], key);
  const finalValue = translatedValue ?? fallbackValue ?? key;

  return interpolate(finalValue, variables);
}

export { dictionaries, DEFAULT_LANGUAGE };
