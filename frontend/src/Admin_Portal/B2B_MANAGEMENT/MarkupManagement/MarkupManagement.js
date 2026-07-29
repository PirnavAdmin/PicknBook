/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { b2bAdminService } from '../../../services/b2bAdminService';
import '../b2bShared.css';

function MarkupManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'Flight'; // Flight, Bus, Hotel, Agent Wise

  const [activeTab, setActiveTab] = useState('Flight');
  const [markups, setMarkups] = useState(null);
  const [agents, setAgents] = useState([]);
  
  // Agent wise markup override
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [flightVal, setFlightVal] = useState('');
  const [busVal, setBusVal] = useState('');
  const [hotelVal, setHotelVal] = useState('');

  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  const loadData = async () => {
    setMarkups(b2bAdminService.getMarkups());
    try {
      const activeList = await b2bAdminService.getAgents('Active');
      setAgents(Array.isArray(activeList) ? activeList : []);
    } catch (e) {
      console.error(e);
    }
  };

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleUpdateConfig = (newMarkups) => {
    setMarkups(newMarkups);
    b2bAdminService.updateMarkups(newMarkups);
    triggerToast('Markup settings updated successfully!');
  };

  const handleSimpleMarkupChange = (service, index, field, value) => {
    const list = [...markups[service]];
    list[index][field] = field === 'value' ? Number(value) : value;
    handleUpdateConfig({ ...markups, [service]: list });
  };

  const handleAddAgentOverride = (e) => {
    e.preventDefault();
    if (!selectedAgentId) return;

    const agent = agents.find(a => String(a.id) === String(selectedAgentId));
    if (!agent) return;

    const updatedAgentWise = [...markups.agentWise];
    
    const existingIndex = updatedAgentWise.findIndex(aw => String(aw.agentId) === String(selectedAgentId));
    const newOverride = {
      agentId: String(agent.id),
      agentName: agent.companyName,
      flight: Number(flightVal) || 0,
      bus: Number(busVal) || 0,
      hotel: Number(hotelVal) || 0
    };

    if (existingIndex !== -1) {
      updatedAgentWise[existingIndex] = newOverride;
    } else {
      updatedAgentWise.push(newOverride);
    }

    handleUpdateConfig({ ...markups, agentWise: updatedAgentWise });
    setSelectedAgentId('');
    setFlightVal('');
    setBusVal('');
    setHotelVal('');
  };

  const handleRemoveAgentOverride = (agentId) => {
    const updatedAgentWise = markups.agentWise.filter(aw => String(aw.agentId) !== String(agentId));
    handleUpdateConfig({ ...markups, agentWise: updatedAgentWise });
  };

  if (!markups) return <div className="b2b-container">Loading Markups...</div>;

  return (
    <div className="b2b-container">
      <div className="b2b-header-row">
        <div>
          <h1 className="b2b-title">Markup Management</h1>
          <p className="b2b-subtitle">Set domestic and international GDS markup structures by fixed value or percentage rules.</p>
        </div>
      </div>

      {toastMsg && (
        <div className="b2b-badge b2b-badge-success" style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '20px', width: 'fit-content' }}>
          ✓ {toastMsg}
        </div>
      )}

      <div className="b2b-tabs">
        {['Flight', 'Bus', 'Hotel', 'Agent Wise'].map(tab => (
          <button
            key={tab}
            className={`b2b-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab);
              setSearchParams({ tab });
            }}
          >
            {tab} Markup
          </button>
        ))}
      </div>

      {['Flight', 'Bus', 'Hotel'].includes(activeTab) && (
        <div className="b2b-card">
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>{activeTab} Base Markup Settings</h3>
          <div className="b2b-table-wrap">
            <table className="b2b-table">
              <thead>
                <tr>
                  <th>Product Category</th>
                  <th>Markup Type</th>
                  <th>Markup Value</th>
                </tr>
              </thead>
              <tbody>
                {markups[activeTab.toLowerCase()].map((m, i) => (
                  <tr key={m.type}>
                    <td style={{ fontWeight: 'bold' }}>{m.type}</td>
                    <td>
                      <select 
                        className="b2b-select"
                        value={m.markupType}
                        onChange={(e) => handleSimpleMarkupChange(activeTab.toLowerCase(), i, 'markupType', e.target.value)}
                        style={{ width: '150px' }}
                      >
                        <option value="Fixed">Fixed Amount (₹)</option>
                        <option value="Percentage">Percentage (%)</option>
                      </select>
                    </td>
                    <td>
                      <input 
                        type="number" 
                        className="b2b-input" 
                        value={m.value} 
                        onChange={(e) => handleSimpleMarkupChange(activeTab.toLowerCase(), i, 'value', e.target.value)}
                        style={{ width: '120px' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Agent Wise' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
          <div className="b2b-card">
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Set Custom Agent Markup Override</h3>
            <form onSubmit={handleAddAgentOverride}>
              <div className="b2b-form-group">
                <label className="b2b-label">Travel Agent *</label>
                <select 
                  className="b2b-select"
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Agent --</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.companyName}</option>
                  ))}
                </select>
              </div>
              <div className="b2b-form-group">
                <label className="b2b-label">Flight Markup (Fixed ₹)</label>
                <input 
                  type="number" 
                  className="b2b-input" 
                  placeholder="e.g., 200"
                  value={flightVal}
                  onChange={(e) => setFlightVal(e.target.value)}
                />
              </div>
              <div className="b2b-form-group">
                <label className="b2b-label">Bus Markup (Fixed ₹)</label>
                <input 
                  type="number" 
                  className="b2b-input" 
                  placeholder="e.g., 30"
                  value={busVal}
                  onChange={(e) => setBusVal(e.target.value)}
                />
              </div>
              <div className="b2b-form-group">
                <label className="b2b-label">Hotel Markup (Percentage %)</label>
                <input 
                  type="number" 
                  className="b2b-input" 
                  placeholder="e.g., 4.0"
                  value={hotelVal}
                  onChange={(e) => setHotelVal(e.target.value)}
                />
              </div>
              <button type="submit" className="b2b-btn b2b-btn-primary" style={{ width: '100%' }}>
                Set Agent Markup Exception
              </button>
            </form>
          </div>

          <div className="b2b-card">
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Active Markup Exceptions</h3>
            <div className="b2b-table-wrap">
              <table className="b2b-table">
                <thead>
                  <tr>
                    <th>Agent Name</th>
                    <th>Flight Markup</th>
                    <th>Bus Markup</th>
                    <th>Hotel Markup</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {markups.agentWise.length > 0 ? (
                    markups.agentWise.map(aw => (
                      <tr key={aw.agentId}>
                        <td style={{ fontWeight: '600' }}>{aw.agentName}</td>
                        <td>₹{aw.flight} (Fixed)</td>
                        <td>₹{aw.bus} (Fixed)</td>
                        <td>{aw.hotel}% (Percentage)</td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="b2b-btn b2b-btn-danger"
                            onClick={() => handleRemoveAgentOverride(aw.agentId)}
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            ✕ Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--b2b-muted)' }}>
                        No custom agent markup rules configured.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarkupManagement;
