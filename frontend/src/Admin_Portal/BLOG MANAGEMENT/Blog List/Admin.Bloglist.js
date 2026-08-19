/* eslint-disable */
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    X,
    Download,
    Eye,
    Edit2,
    Pencil,
    Trash2,
    Calendar,
    User,
    Tag,
    FileText,
    Check,
    AlertCircle,
    BookOpen,
    Filter,
    RotateCcw,
    TrendingUp,
    TrendingDown,
    Folder
} from 'lucide-react';
import AdminPagination from '../../../components/AdminPagination';
import { getAdminBlogs, deleteAdminBlog, updateAdminBlog, getBlogCategories, getBlogSubCategories } from '../../../services/blogService';
import { toApiAssetUrl, NgrokSafeImage } from '../../../services/apiClient';
import AdminDynamicModal from '../../../components/AdminDynamicModal';

const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch {
        return dateString;
    }
};

function BlogList() {
    const navigate = useNavigate();
    const toastTimerRef = useRef(null);
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalBlogs, setTotalBlogs] = useState(0);

    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('01 May 2024 - 31 May 2024');
    const [selectedBlog, setSelectedBlog] = useState(null);
    const [toast, setToast] = useState(null);
    const [activePopupImage, setActivePopupImage] = useState(null);
    const [showFilterForm, setShowFilterForm] = useState(false); // Default to closed
    const [sortBy, setSortBy] = useState('Latest First');
    const [authorFilter, setAuthorFilter] = useState('All');

    // Reusable popup modal state
    const [modalState, setModalState] = useState({ isOpen: false, mode: null, data: null });

    const categoriesOptions = useMemo(() => {
        return categories.map(cat => ({ value: cat.name, label: cat.name }));
    }, [categories]);

    const subCategoriesOptions = useMemo(() => {
        return subCategories.map(sub => ({ value: sub.name, label: sub.name }));
    }, [subCategories]);

    const blogSchema = useMemo(() => [
        { name: 'title', label: 'Blog Title', type: 'text', required: true },
        { name: 'slug', label: 'Slug', type: 'text' },
        { name: 'category', label: 'Category', type: 'select', options: categoriesOptions, required: true },
        { name: 'subCategory', label: 'Sub Category', type: 'select', options: subCategoriesOptions, required: true },
        { name: 'author', label: 'Author', type: 'text' },
        { name: 'entryDate', label: 'Publish Date', type: 'date' },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
        { name: 'image', label: 'Featured Image', type: 'image' },
        { name: 'shortDescription', label: 'Short Description', type: 'textarea' },
        { name: 'longDescription', label: 'Long Description', type: 'textarea' },
        { name: 'metaTitle', label: 'Meta Title', type: 'text' },
        { name: 'metaKeyword', label: 'Meta Keyword', type: 'text' },
        { name: 'metaDescription', label: 'Meta Description', type: 'textarea' },
    ], [categoriesOptions, subCategoriesOptions]);

    const handleSaveBlog = async (updatedData) => {
        try {
            const formData = new FormData();
            formData.append("Title", updatedData.title.trim());
            formData.append("Category", updatedData.category);
            formData.append("SubCategory", updatedData.subCategory);
            formData.append("ShortDescription", updatedData.shortDescription.trim());
            formData.append("LongDescription", updatedData.longDescription.trim());
            formData.append("Slug", updatedData.slug || '');
            formData.append("Author", updatedData.author || '');
            formData.append("IsFeatured", updatedData.featured === 'Yes' || updatedData.featured === true);
            formData.append("IsPublished", updatedData.status === 'Active' || updatedData.status === true);
            formData.append("MetaTitle", updatedData.metaTitle || '');
            formData.append("MetaKeyword", updatedData.metaKeyword || '');
            formData.append("MetaDescription", updatedData.metaDescription || '');

            if (updatedData.image instanceof File) {
                formData.append("Image", updatedData.image);
            }

            await updateAdminBlog(modalState.data.id, formData);
            showToast('Blog updated successfully.', 'success');
            setModalState({ isOpen: false, mode: null, data: null });
            fetchBlogs();
        } catch (error) {
            console.error("Error saving blog:", error);
            showToast(error.response?.data?.message || "Failed to update blog.", "error");
        }
    };

    const handleDeleteBlogConfirm = async () => {
        try {
            await deleteAdminBlog(modalState.data.id);
            showToast('Blog deleted.', 'info');
            setModalState({ isOpen: false, mode: null, data: null });
            fetchBlogs();
        } catch (error) {
            console.error("Error deleting blog:", error);
            showToast("Failed to delete blog.", "error");
        }
    };

    // Typewriter heading state
    const [displayText, setDisplayText] = useState('');
    const [showCursor, setShowCursor] = useState(true);
    const titleText = 'Blog Management';

    useEffect(() => {
        let index = 0;
        setDisplayText('');
        setShowCursor(true);
        const interval = setInterval(() => {
            if (index < titleText.length) {
                setDisplayText((prev) => prev + titleText.charAt(index));
                index++;
            } else {
                clearInterval(interval);
                setTimeout(() => setShowCursor(false), 1000);
            }
        }, 50);
        return () => clearInterval(interval);
    }, []);

    const showToast = (message, tone = 'info') => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        setToast({ message, tone });
        toastTimerRef.current = setTimeout(() => setToast(null), 2400);
    };

    const fetchBlogs = async () => {
        setLoading(true);
        setError(null);
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
                entryDate: blog.createdAtUtc ? formatDate(blog.createdAtUtc) : 'N/A',
                image: blog.imageUrl || blog.image || '',
                status: blog.isPublished ? 'Active' : 'Inactive',
                author: blog.addedByName || 'Unknown',
                views: blog.viewsCount || 0
            }));
            setBlogs(mapped);
            setTotalBlogs(data.total || 0);
        } catch (err) {
            console.error("Error fetching blogs:", err);
            setError(err.message || "Failed to load blogs from backend server.");
            showToast("Failed to load blogs.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlogs();
    }, [page, pageSize, statusFilter]);

    useEffect(() => {
        const loadMetadata = async () => {
            try {
                const cats = await getBlogCategories();
                const subs = await getBlogSubCategories();
                setCategories(cats || []);
                setSubCategories(subs || []);
            } catch (error) {
                console.error("Failed to load metadata:", error);
            }
        };
        loadMetadata();
    }, []);

    // Dynamically extract unique authors from blogs data
    const uniqueAuthors = useMemo(() => {
        const authorSet = new Set();
        blogs.forEach(blog => {
            if (blog.author && blog.author.trim()) {
                authorSet.add(blog.author.trim());
            }
        });
        return Array.from(authorSet).sort();
    }, [blogs]);

    const filteredBlogs = blogs
        .filter(
            (blog) =>
                blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (blog.category || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
        .filter((blog) => (categoryFilter === 'All' ? true : blog.category === categoryFilter))
        .filter((blog) => (authorFilter === 'All' ? true : blog.author === authorFilter))
        .sort((a, b) => {
            if (sortBy === 'Latest First') {
                return new Date(b.createdAtUtc || b.entryDate) - new Date(a.createdAtUtc || a.entryDate);
            } else if (sortBy === 'Oldest First') {
                return new Date(a.createdAtUtc || a.entryDate) - new Date(b.createdAtUtc || b.entryDate);
            }
            return 0;
        });

    const handleClearFilters = () => {
        setSearchQuery('');
        setStatusFilter('All');
        setCategoryFilter('All');
        setAuthorFilter('All');
        setSortBy('Latest First');
        setDateFilter('01 May 2024 - 31 May 2024');
        showToast('Filters reset.', 'info');
    };

    const handleExport = () => {
        const header = ['ID', 'Title', 'Entry Date', 'Category', 'Status', 'Views'];
        const rows = filteredBlogs.map((blog) => [
            blog.id,
            blog.title,
            blog.entryDate,
            blog.category,
            blog.status,
            blog.views
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
            formData.append("Category", blogToToggle.category || '');
            formData.append("SubCategory", blogToToggle.subCategory || '');
            formData.append("ShortDescription", blogToToggle.shortDescription || "No short description");
            formData.append("LongDescription", blogToToggle.longDescription || "No long description");
            formData.append("IsPublished", blogToToggle.status !== 'Active');
            formData.append("IsFeatured", blogToToggle.isFeatured || false);

            await updateAdminBlog(id, formData);
            showToast('Blog status updated.', 'success');
            fetchBlogs();
        } catch (error) {
            console.error("Error toggling status:", error);
            showToast("Failed to update status.", "error");
        }
    };

    const handleEditBlogNavigate = (blog) => {
        navigate(`/admin/blog-management/edit-blog/${blog.id}`, { state: { blog } });
    };

    const handleDeleteBlog = async (blog) => {
        const confirmed = window.confirm(`Delete "${blog.title}"?`);
        if (!confirmed) return;
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
        showToast('Showing details.', 'info');
    };

    const handleAddBlog = () => {
        navigate('/admin/blog-management/add-blog');
    };

    return (
        <div className="admin-blog-dashboard">
            <style>{`
                .admin-blog-dashboard {
                    padding: 6px 30px 30px 30px;
                    background-color: #F8FAFC;
                    background-image: 
                        radial-gradient(#E2E8F0 1px, transparent 1px);
                    background-size: 24px 24px;
                    background-position: 0 0;
                    min-height: 100vh;
                    font-family: 'Poppins', 'Inter', sans-serif;
                    box-sizing: border-box;
                    animation: pageFadeIn 0.4s ease-out;
                }

                .admin-shell.dark-theme .admin-blog-dashboard {
                    background-color: #0F172A;
                    background-image: 
                        radial-gradient(#334155 1px, transparent 1px);
                }

                @keyframes pageFadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* Header Layout */
                .blog-header-box {
                    margin-top: 6px;
                    margin-bottom: 6px;
                }

                .blog-header-headline {
                    display: flex;
                    align-items: center;
                    margin-top: 6px;
                    margin-bottom: 6px;
                }

                .blog-header-title-text {
                    font-size: 32px;
                    font-weight: 500;
                    color: #111827;
                    margin: 0;
                    font-family: 'Poppins', sans-serif;
                }

                .admin-shell.dark-theme .blog-header-title-text {
                    color: #FFFFFF;
                }

                .blog-header-cursor {
                    font-weight: 200;
                    color: #2563EB;
                    animation: cursorBlink 1s infinite;
                }

                @keyframes cursorBlink {
                    50% { opacity: 0; }
                }

                .blog-header-desc {
                    font-size: 0.95rem;
                    color: #6B7280;
                    margin: 4px 0 0 0;
                }

                .admin-shell.dark-theme .blog-header-desc {
                    color: #94A3B8;
                }

                /* Stats Cards Grid */
                .blog-stats-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 20px;
                    margin-bottom: 24px;
                }

                .blog-card-stat {
                    background: #FFFFFF;
                    border-radius: 16px;
                    padding: 24px;
                    box-shadow: 0 8px 24px rgba(15, 23, 242, 0.04);
                    border: 1px solid rgba(229, 231, 235, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    transition: transform 0.28s ease, box-shadow 0.28s ease;
                    cursor: pointer;
                }

                .admin-shell.dark-theme .blog-card-stat {
                    background: #1E293B;
                    border-color: #334155;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
                }

                 .blog-card-stat:hover {
                     transform: translateY(-6px);
                     box-shadow: 0 12px 30px rgba(37, 99, 235, 0.12);
                     border-color: rgba(37, 99, 235, 0.3);
                 }

                .stat-details h3 {
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #6B7280;
                    margin: 0 0 6px 0;
                    font-weight: 700;
                }

                .admin-shell.dark-theme .stat-details h3 {
                    color: #94A3B8;
                }

                .stat-details .value-row {
                    display: flex;
                    align-items: baseline;
                    gap: 8px;
                }

                .stat-details .value-row h4 {
                    font-size: 28px;
                    font-weight: 800;
                    color: #111827;
                    margin: 0;
                }

                .admin-shell.dark-theme .stat-details .value-row h4 {
                    color: #F1F5F9;
                }

                .stat-trend-badge {
                    font-size: 0.78rem;
                    font-weight: 700;
                    padding: 2px 6px;
                    border-radius: 6px;
                    display: inline-flex;
                    align-items: center;
                    gap: 2px;
                }

                .stat-trend-badge.up { background: #DCFCE7; color: #166534; }
                .stat-trend-badge.down { background: #FEE2E2; color: #991B1B; }

                .stat-icon-wrapper {
                    width: 46px;
                    height: 46px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .stat-icon-wrapper.blue { background: #EFF6FF; color: #2563EB; }
                .stat-icon-wrapper.green { background: #ECFDF5; color: #10B981; }
                .stat-icon-wrapper.orange { background: #FFF7ED; color: #EA580C; }
                .stat-icon-wrapper.gray { background: #F3F4F6; color: #6B7280; }

                .admin-shell.dark-theme .stat-icon-wrapper.blue { background: rgba(37, 99, 235, 0.15); }
                .admin-shell.dark-theme .stat-icon-wrapper.green { background: rgba(16, 185, 129, 0.15); }
                .admin-shell.dark-theme .stat-icon-wrapper.orange { background: rgba(234, 88, 12, 0.15); }
                .admin-shell.dark-theme .stat-icon-wrapper.gray { background: rgba(107, 114, 128, 0.15); }

                /* Toolbar */
                .blog-dashboard-toolbar {
                    background: #FFFFFF;
                    border-radius: 16px;
                    padding: 14px 20px;
                    box-shadow: 0 4px 12px rgba(15, 23, 242, 0.03);
                    border: 1px solid rgba(229, 231, 235, 0.7);
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    flex-wrap: nowrap !important;
                    margin-bottom: 24px;
                    height: 72px !important;
                    box-sizing: border-box;
                    overflow-x: auto;
                }

                .admin-shell.dark-theme .blog-dashboard-toolbar {
                    background: #1E293B;
                    border-color: #334155;
                }

                .toolbar-filters-left {
                    display: flex !important;
                    align-items: center !important;
                    gap: 12px !important;
                    flex-wrap: nowrap !important;
                }

                .toolbar-search-box {
                    position: relative;
                    width: 200px !important;
                }

                .toolbar-search-input-field {
                    width: 200px !important;
                    height: 44px !important;
                    padding: 0 16px 0 40px !important;
                    border-radius: 10px !important;
                    background: #FFFFFF !important;
                    border: 1px solid #E5E7EB !important;
                    font-size: 0.9rem !important;
                    outline: none !important;
                    color: #1E293B !important;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    box-sizing: border-box;
                    font-family: inherit;
                }

                .admin-shell.dark-theme .toolbar-search-input-field {
                    background: #111827 !important;
                    border-color: #334155 !important;
                    color: #F1F5F9 !important;
                }

                .toolbar-search-input-field:focus {
                    border-color: #2563EB !important;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1) !important;
                }

                .toolbar-search-icon-svg {
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94A3B8;
                    pointer-events: none;
                }

                .toolbar-filter-select-element {
                    height: 44px !important;
                    padding: 0 14px !important;
                    border-radius: 10px !important;
                    background: #FFFFFF !important;
                    border: 1px solid #E5E7EB !important;
                    font-size: 0.9rem !important;
                    outline: none !important;
                    color: #1E293B !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                    font-weight: 500 !important;
                    font-family: inherit;
                }

                .toolbar-filter-select-element.category-select {
                    width: 160px !important;
                }

                .toolbar-filter-select-element.status-select {
                    width: 140px !important;
                }

                .admin-shell.dark-theme .toolbar-filter-select-element {
                    background: #111827 !important;
                    border-color: #334155 !important;
                    color: #F1F5F9 !important;
                }

                .toolbar-filter-select-element:hover {
                    border-color: #2563EB !important;
                }

                .toolbar-date-range-display {
                    height: 44px !important;
                    width: 240px !important;
                    padding: 0 14px !important;
                    border-radius: 10px !important;
                    background: #FFFFFF !important;
                    border: 1px solid #E5E7EB !important;
                    font-size: 0.9rem !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                    color: #374151 !important;
                    font-weight: 500 !important;
                    cursor: pointer !important;
                    box-sizing: border-box !important;
                    white-space: nowrap !important;
                }

                .admin-shell.dark-theme .toolbar-date-range-display {
                    background: #111827 !important;
                    border-color: #334155 !important;
                    color: #CBD5E1 !important;
                }

                .toolbar-actions-right {
                    display: flex !important;
                    align-items: center !important;
                    gap: 10px !important;
                    flex-wrap: nowrap !important;
                }

                /* Button colors */
                .saas-btn-action {
                    height: 44px !important;
                    padding: 0 16px !important;
                    border-radius: 10px !important;
                    font-size: 0.88rem !important;
                    font-weight: 600 !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 8px !important;
                    border: none !important;
                    cursor: pointer !important;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.03) !important;
                    transition: all 250ms ease !important;
                    color: #FFFFFF !important;
                    font-family: 'Poppins', sans-serif !important;
                    white-space: nowrap !important;
                }

                .saas-btn-action:hover {
                    transform: translateY(-3px) !important;
                    filter: brightness(1.06) !important;
                }

                .saas-btn-action:active {
                    transform: translateY(-1px) !important;
                }

                .saas-btn-action.search-btn { background: #0EA5E9 !important; }
                .saas-btn-action.search-btn:hover { background: #0284C7 !important; box-shadow: 0 6px 16px rgba(14, 165, 233, 0.25) !important; }

                .saas-btn-action.filter-btn { background: #7C3AED !important; }
                .saas-btn-action.filter-btn:hover { background: #6D28D9 !important; box-shadow: 0 6px 16px rgba(124, 58, 237, 0.25) !important; }

                .saas-btn-action.reset-btn { background: #F59E0B !important; }
                .saas-btn-action.reset-btn:hover { background: #D97706 !important; box-shadow: 0 6px 16px rgba(245, 158, 11, 0.25) !important; }

                .saas-btn-action.export-btn { background: #059669 !important; }
                .saas-btn-action.export-btn:hover { background: #047857 !important; box-shadow: 0 6px 16px rgba(5, 150, 101, 0.25) !important; }

                .saas-btn-action.add-btn { background: #2563EB !important; }
                .saas-btn-action.add-btn:hover { background: #1D4ED8 !important; box-shadow: 0 6px 16px rgba(37, 99, 235, 0.25) !important; }

                /* Table Redesign */
                .blog-table-container-card {
                    background: #FFFFFF;
                    border-radius: 18px;
                    box-shadow: 0 4px 12px rgba(15, 23, 242, 0.02);
                    border: 1px solid rgba(229, 231, 235, 0.7);
                    overflow: hidden;
                    animation: tableFadeIn 0.4s ease-out;
                    transition: box-shadow 0.3s ease, border-color 0.3s ease, transform 0.3s ease;
                }

                .blog-table-container-card:hover {
                    box-shadow: 0 10px 28px rgba(37, 99, 235, 0.06);
                    border-color: rgba(37, 99, 235, 0.25);
                }

                .admin-shell.dark-theme .blog-table-container-card {
                    background: #111827;
                    border-color: #334155;
                }

                .filter-form-panel {
                    transition: box-shadow 0.3s ease, border-color 0.3s ease;
                }
                .filter-form-panel:hover {
                    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08) !important;
                    border-color: rgba(37, 99, 235, 0.25) !important;
                }

                @keyframes tableFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .blog-table-el {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: left;
                }

                .blog-table-el thead {
                    background: #1E293B;
                    color: #FFFFFF;
                }

                .blog-table-el thead th {
                    padding: 16px 20px;
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    border: none;
                }

                .blog-table-el tbody tr {
                    height: 72px;
                    border-bottom: 1px solid #F1F5F9;
                    transition: background-color 0.2s ease;
                }

                .admin-shell.dark-theme .blog-table-el tbody tr {
                    border-bottom-color: rgba(51, 65, 85, 0.4);
                }

                .blog-table-el tbody tr:nth-child(even) {
                    background-color: #FBFCFD;
                }

                .admin-shell.dark-theme .blog-table-el tbody tr:nth-child(even) {
                    background-color: rgba(30, 41, 59, 0.15);
                }

                .blog-table-el tbody tr:hover {
                    background-color: #F1F5F9 !important;
                }

                .admin-shell.dark-theme .blog-table-el tbody tr:hover {
                    background-color: rgba(30, 41, 59, 0.4) !important;
                }

                .blog-table-el td {
                    padding: 16px 20px;
                    font-size: 0.88rem;
                    color: #374151;
                    vertical-align: middle;
                    font-weight: 500;
                }

                .admin-shell.dark-theme .blog-table-el td {
                    color: #CBD5E1;
                }

                .rounded-img-48 {
                    width: 48px;
                    height: 48px;
                    border-radius: 10px;
                    object-fit: cover;
                    border: 1px solid rgba(0, 0, 0, 0.05);
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
                    cursor: pointer;
                    transition: transform 0.2s;
                }

                .rounded-img-48:hover {
                    transform: scale(1.08);
                }

                .blog-cat-badge-custom {
                    display: inline-flex;
                    align-items: center;
                    padding: 6px 12px;
                    border-radius: 999px;
                    font-size: 0.78rem;
                    font-weight: 600;
                }

                .blog-cat-badge-custom.cat-flight {
                    background-color: #EFF6FF !important;
                    color: #2563EB !important;
                }

                .blog-cat-badge-custom.cat-hotel {
                    background-color: #ECFDF5 !important;
                    color: #10B981 !important;
                }

                .blog-cat-badge-custom.cat-bus {
                    background-color: #FFF7ED !important;
                    color: #EA580C !important;
                }

                .blog-cat-badge-custom.cat-travel {
                    background-color: #F3E8FF !important;
                    color: #8B5CF6 !important;
                }

                .blog-cat-badge-custom.cat-default {
                    background-color: #F1F5F9 !important;
                    color: #475569 !important;
                }

                .blog-subcat-badge-custom {
                    display: inline-flex;
                    align-items: center;
                    padding: 6px 12px;
                    border-radius: 999px;
                    font-size: 0.78rem;
                    font-weight: 600;
                    background-color: #F8FAFC !important;
                    color: #64748B !important;
                    border: 1px solid rgba(226, 232, 240, 0.8);
                }


                /* Status Badges */
                .blog-status-custom-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 8px 18px;
                    border-radius: 999px;
                    font-size: 0.78rem;
                    font-weight: 700;
                    border: none;
                    cursor: pointer;
                    transition: opacity 0.2s ease;
                }

                .blog-status-custom-badge:hover {
                    opacity: 0.85;
                }

                .blog-status-custom-badge.active {
                    background: rgba(16, 185, 129, 0.1) !important;
                    color: #10B981 !important;
                    border: 1px solid rgba(16, 185, 129, 0.2) !important;
                }

                .blog-status-custom-badge.inactive {
                    background: rgba(239, 68, 68, 0.1) !important;
                    color: #EF4444 !important;
                    border: 1px solid rgba(239, 68, 68, 0.2) !important;
                }

                /* Actions Circles */
                .blog-actions-list {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .blog-action-circle-btn {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    cursor: pointer;
                    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
                }

                .blog-action-circle-btn:hover {
                    transform: scale(1.1);
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
                }

                .blog-action-circle-btn.view { background: #EFF6FF !important; color: #2563EB !important; }
                .blog-action-circle-btn.edit { background: #FFF7ED !important; color: #D97706 !important; }
                .blog-action-circle-btn.delete { background: #FEF2F2 !important; color: #DC2626 !important; }
            `}</style>

            {/* Toast Alerts */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    top: '24px',
                    right: '24px',
                    padding: '12px 18px',
                    borderRadius: '12px',
                    background: toast.tone === 'success' ? '#DEF7EC' : toast.tone === 'error' ? '#FDE8E8' : '#EBF5FF',
                    color: toast.tone === 'success' ? '#03543F' : toast.tone === 'error' ? '#9B1C1C' : '#1E429F',
                    zIndex: 9999,
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontWeight: 600,
                    animation: 'pageFadeIn 0.3s ease-out'
                }}>
                    {toast.tone === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Page Header */}
            {/* Page Header */}
            <div className="blog-header-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                <div>
                    <h1 className="blog-header-title-text">
                        Blog Management
                    </h1>
                    <p className="blog-header-desc" style={{ marginTop: '4px' }}>
                        Manage travel blogs, articles, promotions and destination content.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button className="saas-btn-action filter-btn" onClick={() => setShowFilterForm(!showFilterForm)}>
                        <Filter size={16} />
                        Filter
                    </button>
                    <button className="saas-btn-action export-btn" onClick={handleExport}>
                        <Download size={16} />
                        Export
                    </button>
                </div>
            </div>

            {/* Statistics Section — All dynamic from blogs data */}
            <div className="blog-stats-container">
                <div className="blog-card-stat">
                    <div className="stat-details">
                        <h3>Total Blogs</h3>
                        <div className="value-row">
                            <h4>{totalBlogs}</h4>
                        </div>
                    </div>
                    <div className="stat-icon-wrapper blue">
                        <FileText size={20} />
                    </div>
                </div>

                <div className="blog-card-stat">
                    <div className="stat-details">
                        <h3>Published</h3>
                        <div className="value-row">
                            <h4>{blogs.filter(b => b.status === 'Active').length}</h4>
                        </div>
                    </div>
                    <div className="stat-icon-wrapper green">
                        <Eye size={20} />
                    </div>
                </div>

                <div className="blog-card-stat">
                    <div className="stat-details">
                        <h3>Inactive</h3>
                        <div className="value-row">
                            <h4>{blogs.filter(b => b.status === 'Inactive').length}</h4>
                        </div>
                    </div>
                    <div className="stat-icon-wrapper orange">
                        <Edit2 size={20} />
                    </div>
                </div>

                <div className="blog-card-stat">
                    <div className="stat-details">
                        <h3>Total Views</h3>
                        <div className="value-row">
                            <h4>{blogs.reduce((sum, b) => sum + (b.views || 0), 0)}</h4>
                        </div>
                    </div>
                    <div className="stat-icon-wrapper gray">
                        <Eye size={20} />
                    </div>
                </div>
            </div>

            {/* Expanded Filter Panel (Image-2 Layout) */}
            {showFilterForm && (
                <div className="filter-form-panel" style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    boxShadow: '0 4px 18px rgba(15, 23, 42, 0.04)',
                    border: '1px solid #E5E7EB',
                    marginBottom: '24px',
                    animation: 'pageFadeIn 0.25s ease-out'
                }}>
                    <style>{`
                        .admin-shell.dark-theme .filter-form-panel {
                            background: #1E293B !important;
                            border-color: #334155 !important;
                        }
                        .filter-grid-fields {
                            display: flex !important;
                            align-items: center !important;
                            justify-content: space-between !important;
                            gap: 16px !important;
                            flex-wrap: wrap !important;
                            width: 100% !important;
                            margin-bottom: 20px;
                        }
                        .filter-field-group {
                            display: flex;
                            flex-direction: column;
                            gap: 6px;
                        }
                        .filter-field-group.category { flex: 1 1 150px !important; }
                        .filter-field-group.status { flex: 1 1 130px !important; }
                        .filter-field-group.author { flex: 1 1 150px !important; }
                        .filter-field-group.date { flex: 2 1 290px !important; }
                        .filter-field-group.sort { flex: 1 1 150px !important; }
                        .filter-field-group label {
                            font-size: 0.82rem;
                            font-weight: 600;
                            color: #475569;
                        }
                        .admin-shell.dark-theme .filter-field-group label {
                            color: #94A3B8;
                        }
                        .filter-field-input {
                            height: 42px;
                            padding: 0 12px;
                            border-radius: 8px;
                            border: 1px solid #E5E7EB;
                            background: #FFFFFF;
                            font-size: 0.88rem;
                            outline: none;
                            color: #1E293B;
                            font-weight: 500;
                            transition: border-color 0.2s;
                            box-sizing: border-box;
                            width: 100% !important;
                        }
                        .admin-shell.dark-theme .filter-field-input {
                            background: #111827;
                            border-color: #334155;
                            color: #F1F5F9;
                        }
                        .filter-field-input:focus {
                            border-color: #2563EB;
                        }
                    `}</style>
                    <div className="filter-grid-fields">
                        <div className="filter-field-group category">
                            <label>Category</label>
                            <select
                                className="filter-field-input"
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                <option value="All">All Categories</option>
                                {categories.map((c, idx) => (
                                    <option key={idx} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-field-group status">
                            <label>Status</label>
                            <select
                                className="filter-field-input"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="All">All Status</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                        <div className="filter-field-group author">
                            <label>Author</label>
                            <select
                                className="filter-field-input"
                                value={authorFilter}
                                onChange={(e) => setAuthorFilter(e.target.value)}
                            >
                                <option value="All">All Authors</option>
                                {uniqueAuthors.map((author, idx) => (
                                    <option key={idx} value={author}>{author}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-field-group date">
                            <label>Publish Date</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                <input
                                    type="date"
                                    className="filter-field-input"
                                    style={{ flex: 1 }}
                                    value="2024-05-01"
                                    onChange={(e) => setDateFilter(e.target.value)}
                                />
                                <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>to</span>
                                <input
                                    type="date"
                                    className="filter-field-input"
                                    style={{ flex: 1 }}
                                    value="2024-05-31"
                                    onChange={(e) => setDateFilter(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="filter-field-group sort">
                            <label>Sort By</label>
                            <select
                                className="filter-field-input"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="Latest First">Latest First</option>
                                <option value="Oldest First">Oldest First</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                        <button
                            className="saas-btn-action reset-btn"
                            style={{
                                background: '#FFFFFF',
                                border: '1px solid #E5E7EB',
                                color: '#475569',
                                height: '40px'
                            }}
                            onClick={handleClearFilters}
                        >
                            <RotateCcw size={16} />
                            Reset
                        </button>
                        <button
                            className="saas-btn-action add-btn"
                            style={{
                                background: '#2563EB',
                                color: '#FFFFFF',
                                height: '40px'
                            }}
                            onClick={fetchBlogs}
                        >
                            <Filter size={16} />
                            Apply Filters
                        </button>
                    </div>
                </div>
            )}

            {error ? (
                <div className="blog-error-container" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '80px 24px',
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1px solid #FEE2E2',
                    boxShadow: '0 4px 18px rgba(220, 38, 38, 0.05)',
                    textAlign: 'center',
                    marginTop: '24px'
                }}>
                    <style>{`
                        .admin-shell.dark-theme .blog-error-container {
                            background: #1E293B !important;
                            border-color: #334155 !important;
                        }
                    `}</style>
                    <AlertCircle size={64} style={{ color: '#EF4444', marginBottom: '20px' }} />
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1E293B', margin: '0 0 8px 0' }}>Failed to Load Data</h2>
                    <p style={{ color: '#64748B', fontSize: '1rem', maxWidth: '480px', margin: '0 0 24px 0', lineHeight: 1.6 }}>
                        {error}
                    </p>
                    <button
                        onClick={fetchBlogs}
                        style={{
                            background: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '12px 28px',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <RotateCcw size={16} />
                        Retry Connection
                    </button>
                </div>
            ) : (
                <>
                    {/* Table Action Row */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                        gap: '12px'
                    }}>
                        <div style={{ position: 'relative', width: '280px' }}>
                            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', zIndex: 5 }} size={18} />
                            <input
                                type="text"
                                className="toolbar-search-input-field"
                                style={{ width: '100%', paddingLeft: '40px', height: '42px', borderRadius: '10px', border: '1px solid #E5E7EB', outline: 'none' }}
                                placeholder="Search Blog..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button
                            className="saas-btn-action add-btn"
                            style={{ background: '#2563EB', height: '42px' }}
                            onClick={handleAddBlog}
                        >
                            <Plus size={16} />
                            Add Blog
                        </button>
                    </div>

                    {/* Table Card */}
                    <div className="blog-table-container-card">
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
                                <p style={{ margin: 0, fontWeight: 600 }}>Loading blogs...</p>
                            </div>
                        ) : filteredBlogs.length > 0 ? (
                            <>
                                <table className="blog-table-el">
                                    <thead>
                                        <tr>
                                            <th>Image</th>
                                            <th>Title</th>
                                            <th>Category</th>
                                            <th>Sub Category</th>
                                            <th>Author</th>
                                            <th>Date</th>
                                            <th>Views</th>
                                            <th>Status</th>
                                            <th className="action-col" style={{ textAlign: 'center' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredBlogs.map((blog) => {
                                            const blogImg = blog.imageUrl || blog.image || blog.coverImage || blog.bannerImage || blog.picture;
                                            return (
                                                <tr key={blog.id}>
                                                    <td>
                                                        {blogImg && blogImg !== '-' ? (
                                                            <NgrokSafeImage
                                                                src={toApiAssetUrl(blogImg)}
                                                                alt={blog.title}
                                                                className="rounded-img-48"
                                                                onClick={() => setActivePopupImage(toApiAssetUrl(blogImg))}
                                                            />
                                                        ) : (
                                                            <span style={{ color: '#94A3B8' }}>-</span>
                                                        )}
                                                    </td>
                                                    <td style={{ fontWeight: 600, maxWidth: '280px' }}>{blog.title}</td>
                                                    <td>
                                                        <span className={`blog-cat-badge-custom cat-${(blog.category || 'default').toLowerCase()}`}>
                                                            {blog.category || '-'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="blog-subcat-badge-custom">
                                                            {blog.subCategory || '-'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <User size={16} style={{ color: '#6B7280' }} />
                                                            <span>{blog.author}</span>
                                                        </div>
                                                    </td>
                                                    <td>{blog.entryDate}</td>
                                                    <td>{blog.views.toLocaleString()}</td>
                                                    <td>
                                                        <button
                                                            className={`blog-status-custom-badge ${blog.status.toLowerCase()}`}
                                                            onClick={() => handleToggleStatus(blog.id)}
                                                        >
                                                            {blog.status}
                                                        </button>
                                                    </td>
                                                    <td className="action-col" style={{ verticalAlign: 'middle' }}>
                                                        <div className="admin-actions-cell-row">
                                                            <button className="admin-action-btn view" title="View Details" onClick={() => setModalState({ isOpen: true, mode: 'view', data: blog })}>
                                                                <Eye size={18} />
                                                            </button>
                                                            <button className="admin-action-btn edit" title="Edit Blog" onClick={() => setModalState({ isOpen: true, mode: 'edit', data: blog })}>
                                                                <Edit2 size={18} />
                                                            </button>
                                                            <button className="admin-action-btn delete" title="Delete Blog" onClick={() => setModalState({ isOpen: true, mode: 'delete', data: blog })}>
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                <AdminPagination
                                    currentPage={page}
                                    totalItems={totalBlogs}
                                    itemsPerPage={pageSize}
                                    onPageChange={setPage}
                                    onItemsPerPageChange={setPageSize}
                                    itemName="blogs"
                                />
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
                                <FileText size={48} style={{ opacity: 0.4, marginBottom: '12px' }} />
                                <h4 style={{ margin: '0 0 6px 0', fontWeight: 700 }}>No blogs found</h4>
                                <p style={{ margin: 0, fontSize: '0.88rem' }}>
                                    {searchQuery ? `No blogs match "${searchQuery}"` : 'Start by adding your first blog post'}
                                </p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Reusable Dynamic Modal System */}
            <AdminDynamicModal
                isOpen={modalState.isOpen}
                mode={modalState.mode}
                moduleName="Blog"
                data={modalState.data}
                schema={blogSchema}
                onClose={() => setModalState({ isOpen: false, mode: null, data: null })}
                onSave={handleSaveBlog}
                onDelete={handleDeleteBlogConfirm}
            />

            {/* Popup Image View */}
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
        </div>
    );
}

export default BlogList;
