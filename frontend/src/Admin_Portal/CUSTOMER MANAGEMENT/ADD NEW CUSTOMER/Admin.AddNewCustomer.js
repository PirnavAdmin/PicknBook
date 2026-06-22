import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createCustomer, getCustomerById, updateCustomer } from "../../../services/customerService";

function AddNewCustomer() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;
    const toastTimerRef = useRef(null);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        mobile: '',
        altMobile: '',
        gender: 'Male',
        currency: 'INR',
        status: 'Active',
        walletStatus: 'Active',
        loginId: '',
        password: '',
        confirmPassword: '',
        refferedBy: '',
        address: '',
        city: '',
        state: '',
        country: '',
        pincode: '',
        remark: '',
        aadharNumber: '',
        panNumber: '',
        panName: '',
    });

    useEffect(() => {
        if (isEditMode) {
            const fetchCustomer = async () => {
                try {
                    const data = await getCustomerById(id);
                    if (data) {
                        setFormData({
                            firstName: data.firstName || '',
                            lastName: data.lastName || '',
                            email: data.email || data.emailId || '',
                            mobile: data.mobile || '',
                            altMobile: data.altMobile || '',
                            gender: data.gender || 'Male',
                            currency: 'INR',
                            status: data.status || 'Active',
                            walletStatus: data.walletStatus || 'Active',
                            loginId: data.loginId || '',
                            password: '', // Keep empty/hidden unless they edit it
                            confirmPassword: '',
                            refferedBy: data.referredBy || data.refferedBy || '',
                            address: data.address || '',
                            city: data.city || '',
                            state: data.state || '',
                            country: data.country || '',
                            pincode: data.pincode || '',
                            remark: data.remark || '',
                            aadharNumber: data.aadharNumber || '',
                            panNumber: data.panNumber || '',
                            panName: data.panName || '',
                        });
                    }
                } catch (error) {
                    console.error("Error loading customer data:", error);
                    showToast("Failed to load customer details.", "error");
                }
            };
            fetchCustomer();
        }
    }, [id, isEditMode]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleLoginIdClick = () => {
        if (!formData.loginId) {
            const emailVal = formData.email ? formData.email.trim() : '';
            const generatedId = emailVal || (formData.mobile ? `cust_${formData.mobile}` : `cust_${Math.floor(Math.random() * 90000) + 10000}`);
            setFormData(prev => ({
                ...prev,
                loginId: generatedId,
                password: prev.password || 'Pass@1234',
                confirmPassword: prev.confirmPassword || 'Pass@1234'
            }));
            showToast("Credentials automatically filled.", "info");
        }
    };

    const [toast, setToast] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const showToast = (message, tone = 'info') => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        setToast({ message, tone });
        toastTimerRef.current = setTimeout(() => setToast(null), 2400);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            showToast('Password and confirm password do not match.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email.trim(),
                mobile: formData.mobile.trim(),
                altMobile: formData.altMobile.trim(),
                gender: formData.gender,
                status: formData.status,
                walletStatus: formData.walletStatus,
                loginId: formData.loginId.trim() || formData.email.trim(),
                password: formData.password,
                referredBy: formData.refferedBy.trim(),
                address: formData.address.trim(),
                city: formData.city.trim(),
                state: formData.state.trim(),
                country: formData.country.trim(),
                pincode: formData.pincode.trim(),
                remark: formData.remark.trim(),
                aadharNumber: formData.aadharNumber.trim(),
                panNumber: formData.panNumber.trim(),
                panName: formData.panName.trim(),
            };

            if (isEditMode) {
                await updateCustomer(id, payload);
                showToast('Customer updated successfully.', 'success');
            } else {
                await createCustomer(payload);
                showToast('Customer saved successfully.', 'success');
            }
            setTimeout(() => {
                navigate('/admin/customer-management/customer-list');
            }, 1000);
        } catch (error) {
            console.error("Error saving customer:", error);
            showToast(error.response?.data?.message || "Failed to save customer.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setFormData({
            firstName: '',
            lastName: '',
            email: '',
            mobile: '',
            altMobile: '',
            gender: 'Male',
            currency: 'INR',
            status: 'Active',
            walletStatus: 'Active',
            loginId: '',
            password: '',
            confirmPassword: '',
            refferedBy: '',
            address: '',
            city: '',
            state: '',
            country: '',
            pincode: '',
            remark: '',
            aadharNumber: '',
            panNumber: '',
            panName: '',
        });
        showToast('Form reset.', 'info');
    };

    // Inline Styles
    const styles = {
        container: {
            padding: '24px 32px',
            background: 'var(--page-bg)',
            minHeight: '100vh',
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '28px',
        },
        titleWrapper: {
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px',
            paddingBottom: '8px',
            width: 'fit-content',
        },
        titleMain: {
            fontSize: '2rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: 0,
        },
        titleSub: {
            fontSize: '2rem',
            fontWeight: 800,
            color: 'var(--text-secondary)',
            margin: 0,
        },
        backBtn: {
            padding: '10px 16px',
            background: 'var(--primary)',
            color: '#ffffff',
            border: '1px solid var(--primary)',
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
            borderRadius: '12px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
        },
        sectionHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 20px',
            background: 'linear-gradient(90deg, var(--primary), var(--primary-strong))',
            color: '#ffffff',
            fontWeight: 700,
            borderRadius: '12px 12px 0 0',
            margin: '0',
            marginTop: '0',
            fontSize: '0.95rem',
        },
        firstSection: {
            borderRadius: '12px 12px 0 0',
        },
        sectionContent: {
            padding: '20px',
            background: 'var(--surface-soft)',
            borderRadius: '0 0 12px 12px',
            marginBottom: '20px',
            border: '1px solid var(--border)',
            borderTop: 'none',
        },
        formGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            marginBottom: '16px',
        },
        formGrid2: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            marginBottom: '16px',
        },
        formGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
        },
        label: {
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
        },
        requiredMark: {
            color: 'var(--danger)',
        },
        input: {
            padding: '9px 11px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            fontSize: '0.85rem',
            outline: 'none',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit',
            background: 'var(--panel)',
            color: 'var(--text-primary)',
        },
        select: {
            padding: '9px 11px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            fontSize: '0.85rem',
            outline: 'none',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit',
            background: 'var(--panel)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
        },
        buttonGroup: {
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            padding: '20px',
            background: 'var(--surface-soft)',
            borderTop: '1px solid var(--border)',
        },
        submitBtn: {
            padding: '12px 36px',
            background: 'var(--primary)',
            color: '#ffffff',
            border: '1px solid var(--primary)',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            letterSpacing: '0.5px',
        },
        resetBtn: {
            padding: '12px 36px',
            background: 'var(--panel)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.9rem',
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
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.titleWrapper}>
                        <h1 style={styles.titleMain}>{isEditMode ? "Edit" : "Add New"}</h1>
                        <h2 style={styles.titleSub}>Customer</h2>
                    </div>
                    <button
                        style={styles.backBtn}
                        onClick={() => navigate('/admin/customer-management/customer-list')}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'var(--primary-strong)';
                            e.target.style.borderColor = 'var(--primary-strong)';
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 4px 12px rgba(74, 15, 26, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'var(--primary)';
                            e.target.style.color = '#ffffff';
                            e.target.style.borderColor = 'var(--primary)';
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = 'none';
                        }}
                    >
                        Customer List
                    </button>
                </div>

                {/* Form Container */}
                <div style={styles.formContainer}>
                    <form onSubmit={handleSubmit} autoComplete="off">
                        {/* ===== CUSTOMER BASIC INFORMATION ===== */}
                        <div style={{ ...styles.sectionHeader, ...styles.firstSection }}>
                            Customer Basic Information
                        </div>
                        <div style={styles.sectionContent}>
                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>
                                        First Name<span style={styles.requiredMark}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        placeholder="Enter Customer First Name"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        style={styles.input}
                                        autoComplete="new-username"
                                        required
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Last Name</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        placeholder="Enter Customer Last Name"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        style={styles.input}
                                        autoComplete="new-username"
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>
                                        Email<span style={styles.requiredMark}>*</span>
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="Email ID"
                                        value={formData.email}
                                        onChange={handleChange}
                                        style={styles.input}
                                        autoComplete="new-username"
                                        required
                                    />
                                </div>
                            </div>

                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>
                                        Mobile<span style={styles.requiredMark}>*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        name="mobile"
                                        placeholder="Mobile Number"
                                        value={formData.mobile}
                                        onChange={handleChange}
                                        style={styles.input}
                                        autoComplete="new-username"
                                        required
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Gender</label>
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        style={styles.select}
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>
                                        ALT. Mobile<span style={styles.requiredMark}>*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        name="altMobile"
                                        placeholder="ALT. Mobile Number"
                                        value={formData.altMobile}
                                        onChange={handleChange}
                                        style={styles.input}
                                        autoComplete="new-username"
                                        required
                                    />
                                </div>
                            </div>

                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Currency</label>
                                    <input
                                        type="text"
                                        value="INR"
                                        placeholder="INR"
                                        disabled
                                        style={{ ...styles.input, background: 'var(--surface-soft)', color: 'var(--text-muted)' }}
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        style={styles.select}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Wallet Status</label>
                                    <select
                                        name="walletStatus"
                                        value={formData.walletStatus}
                                        onChange={handleChange}
                                        style={styles.select}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>
                                        Login ID <span style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer' }} onClick={handleLoginIdClick}>(Click to Auto Fill)</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="loginId"
                                        placeholder="Login ID (Optional)"
                                        value={formData.loginId}
                                        onChange={handleChange}
                                        onClick={handleLoginIdClick}
                                        style={styles.input}
                                        autoComplete="new-username"
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>
                                        Password{!isEditMode && <span style={styles.requiredMark}>*</span>}
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        placeholder="Login Password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        style={styles.input}
                                        autoComplete="new-password"
                                        required={!isEditMode}
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>
                                        Confirm Password{!isEditMode && <span style={styles.requiredMark}>*</span>}
                                    </label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        placeholder="Confirm Password"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        style={styles.input}
                                        autoComplete="new-password"
                                        required={!isEditMode}
                                    />
                                </div>
                            </div>

                            <div style={styles.formGrid2}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Reffered By</label>
                                    <input
                                        type="text"
                                        name="refferedBy"
                                        placeholder="Enter Reffered By Name"
                                        value={formData.refferedBy}
                                        onChange={handleChange}
                                        style={styles.input}
                                        autoComplete="new-username"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ===== CONTACT INFORMATION ===== */}
                        <div style={styles.sectionHeader}>
                            Contact Information
                        </div>
                        <div style={styles.sectionContent}>
                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Address</label>
                                    <input
                                        type="text"
                                        name="address"
                                        placeholder="Enter Address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        style={styles.input}
                                        autoComplete="new-username"
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>City</label>
                                    <input
                                        type="text"
                                        name="city"
                                        placeholder="Enter city name"
                                        value={formData.city}
                                        onChange={handleChange}
                                        style={styles.input}
                                        autoComplete="new-username"
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>State</label>
                                    <input
                                        type="text"
                                        name="state"
                                        placeholder="Enter state name"
                                        value={formData.state}
                                        onChange={handleChange}
                                        style={styles.input}
                                        autoComplete="new-username"
                                    />
                                </div>
                            </div>

                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Country</label>
                                    <input
                                        type="text"
                                        name="country"
                                        placeholder="Enter Country Name"
                                        value={formData.country}
                                        onChange={handleChange}
                                        style={styles.input}
                                        autoComplete="new-username"
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Pincode</label>
                                    <input
                                        type="text"
                                        name="pincode"
                                        placeholder="Enter Pincode"
                                        value={formData.pincode}
                                        onChange={handleChange}
                                        style={styles.input}
                                        autoComplete="new-username"
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Remark</label>
                                    <input
                                        type="text"
                                        name="remark"
                                        placeholder="Enter Remark"
                                        value={formData.remark}
                                        onChange={handleChange}
                                        style={styles.input}
                                        autoComplete="new-username"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ===== DOCUMENTATION ===== */}
                        <div style={styles.sectionHeader}>
                            Documentation
                        </div>
                        <div style={styles.sectionContent}>
                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Aadhar Number</label>
                                    <input
                                        type="text"
                                        name="aadharNumber"
                                        placeholder="Aadhar Number"
                                        value={formData.aadharNumber}
                                        onChange={handleChange}
                                        style={styles.input}
                                        autoComplete="new-username"
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>PAN Number</label>
                                    <input
                                        type="text"
                                        name="panNumber"
                                        placeholder="PAN Number"
                                        value={formData.panNumber}
                                        onChange={handleChange}
                                        style={styles.input}
                                        autoComplete="new-username"
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>PAN Name</label>
                                    <input
                                        type="text"
                                        name="panName"
                                        placeholder="PAN Name"
                                        value={formData.panName}
                                        onChange={handleChange}
                                        style={styles.input}
                                        autoComplete="new-username"
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={styles.buttonGroup}>
                            <button type="button" style={styles.resetBtn} onClick={handleReset}>
                                Reset
                            </button>
                            <button type="submit" style={styles.submitBtn} disabled={isSubmitting}>
                                {isSubmitting ? "Saving..." : (isEditMode ? "Update Customer" : "Save Customer")}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

export default AddNewCustomer;
