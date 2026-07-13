import React, { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import {
  Calendar,
  User,
  ArrowLeft,
  Facebook,
  Twitter,
  Link2,
  Star,
  Compass,
  MapPin,
  DollarSign,
  Plane,
  Clock,
  ArrowRight,
  BookOpen
} from "lucide-react";
import { getPublicBlogBySlug, getPublicBlogs } from "../../services/blogService";
import { toApiAssetUrl } from "../../services/apiClient";
import "../../STYLES/BlogPage.css";

export default function BlogDetailPage() {
  const { id: slugParam, slug: fallbackSlug } = useParams();
  const slug = slugParam || fallbackSlug;
  const location = useLocation();
  const backPath = location.pathname.startsWith("/travel-guide") ? "/travel-guide" : "/blog";

  const [blog, setBlog] = useState(null);
  const [relatedBlogs, setRelatedBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBlogDetailsAndRelated = async () => {
      setLoading(true);
      try {
        const data = await getPublicBlogBySlug(slug);
        setBlog(data);
        setError(null);

        // Fetch related blogs in the same category
        try {
          const listData = await getPublicBlogs({ page: 1, pageSize: 4, category: data.category || "" });
          if (listData && listData.blogs) {
            // Exclude current blog
            const filtered = listData.blogs.filter(b => b.slug !== slug).slice(0, 3);
            setRelatedBlogs(filtered);
          }
        } catch (err) {
          console.error("Error fetching related blogs:", err);
        }
      } catch (err) {
        console.error("Error fetching blog details:", err);
        if (err.response && err.response.status === 404) {
          setError("The requested blog article does not exist or is not published.");
        } else {
          setError("Failed to load blog article details.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchBlogDetailsAndRelated();
    }
  }, [slug]);

  // Dynamically set HTML metadata tags
  useEffect(() => {
    if (blog) {
      document.title = blog.metaTitle || blog.title || "Pick N Book Blog";
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute("content", blog.metaDescription || blog.shortDescription || "");
      }
    }
    return () => {
      document.title = "Pick N Book - Premium Travel Booking";
    };
  }, [blog]);

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

  // Helper to parse destinations dynamically from HTML description
  const parseDestinations = (htmlContent) => {
    if (!htmlContent) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    const headings = Array.from(doc.querySelectorAll("h2, h3"));

    if (headings.length === 0) return null; // Fallback to normal rendering

    const destinationsList = [];

    headings.forEach((heading, index) => {
      const title = heading.textContent;
      let imgUrl = null;
      let description = "";

      // Setup placeholders for detailed fields
      const details = {
        bestTime: "",
        thingsToDo: "",
        idealFor: "",
        budget: ""
      };
      let travelTip = "";

      let next = heading.nextElementSibling;
      const siblings = [];
      while (next && next.tagName !== "H2" && next.tagName !== "H3") {
        siblings.push(next);
        next = next.nextElementSibling;
      }

      siblings.forEach(el => {
        // Extract image
        if (el.tagName === "IMG") {
          imgUrl = el.src;
        } else {
          const innerImg = el.querySelector("img");
          if (innerImg) imgUrl = innerImg.src;
        }

        // Extract description
        const textLower = el.textContent.toLowerCase();
        if (
          el.tagName === "P" &&
          !textLower.includes("travel tip") &&
          !textLower.includes("best time to visit") &&
          !textLower.includes("things to do") &&
          !textLower.includes("ideal for") &&
          !textLower.includes("budget")
        ) {
          description += el.outerHTML;
        }

        // Extract specific attributes if matches text pattern
        if (textLower.includes("best time to visit")) {
          details.bestTime = el.textContent.replace(/best time to visit:?/gi, "").trim();
        } else if (textLower.includes("things to do")) {
          details.thingsToDo = el.textContent.replace(/things to do:?/gi, "").trim();
        } else if (textLower.includes("ideal for")) {
          details.idealFor = el.textContent.replace(/ideal for:?/gi, "").trim();
        } else if (textLower.includes("budget")) {
          details.budget = el.textContent.replace(/budget:?/gi, "").trim();
        }

        // Extract blockquote or custom tip styling
        if (el.tagName === "BLOCKQUOTE" || textLower.includes("travel tip")) {
          travelTip = el.textContent.replace(/travel tip:?/gi, "").trim();
        }
      });

      // Default mock values mapping dynamically for high fidelity presentation
      const defaultDataMap = [
        {
          bestTime: "Nov to Apr",
          thingsToDo: "Snorkeling, Scuba Diving, Water Villas",
          idealFor: "Honeymooners, Luxury Seekers",
          budget: "$$$",
          travelTip: "Book your stay in advance to get the best deals on water villas."
        },
        {
          bestTime: "Apr to Oct",
          thingsToDo: "Surfing, Temple Tours, Beach Cafes",
          idealFor: "Couples, Solo Travelers, Digital Nomads",
          budget: "$$",
          travelTip: "Don't miss the sunset at Tanah Lot Temple!"
        },
        {
          bestTime: "Nov to Apr",
          thingsToDo: "Island Hopping, Scuba Diving, Night Markets",
          idealFor: "Friends, Families",
          budget: "$$",
          travelTip: "Visit the Phi Phi Islands for a once-in-a-lifetime experience."
        }
      ];

      const defaultSet = defaultDataMap[index % defaultDataMap.length];

      destinationsList.push({
        id: `dest-${index}`,
        number: String(index + 1).padStart(2, "0"),
        title,
        imgUrl: imgUrl || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800",
        description: description || "<p>Experience pristine beaches, dynamic cultural scenes, and unforgettable coastal landscapes.</p>",
        bestTime: details.bestTime || defaultSet.bestTime,
        thingsToDo: details.thingsToDo || defaultSet.thingsToDo,
        idealFor: details.idealFor || defaultSet.idealFor,
        budget: details.budget || defaultSet.budget,
        travelTip: travelTip || defaultSet.travelTip
      });
    });

    return destinationsList;
  };

  const parsedDestinations = blog ? parseDestinations(blog.longDescription) : null;

  if (loading) {
    return (
      <main className="blog-page">
        <section className="blog-shell blog-empty-state">
          <h3>Loading Article...</h3>
          <p>Please wait while we retrieve the details.</p>
        </section>
      </main>
    );
  }

  if (error || !blog) {
    return (
      <main className="blog-page">
        <section className="blog-shell blog-empty-state">
          <Link className="blog-back-link" to={backPath}>
            <ArrowLeft size={18} />
            Back to blogs
          </Link>
          <h3>Article Not Available</h3>
          <p>{error || "We could not find the blog you are looking for."}</p>
        </section>
      </main>
    );
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Article link copied to clipboard!");
  };

  return (
    <main className="blog-page">
      <div className="blog-detail-container">
        {/* Breadcrumbs */}
        <nav className="blog-breadcrumbs">
          <Link to="/">Home</Link>
          <span>&rsaquo;</span>
          <Link to="/blog">Blogs</Link>
          <span>&rsaquo;</span>
          <Link to={`/blog?category=${encodeURIComponent(blog.category || "")}`}>{blog.category || "Destinations"}</Link>
          <span>&rsaquo;</span>
          <span className="current">{blog.title}</span>
        </nav>

        {/* Hero Header Layout */}
        <header className="blog-hero-header">
          <div className="blog-hero-left">
            <span className="detail-category-badge">{blog.category || "Destinations"}</span>
            <h1 className="detail-main-title">{blog.title}</h1>
            <p className="detail-main-subtitle">
              {blog.subTitle || blog.shortDescription || "Explore the ultimate destination guide for this year."}
            </p>

            <div className="detail-author-row">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150"
                alt="Author avatar"
                className="author-avatar-img"
              />
              <div className="author-info-meta">
                <span className="author-name">{blog.addedByName || "Admin"}</span>
                <span className="author-role">Travel Explorer</span>
              </div>
              <div className="author-divider"></div>
              <div className="detail-publish-meta">
                <span className="meta-date">
                  <Calendar size={14} />
                  {formatDate(blog.publishedAtUtc || blog.createdAtUtc)}
                </span>
                <span className="meta-readtime">
                  <Clock size={14} />
                  5 min read
                </span>
              </div>
            </div>

            <div className="detail-share-row">
              <span className="share-label">Share</span>
              <button className="share-btn social-fb" onClick={() => window.open(`https://facebook.com/sharer/sharer.php?u=${window.location.href}`, '_blank')}>
                <Facebook size={14} />
              </button>
              <button className="share-btn social-tw" onClick={() => window.open(`https://twitter.com/intent/tweet?url=${window.location.href}`, '_blank')}>
                <Twitter size={14} />
              </button>
              <button className="share-btn social-copy" onClick={copyToClipboard}>
                <Link2 size={14} />
              </button>
            </div>
          </div>

          <div className="blog-hero-right">
            <img
              src={toApiAssetUrl(blog.imageUrl)}
              alt={blog.title}
              className="detail-hero-img"
              onError={(e) => {
                e.target.src = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800";
              }}
            />
          </div>
        </header>

        {/* Split Layout */}
        <div className="blog-detail-split-layout">
          {/* Main Column */}
          <div className="blog-detail-main-column">
            {/* Quick Highlights Panel */}
            <div className="quick-highlights-panel">
              <div className="highlights-icon-badge">
                <Star size={20} fill="#ffffff" color="#ffffff" />
              </div>
              <div className="highlights-grid">
                <h4 className="highlights-main-title">Quick Highlights</h4>
                <div className="highlights-items-container">
                  <div className="highlight-item">
                    <span className="highlight-dot"></span>
                    <span className="highlight-text">Top 10 handpicked beach destinations</span>
                  </div>
                  <div className="highlight-item">
                    <span className="highlight-dot"></span>
                    <span className="highlight-text">Best time to visit each place</span>
                  </div>
                  <div className="highlight-item">
                    <span className="highlight-dot"></span>
                    <span className="highlight-text">Travel tips & things to do</span>
                  </div>
                  <div className="highlight-item">
                    <span className="highlight-dot"></span>
                    <span className="highlight-text">Budget-friendly options</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Intro Content Divider */}
            <div className="detail-cross-divider">
              <div className="divider-line"></div>
              <span className="divider-cross">&times;</span>
              <div className="divider-line"></div>
            </div>

            {/* Structured Destinations OR Fallback Rich Content */}
            {parsedDestinations && parsedDestinations.length > 0 ? (
              <div className="destinations-layout-list">
                {parsedDestinations.map((dest) => (
                  <div key={dest.id} id={dest.id} className="destination-detail-card">
                    <h2 className="destination-card-header">
                      <span className="dest-num">{dest.number}</span>
                      {dest.title}
                    </h2>

                    <div className="destination-card-body">
                      <div className="dest-body-left">
                        <img src={dest.imgUrl} alt={dest.title} className="dest-image" />
                      </div>
                      <div className="dest-body-right">
                        <div
                          className="dest-description"
                          dangerouslySetInnerHTML={{ __html: dest.description }}
                        />
                        <div className="dest-meta-attributes-list">
                          <div className="dest-attr-item">
                            <span className="attr-icon-wrapper"><Clock size={14} /></span>
                            <div className="attr-info">
                              <span className="attr-label">Best Time to Visit:</span>
                              <span className="attr-value">{dest.bestTime}</span>
                            </div>
                          </div>
                          <div className="dest-attr-item">
                            <span className="attr-icon-wrapper"><Compass size={14} /></span>
                            <div className="attr-info">
                              <span className="attr-label">Things to Do:</span>
                              <span className="attr-value">{dest.thingsToDo}</span>
                            </div>
                          </div>
                          <div className="dest-attr-item">
                            <span className="attr-icon-wrapper"><User size={14} /></span>
                            <div className="attr-info">
                              <span className="attr-label">Ideal For:</span>
                              <span className="attr-value">{dest.idealFor}</span>
                            </div>
                          </div>
                          <div className="dest-attr-item">
                            <span className="attr-icon-wrapper"><DollarSign size={14} /></span>
                            <div className="attr-info">
                              <span className="attr-label">Budget:</span>
                              <span className="attr-value">{dest.budget}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {dest.travelTip && (
                      <div className="destination-tip-banner">
                        <span className="tip-bulb-icon">&💡</span>
                        <div className="tip-content">
                          <span className="tip-title">Travel Tip:</span>
                          <span className="tip-desc">{dest.travelTip}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <article className="blog-detail-content-card">
                <div
                  className="blog-rich-content"
                  dangerouslySetInnerHTML={{ __html: blog.longDescription }}
                />
              </article>
            )}
          </div>

          {/* Sidebar Column */}
          <aside className="blog-detail-sidebar-column">
            {/* About Author Widget */}
            <div className="sidebar-widget-card author-widget-card">
              <h4 className="widget-header-title">About the Author</h4>
              <div className="author-card-content">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150"
                  alt="Author avatar"
                  className="author-widget-avatar"
                />
                <h5 className="author-widget-name">{blog.addedByName || "Admin"}</h5>
                <p className="author-widget-bio">
                  Travel enthusiast and content creator, dedicated to exploring new places and sharing travel tips.
                </p>
                <div className="author-widget-socials">
                  <span className="widget-social-icon"><Facebook size={14} /></span>
                  <span className="widget-social-icon"><Twitter size={14} /></span>
                  <span className="widget-social-icon"><Link2 size={14} /></span>
                </div>
              </div>
            </div>

            {/* Table of Contents */}
            {parsedDestinations && parsedDestinations.length > 0 && (
              <div className="sidebar-widget-card toc-widget-card">
                <h4 className="widget-header-title">Table of Contents</h4>
                <div className="toc-items-list">
                  {parsedDestinations.map((dest) => (
                    <a key={dest.id} href={`#${dest.id}`} className="toc-item-link" onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(dest.id)?.scrollIntoView({ behavior: "smooth" });
                    }}>
                      <span className="toc-num">{dest.number}</span>
                      <span className="toc-text">{dest.title.replace(/^\d+\s*/, "")}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Plan Your Next Adventure CTA */}
            <div className="sidebar-widget-card plan-adventure-cta-card">
              <div className="plane-graphic-icon">
                <Plane size={36} color="#ffffff" strokeWidth={1.5} />
              </div>
              <h4 className="cta-heading-title">Plan Your Next Beach Adventure</h4>
              <p className="cta-description-text">
                Find the best deals on flights, hotels and holiday packages.
              </p>
              <Link to="/packages" className="cta-explore-button">
                Explore Now
              </Link>
            </div>

            {/* Related Posts */}
            {relatedBlogs.length > 0 && (
              <div className="sidebar-widget-card related-posts-widget-card">
                <h4 className="widget-header-title">Related Posts</h4>
                <div className="related-posts-list">
                  {relatedBlogs.map((rBlog) => (
                    <Link key={rBlog.id} to={`/blog/${rBlog.slug}`} className="related-post-item-row">
                      <img
                        src={toApiAssetUrl(rBlog.imageUrl)}
                        alt={rBlog.title}
                        className="related-item-img"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=150";
                        }}
                      />
                      <div className="related-item-content">
                        <span className="related-item-category">{rBlog.category || "Travel Tips"}</span>
                        <h5 className="related-item-title">{rBlog.title}</h5>
                        <div className="related-item-meta-row">
                          <span>{formatDate(rBlog.publishedAtUtc || rBlog.createdAtUtc)}</span>
                          <span>&bull;</span>
                          <span>5 min read</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Newsletter */}
            <div className="sidebar-widget-card newsletter-widget-card">
              <h4 className="widget-header-title">Never Miss a Story!</h4>
              <p className="newsletter-desc">
                Subscribe to our newsletter and get the latest travel stories and tips.
              </p>
              <form onSubmit={(e) => { e.preventDefault(); alert("Successfully subscribed!"); }} className="newsletter-form-group">
                <input type="email" placeholder="Enter your email" required className="newsletter-form-input" />
                <button type="submit" className="newsletter-form-submit-btn">Subscribe</button>
              </form>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
