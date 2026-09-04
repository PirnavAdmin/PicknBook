/* eslint-disable */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
    ChevronDown,
} from 'lucide-react';
import AdminPagination from '../../../components/AdminPagination';
import { getAdminBlogs, deleteAdminBlog, updateAdminBlog, getBlogCategories, getBlogSubCategories } from '../../../services/blogService';
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
    const [activeDropdownId, setActiveDropdownId] = useState(null);
    const [deleteBlog, setDeleteBlog] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingBlog, setEditingBlog] = useState(null);
    const [editFormData, setEditFormData] = useState({
        title: '',
        slug: '',
        category: '',
        subCategory: '',
        addedBy: '',
        subTitle: '',
        featured: 'No',
        isPublished: 'Yes',
        metaTitle: '',
        metaKeyword: '',
        metaDescription: '',
        shortDescription: '',
        longDescription: '',
        image: null,
        ogImage: null,
        imageName: '',
        ogImageName: '',
    });
    const [editImagePreview, setEditImagePreview] = useState('');
    const [editOgImagePreview, setEditOgImagePreview] = useState('');
    const [editIsSubmitting, setEditIsSubmitting] = useState(false);

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
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize, statusFilter]);

    // Close actions dropdown on clicking outside
    useEffect(() => {
        const handleGlobalClick = () => setActiveDropdownId(null);
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

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
            formData.append("Id", id);
            formData.append("Title", blogToToggle.title);
            formData.append("Category", blogToToggle.category);
            formData.append("SubCategory", blogToToggle.subCategory);
            formData.append("ShortDescription", blogToToggle.shortDescription || "No short description");
            formData.append("LongDescription", blogToToggle.longDescription || "No long description");
            formData.append("Slug", blogToToggle.slug || "");
            formData.append("IsPublished", blogToToggle.status !== 'Active'); // Toggle publication state
            formData.append("IsFeatured", blogToToggle.isFeatured || false);

            if (blogToToggle.subTitle) {
                formData.append("SubTitle", blogToToggle.subTitle);
            }
            if (blogToToggle.metaTitle) {
                formData.append("MetaTitle", blogToToggle.metaTitle);
            }
            if (blogToToggle.metaKeyword) {
                formData.append("MetaKeyword", blogToToggle.metaKeyword);
            }
            if (blogToToggle.metaDescription) {
                formData.append("MetaDescription", blogToToggle.metaDescription);
            }

            await updateAdminBlog(id, formData);
            fetchBlogs();
        } catch (error) {
            console.error("Error toggling blog status:", error);
            const serverMsg = error.response?.data?.message || error.response?.data?.title || (typeof error.response?.data === 'string' ? error.response.data : '') || error.message || "";
            showToast(`Failed to toggle status. ${serverMsg}`.trim(), "error");
        }
    };

    const handleEditBlog = (blog) => {
        setEditingBlog(blog);
        setEditFormData({
            title: blog.title || '',
            slug: blog.slug || '',
            category: blog.category || '',
            subCategory: blog.subCategory || '',
            addedBy: blog.addedByName || blog.author || blog.addedBy || '',
            subTitle: blog.subTitle || '',
            featured: blog.isFeatured ? 'Yes' : 'No',
            isPublished: blog.isPublished ? 'Yes' : 'No',
            metaTitle: blog.metaTitle || '',
            metaKeyword: blog.metaKeyword || '',
            metaDescription: blog.metaDescription || '',
            shortDescription: blog.shortDescription || '',
            longDescription: blog.longDescription || '',
            image: null,
            ogImage: null,
            imageName: blog.imageUrl || blog.image || '',
            ogImageName: blog.ogImageUrl || blog.ogImage || '',
        });
        setEditImagePreview(blog.imageUrl || blog.image || '');
        setEditOgImagePreview(blog.ogImageUrl || blog.ogImage || '');
        setEditModalOpen(true);
        setActiveDropdownId(null);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleEditFileChange = (name, labelField) => (e) => {
        const file = e.target.files?.[0] || null;
        if (file && file.size > 1024 * 1024) {
            showToast("File size must be within 1MB limit.", "error");
            e.target.value = "";
            return;
        }
        setEditFormData(prev => ({
            ...prev,
            [name]: file,
            [labelField]: file ? file.name : prev[labelField]
        }));
        
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            if (name === 'image') {
                setEditImagePreview(previewUrl);
            } else if (name === 'ogImage') {
                setEditOgImagePreview(previewUrl);
            }
        }
    };

    const buildSlug = (title) =>
        title
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

    const handleEditGenerateSlug = () => {
        const slug = buildSlug(editFormData.title);
        setEditFormData(prev => ({ ...prev, slug }));
        showToast('Slug generated.', 'info');
    };

    const handleSaveEditBlog = async (e) => {
        e.preventDefault();
        if (!editFormData.title.trim()) {
            showToast('Title is required.', 'error');
            return;
        }
        if (!editFormData.category) {
            showToast('Category is required.', 'error');
            return;
        }
        if (!editFormData.subCategory) {
            showToast('Sub category is required.', 'error');
            return;
        }
        if (!editFormData.shortDescription.trim()) {
            showToast('Short description is required.', 'error');
            return;
        }
        if (!editFormData.longDescription.trim()) {
            showToast('Long description is required.', 'error');
            return;
        }

        setEditIsSubmitting(true);

        try {
            const dataToSend = new FormData();
            dataToSend.append("Id", editingBlog.id);
            dataToSend.append("Title", editFormData.title.trim());
            dataToSend.append("Category", editFormData.category);
            dataToSend.append("SubCategory", editFormData.subCategory);
            dataToSend.append("ShortDescription", editFormData.shortDescription.trim());
            dataToSend.append("LongDescription", editFormData.longDescription.trim());
            
            if (editFormData.slug?.trim()) {
                dataToSend.append("Slug", editFormData.slug.trim());
            } else {
                dataToSend.append("Slug", buildSlug(editFormData.title));
            }

            if (editFormData.subTitle?.trim()) {
                dataToSend.append("SubTitle", editFormData.subTitle.trim());
            }
            dataToSend.append("IsFeatured", editFormData.featured === 'Yes');
            dataToSend.append("IsPublished", editFormData.isPublished === 'Yes');

            if (editFormData.metaTitle?.trim()) {
                dataToSend.append("MetaTitle", editFormData.metaTitle.trim());
            }
            if (editFormData.metaKeyword?.trim()) {
                dataToSend.append("MetaKeyword", editFormData.metaKeyword.trim());
            }
            if (editFormData.metaDescription?.trim()) {
                dataToSend.append("MetaDescription", editFormData.metaDescription.trim());
            }

            if (editFormData.image) {
                dataToSend.append("Image", editFormData.image);
            }
            if (editFormData.ogImage) {
                dataToSend.append("OgImage", editFormData.ogImage);
            }

            await updateAdminBlog(editingBlog.id, dataToSend);
            setEditModalOpen(false);
            setEditingBlog(null);
            fetchBlogs();
        } catch (error) {
            console.error("Error saving blog:", error);
            const serverMsg = error.response?.data?.message || error.response?.data?.title || (typeof error.response?.data === 'string' ? error.response.data : '') || error.message || "";
            showToast(`Failed to save blog post. ${serverMsg}`.trim(), "error");
        } finally {
            setEditIsSubmitting(false);
        }
    };

    const handleDeleteBlog = async () => {
        if (!deleteBlog) return;
        try {
            await deleteAdminBlog(deleteBlog.id);
            setDeleteBlog(null);
            showToast('Blog deleted.', 'info');
            fetchBlogs();
        } catch (error) {
            console.error("Error deleting blog:", error);
            showToast("Failed to delete blog.", "error");
        }
    };

    const handleViewDetails = (blog) => {
        setSelectedBlog(blog);
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
            flexWrap: 'nowrap',
        },
        titleWrapper: {
            display: 'flex',
            alignItems: 'baseline',
            gap: '12px',
            paddingTop: '16px',
            paddingBottom: '16px',
        },
        titleMain: {
            fontSize: '1.8rem',
            fontWeight: 500,
            color: '#be185d',
            margin: 0,
            letterSpacing: '-0.5px',
        },
        titleSub: {
            fontSize: '1.8rem',
            fontWeight: 500,
            color: 'black',
            margin: 0,
        },
        actions: {
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'nowrap',
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
            boxShadow: '0 4px 14px rgba(165, 28, 73, 0.25)',
        },
        exportBtn: {
            background: '#16a34a',
            color: '#ffffff',
            borderColor: '#16a34a',
            boxShadow: '0 4px 14px rgba(22, 163, 74, 0.25)',
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
            borderBottom: '2px solid var(--border)',
        },
        th: {
            padding: '12px 10px',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            fontSize: '11px',
            textTransform: 'none',
            letterSpacing: '0.6px',
            fontWeight: 500,
            verticalAlign: 'middle',
            height: '42px',
        },
        td: {
            padding: '6px 8px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            color: 'var(--text-primary)',
            verticalAlign: 'middle',
            textAlign: 'center',
            height: '36px',
        },
        tbody: {
            fontSize: '12px',
        },
        tr: {
            transition: 'background-color 0.2s ease',
            borderBottom: '1px solid var(--border)',
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
        blogTitle: {
            maxWidth: '300px',
            fontWeight: 400,
            color: 'var(--text-primary)',
            lineHeight: '1.5',
            fontSize: '12px',
        },
        viewBtn: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px 8px',
            borderRadius: '6px',
            fontWeight: 500,
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            border: '1px solid var(--border)',
            background: 'var(--surface-soft)',
            color: 'var(--text-primary)',
            gap: '0',
            minHeight: '26px',
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
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
            gap: '0',
            minHeight: '26px',
            whiteSpace: 'nowrap',
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
            padding: '20px 20px',
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
                            onClick={() => navigate('/admin/blog-management/blog-category-list')}
                        >
                            <Tag size={18} />
                            Category
                        </button>
                        <button
                            type="button"
                            style={{ ...styles.button, ...styles.addBtn }}
                            onMouseEnter={(e) => {
                                e.target.style.background = '#851237';
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 8px 24px rgba(165, 28, 73, 0.35)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = '#A51C49';
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 4px 14px rgba(165, 28, 73, 0.25)';
                            }}
                            onClick={handleAddBlog}
                        >
                            <Plus size={20} strokeWidth={3} />
                            Add Blog
                        </button>
                        <button
                            type="button"
                            style={{ ...styles.button, ...styles.exportBtn }}
                            onMouseEnter={(e) => {
                                e.target.style.background = '#15803d';
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 6px 20px rgba(22, 163, 74, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = '#16a34a';
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 4px 14px rgba(22, 163, 74, 0.25)';
                            }}
                            onClick={handleExport}
                        >
                            <Download size={18} />
                            Export
                        </button>
                    </div>
                </div>

                {selectedBlog && createPortal(
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
                    }} onClick={() => setSelectedBlog(null)}>
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '12px',
                            padding: '24px',
                            width: '100%',
                            maxWidth: '680px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                            margin: 0
                        }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid #e2e8f0" }}>
                                <h2 style={{ color: "#000000", fontSize: "1.3rem", margin: 0, fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <FileText size={20} style={{ color: "#A51C49" }} />
                                    <span style={{ color: "#A51C49" }}>Blog</span> Details
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => setSelectedBlog(null)}
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

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                <div>
                                    <strong style={{ color: 'var(--text-secondary)' }}>Title:</strong>
                                    <div style={{ fontWeight: 600 }}>{selectedBlog.title}</div>
                                </div>
                                <div>
                                    <strong style={{ color: 'var(--text-secondary)' }}>Category:</strong>
                                    <div style={{ fontWeight: 600 }}>{selectedBlog.category}</div>
                                </div>
                                <div>
                                    <strong style={{ color: 'var(--text-secondary)' }}>Sub Category:</strong>
                                    <div style={{ fontWeight: 600 }}>{selectedBlog.subCategory}</div>
                                </div>
                                <div>
                                    <strong style={{ color: 'var(--text-secondary)' }}>Entry Date:</strong>
                                    <div style={{ fontWeight: 600 }}>{selectedBlog.entryDate}</div>
                                </div>
                                <div>
                                    <strong style={{ color: 'var(--text-secondary)' }}>Author:</strong>
                                    <div style={{ fontWeight: 600 }}>{selectedBlog.author}</div>
                                </div>
                                <div>
                                    <strong style={{ color: 'var(--text-secondary)' }}>Status:</strong>
                                    <div>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: selectedBlog.status === 'Active' ? '#ecfdf5' : '#fef2f2', color: selectedBlog.status === 'Active' ? '#047857' : '#b91c1c', border: selectedBlog.status === 'Active' ? '1px solid #10b981' : '1px solid #ef4444', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 500 }}>
                                            {selectedBlog.status}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                        <thead style={styles.thead}>
                            <tr>
                                <th style={styles.th}>S.No</th>
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
                            {loading ? (
                                <tr>
                                    <td colSpan="8" style={{ ...styles.td, textAlign: 'center', padding: '40px' }}>
                                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-secondary)' }}>Loading blogs...</p>
                                    </td>
                                </tr>
                            ) : filteredBlogs.length > 0 ? (
                                filteredBlogs.map((blog, index) => (
                                    <tr key={blog.id} style={styles.tr}>
                                        <td style={styles.td}>
                                            <span style={styles.sn}>{((page - 1) * pageSize) + index + 1}</span>
                                        </td>
                                        <td style={{ ...styles.td, ...styles.blogTitle, textAlign: 'center' }}>
                                            {blog.title}
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', fontWeight: 500, color: '#334155' }}>
                                                <span style={{ fontSize: '15px', lineHeight: 1 }}>🗓️</span>
                                                <span>{formatDate(blog.createdAtUtc || blog.createdAt || blog.entryDate)}</span>
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            {blog.image && blog.image !== '-' ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                    <NgrokSafeImage
                                                        src={toApiAssetUrl(blog.image)}
                                                        alt={blog.title}
                                                        title={blog.title}
                                                        style={{
                                                            width: '45px',
                                                            height: '45px',
                                                            objectFit: 'cover',
                                                            borderRadius: '6px',
                                                            display: 'block',
                                                            cursor: 'pointer',
                                                            border: '1.5px solid rgba(0, 0, 0, 0.08)'
                                                        }}
                                                        onClick={() => setActivePopupImage(toApiAssetUrl(blog.image))}
                                                    />
                                                    <span style={{ display: 'none', color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '4px' }}>Invalid Image</span>
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>-</span>
                                            )}
                                        </td>
                                        <td style={styles.td}>
                                            {(() => {
                                                const catObj = categories.find(c => c.name === blog.category);
                                                const catImg = catObj?.imageUrl || catObj?.image;
                                                return (
                                                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px', justifyContent: 'center', padding: '4px 0' }}>
                                                        {catImg && catImg !== '-' && (
                                                            <NgrokSafeImage
                                                                src={`${toApiAssetUrl(catImg)}?t=${catObj?.updatedAtUtc || catObj?.updatedAt || ''}`}
                                                                alt={blog.category}
                                                                title={blog.category}
                                                                style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer' }}
                                                                onClick={() => setActivePopupImage(`${toApiAssetUrl(catImg)}?t=${catObj?.updatedAtUtc || catObj?.updatedAt || ''}`)}
                                                            />
                                                        )}
                                                        <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>
                                                            {blog.category && blog.category !== '-' ? blog.category : '-'}
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td style={styles.td}>
                                            {(() => {
                                                const subObj = subCategories.find(s => s.name === blog.subCategory);
                                                const subImg = subObj?.imageUrl || subObj?.image;
                                                return (
                                                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px', justifyContent: 'center', padding: '4px 0' }}>
                                                        {subImg && subImg !== '-' && (
                                                            <NgrokSafeImage
                                                                src={`${toApiAssetUrl(subImg)}?t=${subObj?.updatedAtUtc || subObj?.updatedAt || ''}`}
                                                                alt={blog.subCategory}
                                                                title={blog.subCategory}
                                                                style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer' }}
                                                                onClick={() => setActivePopupImage(`${toApiAssetUrl(subImg)}?t=${subObj?.updatedAtUtc || subObj?.updatedAt || ''}`)}
                                                            />
                                                        )}
                                                        <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>
                                                            {blog.subCategory && blog.subCategory !== '-' ? blog.subCategory : '-'}
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td style={styles.td}>
                                            <button
                                                type="button"
                                                style={getStatusStyle(blog.status)}
                                                onClick={() => handleToggleStatus(blog.id)}
                                            >
                                                {blog.status}
                                            </button>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={{ position: 'relative', display: 'inline-block', verticalAlign: 'middle' }}>
                                                <button
                                                    type="button"
                                                    className={`actions-trigger-btn ${activeDropdownId === blog.id ? 'active' : ''}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveDropdownId(activeDropdownId === blog.id ? null : blog.id);
                                                    }}
                                                >
                                                    <span>Actions</span>
                                                    <ChevronDown size={14} />
                                                </button>
                                                {activeDropdownId === blog.id && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        ...(index >= currentBlogs.length - 2 || currentBlogs.length <= 3
                                                            ? { bottom: '100%', marginBottom: '6px' }
                                                            : { top: '100%', marginTop: '6px' }),
                                                        right: 0,
                                                        background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0',
                                                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', zIndex: 99999,
                                                        minWidth: '160px', overflow: 'hidden'
                                                    }}>
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleViewDetails(blog); setActiveDropdownId(null); }}
                                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#334155', transition: 'background 0.15s ease' }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background='#f1f5f9'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background='none'}
                                                        >
                                                            <Eye size={14} /> <span>View Details</span>
                                                        </button>
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleEditBlog(blog); }}
                                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#334155', transition: 'background 0.15s ease' }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background='#f1f5f9'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background='none'}
                                                        >
                                                            <Edit2 size={14} /> <span>Edit Blog</span>
                                                        </button>
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteBlog(blog); setActiveDropdownId(null); }}
                                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#ef4444', transition: 'background 0.15s ease' }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background='#fef2f2'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background='none'}
                                                        >
                                                            <Trash2 size={14} /> <span>Delete Blog</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" style={{ ...styles.td, textAlign: 'center', padding: '20px' }}>
                                        <div style={styles.emptyState}>
                                            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                No blogs found
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
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
                </div>
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

            {/* Edit Blog Popup Modal */}
            {editModalOpen && createPortal(
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000,
                    padding: '20px'
                }} onClick={() => setEditModalOpen(false)}>
                    <div style={{
                        background: '#ffffff', borderRadius: '12px', padding: '24px',
                        width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.15)', margin: 0
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid #e2e8f0" }}>
                            <h2 style={{ color: "#000000", fontSize: "1.3rem", margin: 0, fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                                <FileText size={20} style={{ color: "#A51C49" }} />
                                <span style={{ color: "#A51C49" }}>Edit</span> Blog Post
                            </h2>
                        </div>
                        <form onSubmit={handleSaveEditBlog}>
                            <div style={{
                                background: '#A51C49', color: '#ffffff', padding: '8px 15px',
                                fontWeight: 700, borderRadius: '8px', marginTop: '16px',
                                marginBottom: '16px', display: 'block', width: '100%', boxSizing: 'border-box'
                            }}>
                                Basic Information
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        Title <span style={{ color: 'var(--danger)' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={editFormData.title}
                                        onChange={handleEditChange}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--panel)', color: 'var(--text-primary)' }}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Slug</label>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            name="slug"
                                            value={editFormData.slug}
                                            onChange={handleEditChange}
                                            style={{ flex: 1, boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--panel)', color: 'var(--text-primary)' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleEditGenerateSlug}
                                            style={{ padding: '8px 14px', background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                        >
                                            Generate
                                        </button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        Category <span style={{ color: 'var(--danger)' }}>*</span>
                                    </label>
                                    <select
                                        name="category"
                                        value={editFormData.category}
                                        onChange={(e) => {
                                            handleEditChange(e);
                                            setEditFormData(prev => ({ ...prev, subCategory: '' }));
                                        }}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--panel)', color: 'var(--text-primary)', cursor: 'pointer' }}
                                        required
                                    >
                                        <option value="">Select Category</option>
                                        {categories
                                            .filter(cat => cat.status === 'Active' || cat.name === editFormData.category)
                                            .map(cat => (
                                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        Sub Category <span style={{ color: 'var(--danger)' }}>*</span>
                                    </label>
                                    <select
                                        name="subCategory"
                                        value={editFormData.subCategory}
                                        onChange={handleEditChange}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--panel)', color: 'var(--text-primary)', cursor: 'pointer' }}
                                        required
                                    >
                                        <option value="">Select Subcategory</option>
                                        {subCategories
                                            .filter(sub => (sub.status === 'Active' || sub.name === editFormData.subCategory) && (!editFormData.category || sub.category === editFormData.category))
                                            .map(sub => (
                                                <option key={sub.id} value={sub.name}>{sub.name}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Sub Title</label>
                                    <input
                                        type="text"
                                        name="subTitle"
                                        value={editFormData.subTitle}
                                        onChange={handleEditChange}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--panel)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Added By</label>
                                    <input
                                        type="text"
                                        name="addedBy"
                                        value={editFormData.addedBy}
                                        onChange={handleEditChange}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--panel)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Is Featured</label>
                                    <select
                                        name="featured"
                                        value={editFormData.featured}
                                        onChange={handleEditChange}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--panel)', color: 'var(--text-primary)', cursor: 'pointer' }}
                                    >
                                        <option value="No">No</option>
                                        <option value="Yes">Yes</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Status (Is Published)</label>
                                    <select
                                        name="isPublished"
                                        value={editFormData.isPublished}
                                        onChange={handleEditChange}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--panel)', color: 'var(--text-primary)', cursor: 'pointer' }}
                                    >
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Image [max_size: 1MB]</label>
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {editImagePreview && (
                                            <NgrokSafeImage 
                                                src={editImagePreview.startsWith('blob:') ? editImagePreview : toApiAssetUrl(editImagePreview)} 
                                                alt="Blog Image" 
                                                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }}
                                            />
                                        )}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label 
                                                htmlFor="edit-blog-image"
                                                style={{ padding: '8px 14px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', display: 'inline-block', width: 'fit-content' }}
                                            >
                                                Choose File
                                            </label>
                                            <input
                                                id="edit-blog-image"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleEditFileChange('image', 'imageName')}
                                                style={{ display: 'none' }}
                                            />
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                                                {editFormData.image?.name || editFormData.imageName || 'No file chosen'}
                                            </span>
                                        </div>
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

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Meta Title</label>
                                    <input
                                        type="text"
                                        name="metaTitle"
                                        value={editFormData.metaTitle}
                                        onChange={handleEditChange}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--panel)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Meta Keyword</label>
                                    <input
                                        type="text"
                                        name="metaKeyword"
                                        value={editFormData.metaKeyword}
                                        onChange={handleEditChange}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--panel)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Og Image [max_size: 1MB]</label>
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {editOgImagePreview && (
                                            <NgrokSafeImage 
                                                src={editOgImagePreview.startsWith('blob:') ? editOgImagePreview : toApiAssetUrl(editOgImagePreview)} 
                                                alt="Og Image" 
                                                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }}
                                            />
                                        )}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label style={{ padding: '8px 14px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', display: 'inline-block', width: 'fit-content' }}>
                                                Choose File
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleEditFileChange('ogImage', 'ogImageName')}
                                                    style={{ display: 'none' }}
                                                />
                                            </label>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                                                {editFormData.ogImage?.name || editFormData.ogImageName || 'No file chosen'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Meta Description</label>
                                    <textarea
                                        name="metaDescription"
                                        value={editFormData.metaDescription}
                                        onChange={handleEditChange}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--panel)', color: 'var(--text-primary)', minHeight: '65px', resize: 'vertical' }}
                                    />
                                </div>
                            </div>

                            <div style={{
                                background: '#A51C49', color: '#ffffff', padding: '8px 15px',
                                fontWeight: 700, borderRadius: '8px', marginTop: '24px',
                                marginBottom: '16px', display: 'block', width: '100%', boxSizing: 'border-box'
                            }}>
                                Description Details
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        Short Description <span style={{ color: 'var(--danger)' }}>*</span>
                                    </label>
                                    <textarea
                                        name="shortDescription"
                                        value={editFormData.shortDescription}
                                        onChange={handleEditChange}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--panel)', color: 'var(--text-primary)', minHeight: '80px', resize: 'vertical' }}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        Long Description <span style={{ color: 'var(--danger)' }}>*</span>
                                    </label>
                                    <textarea
                                        name="longDescription"
                                        value={editFormData.longDescription}
                                        onChange={handleEditChange}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--panel)', color: 'var(--text-primary)', minHeight: '140px', resize: 'vertical' }}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                                <button
                                    type="button"
                                    onClick={() => setEditModalOpen(false)}
                                    style={{ padding: '8px 24px', background: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editIsSubmitting}
                                    style={{ padding: '8px 28px', background: '#A51C49', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', opacity: editIsSubmitting ? 0.6 : 1 }}
                                >
                                    {editIsSubmitting ? 'Saving Changes...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirmation Modal */}
            {deleteBlog && createPortal(
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000
                }} onClick={() => setDeleteBlog(null)}>
                    <div style={{
                        background: '#ffffff', borderRadius: '12px', padding: '0',
                        width: '400px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#A51C49' }}>Confirm Delete</h3>
                        </div>
                        <div style={{ padding: '20px 24px', fontSize: '14px', color: '#334155' }}>
                            Are you sure you want to delete <strong>"{deleteBlog.title}"</strong>? This action cannot be undone.
                        </div>
                        <div style={{ padding: '12px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button type="button" onClick={() => setDeleteBlog(null)}
                                style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#f97316', color: '#ffffff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                            <button type="button" onClick={handleDeleteBlog}
                                style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#A51C49', color: '#ffffff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Delete</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

export default BlogList;
