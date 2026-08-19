/* eslint-disable */
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import AdminPagination from '../../../components/AdminPagination';
import { deleteBlogSubCategory, getBlogSubCategories, toggleBlogSubCategoryStatus, updateBlogSubCategory, getBlogCategories } from '../../../services/blogService';
import { toApiAssetUrl, NgrokSafeImage } from '../../../services/apiClient';
import AdminDynamicModal from '../../../components/AdminDynamicModal';

const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        }).replace(',', '');
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
            showToast("Failed to load subcategories.", "error");
        } finally {
            setLoading(false);
        }
    };

    const [selectedSubCategory, setSelectedSubCategory] = useState(null);
    const [toast, setToast] = useState(null);
    const [categories, setCategories] = useState([]);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingSubCategory, setEditingSubCategory] = useState(null);
    const [activePopupImage, setActivePopupImage] = useState(null);

    // Reusable popup modal state
    const [modalState, setModalState] = useState({ isOpen: false, mode: null, data: null });

    const categoriesOptions = useMemo(() => {
        return categories.map(cat => ({ value: cat.name, label: cat.name }));
    }, [categories]);

    const subCategorySchema = React.useMemo(() => [
        { name: 'name', label: 'Sub Category Name', type: 'text', required: true },
        { name: 'category', label: 'Category', type: 'select', options: categoriesOptions, required: true },
        { name: 'slug', label: 'Slug', type: 'text' },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
        { name: 'image', label: 'Image', type: 'image' },
        { name: 'metaTitle', label: 'Meta Title', type: 'text' },
        { name: 'metaKeyword', label: 'Meta Keyword', type: 'text' },
        { name: 'metaDescription', label: 'Meta Description', type: 'textarea' },
    ], [categoriesOptions]);

    const handleSaveSubCategory = async (updatedData) => {
        try {
            const formData = new FormData();
            formData.append("Name", updatedData.name.trim());
            formData.append("Category", updatedData.category);
            formData.append("Slug", updatedData.slug || '');
            formData.append("Status", updatedData.status || 'Active');
            formData.append("MetaTitle", updatedData.metaTitle || '');
            formData.append("MetaKeyword", updatedData.metaKeyword || '');
            formData.append("MetaDescription", updatedData.metaDescription || '');

            if (updatedData.image instanceof File) {
                formData.append("Image", updatedData.image);
            }

            const updated = await updateBlogSubCategory(modalState.data.id, formData);
            setSubCategories(prev => prev.map(row => (row.id === modalState.data.id ? updated : row)));
            showToast('Sub category updated successfully.', 'success');
            setModalState({ isOpen: false, mode: null, data: null });
        } catch (error) {
            console.error("Failed to update subcategory", error);
            showToast("Failed to update subcategory.", "error");
        }
    };

    const handleDeleteSubCategoryConfirm = async () => {
        try {
            await deleteBlogSubCategory(modalState.data.id);
            setSubCategories(prev => prev.filter(row => row.id !== modalState.data.id));
            showToast('Sub category deleted.', 'info');
            setModalState({ isOpen: false, mode: null, data: null });
        } catch (error) {
            console.error("Failed to delete subcategory", error);
            showToast("Failed to delete subcategory.", "error");
        }
    };

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
            showToast('Sub category status updated.', 'success');
        } catch (error) {
            console.error("Failed to toggle subcategory status", error);
            showToast("Failed to update status.", "error");
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

            const updated = await updateBlogSubCategory(editingSubCategory.id, formData);
            setSubCategories(prev => prev.map(row => (row.id === editingSubCategory.id ? updated : row)));
            showToast('Sub category updated.', 'success');
            setEditModalOpen(false);
            setEditingSubCategory(null);
        } catch (error) {
            console.error("Failed to update subcategory", error);
            showToast("Failed to update subcategory.", "error");
        }
    };

    const handleDeleteSubCategory = async (item) => {
        const confirmed = window.confirm(`Delete "${item.name}"?`);
        if (!confirmed) {
            return;
        }
        try {
            await deleteBlogSubCategory(item.id);
            setSubCategories(prev => prev.filter(row => row.id !== item.id));
            showToast('Sub category deleted.', 'info');
        } catch (error) {
            console.error("Failed to delete subcategory", error);
            showToast("Failed to delete subcategory.", "error");
        }
    };

    const handleViewDetails = (item) => {
        setSelectedSubCategory(item);
        showToast('Showing sub category details.', 'info');
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
            flexWrap: 'wrap',
        },
        titleWrapper: {
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px',
            borderBottom: 'none',
            paddingBottom: '0px',
        },
        titleMain: {
            fontSize: '1.8rem',
            fontWeight: 600,
            color: '#be185d',
            margin: 0,
        },
        titleSub: {
            fontSize: '1.8rem',
            fontWeight: 600,
            color: 'black',
            margin: 0,
        },
        actions: {
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            flexWrap: 'wrap',
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
            background: '#be185d',
            color: '#ffffff',
        },
        exportBtn: {
            background: '#2563eb',
            color: '#ffffff',
            borderColor: '#2563eb',
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
            overflow: 'hidden',
            overflowX: 'auto',
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.85rem',
        },
        thead: {
            background: '#be185d',
            color: '#ffffff',
            fontWeight: 600,
        },
        th: {
            padding: '6px 10px',
            textAlign: 'center',
            borderRight: '1px solid rgba(255, 255, 255, 0.2)',
            whiteSpace: 'nowrap',
            fontSize: '0.85rem',
            fontWeight: 600,
            height: '34px',
            verticalAlign: 'middle',
        },
        td: {
            padding: '10px 12px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            color: 'var(--text-primary)',
            textAlign: 'center',
            height: '48px',
            verticalAlign: 'middle',
            whiteSpace: 'nowrap',
        },
        tr: {
            transition: 'background-color 0.2s ease',
            height: '48px',
        },
        sn: {
            fontWeight: 600,
            color: 'var(--primary)',
            minWidth: '26px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '26px',
            height: '26px',
            background: 'rgba(74, 15, 26, 0.08)',
            borderRadius: '8px',
            fontSize: '0.8rem',
        },
        badge: {
            display: 'inline-flex',
            alignItems: 'center',
            padding: '6px 10px',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '0.75rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: '1px solid var(--border)',
            background: 'var(--surface-soft)',
            color: 'var(--text-primary)',
        },
        statusBadge: {
            display: 'inline-flex',
            alignItems: 'center',
            padding: '6px 10px',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '0.75rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
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
                                padding: '8px 14px',
                                borderRadius: '10px',
                                border: '1.5px solid var(--border)',
                                fontSize: '0.85rem',
                                outline: 'none',
                                background: 'var(--panel)',
                                color: 'var(--text-primary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                width: '130px',
                            }}
                        >
                            <option value="All">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                        <button
                            type="button"
                            style={{ ...styles.button, ...styles.exportBtn }}
                            onMouseEnter={(e) => {
                                e.target.style.background = '#1d4ed8';
                                e.target.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = '#2563eb';
                                e.target.style.transform = 'translateY(0)';
                            }}
                            onClick={handleExport}
                        >
                            Export
                        </button>
                        <button
                            type="button"
                            style={{ ...styles.button, ...styles.addBtn }}
                            onMouseEnter={(e) => {
                                e.target.style.background = '#9d124d';
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 4px 12px rgba(190, 24, 93, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = '#be185d';
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                            }}
                            onClick={handleAddSubCategory}
                        >
                            Add Sub Category
                        </button>
                    </div>
                </div>

                {selectedSubCategory && (
                    <div style={styles.detailCard}>
                        <div style={styles.detailHeader}>
                            <div style={styles.detailTitle}>Sub Category Details</div>
                            <button
                                type="button"
                                style={styles.secondaryBtn}
                                onClick={() => setSelectedSubCategory(null)}
                            >
                                Close
                            </button>
                        </div>
                        <div style={styles.detailGrid}>
                            <div>
                                <div style={styles.detailLabel}>Name</div>
                                <div style={styles.detailValue}>{selectedSubCategory.name}</div>
                            </div>
                            <div>
                                <div style={styles.detailLabel}>Category</div>
                                <div style={styles.detailValue}>{selectedSubCategory.category}</div>
                            </div>
                            <div>
                                <div style={styles.detailLabel}>Entry Date</div>
                                <div style={styles.detailValue}>{formatDate(selectedSubCategory.createdAtUtc || selectedSubCategory.createdAt || selectedSubCategory.entryDate)}</div>
                            </div>
                            <div>
                                <div style={styles.detailLabel}>Status</div>
                                <div style={styles.detailValue}>{selectedSubCategory.status}</div>
                            </div>
                        </div>
                    </div>
                )}

                <div style={styles.tableWrapper}>
                    {loading ? (
                        <div style={{ ...styles.emptyState, padding: '40px' }}>
                            <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-secondary)' }}>Loading subcategories...</p>
                        </div>
                    ) : filteredSubCategories.length > 0 ? (
                        <>
                            <table style={styles.table}>
                                <thead style={styles.thead}>
                                    <tr>
                                        <th style={styles.th}>SN.</th>
                                        <th style={styles.th}>Entry Date</th>
                                        <th style={styles.th}>Image</th>
                                        <th style={styles.th}>Name</th>
                                        <th style={styles.th}>Category</th>
                                        <th style={{ ...styles.th, width: '100px' }}>Status</th>
                                        <th className="action-col" style={{ ...styles.th, textAlign: 'center' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSubCategories.slice((page - 1) * pageSize, page * pageSize).map((item, index) => (
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
                                            <td style={{ ...styles.td, textAlign: 'center', verticalAlign: 'middle' }}><span style={styles.sn}>{((page - 1) * pageSize) + index + 1}</span></td>
                                            <td style={{ ...styles.td, verticalAlign: 'middle' }}>{formatDate(item.createdAtUtc || item.createdAt || item.entryDate)}</td>
                                            <td style={{ ...styles.td, textAlign: 'center', verticalAlign: 'middle' }}>
                                                {(item.imageUrl || item.image) && (item.imageUrl || item.image) !== '-' ? (
                                                    <NgrokSafeImage 
                                                        src={toApiAssetUrl(item.imageUrl || item.image)} 
                                                        alt={item.name} 
                                                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', display: 'block', margin: '0 auto', cursor: 'pointer' }}
                                                        onClick={() => setActivePopupImage(toApiAssetUrl(item.imageUrl || item.image))}
                                                    />
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                            <td style={{ ...styles.td, verticalAlign: 'middle' }}>{item.name}</td>
                                            <td style={{ ...styles.td, verticalAlign: 'middle' }}>
                                                <span
                                                    className={`blog-cat-badge-custom cat-${(item.category || 'default').toLowerCase()}`}
                                                    onClick={() => handleViewDetails(item)}
                                                >
                                                    {item.category || '-'}
                                                </span>
                                            </td>
                                            <td style={{ ...styles.td, textAlign: 'center', verticalAlign: 'middle' }}>
                                                <button
                                                    type="button"
                                                    style={{ ...getStatusStyle(item.status), margin: '0 auto' }}
                                                    onClick={() => handleToggleStatus(item.id)}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.opacity = '0.85';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.opacity = '1';
                                                    }}
                                                >
                                                    {item.status}
                                                </button>
                                            </td>
                                            <td className="action-col" style={{ verticalAlign: 'middle' }}>
                                                <div className="admin-actions-cell-row">
                                                    <button
                                                        type="button"
                                                        className="admin-action-btn view"
                                                        title="View Details"
                                                        onClick={() => setModalState({ isOpen: true, mode: 'view', data: item })}
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="admin-action-btn edit"
                                                        title="Edit Sub Category"
                                                        onClick={() => setModalState({ isOpen: true, mode: 'edit', data: item })}
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="admin-action-btn delete"
                                                        title="Delete Sub Category"
                                                        onClick={() => setModalState({ isOpen: true, mode: 'delete', data: item })}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
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
                        </>
                    ) : (
                        <div style={styles.emptyState}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '10px' }}>No data</div>
                            <p>No sub categories found matching "{searchQuery}"</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Reusable Dynamic Modal System */}
            <AdminDynamicModal
                isOpen={modalState.isOpen}
                mode={modalState.mode}
                moduleName="Sub Category"
                data={modalState.data}
                schema={subCategorySchema}
                onClose={() => setModalState({ isOpen: false, mode: null, data: null })}
                onSave={handleSaveSubCategory}
                onDelete={handleDeleteSubCategoryConfirm}
            />

            {activePopupImage && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 2000,
                        cursor: 'zoom-out'
                    }}
                    onClick={() => setActivePopupImage(null)}
                >
                    <img 
                        src={activePopupImage} 
                        alt="Popup View" 
                        style={{
                            maxWidth: '90%',
                            maxHeight: '90%',
                            objectFit: 'contain',
                            borderRadius: '8px',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                        }}
                    />
                </div>
            )}
        </>
    );
}

export default BlogSubCategoryList;
