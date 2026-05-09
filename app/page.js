"use client";
 
import { useEffect, useRef, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"; 
const TRANSACTIONS_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRX0JNF_J9UzMQ5lyr7pxPrdL0GeLD8TkCf4MPNGdyOPT9rATlsmUnBQjx0MVoNy4nPHiRKc7jtmeku/pub?gid=836310880&single=true&output=csv";
 
const ASSETS_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRX0JNF_J9UzMQ5lyr7pxPrdL0GeLD8TkCf4MPNGdyOPT9rATlsmUnBQjx0MVoNy4nPHiRKc7jtmeku/pub?gid=477887446&single=true&output=csv";
 
const STATIONS_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRX0JNF_J9UzMQ5lyr7pxPrdL0GeLD8TkCf4MPNGdyOPT9rATlsmUnBQjx0MVoNy4nPHiRKc7jtmeku/pub?gid=123801173&single=true&output=csv";
 
const FUELERS_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRX0JNF_J9UzMQ5lyr7pxPrdL0GeLD8TkCf4MPNGdyOPT9rATlsmUnBQjx0MVoNy4nPHiRKc7jtmeku/pub?gid=1883723917&single=true&output=csv";
 
const PROJECTS_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRX0JNF_J9UzMQ5lyr7pxPrdL0GeLD8TkCf4MPNGdyOPT9rATlsmUnBQjx0MVoNy4nPHiRKc7jtmeku/pub?gid=2050998594&single=true&output=csv";

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
 
export default function Home() {
  const [page, setPage] = useState("operations");
 
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
 
  const [assets, setAssets] = useState([]);
  const [stations, setStations] = useState([]);
  const [fuelers, setFuelers] = useState([]);
  const [projects, setProjects] = useState([]);
 
  useEffect(() => {
    async function fetchData() {
      // TRANSACTIONS
      const trxRes = await fetch(TRANSACTIONS_CSV);
      const trxText = await trxRes.text();
      const trxRows = trxText.split("\n").map((row) => row.split(","));
 
      setHeaders(trxRows[0]);
      setData(trxRows.slice(1));
 
      // ASSETS
      const assetsRes = await fetch(ASSETS_CSV);
      const assetsText = await assetsRes.text();
      const assetRows = assetsText.split("\n").map((row) => row.split(","));
      const assetHeaders = assetRows[0];
 
      const mappedAssets = assetRows
        .slice(1)
        .map((row) => ({
          id: getValue(row, assetHeaders, ["asset_id", "id"]),
          type: getValue(row, assetHeaders, ["asset_type", "type"]),
          category: getValue(row, assetHeaders, ["asset_category", "category"]),
          odometer: getValue(row, assetHeaders, [
            "current_odometer",
            "odometer",
          ]),
          fuelTank: getValue(row, assetHeaders, [
            "fuel_tank_capacity",
            "tank_capacity",
          ]),
          project: getValue(row, assetHeaders, [
            "project_id",
            "project",
            "project_name",
          ]),
          status: getValue(row, assetHeaders, ["status"]),
        }))
        .filter((asset) => asset.id);
 
      setAssets(mappedAssets);
 
      // STATIONS
      const stationsRes = await fetch(STATIONS_CSV);
      const stationsText = await stationsRes.text();
 
      const stationRows = stationsText
        .split("\n")
        .map((row) => row.split(","));
 
      const stationHeaders = stationRows[0];
 
      const mappedStations = stationRows
        .slice(1)
        .map((row) => ({
          id: getValue(row, stationHeaders, ["station_id"]),
          type: getValue(row, stationHeaders, ["station_type"]),
          capacity: parseFloat(
            getValue(row, stationHeaders, ["station_capacity"])
          ),
          project: getValue(row, stationHeaders, ["project_id"]),
          status: getValue(row, stationHeaders, ["status"]),
          openingBalance: parseFloat(
            getValue(row, stationHeaders, ["opening_balance"])
          ),
        }))
        .filter((station) => station.id);
 
      setStations(mappedStations);
	// FUELERS
const fuelersRes = await fetch(FUELERS_CSV);
const fuelersText = await fuelersRes.text();
 
const fuelerRows = fuelersText
  .split("\n")
  .map((row) => row.split(","));
 
const fuelerHeaders = fuelerRows[0];
 
const mappedFuelers = fuelerRows
  .slice(1)
  .map((row) => ({
    id: getValue(row, fuelerHeaders, ["fueler_id", "id"]),
    name: getValue(row, fuelerHeaders, ["fueler_name", "name"]),
    mobile: getValue(row, fuelerHeaders, ["mobile", "phone", "mobile_no"]),
    projectName: getValue(row, fuelerHeaders, [
      "project_name",
      "project",
      "project name",
    ]),
    status: getValue(row, fuelerHeaders, ["status"]) || "On Duty",
  }))
  .filter((fueler) => fueler.id);
 
setFuelers(mappedFuelers);
 
// PROJECTS
const projectsRes = await fetch(PROJECTS_CSV);
const projectsText = await projectsRes.text();
 
const projectRows = projectsText
  .split("\n")
  .map((row) => row.split(","));
 
const projectHeaders = projectRows[0];
 
const mappedProjects = projectRows
  .slice(1)
  .map((row) => ({
    id: getValue(row, projectHeaders, ["project_id", "id"]),
    name: getValue(row, projectHeaders, ["project_name", "name"]),
    status: getValue(row, projectHeaders, ["status"]),
  }))
  .filter((project) => project.id);
 
setProjects(mappedProjects);
    }
 
    fetchData();
  }, []);
 
  const [priceHistory, setPriceHistory] = useState([
    {
      price: 2.33,
      effectiveFrom: "2000-01-01T00:00",
      createdBy: "System",
      createdAt: "2000-01-01T00:00:00.000Z",
    },
  ]);

  const currency = "SAR";

  const getLiterPriceByDate = (transactionDate) => {
    const date = transactionDate ? new Date(transactionDate) : new Date();

    if (Number.isNaN(date.getTime())) {
      return priceHistory[priceHistory.length - 1]?.price || 2.33;
    }

    const validPrices = priceHistory
      .filter((item) => new Date(item.effectiveFrom) <= date)
      .sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom));

    return validPrices[0]?.price || 2.33;
  };

  const literPrice = getLiterPriceByDate(new Date().toISOString());
 
  const renderPage = () => {
    if (page === "operations") {
      return (
        <OperationsPage
          data={data}
          headers={headers}
          assets={assets}
          stations={stations}
          fuelers={fuelers}
          literPrice={literPrice}
          getLiterPriceByDate={getLiterPriceByDate}
          currency={currency}
        />
      );
    }
 
    if (page === "assets") {
      return (
        <AssetsPage
          assets={assets}
          projects={projects}
          showToast={showToast}
          data={data}
          headers={headers}
        />
      );
    }
 
    if (page === "stations") {
      return (
      <StationsPage
  stations={stations}
  data={data}
  headers={headers}
  showToast={showToast}
  literPrice={literPrice}
  priceHistory={priceHistory}
  setPriceHistory={setPriceHistory}
  getLiterPriceByDate={getLiterPriceByDate}
  currency={currency}
/>
      );
    }
    if (page === "fuelers") {
  return (
    <FuelersPage
      fuelers={fuelers}
      projects={projects}
      data={data}
      headers={headers}
      showToast={showToast}
      currency={currency}
      getLiterPriceByDate={getLiterPriceByDate}
    />
  );
}
 
if (page === "projects") {
  return <ProjectsPage projects={projects} />;
}
     return (
      <div className="bg-gray-900 min-h-screen text-white p-6">
        <h2 className="text-2xl font-bold">{page} Page</h2>
      </div>
    );
  };
 const [toast, setToast] = useState(null);

const showToast = (type, message) => {
  setToast({ type, message });

  setTimeout(() => {
    setToast(null);
  }, 3000);
};
  return (
    <div className="min-h-screen bg-gray-900 flex overflow-hidden">
      <div className="w-64 bg-gray-950 text-white shadow p-4">
        <h1 className="text-2xl font-bold mb-6 text-yellow-400">
          Diesel System
        </h1>
 
        <ul className="space-y-3">
          <li>
            <button onClick={() => setPage("operations")}>
              Operations
            </button>
          </li>
 
          <li>
            <button onClick={() => setPage("assets")}>
              Assets
            </button>
          </li>
 
          <li>
            <button onClick={() => setPage("stations")}>
              Stations
            </button>
          </li>
 
          <li>
            <button onClick={() => setPage("fuelers")}>
              Fuelers
            </button>
          </li>
 
          <li>
            <button onClick={() => setPage("projects")}>
              Projects / Sites
            </button>
          </li>
 
          <li>
            <button onClick={() => setPage("reports")}>
              Reports
            </button>
          </li>
        </ul>
      </div>
 
      <div className="flex-1 min-w-0 overflow-hidden">
        {renderPage()}
	{toast && <Toast type={toast.type} message={toast.message} />}
      </div>
    </div>
  );
}
 
// IMPORTANT:
// Add these components to your Recharts import in app/page.js:
// BarChart, Bar, PieChart, Pie, Cell, Legend

function OperationsPage({
  data,
  headers,
  assets,
  stations,
  fuelers,
  literPrice = 2.33,
  getLiterPriceByDate,
  currency = "SAR",
}) {
  const [showForm, setShowForm] = useState(false);
  const [transactionType, setTransactionType] = useState("");
  const [stationMeterPhoto, setStationMeterPhoto] = useState(null);
  const [assetPhoto, setAssetPhoto] = useState(null);
  const [assetMeterPhoto, setAssetMeterPhoto] = useState(null);

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);

  const [startMonth, setStartMonth] = useState(new Date().getMonth());
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState(new Date().getMonth());
  const [endYear, setEndYear] = useState(new Date().getFullYear());

  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [selectedEquipmentType, setSelectedEquipmentType] = useState([]);
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [equipmentTypeSearch, setEquipmentTypeSearch] = useState("");
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false);
  const [showEquipmentTypeDropdown, setShowEquipmentTypeDropdown] = useState(false);

  // Table export menus
  const [showEquipmentSummarySettings, setShowEquipmentSummarySettings] =
    useState(false);
  const [showEquipmentTypeSettings, setShowEquipmentTypeSettings] =
    useState(false);
  const [showDailyConsumptionSettings, setShowDailyConsumptionSettings] =
    useState(false);

  const dateFilterRef = useRef(null);
  const equipmentDropdownRef = useRef(null);
  const equipmentTypeDropdownRef = useRef(null);
  const equipmentSummarySettingsRef = useRef(null);
  const equipmentTypeSettingsRef = useRef(null);
  const dailyConsumptionSettingsRef = useRef(null);

  useOutsideClick(dateFilterRef, () => setShowDateFilter(false));
  useOutsideClick(equipmentDropdownRef, () => setShowEquipmentDropdown(false));
  useOutsideClick(equipmentTypeDropdownRef, () =>
    setShowEquipmentTypeDropdown(false)
  );
  useOutsideClick(equipmentSummarySettingsRef, () =>
    setShowEquipmentSummarySettings(false)
  );
  useOutsideClick(equipmentTypeSettingsRef, () =>
    setShowEquipmentTypeSettings(false)
  );
  useOutsideClick(dailyConsumptionSettingsRef, () =>
    setShowDailyConsumptionSettings(false)
  );

  // Operation review / edit
  const [selectedEquipmentHistory, setSelectedEquipmentHistory] = useState(null);
  const [editedRows, setEditedRows] = useState({});
  const [auditLog, setAuditLog] = useState([]);
  const [editCell, setEditCell] = useState(null);

  const currentUser = {
    name: "Amr",
    role: "Admin",
  };

  const dieselIndex = getHeaderIndex(headers, [
    "diesel_quantity",
    "Diesel quantity",
    "diesel quantity",
    "quantity",
    "qty",
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
  const odometerIndex = getHeaderIndex(headers, [
    "odometer_at_fueling",
    "Odometer at fueling",
    "odometer at fueling",
    "odometer",
  ]);
  const dateIndex = getHeaderIndex(headers, [
    "transaction_datetime",
    "Transaction datetime",
    "transaction datetime",
    "date",
  ]);

  const fuelerIndex = getHeaderIndex(headers, [
    "fueler_id",
    "Fueler ID",
    "fueler id",
    "fueler",
  ]);

  const operationIdIndex = getHeaderIndex(headers, [
    "operation_id",
    "Operation ID",
    "operation id",
    "transaction_id",
    "Transaction ID",
    "transaction id",
    "id",
  ]);

  const getAsset = (assetId) => assets.find((a) => a.id === assetId);
  const getStation = (stationId) => stations.find((s) => s.id === stationId);
  const getFueler = (fuelerId) => fuelers.find((f) => f.id === fuelerId);

  const destinationOptions =
    transactionType === "Direct_Refuel"
      ? assets.map((a) => a.id)
      : transactionType === "Internal_Transfer"
      ? stations.map((s) => s.id)
      : transactionType === "External_Supply"
      ? stations.map((s) => s.id)
      : [];

  const closeForm = () => {
    setShowForm(false);
    setTransactionType("");
    setStationMeterPhoto(null);
    setAssetPhoto(null);
    setAssetMeterPhoto(null);
  };

  const exportRowsToCSV = (fileName, csvHeaders, csvRows) => {
    const csvContent = [csvHeaders, ...csvRows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];

    link.href = url;
    link.download = `${fileName}_${today}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const printTable = (tableId, title = "Table Report") => {
    const tableElement = document.getElementById(tableId);

    if (!tableElement) return;

    const printWindow = window.open("", "", "width=1400,height=900");

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>

          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 25px;
              color: #111;
            }

            h2 {
              margin-bottom: 20px;
              font-size: 22px;
            }

            .report-meta {
              margin-bottom: 18px;
              font-size: 12px;
              color: #555;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
            }

            th, td {
              border: 1px solid #ccc;
              padding: 8px 10px;
              text-align: left;
            }

            th {
              background: #f3f4f6;
              font-weight: bold;
            }

            tr:nth-child(even) {
              background: #fafafa;
            }

            @media print {
              body {
                padding: 15px;
              }
            }
          </style>
        </head>

        <body>
          <h2>${title}</h2>
          <div class="report-meta">
            Generated at: ${new Date().toLocaleString()}
          </div>

          ${tableElement.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const exportEquipmentSummaryCSV = () => {
    exportRowsToCSV(
      "equipment_consumption_summary",
      [
        "#",
        "Equipment No.",
        "Project",
        "Equipment Type",
        "Last Odometer",
        "Fuel Consumption",
        "Total Cost",
        "Distance",
        "Efficiency",
      ],
      equipmentSummary.map((item, i) => [
        i + 1,
        item.equipmentNo,
        item.project,
        item.equipmentType,
        item.lastOdometer,
        item.fuelConsumption,
        item.totalCost,
        item.distance,
        item.efficiency,
      ])
    );

    setShowEquipmentSummarySettings(false);
  };

  const exportEquipmentTypeSummaryCSV = () => {
    exportRowsToCSV(
      "consumption_by_equipment_type",
      ["#", "Equipment Type", "Qty Liters", "Total Cost"],
      equipmentTypeConsumptionSummary.map((item, i) => [
        i + 1,
        item.equipmentType,
        item.qtyLiters,
        item.totalCost,
      ])
    );

    setShowEquipmentTypeSettings(false);
  };

  const exportDailyConsumptionCSV = () => {
    exportRowsToCSV(
      "daily_consumption",
      ["#", "Date", "Qty Liters", "Total Cost"],
      dailyConsumptionSummary.map((item, i) => [
        i + 1,
        item.dateKey,
        item.qtyLiters,
        item.totalCost,
      ])
    );

    setShowDailyConsumptionSettings(false);
  };

  const formatDateKey = (year, monthIndex, day) => {
    const month = String(monthIndex + 1).padStart(2, "0");
    const date = String(day).padStart(2, "0");
    return `${year}-${month}-${date}`;
  };

  const parseOperationDate = (rawDate) => {
    if (!rawDate) return null;
    const d = new Date(rawDate);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  };

  const formatDisplayDate = (rawDate) => {
    const d = parseOperationDate(rawDate);
    if (!d) return rawDate || "-";

    return d.toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMonthName = (monthIndex) => {
    return new Date(2026, monthIndex, 1).toLocaleString("en-US", {
      month: "short",
    }).toUpperCase();
  };

  const getDaysInMonth = (year, monthIndex) => {
    return new Date(year, monthIndex + 1, 0).getDate();
  };

  const moveMonth = (calendar, direction) => {
    if (calendar === "start") {
      let newMonth = startMonth + direction;
      let newYear = startYear;

      if (newMonth < 0) {
        newMonth = 11;
        newYear -= 1;
      }

      if (newMonth > 11) {
        newMonth = 0;
        newYear += 1;
      }

      setStartMonth(newMonth);
      setStartYear(newYear);
    }

    if (calendar === "end") {
      let newMonth = endMonth + direction;
      let newYear = endYear;

      if (newMonth < 0) {
        newMonth = 11;
        newYear -= 1;
      }

      if (newMonth > 11) {
        newMonth = 0;
        newYear += 1;
      }

      setEndMonth(newMonth);
      setEndYear(newYear);
    }
  };

  const renderCalendarDays = (year, monthIndex, selectedDate, onSelect) => {
    const days = getDaysInMonth(year, monthIndex);
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const blanks = Array.from({ length: firstDay }, (_, i) => i);

    return (
      <div className="grid grid-cols-7 gap-1 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
          <div key={i} className="text-[11px] text-gray-400 py-1">
            {day}
          </div>
        ))}

        {blanks.map((blank) => (
          <div key={`blank-${blank}`} />
        ))}

        {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
          const dateKey = formatDateKey(year, monthIndex, day);
          const isSelected = selectedDate === dateKey;

          return (
            <button
              key={day}
              onClick={() => onSelect(dateKey)}
              className={`w-8 h-8 rounded-full text-sm transition ${
                isSelected
                  ? "bg-yellow-500 text-black font-bold"
                  : "hover:bg-gray-700"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    );
  };

  const applyEditsToRow = (row, originalIndex) => {
    const updates = editedRows[originalIndex];
    if (!updates) return row;

    const newRow = [...row];

    if (updates.destinationId !== undefined && destinationIndex !== -1) {
      newRow[destinationIndex] = updates.destinationId;
    }

    if (updates.dieselQuantity !== undefined && dieselIndex !== -1) {
      newRow[dieselIndex] = updates.dieselQuantity;
    }

    if (updates.odometer !== undefined && odometerIndex !== -1) {
      newRow[odometerIndex] = updates.odometer;
    }

    if (updates.sourceStation !== undefined && sourceIndex !== -1) {
      newRow[sourceIndex] = updates.sourceStation;
    }

    if (updates.fuelerId !== undefined && fuelerIndex !== -1) {
      newRow[fuelerIndex] = updates.fuelerId;
    }

    return newRow;
  };

  const workingData = data.map((row, originalIndex) => ({
    row: applyEditsToRow(row, originalIndex),
    originalIndex,
  }));

  const directRefuelData = workingData.filter(
    (item) => isSameText(item.row[typeIndex], "Direct_Refuel")
  );

  const dateFilteredData = directRefuelData.filter((item) => {
    const rawDate = item.row[dateIndex];
    const operationDate = parseOperationDate(rawDate);

    if (!operationDate) return false;

    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);

      if (operationDate < from) return false;
    }

    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);

      if (operationDate > to) return false;
    }

    return true;
  });

  const equipmentTypeOptions = [
    ...new Set(
      dateFilteredData
        .map((item) => {
          const equipmentNo = item.row[destinationIndex];
          const asset = getAsset(equipmentNo);
          return asset?.type;
        })
        .filter(Boolean)
    ),
  ];

  const equipmentOptions = [
    ...new Set(
      dateFilteredData
        .filter((item) => {
          const equipmentNo = item.row[destinationIndex];
          const asset = getAsset(equipmentNo);
          const equipmentType = asset?.type || "";

          if (
            selectedEquipmentType.length > 0 &&
            !selectedEquipmentType.includes(equipmentType)
          ) {
            return false;
          }

          return true;
        })
        .map((item) => item.row[destinationIndex])
        .filter(Boolean)
    ),
  ];

  const visibleEquipmentOptions = equipmentOptions.filter((equipment) =>
    equipment.toLowerCase().includes(equipmentSearch.toLowerCase())
  );

  const visibleEquipmentTypeOptions = equipmentTypeOptions.filter((type) =>
    type.toLowerCase().includes(equipmentTypeSearch.toLowerCase())
  );

  const toggleEquipmentSelection = (equipment) => {
    setSelectedEquipment((prev) =>
      prev.includes(equipment)
        ? prev.filter((item) => item !== equipment)
        : [...prev, equipment]
    );
  };

  const toggleEquipmentTypeSelection = (type) => {
    setSelectedEquipmentType((prev) =>
      prev.includes(type)
        ? prev.filter((item) => item !== type)
        : [...prev, type]
    );

    setSelectedEquipment([]);
  };

  const getEquipmentFilterLabel = () => {
    if (selectedEquipment.length === 0) return "All Equipment";
    if (selectedEquipment.length === 1) return selectedEquipment[0];
    return `${selectedEquipment.length} Equipment Selected`;
  };

  const getEquipmentTypeFilterLabel = () => {
    if (selectedEquipmentType.length === 0) return "All Equipment Types";
    if (selectedEquipmentType.length === 1) return selectedEquipmentType[0];
    return `${selectedEquipmentType.length} Types Selected`;
  };

  const filteredDirectRefuelData = dateFilteredData.filter((item) => {
    const equipmentNo = item.row[destinationIndex];
    const asset = getAsset(equipmentNo);
    const equipmentType = asset?.type || "";

    if (
      selectedEquipment.length > 0 &&
      !selectedEquipment.includes(equipmentNo)
    )
      return false;

    if (
      selectedEquipmentType.length > 0 &&
      !selectedEquipmentType.includes(equipmentType)
    )
      return false;

    return true;
  });

  const totalDiesel = filteredDirectRefuelData.reduce((sum, item) => {
    return sum + (parseFloat(item.row[dieselIndex]) || 0);
  }, 0);

  const getOperationLiterPrice = (item) => {
    return getLiterPriceByDate
      ? getLiterPriceByDate(item.row[dateIndex])
      : literPrice;
  };

  const totalCost = filteredDirectRefuelData.reduce((sum, item) => {
    const diesel = parseFloat(item.row[dieselIndex]) || 0;
    return sum + diesel * getOperationLiterPrice(item);
  }, 0);

  const dailyData = filteredDirectRefuelData.reduce((acc, item) => {
    const operationDate = parseOperationDate(item.row[dateIndex]);
    const date = operationDate
      ? operationDate.toISOString().split("T")[0]
      : "No Date";

    const diesel = parseFloat(item.row[dieselIndex]) || 0;
    const found = acc.find((d) => d.date === date);

    if (found) found.value += diesel;
    else acc.push({ date, value: diesel });

    return acc;
  }, []);

  const dailyConsumptionSummary = Object.values(
    filteredDirectRefuelData.reduce((acc, item) => {
      const operationDate = parseOperationDate(item.row[dateIndex]);
      const dateKey = operationDate
        ? operationDate.toISOString().split("T")[0]
        : "No Date";

      const diesel = parseFloat(item.row[dieselIndex]) || 0;

      if (!acc[dateKey]) {
        acc[dateKey] = {
          dateKey,
          qtyLiters: 0,
          totalCost: 0,
        };
      }

      acc[dateKey].qtyLiters += diesel;
      acc[dateKey].totalCost += diesel * getOperationLiterPrice(item);

      return acc;
    }, {})
  ).sort((a, b) => {
    if (a.dateKey === "No Date") return 1;
    if (b.dateKey === "No Date") return -1;
    return new Date(b.dateKey) - new Date(a.dateKey);
  });

  const equipmentTypeConsumptionSummary = Object.values(
    filteredDirectRefuelData.reduce((acc, item) => {
      const row = item.row;
      const equipmentNo = row[destinationIndex];
      const asset = getAsset(equipmentNo);
      const equipmentType = asset?.type || "Unknown";

      const diesel = parseFloat(row[dieselIndex]) || 0;

      if (!acc[equipmentType]) {
        acc[equipmentType] = {
          equipmentType,
          qtyLiters: 0,
          totalCost: 0,
        };
      }

      acc[equipmentType].qtyLiters += diesel;
      acc[equipmentType].totalCost += diesel * getOperationLiterPrice(item);

      return acc;
    }, {})
  ).sort((a, b) => b.qtyLiters - a.qtyLiters);

  const equipmentSummary = Object.values(
    filteredDirectRefuelData.reduce((acc, item) => {
      const row = item.row;
      const equipmentNo = row[destinationIndex];

      if (!equipmentNo) return acc;

      const asset = getAsset(equipmentNo);
      const diesel = parseFloat(row[dieselIndex]) || 0;
      const odometer = parseFloat(row[odometerIndex]) || 0;

      if (!acc[equipmentNo]) {
        acc[equipmentNo] = {
          equipmentNo,
          project: asset?.project || "-",
          equipmentType: asset?.type || "-",
          fuelConsumption: 0,
          totalCost: 0,
          firstOdometer: odometer,
          lastOdometer: odometer,
        };
      }

      acc[equipmentNo].fuelConsumption += diesel;
      acc[equipmentNo].totalCost += diesel * getOperationLiterPrice(item);

      if (odometer < acc[equipmentNo].firstOdometer) {
        acc[equipmentNo].firstOdometer = odometer;
      }

      if (odometer > acc[equipmentNo].lastOdometer) {
        acc[equipmentNo].lastOdometer = odometer;
      }

      return acc;
    }, {})
  ).map((item) => {
    const distance = item.lastOdometer - item.firstOdometer;

    const efficiency =
      distance > 0 ? (item.fuelConsumption / distance).toFixed(2) : "-";

    return {
      ...item,
      distance,
      efficiency,
      totalCost: item.totalCost,
    };
  });

  const topEquipmentConsumptionChartData = equipmentSummary
    .slice()
    .sort((a, b) => b.fuelConsumption - a.fuelConsumption)
    .slice(0, 10)
    .map((item) => ({
      equipmentNo: item.equipmentNo,
      qtyLiters: Number(item.fuelConsumption) || 0,
    }));

  const equipmentTypeRatioChartData = equipmentTypeConsumptionSummary.map(
    (item) => ({
      name: item.equipmentType,
      value: Number(item.qtyLiters) || 0,
    })
  );

  const equipmentTypeRatioTotal = equipmentTypeRatioChartData.reduce(
    (sum, item) => sum + (Number(item.value) || 0),
    0
  );

  const chartColors = [
    "#60a5fa",
    "#f59e0b",
    "#a78bfa",
    "#34d399",
    "#f472b6",
    "#facc15",
    "#22d3ee",
    "#fb7185",
    "#818cf8",
    "#c084fc",
    "#94a3b8",
    "#f97316",
  ];

  const getEquipmentHistory = (equipmentNo) => {
    return filteredDirectRefuelData
      .filter((item) => item.row[destinationIndex] === equipmentNo)
      .sort((a, b) => {
        const da = parseOperationDate(a.row[dateIndex])?.getTime() || 0;
        const db = parseOperationDate(b.row[dateIndex])?.getTime() || 0;
        return db - da;
      });
  };

  const getLastOdometerForEquipment = (equipmentNo, excludeOriginalIndex = null) => {
    const readings = directRefuelData
      .filter((item) => {
        if (item.originalIndex === excludeOriginalIndex) return false;
        return item.row[destinationIndex] === equipmentNo;
      })
      .map((item) => parseFloat(item.row[odometerIndex]) || 0)
      .filter((value) => value > 0);

    if (readings.length === 0) return 0;

    return Math.max(...readings);
  };

  const openCellEdit = (item, field) => {
    if (currentUser.role !== "Admin") return;

    const row = item.row;
    const currentValue =
      field === "equipment"
        ? row[destinationIndex]
        : field === "diesel"
        ? row[dieselIndex]
        : field === "odometer"
        ? row[odometerIndex]
        : field === "station"
        ? row[sourceIndex]
        : field === "fueler"
        ? row[fuelerIndex]
        : "";

    setEditCell({
      originalIndex: item.originalIndex,
      row,
      field,
      oldValue: currentValue || "",
      newValue: currentValue || "",
      reason: "",
      password: "",
    });
  };

  const closeEditCell = () => {
    setEditCell(null);
  };

  const saveCellEdit = () => {
    if (!editCell) return;

    if (!editCell.reason.trim()) {
      alert("Please enter edit reason.");
      return;
    }

    if (!editCell.password.trim()) {
      alert("Please enter admin password.");
      return;
    }

    if (!String(editCell.newValue).trim()) {
      alert("Please enter a new value.");
      return;
    }

    const row = editCell.row;
    const field = editCell.field;

    let updates = {};
    let fieldLabel = "";

    if (field === "equipment") {
      const newEquipment = editCell.newValue;
      const asset = getAsset(newEquipment);

      if (!asset) {
        alert("Please select a valid equipment.");
        return;
      }

      updates.destinationId = newEquipment;
      fieldLabel = "Equipment";
    }

    if (field === "diesel") {
      const qty = Number(editCell.newValue);

      if (!qty || qty <= 0) {
        alert("Diesel quantity must be greater than 0.");
        return;
      }

      updates.dieselQuantity = String(qty);
      fieldLabel = "Diesel Quantity";
    }

    if (field === "odometer") {
      const newOdometer = Number(editCell.newValue);
      const equipmentNo = row[destinationIndex];

      if (!newOdometer || newOdometer <= 0) {
        alert("Please enter a valid odometer.");
        return;
      }

      const lastOdometer = getLastOdometerForEquipment(
        equipmentNo,
        editCell.originalIndex
      );

      if (lastOdometer > 0 && newOdometer < lastOdometer) {
        alert(
          `Odometer cannot be less than last recorded odometer (${formatNumber(
            lastOdometer
          )}).`
        );
        return;
      }

      updates.odometer = String(newOdometer);
      fieldLabel = "Odometer";
    }

    if (field === "station") {
      const newStation = editCell.newValue;
      const station = getStation(newStation);

      if (!station) {
        alert("Please select a valid station.");
        return;
      }

      if (station.status?.trim().toLowerCase() !== "active") {
        alert("Selected station must be active.");
        return;
      }

      updates.sourceStation = newStation;
      fieldLabel = "Source Station";
    }

    if (field === "fueler") {
      const newFueler = editCell.newValue;
      const fueler = getFueler(newFueler);

      if (!fueler) {
        alert("Please select a valid fueler.");
        return;
      }

      const fuelerStatus = fueler.status?.trim().toLowerCase();
      if (fuelerStatus !== "on duty" && fuelerStatus !== "active") {
        alert("Selected fueler must be On Duty.");
        return;
      }

      updates.fuelerId = newFueler;
      fieldLabel = "Fueler";
    }

    setEditedRows((prev) => ({
      ...prev,
      [editCell.originalIndex]: {
        ...prev[editCell.originalIndex],
        ...updates,
      },
    }));

    setAuditLog((prev) => [
      ...prev,
      {
        operationId:
          operationIdIndex !== -1 ? row[operationIdIndex] : editCell.originalIndex + 1,
        rowIndex: editCell.originalIndex,
        field: fieldLabel,
        oldValue: editCell.oldValue,
        newValue: editCell.newValue,
        reason: editCell.reason,
        editedBy: currentUser.name,
        editedAt: new Date().toISOString(),
      },
    ]);

    closeEditCell();
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white overflow-y-auto h-screen">
      <div className="max-w-none ml-0 mr-[120px] p-5 text-[13px]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">Diesel Dashboard</h1>
          <p className="text-gray-400">Fuel transactions monitoring</p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold"
        >
          + Add Operation
        </button>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-3 mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div ref={dateFilterRef} className="relative">
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className="bg-gray-900 border border-gray-700 hover:border-yellow-400 text-white px-4 py-3 rounded-xl min-w-[220px] flex justify-between items-center"
            >
              <span>
                {fromDate || toDate
                  ? `${fromDate || "Start"} → ${toDate || "End"}`
                  : "Select date range"}
              </span>
              <span>▾</span>
            </button>

            {showDateFilter && (
              <div className="absolute left-0 mt-3 bg-white text-black border border-gray-300 rounded-2xl z-50 w-[650px] shadow-2xl overflow-hidden">
                <div className="bg-gray-900 text-white p-3 flex justify-end border-b border-gray-700">
                  <button className="border border-gray-500 px-4 py-2 rounded-lg text-sm">
                    Auto date range ▾
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-8 p-5">
                  <div>
                    <p className="text-sm font-semibold mb-3">Start Date</p>

                    <div className="flex justify-between items-center mb-3">
                      <button onClick={() => moveMonth("start", -1)}>‹</button>
                      <span className="font-semibold">
                        {getMonthName(startMonth)} {startYear}
                      </span>
                      <button onClick={() => moveMonth("start", 1)}>›</button>
                    </div>

                    {renderCalendarDays(startYear, startMonth, fromDate, setFromDate)}
                  </div>

                  <div>
                    <p className="text-sm font-semibold mb-3">End Date</p>

                    <div className="flex justify-between items-center mb-3">
                      <button onClick={() => moveMonth("end", -1)}>‹</button>
                      <span className="font-semibold">
                        {getMonthName(endMonth)} {endYear}
                      </span>
                      <button onClick={() => moveMonth("end", 1)}>›</button>
                    </div>

                    {renderCalendarDays(endYear, endMonth, toDate, setToDate)}
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 border-t">
                  <button
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
                    }}
                    className="bg-gray-200 px-4 py-2 rounded-lg text-sm"
                  >
                    Clear
                  </button>

                  <button
                    onClick={() => setShowDateFilter(false)}
                    className="bg-gray-900 text-white px-5 py-2 rounded-full text-sm"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          <div ref={equipmentDropdownRef} className="relative">
            <button
              onClick={() => setShowEquipmentDropdown(!showEquipmentDropdown)}
              className="bg-gray-900 border border-gray-700 hover:border-yellow-400 text-white px-4 py-3 rounded-xl min-w-[220px] text-left"
            >
              {getEquipmentFilterLabel()} ▾
            </button>

            {showEquipmentDropdown && (
              <div className="absolute mt-2 bg-gray-900 border border-gray-700 rounded-xl p-3 z-40 w-[260px] shadow-2xl">
                <input
                  value={equipmentSearch}
                  onChange={(e) => setEquipmentSearch(e.target.value)}
                  placeholder="Search equipment..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 mb-2 text-white"
                />

                <button
                  onClick={() => {
                    setSelectedEquipment([]);
                    setEquipmentSearch("");
                  }}
                  className="block w-full text-left px-3 py-2 hover:bg-gray-800 rounded text-yellow-300"
                >
                  Clear Equipment Selection
                </button>

                <div className="max-h-56 overflow-auto">
                  {visibleEquipmentOptions.map((equipment) => (
                    <button
                      key={equipment}
                      onClick={() => toggleEquipmentSelection(equipment)}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-gray-800 rounded cursor-pointer"
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
                          selectedEquipment.includes(equipment)
                            ? "bg-yellow-500 border-yellow-500 text-black"
                            : "border-gray-500"
                        }`}
                      >
                        {selectedEquipment.includes(equipment) ? "✓" : ""}
                      </span>

                      <span>{equipment}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setShowEquipmentDropdown(false);
                    setEquipmentSearch("");
                  }}
                  className="mt-3 w-full bg-yellow-500 text-black rounded-lg py-2 font-semibold"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          <div ref={equipmentTypeDropdownRef} className="relative">
            <button
              onClick={() =>
                setShowEquipmentTypeDropdown(!showEquipmentTypeDropdown)
              }
              className="bg-gray-900 border border-gray-700 hover:border-yellow-400 text-white px-4 py-3 rounded-xl min-w-[220px] text-left"
            >
              {getEquipmentTypeFilterLabel()} ▾
            </button>

            {showEquipmentTypeDropdown && (
              <div className="absolute mt-2 bg-gray-900 border border-gray-700 rounded-xl p-3 z-40 w-[260px] shadow-2xl">
                <input
                  value={equipmentTypeSearch}
                  onChange={(e) => setEquipmentTypeSearch(e.target.value)}
                  placeholder="Search type..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 mb-2 text-white"
                />

                <button
                  onClick={() => {
                    setSelectedEquipmentType([]);
                    setSelectedEquipment([]);
                    setEquipmentTypeSearch("");
                  }}
                  className="block w-full text-left px-3 py-2 hover:bg-gray-800 rounded text-yellow-300"
                >
                  Clear Type Selection
                </button>

                <div className="max-h-56 overflow-auto">
                  {visibleEquipmentTypeOptions.map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleEquipmentTypeSelection(type)}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-gray-800 rounded cursor-pointer"
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
                          selectedEquipmentType.includes(type)
                            ? "bg-yellow-500 border-yellow-500 text-black"
                            : "border-gray-500"
                        }`}
                      >
                        {selectedEquipmentType.includes(type) ? "✓" : ""}
                      </span>

                      <span>{type}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setShowEquipmentTypeDropdown(false);
                    setEquipmentTypeSearch("");
                  }}
                  className="mt-3 w-full bg-yellow-500 text-black rounded-lg py-2 font-semibold"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setFromDate("");
              setToDate("");
              setSelectedEquipment([]);
              setSelectedEquipmentType([]);
              setEquipmentSearch("");
              setEquipmentTypeSearch("");
            }}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 px-4 py-3 rounded-xl cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <Card title="Total Quantity (L)" value={formatNumber(totalDiesel)} />

        <Card
          title={`Total Cost (${currency})`}
          value={formatNumber(totalCost)}
        />

        <Card
          title="Direct Refuel Operations"
          value={formatNumber(filteredDirectRefuelData.length)}
        />

        <Card
          title="Active Equipment"
          value={formatNumber(equipmentSummary.length)}
        />
      </div>

      <div className="bg-gray-800 rounded-xl shadow overflow-hidden mb-4">
        <div className="p-3 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-yellow-400 italic underline">
            Equipment Consumption Summary
          </h2>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              {equipmentSummary.length} records
            </span>

            <div ref={equipmentSummarySettingsRef} className="relative">
              <button
                onClick={() =>
                  setShowEquipmentSummarySettings(
                    !showEquipmentSummarySettings
                  )
                }
                className="bg-gray-900 hover:bg-gray-700 border border-gray-700 hover:border-yellow-400 text-yellow-400 px-3 py-2 rounded-lg transition cursor-pointer"
              >
                ⋮
              </button>

              {showEquipmentSummarySettings && (
                <div className="absolute right-0 mt-2 w-44 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-40 overflow-hidden">
                  <button
                    onClick={exportEquipmentSummaryCSV}
                    className="block w-full text-left px-4 py-3 hover:bg-gray-800 transition text-white"
                  >
                    Export CSV
                  </button>

                  <button
                    onClick={() => {
                      printTable(
                        "equipment-summary-table",
                        "Equipment Consumption Summary"
                      );
                      setShowEquipmentSummarySettings(false);
                    }}
                    className="block w-full text-left px-4 py-3 hover:bg-gray-800 transition text-white border-t border-gray-700"
                  >
                    Print
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-h-[360px] overflow-auto">
          <table
              id="equipment-summary-table"
              className="min-w-[1350px] w-full border-collapse text-sm"
            >
            <thead className="bg-gray-700 sticky top-0 z-10">
              <tr>
                <Th>#</Th>
                <Th>Equipment No.</Th>
                <Th>Project</Th>
                <Th>Equipment Type</Th>
                <Th>Last Odometer</Th>
                <Th>Fuel Consumption</Th>
                <Th>Total Cost</Th>
                <Th>Distance</Th>
                <Th>Efficiency</Th>
              </tr>
            </thead>

            <tbody>
              {equipmentSummary.map((item, i) => (
                <tr key={i} className="hover:bg-gray-700 transition">
                  <Td>{i + 1}</Td>

                  <Td>
                    <button
                      onClick={() => setSelectedEquipmentHistory(item)}
                      className="text-blue-300 hover:text-yellow-400 font-semibold transition cursor-pointer"
                    >
                      {item.equipmentNo}
                    </button>
                  </Td>

                  <Td>{item.project}</Td>
                  <Td>{item.equipmentType}</Td>
                  <Td>{formatNumber(item.lastOdometer)}</Td>
                  <Td>{formatNumber(item.fuelConsumption)}</Td>
                  <Td>
                    {formatNumber(item.totalCost)} {currency}
                  </Td>
                  <Td>{formatNumber(item.distance)}</Td>
                  <Td>{item.efficiency}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
        <div className="bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-700">
          <div className="p-3 border-b border-gray-700 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-yellow-400 italic underline">
                Consumed Quantity per Equipment Type
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Quantity and cost grouped by equipment type
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">
                {equipmentTypeConsumptionSummary.length} types
              </span>

              <div ref={equipmentTypeSettingsRef} className="relative">
                <button
                  onClick={() =>
                    setShowEquipmentTypeSettings(!showEquipmentTypeSettings)
                  }
                  className="bg-gray-900 hover:bg-gray-700 border border-gray-700 hover:border-yellow-400 text-yellow-400 px-3 py-2 rounded-lg transition cursor-pointer"
                >
                  ⋮
                </button>

                {showEquipmentTypeSettings && (
                  <div className="absolute right-0 mt-2 w-44 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-40 overflow-hidden">
                    <button
                      onClick={exportEquipmentTypeSummaryCSV}
                      className="block w-full text-left px-4 py-3 hover:bg-gray-800 transition text-white"
                    >
                      Export CSV
                    </button>

                    <button
                      onClick={() => {
                        printTable(
                          "equipment-type-table",
                          "Consumed Quantity per Equipment Type"
                        );
                        setShowEquipmentTypeSettings(false);
                      }}
                      className="block w-full text-left px-4 py-3 hover:bg-gray-800 transition text-white border-t border-gray-700"
                    >
                      Print
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-[320px] overflow-auto">
            <table
                id="equipment-type-table"
                className="min-w-[650px] w-full border-collapse text-sm"
              >
              <thead className="bg-gray-700 sticky top-0 z-10">
                <tr>
                  <Th>#</Th>
                  <Th>Equipment Type</Th>
                  <Th>Qty Liters</Th>
                  <Th>Total Cost</Th>
                </tr>
              </thead>

              <tbody>
                {equipmentTypeConsumptionSummary.map((item, i) => (
                  <tr key={item.equipmentType} className="hover:bg-gray-700 transition">
                    <Td>{i + 1}</Td>
                    <Td strong>{item.equipmentType}</Td>
                    <Td>{formatNumber(item.qtyLiters)}</Td>
                    <Td>
                      {formatNumber(item.totalCost)} {currency}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-700">
          <div className="p-3 border-b border-gray-700 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-yellow-400 italic underline">
                Daily Consumption
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Daily quantity and cost based on selected filters
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">
                {dailyConsumptionSummary.length} days
              </span>

              <div ref={dailyConsumptionSettingsRef} className="relative">
                <button
                  onClick={() =>
                    setShowDailyConsumptionSettings(
                      !showDailyConsumptionSettings
                    )
                  }
                  className="bg-gray-900 hover:bg-gray-700 border border-gray-700 hover:border-yellow-400 text-yellow-400 px-3 py-2 rounded-lg transition cursor-pointer"
                >
                  ⋮
                </button>

                {showDailyConsumptionSettings && (
                  <div className="absolute right-0 mt-2 w-44 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-40 overflow-hidden">
                    <button
                      onClick={exportDailyConsumptionCSV}
                      className="block w-full text-left px-4 py-3 hover:bg-gray-800 transition text-white"
                    >
                      Export CSV
                    </button>

                    <button
                      onClick={() => {
                        printTable(
                          "daily-consumption-table",
                          "Daily Consumption"
                        );
                        setShowDailyConsumptionSettings(false);
                      }}
                      className="block w-full text-left px-4 py-3 hover:bg-gray-800 transition text-white border-t border-gray-700"
                    >
                      Print
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-[320px] overflow-auto">
            <table
                id="daily-consumption-table"
                className="min-w-[650px] w-full border-collapse text-sm"
              >
              <thead className="bg-gray-700 sticky top-0 z-10">
                <tr>
                  <Th>#</Th>
                  <Th>Date</Th>
                  <Th>Qty Liters</Th>
                  <Th>Total Cost</Th>
                </tr>
              </thead>

              <tbody>
                {dailyConsumptionSummary.map((item, i) => (
                  <tr key={item.dateKey} className="hover:bg-gray-700 transition">
                    <Td>{i + 1}</Td>
                    <Td strong>{item.dateKey}</Td>
                    <Td>{formatNumber(item.qtyLiters)}</Td>
                    <Td>
                      {formatNumber(item.totalCost)} {currency}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-3 rounded-xl mb-4">
        <h3 className="text-lg font-bold text-yellow-400 italic underline mb-3">
          Consumed Quantity Over Time
        </h3>

        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={dailyData}>
            <XAxis dataKey="date" stroke="#ccc" />
            <YAxis stroke="#ccc" />
            <Tooltip />

            <Line type="monotone" dataKey="value" stroke="#60a5fa" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <div className="bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-700 p-4">
          <h2 className="text-lg font-bold text-yellow-400 italic underline mb-3">
            Consumed Quantity Per Equipment No.
          </h2>

          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={topEquipmentConsumptionChartData}>
              <XAxis dataKey="equipmentNo" stroke="#ccc" tick={{ fontSize: 11 }} />
              <YAxis stroke="#ccc" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="qtyLiters" fill="#86efac" name="Qty Liters" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-700 p-4">
          <h2 className="text-lg font-bold text-yellow-400 italic underline mb-3">
            Consumed Quantity Ratio per Asset Type
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_230px] gap-4 items-center">
            <ResponsiveContainer width="100%" height={340}>
              <PieChart>
                <Pie
                  data={equipmentTypeRatioChartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={115}
                  paddingAngle={2}
                  labelLine={false}
                  label={false}
                >
                  {equipmentTypeRatioChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(value, name) => {
                    const percentage =
                      equipmentTypeRatioTotal > 0
                        ? ((Number(value) / equipmentTypeRatioTotal) * 100).toFixed(1)
                        : "0.0";

                    return [`${percentage}%`, name];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="max-h-[310px] overflow-y-auto pr-2 border-l border-gray-700 pl-3">
              {equipmentTypeRatioChartData.map((item, index) => {
                const percentage =
                  equipmentTypeRatioTotal > 0
                    ? ((Number(item.value) / equipmentTypeRatioTotal) * 100).toFixed(1)
                    : "0.0";

                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-2 text-xs py-1 border-b border-gray-700/40"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{
                          backgroundColor: chartColors[index % chartColors.length],
                        }}
                      />

                      <span className="truncate text-gray-200">
                        {item.name}
                      </span>
                    </div>

                    <span className="text-yellow-300 shrink-0">
                      {percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {selectedEquipmentHistory && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 text-white w-[1150px] max-h-[88vh] rounded-3xl shadow-2xl border border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-700 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-yellow-400 italic underline">
                  Equipment Operations History
                </h2>
                <p className="text-gray-400 mt-1">
                  Equipment:{" "}
                  <span className="text-blue-300 font-semibold">
                    {selectedEquipmentHistory.equipmentNo}
                  </span>
                </p>
              </div>

              <button
                onClick={() => setSelectedEquipmentHistory(null)}
                className="text-gray-400 hover:text-red-400 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-5 overflow-auto max-h-[68vh]">
              <table className="min-w-[1050px] w-full border-collapse text-sm">
                <thead className="bg-gray-800 sticky top-0 z-10">
                  <tr>
                    <Th>#</Th>
                    <Th>Date</Th>
                    <Th>Operation ID</Th>
                    <Th>Station</Th>
                    <Th>Fueler</Th>
                    <Th>Equipment</Th>
                    <Th>Liters</Th>
                    <Th>Odometer</Th>
                  </tr>
                </thead>

                <tbody>
                  {getEquipmentHistory(selectedEquipmentHistory.equipmentNo).map(
                    (item, i) => {
                      const row = item.row;

                      return (
                        <tr
                          key={item.originalIndex}
                          className="hover:bg-gray-800 transition"
                        >
                          <Td>{i + 1}</Td>
                          <Td>{formatDisplayDate(row[dateIndex])}</Td>

                          <Td>
                            {operationIdIndex !== -1
                              ? row[operationIdIndex]
                              : item.originalIndex + 1}
                          </Td>

                          <Td>
                            <button
                              onClick={() => openCellEdit(item, "station")}
                              className="text-blue-300 hover:text-yellow-400 font-semibold cursor-pointer"
                            >
                              {row[sourceIndex] || "-"}
                            </button>
                          </Td>

                          <Td>
                            <button
                              onClick={() => openCellEdit(item, "fueler")}
                              className="text-blue-300 hover:text-yellow-400 font-semibold cursor-pointer"
                            >
                              {row[fuelerIndex] || "-"}
                            </button>
                          </Td>

                          <Td>
                            <button
                              onClick={() => openCellEdit(item, "equipment")}
                              className="text-blue-300 hover:text-yellow-400 font-semibold cursor-pointer"
                            >
                              {row[destinationIndex] || "-"}
                            </button>
                          </Td>

                          <Td>
                            <button
                              onClick={() => openCellEdit(item, "diesel")}
                              className="text-blue-300 hover:text-yellow-400 font-semibold cursor-pointer"
                            >
                              {formatNumber(row[dieselIndex])}
                            </button>
                          </Td>

                          <Td>
                            <button
                              onClick={() => openCellEdit(item, "odometer")}
                              className="text-blue-300 hover:text-yellow-400 font-semibold cursor-pointer"
                            >
                              {formatNumber(row[odometerIndex])}
                            </button>
                          </Td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>

              {auditLog.length > 0 && (
                <div className="mt-6 bg-gray-950 border border-gray-700 rounded-2xl p-4">
                  <h3 className="text-yellow-400 font-semibold mb-3">
                    Local Audit Log
                  </h3>

                  <div className="max-h-44 overflow-auto">
                    {auditLog
                      .slice()
                      .reverse()
                      .map((log, i) => (
                        <div
                          key={i}
                          className="text-xs text-gray-300 border-b border-gray-800 py-2"
                        >
                          <span className="text-blue-300">
                            Operation {log.operationId}
                          </span>{" "}
                          | {log.field}:{" "}
                          <span className="text-red-300">{log.oldValue}</span>{" "}
                          →{" "}
                          <span className="text-green-300">{log.newValue}</span>{" "}
                          | Reason: {log.reason} | By: {log.editedBy}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editCell && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-white text-black w-[560px] rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-5 border-b pb-3">
              <h2 className="text-2xl font-bold">
                Edit{" "}
                {editCell.field === "equipment"
                  ? "Equipment"
                  : editCell.field === "diesel"
                  ? "Diesel Quantity"
                  : editCell.field === "odometer"
                  ? "Odometer"
                  : editCell.field === "station"
                  ? "Source Station"
                  : "Fueler"}
              </h2>

              <button
                onClick={closeEditCell}
                className="text-gray-500 hover:text-black text-xl"
              >
                ×
              </button>
            </div>

            <div className="bg-gray-100 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-600">Old Value</p>
              <p className="text-xl font-bold">{editCell.oldValue || "-"}</p>
            </div>

            <div className="mb-4">
              <label className="font-medium text-gray-700">New Value</label>

              {editCell.field === "equipment" ? (
                <select
                  value={editCell.newValue}
                  onChange={(e) =>
                    setEditCell({ ...editCell, newValue: e.target.value })
                  }
                  className="border rounded-lg p-3 w-full mt-2"
                >
                  <option value="">Select Equipment</option>
                  {assets
                    .filter((asset) => asset.status?.toLowerCase() !== "retired")
                    .map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.id} - {asset.type || "-"}
                      </option>
                    ))}
                </select>
              ) : editCell.field === "station" ? (
                <select
                  value={editCell.newValue}
                  onChange={(e) =>
                    setEditCell({ ...editCell, newValue: e.target.value })
                  }
                  className="border rounded-lg p-3 w-full mt-2"
                >
                  <option value="">Select Station</option>
                  {stations
                    .filter((station) => !isSameText(station.id, "External_Supply"))
                    .map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.id} - {station.status || "-"}
                      </option>
                    ))}
                </select>
              ) : editCell.field === "fueler" ? (
                <select
                  value={editCell.newValue}
                  onChange={(e) =>
                    setEditCell({ ...editCell, newValue: e.target.value })
                  }
                  className="border rounded-lg p-3 w-full mt-2"
                >
                  <option value="">Select Fueler</option>
                  {fuelers
                    .filter((fueler) => {
                      const status = String(fueler.status || "On Duty").trim().toLowerCase();
                      return status === "on duty" || status === "active";
                    })
                    .map((fueler) => (
                      <option key={fueler.id} value={fueler.id}>
                        {fueler.id} - {fueler.name || "-"} - {fueler.status || "On Duty"}
                      </option>
                    ))}
                </select>
              ) : (
                <input
                  type="number"
                  value={editCell.newValue}
                  onChange={(e) =>
                    setEditCell({ ...editCell, newValue: e.target.value })
                  }
                  className="border rounded-lg p-3 w-full mt-2"
                  placeholder="Enter new value"
                />
              )}
            </div>

            <div className="mb-4">
              <label className="font-medium text-gray-700">Edit Reason</label>
              <textarea
                value={editCell.reason}
                onChange={(e) =>
                  setEditCell({ ...editCell, reason: e.target.value })
                }
                className="border rounded-lg p-3 w-full mt-2 h-24"
                placeholder="Enter correction reason..."
              />
            </div>

            <div className="mb-5">
              <label className="font-medium text-gray-700">Admin Password</label>
              <input
                type="password"
                value={editCell.password}
                onChange={(e) =>
                  setEditCell({ ...editCell, password: e.target.value })
                }
                className="border rounded-lg p-3 w-full mt-2"
                placeholder="Enter admin password"
              />
            </div>

            <div className="flex justify-end gap-3 border-t pt-4">
              <button
                onClick={closeEditCell}
                className="bg-gray-200 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={saveCellEdit}
                className="bg-red-600 text-white px-4 py-2 rounded-lg"
              >
                Save Correction
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <AddOperationModal
          closeForm={closeForm}
          fuelers={fuelers}
          stations={stations}
          transactionType={transactionType}
          setTransactionType={setTransactionType}
          destinationOptions={destinationOptions}
          stationMeterPhoto={stationMeterPhoto}
          setStationMeterPhoto={setStationMeterPhoto}
          assetPhoto={assetPhoto}
          setAssetPhoto={setAssetPhoto}
          assetMeterPhoto={assetMeterPhoto}
          setAssetMeterPhoto={setAssetMeterPhoto}
        />
      )}
      </div>
    </div>
  );
}
function AssetsPage({ assets, projects = [], showToast, data = [], headers = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

const [showAssetSettings, setShowAssetSettings] = useState(false);
const [showExportMenu, setShowExportMenu] = useState(false);
const assetSettingsRef = useRef(null);

useOutsideClick(assetSettingsRef, () => {
  setShowAssetSettings(false);
  setShowExportMenu(false);
});

  const [selectedAsset, setSelectedAsset] = useState(null);

  const [localAssetUpdates, setLocalAssetUpdates] = useState({});

  const [projectTargetAsset, setProjectTargetAsset] = useState(null);
  const [selectedProjectValue, setSelectedProjectValue] = useState("");
  const [showProjectConfirm, setShowProjectConfirm] = useState(false);
  const [showProjectPassword, setShowProjectPassword] = useState(false);
  const [projectPassword, setProjectPassword] = useState("");

  const [deleteTargetAsset, setDeleteTargetAsset] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  const [odometerTargetAsset, setOdometerTargetAsset] = useState(null);
  const [newOdometer, setNewOdometer] = useState("");
  const [odometerReason, setOdometerReason] = useState("");
  const [showOdometerConfirm, setShowOdometerConfirm] = useState(false);
  const [showOdometerPassword, setShowOdometerPassword] = useState(false);
  const [odometerPassword, setOdometerPassword] = useState("");

  const displayAssets = assets.map((asset) => ({
    ...asset,
    status: localAssetUpdates[asset.id]?.status || asset.status,
    project: localAssetUpdates[asset.id]?.project || asset.project,
  }));

  const activeAssets = displayAssets.filter(
    (a) => a.status?.trim().toLowerCase() === "active"
  );

  const inactiveAssets = displayAssets.filter(
    (a) => a.status?.trim().toLowerCase() === "inactive"
  );

  const retiredAssets = displayAssets.filter(
    (a) => a.status?.trim().toLowerCase() === "retired"
  );

  const visibleAssets = displayAssets.filter(
    (a) => a.status?.trim().toLowerCase() !== "retired"
  );

  const projectOptions =
    projects.length > 0
      ? projects.map((p) => p.name || p.id).filter(Boolean)
      : [...new Set(visibleAssets.map((a) => a.project).filter(Boolean))];

  const filteredAssets = visibleAssets.filter((asset) => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return true;

    const searchableText = [
      asset.id,
      asset.project,
      asset.type,
      asset.category,
      asset.odometer,
      asset.fuelTank,
      asset.status,
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(search);
  });

  const dieselIndex = getHeaderIndex(headers, [
    "diesel_quantity",
    "Diesel quantity",
    "diesel quantity",
    "quantity",
    "qty",
  ]);
  const typeIndex = getHeaderIndex(headers, [
    "transaction_type",
    "Transaction type",
    "transaction type",
    "operation_type",
    "Operation type",
  ]);
  const destinationIndex = getHeaderIndex(headers, [
    "destination_id",
    "Destination ID",
    "destination id",
    "destination",
  ]);

  const consumptionByAsset = data.reduce((acc, row) => {
    if (typeIndex === -1 || dieselIndex === -1 || destinationIndex === -1) {
      return acc;
    }

    if (!isSameText(row[typeIndex], "Direct_Refuel")) {
      return acc;
    }

    const assetId = row[destinationIndex];
    const dieselQty = parseFloat(row[dieselIndex]) || 0;

    if (!assetId) {
      return acc;
    }

    acc[assetId] = (acc[assetId] || 0) + dieselQty;
    return acc;
  }, {});

  const assetConsumptionChartData = filteredAssets
    .map((asset) => ({
      equipmentNo: asset.id,
      qtyLiters: Number(consumptionByAsset[asset.id]) || 0,
    }))
    .sort((a, b) => b.qtyLiters - a.qtyLiters);

  const assetConsumptionChartWidth = Math.max(
    assetConsumptionChartData.length * 85,
    900
  );

  const changeAssetStatus = (asset) => {
    const currentStatus = asset.status?.trim().toLowerCase();
    const newStatus = currentStatus === "active" ? "Inactive" : "Active";

    const confirmed = confirm(
      `Are you sure you want to change ${asset.id} status to ${newStatus}?`
    );

    if (!confirmed) return;

    setLocalAssetUpdates((prev) => ({
      ...prev,
      [asset.id]: {
        ...prev[asset.id],
        status: newStatus,
      },
    }));

    showToast
      ? showToast("success", `Asset status changed to ${newStatus}.`)
      : alert(`Asset status changed to ${newStatus}.`);
  };

  const openProjectChange = (asset) => {
    setProjectTargetAsset(asset);
    setSelectedProjectValue(asset.project || "");
  };

  const proceedProjectConfirm = () => {
    if (!selectedProjectValue) {
      showToast
        ? showToast("warning", "Please select a project.")
        : alert("Please select a project.");
      return;
    }

    setShowProjectConfirm(true);
  };

  const proceedProjectPassword = () => {
    setShowProjectConfirm(false);
    setShowProjectPassword(true);
  };

  const confirmProjectUpdate = () => {
    if (!projectPassword) {
      showToast
        ? showToast("error", "Please enter your password.")
        : alert("Please enter your password.");
      return;
    }

    setLocalAssetUpdates((prev) => ({
      ...prev,
      [projectTargetAsset.id]: {
        ...prev[projectTargetAsset.id],
        project: selectedProjectValue,
      },
    }));

    setProjectTargetAsset(null);
    setSelectedProjectValue("");
    setShowProjectConfirm(false);
    setShowProjectPassword(false);
    setProjectPassword("");

    showToast
      ? showToast("success", "Asset project updated successfully.")
      : alert("Asset project updated successfully.");
  };

  const proceedDeleteConfirm = () => {
    if (!deleteReason) {
      showToast
        ? showToast("warning", "Please enter deletion reason.")
        : alert("Please enter deletion reason.");
      return;
    }

    setShowDeleteConfirm(true);
  };

  const proceedDeletePassword = () => {
    setShowDeleteConfirm(false);
    setShowDeletePassword(true);
  };

  const confirmDeleteRequest = () => {
    if (!deletePassword) {
      showToast
        ? showToast("error", "Please enter your password.")
        : alert("Please enter your password.");
      return;
    }

    setDeleteTargetAsset(null);
    setDeleteReason("");
    setDeletePassword("");
    setShowDeleteConfirm(false);
    setShowDeletePassword(false);

    showToast
      ? showToast(
          "success",
          "Asset deletion request submitted for manager approval."
        )
      : alert("Asset deletion request submitted for manager approval.");
  };

  const proceedOdometerConfirm = () => {
    if (!newOdometer || Number(newOdometer) <= 0) {
      showToast
        ? showToast("warning", "Please enter valid odometer.")
        : alert("Please enter valid odometer.");
      return;
    }

    if (!odometerReason) {
      showToast
        ? showToast("warning", "Please enter correction reason.")
        : alert("Please enter correction reason.");
      return;
    }

    setShowOdometerConfirm(true);
  };

  const proceedOdometerPassword = () => {
    setShowOdometerConfirm(false);
    setShowOdometerPassword(true);
  };

  const confirmOdometerRequest = () => {
    if (!odometerPassword) {
      showToast
        ? showToast("error", "Please enter your password.")
        : alert("Please enter your password.");
      return;
    }

    setOdometerTargetAsset(null);
    setNewOdometer("");
    setOdometerReason("");
    setOdometerPassword("");
    setShowOdometerConfirm(false);
    setShowOdometerPassword(false);

    showToast
      ? showToast(
          "success",
          "Odometer correction request submitted for manager approval."
        )
      : alert("Odometer correction request submitted for manager approval.");
  };

const exportAssetsToCSV = () => {
  const csvHeaders = [
    "Asset ID",
    "Project",
    "Asset Type",
    "Category",
    "Current Odometer",
    "Fuel Tank Capacity",
    "Status",
  ];

  const csvRows = filteredAssets.map((asset) => [
    asset.id || "",
    asset.project || "",
    asset.type || "",
    asset.category || "",
    asset.odometer || "",
    asset.fuelTank || "",
    asset.status || "",
  ]);

  const csvContent = [csvHeaders, ...csvRows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const today = new Date().toISOString().split("T")[0];

  link.href = url;
  link.download = `assets_export_${today}.csv`;
  link.click();

  URL.revokeObjectURL(url);

  showToast
    ? showToast("success", "Assets data exported successfully.")
    : alert("Assets data exported successfully.");
};

const exportAssetsToPDF = () => {
  showToast
    ? showToast("warning", "PDF export will be added in the next step.")
    : alert("PDF export will be added in the next step.");
};

const escapePrintValue = (value) => {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const printAssetsReport = () => {
  const reportDate = new Date().toLocaleString();

  const tableRowsHtml = filteredAssets
    .map(
      (asset, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escapePrintValue(asset.id)}</td>
          <td>${escapePrintValue(asset.project)}</td>
          <td>${escapePrintValue(asset.type)}</td>
          <td>${escapePrintValue(asset.category)}</td>
          <td>${escapePrintValue(formatNumber(asset.odometer))}</td>
          <td>${escapePrintValue(formatNumber(asset.fuelTank))} L</td>
          <td>${escapePrintValue(asset.status)}</td>
        </tr>
      `
    )
    .join("");

  const printWindow = window.open("", "", "width=1400,height=900");

  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Assets Report</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 12mm;
          }

          body {
            font-family: Arial, sans-serif;
            color: #111;
            padding: 10px;
          }

          h1 {
            margin: 0 0 6px;
            font-size: 24px;
          }

          h2 {
            margin: 26px 0 12px;
            font-size: 18px;
          }

          .meta {
            margin-bottom: 18px;
            font-size: 12px;
            color: #555;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }

          th, td {
            border: 1px solid #bbb;
            padding: 6px 8px;
            text-align: left;
          }

          th {
            background: #f0f0f0;
            font-weight: bold;
          }

          tr:nth-child(even) {
            background: #fafafa;
          }

          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>

      <body>
        <h1>Assets Report</h1>
        <div class="meta">
          Generated at: ${reportDate} | Total Assets: ${filteredAssets.length}
        </div>

        <h2>Assets List</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Asset ID</th>
              <th>Project</th>
              <th>Asset Type</th>
              <th>Category</th>
              <th>Current Odometer</th>
              <th>Fuel Tank Capacity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};
  return (
    <div className="bg-gray-900 min-h-screen text-white overflow-y-auto h-screen">
      <div className="max-w-none ml-0 mr-[120px] p-5 text-[13px]">
      <div className="flex justify-between items-center mb-4 gap-4">
  <div>
    <h1 className="text-2xl font-bold">Assets</h1>
    <p className="text-gray-400">Fleet master data</p>
  </div>

  <div className="flex items-center gap-3">
    <input
      type="text"
      placeholder="Search by asset ID, type, project, status..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white w-[380px] focus:outline-none focus:border-yellow-400"
    />

    <div ref={assetSettingsRef} className="relative">
      <button
        onClick={() => setShowAssetSettings(!showAssetSettings)}
        className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-yellow-400 text-yellow-400 px-4 py-3 rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
      >
        ⋮
      </button>

      {showAssetSettings && (
        <div className="absolute right-0 mt-3 w-56 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-40">
          <button
            onClick={() => {
              setShowAssetSettings(false);
              setShowForm(true);
            }}
            className="flex items-center gap-3 w-full text-left px-5 py-4 hover:bg-gray-800 transition text-white"
          >
            <span className="text-green-400 text-lg">＋</span>
            Add Asset
          </button>

          <button
            onClick={() => {
              setShowAssetSettings(false);
              setShowExportMenu(false);
              printAssetsReport();
            }}
            className="flex items-center gap-3 w-full text-left px-5 py-4 hover:bg-gray-800 transition text-white border-t border-gray-700"
          >
            <span className="text-yellow-400 text-lg">⎙</span>
            Print Assets Report
          </button>

          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center justify-between w-full text-left px-5 py-4 hover:bg-gray-800 transition text-white border-t border-gray-700"
          >
            <span className="flex items-center gap-3">
              <span className="text-blue-400 text-lg">⇩</span>
              Export
            </span>

            <span className="text-gray-400">›</span>
          </button>

          {showExportMenu && (
            <div className="bg-gray-950 border-t border-gray-700">
              <button
                onClick={() => {
                  setShowAssetSettings(false);
                  setShowExportMenu(false);
                  exportAssetsToCSV();
                }}
                className="block w-full text-left px-10 py-3 hover:bg-gray-800 transition text-gray-200"
              >
                Export CSV
              </button>

              <button
                onClick={() => {
                  setShowAssetSettings(false);
                  setShowExportMenu(false);
                  exportAssetsToPDF();
                }}
                className="block w-full text-left px-10 py-3 hover:bg-gray-800 transition text-gray-200"
              >
                Export PDF
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
</div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <Card title="Total Assets" value={visibleAssets.length} />
        <Card title="Active Assets" value={activeAssets.length} />
        <Card title="Inactive Assets" value={inactiveAssets.length} />
        <Card title="Retired Assets" value={retiredAssets.length} />
      </div>


      <div className="bg-gray-800 rounded-xl shadow overflow-hidden mb-4">
        <div className="p-3 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-yellow-400 italic underline">
              Assets List
            </h2>
            <p className="text-sm text-gray-400">Fleet operational assets</p>
          </div>

          <span className="text-sm text-gray-400">
            {filteredAssets.length} assets
          </span>
        </div>

        <div className="max-h-[520px] overflow-auto">
          <table className="min-w-[800px] w-full border-collapse text-sm">
            <thead className="bg-gray-700 sticky top-0 z-10">
              <tr>
                <Th>#</Th>
                <Th>Asset ID</Th>
                <Th>Project</Th>
                <Th>Asset Type</Th>
                <Th>Category</Th>
                <Th>Current Odometer</Th>
                <Th>Fuel Tank Capacity</Th>
                <Th>Status</Th>
              </tr>
            </thead>

            <tbody>
              {filteredAssets.map((asset, i) => (
                <tr
                  key={asset.id}
                  className="hover:bg-gray-700/60 transition-all duration-200"
                >
                  <Td>{i + 1}</Td>

                  <Td>
                    <button
                      onClick={() => setSelectedAsset(asset)}
                      className="text-blue-300 hover:text-yellow-400 font-semibold transition cursor-pointer"
                    >
                      {asset.id}
                    </button>
                  </Td>

                  <Td>
                    <button
                      onClick={() => openProjectChange(asset)}
                      className="hover:text-yellow-400 transition cursor-pointer"
                    >
                      {asset.project || "-"}
                    </button>
                  </Td>

                  <Td>{asset.type || "-"}</Td>
                  <Td>{asset.category || "-"}</Td>
                  <Td>{formatNumber(asset.odometer)}</Td>
                  <Td>{formatNumber(asset.fuelTank)} L</Td>

                  <Td>
                    <button
                      onClick={() => changeAssetStatus(asset)}
                      className="cursor-pointer"
                    >
                      <StatusBadge status={asset.status} />
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      <div className="bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-700 p-4 mb-4">
        <h2 className="text-lg font-bold text-yellow-400 italic underline mb-3">
          Consumed Quantity Per Equipment No.
        </h2>

        <div className="overflow-x-auto overflow-y-hidden pb-2">
          <div style={{ width: `${assetConsumptionChartWidth}px`, height: "340px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assetConsumptionChartData}>
                <XAxis dataKey="equipmentNo" stroke="#ccc" tick={{ fontSize: 11 }} />
                <YAxis stroke="#ccc" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="qtyLiters" fill="#86efac" name="Qty Liters" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {showForm && (
        <GenericModal
          title="Add Asset"
          closeForm={() => setShowForm(false)}
          saveText="Save Asset"
        >
          <Field label="Asset ID" placeholder="1-316" />
          <Field label="Project" placeholder="Project name / ID" />
          <Field label="Asset Type" placeholder="Excavator / Truck / Loader" />
          <Field label="Category" placeholder="Heavy Equipment" />
          <Field label="Current Odometer" placeholder="Current reading" />
          <Field label="Fuel Tank Capacity" placeholder="Liters" />

          <div className="grid grid-cols-3 items-center gap-4">
            <label className="font-medium text-gray-700">Status</label>
            <select className="col-span-2 border rounded-lg p-2">
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </GenericModal>
      )}

      {selectedAsset && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 text-white w-[560px] rounded-3xl shadow-2xl border border-gray-700 p-6">
            <div className="flex justify-between items-start mb-5">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-bold text-blue-200">
                    {selectedAsset.id}
                  </h2>

                  <button
                    onClick={() => setDeleteTargetAsset(selectedAsset)}
                    className="text-gray-400 hover:text-red-400 transition text-lg cursor-pointer"
                  >
                    🗑️
                  </button>
                </div>

                <p className="text-gray-400 mt-1">Asset Details</p>
              </div>

              <button
                onClick={() => setSelectedAsset(null)}
                className="text-gray-400 hover:text-red-400 text-2xl transition"
              >
                ×
              </button>
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <p className="text-xs text-gray-400">Project</p>
                  <p className="text-lg font-semibold text-white">
                    {selectedAsset.project || "-"}
                  </p>
                </div>

                <StatusBadge status={selectedAsset.status} />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-xs text-gray-400">Asset Type</p>
                  <p className="text-lg font-semibold">
                    {selectedAsset.type || "-"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-400">Category</p>
                  <p className="text-lg font-semibold">
                    {selectedAsset.category || "-"}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-400">Current Odometer</p>

                    <button
                      onClick={() => setOdometerTargetAsset(selectedAsset)}
                      className="text-gray-400 hover:text-yellow-400 transition text-sm cursor-pointer"
                    >
                      ✏️
                    </button>
                  </div>

                  <p className="text-lg font-semibold text-yellow-300">
                    {formatNumber(selectedAsset.odometer)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-400">Fuel Tank Capacity</p>
                  <p className="text-lg font-semibold text-yellow-300">
                    {formatNumber(selectedAsset.fuelTank)} L
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-5">
              <button
                onClick={() => setSelectedAsset(null)}
                className="bg-gray-700 hover:bg-gray-600 active:bg-gray-900 text-white px-6 py-2 rounded-xl text-sm shadow-[0_3px_0_#111827] active:shadow-none active:translate-y-[3px] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {projectTargetAsset && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[520px] rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4">Change Project</h2>

            <p className="text-sm text-gray-500 mb-4">
              Asset: <strong>{projectTargetAsset.id}</strong>
            </p>

            <select
              value={selectedProjectValue}
              onChange={(e) => setSelectedProjectValue(e.target.value)}
              className="border rounded-lg p-2 w-full mb-6"
            >
              <option value="">Select Project</option>
              {projectOptions.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setProjectTargetAsset(null);
                  setSelectedProjectValue("");
                }}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={proceedProjectConfirm}
                className="bg-gray-800 text-white px-4 py-2 rounded"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showProjectConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[520px] rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4 text-red-600">
              Confirm Project Change
            </h2>

            <div className="bg-gray-100 p-4 rounded mb-4">
              <p>
                <strong>Asset:</strong> {projectTargetAsset.id}
              </p>
              <p>
                <strong>New Project:</strong> {selectedProjectValue}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowProjectConfirm(false)}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={proceedProjectPassword}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showProjectPassword && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[520px] rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4">
              Admin Password Required
            </h2>

            <input
              type="password"
              value={projectPassword}
              onChange={(e) => setProjectPassword(e.target.value)}
              className="border rounded-lg p-2 w-full mb-6"
              placeholder="Enter admin password"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowProjectPassword(false);
                  setProjectPassword("");
                }}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={confirmProjectUpdate}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTargetAsset && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[520px] rounded-2xl p-6 shadow-2xl">
            <h2 className="text-2xl font-bold mb-2 text-red-600">
              Delete Asset
            </h2>

            <p className="text-gray-600 mb-5">
              Asset: <strong>{deleteTargetAsset.id}</strong>
            </p>

            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Enter deletion reason..."
              className="border rounded-xl p-3 w-full h-28 mb-5"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteTargetAsset(null);
                  setDeleteReason("");
                }}
                className="bg-gray-200 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={proceedDeleteConfirm}
                className="bg-red-600 text-white px-4 py-2 rounded-lg"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[500px] rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">
              Confirm Asset Deletion
            </h2>

            <p className="mb-6">
              Are you sure you want to submit deletion request for:
              <strong> {deleteTargetAsset?.id}</strong> ?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="bg-gray-200 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={proceedDeletePassword}
                className="bg-red-600 text-white px-4 py-2 rounded-lg"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeletePassword && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[500px] rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">
              Admin Password Required
            </h2>

            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter admin password"
              className="border rounded-lg p-3 w-full mb-6"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeletePassword(false)}
                className="bg-gray-200 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={confirmDeleteRequest}
                className="bg-red-600 text-white px-4 py-2 rounded-lg"
              >
                Confirm Request
              </button>
            </div>
          </div>
        </div>
      )}

      {odometerTargetAsset && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[520px] rounded-2xl p-6 shadow-2xl">
            <h2 className="text-2xl font-bold mb-2 text-yellow-600">
              Odometer Correction
            </h2>

            <p className="text-gray-600 mb-5">
              Asset: <strong>{odometerTargetAsset.id}</strong>
            </p>

            <input
              type="number"
              value={newOdometer}
              onChange={(e) => setNewOdometer(e.target.value)}
              placeholder="Enter new odometer"
              className="border rounded-xl p-3 w-full mb-4"
            />

            <textarea
              value={odometerReason}
              onChange={(e) => setOdometerReason(e.target.value)}
              placeholder="Enter correction reason..."
              className="border rounded-xl p-3 w-full h-28 mb-5"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setOdometerTargetAsset(null);
                  setNewOdometer("");
                  setOdometerReason("");
                }}
                className="bg-gray-200 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={proceedOdometerConfirm}
                className="bg-yellow-500 text-black px-4 py-2 rounded-lg"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showOdometerConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[500px] rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">
              Confirm Odometer Correction
            </h2>

            <p className="mb-6">
              Submit odometer correction request for:
              <strong> {odometerTargetAsset?.id}</strong> ?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowOdometerConfirm(false)}
                className="bg-gray-200 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={proceedOdometerPassword}
                className="bg-yellow-500 text-black px-4 py-2 rounded-lg"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showOdometerPassword && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[500px] rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">
              Admin Password Required
            </h2>

            <input
              type="password"
              value={odometerPassword}
              onChange={(e) => setOdometerPassword(e.target.value)}
              placeholder="Enter admin password"
              className="border rounded-lg p-3 w-full mb-6"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowOdometerPassword(false)}
                className="bg-gray-200 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={confirmOdometerRequest}
                className="bg-yellow-500 text-black px-4 py-2 rounded-lg"
              >
                Confirm Request
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
function StationsPage({
  stations,
  data,
  headers,
  showToast,
  literPrice,
  priceHistory = [],
  setPriceHistory,
  getLiterPriceByDate,
  currency,
}) {
  const [showForm, setShowForm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedProject, setSelectedProject] = useState("All");
  const stationSettingsRef = useRef(null);

  useOutsideClick(stationSettingsRef, () => {
    setShowSettings(false);
    setShowExportMenu(false);
  });

  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedStationHistory, setSelectedStationHistory] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [localAdjustments, setLocalAdjustments] = useState([]);

  const [showLiterPrice, setShowLiterPrice] = useState(false);
  const [newLiterPrice, setNewLiterPrice] = useState("");
  const [effectiveDatetime, setEffectiveDatetime] = useState("");
  const [showPriceConfirm, setShowPriceConfirm] = useState(false);
  const [showPricePassword, setShowPricePassword] = useState(false);
  const [pricePassword, setPricePassword] = useState("");

  const currentUser = {
    name: "Amr",
    role: "Admin",
  };

  const countryFlag = "🇸🇦";

  const dieselIndex = getHeaderIndex(headers, [
    "diesel_quantity",
    "Diesel quantity",
    "diesel quantity",
    "quantity",
    "qty",
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
  const dateIndex = getHeaderIndex(headers, [
    "transaction_datetime",
    "Transaction datetime",
    "transaction datetime",
    "date",
  ]);

  const fuelerIndex = getHeaderIndex(headers, [
    "fueler_id",
    "Fueler ID",
    "fueler id",
    "fueler",
  ]);

  const operationIdIndex = getHeaderIndex(headers, [
    "operation_id",
    "Operation ID",
    "operation id",
    "transaction_id",
    "Transaction ID",
    "transaction id",
    "id",
  ]);

  const formatDisplayDate = (rawDate) => {
    if (!rawDate) return "-";

    const d = new Date(rawDate);

    if (Number.isNaN(d.getTime())) return rawDate || "-";

    return d.toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStationOperations = (stationId) => {
    return data
      .map((row, originalIndex) => ({ row, originalIndex }))
      .filter((item) => {
        const row = item.row;
        const type = row[typeIndex];
        const source = row[sourceIndex];
        const destination = row[destinationIndex];

        return (
          (isSameText(type, "Direct_Refuel") &&
            isSameText(source, stationId)) ||
          (isSameText(type, "Internal_Transfer") &&
            (isSameText(source, stationId) ||
              isSameText(destination, stationId))) ||
          (isSameText(type, "External_Supply") &&
            isSameText(destination, stationId))
        );
      })
      .sort((a, b) => {
        const dateA = new Date(a.row[dateIndex]).getTime() || 0;
        const dateB = new Date(b.row[dateIndex]).getTime() || 0;
        return dateB - dateA;
      });
  };

  const getStationOperationDirection = (row, stationId) => {
    const type = row[typeIndex];
    const source = row[sourceIndex];
    const destination = row[destinationIndex];

    if (isSameText(type, "Direct_Refuel") && isSameText(source, stationId)) {
      return "Out";
    }

    if (isSameText(type, "Internal_Transfer") && isSameText(source, stationId)) {
      return "Out";
    }

    if (
      isSameText(type, "Internal_Transfer") &&
      isSameText(destination, stationId)
    ) {
      return "In";
    }

    if (isSameText(type, "External_Supply") && isSameText(destination, stationId)) {
      return "In";
    }

    return "-";
  };

  const calculateStationBalance = (station) => {
    let currentStock = station.openingBalance || 0;

    data.forEach((row) => {
      const type = row[typeIndex];
      const source = row[sourceIndex];
      const destination = row[destinationIndex];
      const qty = parseFloat(row[dieselIndex]) || 0;

      if (isSameText(type, "Direct_Refuel") && isSameText(source, station.id)) currentStock -= qty;
      if (isSameText(type, "Internal_Transfer") && isSameText(source, station.id)) currentStock -= qty;
      if (isSameText(type, "Internal_Transfer") && isSameText(destination, station.id)) currentStock += qty;
      if (isSameText(type, "External_Supply") && isSameText(destination, station.id)) currentStock += qty;
    });

    localAdjustments.forEach((adj) => {
      if (isSameText(adj.stationId, station.id)) {
        currentStock += adj.adjustmentQty;
      }
    });

    return currentStock;
  };

  const realStations = stations.filter(
    (station) => !isSameText(station.id, "External_Supply")
  );

  const stationsWithBalance = realStations.map((station) => {
    const currentStock = calculateStationBalance(station);

    const percentage =
      station.capacity > 0
        ? Math.max(0, Math.min(100, (currentStock / station.capacity) * 100))
        : 0;

    return {
      ...station,
      currentStock,
      percentage,
    };
  });

  const projectOptions = [
    "All",
    ...new Set(realStations.map((station) => station.project).filter(Boolean)),
  ];

  const filteredStations =
    selectedProject === "All"
      ? stationsWithBalance
      : stationsWithBalance.filter((station) => station.project === selectedProject);

  const stationConsumptionChartData = filteredStations
    .map((station) => {
      const totalConsumed = data.reduce((sum, row) => {
        const type = row[typeIndex];
        const source = row[sourceIndex];
        const qty = parseFloat(row[dieselIndex]) || 0;

        if (isSameText(type, "Direct_Refuel") && isSameText(source, station.id)) {
          return sum + qty;
        }

        return sum;
      }, 0);

      return {
        stationId: station.id,
        qtyLiters: totalConsumed,
      };
    })
    .sort((a, b) => b.qtyLiters - a.qtyLiters);

  const openInventoryAdjustment = () => {
    setShowSettings(false);
    setShowExportMenu(false);
    setSelectedStation(null);
    setShowConfirm(true);
  };

  const proceedToPassword = () => {
    if (!selectedStation) {
      showToast
        ? showToast("warning", "Please select a station first.")
        : alert("Please select a station first.");
      return;
    }

    setShowConfirm(false);
    setShowPassword(true);
  };

  const confirmZeroBalance = () => {
    if (!adminPassword) {
      showToast
        ? showToast("error", "Please enter your password.")
        : alert("Please enter your password.");
      return;
    }

    const adjustmentQty = -selectedStation.currentStock;

    setLocalAdjustments([
      ...localAdjustments,
      {
        stationId: selectedStation.id,
        adjustmentQty,
        reason: "Inventory Adjustment",
        createdBy: currentUser.name,
        createdAt: new Date().toISOString(),
      },
    ]);

    setShowPassword(false);
    setSelectedStation(null);
    setAdminPassword("");

    showToast
      ? showToast("success", "Inventory Adjustment completed successfully.")
      : alert("Inventory Adjustment completed successfully.");
  };

  const proceedLiterPriceConfirm = () => {
    if (!newLiterPrice || Number(newLiterPrice) <= 0) {
      showToast
        ? showToast("warning", "Please enter a valid liter price.")
        : alert("Please enter a valid liter price.");
      return;
    }

    if (!effectiveDatetime) {
      showToast
        ? showToast("warning", "Please select effective date and time.")
        : alert("Please select effective date and time.");
      return;
    }

    setShowLiterPrice(false);
    setShowPriceConfirm(true);
  };

  const proceedLiterPricePassword = () => {
    setShowPriceConfirm(false);
    setShowPricePassword(true);
  };

  const confirmLiterPriceUpdate = () => {
    if (!pricePassword) {
      showToast
        ? showToast("error", "Please enter your password.")
        : alert("Please enter your password.");
      return;
    }

    if (setPriceHistory) {
      setPriceHistory((prev) =>
        [
          ...prev,
          {
            price: Number(newLiterPrice),
            effectiveFrom: effectiveDatetime,
            createdBy: currentUser.name,
            createdAt: new Date().toISOString(),
          },
        ].sort((a, b) => new Date(a.effectiveFrom) - new Date(b.effectiveFrom))
      );
    }

    setShowPricePassword(false);
    setPricePassword("");
    setNewLiterPrice("");
    setEffectiveDatetime("");

    showToast
      ? showToast("success", "Liter price updated successfully.")
      : alert("Liter price updated successfully.");
  };

  const exportStationsToCSV = () => {
    const csvHeaders = [
      "Station ID",
      "Project",
      "Capacity",
      "Current Stock",
      "Tank Level",
      "Status",
      "Liter Price",
    ];

    const csvRows = filteredStations.map((station) => [
      station.id || "",
      station.project || "",
      station.capacity || "",
      station.currentStock || "",
      `${Number(station.percentage || 0).toFixed(1)}%`,
      station.status || "",
      `${literPrice} ${currency}/L`,
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];

    link.href = url;
    link.download = `stations_export_${today}.csv`;
    link.click();

    URL.revokeObjectURL(url);

    showToast
      ? showToast("success", "Stations data exported successfully.")
      : alert("Stations data exported successfully.");
  };

  const exportStationsToPDF = () => {
    showToast
      ? showToast("warning", "PDF export will be added later.")
      : alert("PDF export will be added later.");
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white overflow-y-auto h-screen">
      <div className="max-w-none ml-0 mr-[120px] p-5 text-[13px]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">Fuel Stations</h1>
          <p className="text-gray-400">Fuel stock management</p>
        </div>

        <div ref={stationSettingsRef} className="relative">
         <button
  onClick={(e) => {
    e.stopPropagation();
    setShowSettings(!showSettings);

    if (showSettings) {
      setShowExportMenu(false);
    }
  }}
  className="bg-gray-900 hover:bg-gray-700 border border-gray-700 hover:border-yellow-400 text-yellow-400 px-3 py-2 rounded-lg transition cursor-pointer"
>
  ⋮
</button>

          {showSettings && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 mt-3 w-64 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-40 backdrop-blur-xl"
            >
              <button
                onClick={() => {
                  setShowSettings(false);
                  setShowExportMenu(false);
                  setShowForm(true);
                }}
                className="flex items-center gap-3 w-full text-left px-5 py-4 hover:bg-gray-800 transition text-white"
              >
                <span className="text-green-400 text-lg">＋</span>
                Add Station
              </button>

              <button
                onClick={() => {
                  setShowSettings(false);
                  setShowExportMenu(false);
                  setShowEdit(true);
                }}
                className="flex items-center gap-3 w-full text-left px-5 py-4 hover:bg-gray-800 transition text-white"
              >
                <span className="text-blue-400 text-lg">✎</span>
                Edit Station
              </button>

              {currentUser.role === "Admin" && (
                <button
                  onClick={openInventoryAdjustment}
                  className="flex items-center gap-3 w-full text-left px-5 py-4 hover:bg-red-900/30 transition text-red-400"
                >
                  <span className="text-lg">⚠</span>
                  Inventory Adjustment
                </button>
              )}

              <button
                onClick={() => {
                  setShowSettings(false);
                  setShowExportMenu(false);
                  setShowLiterPrice(true);
                }}
                className="flex items-center justify-between w-full px-5 py-4 hover:bg-yellow-500/10 transition text-white border-t border-gray-700"
              >
                <span className="flex items-center gap-3">
                  <span className="text-lg">{countryFlag}</span>
                  Liter Price
                </span>

                <span className="text-xs text-gray-400">
                  {literPrice} {currency}/L
                </span>
              </button>

              <div className="border-t border-gray-700">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowExportMenu((prev) => !prev);
                  }}
                  className="flex items-center justify-between w-full px-5 py-4 hover:bg-gray-800 transition text-white"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-blue-400 text-lg">⇩</span>
                    Export
                  </span>

                  <span className="text-gray-400">›</span>
                </button>

                {showExportMenu && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="bg-gray-950 border-t border-gray-700"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportStationsToCSV();
                        setShowExportMenu(false);
                        setShowSettings(false);
                      }}
                      className="block w-full text-left px-10 py-3 hover:bg-gray-800 transition text-gray-200"
                    >
                      Export CSV
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportStationsToPDF();
                        setShowExportMenu(false);
                        setShowSettings(false);
                      }}
                      className="block w-full text-left px-10 py-3 hover:bg-gray-800 transition text-gray-200"
                    >
                      Export PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-3 mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="bg-gray-900 border border-gray-700 hover:border-yellow-400 text-white px-4 py-3 rounded-xl min-w-[240px] outline-none"
          >
            {projectOptions.map((project) => (
              <option key={project} value={project}>
                {project === "All" ? "All Projects" : project}
              </option>
            ))}
          </select>

          <button
            onClick={() => setSelectedProject("All")}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 px-4 py-3 rounded-xl cursor-pointer"
          >
            Reset Filter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card title="Total Stations" value={filteredStations.length} />

        <Card
          title="Total Capacity"
          value={formatNumber(
            filteredStations.reduce((sum, s) => sum + (s.capacity || 0), 0)
          )}
        />

        <Card
          title="Current Stock"
          value={formatNumber(
            filteredStations.reduce(
              (sum, s) => sum + (s.currentStock || 0),
              0
            )
          )}
        />
      </div>

      <div className="bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-700 p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-yellow-400 italic underline">
              Stations Stock
            </h2>
            <p className="text-sm text-gray-400">
              Live stock overview by station
            </p>
          </div>

          <span className="text-sm text-gray-400">
            {filteredStations.length} stations
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredStations.map((station) => (
            <div
              key={station.id}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-4 shadow-lg hover:border-yellow-400/60 hover:shadow-yellow-400/10 transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <button
                    onClick={() => setSelectedStationHistory(station)}
                    className="text-xl font-bold text-blue-200 hover:text-yellow-400 transition cursor-pointer"
                  >
                    {station.id}
                  </button>
                  <p className="text-sm text-gray-400">
                    Project: {station.project || "-"}
                  </p>
                </div>

                <StatusBadge status={station.status} />
              </div>

              <div className="flex justify-between items-center mb-5">
                <div>
                  <p className="text-xs text-gray-400">Capacity</p>
                  <p className="text-lg font-semibold">
                    {formatNumber(station.capacity)} L
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-400">Current Stock</p>
                  <p className="text-lg font-semibold text-yellow-300">
                    {formatNumber(station.currentStock)} L
                  </p>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-3">Tank Level</p>
                <FuelLevelIcon percentage={station.percentage} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-700 p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-lg font-bold text-yellow-400 italic underline">
              Total Consumption per Station
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Direct refuel quantity grouped by source station
            </p>
          </div>

          <span className="text-sm text-gray-400">
            {selectedProject === "All" ? "All Projects" : selectedProject}
          </span>
        </div>

        <ResponsiveContainer
          width="100%"
          height={Math.max(220, stationConsumptionChartData.length * 45)}
        >
          <BarChart
            data={stationConsumptionChartData}
            barCategoryGap="35%"
          >
            <XAxis
              dataKey="stationId"
              stroke="#ccc"
              tick={{ fontSize: 11 }}
            />

            <YAxis
              stroke="#ccc"
              tick={{ fontSize: 11 }}
            />

            <Tooltip />

            <Bar
              dataKey="qtyLiters"
              fill="#facc15"
              name="Qty Liters"
              radius={[6, 6, 0, 0]}
              maxBarSize={45}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {selectedStationHistory && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 text-white w-[1150px] max-h-[88vh] rounded-3xl shadow-2xl border border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-700 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-yellow-400 italic underline">
                  Station Operations History
                </h2>

                <p className="text-gray-400 mt-1">
                  Station:{" "}
                  <span className="text-blue-300 font-semibold">
                    {selectedStationHistory.id}
                  </span>
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Direct refuel, internal transfers, and external supply related to this station
                </p>
              </div>

              <button
                onClick={() => setSelectedStationHistory(null)}
                className="text-gray-400 hover:text-red-400 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-5 overflow-auto max-h-[68vh]">
              <table className="min-w-[1050px] w-full border-collapse text-sm">
                <thead className="bg-gray-800 sticky top-0 z-10">
                  <tr>
                    <Th>#</Th>
                    <Th>Date</Th>
                    <Th>Operation ID</Th>
                    <Th>Type</Th>
                    <Th>Direction</Th>
                    <Th>Source</Th>
                    <Th>Destination</Th>
                    <Th>Fueler</Th>
                    <Th>Qty Liters</Th>
                  </tr>
                </thead>

                <tbody>
                  {getStationOperations(selectedStationHistory.id).length === 0 ? (
                    <tr>
                      <Td colSpan={9}>
                        <span className="text-gray-400">
                          No operations found for this station.
                        </span>
                      </Td>
                    </tr>
                  ) : (
                    getStationOperations(selectedStationHistory.id).map((item, i) => {
                      const row = item.row;
                      const direction = getStationOperationDirection(
                        row,
                        selectedStationHistory.id
                      );

                      return (
                        <tr
                          key={item.originalIndex}
                          className="hover:bg-gray-800 transition"
                        >
                          <Td>{i + 1}</Td>
                          <Td>{formatDisplayDate(row[dateIndex])}</Td>

                          <Td>
                            {operationIdIndex !== -1
                              ? row[operationIdIndex] || "-"
                              : item.originalIndex + 1}
                          </Td>

                          <Td>{row[typeIndex] || "-"}</Td>

                          <Td>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                direction === "In"
                                  ? "bg-green-500/15 text-green-300 border border-green-500/30"
                                  : direction === "Out"
                                  ? "bg-red-500/15 text-red-300 border border-red-500/30"
                                  : "bg-gray-500/15 text-gray-300 border border-gray-500/30"
                              }`}
                            >
                              {direction}
                            </span>
                          </Td>

                          <Td>{row[sourceIndex] || "-"}</Td>
                          <Td>{row[destinationIndex] || "-"}</Td>
                          <Td>{fuelerIndex !== -1 ? row[fuelerIndex] || "-" : "-"}</Td>
                          <Td>{formatNumber(row[dieselIndex])}</Td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[650px] rounded-xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h2 className="text-2xl font-bold">Add Station</h2>
              <button onClick={() => setShowForm(false)}>×</button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Field label="Station ID" placeholder="Main_Station" />

              <div className="grid grid-cols-3 items-center gap-4">
                <label className="font-medium text-gray-700">Station Type</label>
                <select className="col-span-2 border rounded-lg p-2">
                  <option>Main</option>
                  <option>Sub</option>
                </select>
              </div>

              <Field label="Project" placeholder="Project name" />
              <Field label="Capacity" placeholder="Liters" />
              <Field label="Opening Balance" placeholder="Liters" />

              <div className="grid grid-cols-3 items-center gap-4">
                <label className="font-medium text-gray-700">Status</label>
                <select className="col-span-2 border rounded-lg p-2">
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
              <button
                onClick={() => setShowForm(false)}
                className="bg-gray-200 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button className="bg-green-600 text-white px-4 py-2 rounded-lg">
                Save Station
              </button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[650px] rounded-xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h2 className="text-2xl font-bold">Edit Station</h2>
              <button onClick={() => setShowEdit(false)}>×</button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-3 items-center gap-4">
                <label className="font-medium text-gray-700">Select Station</label>
                <select className="col-span-2 border rounded-lg p-2">
                  <option>Select Station</option>
                  {realStations.map((s) => (
                    <option key={s.id}>{s.id}</option>
                  ))}
                </select>
              </div>

              <Field label="Project" placeholder="New project" />

              <div className="grid grid-cols-3 items-center gap-4">
                <label className="font-medium text-gray-700">Status</label>
                <select className="col-span-2 border rounded-lg p-2">
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
              <button
                onClick={() => setShowEdit(false)}
                className="bg-gray-200 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button className="bg-green-600 text-white px-4 py-2 rounded-lg">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[560px] rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4 text-red-600">
              Inventory Adjustment
            </h2>

            <div className="mb-4">
              <label className="font-medium">Select Station</label>
              <select
                className="border rounded-lg p-2 w-full mt-2"
                value={selectedStation?.id || ""}
                onChange={(e) => {
                  const station = stationsWithBalance.find(
                    (s) => s.id === e.target.value
                  );
                  setSelectedStation(station);
                }}
              >
                <option value="">Select Station</option>
                {stationsWithBalance.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id}
                  </option>
                ))}
              </select>
            </div>

            {selectedStation && (
              <div className="bg-gray-100 p-4 rounded mb-4">
                <p>
                  <strong>Current Balance:</strong>{" "}
                  {formatNumber(selectedStation.currentStock)} L
                </p>
                <p>
                  <strong>Adjustment Qty:</strong>{" "}
                  {formatNumber(-selectedStation.currentStock)} L
                </p>
                <p>
                  <strong>Final Balance:</strong> 0 L
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setSelectedStation(null);
                }}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={proceedToPassword}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showPassword && selectedStation && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[520px] rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4">
              Admin Password Required
            </h2>

            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="border rounded-lg p-2 w-full mb-6"
              placeholder="Enter admin password"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPassword(false);
                  setSelectedStation(null);
                  setAdminPassword("");
                }}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={confirmZeroBalance}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Confirm Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {showLiterPrice && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[520px] rounded-xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h2 className="text-2xl font-bold">Liter Price</h2>

              <button onClick={() => setShowLiterPrice(false)}>
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-gray-100 p-4 rounded-lg flex justify-between">
                <span>{countryFlag} Current Liter Price</span>
                <strong>
                  {literPrice} {currency}/L
                </strong>
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <label className="font-medium text-gray-700">
                  New Liter Price
                </label>

                <input
                  type="number"
                  value={newLiterPrice}
                  onChange={(e) => setNewLiterPrice(e.target.value)}
                  className="col-span-2 border rounded-lg p-2"
                  placeholder="Enter new price"
                />
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <label className="font-medium text-gray-700">
                  Effective Date & Time
                </label>

                <input
                  type="datetime-local"
                  value={effectiveDatetime}
                  onChange={(e) => setEffectiveDatetime(e.target.value)}
                  className="col-span-2 border rounded-lg p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
              <button
                onClick={() => setShowLiterPrice(false)}
                className="bg-gray-200 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={proceedLiterPriceConfirm}
                className="bg-red-600 text-white px-4 py-2 rounded-lg"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showPriceConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[520px] rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4 text-red-600">
              Confirm Liter Price Update
            </h2>

            <div className="bg-gray-100 p-4 rounded mb-4">
              <p>
                <strong>Current Price:</strong> {literPrice} {currency}/L
              </p>
              <p>
                <strong>New Price:</strong> {newLiterPrice} {currency}/L
              </p>
              <p>
                <strong>Effective From:</strong> {effectiveDatetime}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPriceConfirm(false);
                  setNewLiterPrice("");
                  setEffectiveDatetime("");
                }}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={proceedLiterPricePassword}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showPricePassword && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[520px] rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4">
              Admin Password Required
            </h2>

            <p className="text-gray-600 mb-4">
              Please enter your password to confirm liter price update.
            </p>

            <input
              type="password"
              value={pricePassword}
              onChange={(e) => setPricePassword(e.target.value)}
              className="border rounded-lg p-2 w-full mb-6"
              placeholder="Enter admin password"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPricePassword(false);
                  setPricePassword("");
                  setNewLiterPrice("");
                  setEffectiveDatetime("");
                }}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={confirmLiterPriceUpdate}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function FuelLevelIcon({ percentage }) {
  const level = Math.max(0, Math.min(100, Number(percentage) || 0));

  const color =
    level < 30
      ? "text-red-500"
      : level < 60
      ? "text-yellow-400"
      : "text-green-500";

  const bgColor =
    level < 30
      ? "bg-red-500/10"
      : level < 60
      ? "bg-yellow-400/10"
      : "bg-green-500/10";

  const glow =
    level < 30
      ? "shadow-red-500/40"
      : level < 60
      ? "shadow-yellow-400/40"
      : "shadow-green-500/40";

  const size =
    level < 30
      ? "text-2xl"
      : level < 60
      ? "text-3xl"
      : "text-4xl";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${bgColor} ${glow} shadow-lg rounded-full w-14 h-14 flex items-center justify-center transition-all duration-500`}
      >
        <span className={`${color} ${size} transition-all duration-500`}>
          ⛽
        </span>
      </div>

      <div>
        <p className={`${color} font-bold text-sm`}>
          {level.toFixed(1)}%
        </p>

        <p className="text-xs text-gray-400">
          {level < 30 ? "Low" : level < 60 ? "Medium" : "Good"}
        </p>
      </div>
    </div>
  );
}
 

function FuelersPage({
  fuelers = [],
  projects = [],
  data = [],
  headers = [],
  showToast,
  currency = "SAR",
  getLiterPriceByDate,
}) {
  const [localFuelers, setLocalFuelers] = useState([]);
  const [localFuelerUpdates, setLocalFuelerUpdates] = useState({});
  const [editFueler, setEditFueler] = useState(null);
  const [showAddFueler, setShowAddFueler] = useState(false);
  const [selectedFuelerHistory, setSelectedFuelerHistory] = useState(null);
  const [fuelerAuditLog, setFuelerAuditLog] = useState([]);
  const [showFuelersSettings, setShowFuelersSettings] = useState(false);

  const fuelersSettingsRef = useRef(null);

  useOutsideClick(fuelersSettingsRef, () => {
    setShowFuelersSettings(false);
  });

  const [newFueler, setNewFueler] = useState({
    id: "",
    name: "",
    mobile: "",
    projectName: "",
    status: "On Duty",
  });

  const dieselIndex = getHeaderIndex(headers, [
    "diesel_quantity",
    "Diesel quantity",
    "diesel quantity",
    "quantity",
    "qty",
  ]);

  const fuelerIndex = getHeaderIndex(headers, [
    "fueler_id",
    "Fueler ID",
    "fueler id",
    "fueler",
  ]);

  const typeIndex = getHeaderIndex(headers, [
    "transaction_type",
    "Transaction type",
    "transaction type",
    "operation_type",
    "Operation type",
  ]);

  const dateIndex = getHeaderIndex(headers, [
    "transaction_datetime",
    "Transaction datetime",
    "transaction datetime",
    "date",
  ]);

  const operationIdIndex = getHeaderIndex(headers, [
    "operation_id",
    "Operation ID",
    "operation id",
    "transaction_id",
    "Transaction ID",
    "transaction id",
    "id",
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

  const odometerIndex = getHeaderIndex(headers, [
    "odometer_at_fueling",
    "Odometer at fueling",
    "odometer at fueling",
    "odometer",
  ]);

  const normalizeText = (value) => String(value || "").trim().toLowerCase();

  const formatDisplayDate = (rawDate) => {
    if (!rawDate) return "-";
    const d = new Date(rawDate);
    if (Number.isNaN(d.getTime())) return rawDate || "-";

    return d.toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const masterFuelers = [...fuelers, ...localFuelers];

  const displayFuelers = masterFuelers.map((fueler) => ({
    ...fueler,
    ...localFuelerUpdates[fueler.id],
    mobile: localFuelerUpdates[fueler.id]?.mobile || fueler.mobile || "-",
    projectName:
      localFuelerUpdates[fueler.id]?.projectName ||
      fueler.projectName ||
      fueler.project ||
      "-",
    status: localFuelerUpdates[fueler.id]?.status || fueler.status || "On Duty",
  }));

  const directRefuelOperations =
    typeIndex === -1
      ? []
      : data
          .map((row, originalIndex) => ({ row, originalIndex }))
          .filter((item) => isSameText(item.row[typeIndex], "Direct_Refuel"));

  const getFuelerOperations = (fuelerId) => {
    if (fuelerIndex === -1 || typeIndex === -1) return [];

    return directRefuelOperations
      .filter((item) => {
        const rowFuelerId = normalizeText(item.row[fuelerIndex]);
        return rowFuelerId === normalizeText(fuelerId);
      })
      .sort((a, b) => {
        const da = dateIndex !== -1 ? new Date(a.row[dateIndex]).getTime() || 0 : 0;
        const db = dateIndex !== -1 ? new Date(b.row[dateIndex]).getTime() || 0 : 0;
        return db - da;
      });
  };

  const getFuelerDieselQty = (fuelerId) => {
    if (dieselIndex === -1) return 0;

    return getFuelerOperations(fuelerId).reduce((sum, item) => {
      return sum + (parseFloat(item.row[dieselIndex]) || 0);
    }, 0);
  };

  const fuelersWithKpi = displayFuelers.map((fueler) => {
    const operations = getFuelerOperations(fueler.id);
    const dieselQty = getFuelerDieselQty(fueler.id);

    return {
      ...fueler,
      operationsCount: operations.length,
      dieselQty,
    };
  });

  const chartData = fuelersWithKpi
    .map((fueler) => ({
      name: fueler.name || fueler.id,
      dieselQty: Number(fueler.dieselQty) || 0,
    }))
    .sort((a, b) => b.dieselQty - a.dieselQty);

  const totalOperations = fuelersWithKpi.reduce(
    (sum, fueler) => sum + fueler.operationsCount,
    0
  );

  const totalDiesel = fuelersWithKpi.reduce(
    (sum, fueler) => sum + fueler.dieselQty,
    0
  );

  const assignedProjectsCount = new Set(
    fuelersWithKpi
      .map((fueler) => fueler.projectName)
      .filter((projectName) => projectName && projectName !== "-")
  ).size;

  const getStatusBadgeClass = (status) => {
    const value = String(status || "").toLowerCase();

    if (value === "on duty" || value === "active") {
      return "bg-green-500/20 text-green-300 border border-green-500/30";
    }

    if (value === "in vacation" || value === "vacation" || value === "في اجازة") {
      return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30";
    }

    if (
      value === "retired / resigned" ||
      value === "retired/resigned" ||
      value === "retired" ||
      value === "resigned"
    ) {
      return "bg-red-500/20 text-red-300 border border-red-500/30";
    }

    return "bg-gray-500/20 text-gray-300 border border-gray-500/30";
  };

  const printTable = (tableId, title = "Fuelers Report") => {
    const tableElement = document.getElementById(tableId);

    if (!tableElement) return;

    const printWindow = window.open("", "", "width=1400,height=900");

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>

          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 25px;
              color: #111;
            }

            h2 {
              margin-bottom: 20px;
              font-size: 22px;
            }

            .report-meta {
              margin-bottom: 18px;
              font-size: 12px;
              color: #555;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
            }

            th, td {
              border: 1px solid #ccc;
              padding: 8px 10px;
              text-align: left;
            }

            th {
              background: #f3f4f6;
              font-weight: bold;
            }

            tr:nth-child(even) {
              background: #fafafa;
            }

            button {
              background: transparent;
              border: 0;
              color: #111;
              padding: 0;
              font: inherit;
              text-align: left;
            }

            span {
              color: #111 !important;
            }

            @media print {
              body {
                padding: 15px;
              }
            }
          </style>
        </head>

        <body>
          <h2>${title}</h2>
          <div class="report-meta">
            Generated at: ${new Date().toLocaleString()}
          </div>

          ${tableElement.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const exportRowsToCSV = (fileName, csvHeaders, csvRows) => {
    const csvContent = [csvHeaders, ...csvRows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];

    link.href = url;
    link.download = `${fileName}_${today}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const exportFuelersCSV = () => {
    exportRowsToCSV(
      "fuelers_report",
      [
        "#",
        "Fueler ID",
        "Name",
        "Mobile",
        "Project Name",
        "Status",
        "Direct Refuel Operations",
        "Diesel Qty (L)",
      ],
      fuelersWithKpi.map((fueler, i) => [
        i + 1,
        fueler.id,
        fueler.name || "-",
        fueler.mobile || "-",
        fueler.projectName || "-",
        fueler.status || "On Duty",
        fueler.operationsCount,
        fueler.dieselQty,
      ])
    );
  };

  const resetNewFueler = () => {
    setNewFueler({
      id: "",
      name: "",
      mobile: "",
      projectName: "",
      status: "On Duty",
    });
  };

  const closeAddFueler = () => {
    setShowAddFueler(false);
    resetNewFueler();
  };

  const saveNewFueler = () => {
    const fuelerId = newFueler.id.trim();
    const fuelerName = newFueler.name.trim();
    const mobile = newFueler.mobile.trim();

    if (!fuelerId) {
      alert("Please enter Fueler ID.");
      return;
    }

    if (!fuelerName) {
      alert("Please enter Fueler Name.");
      return;
    }

    if (!mobile) {
      alert("Please enter Mobile Number.");
      return;
    }

    const idExists = masterFuelers.some(
      (fueler) => normalizeText(fueler.id) === normalizeText(fuelerId)
    );

    if (idExists) {
      alert("Fueler ID already exists.");
      return;
    }

    setLocalFuelers((prev) => [
      ...prev,
      {
        id: fuelerId,
        name: fuelerName,
        mobile,
        projectName: newFueler.projectName || "-",
        status: newFueler.status || "On Duty",
        createdLocally: true,
      },
    ]);

    if (showToast) {
      showToast("success", "Fueler added locally.");
    }

    closeAddFueler();
  };

  const openFuelerEdit = (fueler, field) => {
    const oldValue =
      field === "mobile"
        ? fueler.mobile || ""
        : field === "status"
        ? fueler.status || "On Duty"
        : fueler.projectName || "";

    setEditFueler({
      fuelerId: fueler.id,
      fuelerName: fueler.name,
      field,
      oldValue,
      newValue: oldValue,
      reason: "",
      password: "",
    });
  };

  const closeFuelerEdit = () => {
    setEditFueler(null);
  };

  const saveFuelerEdit = () => {
    if (!editFueler) return;

    if (!String(editFueler.newValue).trim()) {
      alert("Please enter a new value.");
      return;
    }

    if (editFueler.field !== "status" && !editFueler.reason.trim()) {
      alert("Please enter edit reason.");
      return;
    }

    if (!editFueler.password.trim()) {
      alert("Please enter admin password.");
      return;
    }

    const updateKey =
      editFueler.field === "mobile"
        ? "mobile"
        : editFueler.field === "status"
        ? "status"
        : "projectName";

    const fieldLabel =
      editFueler.field === "mobile"
        ? "Mobile"
        : editFueler.field === "status"
        ? "Status"
        : "Project";

    setLocalFuelerUpdates((prev) => ({
      ...prev,
      [editFueler.fuelerId]: {
        ...prev[editFueler.fuelerId],
        [updateKey]: editFueler.newValue,
      },
    }));

    setFuelerAuditLog((prev) => [
      ...prev,
      {
        fuelerId: editFueler.fuelerId,
        fuelerName: editFueler.fuelerName,
        field: fieldLabel,
        oldValue: editFueler.oldValue,
        newValue: editFueler.newValue,
        reason: editFueler.field === "status" ? "Status update" : editFueler.reason,
        editedBy: "Amr",
        editedAt: new Date().toISOString(),
      },
    ]);

    if (showToast) {
      showToast("success", `${fieldLabel} updated locally.`);
    }

    closeFuelerEdit();
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white overflow-y-auto h-screen">
      <div className="max-w-none ml-0 mr-[120px] p-5 text-[13px]">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h1 className="text-2xl font-bold">Fuelers Management</h1>
            <p className="text-gray-400">
              Fuelers monitoring, Direct Refuel KPI and performance tracking
            </p>
          </div>

          <button
            onClick={() => setShowAddFueler(true)}
            className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg font-semibold transition"
          >
            + Add Fueler
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          <Card title="Total Fuelers" value={formatNumber(fuelersWithKpi.length)} />
          <Card
            title="On Duty"
            value={formatNumber(
              fuelersWithKpi.filter(
                (fueler) =>
                  isSameText(fueler.status, "On Duty") ||
                  isSameText(fueler.status, "Active")
              ).length
            )}
          />
          <Card title="Direct Refuel Operations" value={formatNumber(totalOperations)} />
          <Card title="Assigned Projects" value={formatNumber(assignedProjectsCount)} />
        </div>

        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden mb-5">
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-yellow-400 italic underline">
                Fuelers List
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Mobile, project, and status changes are saved locally and ready for backend integration
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">
                {fuelersWithKpi.length} fuelers
              </span>

              <div ref={fuelersSettingsRef} className="relative">
                <button
                  onClick={() => setShowFuelersSettings(!showFuelersSettings)}
                  className="bg-gray-900 hover:bg-gray-700 border border-gray-700 hover:border-yellow-400 text-yellow-400 px-3 py-2 rounded-lg transition cursor-pointer"
                >
                  ⋮
                </button>

                {showFuelersSettings && (
                  <div className="absolute right-0 mt-2 w-44 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-40 overflow-hidden">
                    <button
                      onClick={() => {
                        exportFuelersCSV();
                        setShowFuelersSettings(false);
                      }}
                      className="block w-full text-left px-4 py-3 hover:bg-gray-800 transition text-white"
                    >
                      Export CSV
                    </button>

                    <button
                      onClick={() => {
                        printTable("fuelers-table", "Fuelers Report");
                        setShowFuelersSettings(false);
                      }}
                      className="block w-full text-left px-4 py-3 hover:bg-gray-800 transition text-white border-t border-gray-700"
                    >
                      Print
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-auto">
            <table
              id="fuelers-table"
              className="min-w-[1150px] w-full border-collapse text-sm"
            >
              <thead className="bg-gray-700 sticky top-0 z-10">
                <tr>
                  <Th>#</Th>
                  <Th>Fueler ID</Th>
                  <Th>Name</Th>
                  <Th>Mobile</Th>
                  <Th>Project Name</Th>
                  <Th>Status</Th>
                  <Th>KPI Operations</Th>
                  <Th>Diesel Qty</Th>
                </tr>
              </thead>

              <tbody>
                {fuelersWithKpi.map((fueler, i) => (
                  <tr key={fueler.id} className="hover:bg-gray-700 transition">
                    <Td>{i + 1}</Td>

                    <Td>
                      <button
                        onClick={() => setSelectedFuelerHistory(fueler)}
                        className="text-blue-300 hover:text-yellow-400 font-semibold transition cursor-pointer"
                        title="Open fueler operations history"
                      >
                        {fueler.id}
                      </button>
                    </Td>

                    <Td strong>{fueler.name || "-"}</Td>

                    <Td>
                      <button
                        onClick={() => openFuelerEdit(fueler, "mobile")}
                        className="text-blue-300 hover:text-yellow-400 transition cursor-pointer"
                      >
                        {fueler.mobile || "-"}
                      </button>
                    </Td>

                    <Td>
                      <button
                        onClick={() => openFuelerEdit(fueler, "project")}
                        className="text-blue-300 hover:text-yellow-400 transition cursor-pointer"
                      >
                        {fueler.projectName || "-"}
                      </button>
                    </Td>

                    <Td>
                      <button
                        onClick={() => openFuelerEdit(fueler, "status")}
                        className={`px-2 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${getStatusBadgeClass(
                          fueler.status
                        )}`}
                      >
                        {fueler.status || "On Duty"}
                      </button>
                    </Td>

                    <Td>{formatNumber(fueler.operationsCount)}</Td>
                    <Td>{formatNumber(fueler.dieselQty)} L</Td>
                  </tr>
                ))}

                {fuelersWithKpi.length === 0 && (
                  <tr>
                    <Td colSpan={8}>No fuelers found.</Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-700 p-4 mb-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="text-lg font-bold text-yellow-400 italic underline">
                Diesel Quantity Per Fueler
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Total diesel quantity handled by each fueler based on Direct Refuel operations only
              </p>
            </div>

            <div className="text-right text-xs text-gray-400">
              <div>Total Diesel</div>
              <div className="text-yellow-300 font-bold text-base">
                {formatNumber(totalDiesel)} L
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#ccc" tick={{ fontSize: 11 }} />
              <YAxis stroke="#ccc" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="dieselQty" fill="#60a5fa" name="Diesel Qty" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {fuelerAuditLog.length > 0 && (
          <div className="bg-gray-950 border border-gray-700 rounded-2xl p-4 mb-5">
            <h3 className="text-yellow-400 font-semibold mb-3">
              Local Fuelers Audit Log
            </h3>

            <div className="max-h-44 overflow-auto">
              {fuelerAuditLog
                .slice()
                .reverse()
                .map((log, i) => (
                  <div
                    key={i}
                    className="text-xs text-gray-300 border-b border-gray-800 py-2"
                  >
                    <span className="text-blue-300">
                      {log.fuelerId} - {log.fuelerName}
                    </span>{" "}
                    | {log.field}: {" "}
                    <span className="text-red-300">{log.oldValue || "-"}</span>{" "}
                    → <span className="text-green-300">{log.newValue}</span>{" "}
                    | Reason: {log.reason} | By: {log.editedBy}
                  </div>
                ))}
            </div>
          </div>
        )}

        {selectedFuelerHistory && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-900 text-white w-[1180px] max-h-[88vh] rounded-3xl shadow-2xl border border-gray-700 overflow-hidden">
              <div className="p-5 border-b border-gray-700 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-yellow-400 italic underline">
                    Fueler Operations History
                  </h2>
                  <p className="text-gray-400 mt-1">
                    Fueler: {" "}
                    <span className="text-blue-300 font-semibold">
                      {selectedFuelerHistory.id} - {selectedFuelerHistory.name}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Read-only view based on Direct Refuel operations only
                  </p>
                </div>

                <button
                  onClick={() => setSelectedFuelerHistory(null)}
                  className="text-gray-400 hover:text-red-400 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 p-5 border-b border-gray-700 bg-gray-950/40">
                <Card
                  title="Fueler Operations"
                  value={formatNumber(selectedFuelerHistory.operationsCount)}
                />
                <Card
                  title="Diesel Quantity (L)"
                  value={formatNumber(selectedFuelerHistory.dieselQty)}
                />
                <Card
                  title="Project"
                  value={selectedFuelerHistory.projectName || "-"}
                />
              </div>

              <div className="p-5 overflow-auto max-h-[58vh]">
                <table className="min-w-[1050px] w-full border-collapse text-sm">
                  <thead className="bg-gray-800 sticky top-0 z-10">
                    <tr>
                      <Th>#</Th>
                      <Th>Date</Th>
                      <Th>Operation ID</Th>
                      <Th>Source Station</Th>
                      <Th>Equipment / Destination</Th>
                      <Th>Diesel Qty</Th>
                      <Th>Odometer</Th>
                      <Th>Type</Th>
                    </tr>
                  </thead>

                  <tbody>
                    {getFuelerOperations(selectedFuelerHistory.id).map((item, i) => {
                      const row = item.row;

                      return (
                        <tr key={item.originalIndex} className="hover:bg-gray-800 transition">
                          <Td>{i + 1}</Td>
                          <Td>{dateIndex !== -1 ? formatDisplayDate(row[dateIndex]) : "-"}</Td>
                          <Td>
                            {operationIdIndex !== -1
                              ? row[operationIdIndex] || "-"
                              : item.originalIndex + 1}
                          </Td>
                          <Td>{sourceIndex !== -1 ? row[sourceIndex] || "-" : "-"}</Td>
                          <Td>
                            {destinationIndex !== -1 ? row[destinationIndex] || "-" : "-"}
                          </Td>
                          <Td>
                            {dieselIndex !== -1 ? formatNumber(row[dieselIndex]) : "-"} L
                          </Td>
                          <Td>
                            {odometerIndex !== -1 ? formatNumber(row[odometerIndex]) : "-"}
                          </Td>
                          <Td>{typeIndex !== -1 ? row[typeIndex] || "-" : "-"}</Td>
                        </tr>
                      );
                    })}

                    {getFuelerOperations(selectedFuelerHistory.id).length === 0 && (
                      <tr>
                        <Td colSpan={8}>No Direct Refuel operations found for this fueler.</Td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showAddFueler && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-white text-black w-[620px] rounded-2xl shadow-2xl p-6">
              <div className="flex justify-between items-center mb-5 border-b pb-3">
                <div>
                  <h2 className="text-2xl font-bold">Add Fueler</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Local entry now, backend-ready structure later
                  </p>
                </div>

                <button
                  onClick={closeAddFueler}
                  className="text-gray-500 hover:text-black text-xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="font-medium text-gray-700">Fueler ID</label>
                  <input
                    type="text"
                    value={newFueler.id}
                    onChange={(e) => setNewFueler({ ...newFueler, id: e.target.value })}
                    className="border rounded-lg p-3 w-full mt-2"
                    placeholder="Example: FL-001"
                  />
                </div>

                <div>
                  <label className="font-medium text-gray-700">Fueler Name</label>
                  <input
                    type="text"
                    value={newFueler.name}
                    onChange={(e) => setNewFueler({ ...newFueler, name: e.target.value })}
                    className="border rounded-lg p-3 w-full mt-2"
                    placeholder="Enter fueler name"
                  />
                </div>

                <div>
                  <label className="font-medium text-gray-700">Mobile Number</label>
                  <input
                    type="text"
                    value={newFueler.mobile}
                    onChange={(e) => setNewFueler({ ...newFueler, mobile: e.target.value })}
                    className="border rounded-lg p-3 w-full mt-2"
                    placeholder="Enter mobile number"
                  />
                </div>

                <div>
                  <label className="font-medium text-gray-700">Status</label>
                  <select
                    value={newFueler.status}
                    onChange={(e) => setNewFueler({ ...newFueler, status: e.target.value })}
                    className="border rounded-lg p-3 w-full mt-2"
                  >
                    <option value="On Duty">On Duty</option>
                    <option value="In Vacation">In Vacation</option>
                    <option value="Retired / Resigned">Retired / Resigned</option>
                  </select>
                </div>
              </div>

              <div className="mb-5">
                <label className="font-medium text-gray-700">Project Name</label>
                <select
                  value={newFueler.projectName}
                  onChange={(e) => setNewFueler({ ...newFueler, projectName: e.target.value })}
                  className="border rounded-lg p-3 w-full mt-2"
                >
                  <option value="">Select Project</option>
                  {projects.map((project) => (
                    <option key={project.id || project.name} value={project.name || project.id}>
                      {project.name || project.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  onClick={closeAddFueler}
                  className="bg-gray-200 px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>

                <button
                  onClick={saveNewFueler}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg font-semibold"
                >
                  Save Fueler
                </button>
              </div>
            </div>
          </div>
        )}

        {editFueler && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-white text-black w-[560px] rounded-2xl shadow-2xl p-6">
              <div className="flex justify-between items-center mb-5 border-b pb-3">
                <div>
                  <h2 className="text-2xl font-bold">
                    Edit {editFueler.field === "mobile"
                      ? "Mobile"
                      : editFueler.field === "status"
                      ? "Status"
                      : "Project"}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Fueler: {editFueler.fuelerId} - {editFueler.fuelerName}
                  </p>
                </div>

                <button
                  onClick={closeFuelerEdit}
                  className="text-gray-500 hover:text-black text-xl"
                >
                  ×
                </button>
              </div>

              <div className="bg-gray-100 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-600">Old Value</p>
                <p className="text-xl font-bold">{editFueler.oldValue || "-"}</p>
              </div>

              <div className="mb-4">
                <label className="font-medium text-gray-700">New Value</label>

                {editFueler.field === "project" ? (
                  <select
                    value={editFueler.newValue}
                    onChange={(e) =>
                      setEditFueler({ ...editFueler, newValue: e.target.value })
                    }
                    className="border rounded-lg p-3 w-full mt-2"
                  >
                    <option value="">Select Project</option>
                    {projects.map((project) => (
                      <option key={project.id || project.name} value={project.name || project.id}>
                        {project.name || project.id}
                      </option>
                    ))}
                  </select>
                ) : editFueler.field === "status" ? (
                  <select
                    value={editFueler.newValue}
                    onChange={(e) =>
                      setEditFueler({ ...editFueler, newValue: e.target.value })
                    }
                    className="border rounded-lg p-3 w-full mt-2"
                  >
                    <option value="On Duty">On Duty</option>
                    <option value="In Vacation">In Vacation</option>
                    <option value="Retired / Resigned">Retired / Resigned</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={editFueler.newValue}
                    onChange={(e) =>
                      setEditFueler({ ...editFueler, newValue: e.target.value })
                    }
                    className="border rounded-lg p-3 w-full mt-2"
                    placeholder="Enter mobile number"
                  />
                )}
              </div>

              {editFueler.field !== "status" && (
                <div className="mb-4">
                  <label className="font-medium text-gray-700">Edit Reason</label>
                  <textarea
                    value={editFueler.reason}
                    onChange={(e) =>
                      setEditFueler({ ...editFueler, reason: e.target.value })
                    }
                    className="border rounded-lg p-3 w-full mt-2 h-24"
                    placeholder="Enter correction reason..."
                  />
                </div>
              )}

              <div className="mb-5">
                <label className="font-medium text-gray-700">Admin Password</label>
                <input
                  type="password"
                  value={editFueler.password}
                  onChange={(e) =>
                    setEditFueler({ ...editFueler, password: e.target.value })
                  }
                  className="border rounded-lg p-3 w-full mt-2"
                  placeholder="Enter admin password"
                />
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  onClick={closeFuelerEdit}
                  className="bg-gray-200 px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>

                <button
                  onClick={saveFuelerEdit}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg"
                >
                  Save Correction
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectsPage({ projects }) {
  const [showForm, setShowForm] = useState(false);
 
  return (
    <div className="bg-gray-900 min-h-screen text-white p-6 overflow-y-auto h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            Projects / Sites
          </h1>
 
          <p className="text-gray-400">
            Projects master data
          </p>
        </div>
 
        <button
          onClick={() => setShowForm(true)}
          className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold"
        >
          + Add Project
        </button>
      </div>
 
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card
          title="Total Projects"
          value={projects.length}
        />
 
        <Card
          title="Active Projects"
          value={
            projects.filter(
              (p) => p.status === "Active"
            ).length
          }
        />
 
        <Card
          title="Inactive Projects"
          value={
            projects.filter(
              (p) => p.status !== "Active"
            ).length
          }
        />
      </div>
 
      <div className="bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-yellow-400">
            Projects List
          </h2>
        </div>
 
        <div className="overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-700">
              <tr>
                <Th>#</Th>
                <Th>Project ID</Th>
                <Th>Project Name</Th>
                <Th>Status</Th>
              </tr>
            </thead>
 
            <tbody>
              {projects.map((project, i) => (
                <tr
                  key={project.id}
                  className="hover:bg-gray-700 transition"
                >
                  <Td>{i + 1}</Td>
 
                  <Td strong>{project.id}</Td>
 
                  <Td>{project.name}</Td>
 
                  <Td>{project.status}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
 
      {showForm && (
        <GenericModal title="Add Project" closeForm={() => setShowForm(false)} saveText="Save Project">
          <Field label="Project ID" placeholder="PRJ-001" />
          <Field label="Project Name" placeholder="Project name" />
          <div className="grid grid-cols-3 items-center gap-4">
            <label className="font-medium text-gray-700">Status</label>
            <select className="col-span-2 border rounded-lg p-2">
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </GenericModal>
      )}
 
    </div>
  );
}
 
 
function AddOperationModal({
  closeForm,
  fuelers,
  stations,
  transactionType,
  setTransactionType,
  destinationOptions,
  stationMeterPhoto,
  setStationMeterPhoto,
  assetPhoto,
  setAssetPhoto,
  assetMeterPhoto,
  setAssetMeterPhoto,
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white text-black w-[760px] rounded-xl shadow-xl p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6 border-b pb-3">
          <h2 className="text-2xl font-bold">Add Operation</h2>
          <button onClick={closeForm} className="text-gray-500 hover:text-black text-xl">×</button>
        </div>
 
        <div className="grid grid-cols-1 gap-4">
          <SelectField
            label="Fueler ID"
            options={fuelers
              .filter((f) => {
                const status = String(f.status || "On Duty").trim().toLowerCase();
                return status === "on duty" || status === "active";
              })
              .map((f) => f.id || f)}
            placeholder="Select Fueler"
          />
 
          <SelectField
            label="Source Station"
            options={stations.map((s) => s.id)}
            placeholder="Select Source Station"
          />
 
          <div className="grid grid-cols-3 items-center gap-4">
            <label className="font-medium text-gray-700">Transaction Type</label>
            <select
              className="col-span-2 border rounded-lg p-2"
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
            >
              <option value="">Select Transaction Type</option>
              <option value="Direct_Refuel">Direct_Refuel</option>
              <option value="Internal_Transfer">Internal_Transfer</option>
              <option value="External_Supply">External_Supply</option>
            </select>
          </div>
 
          <SelectField
            label="Destination ID"
            options={destinationOptions}
            placeholder={
              transactionType === ""
                ? "Select Transaction Type First"
                : transactionType === "Direct_Refuel"
                ? "Select Asset"
                : "Select Station"
            }
            disabled={transactionType === ""}
          />
 
          <Field label="Diesel Quantity" placeholder="Liters" />
          <Field label="Odometer" placeholder="Current odometer" />
 
          <div className="mt-4 border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">Photos</h3>
            <ImageField label="Station Meter Photo" preview={stationMeterPhoto} setPreview={setStationMeterPhoto} />
            <ImageField label="Asset Photo" preview={assetPhoto} setPreview={setAssetPhoto} />
            <ImageField label="Asset Meter Photo" preview={assetMeterPhoto} setPreview={setAssetMeterPhoto} />
          </div>
        </div>
 
        <div className="flex justify-end gap-3 mt-6 border-t pt-4">
          <button onClick={closeForm} className="bg-gray-200 px-4 py-2 rounded-lg">Cancel</button>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg">Save Operation</button>
        </div>
      </div>
    </div>
  );
}
 
function GenericModal({ title, closeForm, saveText, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white text-black w-[650px] rounded-xl shadow-xl p-6">
        <div className="flex justify-between items-center mb-6 border-b pb-3">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button onClick={closeForm} className="text-gray-500 hover:text-black text-xl">×</button>
        </div>
 
        <div className="grid grid-cols-1 gap-4">
          {children}
        </div>
 
        <div className="flex justify-end gap-3 mt-6 border-t pt-4">
          <button onClick={closeForm} className="bg-gray-200 px-4 py-2 rounded-lg">Cancel</button>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg">{saveText}</button>
        </div>
      </div>
    </div>
  );
}
 
function SelectField({ label, options, placeholder, disabled = false }) {
  return (
    <div className="grid grid-cols-3 items-center gap-4">
      <label className="font-medium text-gray-700">{label}</label>
      <select className="col-span-2 border rounded-lg p-2" disabled={disabled}>
        <option>{placeholder}</option>
        {options.map((item, i) => (
          <option key={i}>{item}</option>
        ))}
      </select>
    </div>
  );
}
 
function ImageField({ label, preview, setPreview }) {
  return (
    <div className="grid grid-cols-3 items-start gap-4 mb-4">
      <label className="font-medium text-gray-700">{label}</label>
      <div className="col-span-2">
        <input
          type="file"
          accept="image/*"
          className="border rounded-lg p-2 w-full"
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) setPreview(URL.createObjectURL(file));
          }}
        />
        {preview && (
          <img
            src={preview}
            alt={label}
            className="mt-3 w-32 h-32 object-cover rounded-lg border"
          />
        )}
      </div>
    </div>
  );
}
 
function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function isSameText(a, b) {
  return normalizeText(a) === normalizeText(b);
}

function getHeaderIndex(headers, possibleNames) {
  const cleanHeaders = headers.map((header) => normalizeHeader(header));

  for (const name of possibleNames) {
    const index = cleanHeaders.indexOf(normalizeHeader(name));

    if (index !== -1) return index;
  }

  return -1;
}

function getValue(row, headers, possibleNames) {
  const index = getHeaderIndex(headers, possibleNames);

  return index !== -1 ? row[index] : "";
}
 
function formatNumber(value) {
  const number = Number(value);
 
  if (isNaN(number)) return value || "-";
 
  return number.toLocaleString("en-US");
}
 
function Th({ children }) {
  return (
    <th className="p-3 text-left border border-gray-600 text-yellow-300 whitespace-nowrap">
      {children}
    </th>
  );
}
 
function Td({ children, strong = false }) {
  return (
    <td
      className={`p-3 border border-gray-600 whitespace-nowrap ${
        strong
          ? "font-bold text-blue-200"
          : "text-gray-100"
      }`}
    >
      {children}
    </td>
  );
}
 
function Field({
  label,
  placeholder = "",
  type = "text",
}) {
  return (
    <div className="grid grid-cols-3 items-center gap-4">
      <label className="font-medium text-gray-700">
        {label}
      </label>
 
      <input
        type={type}
        className="col-span-2 border rounded-lg p-2"
        placeholder={placeholder}
      />
    </div>
  );
}
 
function Card({ title, value }) {
  return (
    <div className="bg-gray-800 p-4 rounded-xl shadow">
      <p className="text-gray-400">{title}</p>
 
      <h2 className="text-3xl font-bold text-blue-200">
        {value}
      </h2>
    </div>
  );
}
function Toast({ type, message }) {
  const styles = {
    success: "bg-green-600",
    error: "bg-red-600",
    warning: "bg-yellow-500 text-black",
  };

  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
  };

  return (
    <div
      className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-xl text-white font-medium transition-all duration-300 ${
        styles[type] || "bg-gray-700"
      }`}
    >
      <span className="mr-2">{icons[type]}</span>
      {message}
    </div>
  );
}
function StatusBadge({ status }) {
  const cleanStatus = status?.trim().toLowerCase();

  const isActive = cleanStatus === "active";

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        isActive
          ? "bg-green-500/15 text-green-400 border border-green-500/30"
          : "bg-red-500/15 text-red-400 border border-red-500/30"
      }`}
    >
      {status || "-"}
    </span>
  );
}