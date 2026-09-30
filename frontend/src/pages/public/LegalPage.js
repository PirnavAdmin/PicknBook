/* eslint-disable */
import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getPublicPageBySlug } from "../../services/cmsPageService";
import TravelLoadingScreen from "../../components/layout/TravelLoadingScreen";
import "../../STYLES/LegalPage.css";
import { DEFAULT_CMS_PAGES, normalizePolicySlug } from "../../data/legalPages";

const LEGAL_HEADING_GROUPS = {
  "legal-h1": ["PRIVACY"],
  "legal-h2": [
    "Preface",
    "Users outside the geographical limit of India",
    "Data Fiduciary under DPDP Act",
    "Information We Collect: Categories and Legal Basis",
    "Legal Justifications for Processing under DPDP",
    "User Rights under DPDP Act",
    "Consent Withdrawal",
    "Grievance Officer",
    "Data Retention",
    "Data Breach Response Security and Safeguards",
    "Children's Data",
    "Updates to Policy",
    "Contact Us",
    "DISCLAIMER",
  ],
  "legal-h3": [
    "Registration on the Website",
    "Other information",
    "Additional information (Information collected automatically)",
    "Detailed Data Collection Practices",
  ],
  "legal-h4": [
    "Personal Data",
    "Sensitive Personal Data",
    "Consent",
    "Performance of Contract",
    "Legal Obligation",
    "Legitimate Use",
    "Right to Access",
    "Right to Correction",
    "Right to Erasure",
    "Right of Grievance Redressal",
    "Right to Nominate",
    "Designation",
    "Email",
    "Address",
  ],
};

const BOOKING_CHECK_ITEMS = [
  "Passenger/guest name;",
  "Travel date;",
  "Departure and arrival details;",
  "Destination;",
  "Hotel details;",
  "Number of passengers/guests;",
  "Room type;",
  "Contact information;",
  "Fare/price;",
  "Cancellation conditions;",
  "Applicable taxes and charges.",
];

function normalizeLegalText(element) {
  return element.textContent.replace(/\s+/g, " ").trim();
}

function addLegalContentClasses(container) {
  const elements = Array.from(container.querySelectorAll("*"));
  const exactTextElement = (text) => {
    const matches = elements.filter((element) => normalizeLegalText(element) === text);
    const semanticHeading = matches.find((element) => /^H[1-6]$/.test(element.tagName));
    if (semanticHeading) return semanticHeading;
    return matches.reduce((deepest, element) => {
      if (!deepest) return element;
      return deepest.contains(element) ? element : deepest;
    }, null);
  };

  Object.entries(LEGAL_HEADING_GROUPS).forEach(([className, texts]) => {
    texts.forEach((text) => exactTextElement(text)?.classList.add(className));
  });

  const updatedLine = Array.from(container.querySelectorAll("p, li"))
    .find((element) => normalizeLegalText(element).startsWith("Last updated:"));
  (updatedLine || Array.from(container.querySelectorAll("div, span"))
    .find((element) => normalizeLegalText(element).startsWith("Last updated:")))
    ?.classList.add("legal-meta");

  const disclaimerHeading = exactTextElement("DISCLAIMER");
  if (disclaimerHeading?.parentElement && disclaimerHeading.parentElement !== container) {
    disclaimerHeading.parentElement.classList.add("legal-disclaimer");
  }

  const contactHeading = exactTextElement("Contact Us");
  if (contactHeading?.parentElement && contactHeading.parentElement !== container) {
    contactHeading.parentElement.classList.add("legal-contact");
  }
}

function addBookingChecklistLayout(container) {
  const itemTextSet = new Set(BOOKING_CHECK_ITEMS);
  const leadIn = Array.from(container.querySelectorAll("p, li, div"))
    .find((element) => /^6\.3\s+Users must carefully verify the following information before confirming a booking:?$/i
      .test(normalizeLegalText(element)));

  if (!leadIn) return;

  let next = leadIn.nextElementSibling;
  if (next && /^(UL|OL)$/.test(next.tagName)) {
    const listItems = Array.from(next.querySelectorAll("li"))
      .filter((item) => itemTextSet.has(normalizeLegalText(item)));
    if (listItems.length) next.classList.add("legal-two-column-list");
    return;
  }

  const items = [];
  while (next && itemTextSet.has(normalizeLegalText(next))) {
    items.push(next);
    next = next.nextElementSibling;
  }

  if (!items.length) return;

  const checklist = document.createElement("div");
  checklist.className = "legal-two-column-list";
  items[0].parentElement.insertBefore(checklist, items[0]);
  items.forEach((item) => {
    item.classList.add("legal-two-column-item");
    checklist.appendChild(item);
  });
}

function replaceBrandName(text) {
  if (!text || typeof text !== "string") return text;
  // Avoid touching emails or URLs (contains @ or ://)
  return text
    .split(/(\S+@\S+|https?:\/\/\S+)/g)
    .map((part, i) => {
      if (i % 2 === 1) return part; // skip email/url tokens
      return part
        .replace(/Pick\s*N\s*Book/gi, "Pick&book")
        .replace(/Pick&Book/gi, "Pick&book");
    })
    .join("");
}

// Converts plain text containing emails and URLs into React nodes with <a> tags
function renderTextWithLinks(text) {
  if (!text) return text;
  const emailFixed = text.replace(/contact@Pick&book\.in/gi, "contact@picknbook.in");
  const urlFixed = emailFixed.replace(/https?:\/\/Pick&book\.in\/?/gi, "https://picknbook.in");
  const parts = urlFixed.split(/(https?:\/\/[^\s]+|[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g);
  if (parts.length === 1) return urlFixed;
  return parts.map((part, idx) => {
    if (idx % 2 === 1) {
      if (/^https?:\/\//.test(part)) {
        return <a key={idx} href={part} target="_blank" rel="noopener noreferrer">{part}</a>;
      }
      if (part.includes('@')) {
        return <a key={idx} href={`mailto:${part}`}>{part}</a>;
      }
    }
    return part;
  });
}

function formatLegalContent(text) {
  if (!text) return [];
  return replaceBrandName(text)
    .split("\n")
    .map((p) => p.trim())
    .filter((p) => p !== "");
}

function renderTermsDocument(lines) {
  const elements = [];
  let inOpeningCopy = true;
  let openingParagraphs = [];
  let sections = [];
  let currentSec = null;

  if (lines.length > 0) {
    const titleText = /privacy/i.test(lines[0]) ? "PRIVACY" : lines[0].toUpperCase();
    elements.push(<h1 className="terms-document-title" key="title">{titleText}</h1>);
  }

  if (lines.length > 1) {
    const dates = lines[1].split('|').map(s => s.trim());
    const updatedDateText = dates.find((part) => /updated/i.test(part)) || dates[0] || "";
    const displayText = updatedDateText ? `Last updated: ${updatedDateText.replace(/^.*?updated\s*:?\s*/i, "")}` : dates[0] || "";

    elements.push(
      <div className="terms-effective-date" key="date">
        <span>{displayText}</span>
      </div>
    );
  }

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    const isMainHeading = /^\d+\.\s+[A-Z]/.test(line) && line === line.toUpperCase();
    
    if (isMainHeading) {
      if (currentSec) sections.push(currentSec);
      currentSec = { title: line, items: [] };
      inOpeningCopy = false;
    } else if (inOpeningCopy) {
      openingParagraphs.push(line);
    } else if (currentSec) {
      currentSec.items.push(line);
    }
  }
  if (currentSec) sections.push(currentSec);

  if (openingParagraphs.length > 0) {
    elements.push(
      <div className="terms-opening-copy" key="opening">
        {openingParagraphs.map((p, idx) => <p key={idx}>{renderTextWithLinks(p)}</p>)}
      </div>
    );
  }

  sections.forEach((sec, sIdx) => {
    const secElements = [];
    secElements.push(<h2 key={`h2-${sIdx}`}>{sec.title}</h2>);
    
    const contentNodes = [];
    const renderedChecklistIndices = new Set();

    sec.items.forEach((item, iIdx) => {
      if (renderedChecklistIndices.has(iIdx)) return;

      if (BOOKING_CHECK_ITEMS.includes(item)) {
        const checklistItems = [];
        let checklistIndex = iIdx;
        while (checklistIndex < sec.items.length && BOOKING_CHECK_ITEMS.includes(sec.items[checklistIndex])) {
          checklistItems.push(sec.items[checklistIndex]);
          renderedChecklistIndices.add(checklistIndex);
          checklistIndex += 1;
        }
        contentNodes.push(
          <ul className="legal-two-column-list" key={`booking-checklist-${iIdx}`}>
            {checklistItems.map((checklistItem, itemIndex) => <li key={itemIndex}>{checklistItem}</li>)}
          </ul>
        );
        return;
      }

      const clauseMatch = item.match(/^(\d+\.\d+)\s+(.*)/);
      const letterMatch = item.match(/^([a-zA-Z]\.)\s+(.*)/);
      
      if (clauseMatch) {
        contentNodes.push(
          <div className="terms-clause" key={`clause-${iIdx}`}>
            <span className="terms-clause-number">{clauseMatch[1]}</span>
            <span className="terms-clause-text">{renderTextWithLinks(clauseMatch[2])}</span>
          </div>
        );
      } else if (letterMatch) {
        contentNodes.push(
          <div className="terms-clause" key={`clause-${iIdx}`}>
            <span className="terms-clause-number">{letterMatch[1]}</span>
            <span className="terms-clause-text">{renderTextWithLinks(letterMatch[2])}</span>
          </div>
        );
      } else {
        contentNodes.push(<p className="terms-body-line" key={`p-${iIdx}`}>{renderTextWithLinks(item)}</p>);
      }
    });

    elements.push(
      <div className="terms-section" key={`sec-${sIdx}`}>
        {secElements}
        <div className="terms-section-content">
          {contentNodes}
        </div>
      </div>
    );
  });

  return elements;
}

export default function LegalPage() {
  const { slug } = useParams();
  const fallbackPage = DEFAULT_CMS_PAGES.find(
    (candidate) => normalizePolicySlug(candidate.slug) === normalizePolicySlug(slug)
  );
  const [page, setPage] = useState(() => fallbackPage || null);
  const [loading, setLoading] = useState(() => Boolean(slug));
  const [error, setError] = useState(null);
  const legalContentRef = useRef(null);

  useEffect(() => {
    const normalizedSlug = normalizePolicySlug(slug);
    if (loading || !legalContentRef.current) return;
    if (normalizedSlug === "privacy-policy") addLegalContentClasses(legalContentRef.current);
    if (normalizedSlug === "terms-conditions") addBookingChecklistLayout(legalContentRef.current);
  }, [loading, page, slug]);

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      try {
        let apiSlug = slug;
        if (slug === "privacy-policy") apiSlug = "pickbook-privacy-policy";
        else if (slug === "refund-cancellation-policy") apiSlug = "return-cancellation-policy";

        const data = await getPublicPageBySlug(apiSlug);
        if (data && data.description && data.description.trim()) {
          setPage(data);
        } else if (fallbackPage) {
          setPage({ ...fallbackPage, ...data, description: fallbackPage.description || data?.description });
        } else {
          setPage(data);
        }
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
  const isTermsDocument = normalizePolicySlug(slug) === "terms-conditions" || normalizePolicySlug(slug) === "privacy-policy";

  return (
    <main className={`legal-page${isTermsDocument ? " legal-page-terms" : ""}`}>
      <section className="legal-shell">


        {!isTermsDocument && (
          <header className="legal-hero">
            <h1>{replaceBrandName(page.title)}</h1>
            {page.metaDescription ? <span>{replaceBrandName(page.metaDescription)}</span> : null}
          </header>
        )}

        <article className="legal-content-card">
          {isHtml ? (
            <>
              {normalizePolicySlug(slug) === "privacy-policy" && (
                <div className="privacy-policy-header-block">
                  <div className="privacy-policy-updated-row">LAST UPDATED: 28TH SEPTEMBER 2026</div>
                  <div className="privacy-policy-subheading">Last updated: Preface</div>
                  <h1 className="privacy-policy-main-title">PRIVACY</h1>
                </div>
              )}
              <div
                ref={isTermsDocument ? legalContentRef : null}
                className={isTermsDocument ? "legal-content" : undefined}
                dangerouslySetInnerHTML={{ __html: rawDescription }}
              />
            </>
          ) : contentLines.length > 0 ? (
            isTermsDocument ? (
              renderTermsDocument(contentLines)
            ) : (
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
            )
          ) : (
            <p className="legal-intro">This policy content is being updated.</p>
          )}
        </article>
      </section>
    </main>
  );
}
