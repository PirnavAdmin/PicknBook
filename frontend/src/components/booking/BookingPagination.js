import React from "react";
import "../../STYLES/BookingPagination.css";

export function paginateBookings(records, page) {
  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  return { pageCount, currentPage, rows: records.slice(start, end) };
}

export function getPaginationItems(page, pageCount) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  let start = Math.max(2, page - 1);
  let end = Math.min(pageCount - 1, page + 1);
  if (page <= 3) { start = 2; end = 4; }
  if (page >= pageCount - 2) { start = pageCount - 3; end = pageCount - 1; }
  const items = [1];
  if (start > 2) items.push("leading-gap");
  for (let number = start; number <= end; number++) items.push(number);
  if (end < pageCount - 1) items.push("trailing-gap");
  items.push(pageCount);
  return items;
}

export default function BookingPagination({ page, pageCount, onChange }) {
  return (
    <nav className="booking-pagination" aria-label="Booking pagination">
      <button type="button" disabled={page === 1} onClick={() => onChange(page - 1)}>Previous</button>
      {getPaginationItems(page, pageCount).map((item) => typeof item === "number" ? (
        <button key={item} type="button" className={item === page ? "active" : ""} aria-current={item === page ? "page" : undefined} aria-label={`Page ${item}`} onClick={() => onChange(item)}>{item}</button>
      ) : <span key={item} aria-hidden="true">...</span>)}
      <button type="button" disabled={page === pageCount} onClick={() => onChange(page + 1)}>Next</button>
      <span>Page {page} of {pageCount}</span>
    </nav>
  );
}
