/* eslint-disable */
import React, { useEffect, useRef, useState } from 'react';
import depositApi, { getDepositRequests, cycleDepositStatus, updateAdminRemark } from "../../../services/depositService";

function DepositRequestList() {
    const toastTimerRef = useRef(null);
    const [depositRequests, setDepositRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;


    const [searchQuery, setSearchQuery] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [toast, setToast] = useState(null);

    const [editPopupOpen, setEditPopupOpen] = useState(false);
    const [requestToEdit, setRequestToEdit] = useState(null);
    const [newStatus, setNewStatus] = useState('');

    const showToast = (message, tone = 'info') => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        setToast({ message, tone });
        toastTimerRef.current = setTimeout(() => setToast(null), 2400);
    };

    const fetchDepositRequests = async () => {
        setLoading(true);
        try {
            const data = await getDepositRequests({
                status: statusFilter,
                type: typeFilter,
                search: searchQuery,
            });
            setDepositRequests(data || []);
        } catch (error) {
            console.error("Error fetching deposit requests:", error);
            showToast("Failed to fetch deposit requests.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepositRequests();
        setCurrentPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, typeFilter, searchQuery]);

    // Apply min/max amount filters on the returned list
    const filteredRequests = depositRequests
        .filter(request => (minAmount === '' ? true : request.amount >= Number(minAmount)))
        .filter(request => (maxAmount === '' ? true : request.amount <= Number(maxAmount)));

    const totalItems = filteredRequests.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);


    const handleClearFilters = () => {
        setSearchQuery('');
        setStatusFilter('All');
        setTypeFilter('All');
        setMinAmount('');
        setMaxAmount('');
        setFilterOpen(false);
        showToast('Filters cleared.', 'info');
    };

    const handleExport = () => {
        const header = [
            'ID',
            'User',
            'Amount',
            'Type',
            'Status',
            'Payment Details',
            'Entry Date',
            'Transaction Date'
        ];
        const rows = filteredRequests.map(r => [
            r.id,
            r.user,
            r.amount,
            r.type,
            r.status,
            r.userRemark,
            r.entryDate,
            r.transactionDate
        ]);
        const csv = [header, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'deposit-requests.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('Export completed.', 'success');
    };

    const handleEditRemark = async (request) => {
        const nextRemark = window.prompt('Update admin remark', request.adminRemark || '');
        if (nextRemark === null) {
            return;
        }
        try {
            await updateAdminRemark(request.id, nextRemark);
            showToast('Admin remark updated.', 'success');
            fetchDepositRequests();
        } catch (error) {
            console.error("Error updating admin remark:", error);
            showToast("Failed to update admin remark.", "error");
        }
    };

    const handleCycleStatus = async (request) => {
        try {
            const response = await cycleDepositStatus(request.id);
            showToast(response.message || `Status updated.`, 'success');
            fetchDepositRequests();
        } catch (error) {
            console.error("Error cycling status:", error);
            showToast("Failed to update deposit status.", "error");
        }
    };

    const getStatusStyle = (status) => {
        const s = (status || '').toLowerCase();
        switch (s) {
            case 'pending':
                return { background: 'rgba(255, 193, 7, 0.12)', color: '#d97706', border: '1px solid rgba(255, 193, 7, 0.3)' };
            case 'processing':
                return { background: 'rgba(0, 123, 255, 0.12)', color: '#007bff', border: '1px solid rgba(0, 123, 255, 0.3)' };
            case 'completed':
            case 'approved':
                return { background: 'rgba(30, 142, 62, 0.12)', color: 'var(--success)', border: '1px solid rgba(30, 142, 62, 0.3)' };
            case 'rejected':
                return { background: 'rgba(217, 48, 37, 0.12)', color: 'var(--danger)', border: '1px solid rgba(217, 48, 37, 0.3)' };
            default:
                return { background: 'var(--surface-soft)', color: 'var(--text-secondary)', border: '1px solid var(--border)' };
        }
    };



    const handleEditStatusPopup = (request) => {
        setRequestToEdit(request);
        const currentStatus = (request.adminRemark || request.status || '').toLowerCase();
        const validOptions = ['pending', 'processing', 'completed', 'rejected'];
        setNewStatus(validOptions.includes(currentStatus) ? currentStatus : 'pending');
        setEditPopupOpen(true);
    };

    const handleSaveStatus = async () => {
        if (!requestToEdit) return;
        try {
            await updateAdminRemark(requestToEdit.id, newStatus);
            showToast('Status updated successfully.', 'success');
            setEditPopupOpen(false);
            fetchDepositRequests();
        } catch (error) {
            console.error("Error updating status:", error);
            showToast("Failed to update status.", "error");
        }
    };

    // Inline Styles
    const styles = {
        container: {
            padding: '24px 32px',
            background: 'var(--page-bg)',
            minHeight: '100vh',
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            gap: '16px',
            flexWrap: 'wrap',
        },
        titleWrapper: {
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px',
            paddingBottom: '8px',
            width: 'fit-content',
        },
        titleMain: {
            fontSize: '2rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
        },
        titleSub: {
            fontSize: '2rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
        },

        actions: {
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
        },
        button: {
            padding: '10px 16px',
            borderRadius: '6px',
            border: '1px solid transparent',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
        },
        filterBtn: {
            background: 'var(--primary)',
            color: '#ffffff',
            borderColor: 'var(--primary)',
        },
        clearBtn: {
            background: 'var(--panel)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border)',
        },
        exportBtn: {
            background: 'var(--success)',
            color: '#ffffff',
            borderColor: 'var(--success)',
        },
        tableWrapper: {
            background: 'var(--panel)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
            overflowX: 'auto',
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.85rem',
        },
        thead: {
            background: 'linear-gradient(90deg, var(--primary), var(--primary-strong))',
            color: '#ffffff',
            fontWeight: 700,
            position: 'sticky',
            top: 0,
        },
        th: {
            padding: '12px 14px',
            textAlign: 'center',
            borderRight: '1px solid rgba(255, 255, 255, 0.2)',
            whiteSpace: 'nowrap',
        },
        td: {
            padding: '12px 14px',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text-primary)',
            textAlign: 'center',
        },
        tr: {
            transition: 'background-color 0.2s ease',
        },
        snBadge: {
            fontWeight: 700,
            color: 'var(--primary)',
            minWidth: '30px',
        },
        userCell: {
            fontWeight: 600,
            color: 'var(--text-primary)',
        },
        amountCell: {
            fontWeight: 700,
            color: 'var(--primary)',
        },
        statusBadge: {
            display: 'inline-block',
            padding: '6px 12px',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '0.75rem',
            border: '1px solid',
            cursor: 'pointer',
            background: 'transparent',
            fontFamily: 'inherit',
        },
        actionButtons: {
            display: 'flex',
            gap: '8px',
            flexWrap: 'nowrap',
        },
        actionBtn: {
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid transparent',
            fontWeight: 600,
            fontSize: '0.75rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '36px',
            height: '32px',
        },
        detailsBtn: {
            background: 'var(--surface-soft)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border)',
        },
        editBtn: {
            background: 'var(--surface-soft)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border)',
        },
        emptyState: {
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-secondary)',
        },
        searchBox: {
            padding: '10px 14px',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '0.85rem',
            width: '200px',
            outline: 'none',
            transition: 'all 0.2s ease',
            background: 'var(--panel)',
            color: 'var(--text-primary)',
        },
        filterPanel: {
            marginTop: '12px',
            padding: '14px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--panel)',
            boxShadow: 'var(--shadow-sm)',
            display: 'grid',
            gap: '12px',
        },
        filterRow: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
        },
        filterGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
        },
        filterLabel: {
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
        },
        filterInput: {
            padding: '8px 10px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--panel)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            outline: 'none',
        },
        filterSelect: {
            padding: '8px 10px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--panel)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            outline: 'none',
        },
        detailCard: {
            padding: '16px',
            borderRadius: '14px',
            border: '1px solid var(--border)',
            background: 'var(--panel)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '16px',
            display: 'grid',
            gap: '12px',
        },
        detailHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        detailTitle: {
            fontWeight: 700,
            color: 'var(--text-primary)',
        },
        detailGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
        },
        detailLabel: {
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            fontWeight: 700,
        },
        detailValue: {
            fontSize: '0.9rem',
            color: 'var(--text-primary)',
        },
        secondaryBtn: {
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--panel)',
            color: 'var(--text-primary)',
            fontWeight: 600,
            cursor: 'pointer',
        },
        toast: {
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            background: 'var(--panel)',
            color: 'var(--text-primary)',
            fontWeight: 600,
            fontSize: '0.85rem',
            marginBottom: '16px',
            boxShadow: 'var(--shadow-sm)',
        },
        toastSuccess: {
            borderColor: 'rgba(30, 142, 62, 0.4)',
            background: 'rgba(30, 142, 62, 0.1)',
            color: 'var(--success)',
        },
        toastError: {
            borderColor: 'rgba(217, 48, 37, 0.4)',
            background: 'rgba(217, 48, 37, 0.1)',
            color: 'var(--danger)',
        },
        toastInfo: {
            borderColor: 'rgba(74, 15, 26, 0.25)',
            background: 'rgba(74, 15, 26, 0.08)',
            color: 'var(--primary)',
        },
        pagination: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            background: 'var(--panel)',
            borderTop: '1px solid var(--border)',
            gap: '12px',
        },
        paginationInfo: {
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            fontWeight: 500,
        },
        pageNumbers: {
            display: 'flex',
            gap: '6px',
            alignItems: 'center',
        },
        pageBtn: {
            padding: '6px 12px',
            border: '1px solid var(--border)',
            background: 'var(--panel)',
            color: 'var(--text-primary)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            transition: 'all 0.2s ease',
        },
        pageBtnDisabled: {
            opacity: 0.5,
            cursor: 'not-allowed',
        },
        pageNoBtn: {
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border)',
            background: 'var(--panel)',
            color: 'var(--text-primary)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            transition: 'all 0.2s ease',
        },
        pageNoActive: {
            background: '#A51C49',
            color: '#ffffff',
            borderColor: '#A51C49',
        },
    };


    return (
        <>
            <div style={styles.container}>
                {toast && (
                    <div
                        style={{
                            ...styles.toast,
                            ...(toast.tone === 'success'
                                ? styles.toastSuccess
                                : toast.tone === 'error'
                                    ? styles.toastError
                                    : styles.toastInfo),
                        }}
                    >
                        {toast.message}
                    </div>
                )}
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.titleWrapper}>
                        <h1 style={styles.titleMain}>Deposit Request</h1>
                        <h2 style={styles.titleSub}>List</h2>
                    </div>
                    <div style={styles.actions}>
                        <input
                            type="text"
                            placeholder="Search requests..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={styles.searchBox}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'var(--primary)';
                                e.target.style.boxShadow = '0 0 0 2px rgba(74, 15, 26, 0.15)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'var(--border)';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                        <button
                            style={{ ...styles.button, ...styles.filterBtn }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'var(--primary-strong)';
                                e.target.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'var(--primary)';
                                e.target.style.transform = 'translateY(0)';
                            }}
                            onClick={() => setFilterOpen(!filterOpen)}
                        >
                            Filter
                        </button>
                        <button
                            style={{ ...styles.button, ...styles.clearBtn }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'var(--primary)';
                                e.target.style.color = '#ffffff';
                                e.target.style.borderColor = 'var(--primary)';
                                e.target.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'var(--panel)';
                                e.target.style.color = 'var(--text-primary)';
                                e.target.style.borderColor = 'var(--border)';
                                e.target.style.transform = 'translateY(0)';
                            }}
                            onClick={handleClearFilters}
                        >
                            Clear Filter
                        </button>
                        <button
                            style={{ ...styles.button, ...styles.exportBtn }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(30, 142, 62, 0.85)';
                                e.target.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'var(--success)';
                                e.target.style.transform = 'translateY(0)';
                            }}
                            onClick={handleExport}
                        >
                            Export
                        </button>
                    </div>
                </div>

                {filterOpen && (
                    <div style={styles.filterPanel}>
                        <div style={styles.filterRow}>
                            <div style={styles.filterGroup}>
                                <label style={styles.filterLabel}>Status</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    style={styles.filterSelect}
                                >
                                    <option value="All">All</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>
                            <div style={styles.filterGroup}>
                                <label style={styles.filterLabel}>Type</label>
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    style={styles.filterSelect}
                                >
                                    <option value="All">All</option>
                                    <option value="Cash">Cash</option>
                                    <option value="NEFT">NEFT</option>
                                </select>
                            </div>
                            <div style={styles.filterGroup}>
                                <label style={styles.filterLabel}>Min Amount</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={minAmount}
                                    onChange={(e) => setMinAmount(e.target.value)}
                                    style={styles.filterInput}
                                    placeholder="0"
                                />
                            </div>
                            <div style={styles.filterGroup}>
                                <label style={styles.filterLabel}>Max Amount</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={maxAmount}
                                    onChange={(e) => setMaxAmount(e.target.value)}
                                    style={styles.filterInput}
                                    placeholder="5000"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {selectedRequest && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                    }}>
                        <div style={{
                            background: 'var(--panel)', padding: '24px', borderRadius: '14px', width: '600px', maxWidth: '90%',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                        }}>
                            <div style={styles.detailHeader}>
                                <div style={{ ...styles.detailTitle, fontSize: '1.25rem', marginBottom: '16px' }}>Request Details</div>
                                <button
                                    type="button"
                                    style={styles.secondaryBtn}
                                    onClick={() => setSelectedRequest(null)}
                                >
                                    Close
                                </button>
                            </div>
                            <div style={styles.detailGrid}>
                                <div>
                                    <div style={styles.detailLabel}>User</div>
                                    <div style={styles.detailValue}>{selectedRequest.user}</div>
                                </div>
                                <div>
                                    <div style={styles.detailLabel}>Amount</div>
                                    <div style={styles.detailValue}>Rs. {selectedRequest.amount}</div>
                                </div>
                                <div>
                                    <div style={styles.detailLabel}>Type</div>
                                    <div style={styles.detailValue}>{selectedRequest.type}</div>
                                </div>
                                <div>
                                    <div style={styles.detailLabel}>Status</div>
                                    <div style={styles.detailValue}>{selectedRequest.status}</div>
                                </div>
                                <div>
                                    <div style={styles.detailLabel}>Entry Date</div>
                                    <div style={styles.detailValue}>{selectedRequest.entryDate}</div>
                                </div>
                                <div>
                                    <div style={styles.detailLabel}>Transaction Date</div>
                                    <div style={styles.detailValue}>{selectedRequest.transactionDate}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div style={styles.tableWrapper}>
                    {loading ? (
                        <p style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>Loading requests...</p>
                    ) : (
                        <table style={styles.table}>
                            <thead style={styles.thead}>
                                <tr>
                                    <th style={styles.th}>SN.</th>
                                    <th style={styles.th}>User</th>
                                    <th style={styles.th}>Amount</th>
                                    <th style={styles.th}>Type</th>
                                    <th style={styles.th}>Status</th>
                                    <th style={styles.th}>Payment Details</th>
                                    <th style={styles.th}>Entry Date</th>
                                    <th style={styles.th}>Trns. Date</th>
                                    <th style={styles.th}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentItems.length > 0 ? (
                                    currentItems.map((request, index) => (
                                        <tr
                                            key={request.id}
                                            style={styles.tr}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(74, 15, 26, 0.06)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            <td style={{ ...styles.td, ...styles.snBadge }}>{indexOfFirstItem + index + 1}</td>

                                            <td style={{ ...styles.td, ...styles.userCell }}>{request.user}</td>
                                            <td style={{ ...styles.td, ...styles.amountCell }}>Rs. {request.amount}</td>
                                            <td style={styles.td}>{request.type}</td>
                                            <td style={styles.td}>
                                                <button
                                                    type="button"
                                                    style={{
                                                        ...styles.statusBadge,
                                                        ...getStatusStyle(request.adminRemark || request.status)
                                                    }}
                                                    onClick={() => handleCycleStatus(request)}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.opacity = '0.8';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.opacity = '1';
                                                    }}
                                                >
                                                    {request.adminRemark || request.status}
                                                </button>
                                            </td>
                                            <td style={styles.td}>{request.userRemark}</td>
                                            <td style={styles.td}>{request.entryDate}</td>
                                            <td style={styles.td}>{request.transactionDate}</td>
                                            <td style={{ ...styles.td, ...styles.actionButtons }}>
                                                <button
                                                    type="button"
                                                    style={{ ...styles.actionBtn, ...styles.detailsBtn }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.background = 'rgba(74, 15, 26, 0.12)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.background = 'var(--surface-soft)';
                                                    }}
                                                    title="View Details"
                                                    onClick={() => setSelectedRequest(request)}
                                                >
                                                    Details
                                                </button>
                                                <button
                                                    type="button"
                                                    style={{ ...styles.actionBtn, ...styles.editBtn }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.background = 'rgba(74, 15, 26, 0.18)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.background = 'var(--surface-soft)';
                                                    }}
                                                    title="Edit"
                                                    onClick={() => handleEditStatusPopup(request)}
                                                >
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '10px' }}>No data</div>
                                            <p>No deposit requests found matching "{searchQuery}"</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={styles.pagination}>
                            <div style={styles.paginationInfo}>
                                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalItems)} of {totalItems} entries
                            </div>
                            <div style={styles.pageNumbers}>
                                <button
                                    type="button"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    style={{
                                        ...styles.pageBtn,
                                        ...(currentPage === 1 ? styles.pageBtnDisabled : {})
                                    }}
                                >
                                    Previous
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                                    <button
                                        key={pageNum}
                                        type="button"
                                        onClick={() => setCurrentPage(pageNum)}
                                        style={{
                                            ...styles.pageNoBtn,
                                            ...(currentPage === pageNum ? styles.pageNoActive : {})
                                        }}
                                    >
                                        {pageNum}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    style={{
                                        ...styles.pageBtn,
                                        ...(currentPage === totalPages ? styles.pageBtnDisabled : {})
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {editPopupOpen && requestToEdit && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                    }}>
                        <div style={{
                            background: 'var(--panel)', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                        }}>
                            <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-primary)', textAlign: 'center' }}>Update Status</h3>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Status</label>
                                <select 
                                    value={newStatus} 
                                    onChange={e => setNewStatus(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)',
                                        background: 'var(--surface-soft)', color: 'var(--text-primary)', outline: 'none'
                                    }}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="processing">Processing</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button 
                                    onClick={() => setEditPopupOpen(false)}
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveStatus}
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer' }}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

export default DepositRequestList;
