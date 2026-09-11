/* eslint-disable */
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBlogCategory } from '../../../services/blogService';

function AddBlogCategory() {
    const navigate = useNavigate();
    const toastTimerRef = useRef(null);
    const [formData, setFormData] = useState({
        categoryName: '',
        categorySlug: '',
        categoryImage: null,
        metaTitle: '',
        metaKeyword: '',
        metaDescription: '',
    });
    const [toast, setToast] = useState(null);

    const showToast = (message, tone = 'info') => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        setToast({ message, tone });
        toastTimerRef.current = setTimeout(() => setToast(null), 2400);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        setFormData(prev => ({
            ...prev,
            categoryImage: e.target.files[0]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.categoryName.trim()) {
            showToast('Category name is required.', 'error');
            return;
        }
        try {
            const dataToSend = new FormData();
            dataToSend.append("Name", formData.categoryName.trim());
            dataToSend.append("Slug", formData.categorySlug || '');
            dataToSend.append("Status", "Active");
            dataToSend.append("MetaTitle", formData.metaTitle || '');
            dataToSend.append("MetaKeyword", formData.metaKeyword || '');
            dataToSend.append("MetaDescription", formData.metaDescription || '');
            if (formData.categoryImage) {
                dataToSend.append("Image", formData.categoryImage);
            }

            await createBlogCategory(dataToSend);
            showToast('Category saved successfully.', 'success');
            setTimeout(() => {
                navigate('/admin/blog-management/blog-category-list');
            }, 1000);
        } catch (error) {
            console.error("Failed to save category", error);
            showToast("Failed to save category.", "error");
        }
    };

    const handleReset = () => {
        setFormData({
            categoryName: '',
            categorySlug: '',
            categoryImage: null,
            metaTitle: '',
            metaKeyword: '',
            metaDescription: '',
        });
        showToast('Form reset.', 'info');
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
            marginBottom: '24px',
            gap: '12px',
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
        backBtn: {
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
        formContainer: {
            background: 'var(--panel)',
            borderRadius: '14px',
            padding: '28px',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border)',
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
            padding: '10px 12px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit',
            background: 'var(--panel)',
            color: 'var(--text-primary)',
        },
        textarea: {
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 12px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit',
            minHeight: '90px',
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
        buttonGroup: {
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid var(--border)',
        },
        submitBtn: {
            padding: '12px 40px',
            background: '#be185d',
            color: '#ffffff',
            border: '1px solid #be185d',
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
                <div style={styles.formContainer}>
                    <div style={{ ...styles.header, marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                        <div style={styles.titleWrapper}>
                            <h1 style={styles.titleMain}>Add Blog</h1>
                            <h2 style={styles.titleSub}>Category</h2>
                        </div>
                        <button
                            type="button"
                            style={styles.backBtn}
                            onMouseEnter={(e) => {
                                e.target.style.background = '#9d124d';
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
                            onClick={() => navigate('/admin/blog-management/blog-category-list')}
                        >
                            Category List
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <table style={styles.tableForm}>
                            <tbody>
                                <tr>
                                    <td style={styles.tableLabelCell}>
                                        Category Name<span style={styles.requiredMark}>*</span>
                                    </td>
                                    <td style={styles.tableInputCell}>
                                        <input
                                            type="text"
                                            name="categoryName"
                                            placeholder="Enter category name"
                                            value={formData.categoryName}
                                            onChange={handleChange}
                                            style={styles.input}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'var(--primary)';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(74, 15, 26, 0.15)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'var(--border)';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                            required
                                        />
                                    </td>
                                    <td style={styles.tableLabelCell}>
                                        Category Slug
                                    </td>
                                    <td style={styles.tableInputCell}>
                                        <input
                                            type="text"
                                            name="categorySlug"
                                            placeholder="category-slug"
                                            value={formData.categorySlug}
                                            onChange={handleChange}
                                            style={styles.input}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'var(--primary)';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(74, 15, 26, 0.15)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'var(--border)';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                    </td>
                                    <td style={styles.tableLabelCell}>
                                        Category Image <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>[max: 4MB]</span>
                                    </td>
                                    <td style={styles.tableInputCell}>
                                        <div style={styles.fileInputWrapper}>
                                            <label style={styles.fileLabel}>
                                                Choose File
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleFileChange}
                                                    style={styles.fileInputHidden}
                                                />
                                            </label>
                                            <span style={styles.fileName}>
                                                {formData.categoryImage ? formData.categoryImage.name : 'No file chosen'}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
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
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'var(--primary)';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(74, 15, 26, 0.15)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'var(--border)';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                    </td>
                                    <td style={styles.tableLabelCell}>
                                        Meta Keyword
                                    </td>
                                    <td style={styles.tableInputCell} colSpan={3}>
                                        <input
                                            type="text"
                                            name="metaKeyword"
                                            placeholder="Enter meta keyword"
                                            value={formData.metaKeyword}
                                            onChange={handleChange}
                                            style={styles.input}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'var(--primary)';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(74, 15, 26, 0.15)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'var(--border)';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td style={styles.tableLabelCell}>
                                        Meta Description
                                    </td>
                                    <td style={styles.tableInputCell} colSpan={5}>
                                        <textarea
                                            name="metaDescription"
                                            placeholder="Enter meta description"
                                            value={formData.metaDescription}
                                            onChange={handleChange}
                                            style={{ ...styles.input, minHeight: '80px', height: '80px', resize: 'vertical' }}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'var(--primary)';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(74, 15, 26, 0.15)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'var(--border)';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
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
                                onMouseEnter={(e) => {
                                    e.target.style.background = '#b91c1c';
                                    e.target.style.borderColor = '#b91c1c';
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 4px 12px rgba(220, 30, 38, 0.2)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = '#be185d';
                                    e.target.style.borderColor = '#be185d';
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = 'none';
                                }}
                            >
                                Submit
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

export default AddBlogCategory;
