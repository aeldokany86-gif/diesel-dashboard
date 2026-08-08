"use client";

import React, { useState } from "react";
import { formatNotificationDate } from "../../lib/notificationHelpers";
import { useLanguage } from "../../context/LanguageContext";
import { resolveI18nMessage, resolveRecordMessage, resolveEnumValue } from "../../lib/i18nMessageHelpers";

function NotificationCenterPage({
  notifications = [],
  currentUser,
  markNotificationRead = () => {},
  markAllNotificationsRead = () => {},
  setPage = () => {},
}) {
  const { language, t } = useLanguage();
  const isRtl = language === "ar";
  const [filter, setFilter] = useState("All");
  const [selectedNotification, setSelectedNotification] = useState(null);

  const counts = {
    all: notifications.length,
    unread: notifications.filter((item) => !item.read).length,
    approvals: notifications.filter((item) => item.type === "approval").length,
    high: notifications.filter((item) => item.priority === "High").length,
  };

  const filteredNotifications = notifications.filter((item) => {
    if (filter === "Unread") return !item.read;
    if (filter === "Approvals") return item.type === "approval";
    if (filter === "High Priority") return item.priority === "High";
    return true;
  });

  const openNotification = (item) => {
    markNotificationRead(item.id);
    setSelectedNotification(item);
  };

  const goToSource = (item) => {
    markNotificationRead(item.id);
    if (item.route === "approvals" && ["Admin", "Manager"].includes(currentUser?.role)) {
      setPage("approvals");
      return;
    }
    if (["operations", "assets", "stations", "team", "projects", "reports"].includes(item.route)) {
      setPage(item.route);
    }
  };

  const resolveNestedMessageParams = (params = {}) =>
    Object.fromEntries(
      Object.entries(params || {}).map(([key, value]) => {
        if (
          value &&
          typeof value === "object" &&
          !Array.isArray(value) &&
          ("key" in value || "messageKey" in value || "titleKey" in value)
        ) {
          return [key, resolveI18nMessage(t, value, value?.fallback || "")];
        }

        return [key, value];
      }),
    );

  const getNotificationTitle = (item) => {
    const titleParams = resolveNestedMessageParams(item?.titleParams || {});

    return resolveI18nMessage(
      t,
      {
        key: item?.titleKey || "",
        params: titleParams,
        enumParams: item?.titleEnumParams || {},
        fallback: item?.titleFallback || item?.title || "",
      },
      item?.title || "",
    );
  };

  const getNotificationMessage = (item) =>
    resolveRecordMessage(t, item, "message", item?.message || "");

  const getNotificationCategory = (item) =>
    resolveRecordMessage(t, item, "category", item?.category || "");

  const getNotificationModule = (item) =>
    resolveRecordMessage(t, item, "module", item?.module || "");

  const getNotificationStatus = (item) =>
    resolveRecordMessage(t, item, "status", item?.status || "");

  const getFilterLabel = (value) => {
    const map = {
      All: "notifications.filters.all",
      Unread: "notifications.filters.unread",
      Approvals: "notifications.filters.approvals",
      "High Priority": "notifications.filters.highPriority",
    };
    return t(map[value] || "notifications.filters.all");
  };

  const getPriorityLabel = (priority) =>
    resolveEnumValue(t, "priority", priority, priority || "-");


  const getDetailLabel = (detail) => {
    if (!detail) return "";
    if (detail.labelKey) {
      const translated = t(detail.labelKey);
      if (translated && translated !== detail.labelKey) return translated;
    }
    return detail.labelFallback || "";
  };

  const getDetailValue = (detail) => {
    if (!detail) return "-";

    if (detail.valueKey) {
      const translated = t(detail.valueKey, detail.valueParams || {});
      if (translated && translated !== detail.valueKey) return translated;
    }

    return detail.valueFallback || detail.value || "-";
  };

  const getPriorityClass = (priority) => {
    if (priority === "High") return "bg-red-500/15 text-red-300 border-red-500/30";
    if (priority === "Medium") return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
    return "bg-slate-800 text-slate-300 border-slate-700";
  };

  return (
    <div className={`bg-transparent min-h-screen text-slate-100 overflow-y-auto h-screen scroll-smooth [scrollbar-color:#334155_transparent] ${isRtl ? "text-right" : "text-left"}`} dir={isRtl ? "rtl" : "ltr"}>
      <div className="w-full max-w-[1920px] mx-auto px-2 sm:px-3 lg:px-4 xl:px-5 2xl:px-8 py-4 text-[12px] lg:text-[13px]">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-100">{t("notifications.title")}</h1>
            <p className="text-slate-400 text-sm">{t("notifications.subtitle")}</p>
          </div>

          <button
            onClick={markAllNotificationsRead}
            disabled={counts.unread === 0}
            className={`px-4 py-2.5 rounded-xl font-bold border transition ${
              counts.unread === 0
                ? "bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed"
                : "bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/15"
            }`}
          >
            {t("notifications.actions.markAllRead")}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
          {[
            { label: t("notifications.cards.total"), value: counts.all },
            { label: t("notifications.cards.unread"), value: counts.unread },
            { label: t("notifications.cards.approvalUpdates"), value: counts.approvals },
            { label: t("notifications.cards.highPriority"), value: counts.high },
          ].map((card) => (
            <div key={card.label} className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
              <p className="text-2xl font-black text-amber-300 mt-2">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {["All", "Unread", "Approvals", "High Priority"].map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${
                filter === item
                  ? "bg-amber-400 text-slate-950 border-amber-300"
                  : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800"
              }`}
            >
              {getFilterLabel(item)}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center text-slate-400">
              {t("notifications.empty")}
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                className={`bg-slate-900/80 border rounded-2xl p-4 shadow-xl transition ${
                  item.read ? "border-slate-800/80 opacity-80" : "border-amber-400/50 shadow-amber-500/10"
                }`}
              >
                <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
                  <button onClick={() => openNotification(item)} className={`flex-1 ${isRtl ? "text-right" : "text-left"}`}>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {!item.read && <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />}
                      <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.14em] bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        {getNotificationCategory(item)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black border ${getPriorityClass(item.priority)}`}>
                        {getPriorityLabel(item.priority)}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{getNotificationModule(item)}</span>
                    </div>

                    <h2 className="text-base sm:text-lg font-black text-slate-100 break-words">{getNotificationTitle(item)}</h2>
                    <p className="text-sm text-slate-400 mt-1 break-words">{getNotificationMessage(item)}</p>
                    <p className="text-xs text-slate-500 mt-2">{formatNotificationDate(item.createdAt, language)}</p>
                  </button>

                  <div className="w-full xl:w-[190px] flex xl:flex-col gap-2">
                    <button
                      onClick={() => openNotification(item)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-100 px-3 py-2 rounded-xl font-bold border border-slate-700"
                    >
                      {t("common.view")}
                    </button>
                    {item.actionable && (
                      <button
                        onClick={() => goToSource(item)}
                        className="flex-1 bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-2 rounded-xl font-black"
                      >
                        {t("notifications.actions.openApproval")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedNotification && (
        <div className="fleet-modal-backdrop fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300 mb-2">{getNotificationCategory(selectedNotification)}</p>
                <h2 className="text-xl font-black text-slate-100">{getNotificationTitle(selectedNotification)}</h2>
                <p className="text-sm text-slate-400 mt-1">{formatNotificationDate(selectedNotification.createdAt, language)}</p>
              </div>
              <button
                onClick={() => setSelectedNotification(null)}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl px-4 py-2 font-bold"
              >
                {t("common.close")}
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 mb-2">{t("notifications.modal.message")}</p>
                <p className="text-slate-100 text-sm leading-6">{getNotificationMessage(selectedNotification)}</p>
              </div>

              {selectedNotification.actionable && (
                <button
                  onClick={() => goToSource(selectedNotification)}
                  className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 px-5 py-3 rounded-xl font-black"
                >
                  {t("notifications.actions.openRelatedApproval")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationCenterPage;
