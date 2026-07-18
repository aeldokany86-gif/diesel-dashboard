"use client";

import { useCallback, useState } from "react";

import { mapBackendOperationForState } from "../../../lib/helpers";
import { fetchOperations } from "../../../services/operationsService";

function getOperationErrorMessage(error) {
  const backendMessage =
    error?.response?.data?.message || error?.response?.data?.error;

  if (Array.isArray(backendMessage)) {
    return backendMessage.join(" / ");
  }

  if (backendMessage) {
    return String(backendMessage);
  }

  return error?.message || "Failed to load operations.";
}

export default function useOperationsData({
  currentUser,
  setData,
} = {}) {
  const [operationsLoading, setOperationsLoading] = useState(false);
  const [operationsError, setOperationsError] = useState("");
  const [operationsLoaded, setOperationsLoaded] = useState(false);

  const refreshOperations = useCallback(
    async ({ silent = false } = {}) => {
      if (!currentUser?.id) {
        setOperationsLoaded(false);
        return [];
      }

      if (!silent) {
        setOperationsLoading(true);
      }

      setOperationsError("");

      try {
        const backendOperations = await fetchOperations(currentUser);

        const completedOperations = backendOperations
          .filter(
            (operation) =>
              String(operation?.status || "").toUpperCase() === "COMPLETED"
          )
          .map(mapBackendOperationForState);

        if (typeof setData === "function") {
          setData(completedOperations);
        }

        setOperationsLoaded(true);
        return completedOperations;
      } catch (error) {
        const message = getOperationErrorMessage(error);
        setOperationsError(message);

        console.warn(
          "Operations list could not be refreshed.",
          error
        );

        return [];
      } finally {
        if (!silent) {
          setOperationsLoading(false);
        }
      }
    },
    [currentUser, setData]
  );

  return {
    refreshOperations,
    operationsLoading,
    operationsError,
    operationsLoaded,
  };
}