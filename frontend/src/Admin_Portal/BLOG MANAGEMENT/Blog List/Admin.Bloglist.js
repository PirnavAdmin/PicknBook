import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    Filter,
    X,
    Download,
    Eye,
    Edit2,
    Trash2,
    Calendar,
    User,
    Tag,
    FileText,
    Check,
    AlertCircle,
} from 'lucide-react';
import { getAdminBlogs, deleteAdminBlog, updateAdminBlog, getBlogCategories, getBlogSubCategories } from '../../../services/blogService';
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

function BlogList() {
    const navigate = useNavigate();
    const toastTimerRef = useRef(null);
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalBlogs, setTotalBlogs] = useState(0);

    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);

    const [filterOpen, setFilterOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [subCategoryFilter, setSubCategoryFilter] = useState('All');
    const [selectedBlog, setSelectedBlog] = useState(null);
    const [toast, setToast] = useState(null);
    const [activePopupImage, setActivePopupImage] = useState(null);

    const showToast = (message, tone = 'info') => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        setToast({ message, tone });
        toastTimerRef.current = setTimeout(() => setToast(null), 2400);
    };

    const fetchBlogs = async () => {
        setLoading(true);
        try {
            let isPublishedParam = undefined;
            if (statusFilter === 'Active') {
                isPublishedParam = true;
            } else if (statusFilter === 'Inactive') {
                isPublishedParam = false;
            }
            const data = await getAdminBlogs({
                page,
                pageSize,
                isPublished: isPublishedParam
            });
            const mapped = (data.blogs || []).map(blog => ({
                ...blog,
                entryDate: blog.createdAtUtc ? formatDate(blog.createdAtUtc) : 'Draft',
                image: blog.imageUrl || blog.image || '',
                status: blog.isPublished ? 'Active' : 'Inactive',
                author: blog.addedByName || 'Admin'
            }));
            setBlogs(mapped);
            setTotalBlogs(data.total || 0);
        } catch (error) {
            console.error("Error fetching blogs from API:", error);
            showToast("Failed to load blogs from API.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize, statusFilter]);

    useEffect(() => {
        const loadMetadata = async () => {
            try {
                const cats = await getBlogCategories();
                const subs = await getBlogSubCategories();
                setCategories(cats || []);
                setSubCategories(subs || []);
            } catch (error) {
                console.error("Failed to load category/subcategory metadata:", error);
            }
        };
        loadMetadata();
    }, []);

    const categoryOptions = ['All', ...new Set(blogs.map((blog) => blog.category))];
    const subCategoryOptions = ['All', ...new Set(blogs.map((blog) => blog.subCategory))];

    const filteredBlogs = blogs
        .filter(
            (blog) =>
                blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                blog.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                blog.subCategory.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .filter((blog) => (categoryFilter === 'All' ? true : blog.category === categoryFilter))
        .filter((blog) =>
            subCategoryFilter === 'All' ? true : blog.subCategory === subCategoryFilter
        );

    const handleClearFilters = () => {
        setSearchQuery('');
        setStatusFilter('All');
        setCategoryFilter('All');
        setSubCategoryFilter('All');
        setFilterOpen(false);
        showToast('Filters cleared.', 'info');
    };

    const totalPages = Math.ceil(totalBlogs / pageSize) || 1;

    const handlePrevPage = () => {
        if (page > 1) setPage(page - 1);
    };

    const handleNextPage = () => {
        if (page < totalPages) setPage(page + 1);
    };

    const handleExport = () => {
        const header = ['ID', 'Title', 'Entry Date', 'Category', 'Sub Category', 'Status'];
        const rows = filteredBlogs.map((blog) => [
            blog.id,
            blog.title,
            blog.entryDate,
            blog.category,
            blog.subCategory,
            blog.status,
        ]);
        const csv = [header, ...rows].map((row) => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'blog-list.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('Export completed.', 'success');
    };

    const handleToggleStatus = async (id) => {
        const blogToToggle = blogs.find(b => b.id === id);
        if (!blogToToggle) return;

        try {
            const formData = new FormData();
            formData.append("Title", blogToToggle.title);
            formData.append("Category", blogToToggle.category);
            formData.append("SubCategory", blogToToggle.subCategory);
            formData.append("ShortDescription", blogToToggle.shortDescription || "No short description");
            formData.append("LongDescription", blogToToggle.longDescription || "No long description");
            formData.append("IsPublished", blogToToggle.status !== 'Active'); // Toggle publication state
            formData.append("IsFeatured", blogToToggle.isFeatured || false);

            await updateAdminBlog(id, formData);
            showToast('Blog status updated.', 'success');
            fetchBlogs();
        } catch (error) {
            console.error("Error toggling blog status:", error);
            showToast("Failed to toggle blog status.", "error");
        }
    };

    const handleEditBlogNavigate = (blog) => {
        navigate(`/admin/blog-management/edit-blog/${blog.id}`, { state: { blog } });
    };

    const handleDeleteBlog = async (blog) => {
        const confirmed = window.confirm(`Delete "${blog.title}"?`);
        if (!confirmed) {
            return;
        }
        try {
            await deleteAdminBlog(blog.id);
            showToast('Blog deleted.', 'info');
            fetchBlogs();
        } catch (error) {
            console.error("Error deleting blog:", error);
            showToast("Failed to delete blog.", "error");
        }
    };

    const handleViewDetails = (blog) => {
        setSelectedBlog(blog);
        showToast('Showing blog details.', 'info');
    };

    const handleViewAsset = (assetType, assetName) => {
        showToast(`${assetType} "${assetName}" opened.`, 'info');
    };

    const handleAddBlog = () => {
        navigate('/admin/blog-management/add-blog');
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
            gap: '12px',
            paddingBottom: '10px',
        },
        titleMain: {
            fontSize: '2.2rem',
            fontWeight: 500,
            color: 'var(--text-primary)',
            margin: 0,
            letterSpacing: '-0.5px',
        },
        titleSub: {
            fontSize: '1.4rem',
            fontWeight: 300,
            color: 'var(--text-secondary)',
            margin: 0,
        },
        actions: {
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap',
        },
        button: {
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1px solid transparent',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
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
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-strong) 100%)',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(74, 15, 26, 0.25)',
        },
        exportBtn: {
            background: 'var(--success)',
            color: '#ffffff',
            borderColor: 'var(--success)',
            boxShadow: '0 4px 14px rgba(30, 142, 62, 0.25)',
        },
        searchBox: {
            padding: '8px 12px',
            border: '1.5px solid var(--border)',
            borderRadius: '10px',
            fontSize: '0.85rem',
            width: '220px',
            outline: 'none',
            transition: 'all 0.3s ease',
            background: 'var(--panel)',
            color: 'var(--text-primary)',
        },
        filterPanel: {
            marginTop: '16px',
            padding: '18px',
            borderRadius: '14px',
            border: '1.5px solid var(--border)',
            background: 'var(--panel)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            display: 'grid',
            gap: '14px',
            animation: 'slideDown 0.3s ease',
        },
        filterRow: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
        },
        filterGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        },
        filterLabel: {
            fontSize: '0.8rem',
            fontWeight: 800,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
        },
        filterSelect: {
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1.5px solid var(--border)',
            background: 'var(--panel)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'all 0.3s ease',
            fontWeight: 600,
        },
        detailCard: {
            padding: '20px',
            borderRadius: '16px',
            border: '1.5px solid var(--border)',
            background: 'var(--panel)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            marginBottom: '20px',
            display: 'grid',
            gap: '16px',
            animation: 'slideDown 0.3s ease',
        },
        detailHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        detailTitle: {
            fontWeight: 800,
            fontSize: '1.2rem',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
        },
        detailGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
        },
        detailLabel: {
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
        },
        detailValue: {
            fontSize: '0.95rem',
            color: 'var(--text-primary)',
            fontWeight: 600,
            marginTop: '4px',
        },
        secondaryBtn: {
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1.5px solid var(--border)',
            background: 'var(--panel)',
            color: 'var(--text-primary)',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
        },
        tableWrapper: {
            background: 'var(--panel)',
            borderRadius: '16px',
            border: '1.5px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            overflow: 'hidden',
            overflowX: 'auto',
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.9rem',
        },
        thead: {
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-strong) 100%)',
            color: '#ffffff',
            fontWeight: 800,
            borderBottom: '2px solid var(--primary)',
        },
        th: {
            padding: '6px 10px',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            fontSize: '0.85rem',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            fontWeight: 600,
            verticalAlign: 'middle',
            height: '34px',
        },
        td: {
            padding: '10px 12px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            color: 'var(--text-primary)',
            verticalAlign: 'middle',
            textAlign: 'center',
            height: '48px',
        },
        tbody: {
            fontSize: '0.9rem',
        },
        tr: {
            transition: 'background-color 0.2s ease',
            borderBottom: '1px solid var(--border)',
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
        blogTitle: {
            maxWidth: '300px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            lineHeight: '1.5',
            fontSize: '0.85rem',
        },
        viewBtn: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 12px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.7rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            border: '1.5px solid var(--border)',
            background: 'var(--surface-soft)',
            color: 'var(--text-primary)',
            gap: '0',
            minHeight: '36px',
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
        },
        statusBadge: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 10px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.75rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            border: '1.5px solid',
            gap: '4px',
            minHeight: '32px',
            whiteSpace: 'nowrap',
        },
        statusActive: {
            background: 'rgba(30, 142, 62, 0.15)',
            color: 'var(--success)',
            borderColor: 'rgba(30, 142, 62, 0.35)',
        },
        statusInactive: {
            background: 'rgba(217, 48, 37, 0.15)',
            color: 'var(--danger)',
            borderColor: 'rgba(217, 48, 37, 0.35)',
        },
        actionButtons: {
            display: 'flex',
            gap: '8px',
            flexWrap: 'nowrap',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '120px',
            width: '100%',
        },
        actionColumn: {
            minWidth: '130px',
            textAlign: 'center',
        },
        actionCell: {
            borderBottom: 'none',
            textAlign: 'center',
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
            padding: '60px 20px',
            color: 'var(--text-secondary)',
        },
        emptyStateIcon: {
            fontSize: '3rem',
            marginBottom: '16px',
            opacity: 0.6,
        },
        toast: {
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1.5px solid var(--border)',
            background: 'var(--panel)',
            color: 'var(--text-primary)',
            fontWeight: 700,
            fontSize: '0.9rem',
            marginBottom: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'slideDown 0.3s ease',
        },
        toastSuccess: {
            borderColor: 'rgba(30, 142, 62, 0.4)',
            background: 'rgba(30, 142, 62, 0.12)',
            color: 'var(--success)',
        },
        toastError: {
            borderColor: 'rgba(217, 48, 37, 0.4)',
            background: 'rgba(217, 48, 37, 0.12)',
            color: 'var(--danger)',
        },
        toastInfo: {
            borderColor: 'rgba(74, 15, 26, 0.3)',
            background: 'rgba(74, 15, 26, 0.1)',
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

    const getToastStyle = () => ({
        ...styles.toast,
        ...(toast?.tone === 'success'
            ? styles.toastSuccess
            : toast?.tone === 'error'
                ? styles.toastError
                : styles.toastInfo),
    });

    const getToastIcon = () => {
        if (toast?.tone === 'success') return <Check size={18} />;
        if (toast?.tone === 'error') return <AlertCircle size={18} />;
        return <AlertCircle size={18} />;
    };

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
        
        tbody tr:hover {
          background-color: rgba(74, 15, 26, 0.04) !important;
        }
        
        input:focus {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 3px rgba(74, 15, 26, 0.1) !important;
        }
        
        select:focus {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 3px rgba(74, 15, 26, 0.1) !important;
        }
        
        select:hover {
          background-color: rgba(74, 15, 26, 0.05) !important;
          border-color: var(--primary) !important;
        }
        
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        table {
          table-layout: auto;
        }

        thead tr {
          display: table-row;
        }

        tbody tr {
          display: table-row;
        }

        td, th {
          box-sizing: border-box;
        }
      `}</style>

            <div style={styles.container}>
                {toast && (
                    <div style={getToastStyle()}>
                        {getToastIcon()}
                        <span>{toast.message}</span>
                    </div>
                )}

                <div style={styles.header}>
                    <div style={styles.titleWrapper}>
                        <h1 style={styles.titleMain}>Blog</h1>
                        <h2 style={styles.titleSub}>Management</h2>
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
                                e.target.style.background = 'rgba(30, 142, 62, 0.9)';
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 6px 20px rgba(30, 142, 62, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'var(--success)';
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 4px 14px rgba(30, 142, 62, 0.25)';
                            }}
                            onClick={handleExport}
                        >
                            <Download size={18} />
                            Export
                        </button>
                        <button
                            type="button"
                            style={{ ...styles.button, ...styles.addBtn }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 8px 24px rgba(74, 15, 26, 0.35)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 4px 14px rgba(74, 15, 26, 0.25)';
                            }}
                            onClick={handleAddBlog}
                        >
                            <Plus size={20} strokeWidth={3} />
                            Add Blog
                        </button>
                    </div>
                </div>

                {selectedBlog && (
                    <div style={styles.detailCard}>
                        <div style={styles.detailHeader}>
                            <div style={styles.detailTitle}>
                                <FileText size={22} />
                                Blog Details
                            </div>
                            <button
                                type="button"
                                style={styles.secondaryBtn}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'rgba(74, 15, 26, 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'var(--panel)';
                                }}
                                onClick={() => setSelectedBlog(null)}
                            >
                                <X size={16} />
                                Close
                            </button>
                        </div>
                        <div style={styles.detailGrid}>
                            <div>
                                <div style={styles.detailLabel}>
                                    <FileText size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                    Title
                                </div>
                                <div style={styles.detailValue}>{selectedBlog.title}</div>
                            </div>
                            <div>
                                <div style={styles.detailLabel}>
                                    <Tag size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                    Category
                                </div>
                                <div style={styles.detailValue}>{selectedBlog.category}</div>
                            </div>
                            <div>
                                <div style={styles.detailLabel}>
                                    <Tag size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                    Sub Category
                                </div>
                                <div style={styles.detailValue}>{selectedBlog.subCategory}</div>
                            </div>
                            <div>
                                <div style={styles.detailLabel}>
                                    <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                    Entry Date
                                </div>
                                <div style={styles.detailValue}>{selectedBlog.entryDate}</div>
                            </div>
                            <div>
                                <div style={styles.detailLabel}>
                                    <User size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                    Author
                                </div>
                                <div style={styles.detailValue}>{selectedBlog.author}</div>
                            </div>
                            <div>
                                <div style={styles.detailLabel}>Status</div>
                                <div style={getStatusStyle(selectedBlog.status)}>
                                    {selectedBlog.status === 'Active' ? (
                                        <Check size={14} />
                                    ) : (
                                        <AlertCircle size={14} />
                                    )}
                                    {selectedBlog.status}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div style={styles.tableWrapper}>
                    {filteredBlogs.length > 0 ? (
                        <table style={styles.table}>
                            <thead style={styles.thead}>
                                <tr>
                                    <th style={styles.th}>SN.</th>
                                    <th style={styles.th}>Title</th>
                                    <th style={styles.th}>Entry Date</th>
                                    <th style={styles.th}>Image</th>
                                    <th style={styles.th}>Category</th>
                                    <th style={styles.th}>Sub Category</th>
                                    <th style={styles.th}>Status</th>
                                    <th style={{ ...styles.th, ...styles.actionColumn }}>Action</th>
                                </tr>
                            </thead>
                            <tbody style={styles.tbody}>
                                {filteredBlogs.map((blog, index) => (
                                    <tr key={blog.id} style={styles.tr}>
                                        <td style={styles.td}>
                                            <span style={styles.sn}>{index + 1}</span>
                                        </td>
                                        <td style={{ ...styles.td, ...styles.blogTitle, textAlign: 'center' }}>
                                            {blog.title}
                                        </td>
                                        <td style={styles.td}>
                                            {blog.entryDate}
                                        </td>
                                        <td style={styles.td}>
                                            {blog.image ? (
                                                <img
                                                    src={toApiAssetUrl(blog.image)}
                                                    alt={blog.title}
                                                    title={blog.title}
                                                    style={{
                                                        width: '45px',
                                                        height: '45px',
                                                        objectFit: 'cover',
                                                        borderRadius: '6px',
                                                        border: '1px solid rgba(0, 0, 0, 0.1)',
                                                        display: 'block',
                                                        margin: '0 auto',
                                                        cursor: 'pointer',
                                                    }}
                                                    onClick={() => setActivePopupImage(toApiAssetUrl(blog.image))}
                                                />
                                            ) : (
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>-</span>
                                            )}
                                        </td>
                                        <td style={styles.td}>
                                            {(() => {
                                                const catObj = categories.find(c => c.name === blog.category);
                                                const catImg = catObj?.imageUrl || catObj?.image;
                                                return (
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                                        {catImg && catImg !== '-' ? (
                                                            <img
                                                                src={toApiAssetUrl(catImg)}
                                                                alt={blog.category}
                                                                title={blog.category}
                                                                style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer' }}
                                                                onClick={() => setActivePopupImage(toApiAssetUrl(catImg))}
                                                            />
                                                        ) : (
                                                            <span>-</span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td style={styles.td}>
                                            {(() => {
                                                const subObj = subCategories.find(s => s.name === blog.subCategory);
                                                const subImg = subObj?.imageUrl || subObj?.image;
                                                return (
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                                        {subImg && subImg !== '-' ? (
                                                            <img
                                                                src={toApiAssetUrl(subImg)}
                                                                alt={blog.subCategory}
                                                                title={blog.subCategory}
                                                                style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer' }}
                                                                onClick={() => setActivePopupImage(toApiAssetUrl(subImg))}
                                                            />
                                                        ) : (
                                                            <span>-</span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td style={styles.td}>
                                            <button
                                                type="button"
                                                style={getStatusStyle(blog.status)}
                                                onMouseEnter={(e) => {
                                                    e.target.style.opacity = '0.85';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.opacity = '1';
                                                }}
                                                onClick={() => handleToggleStatus(blog.id)}
                                            >
                                                {blog.status === 'Active' ? (
                                                    <Check size={12} />
                                                ) : (
                                                    <AlertCircle size={12} />
                                                )}
                                                {blog.status}
                                            </button>
                                        </td>
                                        <td
                                            style={{
                                                ...styles.td,
                                                ...styles.actionColumn,
                                                ...styles.actionCell,
                                            }}
                                        >
                                            <div style={styles.actionButtons}>
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
                                                    onClick={() => handleViewDetails(blog)}
                                                >
                                                    <Eye size={16} strokeWidth={2} />
                                                </button>
                                                <button
                                                    type="button"
                                                    style={styles.actionBtn}
                                                    title="Edit Blog"
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
                                                    onClick={() => handleEditBlogNavigate(blog)}
                                                >
                                                    <Edit2 size={16} strokeWidth={2} />
                                                </button>
                                                <button
                                                    type="button"
                                                    style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                                                    title="Delete Blog"
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
                                                    onClick={() => handleDeleteBlog(blog)}
                                                >
                                                    <Trash2 size={16} strokeWidth={2} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={styles.emptyState}>
                            <div style={styles.emptyStateIcon}>
                                <FileText size={64} style={{ opacity: 0.5 }} />
                            </div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '8px' }}>
                                No blogs found
                            </div>
                            <p style={{ margin: 0, opacity: 0.8 }}>
                                {searchQuery
                                    ? `No blogs match "${searchQuery}"`
                                    : 'Start by adding your first blog post'}
                            </p>
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <div style={styles.paginationContainer}>
                        <div style={styles.paginationInfo}>
                            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalBlogs)} of {totalBlogs} blogs
                        </div>
                        <div style={styles.paginationButtons}>
                            <button
                                type="button"
                                style={{
                                    ...styles.pageBtn,
                                    opacity: page === 1 ? 0.5 : 1,
                                    cursor: page === 1 ? 'not-allowed' : 'pointer'
                                }}
                                disabled={page === 1}
                                onClick={handlePrevPage}
                            >
                                Previous
                            </button>
                            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    style={{
                                        ...styles.pageBtn,
                                        background: page === p ? 'var(--primary)' : 'var(--panel)',
                                        color: page === p ? '#ffffff' : 'var(--text-primary)',
                                        borderColor: page === p ? 'var(--primary)' : 'var(--border)'
                                    }}
                                    onClick={() => setPage(p)}
                                >
                                    {p}
                                </button>
                            ))}
                            <button
                                type="button"
                                style={{
                                    ...styles.pageBtn,
                                    opacity: page === totalPages ? 0.5 : 1,
                                    cursor: page === totalPages ? 'not-allowed' : 'pointer'
                                }}
                                disabled={page === totalPages}
                                onClick={handleNextPage}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

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

export default BlogList;
