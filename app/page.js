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
 
function AssetsPage({ assets }) {
  const [showForm, setShowForm] = useState(false);
 
  return (
    <div className="bg-gray-900 min-h-screen text-white p-6 overflow-y-auto h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Assets</h1>
 
          <p className="text-gray-400">
            Equipment master data
          </p>
        </div>
 
        <button
          onClick={() => setShowForm(true)}
          className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold"
        >
          + Add Asset
        </button>
      </div>
 
      <div className="bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex justify-between">
          <h2 className="text-xl font-semibold text-yellow-400">
            Assets List
          </h2>
 
          <span className="text-sm text-gray-400">
            {assets.length} assets
          </span>
        </div>
 
        <div className="overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-700">
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
              {assets.map((asset, i) => (
                <tr
                  key={asset.id}
                  className="hover:bg-gray-700 transition"
                >
                  <Td>{i + 1}</Td>
 
                  <Td strong>{asset.id}</Td>
 
                  <Td>{asset.project || "-"}</Td>
 
                  <Td>{asset.type || "-"}</Td>
 
                  <Td>{asset.category || "-"}</Td>
 
                  <Td>
                    {formatNumber(asset.odometer)}
                  </Td>
 
                  <Td>
                    {formatNumber(asset.fuelTank)} L
                  </Td>
 
                  <Td>{asset.status || "-"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
 
      {showForm && (
        <GenericModal title="Add Asset" closeForm={() => setShowForm(false)} saveText="Save Asset">
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
 
    </div>
  );
}
 
function StationsPage({ stations, data, headers, showToast }) {
  const [showForm, setShowForm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [selectedStation, setSelectedStation] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [localAdjustments, setLocalAdjustments] = useState([]);

  const currentUser = {
    name: "Amr",
    role: "Admin",
  };

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

  const stationsWithBalance = stations.map((station) => {
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
  setSelectedStation(null);
  setShowConfirm(true);
};

  const proceedToPassword = () => {
    if (!selectedStation) {
      showToast("warning", "Please select a station first.");
      return;
    }

    setShowConfirm(false);
    setShowPassword(true);
  };
useEffect(() => {
  const handleClickOutside = () => {
    setShowSettings(false);
  };

  if (showSettings) {
    document.addEventListener("click", handleClickOutside);
  }

  return () => {
    document.removeEventListener("click", handleClickOutside);
  };
}, [showSettings]);
  const confirmInventoryAdjustment = () => {
    if (!adminPassword) {
      showToast("error", "Please enter your password.");
      return;
    }

    const adjustmentQty = -selectedStation.currentStock;

    setLocalAdjustments([
      ...localAdjustments,
      {
        stationId: selectedStation.id,
        adjustmentQty,
        reason: "Inventory Adjustment Reconciliation",
        createdBy: currentUser.name,
        createdAt: new Date().toISOString(),
      },
    ]);

    setShowPassword(false);
    setSelectedStation(null);
    setAdminPassword("");

    showToast(
  "success",
  "Inventory Adjustment completed successfully."
);
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
  }}
  className="group bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-yellow-400 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 p-1"
>
  <img
    src="/icons/fuel-settings.png"
    alt="Settings"
    className="w-15 h-15 object-contain transition-all duration-300 group-hover:scale-110 drop-shadow-[0_0_12px_rgba(250,204,21,0.45)]"
  />
</button>

  {showSettings && (
    <div className="absolute right-0 mt-3 w-60 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-40 backdrop-blur-xl">
      <button
        onClick={() => {
          setShowSettings(false);
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
    </div>
  )}
</div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card title="Total Stations" value={stations.length} />

        <Card
          title="Total Capacity"
          value={formatNumber(
            stations.reduce((sum, s) => sum + (s.capacity || 0), 0)
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

      <div className="bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex justify-between">
          <h2 className="text-xl font-semibold text-yellow-400">
            Stations Stock
          </h2>

          <span className="text-sm text-gray-400">
            {stations.length} stations
          </span>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[1000px] w-full border-collapse text-sm">
            <thead className="bg-gray-700 sticky top-0 z-10">
              <tr>
                <Th>#</Th>
                <Th>Station ID</Th>
                <Th>Status</Th>
                <Th>Project</Th>
                <Th>Capacity</Th>
                <Th>Current Stock</Th>
                <Th>Tank Level</Th>
              </tr>
            </thead>

            <tbody>
              {stationsWithBalance.map((station, i) => (
                <tr key={station.id} className="hover:bg-gray-700 transition">
                  <Td>{i + 1}</Td>
                  <Td strong>{station.id}</Td>
                  <Td>
  <StatusBadge status={station.status} />
</Td>
                  <Td>{station.project || "-"}</Td>
                  <Td>{formatNumber(station.capacity)}</Td>
                  <Td>{formatNumber(station.currentStock)}</Td>
                  <Td>
                    <FuelLevelIcon percentage={station.percentage} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
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
            <option>In-Active</option>
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
            {stations.map((s) => (
              <option key={s.id}>{s.id}</option>
            ))}
          </select>
        </div>

        <Field label="Project" placeholder="New project" />

        <div className="grid grid-cols-3 items-center gap-4">
          <label className="font-medium text-gray-700">Status</label>
          <select className="col-span-2 border rounded-lg p-2">
            <option>Active</option>
            <option>In-Active</option>
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
                <p><strong>Current Balance:</strong> {formatNumber(selectedStation.currentStock)} L</p>
                <p><strong>Adjustment Qty:</strong> {formatNumber(-selectedStation.currentStock)} L</p>
                <p><strong>Final Balance:</strong> 0 L</p>
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
                Confirm Confirm Adjustment
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
function FuelersPage({ fuelers }) {
  const [showForm, setShowForm] = useState(false);
 
  return (
    <div className="bg-gray-900 min-h-screen text-white p-6 overflow-y-auto h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            Fuelers
          </h1>
 
          <p className="text-gray-400">
            Fuel operators management
          </p>
        </div>
 
        <button
          onClick={() => setShowForm(true)}
          className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold"
        >
          + Add Fueler
        </button>
      </div>
 
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card title="Total Fuelers" value={fuelers.length} />
 
        <Card
          title="Active Fuelers"
          value={
            fuelers.filter((f) => f.status === "Active")
              .length
          }
        />
 
        <Card
          title="Projects Assigned"
          value={
            new Set(fuelers.map((f) => f.project)).size
          }
        />
      </div>
 
      <div className="bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-yellow-400">
            Fuelers List
          </h2>
        </div>
 
        <div className="overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-700">
              <tr>
                <Th>#</Th>
                <Th>Fueler ID</Th>
                <Th>Name</Th>
                <Th>Project</Th>
                <Th>Status</Th>
              </tr>
            </thead>
 
            <tbody>
              {fuelers.map((fueler, i) => (
                <tr
                  key={fueler.id}
                  className="hover:bg-gray-700 transition"
                >
                  <Td>{i + 1}</Td>
 
                  <Td strong>{fueler.id}</Td>
 
                  <Td>{fueler.name}</Td>
 
                  <Td>{fueler.project}</Td>
 
                  <Td>{fueler.status}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
 
      {showForm && (
        <GenericModal title="Add Fueler" closeForm={() => setShowForm(false)} saveText="Save Fueler">
          <Field label="Fueler ID" placeholder="F-001" />
          <Field label="Fueler Name" placeholder="Operator name" />
          <Field label="Project" placeholder="Project ID" />
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