import React, { useState, useEffect } from 'react';
import { Database, Search, Filter, Download, RefreshCw } from 'lucide-react';

const TablesPage = () => {
  const [activeTable, setActiveTable] = useState('elections');
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  const BACKEND_API = process.env.REACT_APP_BACKEND_API || 'http://localhost:5000';

  const tables = [
    { 
      name: 'elections', 
      label: 'Elections',
      columns: ['uuid', 'title', 'description', 'location', 'creator', 'start_time', 'end_time', 'total_voters', 'is_public', 'allow_anonymous', 'allow_delegation', 'merkle_root', 'positions']
    },
    { 
      name: 'voter_keys', 
      label: 'Voter Keys',
      columns: ['id', 'election_id', 'voter_address', 'distributed', 'distributed_at', 'voter_key', 'key_hash', 'proof']
    },
    { 
      name: 'votes', 
      label: 'Votes',
      columns: ['vote_id', 'election_uuid', 'voter_address', 'position_id', 'candidate_name', 'chain_id', 'tx_hash', 'timestamp']
    }
  ];

  useEffect(() => {
    fetchTableData(activeTable);
  }, [activeTable]);

  const fetchTableData = async (tableName) => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '';
      
      if (tableName === 'elections') {
        endpoint = `${BACKEND_API}/api/elections`;
      } else if (tableName === 'voter_keys') {
        endpoint = `${BACKEND_API}/api/voter-keys`;
      } else if (tableName === 'votes') {
        endpoint = `${BACKEND_API}/api/votes`;
      }

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`Failed to fetch ${tableName}`);
      
      const data = await response.json();
      setTableData(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchTableData(activeTable);
  };

  const handleExport = () => {
    const csv = convertToCSV(tableData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTable}_${Date.now()}.csv`;
    a.click();
  };

  const convertToCSV = (data) => {
    if (!data.length) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
      headers.map(header => JSON.stringify(row[header] || '')).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  };

  const filteredData = tableData.filter(row => 
    Object.values(row).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const formatValue = (value, key) => {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (key === 'created_at' || key === 'updated_at' || key === 'distributed_at' || key === 'timestamp') {
      return new Date(value).toLocaleString();
    }
    if (key === 'start_time' || key === 'end_time') {
      return new Date(value * 1000).toLocaleString();
    }
    if (typeof value === 'object') return JSON.stringify(value);
    if (String(value).length > 50) return String(value).substring(0, 47) + '...';
    return String(value);
  };

  const currentTable = tables.find(t => t.name === activeTable);

  return (
    <div className="tables-page">
      {/* Page Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Database Tables</h1>
          <p className="page-subtitle">View and manage Supabase data</p>
        </div>
        <div className="header-actions">
          <button className="btn-action" onClick={handleRefresh}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="btn-action" onClick={handleExport}>
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table Tabs */}
      <div className="table-tabs">
        {tables.map(table => (
          <button
            key={table.name}
            className={`table-tab ${activeTable === table.name ? 'active' : ''}`}
            onClick={() => setActiveTable(table.name)}
          >
            <Database size={16} />
            {table.label}
            {activeTable === table.name && (
              <span className="tab-badge">{filteredData.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="search-bar-container">
        <div className="search-input-wrapper">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder={`Search ${currentTable?.label}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="search-stats">
          Showing {filteredData.length} of {tableData.length} records
        </div>
      </div>

      {/* Table Card */}
      <div className="dashboard-card">
        <div className="card-header">
          <h2 className="card-title">{currentTable?.label} Table</h2>
        </div>

        {loading ? (
          <div className="table-loading">
            <div className="spinner-pulse">
              <div className="pulse-ring"></div>
              <div className="pulse-ring pulse-ring-2"></div>
            </div>
            <p>Loading data...</p>
          </div>
        ) : error ? (
          <div className="table-error">
            <p>Error: {error}</p>
            <button className="btn-action" onClick={handleRefresh}>
              Try Again
            </button>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="table-empty">
            <Database size={48} />
            <h3>No Data Found</h3>
            <p>
              {tableData.length === 0 
                ? `The ${currentTable?.label} table is empty`
                : 'No records match your search'}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {currentTable?.columns.map(col => (
                    <th key={col}>{col.replace(/_/g, ' ').toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, idx) => (
                  <tr key={idx}>
                    {currentTable?.columns.map(col => (
                      <td key={col} title={String(row[col] || 'NULL')}>
                        {formatValue(row[col], col)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TablesPage;