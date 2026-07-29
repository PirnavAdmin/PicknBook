/* eslint-disable */
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getPublicPageBySlug } from "../../services/cmsPageService";
import TravelLoadingScreen from "../../components/layout/TravelLoadingScreen";
import "../../STYLES/LegalPage.css";

function splitLegalContent(description) {
  return String(description || "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

export default function LegalPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      try {
        const data = await getPublicPageBySlug(slug);
        setPage(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching legal page:", err);
        if (err.response && err.response.status === 404) {
          setError("The requested page does not exist or is currently inactive.");
        } else {
          setError("Failed to load page content.");
        }
        setPage(null);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPage();
    }
  }, [slug]);

  // Set document metadata dynamically
  useEffect(() => {
    if (page) {
      document.title = page.metaTitle || page.title || "Pick N Book";
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute("content", page.metaDescription || "");
      }
    }
    return () => {
      document.title = "Pick N Book - Premium Travel Booking";
    };
  }, [page]);

  if (loading) {
    return (
      <TravelLoadingScreen
        title="Loading page..."
        message="Please wait while we retrieve the latest page content."
        variant="page"
        icon="route"
      />
    );
  }

  if (error || !page) {
    return (
      <main className="legal-page">
        <section className="legal-shell legal-empty">
          <Link className="legal-back-link" to="/">
            <ArrowLeft size={18} />
            Back to home
          </Link>
          <h1>Page not available</h1>
          <p>{error || "The requested policy page is not configured yet."}</p>
        </section>
      </main>
    );
  }

  const isHtml = /<[a-z][\s\S]*>/i.test(page.description || "");
  const contentBlocks = isHtml ? [] : splitLegalContent(page.description);

  return (
    <main className="legal-page">
      <section className="legal-shell">
        <Link className="legal-back-link" to="/">
          <ArrowLeft size={18} />
          Back to home
        </Link>

        <header className="legal-hero">
          <p>Pick N Book Policy</p>
          <h1>{page.title}</h1>
          {page.metaDescription ? <span>{page.metaDescription}</span> : null}
        </header>

        <article className="legal-content-card">
          {isHtml ? (
            <div dangerouslySetInnerHTML={{ __html: page.description }} />
          ) : contentBlocks.length > 0 ? (
            contentBlocks.map((block, index) => {
              const headingMatch = block.match(/^(\d+\.\s+.+)$/m);
              const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
              const isSection = headingMatch && lines[0] === headingMatch[1];

              if (isSection) {
                return (
                  <section className="legal-section" key={`${lines[0]}-${index}`}>
                    <h2>{lines[0]}</h2>
                    {lines.slice(1).map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </section>
                );
              }

              return (
                <p className="legal-intro" key={`${block.slice(0, 24)}-${index}`}>
                  {block}
                </p>
              );
            })
          ) : (
            <p className="legal-intro">This policy content is being updated.</p>
          )}
        </article>
      </section>
    </main>
  );
}
