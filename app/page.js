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

export default function Home() {
  const [page, setPage] = useState("operations");
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    async function fetchData() {
      const res = await fetch(
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vRX0JNF_J9UzMQ5lyr7pxPrdL0GeLD8TkCf4MPNGdyOPT9rATlsmUnBQjx0MVoNy4nPHiRKc7jtmeku/pub?gid=836310880&single=true&output=csv"
      );

      const text = await res.text();
      const rows = text.split("\n").map((row) => row.split(","));

      setHeaders(rows[0]);
      setData(rows.slice(1));
    }

    fetchData();
  }, []);

  const renderPage = () => {
    if (page === "operations") {
      return (
        <OperationsPage
          data={data}
          headers={headers}
          filter={filter}
          setFilter={setFilter}
        />
      );
    }

    return (
      <div className="bg-gray-900 min-h-screen text-white p-6">
        <h2 className="text-2xl font-bold">{page} Page</h2>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-950 text-white shadow p-4">
        <h1 className="text-2xl font-bold mb-6 text-yellow-400">
          Diesel System
        </h1>

        <ul className="space-y-3">
          <li>
            <button onClick={() => setPage("operations")}>Operations</button>
          </li>
          <li>
            <button onClick={() => setPage("assets")}>Assets</button>
          </li>
          <li>
            <button onClick={() => setPage("stations")}>Stations</button>
          </li>
          <li>
            <button onClick={() => setPage("fuelers")}>Fuelers</button>
          </li>
          <li>
            <button onClick={() => setPage("projects")}>Projects / Sites</button>
          </li>
          <li>
            <button onClick={() => setPage("reports")}>Reports</button>
          </li>
        </ul>
      </div>

      {/* Content */}
      <div className="flex-1">{renderPage()}</div>
    </div>
  );
}

function OperationsPage({ data, headers, filter, setFilter }) {
  const [showForm, setShowForm] = useState(false);
  const [transactionType, setTransactionType] = useState("");

  const [stationMeterPhoto, setStationMeterPhoto] = useState(null);
  const [assetPhoto, setAssetPhoto] = useState(null);
  const [assetMeterPhoto, setAssetMeterPhoto] = useState(null);

  const fuelers = ["F-001", "F-002", "F-003"];
  const stations = ["ST-001", "ST-002", "ST-003"];
  const assets = ["1-316", "1-298", "1-262"];

  const destinationOptions =
    transactionType === "Direct_Refuel"
      ? assets
      : transactionType === "Internal_Transfer"
      ? stations
      : transactionType === "External_Supply"
      ? stations
      : [];

  const closeForm = () => {
    setShowForm(false);
    setTransactionType("");
    setStationMeterPhoto(null);
    setAssetPhoto(null);
    setAssetMeterPhoto(null);
  };

  const dieselIndex = headers.indexOf("diesel_quantity");
  const typeIndex = headers.indexOf("transaction_type");
  const dateIndex = headers.indexOf("transaction_datetime");

  const filteredData =
    filter === "All" ? data : data.filter((row) => row[typeIndex] === filter);

  const totalTransactions = filteredData.length;

  const totalDiesel = filteredData.reduce((sum, row) => {
    return sum + (parseFloat(row[dieselIndex]) || 0);
  }, 0);

  const dailyData = filteredData.reduce((acc, row) => {
    const date = row[dateIndex]?.split(" ")[0] || "No Date";
    const diesel = parseFloat(row[dieselIndex]) || 0;

    const found = acc.find((d) => d.date === date);
    if (found) found.value += diesel;
    else acc.push({ date, value: diesel });

    return acc;
  }, []);

  return (
    <div className="bg-gray-900 min-h-screen text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Diesel Dashboard</h1>
          <p className="text-gray-400">Fuel transactions monitoring</p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold"
        >
          + Add Operation
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <select
          className="bg-gray-800 p-2 rounded border border-gray-700"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="All">All Transaction Types</option>
          <option value="Direct_Refuel">Direct Refuel</option>
          <option value="Internal_Transfer">Internal Transfer</option>
          <option value="External_Supply">External Supply</option>
        </select>

        <select className="bg-gray-800 p-2 rounded border border-gray-700">
          <option>Select Date Range</option>
        </select>

        <select className="bg-gray-800 p-2 rounded border border-gray-700">
          <option>Equipment No.</option>
        </select>

        <select className="bg-gray-800 p-2 rounded border border-gray-700">
          <option>Asset Type</option>
        </select>

        <select className="bg-gray-800 p-2 rounded border border-gray-700">
          <option>Source Station</option>
        </select>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card title="Total Quantity (L)" value={totalDiesel} />
        <Card title="Transactions" value={totalTransactions} />
      </div>

      {/* Line Chart */}
      <div className="bg-gray-800 p-4 rounded-xl mb-6">
        <h3 className="mb-4 text-yellow-400 font-semibold">
          Consumed Quantity Over Time
        </h3>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyData}>
            <XAxis dataKey="date" stroke="#ccc" />
            <YAxis stroke="#ccc" />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#60a5fa" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
     <div className="bg-gray-800 rounded-xl shadow overflow-hidden mt-6 h-[360px]">
  <div className="p-4 border-b border-gray-700">
    <h2 className="text-xl font-semibold text-yellow-400">
      Fuel Transactions
    </h2>
  </div>

  <div className="h-[300px] overflow-x-auto overflow-y-auto">
    <table className="min-w-[1800px] text-sm border-collapse">
      <thead className="bg-gray-700 sticky top-0 z-10">
        <tr>
          {headers.map((h, i) => (
            <th key={i} className="p-3 text-left border border-gray-600">
              {h}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {filteredData.map((row, i) => (
          <tr key={i} className="hover:bg-gray-700">
            {row.map((cell, j) => (
              <td key={j} className="p-3 border border-gray-600 whitespace-nowrap">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

      {/* Add Operation Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black w-[760px] rounded-xl shadow-xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h2 className="text-2xl font-bold">Add Operation</h2>

              <button
                onClick={closeForm}
                className="text-gray-500 hover:text-black text-xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <SelectField
                label="Fueler ID"
                options={fuelers}
                placeholder="Select Fueler"
              />

              <SelectField
                label="Source Station"
                options={stations}
                placeholder="Select Source Station"
              />

              <div className="grid grid-cols-3 items-center gap-4">
                <label className="font-medium text-gray-700">
                  Transaction Type
                </label>
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

                <ImageField
                  label="Station Meter Photo"
                  preview={stationMeterPhoto}
                  setPreview={setStationMeterPhoto}
                />

                <ImageField
                  label="Asset Photo"
                  preview={assetPhoto}
                  setPreview={setAssetPhoto}
                />

                <ImageField
                  label="Asset Meter Photo"
                  preview={assetMeterPhoto}
                  setPreview={setAssetMeterPhoto}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
              <button
                onClick={closeForm}
                className="bg-gray-200 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button className="bg-green-600 text-white px-4 py-2 rounded-lg">
                Save Operation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, placeholder = "", type = "text" }) {
  return (
    <div className="grid grid-cols-3 items-center gap-4">
      <label className="font-medium text-gray-700">{label}</label>
      <input
        type={type}
        className="col-span-2 border rounded-lg p-2"
        placeholder={placeholder}
      />
    </div>
  );
}

function SelectField({ label, options, placeholder, disabled = false }) {
  return (
    <div className="grid grid-cols-3 items-center gap-4">
      <label className="font-medium text-gray-700">{label}</label>
      <select
        className="col-span-2 border rounded-lg p-2"
        disabled={disabled}
      >
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
            if (file) {
              setPreview(URL.createObjectURL(file));
            }
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

function Card({ title, value }) {
  return (
    <div className="bg-gray-800 p-4 rounded-xl shadow">
      <p className="text-gray-400">{title}</p>
      <h2 className="text-3xl font-bold text-blue-200">{value}</h2>
    </div>
  );
}