import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './AddB2CBusDiscount.css';
import { createDiscount, updateDiscount } from '../../../services/adminBusService';

const DEFAULT_FORM = {
  code: '',
  title: '',
  description: '',
  value: '',
  discountType: 'Percentage',
  isAutoApply: true,
  isExclusive: false,
  priority: '0',
  minBookingAmount: '0',
  startDateUtc: '',
  endDateUtc: '',
  status: 'Active',
  remark: '',
};

function toInputDateTimeLocal(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function toUtcIso(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return String(value).trim().toLowerCase() === 'true';
}

function buildInitialForm(row) {
  if (!row) {
    return DEFAULT_FORM;
  }

  return {
    code: row.code || '',
    title: row.title || row.remark || '',
    description: row.description || '',
    value: row.value !== undefined && row.value !== null ? String(row.value) : '',
    discountType: row.type || row.discountType || 'Percentage',
    isAutoApply: toBoolean(row.isAutoApply, true),
    isExclusive: toBoolean(row.isExclusive, false),
    priority: row.priority !== undefined && row.priority !== null ? String(row.priority) : '0',
    minBookingAmount:
      row.minBookingAmount !== undefined && row.minBookingAmount !== null
        ? String(row.minBookingAmount)
        : '0',
    startDateUtc: toInputDateTimeLocal(row.startDateUtc),
    endDateUtc: toInputDateTimeLocal(row.endDateUtc),
    status: row.status || 'Active',
    remark: row.remark || '',
  };
}

function AddB2CBusDiscount() {
  const navigate = useNavigate();
  const location = useLocation();
  const editingRow = useMemo(() => location.state?.row || null, [location.state]);

  const [formValues, setFormValues] = useState(() => buildInitialForm(editingRow));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (event) => {
    const value =
      field === 'isAutoApply' || field === 'isExclusive'
        ? event.target.value === 'true'
        : event.target.value;

    setFormValues((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const code = String(formValues.code || '').trim().toUpperCase();
    const title = String(formValues.title || '').trim();
    const val = Number(formValues.value);
    const priority = Number(formValues.priority) || 0;
    const minBookingAmount = Number(formValues.minBookingAmount) || 0;
    const startTimestamp = formValues.startDateUtc ? new Date(formValues.startDateUtc).getTime() : null;
    const endTimestamp = formValues.endDateUtc ? new Date(formValues.endDateUtc).getTime() : null;

    if (!code) {
      setError('Discount code is required.');
      return;
    }

    if (!title) {
      setError('Discount title is required.');
      return;
    }

    if (Number.isNaN(val) || val <= 0) {
      setError('Please enter a valid value greater than 0.');
      return;
    }

    if (minBookingAmount < 0) {
      setError('Minimum booking amount cannot be negative.');
      return;
    }

    if (
      startTimestamp &&
      endTimestamp &&
      Number.isFinite(startTimestamp) &&
      Number.isFinite(endTimestamp) &&
      startTimestamp > endTimestamp
    ) {
      setError('End date should be after start date.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        code,
        title,
        description: String(formValues.description || '').trim(),
        value: val,
        discountType: formValues.discountType,
        isAutoApply: Boolean(formValues.isAutoApply),
        isExclusive: Boolean(formValues.isExclusive),
        priority,
        minBookingAmount,
        startDateUtc: toUtcIso(formValues.startDateUtc),
        endDateUtc: toUtcIso(formValues.endDateUtc),
        status: formValues.status,
        updatedBy: 'admin',
        remark: String(formValues.remark || '').trim(),
      };

      if (editingRow) {
        await updateDiscount(editingRow.id, payload);
      } else {
        await createDiscount(payload);
      }

      navigate('/admin/b2c-bus/discounts');
    } catch (err) {
      setError(err.message || 'Failed to save discount.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormValues(buildInitialForm(editingRow));
    setError('');
  };

  return (
    <div className="admin-b2c-page">
      <section className="add-discount-card">
        <header className="add-discount-header">
          <div>
            <p className="add-discount-title">{editingRow ? 'Edit B2C Bus Discount' : 'Add B2C Bus Discount'}</p>
            <p className="add-discount-subtitle">Configure auto-apply discounts, validity, and pricing rules.</p>
          </div>
          <button type="button" className="ghost-btn" onClick={() => navigate('/admin/b2c-bus/discounts')}>
            B2C Bus Discount List
          </button>
        </header>

        <form className="add-discount-form" onSubmit={handleSubmit}>
          <label className="add-field">
            <span>Discount Code</span>
            <input
              type="text"
              placeholder="DISC-NEW"
              value={formValues.code}
              onChange={(event) =>
                setFormValues((previous) => ({
                  ...previous,
                  code: event.target.value.toUpperCase().replace(/\s+/g, ''),
                }))
              }
              disabled={submitting}
            />
          </label>

          <label className="add-field add-field-medium">
            <span>Title</span>
            <input
              type="text"
              placeholder="Sleeper Special"
              value={formValues.title}
              onChange={handleChange('title')}
              disabled={submitting}
            />
          </label>

          <label className="add-field">
            <span>Discount Type</span>
            <select
              value={formValues.discountType}
              onChange={handleChange('discountType')}
              disabled={submitting}
            >
              <option value="Percentage">Percentage</option>
              <option value="Fixed">Fixed</option>
            </select>
          </label>

          <label className="add-field">
            <span>Value</span>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={formValues.value}
              onChange={handleChange('value')}
              disabled={submitting}
            />
          </label>

          <label className="add-field">
            <span>Min Booking Amount</span>
            <input
              type="number"
              min="0"
              placeholder="500"
              value={formValues.minBookingAmount}
              onChange={handleChange('minBookingAmount')}
              disabled={submitting}
            />
          </label>

          <label className="add-field">
            <span>Priority</span>
            <input
              type="number"
              min="0"
              placeholder="5"
              value={formValues.priority}
              onChange={handleChange('priority')}
              disabled={submitting}
            />
          </label>

          <label className="add-field">
            <span>Auto Apply</span>
            <select
              value={String(formValues.isAutoApply)}
              onChange={handleChange('isAutoApply')}
              disabled={submitting}
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>

          <label className="add-field">
            <span>Exclusive</span>
            <select
              value={String(formValues.isExclusive)}
              onChange={handleChange('isExclusive')}
              disabled={submitting}
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </label>

          <label className="add-field">
            <span>Start Date & Time</span>
            <input
              type="datetime-local"
              value={formValues.startDateUtc}
              onChange={handleChange('startDateUtc')}
              disabled={submitting}
            />
            <small style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Format: DD/MM/YYYY HH:MM AM/PM
            </small>
          </label>

          <label className="add-field">
            <span>End Date & Time</span>
            <input
              type="datetime-local"
              value={formValues.endDateUtc}
              onChange={handleChange('endDateUtc')}
              disabled={submitting}
            />
            <small style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Format: DD/MM/YYYY HH:MM AM/PM
            </small>
          </label>

          <label className="add-field">
            <span>Status</span>
            <select
              value={formValues.status}
              onChange={handleChange('status')}
              disabled={submitting}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>

          <label className="add-field add-field-medium">
            <span>Description</span>
            <textarea
              placeholder="10% off sleeper bookings"
              value={formValues.description}
              onChange={handleChange('description')}
              disabled={submitting}
              rows={2}
            />
          </label>

          <label className="add-field add-field-medium">
            <span>Remark</span>
            <textarea
              placeholder="Remark"
              value={formValues.remark}
              onChange={handleChange('remark')}
              disabled={submitting}
              rows={2}
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="form-actions">
            <button type="submit" className="primary-btn" disabled={submitting}>
              {submitting ? 'Saving...' : 'Submit'}
            </button>
            <button type="button" className="ghost-btn" onClick={handleReset} disabled={submitting}>
              Reset
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default AddB2CBusDiscount;
