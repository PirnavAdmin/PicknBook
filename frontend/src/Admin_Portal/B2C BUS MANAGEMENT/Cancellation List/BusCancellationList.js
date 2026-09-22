/* eslint-disable */
import React, { useEffect, useMemo, useState } from "react";
import "./BusCancellationList.css";
import "../Booking List/BookingList.css";
import { useAdminList } from "../../../utils/adminPortalStorage";
import { getCancellationReports, listAdminBusBookings, updateBusCancellation } from "../../../services/adminBusService";
import AdminPagination from "../../../components/AdminPagination";
import {
  CancellationStatusBadge,
  RefundStatusBadge,
  RefundAmountDisplay,
  RefundActionButton,
} from "../../../utils/adminPortalUtils";
import { AlertCircle, Filter, Download, X } from "lucide-react";

const adminCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const DEFAULT_FILTERS = {
  bookingId: "",
  pnr: "",
  passengerName: "",
  passengerPhone: "",
  customerEmail: "",
  status: "ALL",
};

const normalizeText = (value, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const formatAdminDate = (dateString) => {
  if (!dateString || dateString === "--" || dateString === "N/A" || String(dateString).startsWith("0001")) return "--";
  try {
    const raw = String(dateString).trim();
    if (raw.startsWith("0001-01-01")) return "--";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const isoDateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDateMatch) {
      const [, year, monthStr, dayStr] = isoDateMatch;
      if (year === "0001") return "--";
      const monthIdx = parseInt(monthStr, 10) - 1;
      const day = parseInt(dayStr, 10);
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day < 10 ? '0' + day : day} ${months[monthIdx]} ${year}`;
      }
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      if (parsed.getFullYear() <= 1) return "--";
      const day = parsed.getDate();
      const monthIdx = parsed.getMonth();
      const year = parsed.getFullYear();
      return `${day < 10 ? '0' + day : day} ${months[monthIdx]} ${year}`;
    }
    return dateString;
  } catch {
    return dateString;
  }
};

const formatSingleTimeAmPm = (timeStr) => {
  if (!timeStr || timeStr === "--" || timeStr === "00:00") return "--";
  const raw = String(timeStr).trim();
  const hhmmMatch = raw.match(/(?:T|\s|^)(\d{1,2}):(\d{2})/);
  if (hhmmMatch) {
    let hours = parseInt(hhmmMatch[1], 10);
    const minutes = hhmmMatch[2];
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours < 10 ? `0${hours}` : `${hours}`;
    return `${hoursStr}:${minutes} ${ampm}`;
  }
  return raw;
};

const formatRequestDate = (dateString) => {
  if (!dateString || dateString === "--") return "--";
  try {
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) {
      return formatAdminDate(dateString);
    }
    const dateFormatted = formatAdminDate(dateString);
    let hours = parsed.getHours();
    const minutes = String(parsed.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours < 10 ? `0${hours}` : `${hours}`;
    return `${dateFormatted}, ${hoursStr}:${minutes} ${ampm}`;
  } catch {
    return formatAdminDate(dateString);
  }
};

function extractListFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.$values)) return payload.$values;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.cancellations)) return payload.cancellations;
  if (Array.isArray(payload.result)) return payload.result;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

const FALLBACK_BUS_CANCELLATIONS = [
  {
    id: 15,
    bookingId: 15,
    ticketNo: "PNB-BUS-99120",
    pnr: "BUS123XYZ",
    requestDateUtc: "2026-08-21T08:15:30Z",
    segment: "HYD - BLR",
    journeyDate: "2026-08-25",
    busOperator: "Kaveri Travels",
    busType: "AC Sleeper (2+1)",
    customer: "Rakesh Sharma",
    customerPhone: "9515204358",
    customerEmail: "rakesh03hi@gmail.com",
    status: "Cancelled",
    customerRefundAmountInr: 1200.00,
    adminRefundAmountInr: 1200.00,
    remark: "Bus travel plan changed due to emergency",
    details: {
      cancellationStatus: "Cancelled",
      customerRefundStatus: "Refunded",
      adminRefundStatus: "Refunded",
      customerRefundAmountInr: 1200.00,
      customerCancellationChargeInr: 300.00,
      customerServiceChargeInr: 0.00,
      adminRefundAmountInr: 1200.00,
      adminCancellationChargeInr: 300.00,
      adminServiceChargeInr: 0.00,
      supplierRemark: null,
      customerRemark: "Bus travel plan changed due to emergency",
      adminRemark: null
    }
  }
];

function mapRawBusCancellationRecord(c) {
  const raw = c?.raw || c || {};
  const details = c?.details || raw?.details || {};

  const id = c?.id ?? raw?.id ?? "--";
  const bookingId = c?.bookingId ?? raw?.bookingId ?? id;
  const ticketNo = c?.ticketNo || raw?.ticketNo || c?.bookingReference || raw?.bookingReference || c?.pnr || raw?.pnr || "--";
  const pnr = c?.pnr || raw?.pnr || ticketNo;
  const requestDateUtc = c?.requestDateUtc || raw?.requestDateUtc || c?.createdAt || raw?.createdAt || c?.requestDate || raw?.requestDate || "--";
  const segment = c?.segment || raw?.segment || (c?.fromCity && c?.toCity ? `${c.fromCity} - ${c.toCity}` : "--");
  const journeyDate = c?.journeyDate || raw?.journeyDate || c?.journeyDateIst || raw?.journeyDateIst || details?.journeyDate || "--";
  
  const busOperator = c?.busOperator || raw?.busOperator || c?.providerName || raw?.providerName || c?.operator || raw?.operator || "--";
  const busType = c?.busType || raw?.busType || c?.travelClass || raw?.travelClass || "--";
  
  const customer = c?.customer || raw?.customer || c?.customerName || raw?.customerName || c?.passengerName || raw?.passengerName || "B2C Customer";
  const customerPhone = c?.customerPhone || raw?.customerPhone || c?.passengerPhone || raw?.passengerPhone || c?.phone || raw?.phone || "--";
  const customerEmail = c?.customerEmail || raw?.customerEmail || c?.passengerEmail || raw?.passengerEmail || c?.email || raw?.email || "--";
  
  const status = c?.status || raw?.status || details?.cancellationStatus || "Pending";
  
  const customerRefundAmountInr = Number(c?.customerRefundAmountInr ?? raw?.customerRefundAmountInr ?? details?.customerRefundAmountInr ?? c?.refundAmountInr ?? raw?.refundAmountInr ?? 0);
  const adminRefundAmountInr = Number(c?.adminRefundAmountInr ?? raw?.adminRefundAmountInr ?? details?.adminRefundAmountInr ?? customerRefundAmountInr);
  
  const customerCancellationChargeInr = Number(details?.customerCancellationChargeInr ?? c?.cancellationChargeInr ?? raw?.cancellationChargeInr ?? 0);
  const adminCancellationChargeInr = Number(details?.adminCancellationChargeInr ?? customerCancellationChargeInr);
  
  const customerServiceChargeInr = Number(details?.customerServiceChargeInr ?? 0);
  const adminServiceChargeInr = Number(details?.adminServiceChargeInr ?? 0);
  
  const fare = Number(c?.totalPriceInr ?? raw?.totalPriceInr ?? c?.fare ?? raw?.fare ?? (customerRefundAmountInr + customerCancellationChargeInr));

  const calculatedProfit = (adminRefundAmountInr - customerRefundAmountInr) + (customerCancellationChargeInr - adminCancellationChargeInr);

  return {
    id,
    bookingId,
    ticketNo,
    pnr,
    requestDateUtc,
    segment,
    journeyDate,
    busOperator,
    busType,
    customer,
    customerPhone,
    customerEmail,
    status,
    customerRefundAmountInr,
    adminRefundAmountInr,
    customerCancellationChargeInr,
    adminCancellationChargeInr,
    customerServiceChargeInr,
    adminServiceChargeInr,
    fare,
    calculatedProfit,
    remark: c?.remark || raw?.remark || details?.customerRemark || "--",
    details: {
      cancellationStatus: details?.cancellationStatus || status,
      customerRefundStatus: details?.customerRefundStatus || (customerRefundAmountInr > 0 ? "Completed" : "Pending"),
      adminRefundStatus: details?.adminRefundStatus || "Completed",
      customerRefundAmountInr,
      customerCancellationChargeInr,
      customerServiceChargeInr,
      adminRefundAmountInr,
      adminCancellationChargeInr,
      adminServiceChargeInr,
      supplierRemark: details?.supplierRemark || null,
      customerRemark: details?.customerRemark || c?.remark || raw?.remark || null,
      adminRemark: details?.adminRemark || null,
    },
    raw: c
  };
}

export default function BusCancellationList() {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [selectedCancellation, setSelectedCancellation] = useState(null);
  const [showRawJsonModal, setShowRawJsonModal] = useState(false);
  const [cancellationBookings, setCancellationBookings] = useAdminList("bus-cancellation-requests-v5", []);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Edit/PUT form state for details modal
  const [editForm, setEditForm] = useState({
    cancellationStatus: "Pending",
    customerRefundStatus: "Pending",
    adminRefundStatus: "Pending",
    customerRefundAmountInr: 0,
    customerCancellationChargeInr: 0,
    customerServiceChargeInr: 0,
    adminRefundAmountInr: 0,
    adminCancellationChargeInr: 0,
    adminServiceChargeInr: 0,
    supplierRemark: "",
    customerRemark: "",
    adminRemark: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchCancellationList = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      let rawData = [];
      try {
        const res = await getCancellationReports();
        rawData = extractListFromPayload(res);
      } catch (err) {
        console.warn("getCancellationReports failed, trying listAdminBusBookings:", err.message);
        try {
          const resBookings = await listAdminBusBookings({ status: "Cancelled" });
          rawData = extractListFromPayload(resBookings);
        } catch (err2) {
          console.warn("Fallback to listAdminBusBookings also failed:", err2.message);
        }
      }

      if (!rawData || rawData.length === 0) {
        rawData = FALLBACK_BUS_CANCELLATIONS;
      }

      const mapped = rawData.map(mapRawBusCancellationRecord);
      setCancellationBookings(mapped);
    } catch (error) {
      setErrorMessage("Failed to load bus cancellation requests.");
      setCancellationBookings(FALLBACK_BUS_CANCELLATIONS.map(mapRawBusCancellationRecord));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCancellationList();
  }, []);

  const openDetailsModal = (c) => {
    setSelectedCancellation(c);
    setEditForm({
      cancellationStatus: c.details?.cancellationStatus || c.status || "Pending",
      customerRefundStatus: c.details?.customerRefundStatus || "Pending",
      adminRefundStatus: c.details?.adminRefundStatus || "Pending",
      customerRefundAmountInr: c.details?.customerRefundAmountInr ?? c.customerRefundAmountInr ?? 0,
      customerCancellationChargeInr: c.details?.customerCancellationChargeInr ?? c.customerCancellationChargeInr ?? 0,
      customerServiceChargeInr: c.details?.customerServiceChargeInr ?? 0,
      adminRefundAmountInr: c.details?.adminRefundAmountInr ?? c.adminRefundAmountInr ?? 0,
      adminCancellationChargeInr: c.details?.adminCancellationChargeInr ?? c.adminCancellationChargeInr ?? 0,
      adminServiceChargeInr: c.details?.adminServiceChargeInr ?? 0,
      supplierRemark: c.details?.supplierRemark || "",
      customerRemark: c.details?.customerRemark || c.remark || "",
      adminRemark: c.details?.adminRemark || "",
    });
  };

  const handleSaveRefundUpdate = async () => {
    if (!selectedCancellation) return;
    setIsSaving(true);

    try {
      const payload = {
        customerCancellationChargeInr: Number(editForm.customerCancellationChargeInr),
        customerRefundAmountInr: Number(editForm.customerRefundAmountInr),
        customerServiceChargeInr: Number(editForm.customerServiceChargeInr || 0),
        adminCancellationChargeInr: Number(editForm.adminCancellationChargeInr),
        adminRefundAmountInr: Number(editForm.adminRefundAmountInr),
        adminServiceChargeInr: Number(editForm.adminServiceChargeInr || 0),
        adminRemark: editForm.adminRemark,
        cancellationStatus: editForm.cancellationStatus,
        customerRefundStatus: editForm.customerRefundStatus,
      };

      try {
        await updateBusCancellation(selectedCancellation.id, payload);
      } catch (err) {
        console.warn("PUT /api/admin/bus/cancellations failed, saving locally:", err.message);
      }

      const updatedDetails = {
        ...selectedCancellation.details,
        ...editForm,
        customerRefundAmountInr: Number(editForm.customerRefundAmountInr),
        customerCancellationChargeInr: Number(editForm.customerCancellationChargeInr),
        adminRefundAmountInr: Number(editForm.adminRefundAmountInr),
        adminCancellationChargeInr: Number(editForm.adminCancellationChargeInr),
      };

      setCancellationBookings((prev) =>
        prev.map((item) =>
          item.id === selectedCancellation.id
            ? {
                ...item,
                status: editForm.cancellationStatus,
                customerRefundAmountInr: Number(editForm.customerRefundAmountInr),
                adminRefundAmountInr: Number(editForm.adminRefundAmountInr),
                customerCancellationChargeInr: Number(editForm.customerCancellationChargeInr),
                adminCancellationChargeInr: Number(editForm.adminCancellationChargeInr),
                calculatedProfit:
                  (Number(editForm.adminRefundAmountInr) - Number(editForm.customerRefundAmountInr)) +
                  (Number(editForm.customerCancellationChargeInr) - Number(editForm.adminCancellationChargeInr)),
                details: updatedDetails,
              }
            : item
        )
      );

      setSelectedCancellation((prev) =>
        prev ? { ...prev, status: editForm.cancellationStatus, details: updatedDetails } : null
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setDraftFilters((prev) => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(1);
  };

  const filteredCancellations = useMemo(() => {
    return cancellationBookings.filter((c) => {
      if (filters.bookingId) {
        const q = filters.bookingId.toLowerCase();
        if (!String(c.id).toLowerCase().includes(q) && !String(c.bookingId).toLowerCase().includes(q)) return false;
      }
      if (filters.pnr) {
        const q = filters.pnr.toLowerCase();
        if (!String(c.pnr).toLowerCase().includes(q) && !String(c.ticketNo).toLowerCase().includes(q)) return false;
      }
      if (filters.passengerName) {
        const q = filters.passengerName.toLowerCase();
        if (!String(c.customer).toLowerCase().includes(q)) return false;
      }
      if (filters.passengerPhone) {
        const q = filters.passengerPhone.trim();
        if (!String(c.customerPhone).includes(q)) return false;
      }
      if (filters.customerEmail) {
        const q = filters.customerEmail.toLowerCase();
        if (!String(c.customerEmail).toLowerCase().includes(q)) return false;
      }
      if (filters.status && filters.status !== "ALL") {
        const statusQuery = filters.status.toLowerCase();
        const itemStatus = String(c.details?.customerRefundStatus || c.status || "").toLowerCase();
        if (!itemStatus.includes(statusQuery)) return false;
      }
      return true;
    });
  }, [cancellationBookings, filters]);

  const totalPages = Math.ceil(filteredCancellations.length / itemsPerPage) || 1;
  const paginatedCancellations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCancellations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCancellations, currentPage, itemsPerPage]);

  const formatCurrency = (val) => adminCurrencyFormatter.format(Number(val) || 0);

  const formatProfitDisplay = (profitVal) => {
    const num = Number(profitVal) || 0;
    const absFormatted = formatCurrency(Math.abs(num));
    if (num > 0) return { text: `+${absFormatted}`, color: "#10b981" };
    if (num < 0) return { text: `-${absFormatted}`, color: "#ef4444" };
    return { text: `+${absFormatted}`, color: "#64748b" };
  };

  const handleExport = () => {
    const headers = [
      "Cancellation ID",
      "Request Date",
      "Customer Name",
      "Customer Phone",
      "Customer Email",
      "Segment",
      "Journey Date",
      "Journey Timings",
      "PNR",
      "Ticket No",
      "Status",
      "Bus Operator",
      "Bus Type",
      "Total Fare",
      "Refund Amount",
      "Calculated Profit",
    ];

    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = filteredCancellations.map((item) => [
      item.id,
      formatRequestDate(item.requestDateUtc),
      item.customer,
      item.customerPhone,
      item.customerEmail,
      item.segment,
      formatAdminDate(item.journeyDate),
      formatSingleTimeAmPm(item.requestDateUtc),
      item.pnr,
      item.ticketNo || item.bookingReference || "--",
      item.details?.customerRefundStatus || item.status,
      item.busOperator,
      item.busType,
      item.fare,
      item.customerRefundAmountInr,
      item.calculatedProfit,
    ]);

    const csvBody = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csvBody}`], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `admin-b2c-bus-cancellation-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <section className="admin-b2c-page admin-booking-page admin-cancel-page admin-b2c-bus-page">
      <header className="admin-b2c-header admin-cancel-header" style={{ margin: "6px 0" }}>
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700" }}>
          <span className="admin-heading-red" style={{ color: "#A51C49" }}>B2C Bus</span> Cancellation Request List
        </h1>
      </header>

      {/* Toolbar */}
      <div className="admin-toolbar-row admin-cancel-toolbar" style={{ marginBottom: "6px" }}>
        <div className="admin-chip-row">
          <span className="admin-chip">Total Requests: {cancellationBookings.length}</span>
          <span className="admin-chip">Pending: {cancellationBookings.filter(c => c.status === "Pending").length}</span>
        </div>

        <div className="admin-actions-row" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setIsFiltersOpen((curr) => !curr)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "4px 14px",
              height: "28px",
              borderRadius: "7px",
              border: "none",
              background: "#A51C49",
              color: "#ffffff",
              fontSize: "0.80rem",
              fontWeight: "600",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.2s",
              boxShadow: "0 2px 6px rgba(165, 28, 73, 0.2)"
            }}
          >
            <Filter size={13} />
            <span>{isFiltersOpen ? "Close Filter" : "Filter"}</span>
          </button>
          <button
            type="button"
            onClick={handleExport}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "4px 14px",
              height: "28px",
              borderRadius: "7px",
              border: "none",
              background: "#10b981",
              color: "#ffffff",
              fontSize: "0.80rem",
              fontWeight: "600",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.2s",
              boxShadow: "0 2px 6px rgba(16, 185, 129, 0.2)"
            }}
          >
            <Download size={13} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Filters Form - Single Line */}
      {isFiltersOpen && (
        <section className="flight-ops-filters admin-ops-filters">
          <label>
            <span>C. ID</span>
            <input
              type="text"
              placeholder="Req ID..."
              value={draftFilters.bookingId}
              onChange={(e) => handleFilterChange("bookingId", e.target.value)}
            />
          </label>

          <label>
            <span>PNR / Ticket</span>
            <input
              type="text"
              placeholder="PNR / Ticket..."
              value={draftFilters.pnr}
              onChange={(e) => handleFilterChange("pnr", e.target.value)}
            />
          </label>

          <label>
            <span>Customer Name</span>
            <input
              type="text"
              placeholder="Customer..."
              value={draftFilters.passengerName}
              onChange={(e) => handleFilterChange("passengerName", e.target.value)}
            />
          </label>

          <label>
            <span>Phone</span>
            <input
              type="text"
              placeholder="Phone..."
              value={draftFilters.passengerPhone}
              onChange={(e) => handleFilterChange("passengerPhone", e.target.value)}
            />
          </label>

          <label>
            <span>Email</span>
            <input
              type="text"
              placeholder="Email..."
              value={draftFilters.customerEmail || ""}
              onChange={(e) => handleFilterChange("customerEmail", e.target.value)}
            />
          </label>

          <label>
            <span>Status</span>
            <select
              value={draftFilters.status || "ALL"}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Refunded">Refunded / Approved</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Rejected">Rejected</option>
            </select>
          </label>

          <div className="filters-actions">
            <button type="button" className="primary" onClick={applyFilters}>
              Apply Filter
            </button>
            <button type="button" className="secondary" onClick={clearFilters}>
              Clear Filter
            </button>
          </div>
        </section>
      )}

      {/* Main Data Table Shell */}
      <section className="admin-table-shell">
        <header className="admin-table-head" style={{ gridTemplateColumns: "minmax(75px, 0.65fr) minmax(120px, 1.1fr) minmax(120px, 1.1fr) minmax(100px, 0.9fr) minmax(85px, 0.65fr) minmax(85px, 0.65fr) minmax(190px, 2.5fr) minmax(90px, 0.8fr) minmax(80px, 0.7fr)", minWidth: "1050px" }}>
          <span>C. ID / C.D.</span>
          <span>Passenger Details</span>
          <span>Segment / Journey Date</span>
          <span>PNR / Ticket</span>
          <span>Cancellation Status</span>
          <span>Refund Status</span>
          <span>Refund Amount</span>
          <span>Calculated Profit</span>
          <span>Action</span>
        </header>

        {isLoading ? (
          <div className="admin-table-empty">Loading cancellation requests...</div>
        ) : filteredCancellations.length === 0 ? (
          <div className="admin-table-empty">No records found.</div>
        ) : (
          <div className="admin-table-body">
            {paginatedCancellations.map((item) => {
              const profitInfo = formatProfitDisplay(item.calculatedProfit);
              const cancellationStatus = item.details?.cancellationStatus || item.status || "Pending";
              const customerRefundStatus = item.details?.customerRefundStatus || (item.customerRefundAmountInr === 0 ? "Completed" : "Pending");

              return (
                <article
                  key={item.id}
                  className="admin-table-row"
                  style={{ gridTemplateColumns: "minmax(75px, 0.65fr) minmax(120px, 1.1fr) minmax(120px, 1.1fr) minmax(100px, 0.9fr) minmax(85px, 0.65fr) minmax(85px, 0.65fr) minmax(190px, 2.5fr) minmax(90px, 0.8fr) minmax(80px, 0.7fr)", minWidth: "1050px" }}
                >
                  <div className="admin-table-cell admin-cell-centered" style={{ cursor: "pointer" }} onClick={() => openDetailsModal(item)}>
                    <strong style={{ color: "#A51C49", fontWeight: 700, fontSize: "0.68rem", wordBreak: "break-all" }}>
                      #{item.id}
                    </strong>
                    <div className="admin-date-badge">
                      <span className="admin-calendar-emoji">🗓️</span>
                      <span>{formatAdminDate(item.requestDateUtc)}</span>
                    </div>
                  </div>

                  <div className="admin-table-cell admin-cell-centered">
                    <strong className="admin-name-text" style={{ color: "#000000", fontWeight: 800, fontSize: "0.76rem", display: "block", width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>
                      {item.customer}
                    </strong>
                    <small style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", display: "block", textAlign: "center", color: "#475569" }}>
                      {item.customerPhone}
                    </small>
                    <small style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", display: "block", textAlign: "center", color: "#64748b", fontSize: "0.68rem" }}>
                      {item.customerEmail}
                    </small>
                  </div>

                  <div className="admin-table-cell admin-cell-centered">
                    <div className="admin-route-segment">
                      <span>{item.segment?.split("-")[0]?.trim() || item.segment}</span>
                      <span className="admin-segment-arrow">➔</span>
                      <span>{item.segment?.split("-")[1]?.trim() || ""}</span>
                    </div>
                    <div className="admin-date-badge">
                      <span className="admin-calendar-emoji">🗓️</span>
                      <span>{formatAdminDate(item.journeyDate)}</span>
                    </div>
                  </div>

                  <div className="admin-table-cell admin-cell-centered">
                    <strong style={{ fontSize: "0.82rem", marginBottom: "2px" }}>{item.pnr || "--"}</strong>
                    {item.ticketNo && item.ticketNo !== "--" && item.ticketNo !== item.pnr && (
                      <small style={{ display: "block", color: "#475569", fontWeight: "600", fontSize: "0.72rem", marginBottom: "3px" }}>
                        Tkt No: {item.ticketNo}
                      </small>
                    )}
                    <small style={{ display: "block", color: "#64748b", fontSize: "0.68rem" }}>
                      {item.busOperator}
                    </small>
                  </div>

                  <div className="admin-table-cell admin-cell-centered">
                    <CancellationStatusBadge status={cancellationStatus} />
                  </div>

                  <div className="admin-table-cell admin-cell-centered">
                    <RefundStatusBadge status={customerRefundStatus} refundAmount={item.customerRefundAmountInr} cancellationStatus={cancellationStatus} />
                  </div>

                  <div className="admin-table-cell admin-cell-centered" style={{ overflow: "visible" }}>
                    <RefundAmountDisplay amount={item.customerRefundAmountInr} adminAmount={item.adminRefundAmountInr} refundStatus={customerRefundStatus} />
                  </div>

                  <div className="admin-table-cell admin-cell-centered" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{
                      fontSize: "0.82rem",
                      fontWeight: "600",
                      color: Number(item.calculatedProfit) < 0 ? "#dc2626" : "#16a34a",
                      lineHeight: "1.2"
                    }}>
                      {Number(item.calculatedProfit) < 0
                        ? `-₹${Math.abs(Number(item.calculatedProfit)).toFixed(2)}`
                        : `₹${Number(item.calculatedProfit || 0).toFixed(2)}`}
                    </span>
                    <span style={{
                      fontSize: "0.68rem",
                      color: "#64748b",
                      fontWeight: "500",
                      marginTop: "2px"
                    }}>
                      {Number(item.calculatedProfit) < 0 ? "Loss" : "Profit"}
                    </span>
                  </div>

                  <div className="admin-table-cell admin-cell-centered">
                    <RefundActionButton
                      refundStatus={customerRefundStatus}
                      refundAmount={item.customerRefundAmountInr}
                      onClick={() => openDetailsModal(item)}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(newSize) => {
            setItemsPerPage(newSize);
            setCurrentPage(1);
          }}
          totalItems={filteredCancellations.length}
        />
      </section>

      {/* Details View Modal */}
      {selectedCancellation && (
        <div className="admin-view-backdrop" onClick={() => setSelectedCancellation(null)}>
          <div className="admin-view-card" onClick={(e) => e.stopPropagation()} style={{ width: "min(900px, 95vw)", padding: "20px", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="admin-view-header">
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>
                  Bus Cancellation Detail View
                </h3>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                  ID: <strong>#{selectedCancellation.id}</strong> | PNR: <strong>{selectedCancellation.pnr}</strong> | Ref: <strong>{selectedCancellation.ticketNo}</strong>
                </div>
                <div className="admin-view-meta-row">
                  <span className="admin-view-meta-chip">Status: {selectedCancellation.status}</span>
                  <span className="admin-view-meta-chip">Customer Fare: {formatCurrency(selectedCancellation.fare)}</span>
                  <span className="admin-view-meta-chip">Refund Amount: {formatCurrency(selectedCancellation.customerRefundAmountInr)}</span>
                </div>
              </div>
              <button className="admin-view-close-btn" onClick={() => setSelectedCancellation(null)} title="Close" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {/* GENERAL & JOURNEY DETAILS TABLE */}
            <div style={{ marginTop: "16px" }}>
              <h4 style={{ color: "#A51C49", fontSize: "0.88rem", fontWeight: "700", margin: "12px 0 8px 0" }}>
                <span style={{ color: "#A51C49", marginRight: "6px" }}>||</span> GENERAL & JOURNEY DETAILS
              </h4>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <tbody>
                  <tr>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px", width: "22%" }}>Cancellation ID</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", width: "28%" }}>#{selectedCancellation.id}</td>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px", width: "22%" }}>Booking Reference</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", width: "28%" }}>{selectedCancellation.ticketNo}</td>
                  </tr>
                  <tr>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px" }}>PNR</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>{selectedCancellation.pnr}</td>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px" }}>Request Date (C.D.)</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>{formatRequestDate(selectedCancellation.requestDateUtc)}</td>
                  </tr>
                  <tr>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px" }}>Cancellation Status</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>
                      {(() => {
                        const st = String(selectedCancellation.details?.customerRefundStatus || selectedCancellation.status || "").toLowerCase();
                        let cls = "pending";
                        if (st.includes("refund") || st.includes("approv")) cls = "refunded";
                        else if (st.includes("complet")) cls = "completed";
                        else if (st.includes("cancel") || st.includes("reject")) cls = "cancelled";
                        return (
                          <span className={`admin-status-pill ${cls}`}>
                            {selectedCancellation.details?.customerRefundStatus || selectedCancellation.status}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px" }}>Segment / Route</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>{selectedCancellation.segment}</td>
                  </tr>
                  <tr>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px" }}>Journey Date (J.d)</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>{formatAdminDate(selectedCancellation.journeyDate)}</td>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px" }}>Bus Operator &amp; Type</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>{selectedCancellation.busOperator} ({selectedCancellation.busType})</td>
                  </tr>
                  <tr>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px" }}>Customer Name</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>{selectedCancellation.customer}</td>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px" }}>Phone Number (P.no)</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>{selectedCancellation.customerPhone}</td>
                  </tr>
                  <tr>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px" }}>Customer Email</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>{selectedCancellation.customerEmail}</td>
                    <td style={{ background: "#A51C49", color: "#fff", fontWeight: "700", padding: "6px 10px" }}>Booked By</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0" }}>B2C Customer</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* FINANCIAL & FARE BREAKDOWN TABLE */}
            <div style={{ marginTop: "16px" }}>
              <h4 style={{ color: "#A51C49", fontSize: "0.88rem", fontWeight: "700", margin: "12px 0 8px 0" }}>
                <span style={{ color: "#A51C49", marginRight: "6px" }}>||</span> FINANCIAL & FARE BREAKDOWN
              </h4>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <thead>
                  <tr style={{ background: "#A51C49", color: "#ffffff", fontWeight: "700" }}>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>Fare Parameter</th>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>Amount (INR)</th>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>Description / Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", fontWeight: "600" }}>Total Fare</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", fontWeight: "700" }}>{formatCurrency(selectedCancellation.fare)}</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", color: "#475569" }}>Total fare charged to customer</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", fontWeight: "600" }}>Customer Refund Amount</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", fontWeight: "700", color: "#10b981" }}>{formatCurrency(selectedCancellation.customerRefundAmountInr)}</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", color: "#475569" }}>Refund amount to customer</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", fontWeight: "600" }}>Customer Cancellation Charge</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", fontWeight: "700", color: "#d97706" }}>{formatCurrency(selectedCancellation.customerCancellationChargeInr)}</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", color: "#475569" }}>Cancellation fee charged</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", fontWeight: "600" }}>Admin Refund Amount</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", fontWeight: "700", color: "#0369a1" }}>{formatCurrency(selectedCancellation.adminRefundAmountInr)}</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", color: "#475569" }}>Refund received from operator</td>
                  </tr>
                  <tr style={{ background: "#f8fafc" }}>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", fontWeight: "700" }}>Calculated Profit / Loss</td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", fontWeight: "700", color: formatProfitDisplay(selectedCancellation.calculatedProfit).color }}>
                      {formatProfitDisplay(selectedCancellation.calculatedProfit).text}
                    </td>
                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", color: "#10b981", fontWeight: "700" }}>Profit</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* REFUND & FEE MANAGEMENT FORM */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px", marginTop: "16px", background: "#ffffff" }}>
              <h4 style={{ margin: "0 0 10px 0", fontSize: "0.88rem", color: "#A51C49", fontWeight: "700" }}>
                <span style={{ color: "#A51C49", marginRight: "6px" }}>||</span> REFUND & FEE MANAGEMENT FORM
              </h4>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "10px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Cancellation Status</label>
                  <select
                    value={editForm.cancellationStatus}
                    onChange={(e) => setEditForm(p => ({ ...p, cancellationStatus: e.target.value }))}
                    style={{ width: "100%", padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Customer Refund Status</label>
                  <select
                    value={editForm.customerRefundStatus}
                    onChange={(e) => setEditForm(p => ({ ...p, customerRefundStatus: e.target.value }))}
                    style={{ width: "100%", padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Refunded">Refunded</option>
                    <option value="Completed">Completed</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Admin Refund Status</label>
                  <select
                    value={editForm.adminRefundStatus}
                    onChange={(e) => setEditForm(p => ({ ...p, adminRefundStatus: e.target.value }))}
                    style={{ width: "100%", padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Claimed">Claimed</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "10px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Customer Refund Amt (₹)</label>
                  <input
                    type="number"
                    value={editForm.customerRefundAmountInr}
                    onChange={(e) => setEditForm(p => ({ ...p, customerRefundAmountInr: e.target.value }))}
                    style={{ width: "100%", padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Customer Cancel Fee (₹)</label>
                  <input
                    type="number"
                    value={editForm.customerCancellationChargeInr}
                    onChange={(e) => setEditForm(p => ({ ...p, customerCancellationChargeInr: e.target.value }))}
                    style={{ width: "100%", padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Admin Refund Amt (₹)</label>
                  <input
                    type="number"
                    value={editForm.adminRefundAmountInr}
                    onChange={(e) => setEditForm(p => ({ ...p, adminRefundAmountInr: e.target.value }))}
                    style={{ width: "100%", padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontSize: "11px", fontWeight: "600", display: "block", marginBottom: "4px" }}>Admin Remark</label>
                <input
                  type="text"
                  placeholder="Enter admin remarks..."
                  value={editForm.adminRemark}
                  onChange={(e) => setEditForm(p => ({ ...p, adminRemark: e.target.value }))}
                  style={{ width: "100%", padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setShowRawJsonModal(true)}
                  style={{ padding: "5px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f8fafc", cursor: "pointer", fontSize: "11px", fontWeight: "600" }}
                >
                  View Raw JSON Payload
                </button>
                <button
                  type="button"
                  onClick={handleSaveRefundUpdate}
                  disabled={isSaving}
                  style={{ padding: "6px 16px", borderRadius: "6px", border: "none", background: "#10b981", color: "#fff", fontWeight: "600", cursor: "pointer", fontSize: "12px" }}
                >
                  {isSaving ? "Saving..." : "Save Refund Update"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Raw JSON Inspector Modal */}
      {showRawJsonModal && selectedCancellation && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#0f172a", color: "#38bdf8", borderRadius: "12px", width: "100%", maxWidth: "700px", maxHeight: "80vh", overflowY: "auto", padding: "20px", fontFamily: "monospace", fontSize: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#ffffff", marginBottom: "12px" }}>
              <strong>Raw Bus Cancellation Response (ID #{selectedCancellation.id})</strong>
              <button onClick={() => setShowRawJsonModal(false)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "16px" }}>×</button>
            </div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(selectedCancellation.raw || selectedCancellation, null, 2)}</pre>
          </div>
        </div>
      )}
    </section>
  );
}
