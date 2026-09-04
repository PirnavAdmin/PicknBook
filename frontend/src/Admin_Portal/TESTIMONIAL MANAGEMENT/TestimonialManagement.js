/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, List, PlusCircle, Star, MessageSquareQuote, CheckCircle2,
  Sliders, Search, Filter, Edit3, Trash2, Eye, RotateCcw, Upload, X, ArrowLeft,
  Calendar, Check, UserCheck, UserX, ShieldAlert, Award
} from 'lucide-react';
import './TestimonialManagement.css';

// Mock Initial Data matching provided UI design image
const INITIAL_CATEGORIES = [
  { id: 1, name: 'Hotel Stay', slug: 'hotel-stay', description: 'Testimonials from hotel guests', order: 1, status: 'Active', createdDate: '12 Aug 2026' },
  { id: 2, name: 'Flight', slug: 'flight', description: 'Customer reviews for flights', order: 2, status: 'Active', createdDate: '11 Aug 2026' },
  { id: 3, name: 'Bus Travel', slug: 'bus-travel', description: 'Bus service and staff reviews', order: 3, status: 'Inactive', createdDate: '10 Aug 2026' },
  { id: 4, name: 'Car Rental', slug: 'car-rental', description: 'Car rental experiences', order: 4, status: 'Active', createdDate: '09 Aug 2026' },
  { id: 5, name: 'Holiday Package', slug: 'holiday-package', description: 'Holiday package reviews', order: 5, status: 'Active', createdDate: '08 Aug 2026' },
];

const INITIAL_TESTIMONIALS = [
  {
    id: 1,
    name: 'Rahul Kumar',
    role: 'Traveler',
    location: 'Hyderabad',
    bookingRef: 'PNB458021',
    category: 'Hotel Stay',
    rating: 5,
    preview: 'Excellent experience with PickNBook. The booking process was easy and the hotel stay was wonderful. Highly recommended!',
    image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    status: 'Published',
    order: 1,
    createdDate: '12 Aug 2026',
    featured: true,
    publishedDate: '12 Aug 2026 10:30 AM',
    approvedBy: 'Admin User',
    approvedDate: '12 Aug 2026 10:35 AM'
  },
  {
    id: 2,
    name: 'Priya Sharma',
    role: 'Business Traveler',
    location: 'Delhi',
    bookingRef: 'PNB982104',
    category: 'Flight',
    rating: 4,
    preview: 'Very smooth flight booking experience. Loved the seamless voucher generation and instant updates.',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    status: 'Pending Review',
    order: 2,
    createdDate: '11 Aug 2026',
    featured: false,
    publishedDate: '-',
    approvedBy: '-',
    approvedDate: '-'
  },
  {
    id: 3,
    name: 'Arjun Reddy',
    role: 'Traveler',
    location: 'Bengaluru',
    bookingRef: 'PNB331902',
    category: 'Bus Travel',
    rating: 5,
    preview: 'Nice service and comfortable journey. Highly recommended for long bus journeys.',
    image: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
    status: 'Approved',
    order: 3,
    createdDate: '10 Aug 2026',
    featured: true,
    publishedDate: '10 Aug 2026 02:15 PM',
    approvedBy: 'Admin User',
    approvedDate: '10 Aug 2026 02:00 PM'
  },
  {
    id: 4,
    name: 'Neha Patel',
    role: 'Traveler',
    location: 'Mumbai',
    bookingRef: 'PNB109482',
    category: 'Hotel Stay',
    rating: 4,
    preview: 'Good hotel and staff behavior was good. Looking forward to booking again soon.',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
    status: 'Draft',
    order: 4,
    createdDate: '09 Aug 2026',
    featured: false,
    publishedDate: '-',
    approvedBy: '-',
    approvedDate: '-'
  }
];

export default function TestimonialManagement() {
  const location = useLocation();
  const navigate = useNavigate();

  // Active View State: 'dashboard' | 'category_list' | 'add_category' | 'edit_category' | 'testimonial_list' | 'add_testimonial' | 'edit_testimonial' | 'testimonial_details' | 'review' | 'settings'
  const [activeView, setActiveView] = useState('dashboard');
  const [toast, setToast] = useState(null);

  // Data States
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [testimonials, setTestimonials] = useState(INITIAL_TESTIMONIALS);

  // Selected item states for Edit / Detail view
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTestimonial, setSelectedTestimonial] = useState(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [dateRange, setDateRange] = useState('01 Aug 2026 - 31 Aug 2026');

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
    bookingRef: '',
    category: 'Hotel Stay',
    rating: 5,
    preview: '',
    image: '',
    order: 1,
    status: 'Draft',
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

  // Sync route path to view state
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('category-list')) setActiveView('category_list');
    else if (path.includes('add-category')) setActiveView('add_category');
    else if (path.includes('testimonial-list')) setActiveView('testimonial_list');
    else if (path.includes('add-testimonial')) setActiveView('add_testimonial');
    else if (path.includes('review')) setActiveView('review');
    else if (path.includes('settings')) setActiveView('settings');
    else setActiveView('dashboard');
  }, [location.pathname]);

  // ── CATEGORY HANDLERS ──────────────────────────────────────────────────────
  const handleSaveCategory = (e) => {
    e.preventDefault();
    if (!catFormData.name.trim()) return showToast('Please enter category name', 'error');

    if (selectedCategory) {
      setCategories(categories.map(c => c.id === selectedCategory.id ? { ...c, ...catFormData } : c));
      showToast('Category updated successfully!');
    } else {
      const newCat = {
        id: Date.now(),
        ...catFormData,
        slug: catFormData.slug || catFormData.name.toLowerCase().replace(/\s+/g, '-'),
        createdDate: '13 Aug 2026'
      };
      setCategories([...categories, newCat]);
      showToast('New category created successfully!');
    }
    setActiveView('category_list');
  };

  const handleDeleteCategory = (id) => {
    setCategories(categories.filter(c => c.id !== id));
    showToast('Category deleted successfully!', 'info');
  };

  const handleEditCategoryClick = (cat) => {
    setSelectedCategory(cat);
    setCatFormData({ ...cat });
    setActiveView('edit_category');
  };

  // ── TESTIMONIAL HANDLERS ─────────────────────────────────────────────────
  const handleSaveTestimonial = (e, targetStatus) => {
    if (e) e.preventDefault();
    if (!testFormData.name.trim()) return showToast('Please enter customer name', 'error');

    const finalStatus = targetStatus || testFormData.status;

    if (selectedTestimonial) {
      setTestimonials(testimonials.map(t => t.id === selectedTestimonial.id ? { ...t, ...testFormData, status: finalStatus } : t));
      showToast('Testimonial updated successfully!');
    } else {
      const newTest = {
        id: Date.now(),
        ...testFormData,
        status: finalStatus,
        createdDate: '13 Aug 2026',
        image: testFormData.image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
      };
      setTestimonials([newTest, ...testimonials]);
      showToast('Testimonial created successfully!');
    }
    setActiveView('testimonial_list');
  };

  const handleDeleteTestimonial = (id) => {
    setTestimonials(testimonials.filter(t => t.id !== id));
    showToast('Testimonial deleted successfully!', 'info');
  };

  const handleEditTestimonialClick = (t) => {
    setSelectedTestimonial(t);
    setTestFormData({ ...t });
    setActiveView('edit_testimonial');
  };

  const handleViewDetailsClick = (t) => {
    setSelectedTestimonial(t);
    setActiveView('testimonial_details');
  };

  const handleApproveTestimonial = (id) => {
    setTestimonials(testimonials.map(t => t.id === id ? { ...t, status: 'Approved' } : t));
    showToast('Testimonial approved successfully!');
  };

  const handleRejectTestimonial = (id) => {
    setTestimonials(testimonials.map(t => t.id === id ? { ...t, status: 'Draft' } : t));
    showToast('Testimonial rejected to draft state.', 'info');
  };

  const handleBulkApprove = () => {
    if (selectedReviewIds.length === 0) return showToast('No items selected for bulk approval', 'error');
    setTestimonials(testimonials.map(t => selectedReviewIds.includes(t.id) ? { ...t, status: 'Approved' } : t));
    setSelectedReviewIds([]);
    showToast(`Successfully approved ${selectedReviewIds.length} testimonials!`);
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
        <span className="link" onClick={() => setActiveView('dashboard')}>Testimonial Management</span>
        <span>&gt;</span>
        <span className="active">{activeView.replace('_', ' ').toUpperCase()}</span>
      </div>

      {/* Main Module Navigation Bar (Matching Image Design) */}
      <div className="tm-nav-tabs">
        <button
          className={`tm-tab-btn ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveView('dashboard')}
        >
          <LayoutDashboard size={16} /> Dashboard
        </button>
        <button
          className={`tm-tab-btn ${activeView === 'category_list' || activeView === 'add_category' || activeView === 'edit_category' ? 'active' : ''}`}
          onClick={() => setActiveView('category_list')}
        >
          <List size={16} /> Category List <span className="tm-tab-badge">{categories.length}</span>
        </button>
        <button
          className={`tm-tab-btn ${activeView === 'testimonial_list' || activeView === 'add_testimonial' || activeView === 'edit_testimonial' || activeView === 'testimonial_details' ? 'active' : ''}`}
          onClick={() => setActiveView('testimonial_list')}
        >
          <MessageSquareQuote size={16} /> Testimonial List <span className="tm-tab-badge">{testimonials.length}</span>
        </button>
        <button
          className={`tm-tab-btn ${activeView === 'review' ? 'active' : ''}`}
          onClick={() => setActiveView('review')}
        >
          <UserCheck size={16} /> Review <span className="tm-tab-badge">{testimonials.filter(t => t.status === 'Pending Review').length}</span>
        </button>
        <button
          className={`tm-tab-btn ${activeView === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveView('settings')}
        >
          <Sliders size={16} /> Settings
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          1. DASHBOARD VIEW
      ──────────────────────────────────────────────────────────────────────── */}
      {activeView === 'dashboard' && (
        <>
          <div className="tm-header">
            <div>
              <h1 className="tm-header-title">Testimonial Dashboard</h1>
              <p className="tm-header-subtext">Overview & performance summary of customer testimonials.</p>
            </div>
            <div className="tm-header-actions">
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', background: '#fff', padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} /> 01 Aug 2026 - 31 Aug 2026
              </span>
            </div>
          </div>

          {/* Stats Cards Row */}
          <div className="tm-stats-grid">
            <div className="tm-stat-card">
              <div className="tm-stat-icon-wrapper" style={{ background: '#fdf2f4', color: '#A51C49' }}>
                <MessageSquareQuote size={22} />
              </div>
              <div>
                <div className="tm-stat-number">248</div>
                <div className="tm-stat-label">Total Testimonials</div>
              </div>
            </div>

            <div className="tm-stat-card">
              <div className="tm-stat-icon-wrapper" style={{ background: '#ecfdf5', color: '#047857' }}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div className="tm-stat-number">182</div>
                <div className="tm-stat-label">Published</div>
              </div>
            </div>

            <div className="tm-stat-card">
              <div className="tm-stat-icon-wrapper" style={{ background: '#fffbeb', color: '#b45309' }}>
                <UserCheck size={22} />
              </div>
              <div>
                <div className="tm-stat-number">24</div>
                <div className="tm-stat-label">Pending Review</div>
              </div>
            </div>

            <div className="tm-stat-card">
              <div className="tm-stat-icon-wrapper" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                <Award size={22} />
              </div>
              <div>
                <div className="tm-stat-number">28</div>
                <div className="tm-stat-label">Approved</div>
              </div>
            </div>

            <div className="tm-stat-card">
              <div className="tm-stat-icon-wrapper" style={{ background: '#f1f5f9', color: '#475569' }}>
                <UserX size={22} />
              </div>
              <div>
                <div className="tm-stat-number">24</div>
                <div className="tm-stat-label">Inactive / Unpublished</div>
              </div>
            </div>

            <div className="tm-stat-card">
              <div className="tm-stat-icon-wrapper" style={{ background: '#fef3c7', color: '#d97706' }}>
                <Star size={22} />
              </div>
              <div>
                <div className="tm-stat-number">12</div>
                <div className="tm-stat-label">Featured</div>
              </div>
            </div>
          </div>

          {/* Charts & Recent Submissions Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '24px' }}>
            {/* Status Breakdown Donut Card */}
            <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                Testimonials by Status
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
                {/* SVG Visual Donut Representation */}
                <svg width="160" height="160" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#e2e8f0" strokeWidth="6" />
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#10b981" strokeWidth="6" strokeDasharray="58 42" strokeDashoffset="25" />
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f59e0b" strokeWidth="6" strokeDasharray="10 90" strokeDashoffset="67" />
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#3b82f6" strokeWidth="6" strokeDasharray="11 89" strokeDashoffset="57" />
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#A51C49" strokeWidth="6" strokeDasharray="10 90" strokeDashoffset="46" />
                </svg>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span> Published
                  </span>
                  <strong>182 (58%)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></span> Pending
                  </span>
                  <strong>24 (10%)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }}></span> Approved
                  </span>
                  <strong>28 (11%)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#64748b' }}></span> Draft
                  </span>
                  <strong>12 (5%)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#A51C49' }}></span> Unpublished
                  </span>
                  <strong>24 (10%)</strong>
                </div>
              </div>
            </div>

            {/* Recent Testimonials Table Card */}
            <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                  Recent Testimonials
                </h3>
                <button className="tm-btn tm-btn-secondary tm-btn-sm" onClick={() => setActiveView('testimonial_list')}>
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
                    {testimonials.slice(0, 4).map(t => (
                      <tr key={t.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img src={t.image} alt={t.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{t.name}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{t.role}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`tm-cat-badge ${t.category === 'Flight' ? 'tm-cat-flight' : t.category === 'Bus Travel' ? 'tm-cat-bus' : 'tm-cat-hotel'}`}>
                            {t.category}
                          </span>
                        </td>
                        <td>{renderStars(t.rating)}</td>
                        <td>
                          <span className={`tm-badge tm-badge-${t.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
          <div className="tm-header">
            <div>
              <h1 className="tm-header-title">Testimonial Categories</h1>
              <p className="tm-header-subtext">Create and manage categories used to organize customer testimonials.</p>
            </div>
            <div className="tm-header-actions">
              <button className="tm-btn tm-btn-primary" onClick={() => { setSelectedCategory(null); setCatFormData({ name: '', slug: '', description: '', order: categories.length + 1, status: 'Active' }); setActiveView('add_category'); }}>
                <PlusCircle size={16} /> Add Category
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="tm-filter-card">
            <div className="tm-search-box">
              <Search className="tm-search-icon" size={16} />
              <input
                type="text"
                placeholder="Search category..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <select className="tm-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <button className="tm-btn tm-btn-secondary" onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}>
              <RotateCcw size={14} /> Filter
            </button>
          </div>

          {/* Table */}
          <div className="tm-table-card">
            <table className="tm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Category Name</th>
                  <th>Slug</th>
                  <th>Description</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Created/Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories
                  .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .filter(c => statusFilter === 'All' ? true : c.status === statusFilter)
                  .map((c, index) => (
                    <tr key={c.id}>
                      <td><strong>{String(index + 1).padStart(2, '0')}</strong></td>
                      <td><strong>{c.name}</strong></td>
                      <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>{c.slug}</code></td>
                      <td style={{ maxWidth: '240px', color: '#64748b' }}>{c.description}</td>
                      <td>{c.order}</td>
                      <td>
                        <span className={`tm-badge tm-badge-${c.status.toLowerCase()}`}>
                          {c.status}
                        </span>
                      </td>
                      <td>{c.createdDate}</td>
                      <td>
                        <div className="tm-action-btns">
                          <button className="tm-icon-btn edit" title="Edit Category" onClick={() => handleEditCategoryClick(c)}>
                            <Edit3 size={14} />
                          </button>
                          <button className="tm-icon-btn delete" title="Delete Category" onClick={() => handleDeleteCategory(c.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
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
              <p className="tm-header-subtext">{activeView === 'edit_category' ? 'Update the selected category details.' : 'Create a new testimonial category.'}</p>
            </div>
            <button className="tm-btn tm-btn-secondary" onClick={() => setActiveView('category_list')}>
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
                <button type="button" className="tm-btn tm-btn-secondary" onClick={() => setActiveView('category_list')}>
                  Cancel
                </button>
                {activeView === 'edit_category' && (
                  <button
                    type="button"
                    className="tm-btn tm-btn-danger-outline"
                    onClick={() => {
                      setCategories(categories.map(c => c.id === selectedCategory.id ? { ...c, status: 'Inactive' } : c));
                      showToast('Category deactivated.');
                      setActiveView('category_list');
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
          <div className="tm-header">
            <div>
              <h1 className="tm-header-title">Testimonials</h1>
              <p className="tm-header-subtext">Manage, review and control testimonials displayed across PickNBook.</p>
            </div>
            <div className="tm-header-actions">
              <button className="tm-btn tm-btn-primary" onClick={() => { setSelectedTestimonial(null); setTestFormData({ name: '', role: 'Traveler', location: '', bookingRef: '', category: 'Hotel Stay', rating: 5, preview: '', image: '', order: testimonials.length + 1, status: 'Draft', featured: false }); setActiveView('add_testimonial'); }}>
                <PlusCircle size={16} /> Add Testimonial
              </button>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="tm-filter-card">
            <div className="tm-search-box">
              <Search className="tm-search-icon" size={16} />
              <input
                type="text"
                placeholder="Search customer, testimonial..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <select className="tm-filter-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="All">All Categories</option>
              <option value="Hotel Stay">Hotel Stay</option>
              <option value="Flight">Flight</option>
              <option value="Bus Travel">Bus Travel</option>
            </select>
            <select className="tm-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Published">Published</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Draft">Draft</option>
            </select>
            <select className="tm-filter-select" value={ratingFilter} onChange={e => setRatingFilter(e.target.value)}>
              <option value="All">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
            </select>
            <button className="tm-btn tm-btn-secondary" onClick={() => { setSearchQuery(''); setCategoryFilter('All'); setStatusFilter('All'); setRatingFilter('All'); }}>
              <RotateCcw size={14} /> Reset
            </button>
          </div>

          {/* Table */}
          <div className="tm-table-card">
            <table className="tm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Category</th>
                  <th>Rating</th>
                  <th>Testimonial (Preview)</th>
                  <th>Image</th>
                  <th>Status</th>
                  <th>Order</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {testimonials
                  .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.preview.toLowerCase().includes(searchQuery.toLowerCase()))
                  .filter(t => categoryFilter === 'All' ? true : t.category === categoryFilter)
                  .filter(t => statusFilter === 'All' ? true : t.status === statusFilter)
                  .filter(t => ratingFilter === 'All' ? true : String(t.rating) === ratingFilter)
                  .map((t, idx) => (
                    <tr key={t.id}>
                      <td><strong>{String(idx + 1).padStart(2, '0')}</strong></td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{t.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{t.role}</div>
                      </td>
                      <td>
                        <span className={`tm-cat-badge ${t.category === 'Flight' ? 'tm-cat-flight' : t.category === 'Bus Travel' ? 'tm-cat-bus' : 'tm-cat-hotel'}`}>
                          {t.category}
                        </span>
                      </td>
                      <td>{renderStars(t.rating)}</td>
                      <td style={{ maxWidth: '280px', color: '#475569', fontSize: '0.8rem' }}>
                        {t.preview.length > 75 ? `${t.preview.substring(0, 75)}...` : t.preview}
                      </td>
                      <td>
                        <img src={t.image} alt={t.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                      </td>
                      <td>
                        <span className={`tm-badge tm-badge-${t.status.toLowerCase().replace(/\s+/g, '-')}`}>
                          {t.status}
                        </span>
                      </td>
                      <td>{String(t.order).padStart(2, '0')}</td>
                      <td>{t.createdDate}</td>
                      <td>
                        <div className="tm-action-btns">
                          <button className="tm-icon-btn" title="View Details" onClick={() => handleViewDetailsClick(t)}>
                            <Eye size={14} />
                          </button>
                          <button className="tm-icon-btn edit" title="Edit Testimonial" onClick={() => handleEditTestimonialClick(t)}>
                            <Edit3 size={14} />
                          </button>
                          <button className="tm-icon-btn delete" title="Delete Testimonial" onClick={() => handleDeleteTestimonial(t.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
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
              <p className="tm-header-subtext">{activeView === 'edit_testimonial' ? 'Update the testimonial details.' : 'Add a new customer testimonial.'}</p>
            </div>
            <button className="tm-btn tm-btn-secondary" onClick={() => setActiveView('testimonial_list')}>
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

                <div className="tm-form-group">
                  <label className="tm-form-label">Booking Reference</label>
                  <input
                    type="text"
                    className="tm-form-input"
                    placeholder="Enter booking reference"
                    value={testFormData.bookingRef}
                    onChange={e => setTestFormData({ ...testFormData, bookingRef: e.target.value })}
                  />
                </div>

                <div className="tm-form-group full-width">
                  <label className="tm-form-label">Customer Image</label>
                  <div className="tm-upload-box">
                    <Upload size={24} style={{ color: '#94a3b8', marginBottom: '8px' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Upload Image</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>JPG, PNG (Max 2MB)</div>
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
                    value={testFormData.category}
                    onChange={e => setTestFormData({ ...testFormData, category: e.target.value })}
                  >
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
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
                <button type="button" className="tm-btn tm-btn-secondary" onClick={() => setActiveView('testimonial_list')}>
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
              <button className="tm-btn tm-btn-secondary" onClick={() => setActiveView('testimonial_list')}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="tm-btn tm-btn-primary" onClick={() => handleEditTestimonialClick(selectedTestimonial)}>
                <Edit3 size={16} /> Edit
              </button>
            </div>
          </div>

          <div className="tm-detail-card">
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '24px' }}>
              <img src={selectedTestimonial.image} alt={selectedTestimonial.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
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
                  <div><strong>Booking Ref:</strong> {selectedTestimonial.bookingRef || 'PNB458021'}</div>
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
          8. TESTIMONIAL REVIEW VIEW
      ──────────────────────────────────────────────────────────────────────── */}
      {activeView === 'review' && (
        <>
          <div className="tm-header">
            <div>
              <h1 className="tm-header-title">Testimonial Review</h1>
              <p className="tm-header-subtext">Review and approve customer submitted testimonials.</p>
            </div>
          </div>

          <div className="tm-filter-card">
            <div className="tm-search-box">
              <Search className="tm-search-icon" size={16} />
              <input type="text" placeholder="Search customer, testimonial..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <select className="tm-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="Pending Review">Pending Review</option>
              <option value="All">All Status</option>
            </select>
            <button className="tm-btn tm-btn-secondary"><RotateCcw size={14} /> Filter</button>
          </div>

          <div className="tm-table-card">
            <table className="tm-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      onChange={e => setSelectedReviewIds(e.target.checked ? testimonials.map(t => t.id) : [])}
                    />
                  </th>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Category</th>
                  <th>Rating</th>
                  <th>Submitted Date</th>
                  <th>Preview</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {testimonials
                  .filter(t => statusFilter === 'All' ? true : t.status === statusFilter)
                  .map((t, idx) => (
                    <tr key={t.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedReviewIds.includes(t.id)}
                          onChange={e => setSelectedReviewIds(e.target.checked ? [...selectedReviewIds, t.id] : selectedReviewIds.filter(id => id !== t.id))}
                        />
                      </td>
                      <td><strong>{String(idx + 1).padStart(2, '0')}</strong></td>
                      <td><strong>{t.name}</strong></td>
                      <td><span className="tm-cat-badge tm-cat-hotel">{t.category}</span></td>
                      <td>{renderStars(t.rating)}</td>
                      <td>{t.createdDate}</td>
                      <td style={{ maxWidth: '240px', fontSize: '0.78rem' }}>{t.preview}</td>
                      <td>
                        <div className="tm-action-btns">
                          <button className="tm-icon-btn approve" title="Approve" onClick={() => handleApproveTestimonial(t.id)}>
                            <Check size={14} />
                          </button>
                          <button className="tm-icon-btn delete" title="Reject" onClick={() => handleRejectTestimonial(t.id)}>
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Bulk Actions:</span>
              <button className="tm-btn tm-btn-success tm-btn-sm" onClick={handleBulkApprove}>
                Approve Selected
              </button>
            </div>
          </div>
        </>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          9. SETTINGS VIEW
      ──────────────────────────────────────────────────────────────────────── */}
      {activeView === 'settings' && (
        <>
          <div className="tm-header">
            <div>
              <h1 className="tm-header-title">Testimonial Settings</h1>
              <p className="tm-header-subtext">Manage global settings for testimonials.</p>
            </div>
          </div>

          <div className="tm-form-card">
            <h3 style={{ margin: '0 0 20px', fontSize: '0.9rem', fontWeight: 700, color: '#A51C49', textTransform: 'uppercase' }}>
              General Settings
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

              <div className="tm-form-group">
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

              <div className="tm-form-group">
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
              <button className="tm-btn tm-btn-secondary" onClick={() => showToast('Settings reset to default.', 'info')}>
                Reset
              </button>
              <button className="tm-btn tm-btn-primary" onClick={() => showToast('Global Testimonial Settings saved successfully!')}>
                Save Settings
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
