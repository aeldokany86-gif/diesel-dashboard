"use client";
 
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
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
    project: getValue(row, fuelerHeaders, ["project_id", "project"]),
    status: getValue(row, fuelerHeaders, ["status"]),
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
 
  const renderPage = () => {
    if (page === "operations") {
      return (
        <OperationsPage
          data={data}
          headers={headers}
          assets={assets}
          stations={stations}
          fuelers={fuelers}
        />
      );
    }
 
    if (page === "assets") {
      return <AssetsPage assets={assets} />;
    }
 
    if (page === "stations") {
      return (
      <StationsPage
  stations={stations}
  data={data}
  headers={headers}
  showToast={showToast}
/>
      );
    }
    if (page === "fuelers") {
  return <FuelersPage fuelers={fuelers} />;
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
 
function OperationsPage({ data, headers, assets, stations, fuelers }) {
  const [showForm, setShowForm] = useState(false);
  const [transactionType, setTransactionType] = useState("");
  const [stationMeterPhoto, setStationMeterPhoto] = useState(null);
  const [assetPhoto, setAssetPhoto] = useState(null);
  const [assetMeterPhoto, setAssetMeterPhoto] = useState(null);
 
  const dieselIndex = headers.indexOf("diesel_quantity");
  const typeIndex = headers.indexOf("transaction_type");
  const destinationIndex = headers.indexOf("destination_id");
  const odometerIndex = headers.indexOf("odometer_at_fueling");
  const dateIndex = headers.indexOf("transaction_datetime");
 
  const getAsset = (assetId) =>
    assets.find((a) => a.id === assetId);
 
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
 
  const totalDiesel = data.reduce((sum, row) => {
    return sum + (parseFloat(row[dieselIndex]) || 0);
  }, 0);
 
  const dailyData = data.reduce((acc, row) => {
    const date = row[dateIndex]?.split(" ")[0] || "No Date";
    const diesel = parseFloat(row[dieselIndex]) || 0;
 
    const found = acc.find((d) => d.date === date);
 
    if (found) found.value += diesel;
    else acc.push({ date, value: diesel });
 
    return acc;
  }, []);
 
  const equipmentSummary = Object.values(
    data.reduce((acc, row) => {
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
          firstOdometer: odometer,
          lastOdometer: odometer,
        };
      }
 
      acc[equipmentNo].fuelConsumption += diesel;
 
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
      distance > 0
        ? (item.fuelConsumption / distance).toFixed(2)
        : "-";
 
    return {
      ...item,
      distance,
      efficiency,
    };
  });
return (
    <div className="bg-gray-900 min-h-screen text-white p-6 overflow-y-auto h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            Diesel Dashboard
          </h1>
 
          <p className="text-gray-400">
            Fuel transactions monitoring
          </p>
        </div>
 
        <button
          onClick={() => setShowForm(true)}
          className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold"
        >
          + Add Operation
        </button>
      </div>
 
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card
          title="Total Quantity (L)"
          value={formatNumber(totalDiesel)}
        />
 
        <Card
          title="Transactions"
          value={formatNumber(data.length)}
        />
 
        <Card
          title="Active Equipment"
          value={formatNumber(equipmentSummary.length)}
        />
      </div>
 
      <div className="bg-gray-800 p-4 rounded-xl mb-6">
        <h3 className="mb-4 text-yellow-400 font-semibold">
          Consumed Quantity Over Time
        </h3>
 
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyData}>
            <XAxis dataKey="date" stroke="#ccc" />
            <YAxis stroke="#ccc" />
            <Tooltip />
 
            <Line
              type="monotone"
              dataKey="value"
              stroke="#60a5fa"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
 
      <div className="bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex justify-between">
          <h2 className="text-xl font-semibold text-yellow-400">
            Equipment Consumption Summary
          </h2>
 
          <span className="text-sm text-gray-400">
            {equipmentSummary.length} records
          </span>
        </div>
 
        <div className="max-h-[360px] overflow-auto">
          <table className="min-w-[1250px] w-full border-collapse text-sm">
            <thead className="bg-gray-700 sticky top-0 z-10">
              <tr>
                <Th>#</Th>
                <Th>Equipment No.</Th>
                <Th>Project</Th>
                <Th>Equipment Type</Th>
                <Th>Last Odometer</Th>
                <Th>Fuel Consumption</Th>
                <Th>Distance</Th>
                <Th>Efficiency</Th>
              </tr>
            </thead>
 
            <tbody>
              {equipmentSummary.map((item, i) => (
                <tr
                  key={i}
                  className="hover:bg-gray-700 transition"
                >
                  <Td>{i + 1}</Td>
 
                  <Td strong>{item.equipmentNo}</Td>
 
                  <Td>{item.project}</Td>
 
                  <Td>{item.equipmentType}</Td>
 
                  <Td>
                    {formatNumber(item.lastOdometer)}
                  </Td>
 
                  <Td>
                    {formatNumber(item.fuelConsumption)}
                  </Td>
 
                  <Td>{formatNumber(item.distance)}</Td>
 
                  <Td>{item.efficiency}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
 
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
  );
}
 
function AssetsPage({ assets, projects = [], showToast }) {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

const [showAssetSettings, setShowAssetSettings] = useState(false);
const [showExportMenu, setShowExportMenu] = useState(false);

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
  return (
    <div className="bg-gray-900 min-h-screen text-white p-6 overflow-hidden h-screen">
      <div className="flex justify-between items-center mb-6 gap-4">
  <div>
    <h1 className="text-3xl font-bold">Assets</h1>
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

    <div className="relative">
      <button
        onClick={() => setShowAssetSettings(!showAssetSettings)}
        className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-yellow-400 text-yellow-400 px-4 py-3 rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
      >
        ⚙
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

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card title="Total Assets" value={visibleAssets.length} />
        <Card title="Active Assets" value={activeAssets.length} />
        <Card title="Inactive Assets" value={inactiveAssets.length} />
        <Card title="Retired Assets" value={retiredAssets.length} />
      </div>

      <div className="bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-yellow-400">
              Assets List
            </h2>
            <p className="text-sm text-gray-400">Fleet operational assets</p>
          </div>

          <span className="text-sm text-gray-400">
            {filteredAssets.length} assets
          </span>
        </div>

        <div className="max-h-[270px] overflow-auto">
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
  );
}
function StationsPage({ stations, data, headers, showToast }) {
  const [showForm, setShowForm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [selectedStation, setSelectedStation] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [localAdjustments, setLocalAdjustments] = useState([]);

  const [showLiterPrice, setShowLiterPrice] = useState(false);
  const [newLiterPrice, setNewLiterPrice] = useState("");
  const [showPriceConfirm, setShowPriceConfirm] = useState(false);
  const [showPricePassword, setShowPricePassword] = useState(false);
  const [pricePassword, setPricePassword] = useState("");

  const currentUser = {
    name: "Amr",
    role: "Admin",
  };

  const countryFlag = "🇸🇦";
  const currency = "SAR";
  const [literPrice, setLiterPrice] = useState(2.33);

  const dieselIndex = headers.indexOf("diesel_quantity");
  const typeIndex = headers.indexOf("transaction_type");
  const sourceIndex = headers.indexOf("source_station");
  const destinationIndex = headers.indexOf("destination_id");

  const calculateStationBalance = (station) => {
    let currentStock = station.openingBalance || 0;

    data.forEach((row) => {
      const type = row[typeIndex];
      const source = row[sourceIndex];
      const destination = row[destinationIndex];
      const qty = parseFloat(row[dieselIndex]) || 0;

      if (type === "Direct_Refuel" && source === station.id) currentStock -= qty;
      if (type === "Internal_Transfer" && source === station.id) currentStock -= qty;
      if (type === "Internal_Transfer" && destination === station.id) currentStock += qty;
      if (type === "External_Supply" && destination === station.id) currentStock += qty;
    });

    localAdjustments.forEach((adj) => {
      if (adj.stationId === station.id) {
        currentStock += adj.adjustmentQty;
      }
    });

    return currentStock;
  };

  const realStations = stations.filter(
    (station) => station.id !== "External_Supply"
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

    setLiterPrice(Number(newLiterPrice));
    setShowPricePassword(false);
    setPricePassword("");
    setNewLiterPrice("");

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

    const csvRows = stationsWithBalance.map((station) => [
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
    <div className="bg-gray-900 min-h-screen text-white p-6 overflow-y-auto h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Fuel Stations</h1>
          <p className="text-gray-400">Fuel stock management</p>
        </div>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSettings(!showSettings);
              if (showSettings) {
                setShowExportMenu(false);
              }
            }}
            className="group bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-yellow-400 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 p-1"
          >
            <img
              src="/icons/fuel-settings.png"
              alt="Settings"
              className="w-12 h-20 object-contain transition-all duration-300 group-hover:scale-110 drop-shadow-[0_0_12px_rgba(250,204,21,0.45)]"
            />
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

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card title="Total Stations" value={realStations.length} />

        <Card
          title="Total Capacity"
          value={formatNumber(
            realStations.reduce((sum, s) => sum + (s.capacity || 0), 0)
          )}
        />

        <Card
          title="Current Stock"
          value={formatNumber(
            stationsWithBalance.reduce(
              (sum, s) => sum + (s.currentStock || 0),
              0
            )
          )}
        />
      </div>

      <div className="bg-gray-800 rounded-2xl shadow-xl p-5">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-xl font-semibold text-yellow-400">
              Stations Stock
            </h2>
            <p className="text-sm text-gray-400">
              Live stock overview by station
            </p>
          </div>

          <span className="text-sm text-gray-400">
            {realStations.length} stations
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {stationsWithBalance.map((station) => (
            <div
              key={station.id}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-5 shadow-lg hover:border-yellow-400/60 hover:shadow-yellow-400/10 transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-blue-200">
                    {station.id}
                  </h3>
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
                <span>{countryFlag} Liter Price</span>
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
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPriceConfirm(false);
                  setNewLiterPrice("");
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
            options={fuelers.map((f) => f.id || f)}
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
 
function getValue(row, headers, possibleNames) {
  const clean = (value) =>
    value?.trim().toLowerCase().replaceAll(" ", "_");
 
  const cleanHeaders = headers.map((h) => clean(h));
 
  for (const name of possibleNames) {
    const index = cleanHeaders.indexOf(clean(name));
 
    if (index !== -1) return row[index];
  }
 
  return "";
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