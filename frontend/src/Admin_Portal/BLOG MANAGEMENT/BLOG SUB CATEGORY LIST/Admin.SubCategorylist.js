/* eslint-disable */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit2, Trash2, ChevronDown, FileText, Plus, Download } from 'lucide-react';
import AdminPagination from '../../../components/AdminPagination';
import { deleteBlogSubCategory, getBlogSubCategories, toggleBlogSubCategoryStatus, updateBlogSubCategory, getBlogCategories } from '../../../services/blogService';
import { toApiAssetUrl, NgrokSafeImage } from '../../../services/apiClient';

const formatDate = (dateString) => {
    if (!dateString || dateString === '-') return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return dateString;
    }
};

function BlogSubCategoryList() {
    const navigate = useNavigate();
    const toastTimerRef = useRef(null);
    const [subCategories, setSubCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadSubCategories = async () => {
        try {
            setLoading(true);
            const data = await getBlogSubCategories();
            setSubCategories(data);
        } catch (error) {
            console.error("Failed to load subcategories", error);
        } finally {
            setLoading(false);
        }
    };

    const [selectedSubCategory, setSelectedSubCategory] = useState(null);
    const [toast, setToast] = useState(null);
    const [categories, setCategories] = useState([]);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingSubCategory, setEditingSubCategory] = useState(null);
    const [editFormData, setEditFormData] = useState({
        name: '',
        category: '',
        slug: '',
        status: 'Active',
        metaTitle: '',
        metaKeyword: '',
        metaDescription: '',
        image: null,
    });
    const [activePopupImage, setActivePopupImage] = useState(null);
    const [activeDropdownId, setActiveDropdownId] = useState(null);
    const [deleteSubCat, setDeleteSubCat] = useState(null);

    const loadCategories = async () => {
        try {
            const data = await getBlogCategories();
            setCategories(data.filter(cat => cat.status === 'Active'));
        } catch (error) {
            console.error("Failed to load categories", error);
        }
    };

    useEffect(() => {
        loadSubCategories();
        loadCategories();
    }, []);

    // Close actions dropdown on clicking outside
    useEffect(() => {
        const handleGlobalClick = () => setActiveDropdownId(null);
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [filterOpen, setFilterOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');

    useEffect(() => {
        setPage(1);
    }, [searchQuery, statusFilter, categoryFilter]);

    const showToast = (message, tone = 'info') => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        setToast({ message, tone });
        toastTimerRef.current = setTimeout(() => setToast(null), 2400);
    };

    const categoryOptions = ['All', ...new Set(subCategories.map(item => item.category))];

    const filteredSubCategories = subCategories
        .filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .filter(item => (statusFilter === 'All' ? true : item.status === statusFilter))
        .filter(item => (categoryFilter === 'All' ? true : item.category === categoryFilter));

    const handleClearFilters = () => {
        setSearchQuery('');
        setStatusFilter('All');
        setCategoryFilter('All');
        setFilterOpen(false);
        showToast('Filters cleared.', 'info');
    };

    const handleExport = () => {
        const header = ['ID', 'Name', 'Entry Date', 'Category', 'Status'];
        const rows = filteredSubCategories.map(item => [
            item.id,
            item.name,
            formatDate(item.createdAtUtc || item.createdAt || item.entryDate),
            item.category,
            item.status
        ]);
        const csv = [header, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'blog-sub-category-list.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('Export completed.', 'success');
    };

    const handleToggleStatus = async (id) => {
        try {
            await toggleBlogSubCategoryStatus(id);
            setSubCategories(prev =>
                prev.map(item =>
                    item.id === id
                        ? { ...item, status: item.status === 'Active' ? 'Inactive' : 'Active' }
                        : item
                )
            );
        } catch (error) {
            console.error("Failed to toggle subcategory status", error);
            const serverMsg = error.response?.data?.message || error.response?.data?.title || (typeof error.response?.data === 'string' ? error.response.data : '') || error.message || "";
            showToast(`Failed to update status. ${serverMsg}`.trim(), "error");
        }
    };

    const handleEditSubCategory = (item) => {
        setEditingSubCategory(item);
        setEditFormData({
            name: item.name || '',
            category: item.category || '',
            slug: item.slug || '',
            status: item.status || 'Active',
            metaTitle: item.metaTitle || '',
            metaKeyword: item.metaKeyword || '',
            metaDescription: item.metaDescription || '',
            image: null,
        });
        setEditModalOpen(true);
    };

    const buildSlug = (name) =>
        name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

    const handleGenerateSlug = () => {
        const slug = buildSlug(editFormData.name);
        setEditFormData(prev => ({ ...prev, slug }));
        showToast('Slug generated.', 'info');
    };

    const handleSaveEditSubCategory = async (e) => {
        e.preventDefault();
        if (!editFormData.name.trim()) {
            showToast('Sub category name cannot be empty.', 'error');
            return;
        }
        if (!editFormData.category) {
            showToast('Category is required.', 'error');
            return;
        }
        try {
            const formData = new FormData();
            formData.append("Id", editingSubCategory.id);
            formData.append("Name", editFormData.name.trim());
            formData.append("Category", editFormData.category);
            formData.append("Slug", editFormData.slug || '');
            formData.append("Status", editFormData.status);
            formData.append("MetaTitle", editFormData.metaTitle || '');
            formData.append("MetaKeyword", editFormData.metaKeyword || '');
            formData.append("MetaDescription", editFormData.metaDescription || '');
            if (editFormData.image) {
                formData.append("Image", editFormData.image);
            }

            // Debug: log what we're sending
            console.log('[SubCategory Update] Sending FormData entries:');
            for (const [key, value] of formData.entries()) {
                console.log(`  ${key}:`, value instanceof File ? `File(${value.name})` : value);
            }

            const result = await updateBlogSubCategory(editingSubCategory.id, formData);
            console.log('[SubCategory Update] Response:', result);
            await loadSubCategories();
            setEditModalOpen(false);
            setEditingSubCategory(null);
        } catch (error) {
            console.error("Failed to update subcategory", error);
            const serverMsg = error.response?.data?.message || error.response?.data?.title || (typeof error.response?.data === 'string' ? error.response.data : '') || error.message || "";
            showToast(`Failed to update subcategory. ${serverMsg}`.trim(), "error");
        }
    };

    const handleDeleteSubCategory = async () => {
        if (!deleteSubCat) return;
        try {
            await deleteBlogSubCategory(deleteSubCat.id);
            setSubCategories(prev => prev.filter(row => row.id !== deleteSubCat.id));
            setDeleteSubCat(null);
            showToast('Sub category deleted.', 'info');
        } catch (error) {
            console.error("Failed to delete subcategory", error);
            showToast("Failed to delete subcategory.", "error");
        }
    };

    const handleViewDetails = (item) => {
        setSelectedSubCategory(item);
    };

    const handleAddSubCategory = () => {
        navigate('/admin/blog-management/add-blog-sub-category');
    };

    const styles = {
        container: {
            padding: '12px 24px',
            background: 'var(--page-bg)',
            minHeight: '100vh',
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            gap: '16px',
            flexWrap: 'nowrap',
        },
        titleWrapper: {
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px',
            borderBottom: 'none',
            paddingTop: '16px',
            paddingBottom: '16px',
        },
        titleMain: {
            fontSize: '1.8rem',
            fontWeight: 500,
            color: '#be185d',
            margin: 0,
        },
        titleSub: {
            fontSize: '1.8rem',
            fontWeight: 500,
            color: 'black',
            margin: 0,
        },
        actions: {
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            flexWrap: 'nowrap',
        },
        button: {
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1px solid transparent',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
            height: '38px',
            boxSizing: 'border-box',
            whiteSpace: 'nowrap',
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
        addBtn: {
            background: '#A51C49',
            color: '#ffffff',
        },
        exportBtn: {
            background: '#16a34a',
            color: '#ffffff',
            borderColor: '#16a34a',
        },
        searchBox: {
            padding: '8px 12px',
            border: '1.5px solid var(--border)',
            borderRadius: '10px',
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
        tableWrapper: {
            background: 'var(--panel)',
            borderRadius: '14px',
            border: '1.5px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'visible',
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '12px',
        },
        thead: {
            background: '#A51C49',
            color: '#ffffff',
            fontWeight: 500,
        },
        th: {
            padding: '12px 10px',
            textAlign: 'center',
            borderRight: '1px solid rgba(255, 255, 255, 0.2)',
            whiteSpace: 'nowrap',
            fontSize: '11px',
            fontWeight: 500,
            height: '42px',
            verticalAlign: 'middle',
            textTransform: 'none',
        },
        td: {
            padding: '6px 8px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            color: 'var(--text-primary)',
            textAlign: 'center',
            height: '36px',
            verticalAlign: 'middle',
            whiteSpace: 'nowrap',
        },
        tr: {
            transition: 'background-color 0.2s ease',
            height: '36px',
        },
        sn: {
            fontWeight: 500,
            color: '#000000',
            minWidth: '22px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '22px',
            height: '22px',
            background: 'none',
            borderRadius: '6px',
            fontSize: '11px',
        },
        badge: {
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 8px',
            borderRadius: '6px',
            fontWeight: 500,
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: '1px solid var(--border)',
            background: 'var(--surface-soft)',
            color: 'var(--text-primary)',
        },
        statusBadge: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px 10px',
            borderRadius: '6px',
            fontWeight: 500,
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: '1px solid',
            outline: 'none',
        },
        statusActive: {
            background: '#ecfdf5',
            color: '#047857',
            borderColor: '#10b981',
        },
        statusInactive: {
            background: '#fef2f2',
            color: '#b91c1c',
            borderColor: '#ef4444',
        },
        actionButtons: {
            display: 'flex',
            gap: '8px',
            flexWrap: 'nowrap',
            justifyContent: 'center',
            alignItems: 'center',
        },
        actionBtn: {
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: '1.5px solid var(--border)',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            background: 'var(--surface-soft)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            padding: '0',
        },
        deleteBtn: {
            background: 'rgba(217, 48, 37, 0.15)',
            color: 'var(--danger)',
            borderColor: 'rgba(217, 48, 37, 0.35)',
        },
        emptyState: {
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-secondary)',
        },
        toast: {
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 999999,
            padding: '12px 20px',
            borderRadius: '12px',
            border: '1.5px solid var(--border)',
            background: '#ffffff',
            color: 'var(--text-primary)',
            fontWeight: 700,
            fontSize: '0.9rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'slideDown 0.3s ease',
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
        paginationContainer: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '20px',
            padding: '12px 18px',
            background: 'var(--panel)',
            borderRadius: '12px',
            border: '1.5px solid var(--border)',
            gap: '16px',
            flexWrap: 'wrap',
        },
        paginationInfo: {
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            fontWeight: 600,
        },
        paginationButtons: {
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
        },
        pageBtn: {
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: 'var(--panel)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
        },
    };

    const getStatusStyle = (status) => ({
        ...styles.statusBadge,
        ...(status === 'Active' ? styles.statusActive : styles.statusInactive),
    });

    return (
        <>
            <style>{`
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                select:hover {
                    background-color: rgba(74, 15, 26, 0.05) !important;
                    border-color: var(--primary) !important;
                }
                select:focus {
                    border-color: var(--primary) !important;
                    box-shadow: 0 0 0 2px rgba(74, 15, 26, 0.15) !important;
                }
            `}</style>
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
                <div style={styles.header}>
                    <div style={styles.titleWrapper}>
                        <h1 style={styles.titleMain}>Blog Sub Category</h1>
                        <h2 style={styles.titleSub}>List</h2>
                    </div>
                    <div style={styles.actions}>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{
                                ...styles.button,
                                background: 'var(--panel)',
                                color: 'var(--text-primary)',
                                border: '1.5px solid var(--border)',
                                cursor: 'pointer',
                                outline: 'none',
                                margin: 0,
                            }}
                        >
                            <option value="All">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                        <button
                            type="button"
                            style={{
                                ...styles.button,
                                background: 'var(--panel)',
                                color: '#A51C49',
                                border: '1.5px solid #A51C49',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(165, 28, 73, 0.1)',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#fff0f3';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'var(--panel)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                            onClick={() => navigate('/admin/blog-management/blog-list')}
                        >
                            <FileText size={14} /> <span>Blog List</span>
                        </button>
                        <button
                            type="button"
                            style={{ ...styles.button, ...styles.addBtn, display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                            onMouseEnter={(e) => {
                                e.target.style.background = '#851237';
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 4px 12px rgba(165, 28, 73, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = '#A51C49';
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                            }}
                            onClick={handleAddSubCategory}
                        >
                            <Plus size={14} /> <span>Add Sub Category</span>
                        </button>
                        <button
                            type="button"
                            style={{ ...styles.button, ...styles.exportBtn, display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                            onMouseEnter={(e) => {
                                e.target.style.background = '#15803d';
                                e.target.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = '#16a34a';
                                e.target.style.transform = 'translateY(0)';
                            }}
                            onClick={handleExport}
                        >
                            <Download size={14} /> <span>Export</span>
                        </button>
                    </div>
                </div>

                {selectedSubCategory && createPortal(
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 100000,
                        padding: '20px'
                    }} onClick={() => setSelectedSubCategory(null)}>
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '12px',
                            padding: '24px',
                            width: '100%',
                            maxWidth: '560px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                            margin: 0
                        }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid #e2e8f0" }}>
                                <h2 style={{ color: "#000000", fontSize: "1.3rem", margin: 0, fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <FileText size={20} style={{ color: "#A51C49" }} />
                                    <span style={{ color: "#A51C49" }}>Sub Category</span> Details
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => setSelectedSubCategory(null)}
                                    style={{
                                        border: 'none',
                                        background: '#A51C49',
                                        color: '#ffffff',
                                        borderRadius: '20px',
                                        padding: '6px 16px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}
                                >
                                    Close
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                <div>
                                    <strong style={{ color: 'var(--text-secondary)' }}>Name:</strong>
                                    <div style={{ fontWeight: 600 }}>{selectedSubCategory.name}</div>
                                </div>
                                <div>
                                    <strong style={{ color: 'var(--text-secondary)' }}>Category:</strong>
                                    <div style={{ fontWeight: 600 }}>{selectedSubCategory.category}</div>
                                </div>
                                <div>
                                    <strong style={{ color: 'var(--text-secondary)' }}>Entry Date:</strong>
                                    <div style={{ fontWeight: 600 }}>{formatDate(selectedSubCategory.createdAtUtc || selectedSubCategory.createdAt || selectedSubCategory.entryDate)}</div>
                                </div>
                                <div>
                                    <strong style={{ color: 'var(--text-secondary)' }}>Status:</strong>
                                    <div>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: selectedSubCategory.status === 'Active' ? '#ecfdf5' : '#fef2f2', color: selectedSubCategory.status === 'Active' ? '#047857' : '#b91c1c', border: selectedSubCategory.status === 'Active' ? '1px solid #10b981' : '1px solid #ef4444', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 500 }}>
                                            {selectedSubCategory.status}
                                        </div>
                                    </div>
                                </div>
                                {(selectedSubCategory.imageUrl || selectedSubCategory.image) && (selectedSubCategory.imageUrl || selectedSubCategory.image) !== '-' && (
                                    <div style={{ gridColumn: 'span 2', marginTop: '8px' }}>
                                        <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Image Preview:</strong>
                                        <NgrokSafeImage
                                            src={`${toApiAssetUrl(selectedSubCategory.imageUrl || selectedSubCategory.image)}?t=${selectedSubCategory.updatedAtUtc || selectedSubCategory.updatedAt || ''}`}
                                            alt={selectedSubCategory.name}
                                            style={{ maxWidth: '120px', maxHeight: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {activePopupImage && createPortal(
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 100000,
                        padding: '20px'
                    }} onClick={() => setActivePopupImage(null)}>
                        <div style={{
                            position: 'relative',
                            maxWidth: '90vw',
                            maxHeight: '90vh',
                            background: '#ffffff',
                            borderRadius: '12px',
                            padding: '12px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                            overflow: 'hidden'
                        }} onClick={(e) => e.stopPropagation()}>
                            <img
                                src={activePopupImage}
                                alt="Subcategory Preview"
                                style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '8px', objectFit: 'contain', display: 'block' }}
                                onError={() => {
                                    showToast('Failed to load full image preview.', 'error');
                                    setActivePopupImage(null);
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setActivePopupImage(null)}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    border: 'none',
                                    background: '#A51C49',
                                    color: '#ffffff',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    </div>,
                    document.body
                )}

                <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                        <thead style={styles.thead}>
                            <tr>
                                <th style={styles.th}>S.No</th>
                                <th style={styles.th}>Entry Date</th>
                                <th style={styles.th}>Image</th>
                                <th style={styles.th}>Name</th>
                                <th style={styles.th}>Category</th>
                                <th style={{ ...styles.th, width: '100px' }}>Status</th>
                                <th style={{ ...styles.th, width: '140px' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" style={{ ...styles.td, textAlign: 'center', padding: '40px' }}>
                                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-secondary)' }}>Loading subcategories...</p>
                                    </td>
                                </tr>
                            ) : filteredSubCategories.length > 0 ? (
                                filteredSubCategories.slice((page - 1) * pageSize, page * pageSize).map((item, index) => (
                                    <tr
                                        key={item.id}
                                        style={styles.tr}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(74, 15, 26, 0.06)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <td style={styles.td}><span style={styles.sn}>{((page - 1) * pageSize) + index + 1}</span></td>
                                        <td style={styles.td}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', fontWeight: 500, color: '#334155' }}>
                                                <span style={{ fontSize: '15px', lineHeight: 1 }}>🗓️</span>
                                                <span>{formatDate(item.createdAtUtc || item.createdAt || item.entryDate)}</span>
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            {(item.imageUrl || item.image) && (item.imageUrl || item.image) !== '-' ? (
                                                <NgrokSafeImage 
                                                    src={`${toApiAssetUrl(item.imageUrl || item.image)}?t=${item.updatedAtUtc || item.updatedAt || ''}`} 
                                                    alt={item.name} 
                                                    style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', display: 'block', margin: '0 auto', cursor: 'pointer' }}
                                                    onClick={() => setActivePopupImage(`${toApiAssetUrl(item.imageUrl || item.image)}?t=${item.updatedAtUtc || item.updatedAt || ''}`)}
                                                />
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td style={styles.td}>{item.name}</td>
                                        <td style={styles.td}>
                                            <button
                                                type="button"
                                                style={styles.badge}
                                                onClick={() => handleViewDetails(item)}
                                            >
                                                {item.category}
                                            </button>
                                        </td>
                                        <td style={styles.td}>
                                            <button
                                                type="button"
                                                style={getStatusStyle(item.status)}
                                                onClick={() => handleToggleStatus(item.id)}
                                            >
                                                {item.status}
                                            </button>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                                <button type="button" onClick={(e) => { e.stopPropagation(); setActiveDropdownId(activeDropdownId === item.id ? null : item.id); }}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#334155', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }}>
                                                    <span>Actions</span><ChevronDown size={12} />
                                                </button>
                                                {activeDropdownId === item.id && (
                                                    <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.12)', zIndex: 1000, minWidth: '170px', overflow: 'hidden' }}>
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleViewDetails(item); setActiveDropdownId(null); }}
                                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#334155' }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background='#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.background='none'}>
                                                            <Eye size={14} /> <span>View Details</span>
                                                        </button>
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleEditSubCategory(item); setActiveDropdownId(null); }}
                                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#334155' }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background='#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.background='none'}>
                                                            <Edit2 size={14} /> <span>Edit Sub Category</span>
                                                        </button>
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteSubCat(item); setActiveDropdownId(null); }}
                                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#ef4444' }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background='#fef2f2'} onMouseLeave={(e) => e.currentTarget.style.background='none'}>
                                                            <Trash2 size={14} /> <span>Delete Sub Category</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ ...styles.td, textAlign: 'center', padding: '20px' }}>
                                        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                            No sub categories found
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    <AdminPagination
                        currentPage={page}
                        totalItems={filteredSubCategories.length}
                        itemsPerPage={pageSize}
                        onPageChange={setPage}
                        onItemsPerPageChange={setPageSize}
                        itemName="subcategories"
                    />
                </div>
            </div>

            {editModalOpen && createPortal(
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000,
                    padding: '20px'
                }} onClick={() => setEditModalOpen(false)}>
                    <div style={{
                        background: '#ffffff', borderRadius: '12px', padding: '24px',
                        width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.15)', margin: 0, color: 'var(--text-primary)'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid #e2e8f0" }}>
                            <h2 style={{ color: "#000000", fontSize: "1.3rem", margin: 0, fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                                <Edit2 size={20} style={{ color: "#A51C49" }} />
                                <span style={{ color: "#A51C49" }}>Edit</span> Sub Category
                            </h2>
                        </div>
                        <form onSubmit={handleSaveEditSubCategory}>
                            <div style={{
                                background: '#A51C49', color: '#ffffff', padding: '8px 15px',
                                fontWeight: 700, borderRadius: '8px', marginTop: '16px',
                                marginBottom: '16px', display: 'block', width: '100%', boxSizing: 'border-box'
                            }}>
                                Sub Category Information
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Sub Category Name *</label>
                                    <input 
                                        type="text" 
                                        value={editFormData.name} 
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--panel)', color: 'var(--text-primary)' }}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Category *</label>
                                    <select 
                                        value={editFormData.category} 
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, category: e.target.value }))}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--panel)', color: 'var(--text-primary)', cursor: 'pointer' }}
                                        required
                                    >
                                        <option value="">Select a Category</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Slug</label>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input 
                                            type="text" 
                                            value={editFormData.slug} 
                                            onChange={(e) => setEditFormData(prev => ({ ...prev, slug: e.target.value }))}
                                            style={{ flex: 1, boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--panel)', color: 'var(--text-primary)' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleGenerateSlug}
                                            style={{ padding: '8px 14px', background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                        >
                                            Generate
                                        </button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Status</label>
                                    <select 
                                        value={editFormData.status} 
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--panel)', color: 'var(--text-primary)', cursor: 'pointer' }}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Sub Category Image</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                                        {editFormData.image ? (
                                            <img 
                                                src={URL.createObjectURL(editFormData.image)} 
                                                alt="New Preview" 
                                                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} 
                                            />
                                        ) : (editingSubCategory?.imageUrl || editingSubCategory?.image) ? (
                                            <NgrokSafeImage 
                                                src={`${toApiAssetUrl(editingSubCategory.imageUrl || editingSubCategory.image)}?t=${editingSubCategory.updatedAtUtc || editingSubCategory.updatedAt || ''}`} 
                                                alt="Current" 
                                                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} 
                                            />
                                        ) : null}
                                        <label 
                                            htmlFor="edit-subcategory-image"
                                            style={{ padding: '8px 14px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', display: 'inline-block', width: 'fit-content' }}
                                        >
                                            Choose File
                                        </label>
                                        <input 
                                            id="edit-subcategory-image"
                                            type="file" 
                                            accept="image/*"
                                            onChange={(e) => setEditFormData(prev => ({ ...prev, image: e.target.files[0] }))}
                                            style={{ display: 'none' }}
                                        />
                                        {editFormData.image?.name && (
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                {editFormData.image.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                background: '#A51C49', color: '#ffffff', padding: '8px 15px',
                                fontWeight: 700, borderRadius: '8px', marginTop: '24px',
                                marginBottom: '16px', display: 'block', width: '100%', boxSizing: 'border-box'
                            }}>
                                SEO Details
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Meta Title</label>
                                    <input 
                                        type="text" 
                                        value={editFormData.metaTitle} 
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, metaTitle: e.target.value }))}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--panel)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Meta Keyword</label>
                                    <input 
                                        type="text" 
                                        value={editFormData.metaKeyword} 
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, metaKeyword: e.target.value }))}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--panel)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Meta Description</label>
                                    <textarea 
                                        value={editFormData.metaDescription} 
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, metaDescription: e.target.value }))}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--panel)', color: 'var(--text-primary)', minHeight: '65px', resize: 'vertical' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setEditModalOpen(false)}
                                    style={{ padding: '8px 24px', background: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    style={{ padding: '8px 28px', background: '#A51C49', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirmation Modal */}
            {deleteSubCat && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000 }} onClick={() => setDeleteSubCat(null)}>
                    <div style={{ background: '#ffffff', borderRadius: '12px', padding: '0', width: '400px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#A51C49' }}>Confirm Delete</h3>
                        </div>
                        <div style={{ padding: '20px 24px', fontSize: '14px', color: '#334155' }}>
                            Are you sure you want to delete <strong>"{deleteSubCat.name}"</strong>? This action cannot be undone.
                        </div>
                        <div style={{ padding: '12px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button type="button" onClick={() => setDeleteSubCat(null)} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#f97316', color: '#ffffff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                            <button type="button" onClick={handleDeleteSubCategory} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#A51C49', color: '#ffffff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Delete</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

export default BlogSubCategoryList;
