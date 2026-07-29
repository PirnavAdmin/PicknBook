/* eslint-disable */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCustomers, toggleCustomerStatus, toggleWalletStatus, addWalletBalance, resetWalletBalance, deleteCustomer } from "../../../services/customerService";
import { setStoredValue } from '../../../utils/adminPortalStorage';

function CustomerList() {
    const navigate = useNavigate();
    const toastTimerRef = useRef(null);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;


    const [searchQuery, setSearchQuery] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState('All');
    const [walletFilter, setWalletFilter] = useState('All');
    const [minBalance, setMinBalance] = useState('');
    const [maxBalance, setMaxBalance] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [openMenu, setOpenMenu] = useState({ id: null, type: null });
    const [toast, setToast] = useState(null);

    const showToast = (message, tone = 'info') => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        setToast({ message, tone });
        toastTimerRef.current = setTimeout(() => setToast(null), 2400);
    };

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const data = await getCustomers({
                status: statusFilter,
                walletStatus: walletFilter,
                search: searchQuery,
                minBalance: minBalance === '' ? "" : Number(minBalance),
                maxBalance: maxBalance === '' ? "" : Number(maxBalance),
            });
            setCustomers(data || []);
            if (statusFilter === 'All' && walletFilter === 'All' && !searchQuery && minBalance === '' && maxBalance === '') {
                setStoredValue('customers', data || []);
            }
        } catch (error) {
            console.error("Error fetching customers:", error);
            const detailedError = error.response?.data 
                ? (typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data))
                : "Failed to load customers from API.";
            showToast(detailedError.slice(0, 150), "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
        setCurrentPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, walletFilter, minBalance, maxBalance, searchQuery]);

    const filteredCustomers = customers;

    const totalItems = filteredCustomers.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);


    const activeCount = customers.filter(c => c.status === 'Active').length;
    const inactiveCount = customers.filter(c => c.status !== 'Active').length;
    const totalRecords = customers.length;
    const totalWalletBalance = customers.reduce((sum, c) => sum + Number(c.walletBalance || 0), 0);

    const applyQuickFilter = (message, options = {}) => {
        const {
            status = statusFilter,
            wallet = walletFilter,
            min = minBalance,
            max = maxBalance,
            clearSearch = false,
        } = options;

        setStatusFilter(status);
        setWalletFilter(wallet);
        setMinBalance(min);
        setMaxBalance(max);
        if (clearSearch) {
            setSearchQuery('');
        }
        setFilterOpen(false);
        showToast(message, 'info');
    };

    const handleActiveStat = () =>
        applyQuickFilter('Showing active customers.', { status: 'Active' });

    const handleInactiveStat = () =>
        applyQuickFilter('Showing inactive customers.', { status: 'Inactive' });

    const handleTotalStat = () =>
        applyQuickFilter('Showing all customers.', {
            status: 'All',
            wallet: 'All',
            min: '',
            max: '',
            clearSearch: true,
        });

    const handleWalletStat = () =>
        applyQuickFilter('Showing customers with active wallets.', { wallet: 'Active' });

    const handleClearFilters = () => {
        setSearchQuery('');
        setStatusFilter('All');
        setWalletFilter('All');
        setMinBalance('');
        setMaxBalance('');
        setFilterOpen(false);
        showToast('Filters cleared.', 'info');
    };

    const toggleMenu = (id, type) => {
        setOpenMenu(prev =>
            prev.id === id && prev.type === type ? { id: null, type: null } : { id, type }
        );
    };

    const closeMenu = () => setOpenMenu({ id: null, type: null });

    const handleToggleStatus = async (id) => {
        try {
            await toggleCustomerStatus(id);
            showToast('Customer status updated.', 'success');
            fetchCustomers();
        } catch (error) {
            console.error("Error toggling customer status:", error);
            showToast("Failed to toggle customer status.", "error");
        }
        closeMenu();
    };

    const handleToggleWalletStatus = async (id) => {
        try {
            await toggleWalletStatus(id);
            showToast('Wallet status updated.', 'success');
            fetchCustomers();
        } catch (error) {
            console.error("Error toggling wallet status:", error);
            showToast("Failed to toggle wallet status.", "error");
        }
        closeMenu();
    };

    const handleAddBalance = async (id) => {
        const rawAmount = window.prompt('Enter amount to add');
        if (rawAmount === null) {
            return;
        }
        const amount = Number(rawAmount);
        if (Number.isNaN(amount) || amount <= 0) {
            showToast('Please enter a valid amount.', 'error');
            return;
        }
        try {
            await addWalletBalance(id, amount);
            showToast('Wallet balance updated.', 'success');
            fetchCustomers();
        } catch (error) {
            console.error("Error adding balance:", error);
            showToast("Failed to add balance.", "error");
        }
        closeMenu();
    };

    const handleResetBalance = async (id) => {
        try {
            await resetWalletBalance(id);
            showToast('Wallet balance reset.', 'info');
            fetchCustomers();
        } catch (error) {
            console.error("Error resetting balance:", error);
            showToast("Failed to reset balance.", "error");
        }
        closeMenu();
    };

    const handleRemoveCustomer = async (id) => {
        const customer = customers.find(c => c.id === id);
        if (!customer) {
            return;
        }
        const confirmed = window.confirm(`Remove ${customer.customerName}?`);
        if (!confirmed) {
            return;
        }
        try {
            await deleteCustomer(id);
            showToast('Customer removed.', 'info');
            fetchCustomers();
        } catch (error) {
            console.error("Error deleting customer:", error);
            showToast("Failed to delete customer.", "error");
        }
        closeMenu();
    };

    const handleEditCustomer = (id) => {
        navigate(`/admin/customer-management/edit-customer/${id}`);
    };

    const handleViewDetails = (customer) => {
        setSelectedCustomer(customer);
        showToast('Showing customer details.', 'info');
        closeMenu();
    };

    const handleLogin = (customer) => {
        showToast(`Login as ${customer.customerName} requested.`, 'info');
    };

    const handleExport = () => {
        const header = [
            'ID',
            'Status',
            'Customer Name',
            'Email',
            'Mobile',
            'Wallet Status',
            'Wallet Balance'
        ];
        const rows = filteredCustomers.map(c => [
            c.id,
            c.status,
            c.customerName,
            c.emailId,
            c.mobile,
            c.walletStatus,
            c.walletBalance
        ]);
        const csv = [header, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'customers.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('Export completed.', 'success');
    };

    // Inline Styles
    const styles = {
        container: {
            padding: '24px 32px',
            background: 'var(--page-bg)',
            minHeight: '100vh',
        },
        header: {
            marginBottom: '20px',
        },

        titleSection: {
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
        addBtn: {
            padding: '10px 16px',
            background: '#A51C49',
            color: '#ffffff',
            border: '1px solid #A51C49',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.9rem',
        },

        statsBar: {
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
        },
        statBadge: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '6px',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: 'none',
            background: 'transparent',
            fontFamily: 'inherit',
        },
        statActive: {
            background: 'rgba(30, 142, 62, 0.12)',
            color: 'var(--success)',
            border: '1px solid rgba(30, 142, 62, 0.3)',
        },
        statInactive: {
            background: 'rgba(217, 48, 37, 0.12)',
            color: 'var(--danger)',
            border: '1px solid rgba(217, 48, 37, 0.3)',
        },
        statTotal: {
            background: 'linear-gradient(135deg, var(--primary), var(--primary-strong))',
            color: '#ffffff',
            border: 'none',
        },
        statWallet: {
            background: 'linear-gradient(135deg, var(--primary-strong), var(--primary))',
            color: '#ffffff',
            border: 'none',
        },
        actionBar: {
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            flexWrap: 'wrap',
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
            textAlign: 'left',
            borderRight: '1px solid rgba(255, 255, 255, 0.2)',
            whiteSpace: 'nowrap',
        },
        td: {
            padding: '12px 14px',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text-primary)',
        },
        tr: {
            transition: 'background-color 0.2s ease',
        },
        idBadge: {
            fontWeight: 700,
            color: 'var(--primary)',
            minWidth: '50px',
        },
        statusBadge: {
            display: 'inline-block',
            padding: '6px 10px',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '0.75rem',
            border: '1px solid',
        },
        statusActive: {
            background: 'rgba(30, 142, 62, 0.12)',
            color: 'var(--success)',
            borderColor: 'rgba(30, 142, 62, 0.3)',
        },
        statusInactive: {
            background: 'rgba(217, 48, 37, 0.12)',
            color: 'var(--danger)',
            borderColor: 'rgba(217, 48, 37, 0.3)',
        },
        actionButtons: {
            display: 'flex',
            gap: '6px',
            flexWrap: 'nowrap',
            alignItems: 'center',
        },
        actionBtn: {
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid transparent',
            fontWeight: 600,
            fontSize: '0.75rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
        },
        dropdownBtn: {
            background: 'var(--panel)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border)',
        },
        financeBtn: {
            background: 'var(--panel)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border)',
        },
        detailsBtn: {
            background: 'var(--surface-soft)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border)',
        },
        loginBtn: {
            background: 'var(--surface-soft)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border)',
            padding: '6px 10px',
            minWidth: '40px',
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
        countBadge: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            fontWeight: 700,
            fontSize: '0.75rem',
            color: '#ffffff',
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
        menuWrapper: {
            position: 'relative',
        },
        menu: {
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-sm)',
            zIndex: 10,
            minWidth: '170px',
            padding: '6px',
        },
        menuItem: {
            width: '100%',
            border: 'none',
            background: 'transparent',
            textAlign: 'left',
            padding: '8px 10px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            cursor: 'pointer',
        },
        menuItemDanger: {
            color: 'var(--danger)',
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


    const getStatusBadgeStyle = (status) => ({
        ...styles.statusBadge,
        ...(status === 'Active' ? styles.statusActive : styles.statusInactive),
    });

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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={styles.titleSection}>
                            <h1 style={styles.titleMain}>Customer</h1>
                            <h2 style={styles.titleSub}>List</h2>
                        </div>
                        <button
                            type="button"
                            style={styles.addBtn}
                            onClick={() => navigate('/admin/customer-management/add-new-customer')}
                             onMouseEnter={(e) => {
                                e.target.style.background = '#851237';
                                e.target.style.borderColor = '#851237';
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 4px 12px rgba(165, 28, 73, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = '#A51C49';
                                e.target.style.color = '#ffffff';
                                e.target.style.borderColor = '#A51C49';
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                            }}
                        >
                            + Add Customer
                        </button>
                    </div>



                    {/* Stats Bar */}
                    <div style={styles.statsBar}>
                        <button
                            type="button"
                            style={{ ...styles.statBadge, ...styles.statActive }}
                            onClick={handleActiveStat}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <span style={{ ...styles.countBadge, background: 'var(--success)' }}>{activeCount}</span>
                            Active
                        </button>
                        <button
                            type="button"
                            style={{ ...styles.statBadge, ...styles.statInactive }}
                            onClick={handleInactiveStat}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <span style={{ ...styles.countBadge, background: 'var(--danger)' }}>{inactiveCount}</span>
                            In Active
                        </button>
                        <button
                            type="button"
                            style={{ ...styles.statBadge, ...styles.statTotal }}
                            onClick={handleTotalStat}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            Total Records: {totalRecords}
                        </button>
                        <button
                            type="button"
                            style={{ ...styles.statBadge, ...styles.statWallet }}
                            onClick={handleWalletStat}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            Rs. {totalWalletBalance} Total Wallet
                        </button>

                        {/* Action Buttons */}
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                placeholder="Search customer..."
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
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                            <div style={styles.filterGroup}>
                                <label style={styles.filterLabel}>Wallet Status</label>
                                <select
                                    value={walletFilter}
                                    onChange={(e) => setWalletFilter(e.target.value)}
                                    style={styles.filterSelect}
                                >
                                    <option value="All">All</option>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                            <div style={styles.filterGroup}>
                                <label style={styles.filterLabel}>Min Wallet</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={minBalance}
                                    onChange={(e) => setMinBalance(e.target.value)}
                                    style={styles.filterInput}
                                    placeholder="0"
                                />
                            </div>
                            <div style={styles.filterGroup}>
                                <label style={styles.filterLabel}>Max Wallet</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={maxBalance}
                                    onChange={(e) => setMaxBalance(e.target.value)}
                                    style={styles.filterInput}
                                    placeholder="5000"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {selectedCustomer && (
                    <div style={styles.detailCard}>
                        <div style={styles.detailHeader}>
                            <div style={styles.detailTitle}>Customer Details</div>
                            <button
                                type="button"
                                style={styles.secondaryBtn}
                                onClick={() => setSelectedCustomer(null)}
                            >
                                Close
                            </button>
                        </div>
                        <div style={styles.detailGrid}>
                            <div>
                                <div style={styles.detailLabel}>Customer</div>
                                <div style={styles.detailValue}>{selectedCustomer.customerName}</div>
                            </div>
                            <div>
                                <div style={styles.detailLabel}>Email</div>
                                <div style={styles.detailValue}>{selectedCustomer.emailId}</div>
                            </div>
                            <div>
                                <div style={styles.detailLabel}>Mobile</div>
                                <div style={styles.detailValue}>{selectedCustomer.mobile}</div>
                            </div>
                            <div>
                                <div style={styles.detailLabel}>Status</div>
                                <div style={styles.detailValue}>{selectedCustomer.status}</div>
                            </div>
                            <div>
                                <div style={styles.detailLabel}>Wallet Status</div>
                                <div style={styles.detailValue}>{selectedCustomer.walletStatus}</div>
                            </div>
                            <div>
                                <div style={styles.detailLabel}>Wallet Balance</div>
                                <div style={styles.detailValue}>Rs. {selectedCustomer.walletBalance}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div style={styles.tableWrapper}>
                    {loading ? (
                        <p style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>Loading customers...</p>
                    ) : filteredCustomers.length > 0 ? (
                        <table style={styles.table}>
                            <thead style={styles.thead}>
                                <tr>
                                    <th style={styles.th}>ID</th>
                                    <th style={styles.th}>Status</th>
                                    <th style={styles.th}>Customer Name</th>
                                    <th style={styles.th}>Email ID</th>
                                    <th style={styles.th}>Mobile</th>
                                    <th style={styles.th}>Wallet Status</th>
                                    <th style={styles.th}>Wallet Bal.</th>
                                    <th style={styles.th}>Action</th>
                                    <th style={styles.th}>Finance</th>
                                    <th style={styles.th}>Search</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentItems.map((customer) => (
                                    <tr
                                        key={customer.id}
                                        style={styles.tr}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(74, 15, 26, 0.06)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <td style={{ ...styles.td, ...styles.idBadge }}>{customer.id}</td>
                                        <td style={styles.td}>
                                            <button
                                                type="button"
                                                style={getStatusBadgeStyle(customer.status)}
                                                onClick={() => handleToggleStatus(customer.id)}
                                                onMouseEnter={(e) => {
                                                    e.target.style.opacity = '0.85';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.opacity = '1';
                                                }}
                                            >
                                                {customer.status}
                                            </button>
                                        </td>
                                        <td style={styles.td}>{customer.customerName}</td>
                                        <td style={styles.td}>{customer.emailId}</td>
                                        <td style={styles.td}>{customer.mobile}</td>
                                        <td style={styles.td}>
                                            <button
                                                type="button"
                                                style={getStatusBadgeStyle(customer.walletStatus)}
                                                onClick={() => handleToggleWalletStatus(customer.id)}
                                                onMouseEnter={(e) => {
                                                    e.target.style.opacity = '0.85';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.opacity = '1';
                                                }}
                                            >
                                                {customer.walletStatus}
                                            </button>
                                        </td>
                                        <td style={styles.td}>Rs. {customer.walletBalance}</td>
                                        <td style={styles.td}>
                                            <div style={styles.menuWrapper}>
                                                <button
                                                    type="button"
                                                    style={{ ...styles.actionBtn, ...styles.dropdownBtn }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.borderColor = 'var(--primary)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.borderColor = 'var(--border)';
                                                    }}
                                                    onClick={() => toggleMenu(customer.id, 'action')}
                                                >
                                                    Action
                                                </button>
                                                {openMenu.id === customer.id && openMenu.type === 'action' && (
                                                    <div style={styles.menu}>
                                                        <button
                                                            type="button"
                                                            style={styles.menuItem}
                                                            onMouseEnter={(e) => { e.target.style.background = 'rgba(74, 15, 26, 0.08)'; }}
                                                            onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
                                                            onClick={() => handleEditCustomer(customer.id)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            style={styles.menuItem}
                                                            onMouseEnter={(e) => { e.target.style.background = 'rgba(74, 15, 26, 0.08)'; }}
                                                            onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
                                                            onClick={() => handleViewDetails(customer)}
                                                        >
                                                            View
                                                        </button>
                                                        <button
                                                            type="button"
                                                            style={{ ...styles.menuItem, ...styles.menuItemDanger }}
                                                            onMouseEnter={(e) => {
                                                                e.target.style.background = 'rgba(217, 48, 37, 0.08)';
                                                            }}
                                                            onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
                                                            onClick={() => handleRemoveCustomer(customer.id)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={styles.menuWrapper}>
                                                <button
                                                    type="button"
                                                    style={{ ...styles.actionBtn, ...styles.financeBtn }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.borderColor = 'var(--primary)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.borderColor = 'var(--border)';
                                                    }}
                                                    onClick={() => toggleMenu(customer.id, 'finance')}
                                                >
                                                    Finance
                                                </button>
                                                {openMenu.id === customer.id && openMenu.type === 'finance' && (
                                                    <div style={styles.menu}>
                                                        <button
                                                            type="button"
                                                            style={styles.menuItem}
                                                            onMouseEnter={(e) => { e.target.style.background = 'rgba(74, 15, 26, 0.08)'; }}
                                                            onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
                                                            onClick={() => handleAddBalance(customer.id)}
                                                        >
                                                            Add Balance
                                                        </button>
                                                        <button
                                                            type="button"
                                                            style={styles.menuItem}
                                                            onMouseEnter={(e) => { e.target.style.background = 'rgba(74, 15, 26, 0.08)'; }}
                                                            onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
                                                            onClick={() => handleResetBalance(customer.id)}
                                                        >
                                                            Reset Balance
                                                        </button>
                                                        <button
                                                            type="button"
                                                            style={styles.menuItem}
                                                            onMouseEnter={(e) => { e.target.style.background = 'rgba(74, 15, 26, 0.08)'; }}
                                                            onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
                                                            onClick={() => handleToggleWalletStatus(customer.id)}
                                                        >
                                                            Toggle Wallet Status
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            <button
                                                type="button"
                                                style={{ ...styles.actionBtn, ...styles.detailsBtn }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.background = 'rgba(74, 15, 26, 0.12)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.background = 'var(--surface-soft)';
                                                }}
                                                onClick={() => handleLogin(customer)}
                                            >
                                                Search
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={styles.emptyState}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '10px' }}>No data</div>
                            <p>No customers found matching "{searchQuery}"</p>
                        </div>
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

            </div>
        </>
    );
}

export default CustomerList;
