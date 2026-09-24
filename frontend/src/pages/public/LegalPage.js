/* eslint-disable */
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getPublicPageBySlug } from "../../services/cmsPageService";
import TravelLoadingScreen from "../../components/layout/TravelLoadingScreen";
import "../../STYLES/LegalPage.css";

function replaceBrandName(text) {
  if (!text || typeof text !== "string") return text;
  return text
    .replace(/Pick\s*N\s*Book/gi, "Pick&book")
    .replace(/Pick&Book/gi, "Pick&book");
}

function formatLegalContent(text) {
  if (!text) return [];
  return replaceBrandName(text)
    .split("\n")
    .map((p) => p.trim())
    .filter((p) => p !== "");
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
      document.title = replaceBrandName(page.metaTitle || page.title || "Pick&book");
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute("content", replaceBrandName(page.metaDescription || ""));
      }
    }
    return () => {
      document.title = "Pick&book - Premium Travel Booking";
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

          <h1>Page not available</h1>
          <p>{error || "The requested policy page is not configured yet."}</p>
        </section>
      </main>
    );
  }

  const rawDescription = replaceBrandName(page.description || "");
  const isHtml = /<[a-z][\s\S]*>/i.test(rawDescription);
  const contentLines = isHtml ? [] : formatLegalContent(rawDescription);

  return (
    <main className="legal-page">
      <section className="legal-shell">


        <header className="legal-hero">
          <h1>{replaceBrandName(page.title)}</h1>
          {page.metaDescription ? <span>{replaceBrandName(page.metaDescription)}</span> : null}
        </header>

        <article className="legal-content-card">
          {isHtml ? (
            <div dangerouslySetInnerHTML={{ __html: rawDescription }} />
          ) : contentLines.length > 0 ? (
            contentLines.map((line, index) => {
              // Detect lines that look like headings (numbered, lettered, or short capitalized lines)
              const isHeading = /^\d+\.\s+[A-Za-z]/.test(line) || /^[a-z]\.\s+[A-Za-z]/.test(line) || (line.length < 60 && !line.includes('.') && line === line.toUpperCase()) || line.endsWith(':');

              if (isHeading) {
                return (
                  <h3 className="policy-heading" key={index}>
                    {line}
                  </h3>
                );
              }

              return (
                <p className="policy-paragraph" key={index}>
                  {line}
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
