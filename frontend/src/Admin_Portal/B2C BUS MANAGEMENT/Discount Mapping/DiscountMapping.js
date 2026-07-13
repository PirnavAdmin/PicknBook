import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaEdit, FaTrashAlt, FaTimes } from 'react-icons/fa';
import { useLocation } from 'react-router-dom';
import './DiscountMapping.css';
import AdminPagination from '../../../components/AdminPagination';
import {
  listDiscounts,
  getConditions,
  createCondition,
  updateCondition,
  deleteCondition
} from '../../../services/adminBusService';

const POPULAR_ROUTES = [
  "Hyderabad-Bangalore",
  "Bangalore-Hyderabad",
  "Vijayawada-Hyderabad",
  "Hyderabad-Vijayawada",
  "Tirupathi-Vijayawada",
  "Visakhapatnam-Vijayawada",
  "Hyderabad-Warangal",
  "Bengaluru-Mysuru",
  "Bengaluru-Mangaluru",
  "Hubballi-Bengaluru",
  "Thiruvananthapuram-Kochi",
  "Kochi-Kozhikode",
  "Ahmedabad-Rajkot",
  "Surat-Ahmedabad",
  "Vadodara-Ahmedabad"
];

function DiscountMapping() {
  const location = useLocation();

  // Discounts selection list
  const [discounts, setDiscounts] = useState([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState('');
  const [loadingDiscounts, setLoadingDiscounts] = useState(true);
  const [errorDiscounts, setErrorDiscounts] = useState('');

  // Selected discount details & conditions
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [conditions, setConditions] = useState([]);
  const [loadingConditions, setLoadingConditions] = useState(false);
  const [conditionError, setConditionError] = useState('');

  // Form states for creating/editing condition
  const [newCondition, setNewCondition] = useState({
    conditionType: 'SeatType',
    conditionOperator: 'Equals',
    value1: 'Sleeper',
    value2: null
  });
  const [editingConditionId, setEditingConditionId] = useState(null);
  const [savingCondition, setSavingCondition] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDiscountId]);

  const paginatedConditions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return conditions.slice(startIndex, startIndex + itemsPerPage);
  }, [conditions, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(conditions.length / itemsPerPage));

  // Load all discounts
  const loadDiscountsData = useCallback(async () => {
    setLoadingDiscounts(true);
    setErrorDiscounts('');
    try {
      const data = await listDiscounts();
      const normalized = (data || []).map((item) => ({
        id: item.id || item.discountId || '',
        value: Number(item.value) || 0,
        type: item.discountType || item.type || 'Percentage',
        remark: item.remark || '',
        status: item.status || 'Active',
      }));
      setDiscounts(normalized);

      // Check if redirecting from discount list with a selected discount ID
      const passedId = location.state?.discountId;
      if (passedId && normalized.some(d => String(d.id) === String(passedId))) {
        setSelectedDiscountId(String(passedId));
      }
    } catch (err) {
      setErrorDiscounts(err.message || 'Failed to load B2C discounts.');
    } finally {
      setLoadingDiscounts(false);
    }
  }, [location.state]);

  // Load conditions/rules for selected discount
  const loadConditionsData = useCallback(async (discountId) => {
    setLoadingConditions(true);
    setConditionError('');
    try {
      const data = await getConditions(discountId);
      const normalized = (data || []).map((c) => ({
        id: c.conditionId || c.id || '',
        conditionType: c.conditionType || c.parameter || 'SeatType',
        conditionOperator: c.conditionOperator || c.operator || 'Equals',
        value1: c.value1 || c.value || c.conditionValue || '',
        value2: c.value2 || null,
      }));
      setConditions(normalized);
    } catch (err) {
      setConditionError(err.message || 'Failed to load rules for this discount.');
    } finally {
      setLoadingConditions(false);
    }
  }, []);

  useEffect(() => {
    loadDiscountsData();
  }, [loadDiscountsData]);

  useEffect(() => {
    if (selectedDiscountId) {
      const found = discounts.find(d => String(d.id) === String(selectedDiscountId));
      setSelectedDiscount(found || null);
      loadConditionsData(selectedDiscountId);
      // Reset form to default values for the current type
      handleParameterChange('SeatType');
      setEditingConditionId(null);
    } else {
      setSelectedDiscount(null);
      setConditions([]);
    }
  }, [selectedDiscountId, discounts, loadConditionsData]);

  const handleParameterChange = (param) => {
    let defaultOp = 'Equals';
    let defaultVal = '';

    if (param === 'MinimumFare' || param === 'MinFare') {
      defaultOp = 'GreaterThan';
      defaultVal = '500';
    } else if (param === 'MinSeats') {
      defaultOp = 'GreaterThan';
      defaultVal = '2';
    } else if (param === 'BusType') {
      defaultOp = 'Equals';
      defaultVal = 'Sleeper';
    } else if (param === 'Route') {
      defaultOp = 'Equals';
      defaultVal = 'Hyderabad-Bangalore';
    } else if (param === 'OperatorName' || param === 'Operator') {
      defaultOp = 'Equals';
      defaultVal = 'SURESH TRAVELS';
    } else if (param === 'SeatType') {
      defaultOp = 'Equals';
      defaultVal = 'Sleeper';
    } else if (param === 'SourceCity') {
      defaultOp = 'Equals';
      defaultVal = 'Hyderabad';
    } else if (param === 'DestinationCity') {
      defaultOp = 'Equals';
      defaultVal = 'Vijayawada';
    } else if (param === 'BoardingPoint') {
      defaultOp = 'Equals';
      defaultVal = 'Hyderabad';
    } else if (param === 'UserType') {
      defaultOp = 'Equals';
      defaultVal = 'Registered';
    }

    setNewCondition({
      conditionType: param,
      conditionOperator: defaultOp,
      value1: defaultVal,
      value2: null
    });
  };

  const handleAddOrUpdateCondition = async (e) => {
    e.preventDefault();
    if (!newCondition.value1) {
      setConditionError('Condition compare value is required.');
      return;
    }
    setSavingCondition(true);
    setConditionError('');

    try {
      const payload = {
        conditionType: newCondition.conditionType,
        conditionOperator: newCondition.conditionOperator,
        value1: String(newCondition.value1).trim(),
        value2: newCondition.value2 || null,

        // Legacy compatibility keys
        parameter: newCondition.conditionType,
        operator: newCondition.conditionOperator,
        value: String(newCondition.value1).trim(),
        conditionValue: String(newCondition.value1).trim(),
      };

      if (editingConditionId) {
        await updateCondition(editingConditionId, payload);
        setEditingConditionId(null);
      } else {
        await createCondition(selectedDiscountId, payload);
      }

      // Reload mapping conditions list
      await loadConditionsData(selectedDiscountId);
      // Reset form
      handleParameterChange(newCondition.conditionType);
    } catch (err) {
      setConditionError(err.message || 'Failed to save mapping rule.');
    } finally {
      setSavingCondition(false);
    }
  };

  const handleEditClick = (cond) => {
    setEditingConditionId(cond.id);
    setNewCondition({
      conditionType: cond.conditionType,
      conditionOperator: cond.conditionOperator,
      value1: cond.value1,
      value2: cond.value2
    });
  };

  const handleCancelEdit = () => {
    setEditingConditionId(null);
    handleParameterChange(newCondition.conditionType);
  };

  const handleDeleteCondition = async (conditionId) => {
    if (!window.confirm('Are you sure you want to delete this mapping condition?')) {
      return;
    }
    setConditionError('');
    try {
      await deleteCondition(conditionId);
      setConditions(prev => prev.filter(c => c.id !== conditionId));
      if (editingConditionId === conditionId) {
        setEditingConditionId(null);
        handleParameterChange('SeatType');
      }
    } catch (err) {
      setConditionError(err.message || 'Failed to delete condition.');
    }
  };

  const renderCompareValueInput = () => {
    const { conditionType, value1 } = newCondition;

    if (conditionType === 'MinimumFare' || conditionType === 'MinFare' || conditionType === 'MinSeats') {
      return (
        <input
          type="number"
          min={conditionType === 'MinSeats' ? '1' : '0'}
          placeholder={conditionType === 'MinSeats' ? 'e.g. 2' : 'e.g. 500'}
          value={value1}
          onChange={(e) => setNewCondition(prev => ({ ...prev, value1: e.target.value }))}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}
          required
        />
      );
    }

    if (conditionType === 'BusType') {
      return (
        <select
          value={value1 || 'Sleeper'}
          onChange={(e) => setNewCondition(prev => ({ ...prev, value1: e.target.value }))}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}
        >
          <option value="Sleeper">Sleeper</option>
          <option value="Seater">Seater</option>
          <option value="AC">AC</option>
          <option value="Non-AC">Non-AC</option>
          <option value="AC Sleeper">AC Sleeper</option>
          <option value="AC Seater">AC Seater</option>
        </select>
      );
    }

    if (conditionType === 'OperatorName' || conditionType === 'Operator') {
      return (
        <select
          value={value1 || 'SURESH TRAVELS'}
          onChange={(e) => setNewCondition(prev => ({ ...prev, value1: e.target.value }))}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}
        >
          <option value="SURESH TRAVELS">SURESH TRAVELS</option>
          <option value="APSRTC">APSRTC</option>
          <option value="TGSRTC">TGSRTC</option>
          <option value="KSRTC">KSRTC</option>
          <option value="Kerala RTC">Kerala RTC</option>
          <option value="GSRTC">GSRTC</option>
        </select>
      );
    }

    if (conditionType === 'SourceCity' || conditionType === 'DestinationCity') {
      return (
        <input
          type="text"
          placeholder={conditionType === 'SourceCity' ? 'e.g. Hyderabad' : 'e.g. Vijayawada'}
          value={value1}
          onChange={(e) => setNewCondition(prev => ({ ...prev, value1: e.target.value }))}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}
          required
        />
      );
    }

    if (conditionType === 'SeatType') {
      return (
        <select
          value={value1 || 'Sleeper'}
          onChange={(e) => setNewCondition(prev => ({ ...prev, value1: e.target.value }))}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}
        >
          <option value="Sleeper">Sleeper</option>
          <option value="Seater">Seater</option>
          <option value="Upper Berth">Upper Berth</option>
          <option value="Lower Berth">Lower Berth</option>
        </select>
      );
    }

    if (conditionType === 'UserType') {
      return (
        <select
          value={value1 || 'Registered'}
          onChange={(e) => setNewCondition(prev => ({ ...prev, value1: e.target.value }))}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}
        >
          <option value="B2C">B2C</option>
          <option value="B2B">B2B</option>
          <option value="Guest">Guest</option>
          <option value="Registered">Registered</option>
        </select>
      );
    }

    if (conditionType === 'Route') {
      return (
        <>
          <input
            type="text"
            list="route-options"
            placeholder="e.g. Hyderabad-Bangalore"
            value={value1}
            onChange={(e) => setNewCondition(prev => ({ ...prev, value1: e.target.value }))}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}
            required
          />
          <datalist id="route-options">
            {POPULAR_ROUTES.map((route) => (
              <option key={route} value={route} />
            ))}
          </datalist>
        </>
      );
    }

    return (
      <input
        type="text"
        placeholder="Compare value"
        value={value1}
        onChange={(e) => setNewCondition(prev => ({ ...prev, value1: e.target.value }))}
        style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}
        required
      />
    );
  };

  return (
    <div className="admin-b2c-page bus-discount-mapping-page-container">
      <section className="discount-heading">
        <p className="discount-heading-main">
          B2C Bus <span className="discount-heading-sub">Discount Mapping / Conditions</span>
        </p>
      </section>

      {/* Select Discount Card */}
      <section className="mapping-selection-card">
        <label className="field" style={{ width: '100%' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select B2C Discount Master</span>
          {loadingDiscounts ? (
            <select disabled style={{ width: '100%' }}>
              <option>Loading discounts...</option>
            </select>
          ) : errorDiscounts ? (
            <select disabled style={{ width: '100%' }}>
              <option>Error: {errorDiscounts}</option>
            </select>
          ) : (
            <select
              value={selectedDiscountId}
              onChange={(e) => setSelectedDiscountId(e.target.value)}
              style={{ width: '100%', height: '44px', fontWeight: '500' }}
            >
              <option value="">-- Choose a Discount Code --</option>
              {discounts.map((d) => (
                <option key={d.id} value={d.id}>
                  [ID: {d.id}] {d.type} - {d.type === 'Percentage' ? `${d.value}%` : `INR ${d.value}`} ({d.remark || 'No remark'}) - {d.status}
                </option>
              ))}
            </select>
          )}
        </label>
      </section>

      {selectedDiscount ? (
        <div className="mapping-layout-grid">
          {/* Left panel: Condition configuration form */}
          <section className="details-panel" style={{ flex: '1 1 380px' }}>
            <div className="details-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' }}>
              <div>
                <p className="details-title">{editingConditionId ? 'Edit Condition Mapping' : 'Add Condition Mapping'}</p>
                <p className="details-subtitle">Define when this discount should be automatically applied.</p>
              </div>
            </div>

            <form onSubmit={handleAddOrUpdateCondition} className="mapping-form-fields" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label className="field">
                <span>Condition Type</span>
                <select
                  value={newCondition.conditionType}
                  onChange={(e) => handleParameterChange(e.target.value)}
                  disabled={savingCondition}
                >
                  <option value="SeatType">Seat Type</option>
                  <option value="SourceCity">Source City</option>
                  <option value="DestinationCity">Destination City</option>
                  <option value="OperatorName">Operator Name</option>
                  <option value="MinimumFare">Minimum Fare (INR)</option>
                </select>
              </label>

              <label className="field">
                <span>Operator</span>
                <select
                  value={newCondition.conditionOperator}
                  onChange={(e) => setNewCondition(prev => ({ ...prev, conditionOperator: e.target.value }))}
                  disabled={savingCondition}
                >
                  <option value="Equals">Equals</option>
                  <option value="Contains">Contains</option>
                  {['MinimumFare', 'MinFare', 'MinSeats'].includes(newCondition.conditionType) && (
                    <>
                      <option value="GreaterThan">Greater Than</option>
                      <option value="LessThan">Less Than</option>
                    </>
                  )}
                </select>
              </label>

              <label className="field">
                <span>Compare Value</span>
                {renderCompareValueInput()}
              </label>

              <div className="form-actions" style={{ marginTop: '12px' }}>
                {editingConditionId && (
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={handleCancelEdit}
                    disabled={savingCondition}
                    style={{ marginRight: '8px' }}
                  >
                    <FaTimes style={{ marginRight: '6px' }} />
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={savingCondition}
                  style={{
                    backgroundColor: '#A51C49',
                    borderColor: '#A51C49',
                    color: '#ffffff',
                    transition: 'all 0.25s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#851237';
                    e.currentTarget.style.borderColor = '#851237';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#A51C49';
                    e.currentTarget.style.borderColor = '#A51C49';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {savingCondition ? 'Saving...' : editingConditionId ? 'Update Rule' : 'Add Rule'}
                </button>
              </div>
            </form>
          </section>

          {/* Right panel: Active Conditions List */}
          <section className="details-panel" style={{ flex: '1.5 1 450px' }}>
            <div className="details-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' }}>
              <div>
                <p className="details-title">Active Condition Rules</p>
                <p className="details-subtitle">Rules currently applied to Discount #{selectedDiscount.id}</p>
              </div>
            </div>

            {conditionError && (
              <p className="form-error" style={{ color: 'red', margin: '8px 0', fontSize: '13px' }}>
                {conditionError}
              </p>
            )}

            {loadingConditions ? (
              <p style={{ color: 'var(--muted)', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>
                Loading rules...
              </p>
            ) : paginatedConditions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 12px', border: '2px dashed var(--border)', borderRadius: '12px', background: 'var(--admin-soft)' }}>
                <p style={{ color: 'var(--muted)', fontSize: '14px', fontWeight: '500', margin: '0 0 6px 0' }}>
                  No conditions defined.
                </p>
                <p style={{ color: 'var(--muted)', fontSize: '12px', margin: 0 }}>
                  This discount will apply globally to all B2C bookings.
                </p>
              </div>
            ) : (
              <div>
                <div className="active-rules-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {paginatedConditions.map((cond) => (
                    <div
                      key={cond.id}
                      className="rule-item-card"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        backgroundColor: 'var(--admin-soft, #fdfdfd)',
                        borderRadius: '12px',
                        border: editingConditionId === cond.id ? '2px solid var(--admin-primary)' : '1px solid var(--border)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
                          If <strong style={{ color: 'var(--admin-primary)' }}>{cond.conditionType}</strong> is <strong>{cond.conditionOperator}</strong>
                        </span>
                        <span style={{ fontSize: '13px', color: '#555' }}>
                          Value: <strong style={{ color: '#222' }}>{cond.value1}</strong>
                        </span>
                      </div>

                      <div className="table-actions" style={{ gap: '6px' }}>
                        <button
                          type="button"
                          className="ghost-btn small icon-btn"
                          onClick={() => handleEditClick(cond)}
                          title="Edit Rule"
                          disabled={savingCondition}
                        >
                          <FaEdit />
                        </button>
                        <button
                          type="button"
                          className="danger-btn small icon-btn"
                          onClick={() => handleDeleteCondition(cond.id)}
                          title="Delete Rule"
                          disabled={savingCondition}
                        >
                          <FaTrashAlt />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div style={{ marginTop: '20px' }}>
                    <AdminPagination
                      currentPage={currentPage}
                      totalItems={conditions.length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setCurrentPage}
                      onItemsPerPageChange={setItemsPerPage}
                      itemName="rules"
                    />
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      ) : (
        <section className="mapping-placeholder-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--panel)', boxShadow: '0 8px 20px rgba(0,0,0,0.02)' }}>
          <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--muted)', margin: '0 0 8px 0' }}>
            No Discount Selected
          </p>
          <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0, textAlign: 'center' }}>
            Please select a B2C Discount Master from the dropdown menu above to configure or view its auto-application rules.
          </p>
        </section>
      )}
    </div>
  );
}

export default DiscountMapping;

