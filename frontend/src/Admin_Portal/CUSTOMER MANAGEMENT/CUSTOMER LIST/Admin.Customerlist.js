/* eslint-disable */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit2, Trash2, X, ChevronDown, PlusCircle, RotateCcw, Wallet, User, Phone, Mail, ShieldAlert, Filter, Download } from 'lucide-react';
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
    const [filterName, setFilterName] = useState('');
    const [filterEmail, setFilterEmail] = useState('');
    const [filterMobile, setFilterMobile] = useState('');

    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [addBalanceCustomer, setAddBalanceCustomer] = useState(null);
    const [balanceInput, setBalanceInput] = useState('');
    const [resetBalanceCustomer, setResetBalanceCustomer] = useState(null);
    const [deleteCustomerConfirm, setDeleteCustomerConfirm] = useState(null);

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

    const filteredCustomers = customers.filter(c => {
        if (filterName.trim() && !(c.customerName || '').toLowerCase().includes(filterName.trim().toLowerCase())) {
            return false;
        }
        if (filterEmail.trim() && !(c.emailId || '').toLowerCase().includes(filterEmail.trim().toLowerCase())) {
            return false;
        }
        if (filterMobile.trim() && !(c.mobile || '').toLowerCase().includes(filterMobile.trim().toLowerCase())) {
            return false;
        }
        return true;
    });

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
        setFilterName('');
        setFilterEmail('');
        setFilterMobile('');
        setStatusFilter('All');
        setWalletFilter('All');
        setMinBalance('');
        setMaxBalance('');
        setFilterOpen(false);
    };

    const toggleMenu = (id, type) => {
        setOpenMenu(prev =>
            prev.id === id && prev.type === type ? { id: null, type: null } : { id, type }
        );
    };

    const closeMenu = () => setOpenMenu({ id: null, type: null });

    const handleToggleStatus = async (id) => {
        closeMenu();
        setCustomers(prev =>
            prev.map(c => c.id === id ? { ...c, status: c.status === 'Active' ? 'Inactive' : 'Active' } : c)
        );
        try {
            await toggleCustomerStatus(id);
        } catch (error) {
            console.error("Error toggling customer status:", error);
        }
    };

    const handleToggleWalletStatus = async (id) => {
        closeMenu();
        setCustomers(prev =>
            prev.map(c => c.id === id ? { ...c, walletStatus: c.walletStatus === 'Active' ? 'Inactive' : 'Active' } : c)
        );
        try {
            await toggleWalletStatus(id);
        } catch (error) {
            console.error("Error toggling wallet status:", error);
        }
    };

    const handleOpenAddBalanceModal = (customer) => {
        setAddBalanceCustomer(customer);
        setBalanceInput('');
        closeMenu();
    };

    const handleConfirmAddBalance = async () => {
        if (!addBalanceCustomer) return;
        const amount = Number(balanceInput);
        if (Number.isNaN(amount) || amount <= 0) {
            showToast('Please enter a valid positive amount.', 'error');
            return;
        }
        
        const targetId = addBalanceCustomer.id;
        setCustomers(prev =>
            prev.map(c => c.id === targetId ? {
                ...c,
                walletBalance: (Number(c.walletBalance) || 0) + amount,
                walletStatus: 'Active'
            } : c)
        );

        setAddBalanceCustomer(null);
        setBalanceInput('');
        showToast('Wallet balance updated & activated successfully.', 'success');

        try {
            await addWalletBalance(targetId, amount);
        } catch (error) {
            console.error("Error adding balance:", error);
        }
    };

    const handleOpenResetBalanceModal = (customer) => {
        setResetBalanceCustomer(customer);
        closeMenu();
    };

    const handleConfirmResetBalance = async () => {
        if (!resetBalanceCustomer) return;
        try {
            await resetWalletBalance(resetBalanceCustomer.id);
            showToast('Wallet balance reset successfully.', 'info');
            fetchCustomers();
            setResetBalanceCustomer(null);
        } catch (error) {
            console.error("Error resetting balance:", error);
            showToast("Failed to reset balance.", "error");
        }
    };

    const handleOpenDeleteCustomerModal = (customer) => {
        setDeleteCustomerConfirm(customer);
        closeMenu();
    };

    const handleConfirmDeleteCustomer = async () => {
        if (!deleteCustomerConfirm) return;
        try {
            await deleteCustomer(deleteCustomerConfirm.id);
            showToast('Customer deleted successfully.', 'info');
            fetchCustomers();
            setDeleteCustomerConfirm(null);
        } catch (error) {
            console.error("Error deleting customer:", error);
            showToast("Failed to delete customer.", "error");
        }
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
            overflow: 'visible',
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.85rem',
        },
        thead: {
            background: '#A51C49',
            color: '#ffffff',
            fontWeight: 700,
            position: 'sticky',
            top: 0,
            zIndex: 100,
        },
        th: {
            padding: '12px 14px',
            textAlign: 'center',
            verticalAlign: 'middle',
            borderRight: '1px solid rgba(255, 255, 255, 0.2)',
            whiteSpace: 'nowrap',
            background: '#A51C49',
            position: 'sticky',
            top: 0,
            zIndex: 100,
        },
        td: {
            padding: '12px 14px',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text-primary)',
            textAlign: 'center',
            verticalAlign: 'middle',
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
            cursor: 'pointer',
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
            minWidth: '190px',
            width: 'max-content',
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
            whiteSpace: 'nowrap',
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
                                style={{ ...styles.button, ...styles.filterBtn, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
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
                                <Filter size={16} /> Filter
                            </button>
                            <button
                                style={{ ...styles.button, ...styles.exportBtn, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
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
                                <Download size={16} /> Export
                            </button>
                        </div>
                    </div>
                </div>

                {filterOpen && (
                    <div style={{
                        background: '#ffffff',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                        marginBottom: '16px',
                        marginTop: '10px',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            gap: '8px',
                            flexWrap: 'wrap',
                            width: '100%',
                        }}>
                            <div style={{ flex: 1, minWidth: '90px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Name</label>
                                <input
                                    type="text"
                                    placeholder="Name..."
                                    value={filterName}
                                    onChange={(e) => setFilterName(e.target.value)}
                                    style={{
                                        width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border)',
                                        background: 'var(--surface-soft)', color: 'var(--text-primary)', fontSize: '0.78rem', outline: 'none', height: '34px'
                                    }}
                                />
                            </div>

                            <div style={{ flex: 1, minWidth: '100px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Email</label>
                                <input
                                    type="text"
                                    placeholder="Email..."
                                    value={filterEmail}
                                    onChange={(e) => setFilterEmail(e.target.value)}
                                    style={{
                                        width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border)',
                                        background: 'var(--surface-soft)', color: 'var(--text-primary)', fontSize: '0.78rem', outline: 'none', height: '34px'
                                    }}
                                />
                            </div>

                            <div style={{ flex: 1, minWidth: '90px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Mobile</label>
                                <input
                                    type="text"
                                    placeholder="Mobile..."
                                    value={filterMobile}
                                    onChange={(e) => setFilterMobile(e.target.value)}
                                    style={{
                                        width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border)',
                                        background: 'var(--surface-soft)', color: 'var(--text-primary)', fontSize: '0.78rem', outline: 'none', height: '34px'
                                    }}
                                />
                            </div>

                            <div style={{ flex: 1, minWidth: '85px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    style={{
                                        width: '100%', padding: '5px 6px', borderRadius: '6px', border: '1px solid var(--border)',
                                        background: 'var(--surface-soft)', color: 'var(--text-primary)', fontSize: '0.78rem', outline: 'none', height: '34px'
                                    }}
                                >
                                    <option value="All">All</option>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>

                            <div style={{ flex: 1, minWidth: '90px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Wallet Status</label>
                                <select
                                    value={walletFilter}
                                    onChange={(e) => setWalletFilter(e.target.value)}
                                    style={{
                                        width: '100%', padding: '5px 6px', borderRadius: '6px', border: '1px solid var(--border)',
                                        background: 'var(--surface-soft)', color: 'var(--text-primary)', fontSize: '0.78rem', outline: 'none', height: '34px'
                                    }}
                                >
                                    <option value="All">All</option>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>

                            <div style={{ flex: 1, minWidth: '80px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Min Wallet</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={minBalance}
                                    onChange={(e) => setMinBalance(e.target.value)}
                                    style={{
                                        width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border)',
                                        background: 'var(--surface-soft)', color: 'var(--text-primary)', fontSize: '0.78rem', outline: 'none', height: '34px'
                                    }}
                                />
                            </div>

                            <div style={{ flex: 1, minWidth: '80px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Max Wallet</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="5000"
                                    value={maxBalance}
                                    onChange={(e) => setMaxBalance(e.target.value)}
                                    style={{
                                        width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border)',
                                        background: 'var(--surface-soft)', color: 'var(--text-primary)', fontSize: '0.78rem', outline: 'none', height: '34px'
                                    }}
                                />
                            </div>

                            {/* Action Buttons in single line: Apply Filter (Blue) and Reset (Gray) */}
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '34px' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCurrentPage(1);
                                        setFilterOpen(false);
                                    }}
                                    style={{
                                        height: '34px',
                                        padding: '0 14px',
                                        borderRadius: '6px',
                                        border: '1px solid #2563eb',
                                        background: '#2563eb',
                                        color: '#ffffff',
                                        fontSize: '0.78rem',
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
                                        height: '34px',
                                        padding: '0 14px',
                                        borderRadius: '6px',
                                        border: '1px solid #64748b',
                                        background: '#64748b',
                                        color: '#ffffff',
                                        fontSize: '0.78rem',
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
                                </tr>
                            </thead>
                            <tbody>
                                {currentItems.map((customer, index) => {
                                    const isLowerRow = index >= currentItems.length - 3 && currentItems.length > 3;
                                    const dropdownStyle = {
                                        ...styles.menu,
                                        right: 0,
                                        left: 'auto',
                                        ...(isLowerRow ? { bottom: '100%', top: 'auto', marginBottom: '6px' } : { top: 'calc(100% + 6px)' }),
                                        zIndex: 99999,
                                    };

                                    return (
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
                                                <div style={{ ...styles.menuWrapper, verticalAlign: 'middle' }}>
                                                    <button
                                                        type="button"
                                                        className={`actions-trigger-btn ${openMenu.id === customer.id && openMenu.type === 'action' ? 'active' : ''}`}
                                                        onClick={() => toggleMenu(customer.id, 'action')}
                                                    >
                                                        <span>Actions</span> <ChevronDown size={14} />
                                                    </button>
                                                    {openMenu.id === customer.id && openMenu.type === 'action' && (
                                                        <div style={dropdownStyle}>
                                                            <button
                                                                type="button"
                                                                style={{ ...styles.menuItem, display: 'flex', alignItems: 'center', gap: '8px' }}
                                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                                                onClick={() => { closeMenu(); handleViewDetails(customer); }}
                                                            >
                                                                <Eye size={14} /> View Details
                                                            </button>
                                                            <button
                                                                type="button"
                                                                style={{ ...styles.menuItem, display: 'flex', alignItems: 'center', gap: '8px' }}
                                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                                                onClick={() => { closeMenu(); handleEditCustomer(customer.id); }}
                                                            >
                                                                <Edit2 size={14} /> Edit Customer
                                                            </button>
                                                            <button
                                                                type="button"
                                                                style={{ ...styles.menuItem, ...styles.menuItemDanger, display: 'flex', alignItems: 'center', gap: '8px' }}
                                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                                                onClick={() => handleOpenDeleteCustomerModal(customer)}
                                                            >
                                                                <Trash2 size={14} /> Delete Customer
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={styles.td}>
                                                <div style={styles.menuWrapper}>
                                                    <button
                                                        type="button"
                                                        className={`actions-trigger-btn ${openMenu.id === customer.id && openMenu.type === 'finance' ? 'active' : ''}`}
                                                        onClick={() => toggleMenu(customer.id, 'finance')}
                                                    >
                                                        <span>Finance</span> <ChevronDown size={14} />
                                                    </button>
                                                    {openMenu.id === customer.id && openMenu.type === 'finance' && (
                                                        <div style={dropdownStyle}>
                                                            <button
                                                                type="button"
                                                                style={{ ...styles.menuItem, display: 'flex', alignItems: 'center', gap: '8px' }}
                                                                onMouseEnter={(e) => { e.target.style.background = 'rgba(74, 15, 26, 0.08)'; }}
                                                                onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
                                                                onClick={() => handleOpenAddBalanceModal(customer)}
                                                            >
                                                                <PlusCircle size={14} /> Add Balance
                                                            </button>
                                                            <button
                                                                type="button"
                                                                style={{ ...styles.menuItem, display: 'flex', alignItems: 'center', gap: '8px' }}
                                                                onMouseEnter={(e) => { e.target.style.background = 'rgba(74, 15, 26, 0.08)'; }}
                                                                onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
                                                                onClick={() => handleOpenResetBalanceModal(customer)}
                                                            >
                                                                <RotateCcw size={14} /> Reset Balance
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
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

            {/* FULL SCREEN PORTALED POPUPS */}

            {/* View Details Portal Modal */}
            {selectedCustomer && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 999999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                    }}
                    onClick={() => setSelectedCustomer(null)}
                >
                    <div
                        style={{
                            background: '#ffffff',
                            borderRadius: '16px',
                            width: '100%',
                            maxWidth: '560px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            overflow: 'hidden',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ padding: '20px 24px', background: '#A51C49', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <User size={22} />
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Customer Details</h3>
                            </div>
                            <button
                                type="button"
                                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
                                onClick={() => setSelectedCustomer(null)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Customer Name</div>
                                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>{selectedCustomer.customerName}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Email ID</div>
                                <div style={{ fontSize: '0.95rem', color: '#0f172a' }}>{selectedCustomer.emailId}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Mobile Number</div>
                                <div style={{ fontSize: '0.95rem', color: '#0f172a' }}>{selectedCustomer.mobile}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Account Status</div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: selectedCustomer.status === 'Active' ? '#16a34a' : '#dc2626' }}>{selectedCustomer.status}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Wallet Status</div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: selectedCustomer.walletStatus === 'Active' ? '#16a34a' : '#dc2626' }}>{selectedCustomer.walletStatus}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Wallet Balance</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#A51C49' }}>Rs. {selectedCustomer.walletBalance}</div>
                            </div>
                        </div>
                        <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                type="button"
                                style={{ padding: '8px 16px', background: '#A51C49', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                onClick={() => { setSelectedCustomer(null); handleEditCustomer(selectedCustomer.id); }}
                            >
                                Edit Customer
                            </button>
                            <button
                                type="button"
                                style={{ padding: '8px 16px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                onClick={() => setSelectedCustomer(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Add Balance Portal Modal */}
            {addBalanceCustomer && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 999999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                    }}
                    onClick={() => setAddBalanceCustomer(null)}
                >
                    <div
                        style={{
                            background: '#ffffff',
                            borderRadius: '16px',
                            width: '100%',
                            maxWidth: '440px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            overflow: 'hidden',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ padding: '18px 24px', background: '#A51C49', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <PlusCircle size={20} />
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Add Wallet Balance</h3>
                            </div>
                            <button
                                type="button"
                                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
                                onClick={() => setAddBalanceCustomer(null)}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#475569' }}>
                                Enter balance amount to credit to <strong>{addBalanceCustomer.customerName}</strong>'s wallet:
                            </p>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Amount (Rs.)</label>
                            <input
                                type="number"
                                min="1"
                                placeholder="Enter amount (e.g. 500)"
                                value={balanceInput}
                                onChange={(e) => setBalanceInput(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                                autoFocus
                            />
                        </div>
                        <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                type="button"
                                style={{ padding: '8px 16px', background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                onClick={handleConfirmAddBalance}
                            >
                                Credit Balance
                            </button>
                            <button
                                type="button"
                                style={{ padding: '8px 16px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                onClick={() => setAddBalanceCustomer(null)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Reset Balance Portal Modal */}
            {resetBalanceCustomer && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 999999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                    }}
                    onClick={() => setResetBalanceCustomer(null)}
                >
                    <div
                        style={{
                            background: '#ffffff',
                            borderRadius: '16px',
                            width: '100%',
                            maxWidth: '440px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            overflow: 'hidden',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ padding: '18px 24px', background: '#d97706', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <RotateCcw size={20} />
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Reset Wallet Balance</h3>
                            </div>
                            <button
                                type="button"
                                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
                                onClick={() => setResetBalanceCustomer(null)}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <p style={{ margin: 0, fontSize: '0.95rem', color: '#334155', lineHeight: 1.5 }}>
                                Are you sure you want to reset wallet balance to <strong>Rs. 0</strong> for customer <strong>{resetBalanceCustomer.customerName}</strong>?
                            </p>
                        </div>
                        <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                type="button"
                                style={{ padding: '8px 16px', background: '#d97706', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                onClick={handleConfirmResetBalance}
                            >
                                Confirm Reset
                            </button>
                            <button
                                type="button"
                                style={{ padding: '8px 16px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                onClick={() => setResetBalanceCustomer(null)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Customer Portal Modal */}
            {deleteCustomerConfirm && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 999999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                    }}
                    onClick={() => setDeleteCustomerConfirm(null)}
                >
                    <div
                        style={{
                            background: '#ffffff',
                            borderRadius: '16px',
                            width: '100%',
                            maxWidth: '440px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            overflow: 'hidden',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ padding: '18px 24px', background: '#dc2626', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <ShieldAlert size={20} />
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Delete Customer Account</h3>
                            </div>
                            <button
                                type="button"
                                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
                                onClick={() => setDeleteCustomerConfirm(null)}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <p style={{ margin: 0, fontSize: '0.95rem', color: '#334155', lineHeight: 1.5 }}>
                                Are you sure you want to delete customer <strong>{deleteCustomerConfirm.customerName}</strong> ({deleteCustomerConfirm.emailId})? This action cannot be undone.
                            </p>
                        </div>
                        <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                type="button"
                                style={{ padding: '8px 16px', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                onClick={handleConfirmDeleteCustomer}
                            >
                                Delete Account
                            </button>
                            <button
                                type="button"
                                style={{ padding: '8px 16px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                onClick={() => setDeleteCustomerConfirm(null)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

export default CustomerList;
