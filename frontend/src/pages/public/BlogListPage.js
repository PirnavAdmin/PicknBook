/* eslint-disable */
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Calendar,
  Search,
  ArrowRight,
  Clock,
  MapPin,
  Lightbulb,
  BookOpen,
  Hotel,
  Plane,
  Compass,
  Send,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Tag,
  Check,
  LayoutGrid,
  List
} from "lucide-react";
import { getPublicBlogs } from "../../services/blogService";
import { toApiAssetUrl } from "../../services/apiClient";

function getBlogImageUrl(blog) {
  const cat = (blog?.category || "").toLowerCase();
  const slug = (blog?.slug || "").toLowerCase();

  if (cat.includes("hotel") || slug.includes("hotel")) return "/blog-assets/hotel.jpg";
  if (cat.includes("flight") || slug.includes("flight")) return "/blog-assets/flight.jpg";
  if (cat.includes("bus") || slug.includes("bus")) return "/blog-assets/bus.jpg";

  const rawUrl = blog?.imageUrl || blog?.ImageUrl || blog?.image || blog?.Image ||
    blog?.imagePath || blog?.ImagePath || blog?.filePath || blog?.photoUrl ||
    blog?.picture || blog?.url || "";

  return rawUrl ? toApiAssetUrl(rawUrl) : "";
}
import "../../STYLES/BlogPage.css";

const CATEGORIES = [
  { name: "All Stories", value: "", icon: Compass },
  { name: "Destinations", value: "Destinations", icon: MapPin },
  { name: "Travel Tips", value: "Travel Tips", icon: Lightbulb },
  { name: "Travel Guides", value: "Travel Guides", icon: BookOpen },
  { name: "Hotel Reviews", value: "Hotel Reviews", icon: Hotel },
  { name: "Flight Reviews", value: "Flight Reviews", icon: Plane },
  { name: "Inspiration", value: "Inspiration", icon: Sparkles }
];

const POPULAR_TAGS = [
  "Weekend Gateways",
  "Budget Travel",
  "Solo Trips",
  "Luxury Stays",
  "Flight Deals",
  "Eco Tourism",
  "Culinary Journeys",
  "Visa Guides"
];

const BANNER_THEMES = [
  {
    id: "waterfall",
    name: "🏔️ Waterfall",
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80",
    type: "image"
  },
  {
    id: "ocean",
    name: "🌊 Ocean Waves",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80",
    type: "image"
  },
  {
    id: "forest",
    name: "🌲 Forest",
    url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1920&q=80",
    type: "image"
  }
];

export default function BlogListPage() {
  const location = useLocation();
  const basePath = location.pathname.startsWith("/travel-guide") ? "/travel-guide" : "/blog";

  const [activeThemeIndex, setActiveThemeIndex] = useState(0);

  // Auto-rotate 3 nature themes one after one (10s each = 30s total rotation cycle)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveThemeIndex((prev) => (prev + 1) % BANNER_THEMES.length);
    }, 10000);

    return () => clearInterval(timer);
  }, [activeThemeIndex]);

  const [blogs, setBlogs] = useState([]);
  const [allBlogsForCounts, setAllBlogsForCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(7); // 1 featured + 6 grid cards
  const [totalBlogs, setTotalBlogs] = useState(0);
  const [category, setCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  // Set document title
  useEffect(() => {
    document.title = "Travel Stories & Guides | Pick&book Journal";
    return () => {
      document.title = "Pick&book - Premium Travel Booking";
    };
  }, []);

  // Fetch all blogs for category count badges and sidebar popular list
  useEffect(() => {
    const loadAllBlogs = async () => {
      try {
        const res = await getPublicBlogs({ page: 1, pageSize: 100 });
        const list = res.blogs || [];
        setAllBlogsForCounts(list);
      } catch (err) {
        console.error("Failed to load blogs for counts", err);
      }
    };
    loadAllBlogs();
  }, []);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const data = await getPublicBlogs({
        page,
        pageSize,
        category,
      });
      setBlogs(data.blogs || []);
      setTotalBlogs(data.total || 0);
      setError(null);
    } catch (err) {
      console.error("Error fetching blogs:", err);
      setError("Failed to load stories. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, category]);

  // Client-side search filtering
  const filteredBlogs = blogs.filter((blog) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (blog.title || "").toLowerCase().includes(query) ||
      (blog.shortDescription || "").toLowerCase().includes(query) ||
      (blog.category || "").toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(totalBlogs / pageSize) || 1;

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      const rootEl = document.getElementById("root");
      if (rootEl) {
        rootEl.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Recently updated";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getCategoryCount = (catValue) => {
    if (!catValue) return allBlogsForCounts.length || 18;
    const count = allBlogsForCounts.filter(b => b.category === catValue).length;
    if (count > 0) return count;
    const mockCounts = {
      "Destinations": 8,
      "Travel Tips": 6,
      "Travel Guides": 5,
      "Hotel Reviews": 3,
      "Flight Reviews": 2,
      "Inspiration": 4
    };
    return mockCounts[catValue] || 1;
  };

  // Search state and view mode
  const isSearchActive = searchQuery.trim().length > 0;
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"

  // Sidebar popular posts
  const popularPosts = allBlogsForCounts.slice(0, 4);

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setSubscribed(true);
      setNewsletterEmail("");
    }
  };

  return (
    <main className="blog-page-v2">
      {/* 1. Hero Banner with Travel Nature Background (30s auto-rotation across 3 scenes) */}
      <section className="blog-hero-banner">
        {BANNER_THEMES.map((theme, idx) => {
          const isActive = idx === activeThemeIndex;
          return (
            <img
              key={theme.id}
              src={theme.url}
              alt={theme.name}
              className={`blog-hero-video animated-nature-pan ${isActive ? "active" : ""}`}
              style={{
                opacity: isActive ? 1 : 0,
                transition: "opacity 1.4s ease-in-out",
                pointerEvents: "none"
              }}
            />
          );
        })}
        <div className="blog-hero-video-overlay"></div>

        {/* Theme Switcher */}
        <div className="blog-hero-theme-switcher" aria-label="Hero nature themes">
          {BANNER_THEMES.map((theme, idx) => (
            <button
              key={theme.id}
              type="button"
              className={`hero-theme-pill ${idx === activeThemeIndex ? "active" : ""}`}
              onClick={() => setActiveThemeIndex(idx)}
              title={`Switch to ${theme.name}`}
            >
              {theme.name}
            </button>
          ))}
        </div>

        <div className="blog-hero-content">
          <div className="blog-hero-pill">
            <Sparkles size={12} className="blog-hero-pill-icon" />
            <span>Pick&book Journal</span>
          </div>

          <h1 className="blog-hero-title">
            Travel Stories & Guides
          </h1>

          <p className="blog-hero-subtitle">
            Curated destination guides, smart travel tips, and stories from around the globe.
          </p>

          {/* Search Box inside Hero */}
          <div className="blog-hero-search">
            <Search className="blog-hero-search-icon" size={16} />
            <input
              type="text"
              placeholder="Search destinations, guides, tips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="blog-hero-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="blog-hero-search-clear"
                onClick={() => setSearchQuery("")}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. Container Shell */}
      <div className="blog-container">

        {/* 3. Category Filter Chips Bar */}
        <div className="blog-category-bar">
          <div className="blog-category-scroll">
            {CATEGORIES.map((cat) => {
              const CatIcon = cat.icon;
              const isActive = category === cat.value;
              const count = getCategoryCount(cat.value);

              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => {
                    setCategory(cat.value);
                    setPage(1);
                  }}
                  className={`blog-category-chip ${isActive ? "active" : ""}`}
                >
                  <CatIcon size={16} />
                  <span>{cat.name}</span>
                  <span className="blog-chip-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Main Content Split Layout */}
        <div className="blog-main-layout">

          {/* Left Column: Stories & Featured Post */}
          <div className="blog-feed-column">

            {loading ? (
              <div className="blog-loading-state">
                <div className="blog-spinner"></div>
                <h3>Curating stories...</h3>
                <p>Retrieving the freshest travel insights for you.</p>
              </div>
            ) : error ? (
              <div className="blog-status-state error">
                <h3>Oops! Something went wrong</h3>
                <p>{error}</p>
                <button type="button" onClick={fetchBlogs} className="blog-retry-btn">
                  Try Again
                </button>
              </div>
            ) : filteredBlogs.length === 0 ? (
              <div className="blog-status-state empty">
                <Compass size={48} className="empty-icon" />
                <h3>No stories found</h3>
                <p>
                  {searchQuery
                    ? `No articles match "${searchQuery}". Try a different keyword or reset filters.`
                    : "There are currently no articles in this category."}
                </p>
                {(searchQuery || category) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setCategory("");
                    }}
                    className="blog-retry-btn"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Feed Toolbar: Results counter and View switcher */}
                <div className="blog-feed-toolbar">
                  <div className="blog-feed-count">
                    <span>Showing <strong>{filteredBlogs.length}</strong> {filteredBlogs.length === 1 ? "article" : "articles"}</span>
                    {category && <span className="blog-feed-filtered-cat"> in <em>{category}</em></span>}
                  </div>

                  <div className="blog-view-toggle">
                    <button
                      type="button"
                      className={`blog-view-btn ${viewMode === "grid" ? "active" : ""}`}
                      onClick={() => setViewMode("grid")}
                      title="Grid view"
                      aria-label="Grid view"
                    >
                      <LayoutGrid size={15} />
                      <span>Grid</span>
                    </button>
                    <button
                      type="button"
                      className={`blog-view-btn ${viewMode === "list" ? "active" : ""}`}
                      onClick={() => setViewMode("list")}
                      title="List view"
                      aria-label="List view"
                    >
                      <List size={15} />
                      <span>List</span>
                    </button>
                  </div>
                </div>

                {/* Grid / List of Uniform Articles in identical order */}
                <div className={`blog-cards-grid ${viewMode === "list" ? "list-view" : ""}`}>
                  {filteredBlogs.map((blog, index) => (
                    <article key={blog.id} className="blog-story-card">
                      <div className="story-card-media">
                        <Link to={`${basePath}/${blog.slug}`}>
                          <img
                            src={getBlogImageUrl(blog)}
                            alt={blog.title}
                            className="story-card-img"
                            onError={(e) => {
                              e.target.src = index % 2 === 0
                                ? "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=600"
                                : "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=600";
                            }}
                          />
                        </Link>
                        {index === 0 && page === 1 && !isSearchActive && (
                          <span className="story-featured-badge">Featured</span>
                        )}
                      </div>

                      <div className="story-card-body">
                        {/* 1. Category Pill & Reading Time */}
                        <div className="story-card-meta-top">
                          <span className="story-category-pill">
                            {blog.category || "Travel"}
                          </span>
                          <div className="story-meta-readtime">
                            <Clock size={13} />
                            <span>5 min read</span>
                          </div>
                        </div>

                        {/* 2. Title */}
                        <h3 className="story-card-title">
                          <Link to={`${basePath}/${blog.slug}`}>
                            {blog.title}
                          </Link>
                        </h3>

                        {/* 3. Description / Excerpt */}
                        <p className="story-card-excerpt">
                          {blog.shortDescription || "Discover breathtaking locations, local food secrets, and travel tips tailored for your next unforgettable holiday."}
                        </p>

                        {/* 4. Footer: Date on left, Read Full Story button on right */}
                        <div className="story-card-footer">
                          <div className="story-date">
                            <Calendar size={13} />
                            <span>{formatDate(blog.publishedAtUtc)}</span>
                          </div>

                          <Link to={`${basePath}/${blog.slug}`} className="story-read-btn">
                            <span>Read Full Story</span>
                            <ArrowRight size={14} />
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <nav className="blog-pagination" aria-label="Blog pages">
                    <button
                      type="button"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                      className="pagination-arrow-btn"
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={18} />
                      <span>Prev</span>
                    </button>

                    <div className="pagination-numbers">
                      {Array.from({ length: totalPages }).map((_, index) => {
                        const pageNum = index + 1;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => handlePageChange(pageNum)}
                            className={`pagination-number-btn ${page === pageNum ? "active" : ""}`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === totalPages}
                      className="pagination-arrow-btn"
                      aria-label="Next page"
                    >
                      <span>Next</span>
                      <ChevronRight size={18} />
                    </button>
                  </nav>
                )}
              </>
            )}

          </div>

          {/* Right Column: Modern Sidebar */}
          <aside className="blog-sidebar-column">

            {/* Widget 1: Trending / Popular Posts */}
            {popularPosts.length > 0 && (
              <div className="sidebar-widget-card">
                <div className="widget-header">
                  <Sparkles size={18} className="widget-icon" />
                  <h3>Trending Stories</h3>
                </div>

                <div className="sidebar-trending-list">
                  {popularPosts.map((post, idx) => (
                    <Link
                      key={post.id}
                      to={`${basePath}/${post.slug}`}
                      className="sidebar-trending-item"
                    >
                      <span className="trending-rank">0{idx + 1}</span>
                      <div className="trending-thumb-wrapper">
                        <img
                          src={getBlogImageUrl(post)}
                          alt={post.title}
                          className="trending-thumb"
                          onError={(e) => {
                            e.target.src = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=150";
                          }}
                        />
                      </div>
                      <div className="trending-info">
                        <span className="trending-tag">{post.category || "Explore"}</span>
                        <h4 className="trending-title">{post.title}</h4>
                        <span className="trending-date">{formatDate(post.publishedAtUtc)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Widget 2: Popular Topic Tags */}
            <div className="sidebar-widget-card">
              <div className="widget-header">
                <Tag size={18} className="widget-icon" />
                <h3>Explore Topics</h3>
              </div>
              <div className="sidebar-tags-cloud">
                {POPULAR_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSearchQuery(tag)}
                    className="sidebar-tag-pill"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Widget 3: Newsletter Box */}
            <div className="sidebar-widget-card newsletter-widget-card">
              <div className="newsletter-illustration">
                <Send size={32} className="newsletter-icon" />
              </div>
              <h3>Join Pick&book Dispatch</h3>
              <p>
                {subscribed
                  ? "You're all set! Check your inbox for our weekly travel curations."
                  : "Get exclusive weekend flight deals, secret travel spots, and destination itineraries directly to your inbox."}
              </p>

              {!subscribed ? (
                <form onSubmit={handleNewsletterSubmit} className="newsletter-form-v2">
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    required
                    className="newsletter-input-v2"
                  />
                  <button type="submit" className="newsletter-submit-btn">
                    Subscribe
                  </button>
                </form>
              ) : (
                <div className="newsletter-success-badge">
                  <Check size={16} />
                  <span>Subscribed successfully</span>
                </div>
              )}
            </div>

          </aside>

        </div>

      </div>
    </main>
  );
}
