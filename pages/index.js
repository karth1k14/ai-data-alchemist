import { useState, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

export default function Home() {
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [errors, setErrors] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const queryInput = useRef();

  const axiosConfig = {
    auth: {
      username: 'admin',
      password: 'password123'
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (jsonData.length > 0) {
      setColumnDefs(Object.keys(jsonData[0]).map((key) => ({ field: key, editable: true })));
      setRowData(jsonData);

      try {
        const response = await axios.post("http://localhost:8000/api/upload", { data: jsonData }, axiosConfig);
        setErrors(response.data.errors || []);
      } catch {
        alert("Failed to upload or validate data.");
      }
    }
  };

  const handleQuery = async () => {
    const response = await axios.post("http://localhost:8000/api/query", {
      query: queryInput.current.value,
      data: rowData
    }, axiosConfig);

    setFilteredData(response.data.filtered_data || []);
  };

  const exportCSV = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredData.length > 0 ? filteredData : rowData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CleanedData");
    XLSX.writeFile(workbook, "cleaned_data.csv");
  };

  const exportRules = async () => {
    try {
      const res = await axios.get("http://localhost:8000/rules.json");
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "rules.json";
      link.click();
    } catch {
      alert("Failed to download rules.json");
    }
  };

  return (
    <div style={{ margin: 20 }}>
      <h1>AI Data Alchemist</h1>

      <input type="file" accept=".csv,.xlsx" onChange={handleFileUpload} />

      <div style={{ marginTop: 20 }}>
        <h3>Natural Language Data Search</h3>
        <input type="text" ref={queryInput} placeholder="e.g. tasks with duration > 1" style={{ width: 400 }} />
        <button onClick={handleQuery}>Search</button>
      </div>

      {errors.length > 0 && (
        <div style={{ color: "red", marginTop: 10 }}>
          <h3>Validation Errors:</h3>
          <ul>{errors.map((err, idx) => <li key={idx}>{err}</li>)}</ul>
        </div>
      )}

      <div className="ag-theme-alpine" style={{ height: 500, marginTop: 20 }}>
        <AgGridReact
          rowData={filteredData.length > 0 ? filteredData : rowData}
          columnDefs={columnDefs}
          onCellValueChanged={(e) => {
            axios.post("http://localhost:8000/api/update", { row: e.data }, axiosConfig);
          }}
        />
      </div>

      <div style={{ marginTop: 20 }}>
        <button onClick={exportCSV}>Download Cleaned CSV</button>
        <button onClick={exportRules} style={{ marginLeft: 10 }}>Download Rules JSON</button>
      </div>
    </div>
  );
}
