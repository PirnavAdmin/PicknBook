/* eslint-disable */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Filter, Download, ChevronDown, Eye, Edit2 } from 'lucide-react';
import depositApi, { getDepositRequests, cycleDepositStatus, updateAdminRemark } from "../../../services/depositService";

const toTitleCase = (str) => {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
};

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
    const [activeDropdownId, setActiveDropdownId] = useState(null);

    const [editPopupOpen, setEditPopupOpen] = useState(false);
    const [requestToEdit, setRequestToEdit] = useState(null);
    const [newStatus, setNewStatus] = useState('');

    useEffect(() => {
        const handleClickOutside = () => setActiveDropdownId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

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

    // Apply search and min/max amount filters on deposit requests
    const filteredRequests = depositRequests
        .filter(request => {
            if (!searchQuery || !searchQuery.trim()) return true;
            const q = searchQuery.trim().toLowerCase();
            return (
                (request.user && String(request.user).toLowerCase().includes(q)) ||
                (request.amount && String(request.amount).toLowerCase().includes(q)) ||
                (request.type && String(request.type).toLowerCase().includes(q)) ||
                (request.status && String(request.status).toLowerCase().includes(q)) ||
                (request.userRemark && String(request.userRemark).toLowerCase().includes(q)) ||
                (request.adminRemark && String(request.adminRemark).toLowerCase().includes(q)) ||
                (request.entryDate && String(request.entryDate).toLowerCase().includes(q)) ||
                (request.transactionDate && String(request.transactionDate).toLowerCase().includes(q))
            );
        })
        .filter(request => (statusFilter === 'All' || !statusFilter ? true : (request.status || '').toLowerCase() === statusFilter.toLowerCase()))
        .filter(request => (typeFilter === 'All' || !typeFilter ? true : (request.type || '').toLowerCase() === typeFilter.toLowerCase()))
        .filter(request => (minAmount === '' ? true : Number(request.amount) >= Number(minAmount)))
        .filter(request => (maxAmount === '' ? true : Number(request.amount) <= Number(maxAmount)));

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
        const statusCycle = ['Pending', 'Approved', 'Completed', 'Rejected'];
        const current = toTitleCase(request.adminRemark || request.status);
        const nextIdx = (statusCycle.indexOf(current) + 1) % statusCycle.length;
        const nextStatus = statusCycle[nextIdx >= 0 ? nextIdx : 0];

        // Optimistically update and move updated row to the top of table
        setDepositRequests(prev => {
            const updatedItem = prev.find(item => item.id === request.id);
            if (!updatedItem) return prev;
            const modified = {
                ...updatedItem,
                status: nextStatus,
                adminRemark: nextStatus,
            };
            const remaining = prev.filter(item => item.id !== request.id);
            return [modified, ...remaining];
        });

        showToast(`Status updated to ${nextStatus}.`, 'success');

        try {
            await cycleDepositStatus(request.id);
        } catch (error) {
            console.warn("Silent background status cycle:", error);
        }
    };

    const getStatusStyle = (status) => {
        const s = (status || '').toLowerCase();
        switch (s) {
            case 'pending':
                return { background: '#fefce8', color: '#b45309', border: '1px solid #fde047' }; // Yellow
            case 'failed':
            case 'rejected':
                return { background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }; // Red
            case 'completed':
                return { background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac' }; // Green
            case 'approved':
                return { background: '#eff6ff', color: '#2563eb', border: '1px solid #93c5fd' }; // Blue
            case 'processing':
                return { background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd' };
            default:
                return { background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' };
        }
    };

    const handleEditStatusPopup = (request) => {
        setRequestToEdit(request);
        const currentStatus = (request.adminRemark || request.status || '').toLowerCase();
        const validOptions = ['pending', 'approved', 'completed', 'rejected', 'processing'];
        setNewStatus(validOptions.includes(currentStatus) ? currentStatus : 'pending');
        setEditPopupOpen(true);
    };

    const handleSaveStatus = async () => {
        if (!requestToEdit) return;
        const targetId = requestToEdit.id;
        const formattedStatus = toTitleCase(newStatus);

        // Optimistically update and move the updated row to the top of table
        setDepositRequests(prev => {
            const updatedItem = prev.find(item => item.id === targetId);
            if (!updatedItem) return prev;
            const modified = {
                ...updatedItem,
                status: formattedStatus,
                adminRemark: formattedStatus,
            };
            const remaining = prev.filter(item => item.id !== targetId);
            return [modified, ...remaining];
        });

        setEditPopupOpen(false);
        showToast('Status updated successfully.', 'success');

        try {
            await updateAdminRemark(targetId, newStatus);
        } catch (error) {
            console.warn("Silent background save status:", error);
        }
    };

    // Inline Styles
    const styles = {
        container: {
            padding: '16px 24px',
            background: 'var(--page-bg)',
            minHeight: '100vh',
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            gap: '12px',
            flexWrap: 'wrap',
        },
        titleWrapper: {
            display: 'flex',
            alignItems: 'baseline',
            gap: '6px',
            paddingBottom: '4px',
            width: 'fit-content',
        },
        titleMain: {
            fontSize: '1.4rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
        },
        titleSub: {
            fontSize: '1.4rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
        },

        actions: {
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
        },
        button: {
            padding: '6px 14px',
            borderRadius: '6px',
            border: '1px solid transparent',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
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
            borderRadius: '10px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
            overflowX: 'auto',
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.8rem',
        },
        thead: {
            background: 'linear-gradient(90deg, var(--primary), var(--primary-strong))',
            color: '#ffffff',
            fontWeight: 600,
            position: 'sticky',
            top: 0,
        },
        th: {
            padding: '10px 10px',
            textAlign: 'center',
            borderRight: '1px solid rgba(255, 255, 255, 0.2)',
            whiteSpace: 'nowrap',
            fontSize: '12px',
            fontWeight: 600,
        },
        td: {
            padding: '8px 10px',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text-primary)',
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: 400,
        },
        tr: {
            transition: 'background-color 0.2s ease',
        },
        snBadge: {
            fontWeight: 500,
            color: '#A51C49',
            fontSize: '12px',
        },
        userCell: {
            fontWeight: 400,
            color: 'var(--text-primary)',
            fontSize: '12px',
        },
        amountCell: {
            fontWeight: 500,
            color: '#A51C49',
            fontSize: '12px',
        },
        statusBadge: {
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: '6px',
            fontWeight: 500,
            fontSize: '11px',
            border: '1px solid',
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
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
            padding: '4px 14px',
            borderRadius: '20px',
            border: '1px solid #0f172a',
            background: '#ffffff',
            color: '#0f172a',
            fontWeight: 500,
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
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
                            style={{ ...styles.button, ...styles.filterBtn, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--primary-strong)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'var(--primary)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                            onClick={() => setFilterOpen(!filterOpen)}
                        >
                            <Filter size={16} />
                            <span>Filter</span>
                        </button>
                        <button
                            style={{ ...styles.button, ...styles.exportBtn, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(30, 142, 62, 0.85)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'var(--success)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                            onClick={handleExport}
                        >
                            <Download size={16} />
                            <span>Export</span>
                        </button>
                    </div>
                </div>

                {filterOpen && (
                    <div style={{
                        background: '#ffffff',
                        padding: '16px 20px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                        marginBottom: '20px',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            gap: '14px',
                            flexWrap: 'wrap',
                            width: '100%'
                        }}>
                            <div style={{ flex: 1, minWidth: '130px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    style={{
                                        width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)',
                                        background: 'var(--surface-soft)', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none', height: '38px'
                                    }}
                                >
                                    <option value="All">All</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>

                            <div style={{ flex: 1, minWidth: '130px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Type</label>
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    style={{
                                        width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)',
                                        background: 'var(--surface-soft)', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none', height: '38px'
                                    }}
                                >
                                    <option value="All">All</option>
                                    <option value="Cash">Cash</option>
                                    <option value="NEFT">NEFT</option>
                                </select>
                            </div>

                            <div style={{ flex: 1, minWidth: '130px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Min Amount</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={minAmount}
                                    onChange={(e) => setMinAmount(e.target.value)}
                                    style={{
                                        width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)',
                                        background: 'var(--surface-soft)', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none', height: '38px'
                                    }}
                                    placeholder="0"
                                />
                            </div>

                            <div style={{ flex: 1, minWidth: '130px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Max Amount</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={maxAmount}
                                    onChange={(e) => setMaxAmount(e.target.value)}
                                    style={{
                                        width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)',
                                        background: 'var(--surface-soft)', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none', height: '38px'
                                    }}
                                    placeholder="5000"
                                />
                            </div>

                            {/* Buttons in same line: Apply Filter (Blue) and Reset Filter (Gray) */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '38px' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCurrentPage(1);
                                    }}
                                    style={{
                                        height: '38px',
                                        padding: '0 18px',
                                        borderRadius: '8px',
                                        border: '1px solid #2563eb',
                                        background: '#2563eb',
                                        color: '#ffffff',
                                        fontSize: '0.82rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                                        whiteSpace: 'nowrap'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#1d4ed8';
                                        e.currentTarget.style.borderColor = '#1d4ed8';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#2563eb';
                                        e.currentTarget.style.borderColor = '#2563eb';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    Apply Filter
                                </button>

                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    style={{
                                        height: '38px',
                                        padding: '0 18px',
                                        borderRadius: '8px',
                                        border: '1px solid #64748b',
                                        background: '#64748b',
                                        color: '#ffffff',
                                        fontSize: '0.82rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 2px 4px rgba(100, 116, 139, 0.2)',
                                        whiteSpace: 'nowrap'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#475569';
                                        e.currentTarget.style.borderColor = '#475569';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#64748b';
                                        e.currentTarget.style.borderColor = '#64748b';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {selectedRequest && createPortal(
                    <div 
                        onClick={() => setSelectedRequest(null)}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999999
                        }}
                    >
                        <div 
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: '#ffffff', padding: '24px', borderRadius: '14px', width: '600px', maxWidth: '90%',
                                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)', border: '1px solid #e2e8f0'
                            }}
                        >
                            <div style={styles.detailHeader}>
                                <div style={{ ...styles.detailTitle, fontSize: '1.25rem', marginBottom: '16px' }}>Request Details</div>
                                <button
                                    type="button"
                                    className="navy-close-btn"
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
                    </div>,
                    document.body
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
                                                        e.target.style.opacity = '0.85';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.opacity = '1';
                                                    }}
                                                >
                                                    {toTitleCase(request.adminRemark || request.status)}
                                                </button>
                                            </td>
                                            <td style={styles.td}>{request.userRemark ? toTitleCase(request.userRemark) : '-'}</td>
                                            <td style={styles.td}>{request.entryDate}</td>
                                            <td style={styles.td}>{request.transactionDate}</td>
                                            <td style={{ ...styles.td, position: 'relative', overflow: 'visible' }}>
                                                <div style={{ position: 'relative', display: 'inline-block', verticalAlign: 'middle' }}>
                                                    <button
                                                        type="button"
                                                        className={`actions-trigger-btn ${activeDropdownId === request.id ? 'active' : ''}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveDropdownId(activeDropdownId === request.id ? null : request.id);
                                                        }}
                                                    >
                                                        <span>Actions</span> <ChevronDown size={14} />
                                                    </button>
                                                    {activeDropdownId === request.id && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            ...(index >= currentItems.length - 2 || currentItems.length <= 3
                                                                ? { bottom: '100%', marginBottom: '6px' }
                                                                : { top: '100%', marginTop: '6px' }),
                                                            right: 0,
                                                            background: '#ffffff',
                                                            borderRadius: '12px',
                                                            border: '1px solid #e2e8f0',
                                                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                                            zIndex: 99999,
                                                            minWidth: '150px',
                                                            width: 'max-content',
                                                            padding: '6px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '2px'
                                                        }}>
                                                            <button
                                                                type="button"
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', gap: '8px',
                                                                    padding: '8px 12px', borderRadius: '6px', fontSize: '12px',
                                                                    fontWeight: 500, color: '#334155', background: 'transparent',
                                                                    border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left'
                                                                }}
                                                                onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                                onClick={() => { setActiveDropdownId(null); setSelectedRequest(request); }}
                                                            >
                                                                <Eye size={14} /> <span>View Details</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', gap: '8px',
                                                                    padding: '8px 12px', borderRadius: '6px', fontSize: '12px',
                                                                    fontWeight: 500, color: '#334155', background: 'transparent',
                                                                    border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left'
                                                                }}
                                                                onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                                onClick={() => { setActiveDropdownId(null); handleEditStatusPopup(request); }}
                                                            >
                                                                <Edit2 size={14} /> <span>Edit</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
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
                    {totalItems > 0 && (
                        <div style={styles.pagination}>
                            <div style={styles.paginationInfo}>
                                Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} of {totalItems} entries
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
                                    &lt; Previous
                                </button>
                                {Array.from({ length: Math.max(totalPages, 1) }, (_, i) => i + 1).map(pageNum => (
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
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    style={{
                                        ...styles.pageBtn,
                                        ...(currentPage === totalPages || totalPages === 0 ? styles.pageBtnDisabled : {})
                                    }}
                                >
                                    Next &gt;
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {editPopupOpen && requestToEdit && createPortal(
                    <div 
                        onClick={() => setEditPopupOpen(false)}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999999
                        }}
                    >
                        <div 
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: '#ffffff', padding: '24px 28px', borderRadius: '16px', width: '560px', maxWidth: '92%',
                                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)', border: '1px solid #e2e8f0'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                                    Edit Deposit Request
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setEditPopupOpen(false)}
                                    style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Full Details Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 18px', marginBottom: '18px', background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>User</div>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>{requestToEdit.user}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>Amount</div>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#A51C49' }}>Rs. {requestToEdit.amount}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>Type</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#334155' }}>{requestToEdit.type}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>Payment Details</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#334155' }}>{toTitleCase(requestToEdit.userRemark) || '-'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>Entry Date</div>
                                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{requestToEdit.entryDate}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>Transaction Date</div>
                                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{requestToEdit.transactionDate}</div>
                                </div>
                            </div>

                            {/* Edit Status Dropdown */}
                            <div style={{ marginBottom: '22px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                                    Status <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <select 
                                    value={newStatus} 
                                    onChange={e => setNewStatus(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1',
                                        background: '#ffffff', color: '#0f172a', fontSize: '0.88rem', outline: 'none',
                                        fontWeight: 500
                                    }}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="completed">Completed</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="processing">Processing</option>
                                </select>
                            </div>

                            {/* Action Buttons: Orange Cancel & Blue Save */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                                <button 
                                    type="button"
                                    onClick={() => setEditPopupOpen(false)}
                                    style={{
                                        padding: '7px 20px',
                                        borderRadius: '20px',
                                        border: '1px solid #ea580c',
                                        background: '#ffffff',
                                        color: '#ea580c',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fff7ed'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleSaveStatus}
                                    style={{
                                        padding: '7px 22px',
                                        borderRadius: '20px',
                                        border: '1px solid #2563eb',
                                        background: '#2563eb',
                                        color: '#ffffff',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#1d4ed8'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#2563eb'; }}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </>
    );
}

export default DepositRequestList;
