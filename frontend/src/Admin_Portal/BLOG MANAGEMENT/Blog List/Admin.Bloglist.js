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
import { getAdminBlogs, deleteAdminBlog, updateAdminBlog, getBlogCategories, getBlogSubCategories, getBlogImageSrc, saveBlogImageLocally } from '../../../services/blogService';
import { toApiAssetUrl, NgrokSafeImage, normalizeResponseMessage, getDisplayFileName } from '../../../services/apiClient';

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

const getCategoryBadgeStyle = (categoryName) => {
    const name = (categoryName || '').toLowerCase().trim();
    let bg = '#f8fafc';
    let color = '#475569';
    let border = '1px solid #cbd5e1';

    if (name.includes('hotel')) {
        bg = '#fff7ed';
        color = '#c2410c';
        border = '1px solid #fed7aa';
    } else if (name.includes('bus')) {
        bg = '#eff6ff';
        color = '#1d4ed8';
        border = '1px solid #bfdbfe';
    } else if (name.includes('flight') || name.includes('air')) {
        bg = '#f0fdf4';
        color = '#15803d';
        border = '1px solid #bbf7d0';
    } else if (name.includes('holiday') || name.includes('package') || name.includes('tour')) {
        bg = '#fdf4ff';
        color = '#7e22ce';
        border = '1px solid #f5d0fe';
    } else if (name.includes('train') || name.includes('rail')) {
        bg = '#fef2f2';
        color = '#b91c1c';
        border = '1px solid #fecaca';
    }

    return {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        backgroundColor: bg,
        color: color,
        border: border,
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
    };
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
            const mapped = (data.blogs || []).map(blog => {
                const resolvedImg = getBlogImageSrc(blog) || blog.imageUrl || blog.ImageUrl || blog.image || '';
                if (resolvedImg) {
                    saveBlogImageLocally(blog.id, resolvedImg);
                    if (blog.title) saveBlogImageLocally(blog.title, resolvedImg);
                    if (blog.slug) saveBlogImageLocally(blog.slug, resolvedImg);
                }
                return {
                    ...blog,
                    entryDate: blog.createdAtUtc ? formatDate(blog.createdAtUtc) : 'Draft',
                    image: resolvedImg,
                    imageUrl: resolvedImg,
                    status: blog.isPublished ? 'Active' : 'Inactive',
                    author: blog.addedByName || blog.author || blog.addedBy || 'Admin'
                };
            });
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

        const existingImg = getBlogImageSrc(blogToToggle) || blogToToggle.image || blogToToggle.imageUrl;
        if (existingImg) {
            saveBlogImageLocally(id, existingImg);
            if (blogToToggle.title) saveBlogImageLocally(blogToToggle.title, existingImg);
            if (blogToToggle.slug) saveBlogImageLocally(blogToToggle.slug, existingImg);
        }

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
        const blogImage = blog.imageUrl || blog.image || blog.imagePath || blog.filePath || blog.photo || blog.photoUrl || blog.picture || blog.url || '';
        const blogOgImage = blog.ogImageUrl || blog.ogImage || blog.ogImagePath || '';
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
            imageName: blogImage,
            ogImageName: blogOgImage,
        });
        setEditImagePreview(blogImage);
        setEditOgImagePreview(blogOgImage);
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

    const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp', '.tif', '.tiff', '.ico', '.avif'];

    const handleEditFileChange = (name, labelField) => (e) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            if (file.size > 1024 * 1024) {
                showToast("File size must be within 1MB limit.", "error");
                e.target.value = "";
                return;
            }
            const ext = file.name ? file.name.substring(file.name.lastIndexOf(".")).toLowerCase() : "";
            if (ext && !ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
                showToast("Invalid image format. Allowed formats: JPG, PNG, WEBP, GIF, SVG, BMP, TIFF, ICO, AVIF.", "error");
                e.target.value = "";
                return;
            }
        }
        setEditFormData(prev => ({
            ...prev,
            [name]: file,
            [labelField]: file ? file.name : prev[labelField]
        }));
        
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const dataUrl = evt.target.result;
                if (name === 'image') {
                    setEditImagePreview(dataUrl);
                    if (editingBlog?.id) {
                        saveBlogImageLocally(editingBlog.id, dataUrl);
                    }
                    if (editFormData.title) {
                        saveBlogImageLocally(editFormData.title, dataUrl);
                    }
                } else if (name === 'ogImage') {
                    setEditOgImagePreview(dataUrl);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveEditImage = (name, labelField, previewSetter) => {
        setEditFormData((prev) => ({
            ...prev,
            [name]: null,
            [labelField]: '',
        }));
        if (previewSetter) previewSetter('');
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
            
            const computedSlug = editFormData.slug?.trim() || buildSlug(editFormData.title);
            dataToSend.append("Slug", computedSlug);

            if (editFormData.subTitle?.trim()) {
                dataToSend.append("SubTitle", editFormData.subTitle.trim());
            }
            dataToSend.append("IsFeatured", editFormData.featured === 'Yes' ? 'true' : 'false');
            dataToSend.append("IsPublished", editFormData.isPublished === 'Yes' ? 'true' : 'false');

            if (editFormData.metaTitle?.trim()) {
                dataToSend.append("MetaTitle", editFormData.metaTitle.trim());
            }
            if (editFormData.metaKeyword?.trim()) {
                dataToSend.append("MetaKeyword", editFormData.metaKeyword.trim());
            }
            if (editFormData.metaDescription?.trim()) {
                dataToSend.append("MetaDescription", editFormData.metaDescription.trim());
            }

            if (editFormData.image && typeof editFormData.image !== "string") {
                dataToSend.append("Image", editFormData.image);
            }
            if (editFormData.ogImage && typeof editFormData.ogImage !== "string") {
                dataToSend.append("OgImage", editFormData.ogImage);
            }

            if (editImagePreview) {
                saveBlogImageLocally(editingBlog.id, editImagePreview);
                saveBlogImageLocally(editFormData.title, editImagePreview);
                saveBlogImageLocally(computedSlug, editImagePreview);
            }

            await updateAdminBlog(editingBlog.id, dataToSend);
            setEditModalOpen(false);
            setEditingBlog(null);
            showToast('Blog updated successfully.', 'success');
            fetchBlogs();
        } catch (error) {
            console.error("Error saving blog:", error);
            const errData = error.response?.data;
            const rawMsg = errData?.message || errData?.title || (typeof errData === 'string' ? errData : '') || error.message || "";
            const serverMsg = normalizeResponseMessage(errData, rawMsg || "Failed to save blog post.");
            showToast(serverMsg || "Failed to save blog post.", "error");
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
            fontSize: '1.6rem',
            fontWeight: 600,
            color: '#A51C49',
            margin: 0,
            letterSpacing: '-0.5px',
        },
        titleSub: {
            fontSize: '1.6rem',
            fontWeight: 600,
            color: '#A51C49',
            margin: 0,
        },
        actions: {
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            flexWrap: 'nowrap',
        },
        button: {
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid transparent',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            height: '34px',
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
            padding: '6px 10px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            fontSize: '0.8rem',
            width: '180px',
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
            fontWeight: 700,
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
            fontSize: '0.9rem',
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
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '11px',
            background: '#ffffff',
        },
        thead: {
            background: '#A51C49',
            color: '#ffffff',
            fontWeight: 500,
        },
        th: {
            padding: '10px 8px',
            textAlign: 'center',
            borderRight: '1px solid rgba(255, 255, 255, 0.2)',
            whiteSpace: 'nowrap',
            fontSize: '11px',
            textTransform: 'none',
            fontWeight: 500,
            verticalAlign: 'middle',
            height: '38px',
            background: '#A51C49',
            color: '#ffffff',
        },
        td: {
            padding: '6px 8px',
            borderBottom: '1px solid #f1f5f9',
            color: '#334155',
            verticalAlign: 'middle',
            textAlign: 'center',
            height: '36px',
            fontSize: '11px',
            fontWeight: 400,
            background: '#ffffff',
        },
        tbody: {
            fontSize: '11px',
            background: '#ffffff',
        },
        tr: {
            transition: 'background-color 0.2s ease',
            borderBottom: '1px solid #f1f5f9',
            height: '36px',
            background: '#ffffff',
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
                                    className="navy-close-btn"
                                    style={{
                                        border: '1px solid #cbd5e1',
                                        background: '#ffffff',
                                        color: '#334155',
                                        borderRadius: '16px',
                                        padding: '3px 12px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#A51C49';
                                        e.currentTarget.style.borderColor = '#A51C49';
                                        e.currentTarget.style.color = '#ffffff';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#ffffff';
                                        e.currentTarget.style.borderColor = '#cbd5e1';
                                        e.currentTarget.style.color = '#334155';
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
                                    <strong style={{ color: 'var(--text-secondary)' }}>Blog Image:</strong>
                                    <div style={{ marginTop: '6px' }}>
                                        {(() => {
                                            const imgSrc = getBlogImageSrc(selectedBlog) || selectedBlog?.imageUrl || selectedBlog?.image || '';
                                            if (!imgSrc) return <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>-</span>;
                                            const safeSrc = imgSrc.startsWith('blob:') || imgSrc.startsWith('data:') ? imgSrc : toApiAssetUrl(imgSrc);
                                            return (
                                                <NgrokSafeImage
                                                    src={safeSrc}
                                                    alt={selectedBlog.title}
                                                    style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                                                    onClick={() => setActivePopupImage(safeSrc)}
                                                />
                                            );
                                        })()}
                                    </div>
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

                {activePopupImage && createPortal(
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(15, 23, 42, 0.75)',
                            backdropFilter: 'blur(4px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 99999,
                            padding: '20px'
                        }}
                        onClick={() => setActivePopupImage(null)}
                    >
                        <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
                            <button
                                type="button"
                                onClick={() => setActivePopupImage(null)}
                                style={{
                                    position: 'absolute',
                                    top: '-12px',
                                    right: '-12px',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: '#ef4444',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontWeight: 'bold',
                                    fontSize: '16px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                    zIndex: 10
                                }}
                            >
                                ✕
                            </button>
                            <NgrokSafeImage
                                src={activePopupImage}
                                alt="Enlarged blog image"
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '85vh',
                                    objectFit: 'contain',
                                    borderRadius: '12px',
                                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                                }}
                            />
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
                                filteredBlogs.slice((page - 1) * pageSize, page * pageSize).map((blog, index) => {
                                    const blogImg = getBlogImageSrc(blog) || blog.imageUrl || blog.image || '';
                                    const displayImgSrc = blogImg ? (blogImg.includes('?') || blogImg.startsWith('blob:') || blogImg.startsWith('data:') ? blogImg : `${blogImg}?t=${blog.updatedAtUtc || blog.updatedAt || ''}`) : '';
                                    return (
                                        <tr
                                            key={blog.id}
                                            style={styles.tr}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(165, 28, 73, 0.04)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = '#ffffff';
                                            }}
                                        >
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
                                            <td style={{ ...styles.td, textAlign: 'center' }}>
                                                {blogImg ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <NgrokSafeImage
                                                            src={displayImgSrc}
                                                            fallbackSrc={blog.imageUrl || blog.image || null}
                                                            alt={blog.title}
                                                            title={blog.title}
                                                            style={{
                                                                width: '36px',
                                                                height: '36px',
                                                                objectFit: 'cover',
                                                                borderRadius: '6px',
                                                                border: '1px solid #e2e8f0',
                                                                cursor: 'pointer',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                                transition: 'transform 0.2s ease'
                                                            }}
                                                            onClick={() => setActivePopupImage(displayImgSrc)}
                                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '6px',
                                                        background: '#f1f5f9',
                                                        border: '1px solid #e2e8f0',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '10px',
                                                        fontWeight: 500,
                                                        color: '#94a3b8',
                                                        margin: '0 auto'
                                                    }}>
                                                        No Img
                                                    </div>
                                                )}
                                            </td>
                                            <td style={styles.td}>
                                                {blog.category && blog.category !== '-' ? (
                                                    <span style={getCategoryBadgeStyle(blog.category)}>
                                                        {blog.category}
                                                    </span>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                            <td style={styles.td}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#334155' }}>
                                                    {blog.subCategory && blog.subCategory !== '-' ? blog.subCategory : '-'}
                                                </span>
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
                                                            ...(index >= filteredBlogs.length - 2 || filteredBlogs.length <= 3
                                                                ? { bottom: '100%', marginBottom: '6px' }
                                                                : { top: '100%', marginTop: '6px' }),
                                                            right: 0,
                                                            background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0',
                                                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', zIndex: 99999,
                                                            minWidth: '160px', overflow: 'hidden'
                                                        }}>
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); handleViewDetails(blog); setActiveDropdownId(null); }}
                                                                className="admin-view-action-btn"
                                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#334155', transition: 'all 0.15s ease' }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.background = '#2563eb';
                                                                    e.currentTarget.style.color = '#ffffff';
                                                                    e.currentTarget.style.border = 'none';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.background = 'none';
                                                                    e.currentTarget.style.color = '#334155';
                                                                    e.currentTarget.style.border = 'none';
                                                                }}
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
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="8" style={{ padding: "30px 20px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                                        Data not found
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Image [max_size: 1MB]</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="text"
                                            name="imageName"
                                            placeholder="Select or enter image path..."
                                            value={editFormData.image?.name || editFormData.imageName || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setEditFormData((prev) => ({ ...prev, imageName: val }));
                                                if (val) setEditImagePreview(val);
                                            }}
                                            style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--panel)', color: 'var(--text-primary)' }}
                                        />
                                        <label style={{
                                            backgroundColor: '#800032',
                                            color: '#ffffff',
                                            borderRadius: '6px',
                                            padding: '8px 16px',
                                            fontWeight: 600,
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            Choose File
                                            <input
                                                type="file"
                                                accept="image/jpeg, image/png, image/webp, image/gif, image/svg+xml, image/bmp, image/tiff, image/x-icon, image/avif"
                                                onChange={handleEditFileChange('image', 'imageName')}
                                                style={{ display: 'none' }}
                                            />
                                        </label>
                                    </div>
                                    {(editImagePreview || editFormData.imageName) && (
                                        <div style={{
                                            padding: '10px 14px',
                                            backgroundColor: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '14px',
                                            marginTop: '4px'
                                        }}>
                                            {editImagePreview ? (
                                                <NgrokSafeImage
                                                    src={editImagePreview.startsWith('blob:') || editImagePreview.startsWith('data:') ? editImagePreview : toApiAssetUrl(editImagePreview)}
                                                    alt="Preview"
                                                    style={{ width: '60px', height: '45px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                                />
                                            ) : (
                                                <div style={{ width: '60px', height: '45px', backgroundColor: '#e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#64748b' }}>No Img</div>
                                            )}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>
                                                    IMAGE PREVIEW
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveEditImage('image', 'imageName', setEditImagePreview)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#dc2626',
                                                        fontSize: '13px',
                                                        fontWeight: 500,
                                                        cursor: 'pointer',
                                                        padding: 0,
                                                        textAlign: 'left',
                                                        textDecoration: 'underline'
                                                    }}
                                                >
                                                    Remove Image
                                                </button>
                                            </div>
                                        </div>
                                    )}
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Og Image [max_size: 1MB]</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="text"
                                            name="ogImageName"
                                            placeholder="Select or enter OG image path..."
                                            value={editFormData.ogImage?.name || editFormData.ogImageName || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setEditFormData((prev) => ({ ...prev, ogImageName: val }));
                                                if (val) setEditOgImagePreview(val);
                                            }}
                                            style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', background: 'var(--panel)', color: 'var(--text-primary)' }}
                                        />
                                        <label style={{
                                            backgroundColor: '#800032',
                                            color: '#ffffff',
                                            borderRadius: '6px',
                                            padding: '8px 16px',
                                            fontWeight: 600,
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            Choose File
                                            <input
                                                type="file"
                                                accept="image/jpeg, image/png, image/webp, image/gif, image/svg+xml, image/bmp, image/tiff, image/x-icon, image/avif"
                                                onChange={handleEditFileChange('ogImage', 'ogImageName')}
                                                style={{ display: 'none' }}
                                            />
                                        </label>
                                    </div>
                                    {(editOgImagePreview || editFormData.ogImageName) && (
                                        <div style={{
                                            padding: '10px 14px',
                                            backgroundColor: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '14px',
                                            marginTop: '4px'
                                        }}>
                                            {editOgImagePreview ? (
                                                <NgrokSafeImage
                                                    src={editOgImagePreview.startsWith('blob:') || editOgImagePreview.startsWith('data:') ? editOgImagePreview : toApiAssetUrl(editOgImagePreview)}
                                                    alt="Preview OG"
                                                    style={{ width: '60px', height: '45px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                                />
                                            ) : (
                                                <div style={{ width: '60px', height: '45px', backgroundColor: '#e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#64748b' }}>No Img</div>
                                            )}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>
                                                    IMAGE PREVIEW
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveEditImage('ogImage', 'ogImageName', setEditOgImagePreview)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#dc2626',
                                                        fontSize: '13px',
                                                        fontWeight: 500,
                                                        cursor: 'pointer',
                                                        padding: 0,
                                                        textAlign: 'left',
                                                        textDecoration: 'underline'
                                                    }}
                                                >
                                                    Remove Image
                                                </button>
                                            </div>
                                        </div>
                                    )}
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
                                    className="btn-cancel"
                                    style={{ padding: '5px 14px', background: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#A51C49';
                                        e.currentTarget.style.borderColor = '#A51C49';
                                        e.currentTarget.style.color = '#ffffff';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#ffffff';
                                        e.currentTarget.style.borderColor = '#cbd5e1';
                                        e.currentTarget.style.color = '#334155';
                                    }}
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
                                className="btn-cancel"
                                style={{ padding: '5px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontWeight: 600, fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#A51C49';
                                    e.currentTarget.style.borderColor = '#A51C49';
                                    e.currentTarget.style.color = '#ffffff';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#ffffff';
                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                    e.currentTarget.style.color = '#334155';
                                }}
                            >Cancel</button>
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
