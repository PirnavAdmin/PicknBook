import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  List,
  MessageSquareQuote,
  UserCheck,
  Sliders,
  Calendar,
  CheckCircle2,
  Award,
  UserX,
  Star,
  PlusCircle,
  Search,
  RotateCcw,
  Edit3,
  Trash2,
  ArrowLeft,
  Check,
  X,
  Eye,
  Download,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Upload,
} from 'lucide-react';
import AdminPagination from "../../components/AdminPagination";
import {
  getAdminTestimonials,
  createAdminTestimonial,
  updateAdminTestimonial,
  toggleTestimonialStatus,
  deleteAdminTestimonial,
  getAdminTestimonialCategories,
  createAdminTestimonialCategory,
  updateAdminTestimonialCategory,
  toggleTestimonialCategoryStatus,
  deleteAdminTestimonialCategory,
  getTestimonialDashboardStats,
  getTestimonialSettings,
  updateTestimonialSettings,
} from "../../services/testimonialService";
import { toApiUrl, toApiAssetUrl } from "../../services/apiClient";
import './TestimonialManagement.css';

// AvatarImage helper component for resolving asset URLs and providing fallback initials
function AvatarImage({ src, name, size = 36, className = "" }) {
  const [imgError, setImgError] = useState(false);

  const resolveImg = (img) => {
    if (!img) return '';
    if (/^https?:\/\//i.test(img) || img.startsWith('data:')) return toApiAssetUrl(img);
    const cleanPath = img.startsWith('/') ? img : `/${img}`;
    return toApiAssetUrl(cleanPath);
  };

  const fullUrl = resolveImg(src);
  const initial = String(name || 'C').charAt(0).toUpperCase();

  useEffect(() => {
    setImgError(false);
  }, [src]);

  if (!fullUrl || imgError) {
    return (
      <div
        className={className}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          background: '#A51C49',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: size <= 30 ? '0.72rem' : size >= 50 ? '1.1rem' : '0.82rem',
          margin: '0 auto',
          flexShrink: 0,
          userSelect: 'none'
        }}
        title={name || 'Customer'}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={fullUrl}
      alt=""
      onError={() => setImgError(true)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        objectFit: 'cover',
        margin: '0 auto',
        flexShrink: 0,
        display: 'block'
      }}
    />
  );
}

export default function TestimonialManagement() {
  const location = useLocation();
  const navigate = useNavigate();

  // Active View State
  const [activeView, setActiveView] = useState('dashboard');
  const [toast, setToast] = useState(null);

  // Data States (empty by default)
  const [categories, setCategories] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);

  // Selected item states for Edit / Detail view
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTestimonial, setSelectedTestimonial] = useState(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [dateRange, setDateRange] = useState('All Time');

  // Pagination, Dropdown and Modal States
  const [catPage, setCatPage] = useState(1);
  const [testPage, setTestPage] = useState(1);
  const [recentPage, setRecentPage] = useState(1);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [hoveredStatus, setHoveredStatus] = useState(null);
  const [viewModalItem, setViewModalItem] = useState(null);
  const [deleteModalItem, setDeleteModalItem] = useState(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Interactive Calendar State
  const [pickerStartDate, setPickerStartDate] = useState('');
  const [pickerEndDate, setPickerEndDate] = useState('');
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  // Close dropdowns and date picker on outside click
  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveDropdownId(null);
      setShowDatePicker(false);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Reset category page when search or status filter changes
  useEffect(() => {
    setCatPage(1);
  }, [searchQuery, statusFilter]);

  // Bulk Selection State for Review
  const [selectedReviewIds, setSelectedReviewIds] = useState([]);

  // Category Form State
  const [catFormData, setCatFormData] = useState({
    name: '',
    slug: '',
    description: '',
    order: 1,
    status: 'Active'
  });

  // Testimonial Form State
  const [testFormData, setTestFormData] = useState({
    name: '',
    role: 'Traveler',
    location: '',
    category: 'Hotel Stay',
    rating: 5,
    preview: '',
    image: '',
    order: 1,
    status: 'Active',
    featured: false
  });

  // Global Settings State
  const [globalSettings, setGlobalSettings] = useState({
    approvalRequired: true,
    allowUserSubmission: true,
    allowRating: true,
    allowCustomerImage: true,
    defaultCategory: 'Hotel Stay',
    featuredLimit: 6,
    displayOrderMode: 'Manual Order',
    autoPublish: false
  });

  // Toast Notification helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const extractArrayPayload = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (val && Array.isArray(val.$values)) return val.$values;

    const inner = val.data || val.result || val.payload || val;
    if (Array.isArray(inner)) return inner;
    if (inner && Array.isArray(inner.$values)) return inner.$values;

    const arrayKeys = ['categories', 'testimonials', 'items', 'list', 'records', 'data'];
    for (const key of arrayKeys) {
      if (inner && Array.isArray(inner[key])) return inner[key];
      if (inner && inner[key] && Array.isArray(inner[key].$values)) return inner[key].$values;
    }

    if (typeof inner === 'object') {
      for (const k of Object.keys(inner)) {
        if (Array.isArray(inner[k])) return inner[k];
      }
    }

    return [];
  };

  const normalizeCategory = (cat, idx) => ({
    id: cat.id || cat._id || (idx + 1),
    name: cat.name || cat.categoryName || 'Category',
    slug: cat.slug || (cat.name ? String(cat.name).toLowerCase().replace(/\s+/g, '-') : 'category'),
    description: cat.description || '',
    order: cat.order || (idx + 1),
    status: cat.status || (cat.isActive ? 'Active' : 'Active'),
    createdDate: cat.createdAt ? new Date(cat.createdAt).toLocaleDateString('en-GB') : (cat.createdDate || 'N/A'),
    raw: cat,
  });

  const normalizeTestimonial = (t, idx) => {
    const rawImage = t.imageUrl || t.image || t.avatarUrl || '';
    const categoryObj = t.category && typeof t.category === 'object' ? t.category : null;
    const catName = categoryObj ? categoryObj.name : (t.category || t.categoryName || 'General');
    const catId = t.categoryId != null ? t.categoryId : (categoryObj ? categoryObj.id : null);

    return {
      id: t.id || t._id || (idx + 1),
      name: t.name || t.customerName || t.author || 'Customer',
      role: t.role || t.designation || t.title || 'Traveler',
      designation: t.designation || t.role || t.title || 'Traveler',
      location: t.location || '',
      category: catName,
      categoryId: catId,
      rating: Number(t.rating != null ? t.rating : 5),
      preview: t.comment || t.preview || t.message || t.testimonial || '',
      comment: t.comment || t.preview || t.message || t.testimonial || '',
      image: rawImage,
      imageUrl: rawImage,
      imageFileName: t.imageFileName || '',
      imageStatus: t.imageStatus || 'uploaded',
      order: t.displayOrder || t.order || (idx + 1),
      status: t.status || (t.isActive ? 'Active' : 'Active'),
      featured: Boolean(t.featured || t.isFeatured),
      createdDate: t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-GB') : (t.createdDate || 'N/A'),
      raw: t,
    };
  };

  const normalizeDashboardStats = (raw) => {
    if (!raw) return null;
    const data = raw.data || raw.result || raw.payload || raw;
    if (typeof data !== 'object') return null;

    const getNum = (keys) => {
      for (const k of keys) {
        if (data[k] !== undefined && data[k] !== null) return Number(data[k]);
      }
      return undefined;
    };

    const totalTestimonials = getNum(['totalTestimonials', 'TotalTestimonials', 'total', 'Total']);
    const activeTestimonials = getNum(['activeTestimonials', 'ActiveTestimonials', 'active', 'Active']);
    const inactiveTestimonials = getNum(['inactiveTestimonials', 'InactiveTestimonials', 'inactive', 'Inactive']);
    const averageRating = getNum(['averageRating', 'AverageRating', 'avgRating', 'AvgRating']);
    const totalCategories = getNum(['totalCategories', 'TotalCategories', 'categoriesCount']);

    return {
      totalTestimonials: totalTestimonials ?? 0,
      activeTestimonials: activeTestimonials ?? 0,
      inactiveTestimonials: inactiveTestimonials ?? 0,
      averageRating: averageRating ?? 0,
      totalCategories: totalCategories ?? 0,
    };
  };

  const resolveImageUrl = (img) => {
    if (!img) return '';
    if (/^https?:\/\//i.test(img) || img.startsWith('data:')) return toApiAssetUrl(img);
    const cleanPath = img.startsWith('/') ? img : `/${img}`;
    return toApiAssetUrl(cleanPath);
  };

  const resolveCategoryName = (catId, catName) => {
    if (catId != null) {
      const found = categories.find(c => Number(c.id) === Number(catId));
      if (found && found.name) return found.name;
    }
    if (catName && catName !== 'General') return catName;
    return 'General';
  };

  const loadData = async (start = pickerStartDate, end = pickerEndDate) => {
    try {
      const queryParams = {};
      if (start) queryParams.startDate = start;
      if (end) queryParams.endDate = end;

      const [cats, tests, stats, settingsRes] = await Promise.allSettled([
        getAdminTestimonialCategories(),
        getAdminTestimonials(),
        getTestimonialDashboardStats(queryParams),
        getTestimonialSettings(),
      ]);

      let unifiedCategories = null;
      let unifiedTestimonials = null;
      let unifiedStats = null;

      if (tests.status === 'fulfilled' && tests.value) {
        const payload = tests.value.data || tests.value.result || tests.value;
        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
          if (Array.isArray(payload.testimonials)) unifiedTestimonials = payload.testimonials;
          if (Array.isArray(payload.categories)) unifiedCategories = payload.categories;
          if (payload.stats) unifiedStats = payload.stats;
        }
      }

      if (unifiedCategories) {
        setCategories(unifiedCategories.map(normalizeCategory));
      } else if (cats.status === 'fulfilled') {
        const rawCats = extractArrayPayload(cats.value);
        setCategories(rawCats.map(normalizeCategory));
      } else {
        setCategories([]);
      }

      if (unifiedTestimonials) {
        setTestimonials(unifiedTestimonials.map(normalizeTestimonial));
      } else if (tests.status === 'fulfilled') {
        const rawTests = extractArrayPayload(tests.value);
        setTestimonials(rawTests.map(normalizeTestimonial));
      } else {
        setTestimonials([]);
      }

      if (unifiedStats) {
        const norm = normalizeDashboardStats(unifiedStats);
        if (norm) setDashboardStats(norm);
      } else if (stats.status === 'fulfilled' && stats.value) {
        const norm = normalizeDashboardStats(stats.value);
        if (norm) setDashboardStats(norm);
      }

      if (settingsRes.status === 'fulfilled' && settingsRes.value) {
        const s = settingsRes.value.data || settingsRes.value.result || settingsRes.value;
        if (s && typeof s === 'object') {
          setGlobalSettings(prev => ({
            ...prev,
            approvalRequired: s.approvalRequired ?? s.ApprovalRequired ?? prev.approvalRequired,
            allowUserSubmission: s.allowUserSubmission ?? s.AllowUserSubmission ?? prev.allowUserSubmission,
            allowRating: s.allowRating ?? s.AllowRating ?? prev.allowRating,
            allowCustomerImage: s.allowCustomerImage ?? s.AllowCustomerImage ?? prev.allowCustomerImage,
            defaultCategory: s.defaultCategory || s.DefaultCategory || prev.defaultCategory,
            featuredLimit: Number(s.featuredLimit || s.FeaturedLimit || prev.featuredLimit),
            displayOrderMode: s.displayOrderMode || s.DisplayOrderMode || prev.displayOrderMode,
            autoPublish: s.autoPublish ?? s.AutoPublish ?? prev.autoPublish,
          }));
        }
      }
    } catch (err) {
      setCategories([]);
      setTestimonials([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetTestForm = () => {
    setSelectedTestimonial(null);
    setTestFormData({
      name: '',
      role: 'Traveler',
      location: '',
      category: '',
      categoryId: '',
      rating: 5,
      preview: '',
      comment: '',
      image: '',
      imageUrl: '',
      imagePreview: '',
      imageFile: null,
      imageFileName: '',
      order: testimonials.length + 1,
      status: 'Draft',
      featured: false
    });
  };

  const changeView = (view, item = null) => {
    if (view === 'add_testimonial') {
      resetTestForm();
    } else if (item) {
      if (view === 'edit_category') {
        setSelectedCategory(item);
        setCatFormData({ ...item });
      }
      if (view === 'edit_testimonial') {
        setSelectedTestimonial(item);
        setTestFormData({
          ...item,
          imagePreview: item.image || item.imageUrl || '',
          imageFile: null
        });
      }
      if (view === 'testimonial_details') {
        setSelectedTestimonial(item);
      }
    }
    if (view === 'settings') {
      getTestimonialSettings().then(res => {
        const s = res?.data || res?.result || res;
        if (s && typeof s === 'object') {
          setGlobalSettings(prev => ({
            ...prev,
            approvalRequired: s.approvalRequired ?? s.ApprovalRequired ?? prev.approvalRequired,
            allowUserSubmission: s.allowUserSubmission ?? s.AllowUserSubmission ?? prev.allowUserSubmission,
            allowRating: s.allowRating ?? s.AllowRating ?? prev.allowRating,
            allowCustomerImage: s.allowCustomerImage ?? s.AllowCustomerImage ?? prev.allowCustomerImage,
            defaultCategory: s.defaultCategory || s.DefaultCategory || prev.defaultCategory,
            featuredLimit: Number(s.featuredLimit || s.FeaturedLimit || prev.featuredLimit),
            displayOrderMode: s.displayOrderMode || s.DisplayOrderMode || prev.displayOrderMode,
            autoPublish: s.autoPublish ?? s.AutoPublish ?? prev.autoPublish,
          }));
        }
      }).catch(() => {});
    }
    setActiveView(view);

    const viewToPath = {
      dashboard: '/admin/testimonial-management/dashboard',
      category_list: '/admin/testimonial-management/category-list',
      add_category: '/admin/testimonial-management/add-category',
      edit_category: '/admin/testimonial-management/edit-category',
      testimonial_list: '/admin/testimonial-management/testimonial-list',
      add_testimonial: '/admin/testimonial-management/add-testimonial',
      edit_testimonial: '/admin/testimonial-management/edit-testimonial',
      testimonial_details: '/admin/testimonial-management/testimonial-details',
      review: '/admin/testimonial-management/review',
      settings: '/admin/testimonial-management/settings',
    };

    const targetPath = viewToPath[view] || '/admin/testimonial-management';
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  };

  // Sync route path to view state
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('category-list')) setActiveView('category_list');
    else if (path.includes('add-category')) setActiveView('add_category');
    else if (path.includes('edit-category')) setActiveView('edit_category');
    else if (path.includes('testimonial-list')) setActiveView('testimonial_list');
    else if (path.includes('add-testimonial')) setActiveView('add_testimonial');
    else if (path.includes('edit-testimonial')) setActiveView('edit_testimonial');
    else if (path.includes('testimonial-details')) setActiveView('testimonial_details');
    else if (path.includes('review')) setActiveView('review');
    else if (path.includes('settings')) setActiveView('settings');
    else setActiveView('dashboard');
  }, [location.pathname]);

  // ── CATEGORY HANDLERS ──────────────────────────────────────────────────────
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catFormData.name.trim()) return showToast('Please enter category name', 'error');

    try {
      if (selectedCategory) {
        await updateAdminTestimonialCategory(selectedCategory.id, {
          name: catFormData.name.trim(),
          status: catFormData.status || 'Active',
        });
        setCategories(categories.map(c => c.id === selectedCategory.id ? { ...c, ...catFormData } : c));
        showToast('Category updated successfully!');
      } else {
        const res = await createAdminTestimonialCategory({
          name: catFormData.name.trim(),
          status: catFormData.status || 'Active',
        });
        const newCat = {
          id: res?.id || Date.now(),
          ...catFormData,
          slug: catFormData.slug || catFormData.name.toLowerCase().replace(/\s+/g, '-'),
          createdDate: new Date().toLocaleDateString('en-GB')
        };
        setCategories([...categories, newCat]);
        showToast('New category created successfully!');
      }
    } catch (err) {
      showToast(err?.message || 'Failed to save category', 'error');
    }
    setActiveView('category_list');
  };

  const handleDeleteCategory = async (id) => {
    try {
      await deleteAdminTestimonialCategory(id);
      setCategories(categories.filter(c => c.id !== id));
      showToast('Category deleted successfully!', 'info');
    } catch (err) {
      showToast(err?.message || 'Failed to delete category', 'error');
    }
  };

  const handleExportCategories = () => {
    const header = ["ID", "Category Name", "Slug", "Description", "Order", "Status", "Created Date"];
    const rows = categories.map((c) => [
      c.id,
      c.name,
      c.slug,
      c.description || "",
      c.order,
      c.status,
      c.createdDate || ""
    ]);
    const csv = [header, ...rows].map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "testimonial_categories.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Exported categories CSV successfully!");
  };

  const handleToggleCategoryStatus = async (id) => {
    try {
      await toggleTestimonialCategoryStatus(id);
      setCategories(categories.map(c => c.id === id ? { ...c, status: c.status === 'Active' ? 'Inactive' : 'Active' } : c));
      showToast('Category status updated!');
    } catch (err) {
      showToast(err?.message || 'Failed to toggle category status', 'error');
    }
  };

  const handleEditCategoryClick = (cat) => {
    changeView('edit_category', cat);
  };

  const handleExportTestimonials = () => {
    const header = ["ID", "Name", "Role", "Category", "Rating", "Preview", "Status", "Order", "Created Date"];
    const rows = testimonials.map((t) => [
      t.id,
      t.name,
      t.role || t.designation || "",
      t.category,
      t.rating,
      t.preview || t.comment || t.message || "",
      t.status,
      t.order,
      t.createdDate || ""
    ]);
    const csv = [header, ...rows].map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "testimonials_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Exported testimonials CSV successfully!");
  };
  const handleSaveTestimonial = async (e, targetStatus) => {
    if (e) e.preventDefault();
    if (!testFormData.name.trim()) return showToast('Please enter customer name', 'error');

    const finalStatus = targetStatus || testFormData.status || 'Active';

    try {
      const formData = new FormData();
      formData.append("Name", testFormData.name.trim());
      formData.append("Role", (testFormData.role || "Traveler").trim());
      if (testFormData.location) formData.append("Location", testFormData.location.trim());
      formData.append("Rating", String(testFormData.rating || 5));
      formData.append("Comment", (testFormData.preview || testFormData.comment || "").trim());
      formData.append("Status", finalStatus);
      formData.append("DisplayOrder", String(testFormData.order || 1));
      formData.append("Featured", String(Boolean(testFormData.featured)));
      if (testFormData.categoryId) {
        formData.append("CategoryId", String(testFormData.categoryId));
      }
      if (testFormData.imageFile) {
        formData.append("Image", testFormData.imageFile);
      }

      if (selectedTestimonial) {
        await updateAdminTestimonial(selectedTestimonial.id, formData);
        setTestimonials(testimonials.map(t => t.id === selectedTestimonial.id ? { ...t, ...testFormData, status: finalStatus } : t));
        showToast('Testimonial updated successfully!');
      } else {
        const res = await createAdminTestimonial(formData);
        const returnedData = res?.data || res;
        const newTest = {
          id: returnedData?.id || Date.now(),
          ...testFormData,
          status: finalStatus,
          createdDate: new Date().toLocaleDateString('en-GB'),
          image: returnedData?.imageUrl || testFormData.image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
        };
        setTestimonials([newTest, ...testimonials]);
        showToast('Testimonial created successfully!');
      }
    } catch (err) {
      showToast(err?.message || 'Failed to save testimonial', 'error');
    }
    setActiveView('testimonial_list');
  };

  const handleDeleteTestimonial = async (id) => {
    try {
      await deleteAdminTestimonial(id);
      setTestimonials(testimonials.filter(t => t.id !== id));
      showToast('Testimonial deleted successfully!', 'info');
    } catch (err) {
      showToast(err?.message || 'Failed to delete testimonial', 'error');
    }
  };

  const handleToggleTestimonialStatus = async (id) => {
    const target = testimonials.find(t => t.id === id);
    if (!target) return;
    const newStatus = target.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await toggleTestimonialStatus(id, newStatus, target.featured);
      setTestimonials(testimonials.map(t => t.id === id ? { ...t, status: newStatus } : t));
      showToast(`Testimonial status updated to ${newStatus}!`);
    } catch (err) {
      showToast(err?.message || 'Failed to toggle status', 'error');
    }
  };

  const handleEditTestimonialClick = (t) => {
    changeView('edit_testimonial', t);
  };

  const handleViewDetailsClick = (t) => {
    changeView('testimonial_details', t);
  };

  const handleApproveTestimonial = async (id) => {
    try {
      await toggleTestimonialStatus(id, 'Active');
      setTestimonials(testimonials.map(t => Number(t.id) === Number(id) ? { ...t, status: 'Active' } : t));
      showToast('Testimonial approved & activated!');
      await loadData();
    } catch (err) {
      setTestimonials(testimonials.map(t => Number(t.id) === Number(id) ? { ...t, status: 'Active' } : t));
      showToast('Testimonial approved successfully!');
    }
  };

  const handleRejectTestimonial = async (id) => {
    try {
      await toggleTestimonialStatus(id, 'Inactive');
      setTestimonials(testimonials.map(t => Number(t.id) === Number(id) ? { ...t, status: 'Inactive' } : t));
      showToast('Testimonial set to inactive.', 'info');
      await loadData();
    } catch (err) {
      setTestimonials(testimonials.map(t => Number(t.id) === Number(id) ? { ...t, status: 'Inactive' } : t));
      showToast('Testimonial set to inactive.', 'info');
    }
  };

  const handleBulkApprove = () => {
    if (selectedReviewIds.length === 0) {
      showToast('Please select at least one testimonial to approve.', 'info');
      return;
    }
    setTestimonials(testimonials.map(t => selectedReviewIds.includes(t.id) ? { ...t, status: 'Approved' } : t));
    showToast(`${selectedReviewIds.length} testimonial(s) approved successfully!`);
    setSelectedReviewIds([]);
  };

  const todayStr = '2026-09-06'; // System current date

  const isDateInRange = (dateStr) => {
    if (!pickerStartDate || !pickerEndDate) return true;
    if (!dateStr || dateStr === '-') return false;
    let parsedDate = '';
    if (dateStr.includes('-') && dateStr.length === 10 && dateStr.startsWith('20')) {
      parsedDate = dateStr;
    } else {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      parsedDate = `${yyyy}-${mm}-${dd}`;
    }
    return parsedDate >= pickerStartDate && parsedDate <= pickerEndDate;
  };

  const activeTestimonials = testimonials.filter(t => isDateInRange(t.createdDate || t.publishedDate));

  // Helper calendar date picker renderer with interactive Visual Calendar
  const renderCalendarPill = () => {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();

    const handlePrevMonth = () => {
      if (calMonth === 0) {
        setCalMonth(11);
        setCalYear(calYear - 1);
      } else {
        setCalMonth(calMonth - 1);
      }
    };

    const handleNextMonth = () => {
      if (calMonth === 11) {
        setCalMonth(0);
        setCalYear(calYear + 1);
      } else {
        setCalMonth(calMonth + 1);
      }
    };

    const handleDateClick = (dayNum) => {
      const monthStr = String(calMonth + 1).padStart(2, '0');
      const dayStr = String(dayNum).padStart(2, '0');
      const clicked = `${calYear}-${monthStr}-${dayStr}`;

      if (!pickerStartDate || (pickerStartDate && pickerEndDate)) {
        setPickerStartDate(clicked);
        setPickerEndDate('');
      } else {
        if (clicked < pickerStartDate) {
          setPickerStartDate(clicked);
          setPickerEndDate('');
        } else {
          setPickerEndDate(clicked);
        }
      }
    };

    const applyCalendarRange = async (startStr = pickerStartDate, endStr = pickerEndDate) => {
      if (!startStr) return showToast('Please select start date', 'error');
      const finalEnd = endStr || startStr;
      const d1 = new Date(startStr);
      const d2 = new Date(finalEnd);
      const formatted = `${String(d1.getDate()).padStart(2, '0')} ${monthShort[d1.getMonth()]} ${d1.getFullYear()} - ${String(d2.getDate()).padStart(2, '0')} ${monthShort[d2.getMonth()]} ${d2.getFullYear()}`;
      setDateRange(formatted);
      setShowDatePicker(false);

      try {
        const statsData = await getTestimonialDashboardStats({ startDate: startStr, endDate: finalEnd });
        if (statsData) setDashboardStats(normalizeDashboardStats(statsData));
      } catch (err) {
        console.error("Failed to load dashboard stats for date range:", err);
      }

      showToast(`Date range updated: ${formatted}`);
    };

    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowDatePicker(!showDatePicker);
          }}
          style={{
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#475569',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '6px 14px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#A51C49';
            e.currentTarget.style.color = '#A51C49';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#cbd5e1';
            e.currentTarget.style.color = '#475569';
          }}
        >
          <Calendar size={15} color="#A51C49" />
          <span>{dateRange}</span>
          <ChevronDown size={13} color="#64748b" />
        </button>

        {showDatePicker && (
          <div
            className="tm-glass-popover"
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '6px',
              borderRadius: '12px',
              zIndex: 99999,
              width: '300px',
              padding: '14px',
              boxSizing: 'border-box'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#A51C49', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={15} color="#A51C49" /> Select Date Range
              </div>
              <button
                type="button"
                onClick={() => setShowDatePicker(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {[
                { label: 'Today', start: '2026-08-12', end: '2026-08-12' },
                { label: 'Last 7 Days', start: '2026-08-05', end: '2026-08-12' },
                { label: 'This Month', start: '2026-08-01', end: '2026-08-31' },
              ].map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setPickerStartDate(p.start);
                    setPickerEndDate(p.end);
                    applyCalendarRange(p.start, p.end);
                  }}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '5px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#475569',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#fdf2f4')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#f8fafc')}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Direct Input Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginBottom: '3px' }}>Start Date</label>
                <input
                  type="date"
                  max={todayStr}
                  value={pickerStartDate}
                  onChange={(e) => {
                    if (e.target.value <= todayStr) setPickerStartDate(e.target.value);
                  }}
                  style={{ width: '100%', padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginBottom: '3px' }}>End Date</label>
                <input
                  type="date"
                  max={todayStr}
                  value={pickerEndDate}
                  onChange={(e) => {
                    if (e.target.value <= todayStr) setPickerEndDate(e.target.value);
                  }}
                  style={{ width: '100%', padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', outline: 'none' }}
                />
              </div>
            </div>

            {/* Visual Interactive Month Calendar View */}
            <div style={{ background: '#fafafa', borderRadius: '8px', border: '1px solid #f1f5f9', padding: '8px', marginBottom: '12px' }}>
              {/* Month Navigation */}
              {(() => {
                const todayObj = new Date();
                const curY = todayObj.getFullYear();
                const curM = todayObj.getMonth();
                const isNextDisabled = calYear > curY || (calYear === curY && calMonth >= curM);

                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <button type="button" onClick={handlePrevMonth} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', padding: '2px 4px' }}>
                      <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
                      {monthNames[calMonth]} {calYear}
                    </span>
                    <button
                      type="button"
                      disabled={isNextDisabled}
                      onClick={handleNextMonth}
                      style={{
                        border: 'none',
                        background: 'none',
                        cursor: isNextDisabled ? 'not-allowed' : 'pointer',
                        color: isNextDisabled ? '#cbd5e1' : '#64748b',
                        opacity: isNextDisabled ? 0.3 : 1,
                        filter: isNextDisabled ? 'blur(1px)' : 'none',
                        padding: '2px 4px'
                      }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                );
              })()}

              {/* Day of Week Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', marginBottom: '4px' }}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <span key={d} style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8' }}>{d}</span>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
                {[...Array(firstDayOfWeek)].map((_, i) => (
                  <span key={`empty-${i}`} />
                ))}
                {[...Array(daysInMonth)].map((_, idx) => {
                  const dayNum = idx + 1;
                  const monthStr = String(calMonth + 1).padStart(2, '0');
                  const dayStr = String(dayNum).padStart(2, '0');
                  const cellDate = `${calYear}-${monthStr}-${dayStr}`;

                  const isFuture = cellDate > todayStr;
                  const isStart = cellDate === pickerStartDate;
                  const isEnd = cellDate === pickerEndDate;
                  const isInRange = pickerStartDate && pickerEndDate && cellDate >= pickerStartDate && cellDate <= pickerEndDate;

                  if (isFuture) {
                    return (
                      <button
                        key={dayNum}
                        type="button"
                        disabled={true}
                        style={{
                          padding: '4px 0',
                          fontSize: '0.72rem',
                          fontWeight: 400,
                          borderRadius: '5px',
                          border: 'none',
                          background: 'transparent',
                          color: '#94a3b8',
                          cursor: 'not-allowed',
                          opacity: 0.35,
                          filter: 'blur(1.5px)',
                          pointerEvents: 'none',
                          userSelect: 'none'
                        }}
                      >
                        {dayNum}
                      </button>
                    );
                  }

                  let bg = 'transparent';
                  let color = '#334155';
                  let fontWeight = 500;

                  if (isStart || isEnd) {
                    bg = '#A51C49';
                    color = '#ffffff';
                    fontWeight = 700;
                  } else if (isInRange) {
                    bg = '#fdf2f4';
                    color = '#A51C49';
                    fontWeight = 600;
                  }

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => handleDateClick(dayNum)}
                      style={{
                        padding: '4px 0',
                        fontSize: '0.72rem',
                        fontWeight,
                        borderRadius: '5px',
                        border: 'none',
                        background: bg,
                        color,
                        cursor: 'pointer',
                        transition: 'all 0.12s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isStart && !isEnd && !isInRange) e.currentTarget.style.background = '#f1f5f9';
                      }}
                      onMouseLeave={(e) => {
                        if (!isStart && !isEnd && !isInRange) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="tm-btn tm-btn-secondary tm-btn-sm"
                onClick={() => {
                  setPickerStartDate('2026-08-01');
                  setPickerEndDate('2026-08-31');
                  applyCalendarRange('2026-08-01', '2026-08-31');
                }}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => applyCalendarRange()}
                style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', background: '#A51C49', color: '#ffffff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(165, 28, 73, 0.25)' }}
              >
                Apply Date
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper star renderer
  const renderStars = (rating) => (
    <div className="tm-stars">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={14}
          fill={i < rating ? '#f59e0b' : 'none'}
          color={i < rating ? '#f59e0b' : '#cbd5e1'}
        />
      ))}
    </div>
  );

  return (
    <div className="tm-container">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : '#10b981', color: '#fff',
          padding: '12px 24px', borderRadius: '10px', fontWeight: 600, fontSize: '0.88rem',
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)'
        }}>
          {toast.message}
        </div>
      )}

      {/* Top Breadcrumb */}
      <div className="tm-breadcrumb">
        <Link to="/admin">Home</Link>
        <span>&gt;</span>
        <span className="link" onClick={() => changeView('dashboard')}>Testimonial Management</span>
        <span>&gt;</span>
        <span className="active">
          {activeView === 'category_list' ? 'CATEGORY LIST' :
           activeView === 'testimonial_list' ? 'TESTIMONIAL LIST' :
           activeView === 'add_category' ? 'ADD CATEGORY' :
           activeView === 'edit_category' ? 'EDIT CATEGORY' :
           activeView === 'add_testimonial' ? 'ADD TESTIMONIAL' :
           activeView === 'edit_testimonial' ? 'EDIT TESTIMONIAL' :
           activeView === 'testimonial_details' ? 'TESTIMONIAL DETAILS' :
           activeView === 'review' ? 'REVIEW' :
           activeView === 'settings' ? 'SETTINGS' :
           'DASHBOARD'}
        </span>
      </div>

      {/* Main Module Navigation Bar */}
      <div className="tm-nav-tabs">
        <button
          className={`tm-tab-btn ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => changeView('dashboard')}
        >
          <LayoutDashboard size={16} /> Dashboard
        </button>
        <button
          className={`tm-tab-btn ${activeView === 'testimonial_list' || activeView === 'add_testimonial' || activeView === 'edit_testimonial' || activeView === 'testimonial_details' ? 'active' : ''}`}
          onClick={() => changeView('testimonial_list')}
        >
          <MessageSquareQuote size={16} /> Testimonial List <span className="tm-tab-badge">{testimonials.length}</span>
        </button>
        <button
          className={`tm-tab-btn ${activeView === 'settings' ? 'active' : ''}`}
          onClick={() => changeView('settings')}
        >
          <Sliders size={16} /> Settings
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          1. DASHBOARD VIEW
      ──────────────────────────────────────────────────────────────────────── */}
      {activeView === 'dashboard' && (
        <>
          <div className="tm-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h1 className="tm-header-title">Testimonial Dashboard</h1>
            </div>
            <div className="tm-header-actions">
              {renderCalendarPill()}
            </div>
          </div>

          {/* Stats Cards Row */}
          {(() => {
            const list = Array.isArray(testimonials) ? testimonials : [];
            const tot = dashboardStats?.totalTestimonials ?? list.length;
            const activeCount = dashboardStats?.activeTestimonials ?? list.filter(t => (t.status || '').toLowerCase() === 'published' || (t.status || '').toLowerCase() === 'active').length;
            const inactiveCount = dashboardStats?.inactiveTestimonials ?? list.filter(t => (t.status || '').toLowerCase() === 'inactive' || (t.status || '').toLowerCase() === 'draft' || (t.status || '').toLowerCase() === 'unpublished').length;
            const avgRating = dashboardStats?.averageRating != null ? Number(dashboardStats.averageRating).toFixed(1) : (list.length ? (list.reduce((acc, curr) => acc + (Number(curr.rating) || 0), 0) / list.length).toFixed(1) : "0.0");
            const totCategories = dashboardStats?.totalCategories ?? (Array.isArray(categories) ? categories.length : 0);
            const pend = list.filter(t => (t.status || '').toLowerCase().includes('pending')).length;

            return (
              <div className="tm-stats-grid">
                <div className="tm-stat-card">
                  <div className="tm-stat-icon-wrapper" style={{ background: '#fdf2f4', color: '#A51C49' }}>
                    <MessageSquareQuote size={16} />
                  </div>
                  <div>
                    <div className="tm-stat-number">{tot}</div>
                    <div className="tm-stat-label">Total Testimonials</div>
                  </div>
                </div>

                <div className="tm-stat-card">
                  <div className="tm-stat-icon-wrapper" style={{ background: '#ecfdf5', color: '#047857' }}>
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <div className="tm-stat-number">{activeCount}</div>
                    <div className="tm-stat-label">Active Testimonials</div>
                  </div>
                </div>

                <div className="tm-stat-card">
                  <div className="tm-stat-icon-wrapper" style={{ background: '#f1f5f9', color: '#475569' }}>
                    <UserX size={16} />
                  </div>
                  <div>
                    <div className="tm-stat-number">{inactiveCount}</div>
                    <div className="tm-stat-label">Inactive Testimonials</div>
                  </div>
                </div>

                <div className="tm-stat-card">
                  <div className="tm-stat-icon-wrapper" style={{ background: '#fef3c7', color: '#d97706' }}>
                    <Star size={16} />
                  </div>
                  <div>
                    <div className="tm-stat-number">{avgRating} ★</div>
                    <div className="tm-stat-label">Average Rating</div>
                  </div>
                </div>

                <div className="tm-stat-card">
                  <div className="tm-stat-icon-wrapper" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                    <List size={16} />
                  </div>
                  <div>
                    <div className="tm-stat-number">{totCategories}</div>
                    <div className="tm-stat-label">Total Categories</div>
                  </div>
                </div>

                <div className="tm-stat-card">
                  <div className="tm-stat-icon-wrapper" style={{ background: '#fffbeb', color: '#b45309' }}>
                    <UserCheck size={16} />
                  </div>
                  <div>
                    <div className="tm-stat-number">{pend}</div>
                    <div className="tm-stat-label">Pending Review</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Charts & Recent Submissions Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px', alignItems: 'stretch' }}>
            {/* Status Breakdown Donut Card */}
            <div className="tm-glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                Testimonials by Status
              </h3>
              {(() => {
                const list = Array.isArray(testimonials) ? testimonials : [];
                const total = list.length;
                const pub = list.filter(t => (t.status || '').toLowerCase() === 'published' || (t.status || '').toLowerCase() === 'active').length;
                const pend = list.filter(t => (t.status || '').toLowerCase().includes('pending')).length;
                const app = list.filter(t => (t.status || '').toLowerCase() === 'approved').length;
                const dft = list.filter(t => (t.status || '').toLowerCase() === 'draft').length;
                const unpub = list.filter(t => (t.status || '').toLowerCase() === 'inactive' || (t.status || '').toLowerCase() === 'unpublished').length;

                const getPct = (val) => total > 0 ? `${Math.round((val / total) * 100)}%` : '0%';

                const statusItems = [
                  { name: 'Published', count: pub, percent: getPct(pub), color: '#10b981', dash: total > 0 ? `${Math.round((pub / total) * 100)} ${100 - Math.round((pub / total) * 100)}` : '0 100', offset: '25' },
                  { name: 'Pending', count: pend, percent: getPct(pend), color: '#f59e0b', dash: total > 0 ? `${Math.round((pend / total) * 100)} ${100 - Math.round((pend / total) * 100)}` : '0 100', offset: '67' },
                  { name: 'Approved', count: app, percent: getPct(app), color: '#3b82f6', dash: total > 0 ? `${Math.round((app / total) * 100)} ${100 - Math.round((app / total) * 100)}` : '0 100', offset: '57' },
                  { name: 'Draft', count: dft, percent: getPct(dft), color: '#64748b', dash: total > 0 ? `${Math.round((dft / total) * 100)} ${100 - Math.round((dft / total) * 100)}` : '0 100', offset: '46' },
                  { name: 'Unpublished', count: unpub, percent: getPct(unpub), color: '#A51C49', dash: total > 0 ? `${Math.round((unpub / total) * 100)} ${100 - Math.round((unpub / total) * 100)}` : '0 100', offset: '41' },
                ];

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    {/* Visual Circle Representation on Left (No text inside circle) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="145" height="145" viewBox="0 0 44 44">
                        <circle cx="22" cy="22" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="6" />
                        {statusItems.map((s) => (
                          <circle
                            key={s.name}
                            cx="22" cy="22" r="15.915"
                            fill="transparent"
                            stroke={s.color}
                            strokeWidth={hoveredStatus === s.name ? "8.5" : "6"}
                            strokeDasharray={s.dash}
                            strokeDashoffset={s.offset}
                            style={{
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              opacity: hoveredStatus && hoveredStatus !== s.name ? 0.4 : 1,
                              filter: hoveredStatus === s.name ? `drop-shadow(0 2px 5px ${s.color}88)` : 'none'
                            }}
                            onMouseEnter={() => setHoveredStatus(s.name)}
                            onMouseLeave={() => setHoveredStatus(null)}
                          >
                            <title>{`${s.name}: ${s.count} (${s.percent})`}</title>
                          </circle>
                        ))}
                      </svg>
                    </div>

                    {/* Related Data List on Right */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', flex: 1 }}>
                      {statusItems.map((s) => (
                        <div
                          key={s.name}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: hoveredStatus === s.name ? `${s.color}15` : 'transparent',
                            transition: 'all 0.15s ease',
                            borderLeft: hoveredStatus === s.name ? `3px solid ${s.color}` : '3px solid transparent'
                          }}
                          onMouseEnter={() => setHoveredStatus(s.name)}
                          onMouseLeave={() => setHoveredStatus(null)}
                          title={`${s.name}: ${s.count} (${s.percent})`}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: hoveredStatus === s.name ? 700 : 500 }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }}></span> {s.name}
                          </span>
                          <strong style={{ color: hoveredStatus === s.name ? s.color : '#0f172a' }}>{s.count} ({s.percent})</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Recent Testimonials Table Card */}
            <div className="tm-glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                    Recent Testimonials
                  </h3>
                  <button className="tm-btn tm-btn-secondary tm-btn-sm" onClick={() => changeView('review')}>
                    View All
                  </button>
                </div>

                <div className="tm-table-card" style={{ boxShadow: 'none', border: 'none', margin: 0 }}>
                  <table className="tm-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Category</th>
                        <th>Rating</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const list = Array.isArray(testimonials) ? testimonials : [];
                        const recentList = list.slice(0, 3);
                        if (recentList.length === 0) {
                          return (
                            <tr>
                              <td colSpan="4" style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                                Data not found
                              </td>
                            </tr>
                          );
                        }
                        return recentList.map((t, idx) => (
                          <tr key={t.id || t._id || idx}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <AvatarImage src={t.image || t.imageUrl} name={t.name} size={30} />
                                <div>
                                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8rem' }}>{t.name || 'Customer'}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{t.role || t.designation || 'Traveler'}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`tm-cat-badge ${t.category === 'Flight' ? 'tm-cat-flight' : t.category === 'Bus Travel' ? 'tm-cat-bus' : 'tm-cat-hotel'}`}>
                                {t.category || t.categoryName || 'General'}
                              </span>
                            </td>
                            <td>{renderStars(t.rating || 5)}</td>
                            <td>
                              <span className={`tm-badge tm-badge-${String(t.status || 'Active').toLowerCase().replace(/\s+/g, '-')}`}>
                                {t.status || 'Active'}
                              </span>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                  {/* Attached AdminPagination directly inside table card */}
                  <AdminPagination
                    currentPage={1}
                    totalItems={Math.min((testimonials || []).length, 3)}
                    itemsPerPage={3}
                    onPageChange={() => {}}
                    itemName="testimonials"
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          2. CATEGORY LIST VIEW
      ──────────────────────────────────────────────────────────────────────── */}
      {activeView === 'category_list' && (
        <>
          <div className="tm-header" style={{ marginBottom: '10px' }}>
            <div>
              <h1 className="tm-header-title">Testimonial Categories</h1>
            </div>
          </div>

          {/* Filters & Actions Bar - Single Line without box container background */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'nowrap', marginBottom: '14px', width: '100%' }}>
            <div className="tm-search-box" style={{ flex: '1 1 200px', minWidth: '160px' }}>
              <Search className="tm-search-icon" size={15} />
              <input
                type="text"
                placeholder="Search category name, slug, description..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <button
                type="button"
                className="tm-btn"
                style={{ background: '#10b981', color: '#ffffff', borderColor: '#059669', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, flexShrink: 0 }}
                onClick={handleExportCategories}
              >
                <Download size={14} /> Export
              </button>

              <button
                type="button"
                className="tm-btn"
                style={{ background: '#A51C49', color: '#ffffff', borderColor: '#A51C49', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, flexShrink: 0 }}
                onClick={() => { setSelectedCategory(null); setCatFormData({ name: '', slug: '', description: '', order: categories.length + 1, status: 'Active' }); changeView('add_category'); }}
              >
                <PlusCircle size={15} /> Add Category
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="tm-table-card">
            <table className="tm-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'center', width: '50px' }}>#</th>
                  <th style={{ textAlign: 'center' }}>Category Name</th>
                  <th style={{ textAlign: 'center' }}>Slug</th>
                  <th style={{ textAlign: 'center' }}>Description</th>
                  <th style={{ textAlign: 'center' }}>Order</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Created/Date</th>
                  <th style={{ textAlign: 'center', width: '110px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filteredCats = categories
                    .filter(c => {
                      const s = searchQuery.trim().toLowerCase();
                      if (!s) return true;
                      return (
                        (c.name || '').toLowerCase().includes(s) ||
                        (c.slug || '').toLowerCase().includes(s) ||
                        (c.description || '').toLowerCase().includes(s) ||
                        (c.status || '').toLowerCase().includes(s)
                      );
                    })
                    .filter(c => statusFilter === 'All' ? true : c.status === statusFilter);

                  if (filteredCats.length === 0) {
                    return (
                      <tr>
                        <td colSpan="8" style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                          Data not found
                        </td>
                      </tr>
                    );
                  }

                  const paginatedCats = filteredCats.slice((catPage - 1) * 10, catPage * 10);

                  return paginatedCats.map((c, index) => (
                    <tr key={c.id}>
                      <td style={{ textAlign: 'center' }}><strong>{String(((catPage - 1) * 10) + index + 1).padStart(2, '0')}</strong></td>
                      <td style={{ textAlign: 'center' }}><strong>{c.name}</strong></td>
                      <td style={{ textAlign: 'center' }}><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', color: '#334155' }}>{c.slug}</code></td>
                      <td style={{ textAlign: 'center', maxWidth: '240px', color: '#64748b', fontSize: '0.78rem' }}>{c.description}</td>
                      <td style={{ textAlign: 'center' }}>{c.order}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`tm-badge tm-badge-${c.status.toLowerCase()}`}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{c.createdDate}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ position: 'relative', display: 'inline-block', verticalAlign: 'middle' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(activeDropdownId === `cat-${c.id}` ? null : `cat-${c.id}`);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: activeDropdownId === `cat-${c.id}` ? '#A51C49' : '#ffffff',
                              color: activeDropdownId === `cat-${c.id}` ? '#ffffff' : '#0f172a',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span>Actions</span>
                            <ChevronDown size={13} />
                          </button>

                          {activeDropdownId === `cat-${c.id}` && (
                            <div
                              className="tm-glass-popover"
                              style={{
                                position: 'absolute',
                                ...(index >= paginatedCats.length - 2 || paginatedCats.length <= 3
                                  ? { bottom: '100%', marginBottom: '4px' }
                                  : { top: '100%', marginTop: '4px' }),
                                right: 0,
                                borderRadius: '8px',
                                zIndex: 99999,
                                minWidth: '135px',
                                overflow: 'hidden',
                                padding: '4px 0',
                                textAlign: 'left'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  setViewModalItem({ type: 'category', data: c });
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '7px 12px',
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  color: '#334155',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                              >
                                <Eye size={13} color="#64748b" />
                                <span>View Details</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleEditCategoryClick(c);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '7px 12px',
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  color: '#334155',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                              >
                                <Edit3 size={13} color="#64748b" />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  setDeleteModalItem({ type: 'category', data: c });
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '7px 12px',
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  color: '#ef4444',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                              >
                                <Trash2 size={13} color="#ef4444" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>

            {/* Pagination attached directly inside table card */}
            <AdminPagination
              currentPage={catPage}
              totalItems={
                categories
                  .filter(c => {
                    const s = searchQuery.trim().toLowerCase();
                    if (!s) return true;
                    return (
                      (c.name || '').toLowerCase().includes(s) ||
                      (c.slug || '').toLowerCase().includes(s) ||
                      (c.description || '').toLowerCase().includes(s) ||
                      (c.status || '').toLowerCase().includes(s)
                    );
                  })
                  .filter(c => statusFilter === 'All' ? true : c.status === statusFilter).length
              }
              itemsPerPage={10}
              onPageChange={setCatPage}
              itemName="categories"
            />
          </div>
        </>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          3. ADD CATEGORY & EDIT CATEGORY VIEWS
      ──────────────────────────────────────────────────────────────────────── */}
      {(activeView === 'add_category' || activeView === 'edit_category') && (
        <>
          <div className="tm-header">
            <div>
              <h1 className="tm-header-title">{activeView === 'edit_category' ? 'Edit Category' : 'Add Category'}</h1>
            </div>
            <button className="tm-btn tm-btn-secondary" onClick={() => changeView('category_list')}>
              <ArrowLeft size={16} /> Back to List
            </button>
          </div>

          <div className="tm-form-card">
            <form onSubmit={handleSaveCategory}>
              <div className="tm-form-grid">
                <div className="tm-form-group">
                  <label className="tm-form-label">Category Name <span className="req">*</span></label>
                  <input
                    type="text"
                    className="tm-form-input"
                    placeholder="Enter category name"
                    value={catFormData.name}
                    onChange={e => setCatFormData({ ...catFormData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    required
                  />
                </div>

                <div className="tm-form-group">
                  <label className="tm-form-label">Display Order</label>
                  <input
                    type="number"
                    className="tm-form-input"
                    placeholder="Enter display order"
                    value={catFormData.order}
                    onChange={e => setCatFormData({ ...catFormData, order: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="tm-form-group">
                  <label className="tm-form-label">Category Slug <span className="req">*</span></label>
                  <input
                    type="text"
                    className="tm-form-input"
                    placeholder="Enter slug (e.g. hotel-stay)"
                    value={catFormData.slug}
                    onChange={e => setCatFormData({ ...catFormData, slug: e.target.value })}
                    required
                  />
                </div>

                <div className="tm-form-group">
                  <label className="tm-form-label">Status <span className="req">*</span></label>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input
                        type="radio"
                        name="catStatus"
                        value="Active"
                        checked={catFormData.status === 'Active'}
                        onChange={() => setCatFormData({ ...catFormData, status: 'Active' })}
                      /> Active
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input
                        type="radio"
                        name="catStatus"
                        value="Inactive"
                        checked={catFormData.status === 'Inactive'}
                        onChange={() => setCatFormData({ ...catFormData, status: 'Inactive' })}
                      /> Inactive
                    </label>
                  </div>
                </div>

                <div className="tm-form-group full-width">
                  <label className="tm-form-label">Description</label>
                  <textarea
                    className="tm-form-textarea"
                    placeholder="Enter description (optional)"
                    value={catFormData.description}
                    onChange={e => setCatFormData({ ...catFormData, description: e.target.value })}
                  ></textarea>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
                <button type="button" className="tm-btn tm-btn-secondary" onClick={() => changeView('category_list')}>
                  Cancel
                </button>
                {activeView === 'edit_category' && (
                  <button
                    type="button"
                    className="tm-btn tm-btn-danger-outline"
                    onClick={() => {
                      setCategories(categories.map(c => c.id === selectedCategory.id ? { ...c, status: 'Inactive' } : c));
                      showToast('Category deactivated.');
                      changeView('category_list');
                    }}
                  >
                    Deactivate Category
                  </button>
                )}
                <button type="submit" className="tm-btn tm-btn-primary">
                  {activeView === 'edit_category' ? 'Update Category' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          5. TESTIMONIAL LIST VIEW
      ──────────────────────────────────────────────────────────────────────── */}
      {activeView === 'testimonial_list' && (
        <>
          <div className="tm-header" style={{ marginBottom: '10px' }}>
            <div>
              <h1 className="tm-header-title">Testimonials</h1>
            </div>
          </div>

          {/* Filter Toolbar - Single Horizontal Line */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'nowrap', marginBottom: '14px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 auto' }}>
              <div className="tm-search-box" style={{ flex: '1 1 360px', minWidth: '280px', maxWidth: '420px' }}>
                <Search className="tm-search-icon" size={15} />
                <input
                  type="text"
                  placeholder="Search customer, testimonial..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {(() => {
                const uniqueCatNames = Array.from(
                  new Set([
                    ...categories.map(c => c.name),
                    ...testimonials.map(t => resolveCategoryName(t.categoryId, t.category))
                  ])
                ).filter(Boolean);

                return (
                  <select
                    className="tm-form-select"
                    style={{ height: '34px', width: '135px', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '7px', borderColor: '#cbd5e1', background: 'rgba(255, 255, 255, 0.75)', flexShrink: 0 }}
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                  >
                    <option value="All">All Categories</option>
                    {uniqueCatNames.map(catName => (
                      <option key={catName} value={catName}>{catName}</option>
                    ))}
                  </select>
                );
              })()}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <button
                type="button"
                className="tm-btn"
                style={{ background: '#10b981', color: '#ffffff', borderColor: '#059669', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, flexShrink: 0 }}
                onClick={handleExportTestimonials}
              >
                <Download size={14} /> Export
              </button>

              <button
                type="button"
                className="tm-btn"
                style={{ background: '#A51C49', color: '#ffffff', borderColor: '#A51C49', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, flexShrink: 0 }}
                onClick={() => { resetTestForm(); changeView('add_testimonial'); }}
              >
                <PlusCircle size={15} /> Add Testimonial
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="tm-table-card">
            <table className="tm-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'center', width: '50px' }}>#</th>
                  <th style={{ textAlign: 'center' }}>Customer</th>
                  <th style={{ textAlign: 'center', width: '90px' }}>Category</th>
                  <th style={{ textAlign: 'center' }}>Rating</th>
                  <th style={{ textAlign: 'center' }}>Testimonial (Preview)</th>
                  <th style={{ textAlign: 'center' }}>Image</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Order</th>
                  <th style={{ textAlign: 'center', width: '110px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filteredTestimonials = testimonials
                    .filter(t => (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (t.preview || t.comment || '').toLowerCase().includes(searchQuery.toLowerCase()))
                    .filter(t => {
                      if (categoryFilter === 'All') return true;
                      const resolvedName = resolveCategoryName(t.categoryId, t.category).toLowerCase();
                      const filterName = categoryFilter.toLowerCase();
                      const rawCat = (t.category || '').toLowerCase();
                      return (
                        resolvedName.includes(filterName) ||
                        filterName.includes(resolvedName) ||
                        rawCat.includes(filterName) ||
                        filterName.includes(rawCat) ||
                        String(t.categoryId) === String(categoryFilter)
                      );
                    })
                    .filter(t => statusFilter === 'All' ? true : (t.status || '').toLowerCase() === statusFilter.toLowerCase())
                    .filter(t => ratingFilter === 'All' ? true : String(t.rating) === ratingFilter);

                  if (filteredTestimonials.length === 0) {
                    return (
                      <tr>
                        <td colSpan="9" style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                          Data not found
                        </td>
                      </tr>
                    );
                  }

                  const paginatedTestimonials = filteredTestimonials.slice((testPage - 1) * 10, testPage * 10);

                  return paginatedTestimonials.map((t, idx) => (
                    <tr key={t.id || idx}>
                        <td style={{ textAlign: 'center' }}><strong>{String(((testPage - 1) * 10) + idx + 1).padStart(2, '0')}</strong></td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{t.name || 'Customer'}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{t.role || t.designation || 'Traveler'}</div>
                          <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: '2px' }}>{t.createdDate && t.createdDate !== 'N/A' ? t.createdDate : 'N/A'}</div>
                        </td>
                        <td style={{ textAlign: 'center', width: '90px' }}>
                          <span
                            className={`tm-cat-badge ${resolveCategoryName(t.categoryId, t.category) === 'Flight Bookings' || resolveCategoryName(t.categoryId, t.category) === 'Flight' ? 'tm-cat-flight' : resolveCategoryName(t.categoryId, t.category) === 'Bus Travels' || resolveCategoryName(t.categoryId, t.category) === 'Bus Travel' ? 'tm-cat-bus' : 'tm-cat-hotel'}`}
                            style={{ padding: '2px 6px', fontSize: '0.68rem', maxWidth: '85px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}
                          >
                            {resolveCategoryName(t.categoryId, t.category)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>{renderStars(t.rating || 5)}</td>
                        <td style={{ textAlign: 'center', maxWidth: '280px', color: '#475569', fontSize: '0.8rem' }}>
                          {(t.preview || t.comment || '').length > 75 ? `${(t.preview || t.comment || '').substring(0, 75)}...` : (t.preview || t.comment || '--')}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <AvatarImage src={t.image || t.imageUrl} name={t.name} size={36} />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`tm-badge tm-badge-${(t.status || 'Active').toLowerCase().replace(/\s+/g, '-')}`}>
                            {t.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>{String(t.order || idx + 1).padStart(2, '0')}</td>
                        <td style={{ textAlign: 'center' }}>
                        <div style={{ position: 'relative', display: 'inline-block', verticalAlign: 'middle' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(activeDropdownId === `test-${t.id}` ? null : `test-${t.id}`);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: activeDropdownId === `test-${t.id}` ? '#A51C49' : '#ffffff',
                              color: activeDropdownId === `test-${t.id}` ? '#ffffff' : '#0f172a',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span>Actions</span>
                            <ChevronDown size={13} />
                          </button>

                          {activeDropdownId === `test-${t.id}` && (
                            <div
                              className="tm-glass-popover"
                              style={{
                                position: 'absolute',
                                ...(idx >= paginatedTestimonials.length - 2 || paginatedTestimonials.length <= 3
                                  ? { bottom: '100%', marginBottom: '4px' }
                                  : { top: '100%', marginTop: '4px' }),
                                right: 0,
                                borderRadius: '8px',
                                zIndex: 99999,
                                minWidth: '135px',
                                overflow: 'hidden',
                                padding: '4px 0',
                                textAlign: 'left'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  setViewModalItem({ type: 'testimonial', data: t });
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '7px 12px',
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  color: '#334155',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                              >
                                <Eye size={13} color="#64748b" />
                                <span>View Details</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleEditTestimonialClick(t);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '7px 12px',
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  color: '#334155',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                              >
                                <Edit3 size={13} color="#64748b" />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  setDeleteModalItem({ type: 'testimonial', data: t });
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '7px 12px',
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  color: '#ef4444',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                              >
                                <Trash2 size={13} color="#ef4444" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>

            {/* Pagination attached directly inside table card */}
            <AdminPagination
              currentPage={testPage}
              totalItems={
                testimonials
                  .filter(t => (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (t.preview || t.comment || '').toLowerCase().includes(searchQuery.toLowerCase()))
                  .filter(t => categoryFilter === 'All' ? true : t.category === categoryFilter)
                  .filter(t => statusFilter === 'All' ? true : (t.status || '').toLowerCase() === statusFilter.toLowerCase())
                  .filter(t => ratingFilter === 'All' ? true : String(t.rating) === ratingFilter).length
              }
              itemsPerPage={10}
              onPageChange={setTestPage}
              itemName="testimonials"
            />
          </div>
        </>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          6. ADD & EDIT TESTIMONIAL VIEWS
      ──────────────────────────────────────────────────────────────────────── */}
      {(activeView === 'add_testimonial' || activeView === 'edit_testimonial') && (
        <>
          <div className="tm-header">
            <div>
              <h1 className="tm-header-title">{activeView === 'edit_testimonial' ? 'Edit Testimonial' : 'Add Testimonial'}</h1>
            </div>
            <button className="tm-btn tm-btn-secondary" onClick={() => changeView('testimonial_list')}>
              <ArrowLeft size={16} /> Back to List
            </button>
          </div>

          <form onSubmit={e => handleSaveTestimonial(e, 'Published')}>
            {/* Customer Information */}
            <div className="tm-form-card">
              <h3 style={{ margin: '0 0 20px', fontSize: '0.9rem', fontWeight: 700, color: '#A51C49', textTransform: 'uppercase' }}>
                Customer Information
              </h3>
              <div className="tm-form-grid">
                <div className="tm-form-group">
                  <label className="tm-form-label">Customer Name <span className="req">*</span></label>
                  <input
                    type="text"
                    className="tm-form-input"
                    placeholder="Enter customer name"
                    value={testFormData.name}
                    onChange={e => setTestFormData({ ...testFormData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="tm-form-group">
                  <label className="tm-form-label">Customer Type / Role</label>
                  <input
                    type="text"
                    className="tm-form-input"
                    placeholder="e.g. Traveler, Business"
                    value={testFormData.role}
                    onChange={e => setTestFormData({ ...testFormData, role: e.target.value })}
                  />
                </div>

                <div className="tm-form-group">
                  <label className="tm-form-label">Location</label>
                  <input
                    type="text"
                    className="tm-form-input"
                    placeholder="Enter location (e.g. Hyderabad)"
                    value={testFormData.location}
                    onChange={e => setTestFormData({ ...testFormData, location: e.target.value })}
                  />
                </div>



                <div className="tm-form-group full-width">
                  <label className="tm-form-label">Customer Image</label>
                  <div
                    className="tm-upload-box"
                    style={{
                      position: 'relative',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '16px',
                      border: '2px dashed #cbd5e1',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.65)',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const previewUrl = URL.createObjectURL(file);
                          setTestFormData({ ...testFormData, imageFile: file, imagePreview: previewUrl, image: previewUrl, imageUrl: previewUrl });
                        }
                      }}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }}
                    />
                    {testFormData.imagePreview || testFormData.image ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '4px 12px', zIndex: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <AvatarImage src={testFormData.imagePreview || testFormData.image} name={testFormData.name || 'Customer'} size={48} />
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                              {testFormData.imageFile ? testFormData.imageFile.name : (testFormData.imageFileName || 'Image Selected')}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Click or drag to replace image</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="tm-btn"
                          style={{
                            background: '#ef4444',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 12px',
                            fontSize: '0.75rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            zIndex: 5,
                            position: 'relative'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setTestFormData({
                              ...testFormData,
                              image: '',
                              imageUrl: '',
                              imagePreview: '',
                              imageFile: null,
                              imageFileName: ''
                            });
                          }}
                        >
                          Remove Image
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload size={24} style={{ color: '#A51C49', marginBottom: '6px' }} />
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Upload Image</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>JPG, PNG (Max 2MB)</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonial Content */}
            <div className="tm-form-card">
              <h3 style={{ margin: '0 0 20px', fontSize: '0.9rem', fontWeight: 700, color: '#A51C49', textTransform: 'uppercase' }}>
                Testimonial Content
              </h3>
              <div className="tm-form-grid">
                <div className="tm-form-group">
                  <label className="tm-form-label">Category <span className="req">*</span></label>
                  <select
                    className="tm-form-select"
                    value={testFormData.categoryId != null ? testFormData.categoryId : (testFormData.category || '')}
                    onChange={e => {
                      const val = e.target.value;
                      const matchedCat = categories.find(c => String(c.id) === String(val) || c.name === val);
                      setTestFormData({
                        ...testFormData,
                        categoryId: matchedCat ? matchedCat.id : (isNaN(val) || val === '' ? null : Number(val)),
                        category: matchedCat ? matchedCat.name : val
                      });
                    }}
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="tm-form-group">
                  <label className="tm-form-label">Rating <span className="req">*</span></label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        size={22}
                        style={{ cursor: 'pointer' }}
                        fill={star <= testFormData.rating ? '#f59e0b' : 'none'}
                        color={star <= testFormData.rating ? '#f59e0b' : '#cbd5e1'}
                        onClick={() => setTestFormData({ ...testFormData, rating: star })}
                      />
                    ))}
                  </div>
                </div>

                <div className="tm-form-group full-width">
                  <label className="tm-form-label">Testimonial Content <span className="req">*</span></label>
                  <textarea
                    className="tm-form-textarea"
                    placeholder="Write testimonial..."
                    value={testFormData.preview}
                    onChange={e => setTestFormData({ ...testFormData, preview: e.target.value })}
                    required
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Publication Settings */}
            <div className="tm-form-card">
              <h3 style={{ margin: '0 0 20px', fontSize: '0.9rem', fontWeight: 700, color: '#A51C49', textTransform: 'uppercase' }}>
                Publication Settings
              </h3>
              <div className="tm-form-grid">
                <div className="tm-form-group">
                  <label className="tm-form-label">Display Order</label>
                  <input
                    type="number"
                    className="tm-form-input"
                    value={testFormData.order}
                    onChange={e => setTestFormData({ ...testFormData, order: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="tm-form-group">
                  <label className="tm-form-label">Status <span className="req">*</span></label>
                  <select
                    className="tm-form-select"
                    value={testFormData.status}
                    onChange={e => setTestFormData({ ...testFormData, status: e.target.value })}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Pending Review">Pending Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Published">Published</option>
                  </select>
                </div>

                <div className="tm-form-group">
                  <label className="tm-form-label">Featured</label>
                  <label className="tm-switch" style={{ marginTop: '6px' }}>
                    <input
                      type="checkbox"
                      checked={testFormData.featured}
                      onChange={e => setTestFormData({ ...testFormData, featured: e.target.checked })}
                    />
                    <span className="tm-slider"></span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
                <button type="button" className="tm-btn tm-btn-secondary" onClick={() => changeView('testimonial_list')}>
                  Reset
                </button>
                <button type="button" className="tm-btn tm-btn-secondary" onClick={e => handleSaveTestimonial(e, 'Draft')}>
                  Save Draft
                </button>
                <button type="submit" className="tm-btn tm-btn-primary">
                  {activeView === 'edit_testimonial' ? 'Update Testimonial' : 'Submit for Review'}
                </button>
              </div>
            </div>
          </form>
        </>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          7. TESTIMONIAL DETAILS VIEW
      ──────────────────────────────────────────────────────────────────────── */}
      {activeView === 'testimonial_details' && selectedTestimonial && (
        <>
          <div className="tm-header">
            <div>
              <h1 className="tm-header-title">Testimonial Details</h1>
            </div>
            <div className="tm-header-actions">
              <button className="tm-btn tm-btn-secondary" onClick={() => changeView('testimonial_list')}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="tm-btn tm-btn-primary" onClick={() => handleEditTestimonialClick(selectedTestimonial)}>
                <Edit3 size={16} /> Edit
              </button>
            </div>
          </div>

          <div className="tm-detail-card">
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '24px' }}>
              <AvatarImage src={selectedTestimonial.image || selectedTestimonial.imageUrl} name={selectedTestimonial.name} size={64} />
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>{selectedTestimonial.name}</h2>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{selectedTestimonial.role}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', margin: '20px 0' }}>
              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Customer Information</h4>
                <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div><strong>Location:</strong> {selectedTestimonial.location || 'Hyderabad'}</div>
                  <div><strong>Customer Type:</strong> {selectedTestimonial.role}</div>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Testimonial Information</h4>
                <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div><strong>Category:</strong> {selectedTestimonial.category}</div>
                  <div><strong>Display Order:</strong> {selectedTestimonial.order}</div>
                  <div><strong>Featured:</strong> {selectedTestimonial.featured ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>

            <div className="tm-quote-box">
              "{selectedTestimonial.preview}"
            </div>

            <div style={{ marginTop: '28px' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Audit History</h4>
              <div className="tm-timeline">
                <div className="tm-timeline-item">12 Aug 2026 09:00 AM - Created by Admin</div>
                <div className="tm-timeline-item">12 Aug 2026 09:30 AM - Submitted for Review</div>
                <div className="tm-timeline-item">12 Aug 2026 10:15 AM - Approved by Admin</div>
                <div className="tm-timeline-item">12 Aug 2026 10:35 AM - Published to Platform</div>
              </div>
            </div>
          </div>
        </>
      )}



      {/* ────────────────────────────────────────────────────────────────────────
          9. SETTINGS VIEW
      ──────────────────────────────────────────────────────────────────────── */}
      {activeView === 'settings' && (
        <>
          <div className="tm-header" style={{ marginBottom: '14px' }}>
            <div>
              <h1 className="tm-header-title">Testimonial Settings</h1>
            </div>
          </div>

          <div className="tm-form-card">
            <h3 style={{ margin: '0 0 20px', fontSize: '0.9rem', fontWeight: 700, color: '#A51C49', textTransform: 'uppercase' }}>
              General Settings
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255, 255, 255, 0.45)', borderRadius: '10px', border: '1px solid rgba(226, 232, 240, 0.7)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Approval Required</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Require admin approval before publishing.</div>
                </div>
                <label className="tm-switch">
                  <input
                    type="checkbox"
                    checked={globalSettings.approvalRequired}
                    onChange={e => setGlobalSettings({ ...globalSettings, approvalRequired: e.target.checked })}
                  />
                  <span className="tm-slider"></span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255, 255, 255, 0.45)', borderRadius: '10px', border: '1px solid rgba(226, 232, 240, 0.7)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Allow User Submission</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Allow customers to submit reviews from B2C site.</div>
                </div>
                <label className="tm-switch">
                  <input
                    type="checkbox"
                    checked={globalSettings.allowUserSubmission}
                    onChange={e => setGlobalSettings({ ...globalSettings, allowUserSubmission: e.target.checked })}
                  />
                  <span className="tm-slider"></span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255, 255, 255, 0.45)', borderRadius: '10px', border: '1px solid rgba(226, 232, 240, 0.7)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Allow Rating</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Enable star ratings for testimonials.</div>
                </div>
                <label className="tm-switch">
                  <input
                    type="checkbox"
                    checked={globalSettings.allowRating}
                    onChange={e => setGlobalSettings({ ...globalSettings, allowRating: e.target.checked })}
                  />
                  <span className="tm-slider"></span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255, 255, 255, 0.45)', borderRadius: '10px', border: '1px solid rgba(226, 232, 240, 0.7)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Allow Customer Image</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Allow profile picture upload.</div>
                </div>
                <label className="tm-switch">
                  <input
                    type="checkbox"
                    checked={globalSettings.allowCustomerImage}
                    onChange={e => setGlobalSettings({ ...globalSettings, allowCustomerImage: e.target.checked })}
                  />
                  <span className="tm-slider"></span>
                </label>
              </div>

              <div className="tm-form-group" style={{ padding: '10px 14px', background: 'rgba(255, 255, 255, 0.45)', borderRadius: '10px', border: '1px solid rgba(226, 232, 240, 0.7)' }}>
                <label className="tm-form-label">Default Category</label>
                <select
                  className="tm-form-select"
                  value={globalSettings.defaultCategory}
                  onChange={e => setGlobalSettings({ ...globalSettings, defaultCategory: e.target.value })}
                >
                  <option value="Hotel Stay">Hotel Stay</option>
                  <option value="Flight">Flight</option>
                  <option value="Bus Travel">Bus Travel</option>
                </select>
              </div>

              <div className="tm-form-group" style={{ padding: '10px 14px', background: 'rgba(255, 255, 255, 0.45)', borderRadius: '10px', border: '1px solid rgba(226, 232, 240, 0.7)' }}>
                <label className="tm-form-label">Featured Limit</label>
                <input
                  type="number"
                  className="tm-form-input"
                  value={globalSettings.featuredLimit}
                  onChange={e => setGlobalSettings({ ...globalSettings, featuredLimit: parseInt(e.target.value) || 6 })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
              <button
                type="button"
                className="tm-btn tm-btn-secondary"
                onClick={() => {
                  setGlobalSettings({
                    approvalRequired: true,
                    allowUserSubmission: true,
                    allowRating: true,
                    allowCustomerImage: true,
                    defaultCategory: 'Hotel Stay',
                    featuredLimit: 6,
                    displayOrderMode: 'Manual Order',
                    autoPublish: false
                  });
                  showToast('Settings reset to default.', 'info');
                }}
              >
                Reset
              </button>
              <button
                type="button"
                className="tm-btn tm-btn-primary"
                onClick={async () => {
                  try {
                    await updateTestimonialSettings(globalSettings);
                    showToast('Global Testimonial Settings saved successfully!');
                  } catch (err) {
                    showToast(err?.message || 'Failed to update settings', 'error');
                  }
                }}
              >
                Save Settings
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── VIEW DETAILS POPUP MODAL (Matching Blog Management) ── */}
      {viewModalItem && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000,
          padding: '20px'
        }} onClick={() => setViewModalItem(null)}>
          <div className="tm-glass-modal" style={{
            borderRadius: '12px', padding: '0',
            width: '520px', maxWidth: '90%',
            overflow: 'hidden'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '14px 20px', background: '#fdf2f4', borderBottom: '1px solid #fbcfe8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#A51C49', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={18} color="#A51C49" />
                <span>{viewModalItem.type === 'category' ? 'Category Details' : 'Testimonial Details'}</span>
              </h3>
              <button type="button" onClick={() => setViewModalItem(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', fontSize: '0.85rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {viewModalItem.type === 'category' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Category Name</span>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginTop: '2px' }}>{viewModalItem.data.name}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Slug</span>
                      <div style={{ marginTop: '2px' }}><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>{viewModalItem.data.slug}</code></div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Display Order</span>
                      <div style={{ fontWeight: 700, marginTop: '2px' }}>{viewModalItem.data.order}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Status</span>
                      <div style={{ marginTop: '2px' }}>
                        <span className={`tm-badge tm-badge-${(viewModalItem.data.status || 'Active').toLowerCase()}`}>
                          {viewModalItem.data.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Description</span>
                    <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', marginTop: '4px', border: '1px solid #e2e8f0', color: '#475569' }}>
                      {viewModalItem.data.description || 'No description provided.'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Created Date</span>
                    <div style={{ fontWeight: 600, marginTop: '2px', color: '#64748b' }}>{viewModalItem.data.createdDate || '-'}</div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <AvatarImage src={viewModalItem.data.image || viewModalItem.data.imageUrl} name={viewModalItem.data.name} size={48} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{viewModalItem.data.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{viewModalItem.data.role} • {viewModalItem.data.location}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Category</span>
                      <div style={{ marginTop: '2px' }}>
                        <span className={`tm-cat-badge ${viewModalItem.data.category === 'Flight' ? 'tm-cat-flight' : viewModalItem.data.category === 'Bus Travel' ? 'tm-cat-bus' : 'tm-cat-hotel'}`}>
                          {viewModalItem.data.category}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Rating</span>
                      <div style={{ marginTop: '2px' }}>{renderStars(viewModalItem.data.rating)}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Status</span>
                      <div style={{ marginTop: '2px' }}>
                        <span className={`tm-badge tm-badge-${(viewModalItem.data.status || 'Active').toLowerCase().replace(/\s+/g, '-')}`}>
                          {viewModalItem.data.status}
                        </span>
                      </div>
                    </div>

                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Testimonial Preview</span>
                    <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', marginTop: '4px', border: '1px solid #e2e8f0', color: '#334155', fontStyle: 'italic' }}>
                      "{viewModalItem.data.preview || viewModalItem.data.comment || viewModalItem.data.message}"
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(226, 232, 240, 0.6)', display: 'flex', justifyContent: 'flex-end', background: 'rgba(248, 250, 252, 0.5)' }}>
              <button type="button" className="tm-btn tm-btn-secondary" onClick={() => setViewModalItem(null)}>
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── DELETE CONFIRMATION POPUP MODAL (Matching Blog Management) ── */}
      {deleteModalItem && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000
        }} onClick={() => setDeleteModalItem(null)}>
          <div className="tm-glass-modal" style={{
            borderRadius: '12px', padding: '0',
            width: '420px', maxWidth: '90%',
            overflow: 'hidden'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#A51C49' }}>Confirm Delete</h3>
              <button type="button" onClick={() => setDeleteModalItem(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', fontSize: '0.9rem', color: '#334155' }}>
              Are you sure you want to delete <strong>"{deleteModalItem.data.name}"</strong>? This action cannot be undone.
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#f8fafc' }}>
              <button
                type="button"
                onClick={() => setDeleteModalItem(null)}
                style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#f97316', color: '#ffffff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteModalItem.type === 'category') {
                    handleDeleteCategory(deleteModalItem.data.id);
                  } else {
                    handleDeleteTestimonial(deleteModalItem.data.id);
                  }
                  setDeleteModalItem(null);
                }}
                style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#ffffff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
