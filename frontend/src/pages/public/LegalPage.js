/* eslint-disable */
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getPublicPageBySlug } from "../../services/cmsPageService";
import TravelLoadingScreen from "../../components/layout/TravelLoadingScreen";
import "../../STYLES/LegalPage.css";
import "../../STYLES/Privacy.css";
import { DEFAULT_CMS_PAGES, normalizePolicySlug } from "../../data/legalPages";

function replaceBrandName(text) {
  if (!text || typeof text !== "string") return text;
  return text
    .replace(/\bPick\s+N\s+Book\b/gi, "Pick&book")
    .replace(/\bPick\s*&\s*Book\b/gi, "Pick&book");
}

function formatLegalContent(text) {
  if (!text) return [];
  return replaceBrandName(text)
    .split("\n")
    .map((p) => p.trim())
    .filter((p) => p !== "");
}

function isTermsSectionHeading(line) {
  return /^\d{1,2}\.\s+[A-Z]/.test(line) && !/^\d+\.\d+\s+/.test(line);
}

function renderTermsSectionContent(lines, sectionKey) {
  const content = [];
  let index = 0;
  const isPlainLineSection = /(?:^|-)section-(?:23|30)$/.test(sectionKey);

  while (index < lines.length) {
    const line = lines[index];
    const clauseMatch = line.match(/^(\d+\.\d+)\s+(.*)$/);

    if (clauseMatch) {
      content.push(
        <div className="terms-clause" key={`${sectionKey}-clause-${index}`}>
          <span className="terms-clause-number">{clauseMatch[1]}</span>
          <span className="terms-clause-text">{clauseMatch[2]}</span>
        </div>
      );
      index += 1;

      if (clauseMatch[2].trim().endsWith(":") && !isPlainLineSection) {
        const items = [];
        while (
          index < lines.length &&
          !/^\d+\.\d+\s+/.test(lines[index]) &&
          !/^[a-i]\.\s+/.test(lines[index])
        ) {
          items.push(lines[index]);
          index += 1;
        }
        if (items.length > 0) {
          content.push(
            <ul className="terms-bullet-list" key={`${sectionKey}-clause-list-${index}`}>
              {items.map((item, itemIndex) => (
                <li key={`${sectionKey}-clause-item-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          );
        }
      }
      continue;
    }

    if (/^[a-i]\.\s+/.test(line)) {
      const bullets = [];
      while (index < lines.length && /^[a-i]\.\s+/.test(lines[index])) {
        bullets.push(lines[index].replace(/^[a-i]\.\s+/, ""));
        index += 1;
      }
      content.push(
        <ul className="terms-bullet-list" key={`${sectionKey}-list-${index}`}>
          {bullets.map((bullet, bulletIndex) => (
            <li key={`${sectionKey}-bullet-${bulletIndex}`}>{bullet}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (line.endsWith(":") && !isPlainLineSection) {
      content.push(
        <p className="terms-body-line" key={`${sectionKey}-intro-${index}`}>
          {line}
        </p>
      );
      index += 1;

      const items = [];
      while (
        index < lines.length &&
        !/^\d+\.\d+\s+/.test(lines[index]) &&
        !/^[a-i]\.\s+/.test(lines[index]) &&
        !lines[index].endsWith(":")
      ) {
        items.push(lines[index]);
        index += 1;
      }
      if (items.length > 0) {
        const isContactBlock = items.some(
          (item) =>
            /^email\s*:/i.test(item) ||
            /^phone\s*:/i.test(item) ||
            /^address\s*:/i.test(item) ||
            /contact@/i.test(item) ||
            /pirnav software/i.test(item) ||
            /capital park/i.test(item) ||
            /hyderabad/i.test(item) ||
            /500081/i.test(item)
        );

        if (isContactBlock) {
          items.forEach((item, itemIndex) => {
            content.push(
              <p className="terms-body-line terms-contact-line" style={{ margin: "4px 0", paddingLeft: 0 }} key={`${sectionKey}-contact-${index}-${itemIndex}`}>
                {item}
              </p>
            );
          });
        } else {
          content.push(
            <ul className="terms-bullet-list" key={`${sectionKey}-plain-list-${index}`}>
              {items.map((item, itemIndex) => (
                <li key={`${sectionKey}-plain-item-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          );
        }
      }
      continue;
    }

    content.push(
      <p className="terms-body-line" key={`${sectionKey}-body-${index}`}>
        {line}
      </p>
    );
    index += 1;
  }

  return content;
}

function renderTermsDocument(lines, pageTitle) {
  let title = pageTitle || "DOCUMENT";
  let effectiveDate = "";
  let startIndex = 0;

  if (lines[0] && lines[0].toUpperCase().includes("TERMS")) {
    title = lines[0];
    effectiveDate = lines[1] || "";
    startIndex = 2;
  } else if (lines[0] && lines[0].toLowerCase().includes("last updated")) {
    title = pageTitle.toUpperCase();
    effectiveDate = lines[0];
    startIndex = 1;
  }

  const sections = [];
  let openingLines = [];
  let currentSection = null;

  lines.slice(startIndex).forEach((line) => {
    // Treat as heading if it matches numbered format or is short and title-cased/uppercase
    const isHeading = isTermsSectionHeading(line) || (line.length > 2 && line.length < 50 && !line.endsWith('.') && !line.endsWith(':') && (line === line.toUpperCase() || /^[A-Z][a-zA-Z\s]+$/.test(line)));

    if (isHeading) {
      currentSection = { heading: line, lines: [] };
      sections.push(currentSection);
      return;
    }

    if (currentSection) {
      currentSection.lines.push(line);
    } else {
      openingLines.push(line);
    }
  });

  return (
    <>
      <div className="terms-effective-date">
        {effectiveDate
          .split(/\s*\|\s*/)
          .filter(Boolean)
          .map((dateLabel, index) => (
            <span key={`terms-date-${index}`}>{dateLabel}</span>
          ))}
      </div>
      <h1 className="terms-document-title">{title}</h1>
      <div className="terms-opening-copy">
        {openingLines.map((line, index) => (
          <p key={`terms-opening-${index}`}>{line}</p>
        ))}
      </div>
      {sections.map((section, index) => (
        <section className="terms-section" key={`terms-section-${index}`}>
          <h2>{section.heading}</h2>
          <div className="terms-section-content">
            {renderTermsSectionContent(section.lines, `terms-section-${index}`)}
          </div>
        </section>
      ))}
    </>
  );
}

export default function LegalPage() {
  const { slug } = useParams();
  const fallbackPage = DEFAULT_CMS_PAGES.find(
    (candidate) => normalizePolicySlug(candidate.slug) === normalizePolicySlug(slug)
  );
  const [page, setPage] = useState(() => fallbackPage || null);
  const [loading, setLoading] = useState(() => !fallbackPage);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        let apiSlug = slug;
        if (slug === "privacy-policy") apiSlug = "pickbook-privacy-policy";
        else if (slug === "refund-cancellation-policy") apiSlug = "return-cancellation-policy";

        const data = await getPublicPageBySlug(apiSlug);
        setPage(
          data?.description?.trim()
            ? data
            : fallbackPage
              ? { ...fallbackPage, ...data, description: fallbackPage.description }
              : data
        );
        setError(null);
      } catch (err) {
        console.error("Error fetching legal page:", err);
        if (fallbackPage) {
          setPage(fallbackPage);
          setError(null);
        } else if (err.response && err.response.status === 404) {
          setError("The requested page does not exist or is currently inactive.");
          setPage(null);
        } else {
          setError("Failed to load page content.");
          setPage(null);
        }
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPage();
    }
  }, [slug, fallbackPage]);

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
  const isPrivacyPolicy = normalizePolicySlug(slug) === "privacy-policy";
  const isRefundPolicy = normalizePolicySlug(slug) === "refund-cancellation-policy";
  const isTermsDocument = normalizePolicySlug(slug) === "terms-conditions" || isPrivacyPolicy || isRefundPolicy;

  return (
    <main className={`legal-page${isTermsDocument ? " legal-page-terms" : ""}${isPrivacyPolicy ? " legal-page-privacy" : ""}`}>
      <section className="legal-shell">


        {!isTermsDocument && (
          <header className="legal-hero">
            <h1>{replaceBrandName(page.title)}</h1>
            {page.metaDescription ? <span>{replaceBrandName(page.metaDescription)}</span> : null}
          </header>
        )}

        <article className="legal-content-card">
          {isHtml ? (
            <div className="legal-rendered-content" dangerouslySetInnerHTML={{ __html: rawDescription }} />
          ) : isTermsDocument ? (
            renderTermsDocument(contentLines, page.title)
          ) : contentLines.length > 0 ? (
            contentLines.map((line, index) => {
              // Detect lines that look like headings (numbered, lettered, or short capitalized lines)
              const isHeading = /^\d+\.\s+[A-Za-z]/.test(line) || /^[a-z]\.\s+[A-Za-z]/.test(line) || (line.length < 60 && !line.includes('.') && line === line.toUpperCase()) || line.endsWith(':');

              if (isHeading) {
                return (
                  <h3 className={`policy-heading${isTermsDocument && index === 0 ? " terms-document-title" : ""}`} key={index}>
                    {line}
                  </h3>
                );
              }

              return (
                <p className={`policy-paragraph${isTermsDocument && index === 1 ? " terms-effective-date" : ""}`} key={index}>
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
