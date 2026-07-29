/* eslint-disable */
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Calendar,
  Search,
  User,
  ArrowRight,
  Clock,
  Folder,
  MapPin,
  Lightbulb,
  BookOpen,
  Hotel,
  Plane,
  Compass,
  Send,
  ChevronDown
} from "lucide-react";
import { getPublicBlogs } from "../../services/blogService";
import { toApiAssetUrl } from "../../services/apiClient";
import "../../STYLES/BlogPage.css";

export default function BlogListPage() {
  const location = useLocation();
  const basePath = location.pathname.startsWith("/travel-guide") ? "/travel-guide" : "/blog";

  const [blogs, setBlogs] = useState([]);
  const [allBlogsForCounts, setAllBlogsForCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters and pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6);
  const [totalBlogs, setTotalBlogs] = useState(0);
  const [category, setCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  // Fetch all blogs to dynamically calculate category counts
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
      setError("Failed to load blogs. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, category]);

  // Client-side search filtering
  const filteredBlogs = blogs.filter((blog) =>
    blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (blog.shortDescription || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(totalBlogs / pageSize) || 1;

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      const rootEl = document.getElementById("root");
      if (rootEl) {
        rootEl.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Mockup fallback or dynamically computed counts
  const getCategoryCount = (catValue) => {
    if (!catValue) {
      return allBlogsForCounts.length || 24;
    }
    const count = allBlogsForCounts.filter(b => b.category === catValue).length;
    if (count > 0) return count;

    // Mockup default values
    const mockCounts = {
      "Destinations": 8,
      "Travel Tips": 6,
      "Travel Guides": 5,
      "Hotel Reviews": 3,
      "Flight Reviews": 2,
      "Inspiration": 2
    };
    return mockCounts[catValue] || 2;
  };

  const categories = [
    { name: "All Categories", value: "", icon: Folder },
    { name: "Destinations", value: "Destinations", icon: MapPin },
    { name: "Travel Tips", value: "Travel Tips", icon: Lightbulb },
    { name: "Guides", value: "Travel Guides", icon: BookOpen },
    { name: "Hotel Reviews", value: "Hotel Reviews", icon: Hotel },
    { name: "Flight Reviews", value: "Flight Reviews", icon: Plane },
    { name: "Inspiration", value: "Inspiration", icon: Compass }
  ];

  // Popular posts - get first 4 blogs or mockup if empty
  const popularPosts = allBlogsForCounts.slice(0, 4);

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setSubscribed(true);
      setNewsletterEmail("");
    }
  };

  return (
    <main className="blog-page">
      <section className="blog-shell">

        {/* Header Section */}
        <div className="blog-header-row">
          <div className="blog-title-area">
            <h1>Blogs</h1>
            <p>Travel stories, tips and guides to inspire your next adventure.</p>
          </div>

          <div className="blog-controls-area">
            <div className="blog-search-box">
              <Search className="blog-search-icon" size={18} />
              <input
                type="text"
                placeholder="Search blogs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="blog-search-input"
              />
            </div>

            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="blog-category-dropdown"
            >
              <option value="">All Categories</option>
              {categories.slice(1).map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Main split layout */}
        <div className="blog-split-layout">

          {/* Left Column: Blogs List */}
          <div className="blog-cards-list">
            {loading ? (
              <div className="blog-empty-state">
                <h3>Loading Articles...</h3>
                <p>Please wait while we fetch the latest blog posts.</p>
              </div>
            ) : error ? (
              <div className="blog-empty-state">
                <h3>Something went wrong</h3>
                <p>{error}</p>
              </div>
            ) : filteredBlogs.length === 0 ? (
              <div className="blog-empty-state">
                <h3>No articles found</h3>
                <p>Try searching another topic or check back later.</p>
              </div>
            ) : (
              <>
                {filteredBlogs.map((blog) => (
                  <article key={blog.id} className="blog-row-card">
                    <div className="blog-row-card-img-wrapper">
                      <img
                        src={toApiAssetUrl(blog.imageUrl)}
                        alt={blog.title}
                        className="blog-row-card-img"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=600";
                        }}
                      />
                      <span className="blog-row-card-badge">
                        {blog.category || "General"}
                      </span>
                    </div>

                    <div className="blog-row-card-content">
                      <div>
                        <h3>{blog.title}</h3>
                        <p>{blog.shortDescription}</p>
                      </div>

                      <div className="blog-row-card-meta">
                        <div className="blog-row-card-metrics">
                          <div className="blog-row-card-metric-item">
                            <Calendar size={14} />
                            <span>{formatDate(blog.publishedAtUtc)}</span>
                          </div>
                          <div className="blog-row-card-metric-item">
                            <Clock size={14} />
                            <span>5 min read</span>
                          </div>
                        </div>

                        <Link to={`${basePath}/${blog.slug}`} className="blog-row-card-readmore">
                          Read More &rarr;
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="blog-pagination-row">
                    <div className="blog-paginator">
                      <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                        className="blog-paginator-btn"
                      >
                        &lt;
                      </button>

                      {Array.from({ length: totalPages }).map((_, index) => {
                        const pageNum = index + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`blog-paginator-btn ${page === pageNum ? "active" : ""}`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                        className="blog-paginator-btn"
                      >
                        &gt;
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Column: Sidebar */}
          <div className="blog-sidebar-col">

            {/* Categories Widget */}
            <div className="sidebar-card-box">
              <h3 className="sidebar-card-title">Categories</h3>
              <div className="sidebar-categories-list">
                {categories.map((cat) => {
                  const CatIcon = cat.icon;
                  const isActive = category === cat.value;
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => {
                        setCategory(cat.value);
                        setPage(1);
                      }}
                      className={`sidebar-category-row ${isActive ? "active" : ""}`}
                    >
                      <div className="sidebar-category-left">
                        <CatIcon size={16} />
                        <span>{cat.name}</span>
                      </div>
                      <span className="sidebar-category-count">
                        {getCategoryCount(cat.value)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Popular Posts Widget */}
            {popularPosts.length > 0 && (
              <div className="sidebar-card-box">
                <h3 className="sidebar-card-title">Popular Posts</h3>
                <div className="sidebar-popular-list">
                  {popularPosts.map((post) => (
                    <Link
                      key={post.id}
                      to={`${basePath}/${post.slug}`}
                      className="sidebar-popular-item"
                    >
                      <img
                        src={toApiAssetUrl(post.imageUrl)}
                        alt={post.title}
                        className="popular-item-img"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=150";
                        }}
                      />
                      <div className="popular-item-info">
                        <h4>{post.title}</h4>
                        <span>{formatDate(post.publishedAtUtc)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Newsletter Widget */}
            <div className="sidebar-card-box newsletter-card-box">
              <Send className="newsletter-plane-icon" size={60} />
              <h3>Never Miss a Story!</h3>
              <p>
                {subscribed
                  ? "Thank you for subscribing!"
                  : "Subscribe to our newsletter and get the latest travel stories and tips."}
              </p>

              {!subscribed && (
                <form onSubmit={handleNewsletterSubmit} className="newsletter-input-group">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    required
                    className="newsletter-input"
                  />
                  <button type="submit" className="newsletter-btn">
                    Subscribe
                  </button>
                </form>
              )}
            </div>

          </div>

        </div>

      </section>
    </main>
  );
}
