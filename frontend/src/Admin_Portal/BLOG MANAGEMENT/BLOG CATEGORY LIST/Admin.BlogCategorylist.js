import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit2, Trash2 } from 'lucide-react';
import AdminPagination from '../../../components/AdminPagination';
import { deleteBlogCategory, getBlogCategories, toggleBlogCategoryStatus, updateBlogCategory } from '../../../services/blogService';
import { toApiAssetUrl } from '../../../services/apiClient';

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

function BlogCategoryList() {
    const navigate = useNavigate();
    const toastTimerRef = useRef(null);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadCategories = async () => {
        try {
            setLoading(true);
            const data = await getBlogCategories();
            setCategories(data);
        } catch (error) {
            console.error("Failed to load categories", error);
            showToast("Failed to load categories.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [filterOpen, setFilterOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [imageFilter, setImageFilter] = useState('All');

    useEffect(() => {
        setPage(1);
    }, [searchQuery, statusFilter, imageFilter]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [toast, setToast] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editFormData, setEditFormData] = useState({
        name: '',
        slug: '',
        status: 'Active',
        metaTitle: '',
        metaKeyword: '',
        metaDescription: '',
        image: null,
    });
    const [activePopupImage, setActivePopupImage] = useState(null);

    const showToast = (message, tone = 'info') => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        setToast({ message, tone });
        toastTimerRef.current = setTimeout(() => setToast(null), 2400);
    };

    const filteredCategories = categories
        .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .filter(item => (statusFilter === 'All' ? true : item.status === statusFilter))
        .filter(item => {
            const hasImage = item.imageUrl || item.image;
            if (imageFilter === 'All') {
                return true;
            }
            if (imageFilter === 'With Image') {
                return hasImage && hasImage !== '-';
            }
            return !hasImage || hasImage === '-';
        });

    const handleClearFilters = () => {
        setSearchQuery('');
        setStatusFilter('All');
        setImageFilter('All');
        setFilterOpen(false);
        showToast('Filters cleared.', 'info');
    };

    const handleExport = () => {
        const header = ['ID', 'Name', 'Entry Date', 'Image', 'Status'];
        const rows = filteredCategories.map(item => [
            item.id,
            item.name,
            formatDate(item.createdAtUtc || item.createdAt || item.entryDate),
            item.imageUrl || item.image || '-',
            item.status
        ]);
        const csv = [header, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'blog-category-list.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('Export completed.', 'success');
    };

    const handleToggleStatus = async (id) => {
        try {
            await toggleBlogCategoryStatus(id);
            setCategories(prev =>
                prev.map(item =>
                    item.id === id
                        ? { ...item, status: item.status === 'Active' ? 'Inactive' : 'Active' }
                        : item
                )
            );
            showToast('Category status updated.', 'success');
        } catch (error) {
            console.error("Failed to toggle category status", error);
            showToast("Failed to update status.", "error");
        }
    };

    const handleEditCategory = (category) => {
        setEditingCategory(category);
        setEditFormData({
            name: category.name || '',
            slug: category.slug || '',
            status: category.status || 'Active',
            metaTitle: category.metaTitle || '',
            metaKeyword: category.metaKeyword || '',
            metaDescription: category.metaDescription || '',
            image: null,
        });
        setEditModalOpen(true);
    };

    const handleSaveEditCategory = async (e) => {
        e.preventDefault();
        if (!editFormData.name.trim()) {
            showToast('Category name cannot be empty.', 'error');
            return;
        }
        try {
            const formData = new FormData();
            formData.append("Name", editFormData.name.trim());
            formData.append("Slug", editFormData.slug || '');
            formData.append("Status", editFormData.status);
            formData.append("MetaTitle", editFormData.metaTitle || '');
            formData.append("MetaKeyword", editFormData.metaKeyword || '');
            formData.append("MetaDescription", editFormData.metaDescription || '');
            if (editFormData.image) {
                formData.append("Image", editFormData.image);
            }

            const updated = await updateBlogCategory(editingCategory.id, formData);
            setCategories(prev => prev.map(item => (item.id === editingCategory.id ? updated : item)));
            showToast('Category updated.', 'success');
            setEditModalOpen(false);
            setEditingCategory(null);
        } catch (error) {
            console.error("Failed to update category", error);
            showToast("Failed to update category.", "error");
        }
    };

    const handleDeleteCategory = async (category) => {
        const confirmed = window.confirm(`Delete "${category.name}"?`);
        if (!confirmed) {
            return;
        }
        try {
            await deleteBlogCategory(category.id);
            setCategories(prev => prev.filter(item => item.id !== category.id));
            showToast('Category deleted.', 'info');
        } catch (error) {
            console.error("Failed to delete category", error);
            showToast("Failed to delete category.", "error");
        }
    };

    const handleViewDetails = (category) => {
        setSelectedCategory(category);
        showToast('Showing category details.', 'info');
    };

    const handleAddCategory = () => {
        navigate('/admin/blog-management/add-blog-category');
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
            borderRadius: '8px',
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
                        <h1 style={styles.titleMain}>Blog Category</h1>
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
                            onClick={handleAddCategory}
                        >
                            Add Category
                        </button>
                    </div>
                </div>

                {selectedCategory && (
                    <div style={styles.detailCard}>
                        <div style={styles.detailHeader}>
                            <div style={styles.detailTitle}>Category Details</div>
                            <button
                                type="button"
                                style={styles.secondaryBtn}
                                onClick={() => setSelectedCategory(null)}
                            >
                                Close
                            </button>
                        </div>
                        <div style={styles.detailGrid}>
                            <div>
                                <div style={styles.detailLabel}>Name</div>
                                <div style={styles.detailValue}>{selectedCategory.name}</div>
                            </div>
                            <div>
                                <div style={styles.detailLabel}>Entry Date</div>
                                <div style={styles.detailValue}>{formatDate(selectedCategory.createdAtUtc || selectedCategory.createdAt || selectedCategory.entryDate)}</div>
                            </div>
                            <div>
                                <div style={styles.detailLabel}>Image</div>
                                <div style={styles.detailValue}>{selectedCategory.imageUrl || selectedCategory.image || '-'}</div>
                            </div>
                            <div>
                                <div style={styles.detailLabel}>Status</div>
                                <div style={styles.detailValue}>{selectedCategory.status}</div>
                            </div>
                        </div>
                    </div>
                )}

                <div style={styles.tableWrapper}>
                    {loading ? (
                        <div style={{ ...styles.emptyState, padding: '40px' }}>
                            <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-secondary)' }}>Loading categories...</p>
                        </div>
                    ) : filteredCategories.length > 0 ? (
                        <>
                            <table style={styles.table}>
                                <thead style={styles.thead}>
                                    <tr>
                                        <th style={styles.th}>SN.</th>
                                        <th style={styles.th}>Entry Date</th>
                                        <th style={styles.th}>Image</th>
                                        <th style={styles.th}>Name</th>
                                        <th style={styles.th}>Status</th>
                                        <th style={styles.th}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCategories.slice((page - 1) * pageSize, page * pageSize).map((category, index) => (
                                        <tr
                                            key={category.id}
                                            style={styles.tr}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(74, 15, 26, 0.06)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            <td style={styles.td}><span style={styles.sn}>{((page - 1) * pageSize) + index + 1}</span></td>
                                            <td style={styles.td}>{formatDate(category.createdAtUtc || category.createdAt || category.entryDate)}</td>
                                            <td style={styles.td}>
                                                {(category.imageUrl || category.image) && (category.imageUrl || category.image) !== '-' ? (
                                                    <img 
                                                        src={toApiAssetUrl(category.imageUrl || category.image)} 
                                                        alt={category.name} 
                                                        title={category.name}
                                                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', display: 'block', margin: '0 auto', cursor: 'pointer' }}
                                                        onClick={() => setActivePopupImage(toApiAssetUrl(category.imageUrl || category.image))}
                                                    />
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                            <td style={styles.td}>{category.name}</td>
                                            <td style={styles.td}>
                                                <button
                                                    type="button"
                                                    style={getStatusStyle(category.status)}
                                                    onClick={() => handleToggleStatus(category.id)}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.opacity = '0.85';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.opacity = '1';
                                                    }}
                                                >
                                                    {category.status}
                                                </button>
                                            </td>
                                            <td style={{ ...styles.td, ...styles.actionButtons }}>
                                                <button
                                                    type="button"
                                                    style={styles.actionBtn}
                                                    title="View Details"
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(74, 15, 26, 0.15)';
                                                        e.currentTarget.style.borderColor = 'var(--primary)';
                                                        e.currentTarget.style.transform = 'scale(1.08)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'var(--surface-soft)';
                                                        e.currentTarget.style.borderColor = 'var(--border)';
                                                        e.currentTarget.style.transform = 'scale(1)';
                                                    }}
                                                    onClick={() => handleViewDetails(category)}
                                                >
                                                    <Eye size={16} strokeWidth={2} />
                                                </button>
                                                <button
                                                    type="button"
                                                    style={styles.actionBtn}
                                                    title="Edit Category"
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(74, 15, 26, 0.15)';
                                                        e.currentTarget.style.borderColor = 'var(--primary)';
                                                        e.currentTarget.style.transform = 'scale(1.08)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'var(--surface-soft)';
                                                        e.currentTarget.style.borderColor = 'var(--border)';
                                                        e.currentTarget.style.transform = 'scale(1)';
                                                    }}
                                                    onClick={() => handleEditCategory(category)}
                                                >
                                                    <Edit2 size={16} strokeWidth={2} />
                                                </button>
                                                <button
                                                    type="button"
                                                    style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                                                    title="Delete Category"
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(217, 48, 37, 0.22)';
                                                        e.currentTarget.style.borderColor = 'var(--danger)';
                                                        e.currentTarget.style.transform = 'scale(1.08)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'rgba(217, 48, 37, 0.15)';
                                                        e.currentTarget.style.borderColor = 'rgba(217, 48, 37, 0.35)';
                                                        e.currentTarget.style.transform = 'scale(1)';
                                                    }}
                                                    onClick={() => handleDeleteCategory(category)}
                                                >
                                                    <Trash2 size={16} strokeWidth={2} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <AdminPagination
                                currentPage={page}
                                totalItems={filteredCategories.length}
                                itemsPerPage={pageSize}
                                onPageChange={setPage}
                                onItemsPerPageChange={setPageSize}
                                itemName="categories"
                            />
                        </>
                    ) : (
                        <div style={styles.emptyState}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '10px' }}>No data</div>
                            <p>No categories found matching "{searchQuery}"</p>
                        </div>
                    )}
                </div>
            </div>

            {editModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    padding: '20px',
                }}>
                    <div style={{
                        background: 'var(--panel)',
                        borderRadius: '12px',
                        padding: '24px',
                        width: '100%',
                        maxWidth: '500px',
                        boxShadow: 'var(--shadow-md)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                            Edit Category
                        </h3>
                        <form onSubmit={handleSaveEditCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Category Name *</label>
                                <input 
                                    type="text" 
                                    value={editFormData.name} 
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                                    style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--panel)', color: 'var(--text-primary)' }}
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Slug</label>
                                <input 
                                    type="text" 
                                    value={editFormData.slug} 
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, slug: e.target.value }))}
                                    style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--panel)', color: 'var(--text-primary)' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Status</label>
                                <select 
                                    value={editFormData.status} 
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                                    style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--panel)', color: 'var(--text-primary)' }}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Meta Title</label>
                                <input 
                                    type="text" 
                                    value={editFormData.metaTitle} 
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, metaTitle: e.target.value }))}
                                    style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--panel)', color: 'var(--text-primary)' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Meta Keyword</label>
                                <input 
                                    type="text" 
                                    value={editFormData.metaKeyword} 
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, metaKeyword: e.target.value }))}
                                    style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--panel)', color: 'var(--text-primary)' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Meta Description</label>
                                <textarea 
                                    value={editFormData.metaDescription} 
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, metaDescription: e.target.value }))}
                                    style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--panel)', color: 'var(--text-primary)', minHeight: '60px', resize: 'vertical' }}
                                />
                            </div>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Category Image</label>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, image: e.target.files[0] }))}
                                    style={{ fontSize: '0.85rem' }}
                                />
                                {editingCategory?.imageUrl || editingCategory?.image ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                        <img 
                                            src={toApiAssetUrl(editingCategory.imageUrl || editingCategory.image)} 
                                            alt="Current" 
                                            style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} 
                                        />
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Current Image</span>
                                    </div>
                                ) : null}
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setEditModalOpen(false)}
                                    style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text-primary)', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: '#ffffff', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {activePopupImage && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 9999,
                        cursor: 'pointer'
                    }}
                    onClick={() => setActivePopupImage(null)}
                >
                    <img 
                        src={activePopupImage} 
                        alt="Popup View" 
                        style={{
                            maxWidth: '90%',
                            maxHeight: '90%',
                            borderRadius: '8px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            cursor: 'default'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
}

export default BlogCategoryList;
