/* eslint-disable */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { createAdminBlog, updateAdminBlog, getBlogCategories, getBlogSubCategories } from '../../../services/blogService';
import { toApiAssetUrl, NgrokSafeImage, normalizeResponseMessage } from '../../../services/apiClient';

const DEFAULT_FORM_STATE = {
    title: '',
    slug: '',
    image: null,
    imageName: '',
    category: '',
    subCategory: '',
    addedBy: '',
    subTitle: '',
    featured: 'No',
    isPublished: 'Yes',
    metaTitle: '',
    metaKeyword: '',
    metaDescription: '',
    ogImage: null,
    ogImageName: '',
    shortDescription: '',
    longDescription: '',
};

const createFormState = (blog) => {
    const mainImg = blog?.imageUrl || blog?.image || blog?.imagePath || blog?.filePath || blog?.photo || blog?.photoUrl || blog?.picture || blog?.url || '';
    const ogImg = blog?.ogImageUrl || blog?.ogImage || blog?.ogImagePath || '';
    return {
        ...DEFAULT_FORM_STATE,
        title: blog?.title || '',
        slug: blog?.slug || '',
        imageName: mainImg,
        category: blog?.category || '',
        subCategory: blog?.subCategory || '',
        addedBy: blog?.addedByName || blog?.author || blog?.addedBy || '',
        subTitle: blog?.subTitle || '',
        featured: blog?.isFeatured ? 'Yes' : 'No',
        isPublished: blog ? (blog.isPublished ? 'Yes' : 'No') : 'Yes',
        metaTitle: blog?.metaTitle || '',
        metaKeyword: blog?.metaKeyword || '',
        metaDescription: blog?.metaDescription || '',
        ogImageName: ogImg,
        shortDescription: blog?.shortDescription || '',
        longDescription: blog?.longDescription || '',
    };
};

const AddBlogForm = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { blogId } = useParams();
    const toastTimerRef = useRef(null);

    const [storedCategories, setStoredCategories] = useState([]);
    const [storedSubCategories, setStoredSubCategories] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const cats = await getBlogCategories();
                const subs = await getBlogSubCategories();
                setStoredCategories(cats);
                setStoredSubCategories(subs);
            } catch (error) {
                console.error("Failed to load categories/subcategories", error);
            }
        };
        loadData();
    }, []);

    const editingBlog = useMemo(() => {
        if (location.state?.blog) {
            return location.state.blog;
        }
        return null;
    }, [location.state]);

    const [formData, setFormData] = useState(() => createFormState(editingBlog));
    const [imagePreview, setImagePreview] = useState(() => {
        return editingBlog ? (editingBlog.imageUrl || editingBlog.image || editingBlog.imagePath || editingBlog.filePath || editingBlog.photo || editingBlog.url || '') : '';
    });
    const [ogImagePreview, setOgImagePreview] = useState(() => {
        return editingBlog ? (editingBlog.ogImageUrl || editingBlog.ogImage || editingBlog.ogImagePath || '') : '';
    });
    const [toast, setToast] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const showToast = (message, tone = 'info') => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        setToast({ message, tone });
        toastTimerRef.current = setTimeout(() => setToast(null), 2400);
    };

    const isEditing = Boolean(editingBlog || blogId);

    useEffect(() => {
        if (editingBlog) {
            setFormData(createFormState(editingBlog));
            const mainImg = editingBlog.imageUrl || editingBlog.image || editingBlog.imagePath || editingBlog.filePath || editingBlog.photo || editingBlog.url || '';
            const ogImg = editingBlog.ogImageUrl || editingBlog.ogImage || editingBlog.ogImagePath || '';
            setImagePreview(mainImg);
            setOgImagePreview(ogImg);
        }
    }, [editingBlog]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp', '.tif', '.tiff', '.ico', '.avif'];

    const handleFileChange = (name, labelField) => (e) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            if (file.size > 1024 * 1024) {
                showToast("File size must be within 1MB limit.", "error");
                e.target.value = ""; // Clear file input
                return;
            }
            const ext = file.name ? file.name.substring(file.name.lastIndexOf(".")).toLowerCase() : "";
            if (ext && !ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
                showToast("Invalid image format. Allowed formats: JPG, PNG, WEBP, GIF, SVG, BMP, TIFF, ICO, AVIF.", "error");
                e.target.value = "";
                return;
            }
        }
        setFormData((prev) => ({
            ...prev,
            [name]: file,
            [labelField]: file?.name || prev[labelField],
        }));

        if (file) {
            const previewUrl = URL.createObjectURL(file);
            if (name === 'image') {
                setImagePreview(previewUrl);
            } else if (name === 'ogImage') {
                setOgImagePreview(previewUrl);
            }
        }
    };

    const handleRemoveImage = (name, labelField, previewSetter) => () => {
        setFormData((prev) => ({
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

    const handleGenerateSlug = () => {
        const slug = buildSlug(formData.title);
        setFormData((prev) => ({ ...prev, slug }));
        showToast('Slug generated.', 'info');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            showToast('Title is required.', 'error');
            return;
        }
        if (!formData.category) {
            showToast('Category is required.', 'error');
            return;
        }
        if (!formData.subCategory) {
            showToast('Sub category is required.', 'error');
            return;
        }
        if (!formData.shortDescription.trim()) {
            showToast('Short description is required.', 'error');
            return;
        }
        if (!formData.longDescription.trim()) {
            showToast('Long description is required.', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            const dataToSend = new FormData();
            dataToSend.append("Title", formData.title.trim());
            dataToSend.append("Category", formData.category);
            dataToSend.append("SubCategory", formData.subCategory);
            dataToSend.append("ShortDescription", formData.shortDescription.trim());
            dataToSend.append("LongDescription", formData.longDescription.trim());

            if (formData.slug?.trim()) {
                dataToSend.append("Slug", formData.slug.trim());
            } else {
                dataToSend.append("Slug", buildSlug(formData.title));
            }

            if (formData.subTitle?.trim()) {
                dataToSend.append("SubTitle", formData.subTitle.trim());
            }
            dataToSend.append("IsFeatured", formData.featured === 'Yes' ? 'true' : 'false');
            dataToSend.append("IsPublished", formData.isPublished === 'Yes' ? 'true' : 'false');

            if (formData.metaTitle?.trim()) {
                dataToSend.append("MetaTitle", formData.metaTitle.trim());
            }
            if (formData.metaKeyword?.trim()) {
                dataToSend.append("MetaKeyword", formData.metaKeyword.trim());
            }
            if (formData.metaDescription?.trim()) {
                dataToSend.append("MetaDescription", formData.metaDescription.trim());
            }

            if (formData.image && typeof formData.image !== "string") {
                dataToSend.append("Image", formData.image);
            }
            if (formData.ogImage && typeof formData.ogImage !== "string") {
                dataToSend.append("OgImage", formData.ogImage);
            }

            const targetId = blogId || editingBlog?.id;

            if (isEditing && targetId) {
                await updateAdminBlog(targetId, dataToSend);
                showToast('Blog updated successfully.', 'success');
            } else {
                await createAdminBlog(dataToSend);
                showToast('Blog created successfully.', 'success');
            }

            setTimeout(() => {
                navigate('/admin/blog-management/blog-list');
            }, 1000);
        } catch (error) {
            console.error("Error saving blog:", error);
            const errData = error.response?.data;
            const rawMsg = errData?.message || errData?.title || (typeof errData === 'string' ? errData : '') || error.message || "";
            const serverMsg = normalizeResponseMessage(errData, rawMsg || "Failed to save blog post.");
            showToast(serverMsg || "Failed to save blog post.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setFormData(createFormState(editingBlog));
        setImagePreview(editingBlog ? (editingBlog.imageUrl || editingBlog.image || '') : '');
        setOgImagePreview(editingBlog ? (editingBlog.ogImageUrl || editingBlog.ogImage || '') : '');
        showToast(isEditing ? 'Changes reset.' : 'Form reset.', 'info');
    };

    const styles = {
        container: {
            padding: '12px 32px',
            background: 'var(--page-bg)',
            minHeight: '100vh',
        },
        card: {
            background: 'var(--panel)',
            borderRadius: '14px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            padding: '24px',
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            gap: '16px',
            flexWrap: 'wrap',
        },
        titleWrapper: {
            display: 'flex',
            alignItems: 'baseline',
            gap: '4px',
            paddingBottom: '0px',
        },
        titleMain: {
            fontSize: '1.6rem',
            fontWeight: 600,
            color: '#be185d',
            margin: 0,
        },
        titleSub: {
            fontSize: '1.6rem',
            fontWeight: 600,
            color: '#be185d',
            margin: 0,
        },
        listBtn: {
            padding: '10px 16px',
            background: '#be185d',
            color: '#ffffff',
            border: '1px solid #be185d',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.9rem',
        },
        sectionHeader: {
            background: '#be185d',
            color: '#ffffff',
            padding: '8px 15px',
            fontWeight: 700,
            borderRadius: '8px',
            marginTop: '24px',
            marginBottom: '16px',
            display: 'block',
            width: '100%',
            boxSizing: 'border-box',
        },
        formGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '16px',
        },
        formGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
        },
        label: {
            fontSize: '0.9rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
        },
        requiredMark: {
            color: 'var(--danger)',
            marginLeft: '4px',
        },
        input: {
            width: '100%',
            boxSizing: 'border-box',
            padding: '6px 10px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit',
            background: 'var(--panel)',
            color: 'var(--text-primary)',
        },
        select: {
            width: '100%',
            boxSizing: 'border-box',
            padding: '6px 10px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit',
            background: 'var(--panel)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
        },
        textarea: {
            width: '100%',
            boxSizing: 'border-box',
            padding: '8px 10px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit',
            minHeight: '80px',
            resize: 'vertical',
            background: 'var(--panel)',
            color: 'var(--text-primary)',
        },
        fileInputWrapper: {
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
        },
        fileLabel: {
            padding: '8px 12px',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem',
            transition: 'all 0.2s ease',
            display: 'inline-block',
            whiteSpace: 'nowrap',
            color: 'var(--text-primary)',
        },
        fileInputHidden: {
            display: 'none',
        },
        fileName: {
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
        },
        slugRow: {
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
        },
        slugBtn: {
            padding: '10px 12px',
            background: 'var(--surface-soft)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
        },
        buttonGroup: {
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid var(--border)',
        },
        tableForm: {
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '24px',
            border: '1.5px solid var(--border)',
        },
        tableLabelCell: {
            background: 'rgba(74, 15, 26, 0.05)',
            border: '1px solid var(--border)',
            padding: '12px 14px',
            fontWeight: 700,
            fontSize: '0.85rem',
            color: 'var(--text-primary)',
            textAlign: 'left',
            width: '12%',
            whiteSpace: 'nowrap',
        },
        tableInputCell: {
            border: '1px solid var(--border)',
            padding: '8px 12px',
            background: 'var(--panel)',
            width: '21%',
        },
        submitBtn: {
            padding: '12px 40px',
            background: '#be185d',
            color: '#ffffff',
            border: '1.5px solid #be185d',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            letterSpacing: '1px',
        },
        cancelBtn: {
            padding: '12px 40px',
            background: 'var(--panel)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.95rem',
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
    };

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
                <div style={styles.card}>
                    <div style={{ ...styles.header, marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                        <div style={styles.titleWrapper}>
                            <h1 style={styles.titleMain}>{isEditing ? 'Edit' : 'Add'}</h1>
                            <h2 style={styles.titleSub}>Blog</h2>
                        </div>
                        <button
                            type="button"
                            style={styles.listBtn}
                            onMouseEnter={(e) => {
                                e.target.style.background = '#9d124d';
                                e.target.style.color = '#ffffff';
                                e.target.style.borderColor = '#9d124d';
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 4px 12px rgba(190, 24, 93, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = '#be185d';
                                e.target.style.color = '#ffffff';
                                e.target.style.borderColor = '#be185d';
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                            }}
                            onClick={() => navigate('/admin/blog-management/blog-list')}
                        >
                            Blog List
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={styles.sectionHeader}>Basic Information</div>
                        <table style={styles.tableForm}>
                            <tbody>
                                <tr>
                                    <td style={styles.tableLabelCell}>
                                        Title <span style={styles.requiredMark}>*</span>
                                    </td>
                                    <td style={styles.tableInputCell}>
                                        <input
                                            type="text"
                                            name="title"
                                            placeholder="Enter blog title"
                                            value={formData.title}
                                            onChange={handleChange}
                                            style={styles.input}
                                            required
                                        />
                                    </td>
                                    <td style={styles.tableLabelCell}>
                                        Slug
                                    </td>
                                    <td style={styles.tableInputCell}>
                                        <input
                                            type="text"
                                            name="slug"
                                            placeholder="blog-slug"
                                            value={formData.slug}
                                            onChange={handleChange}
                                            style={styles.input}
                                        />
                                    </td>
                                    <td style={styles.tableLabelCell}>
                                        Image [max_size: 1MB]
                                    </td>
                                    <td style={styles.tableInputCell}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <input
                                                    type="text"
                                                    name="imageName"
                                                    placeholder="Select or enter image path..."
                                                    value={formData.image?.name || formData.imageName || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setFormData((prev) => ({ ...prev, imageName: val }));
                                                        if (val) setImagePreview(val);
                                                    }}
                                                    style={{ ...styles.input, flex: 1 }}
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
                                                        onChange={handleFileChange('image', 'imageName')}
                                                        style={{ display: 'none' }}
                                                    />
                                                </label>
                                            </div>
                                            {(imagePreview || formData.imageName) && (
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
                                                    {imagePreview ? (
                                                        <NgrokSafeImage
                                                            src={imagePreview.startsWith('blob:') || imagePreview.startsWith('data:') ? imagePreview : toApiAssetUrl(imagePreview)}
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
                                                            onClick={handleRemoveImage('image', 'imageName', setImagePreview)}
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
                                    </td>
                                </tr>
                                <tr>
                                    <td style={styles.tableLabelCell}>
                                        Category <span style={styles.requiredMark}>*</span>
                                    </td>
                                    <td style={styles.tableInputCell}>
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={(e) => {
                                                handleChange(e);
                                                setFormData(prev => ({ ...prev, subCategory: '' }));
                                            }}
                                            style={styles.select}
                                            required
                                        >
                                            <option value="">Select Some Options</option>
                                            {storedCategories
                                                .filter(cat => cat.status === 'Active')
                                                .map(cat => (
                                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                                ))
                                            }
                                        </select>
                                    </td>
                                    <td style={styles.tableLabelCell}>
                                        Sub Category <span style={styles.requiredMark}>*</span>
                                    </td>
                                    <td style={styles.tableInputCell}>
                                        <select
                                            name="subCategory"
                                            value={formData.subCategory}
                                            onChange={handleChange}
                                            style={styles.select}
                                            required
                                        >
                                            <option value="">Select Some Options</option>
                                            {storedSubCategories
                                                .filter(sub => sub.status === 'Active' && (!formData.category || sub.category === formData.category))
                                                .map(sub => (
                                                    <option key={sub.id} value={sub.name}>{sub.name}</option>
                                                ))
                                            }
                                        </select>
                                    </td>
                                    <td style={styles.tableLabelCell}>
                                        Added By
                                    </td>
                                    <td style={styles.tableInputCell}>
                                        <input
                                            type="text"
                                            name="addedBy"
                                            placeholder="Added By Name"
                                            value={formData.addedBy}
                                            onChange={handleChange}
                                            style={styles.input}
                                        />
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <div style={styles.sectionHeader}>Short Description</div>
                        <div style={{ marginBottom: '24px' }}>
                            <textarea
                                name="shortDescription"
                                placeholder="Enter a brief summary of the article"
                                value={formData.shortDescription}
                                onChange={handleChange}
                                style={{ ...styles.textarea, minHeight: '60px', height: '60px' }}
                                required
                            />
                        </div>

                        <div style={styles.sectionHeader}>Long Description (HTML Allowed)</div>
                        <div style={{ marginBottom: '24px' }}>
                            <textarea
                                name="longDescription"
                                placeholder="<p>Enter the full body and detailed description of the article here...</p>"
                                value={formData.longDescription}
                                onChange={handleChange}
                                style={{ ...styles.textarea, minHeight: '120px', height: '120px' }}
                                required
                            />
                        </div>

                        <div style={styles.sectionHeader}>SEO And Metadata</div>
                        <table style={styles.tableForm}>
                            <tbody>
                                <tr>
                                    <td style={styles.tableLabelCell}>
                                        Sub Title (Optional)
                                    </td>
                                    <td style={styles.tableInputCell}>
                                        <input
                                            type="text"
                                            name="subTitle"
                                            placeholder="Enter sub title"
                                            value={formData.subTitle}
                                            onChange={handleChange}
                                            style={styles.input}
                                        />
                                    </td>
                                    <td style={styles.tableLabelCell}>
                                        Featured
                                    </td>
                                    <td style={styles.tableInputCell}>
                                        <select
                                            name="featured"
                                            value={formData.featured}
                                            onChange={handleChange}
                                            style={styles.select}
                                        >
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                        </select>
                                    </td>
                                    <td style={styles.tableLabelCell}>
                                        Meta Title
                                    </td>
                                    <td style={styles.tableInputCell}>
                                        <input
                                            type="text"
                                            name="metaTitle"
                                            placeholder="Enter meta title"
                                            value={formData.metaTitle}
                                            onChange={handleChange}
                                            style={styles.input}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td style={styles.tableLabelCell}>
                                        Meta Keyword
                                    </td>
                                    <td style={styles.tableInputCell}>
                                        <input
                                            type="text"
                                            name="metaKeyword"
                                            placeholder="Enter meta keyword"
                                            value={formData.metaKeyword}
                                            onChange={handleChange}
                                            style={styles.input}
                                        />
                                    </td>
                                    <td style={styles.tableLabelCell}>
                                        Meta Description
                                    </td>
                                    <td style={styles.tableInputCell}>
                                        <input
                                            type="text"
                                            name="metaDescription"
                                            placeholder="Enter meta description"
                                            value={formData.metaDescription}
                                            onChange={handleChange}
                                            style={styles.input}
                                        />
                                    </td>
                                    <td style={styles.tableLabelCell}>
                                        OG Image [max_size: 1MB]
                                    </td>
                                    <td style={styles.tableInputCell}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <input
                                                    type="text"
                                                    name="ogImageName"
                                                    placeholder="Select or enter OG image path..."
                                                    value={formData.ogImage?.name || formData.ogImageName || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setFormData((prev) => ({ ...prev, ogImageName: val }));
                                                        if (val) setOgImagePreview(val);
                                                    }}
                                                    style={{ ...styles.input, flex: 1 }}
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
                                                        onChange={handleFileChange('ogImage', 'ogImageName')}
                                                        style={{ display: 'none' }}
                                                    />
                                                </label>
                                            </div>
                                            {(ogImagePreview || formData.ogImageName) && (
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
                                                    {ogImagePreview ? (
                                                        <NgrokSafeImage
                                                            src={ogImagePreview.startsWith('blob:') || ogImagePreview.startsWith('data:') ? ogImagePreview : toApiAssetUrl(ogImagePreview)}
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
                                                            onClick={handleRemoveImage('ogImage', 'ogImageName', setOgImagePreview)}
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
                                    </td>
                                </tr>
                                <tr>
                                    <td style={styles.tableLabelCell}>
                                        Published
                                    </td>
                                    <td style={styles.tableInputCell} colSpan={5}>
                                        <select
                                            name="isPublished"
                                            value={formData.isPublished}
                                            onChange={handleChange}
                                            style={{ ...styles.select, maxWidth: '200px' }}
                                        >
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                        </select>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <div style={styles.buttonGroup}>
                            <button
                                type="button"
                                style={styles.cancelBtn}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'var(--surface-soft)';
                                    e.target.style.borderColor = 'var(--primary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'var(--panel)';
                                    e.target.style.borderColor = 'var(--border)';
                                }}
                                onClick={handleReset}
                            >
                                Reset
                            </button>
                            <button
                                type="submit"
                                style={styles.submitBtn}
                                disabled={isSubmitting}
                                onMouseEnter={(e) => {
                                    e.target.style.background = '#9d124d';
                                    e.target.style.color = '#ffffff';
                                    e.target.style.borderColor = '#9d124d';
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 4px 12px rgba(190, 24, 93, 0.2)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = '#be185d';
                                    e.target.style.color = '#ffffff';
                                    e.target.style.borderColor = '#be185d';
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = 'none';
                                }}
                            >
                                {isSubmitting ? 'Submitting...' : isEditing ? 'Update' : 'Submit'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default AddBlogForm;

