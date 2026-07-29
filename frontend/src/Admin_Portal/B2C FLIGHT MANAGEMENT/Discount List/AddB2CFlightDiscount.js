/* eslint-disable */
import { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../../B2C BUS MANAGEMENT/Discount List/AddB2CBusDiscount.css';
import { createFlightPromotion, updateFlightPromotion, getFlightPromotionById } from '../../../services/flightBookingService';

const DEFAULT_FORM = {
  name: '',
  description: '',
  value: '',
  discountType: '',
  status: '',
  updatedBy: '',
  priority: '',
  minimumFare: '',
  maximumDiscount: '',
  startDate: '',
  endDate: '',
  travelClass: '',
  isAutoApply: false,
};

function buildInitialForm(row) {
  if (!row) {
    return DEFAULT_FORM;
  }

  // If there's raw backend data
  const raw = row.raw || {};
  const isFlat = row.type === 'Fixed' || row.type === 'Flat' || row.discountType === 'Fixed' || row.discountType === 'Flat' || raw.discountType === 0 || raw.discountType === 'Flat';

  let travelClass = 'All';
  if (Array.isArray(raw.conditions) && raw.conditions.length > 0) {
    const classCondition = raw.conditions.find(c => c.conditionType === 0 || c.conditionType === 'TravelClass');
    if (classCondition) {
      travelClass = classCondition.value;
    }
  }

  let startDate = '';
  if (raw.startDate) {
    const sDate = new Date(raw.startDate);
    const yyyy = sDate.getFullYear();
    const mm = String(sDate.getMonth() + 1).padStart(2, '0');
    const dd = String(sDate.getDate()).padStart(2, '0');
    startDate = `${yyyy}-${mm}-${dd}`;
  }

  let endDate = '';
  if (raw.endDate) {
    const eDate = new Date(raw.endDate);
    const yyyy = eDate.getFullYear();
    const mm = String(eDate.getMonth() + 1).padStart(2, '0');
    const dd = String(eDate.getDate()).padStart(2, '0');
    endDate = `${yyyy}-${mm}-${dd}`;
  }

  return {
    name: raw.name || row.remark || '',
    description: raw.description || row.remark || '',
    value: row.value !== undefined && row.value !== null ? String(row.value) : '',
    discountType: isFlat ? 'Fixed' : 'Percentage',
    status: row.status || 'Active',
    updatedBy: row.updatedBy || 'Admin',
    priority: raw.priority !== undefined ? String(raw.priority) : '1',
    minimumFare: raw.minimumFare !== undefined ? String(raw.minimumFare) : '0',
    maximumDiscount: raw.maximumDiscount !== undefined ? String(raw.maximumDiscount) : '500',
    startDate,
    endDate,
    travelClass: travelClass,
    isAutoApply: raw.isAutoApply === true || raw.isAutoApply === 1 || String(raw.isAutoApply).toLowerCase() === 'true',
  };
}

function CustomDropdown({ label, options, value, onChange, placeholder, disabled }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = () => setIsOpen(false);
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isOpen]);

  const selectedOpt = options.find(o => o.value === value);

  return (
    <div className="add-field" style={{ position: 'relative' }}>
      <span style={{ color: 'var(--admin-text)' }}>{label} <span className="required-star">*</span></span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setIsOpen(!isOpen);
        }}
        disabled={disabled}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid var(--admin-border)',
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '14px',
          color: (value && value !== '') ? 'var(--admin-text)' : '#94a3b8',
          background: 'var(--admin-surface)',
          minHeight: '42px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          width: '100%',
          textAlign: 'left',
          transition: 'all 0.2s ease-in-out'
        }}
      >
        <span>{selectedOpt ? selectedOpt.label : (placeholder || 'Select option')}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{
            width: '16px',
            height: '16px',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            color: 'var(--admin-muted)'
          }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
            borderRadius: '10px',
            marginTop: '4px',
            zIndex: 1000,
            maxHeight: '200px',
            overflowY: 'auto',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            padding: '4px'
          }}
        >
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                className={`custom-select-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onChange({ target: { value: opt.value } });
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddB2CFlightDiscount() {
  const navigate = useNavigate();
  const location = useLocation();
  const editingRow = useMemo(() => location.state?.row || null, [location.state]);

  const [formValues, setFormValues] = useState(() => buildInitialForm(editingRow));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingRow) {
      if (editingRow.id && !String(editingRow.id).startsWith('FLD-')) {
        async function fetchFreshPromo() {
          try {
            const promo = await getFlightPromotionById(editingRow.id);
            if (promo) {
              const isFlat = promo.discountType === 0 || promo.discountType === 'Flat' || promo.discountType === 'Fixed';

              let travelClass = 'All';
              if (Array.isArray(promo.conditions)) {
                const cond = promo.conditions.find(c => c.conditionType === 0 || c.conditionType === 'TravelClass');
                if (cond) {
                  travelClass = cond.value;
                }
              }

              let startDate = '';
              if (promo.startDate) {
                const sDate = new Date(promo.startDate);
                const yyyy = sDate.getFullYear();
                const mm = String(sDate.getMonth() + 1).padStart(2, '0');
                const dd = String(sDate.getDate()).padStart(2, '0');
                startDate = `${yyyy}-${mm}-${dd}`;
              }

              let endDate = '';
              if (promo.endDate) {
                const eDate = new Date(promo.endDate);
                const yyyy = eDate.getFullYear();
                const mm = String(eDate.getMonth() + 1).padStart(2, '0');
                const dd = String(eDate.getDate()).padStart(2, '0');
                endDate = `${yyyy}-${mm}-${dd}`;
              }

              setFormValues({
                name: promo.name || promo.description || '',
                description: promo.description || promo.name || '',
                value: String(promo.discountValue),
                discountType: isFlat ? 'Fixed' : 'Percentage',
                status: (promo.isActive === true || promo.isActive === 1 || String(promo.isActive).toLowerCase() === 'true') ? 'Active' : 'Inactive',
                updatedBy: promo.updatedBy || 'Admin',
                priority: String(promo.priority || 1),
                minimumFare: String(promo.minimumFare || 0),
                maximumDiscount: String(promo.maximumDiscount || 500),
                startDate,
                endDate,
                travelClass: travelClass,
                isAutoApply: promo.isAutoApply === true || promo.isAutoApply === 1 || String(promo.isAutoApply).toLowerCase() === 'true',
              });
              return;
            }
          } catch (e) {
            console.warn("Failed to fetch fresh promotion details from backend, falling back to local row data", e);
          }
          setFormValues(buildInitialForm(editingRow));
        }
        fetchFreshPromo();
      } else {
        setFormValues(buildInitialForm(editingRow));
      }
    } else {
      setFormValues(DEFAULT_FORM);
    }
  }, [editingRow]);

  const handleChange = (field) => (event) => {
    setFormValues((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const val = Number(formValues.value);
    const updatedBy = String(formValues.updatedBy || '').trim();
    const priority = Number(formValues.priority) || 1;
    const minimumFare = Number(formValues.minimumFare) || 0;
    const maximumDiscount = Number(formValues.maximumDiscount) || 0;
    const name = String(formValues.name || '').trim();
    const description = String(formValues.description || '').trim();

    if (!name) {
      setError('Name is required.');
      return;
    }

    if (!description) {
      setError('Description is required.');
      return;
    }

    if (Number.isNaN(val) || val <= 0) {
      setError('Please enter a valid value greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      const type = formValues.discountType === 'Fixed' || formValues.discountType === 'Flat' ? 'Flat' : 'Percentage';

      const conditions = [];
      if (formValues.travelClass && formValues.travelClass !== 'All') {
        conditions.push({
          conditionType: 0,
          operator: 'Equals',
          value: formValues.travelClass
        });
      }

      let startISO = '';
      if (formValues.startDate) {
        startISO = `${formValues.startDate}T00:00:00Z`;
      } else {
        startISO = new Date().toISOString();
      }

      let endISO = '';
      if (formValues.endDate) {
        endISO = `${formValues.endDate}T23:59:59Z`;
      } else {
        endISO = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
      }

      const promotionData = {
        name: name,
        description: description,
        remark: description,
        remarks: description,
        discountType: type === 'Flat' ? 0 : 1, // 0 = Flat Amount, 1 = Percentage
        discountValue: val,
        maximumDiscount: maximumDiscount,
        minimumFare: minimumFare,
        priority: priority,
        startDate: startISO,
        endDate: endISO,
        isActive: formValues.status === 'Active',
        isAutoApply: formValues.isAutoApply,
        conditions: conditions
      };

      const isMockId = editingRow && String(editingRow.id).startsWith('FLD-');

      if (editingRow && !isMockId) {
        await updateFlightPromotion(editingRow.id, promotionData);
      } else {
        await createFlightPromotion({ dto: promotionData });
        // Clean up mock row from local storage fallback
        if (isMockId) {
          try {
            const STORAGE_KEY = 'admin_b2c_flight_discounts';
            const raw = localStorage.getItem(STORAGE_KEY);
            const list = raw ? JSON.parse(raw) : [];
            const filtered = list.filter(item => item.id !== editingRow.id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
          } catch (e) {
            console.warn(e);
          }
        }
      }

      navigate('/admin/b2c-flight/discount-list');
    } catch (err) {
      console.warn("Failed to submit to server, using local storage fallback", err);
      try {
        const STORAGE_KEY = 'admin_b2c_flight_discounts';
        const raw = localStorage.getItem(STORAGE_KEY);
        const list = raw ? JSON.parse(raw) : [];
        if (editingRow) {
          const updated = list.map(item => item.id === editingRow.id ? {
            ...item,
            value: val,
            type: formValues.discountType,
            status: formValues.status,
            updatedBy: updatedBy,
            remark: description,
            updateDate: new Date().toLocaleString()
          } : item);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } else {
          const nextId = list.length ? Math.max(...list.map(i => parseInt(String(i.id).replace(/\D/g, '')) || 0)) + 1 : 1401;
          const newRow = {
            id: `FLD-${nextId}`,
            value: val,
            type: formValues.discountType,
            entryDate: new Date().toLocaleString(),
            updateDate: new Date().toLocaleString(),
            updatedBy: updatedBy,
            remark: description,
            status: formValues.status,
          };
          list.push(newRow);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        }
      } catch (storageErr) {
        console.error("Local storage fallback failed", storageErr);
      }
      navigate('/admin/b2c-flight/discount-list');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormValues(buildInitialForm(editingRow));
    setError('');
  };

  const discountTypeOptions = [
    { value: '', label: 'Select Discount Type' },
    { value: 'Percentage', label: 'Percentage' },
    { value: 'Fixed', label: 'Fixed' }
  ];

  const travelClassOptions = [
    { value: '', label: 'Select Travel Class' },
    { value: 'All', label: 'All Classes' },
    { value: 'Economy', label: 'Economy' },
    { value: 'Business', label: 'Business' },
    { value: 'Premium Economy', label: 'Premium Economy' },
    { value: 'First Class', label: 'First Class' }
  ];

  const statusOptions = [
    { value: '', label: 'Select Status' },
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' }
  ];

  return (
    <div className="admin-b2c-page">
      <style>{`
        .add-field span {
          color: var(--admin-text) !important;
        }
        .admin-b2c-page input::placeholder,
        .admin-b2c-page textarea::placeholder {
          color: #94a3b8 !important;
          opacity: 1 !important;
        }
        /* Light Theme (White Mode) - Red star & button */
        .admin-shell.light-theme .admin-b2c-page .required-star {
          color: #A51C49 !important;
        }
        .admin-shell.light-theme .admin-b2c-page .primary-btn {
          background: #A51C49 !important;
          border-color: #A51C49 !important;
          color: #ffffff !important;
          box-shadow: 0 4px 10px rgba(194, 24, 91, 0.2) !important;
        }
        .admin-shell.light-theme .admin-b2c-page .primary-btn:hover {
          background: #9c1048 !important;
          border-color: #9c1048 !important;
        }
        /* Dark Theme (Black/Dark Mode) - Blue star & button */
        .admin-shell.dark-theme .admin-b2c-page .required-star {
          color: #1e75ff !important;
        }
        .admin-shell.dark-theme .admin-b2c-page .primary-btn {
          background: #1e75ff !important;
          border-color: #1e75ff !important;
          color: #ffffff !important;
          box-shadow: 0 4px 10px rgba(30, 117, 255, 0.2) !important;
        }
        .admin-shell.dark-theme .admin-b2c-page .primary-btn:hover {
          background: #0052d9 !important;
          border-color: #0052d9 !important;
        }
        .admin-shell.dark-theme .admin-b2c-page .add-field button,
        .admin-shell.dark-theme .admin-b2c-page input,
        .admin-shell.dark-theme .admin-b2c-page select,
        .admin-shell.dark-theme .admin-b2c-page textarea {
          background-color: #1e293b !important;
          border: 1px solid #475569 !important;
          color: #f8fafc !important;
        }
        .admin-shell.dark-theme .admin-b2c-page .add-field button:focus,
        .admin-shell.dark-theme .admin-b2c-page input:focus,
        .admin-shell.dark-theme .admin-b2c-page select:focus,
        .admin-shell.dark-theme .admin-b2c-page textarea:focus {
          border-color: #1e75ff !important;
          box-shadow: 0 0 0 3px rgba(30, 117, 255, 0.25) !important;
        }
        .admin-shell.dark-theme .admin-b2c-page button svg {
          color: #94a3b8 !important;
        }
        .admin-shell.dark-theme .admin-b2c-page input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(0.8) !important;
          cursor: pointer;
        }
        .admin-shell.dark-theme .admin-b2c-page .add-discount-header .ghost-btn {
          background: #1e75ff !important;
          border-color: #1e75ff !important;
          color: #ffffff !important;
          box-shadow: 0 4px 10px rgba(30, 117, 255, 0.2) !important;
        }
        .admin-shell.dark-theme .admin-b2c-page .add-discount-header .ghost-btn:hover {
          background: #0052d9 !important;
          border-color: #0052d9 !important;
        }
        .admin-shell.dark-theme .admin-b2c-page .form-actions .ghost-btn {
          border-color: #475569 !important;
          color: #cbd5e1 !important;
          background: #243047 !important;
        }
        .admin-shell.dark-theme .admin-b2c-page .form-actions .ghost-btn:hover {
          background: #334155 !important;
          color: #ffffff !important;
        }
        .custom-select-item {
          display: block;
          width: 100%;
          text-align: left;
          padding: 8px 12px;
          font-size: 14px;
          background: transparent;
          color: var(--admin-text);
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
          font-weight: normal;
        }
        /* Light theme: lite red highlight */
        .custom-select-item:hover,
        .custom-select-item.active {
          background: #fef2f2 !important;
          color: #ef4444 !important;
          font-weight: 600;
        }
        /* Dark theme: blue highlight */
        .dark-theme .custom-select-item:hover,
        .dark-theme .custom-select-item.active {
          background: var(--admin-primary, #1e75ff) !important;
          color: #ffffff !important;
          font-weight: 600;
        }
      `}</style>
      <section className="add-discount-card" style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}>
        <header className="add-discount-header" style={{ borderColor: 'var(--admin-border)' }}>
          <div>
            <p className="add-discount-title" style={{ color: 'var(--admin-text)' }}>{editingRow ? <><span style={{ color: '#A51C49', fontWeight: 700 }}>Edit B2C Flight</span> Discount</> : <><span style={{ color: '#A51C49', fontWeight: 700 }}>Add B2C Flight</span> Discount</>}</p>
            <p className="add-discount-subtitle" style={{ color: 'var(--admin-muted)' }}>Configure flight promotions based on the table details.</p>
          </div>
          <button type="button" className="ghost-btn" style={{ borderColor: 'var(--admin-primary)', color: 'var(--admin-primary)', background: 'transparent' }} onClick={() => navigate('/admin/b2c-flight/discount-list')}>
            B2C Flight Discount List
          </button>
        </header>

        <form className="add-discount-form" onSubmit={handleSubmit}>
          <label className="add-field add-field-medium">
            <span style={{ color: 'var(--admin-text)' }}>Promotion Name <span className="required-star">*</span></span>
            <input
              type="text"
              placeholder="e.g. Monsoon Business Class Saver"
              value={formValues.name}
              onChange={handleChange('name')}
              disabled={submitting}
              style={{ color: 'var(--admin-text)', background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
            />
          </label>

          <CustomDropdown
            label="Discount Type"
            options={discountTypeOptions}
            value={formValues.discountType}
            onChange={handleChange('discountType')}
            placeholder="Select Discount Type"
            disabled={submitting}
          />

          <label className="add-field">
            <span style={{ color: 'var(--admin-text)' }}>Discount Value <span className="required-star">*</span></span>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={formValues.value}
              onChange={handleChange('value')}
              disabled={submitting}
              style={{ color: 'var(--admin-text)', background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
            />
          </label>

          <label className="add-field">
            <span style={{ color: 'var(--admin-text)' }}>Maximum Discount (INR) <span className="required-star">*</span></span>
            <input
              type="number"
              min="0"
              placeholder="500"
              value={formValues.maximumDiscount}
              onChange={handleChange('maximumDiscount')}
              disabled={submitting}
              style={{ color: 'var(--admin-text)', background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
            />
          </label>

          <label className="add-field">
            <span style={{ color: 'var(--admin-text)' }}>Minimum Fare (INR) <span className="required-star">*</span></span>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={formValues.minimumFare}
              onChange={handleChange('minimumFare')}
              disabled={submitting}
              style={{ color: 'var(--admin-text)', background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
            />
          </label>

          <label className="add-field">
            <span style={{ color: 'var(--admin-text)' }}>Priority <span className="required-star">*</span></span>
            <input
              type="number"
              min="1"
              placeholder="1"
              value={formValues.priority}
              onChange={handleChange('priority')}
              disabled={submitting}
              style={{ color: 'var(--admin-text)', background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
            />
          </label>

          <CustomDropdown
            label="Travel Class Condition"
            options={travelClassOptions}
            value={formValues.travelClass}
            onChange={handleChange('travelClass')}
            placeholder="Select Travel Class"
            disabled={submitting}
          />

          <label className="add-field">
            <span style={{ color: 'var(--admin-text)' }}>Start Date <span className="required-star">*</span></span>
            <input
              type="date"
              value={formValues.startDate}
              onChange={handleChange('startDate')}
              disabled={submitting}
              style={{ color: 'var(--admin-text)', background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
            />
          </label>

          <label className="add-field">
            <span style={{ color: 'var(--admin-text)' }}>End Date <span className="required-star">*</span></span>
            <input
              type="date"
              value={formValues.endDate}
              onChange={handleChange('endDate')}
              disabled={submitting}
              style={{ color: 'var(--admin-text)', background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
            />
          </label>

          <CustomDropdown
            label="Status"
            options={statusOptions}
            value={formValues.status}
            onChange={handleChange('status')}
            placeholder="Select Status"
            disabled={submitting}
          />

          <label className="add-field">
            <span style={{ color: 'var(--admin-text)' }}>Updated By <span className="required-star">*</span></span>
            <input
              type="text"
              placeholder="Admin"
              value={formValues.updatedBy}
              onChange={handleChange('updatedBy')}
              disabled={submitting}
              style={{ color: 'var(--admin-text)', background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
            />
          </label>

          <label className="add-field" style={{ gridColumn: '1 / -1' }}>
            <span style={{ color: 'var(--admin-text)' }}>Description <span className="required-star">*</span></span>
            <textarea
              placeholder="e.g. Flat 1000 INR discount on Business class tickets"
              value={formValues.description}
              onChange={handleChange('description')}
              disabled={submitting}
              rows={2}
              style={{ color: 'var(--admin-text)', background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
            />
          </label>

          <div className="add-field" style={{ gridColumn: '1 / -1' }}>
            <span style={{ color: 'var(--admin-text)' }}>Auto Apply</span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginTop: '4px'
            }}>
              <div
                onClick={() => !submitting && setFormValues(prev => ({ ...prev, isAutoApply: !prev.isAutoApply }))}
                style={{
                  width: '48px',
                  height: '26px',
                  borderRadius: '13px',
                  background: formValues.isAutoApply ? '#A51C49' : '#cbd5e1',
                  position: 'relative',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'background 0.25s ease',
                  flexShrink: 0
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: '3px',
                  left: formValues.isAutoApply ? '25px' : '3px',
                  transition: 'left 0.25s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </div>
              <span style={{ color: 'var(--admin-text)', fontSize: '14px', fontWeight: 500 }}>
                {formValues.isAutoApply ? 'Yes — Discount will be applied automatically' : 'No — User must apply manually'}
              </span>
            </div>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="form-actions" style={{ borderColor: 'var(--admin-border)' }}>
            <button type="submit" className="primary-btn" disabled={submitting}>
              {submitting ? 'Saving...' : (editingRow ? 'Update' : 'Submit')}
            </button>
            <button type="button" className="ghost-btn" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)', background: 'var(--admin-surface)' }} onClick={handleReset} disabled={submitting}>
              Reset
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default AddB2CFlightDiscount;

