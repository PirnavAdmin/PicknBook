/* eslint-disable */
import React, { useEffect } from "react";
import "../../STYLES/LegalPage.css";
import "../../STYLES/Privacy.css";

export default function AboutUsPage() {
  useEffect(() => {
    document.title = "About Us | Pick&Book";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "Learn about Pick&Book, your all-in-one travel booking platform for bus, hotel, and flight reservations."
      );
    }
    return () => {
      document.title = "Pick&book - Premium Travel Booking";
    };
  }, []);

  return (
    <main className="legal-page legal-page-terms legal-page-privacy legal-page-about">
      <section className="legal-shell">
        <article className="legal-content-card">
          <h1 className="terms-document-title">ABOUT US</h1>

          <div className="legal-rendered-content">
            <section className="legal-section">
              <h2>Your Journey Begins with Us</h2>
              <p>
                Welcome to Pick&amp;Book, your all-in-one travel booking platform designed to make every journey simple, convenient, and memorable.
              </p>
              <p>
                We bring bus reservations, hotel accommodations, and flight bookings together in one platform, helping travelers plan their trips with ease. Whether you are travelling for business, enjoying a family vacation, or exploring new destinations, Pick&amp;Book provides a convenient way to discover travel options and organize your journey.
              </p>
              <p>
                Our goal is to simplify travel planning through technology, accessibility, and a customer-focused booking experience.
              </p>
            </section>

            <section className="legal-section">
              <h2>Our Services</h2>

              <h3>1. Bus Booking – Travel with Comfort</h3>
              <p>
                Pick&amp;Book makes road travel easier by providing a convenient platform to explore and book bus tickets. Travelers can search for buses based on their departure location, destination, and travel date.
              </p>
              <p>
                Our bus booking service helps customers compare available operators, check bus timings, explore boarding and dropping points, view seat availability, select preferred seats, and review ticket fares before confirming their reservations.
              </p>

              <h3>2. Hotel Booking – Find Your Perfect Stay</h3>
              <p>
                Finding comfortable accommodation is an important part of every journey. Pick&amp;Book helps travelers explore hotel options based on their destination, travel dates, and accommodation preferences.
              </p>
              <p>
                Customers can discover hotel details, compare room prices, explore available facilities, select suitable room types, specify guest requirements, and complete their reservations through a convenient booking experience.
              </p>

              <h3>3. Flight Booking – Explore the World</h3>
              <p>
                Make air travel planning simpler with Pick&amp;Book. Our flight booking service allows travelers to search for available flights based on their departure city, destination, and travel dates.
              </p>
              <p>
                Customers can explore airline options, compare available fares, review flight schedules, check departure and arrival details, provide passenger information, and proceed with their reservations through a streamlined booking process.
              </p>
            </section>

            <section className="legal-section">
              <h2>Key Features</h2>
              <ul>
                <li>Unified Travel Platform: Access bus, hotel, and flight booking services through a single application.</li>
                <li>Easy Search &amp; Booking: Find suitable travel options using simple search and booking processes.</li>
                <li>Multiple Travel Choices: Explore different operators, airlines, hotels, and accommodation options.</li>
                <li>Transparent Pricing: Review applicable fares, taxes, and charges before confirming reservations.</li>
                <li>Secure Payment Experience: Complete bookings through supported online payment methods.</li>
                <li>Booking Management: Access reservation details and manage eligible bookings conveniently.</li>
                <li>Booking Notifications: Stay informed through important booking and transaction updates.</li>
                <li>User Account Management: Maintain personal details and access booking history through your account.</li>
                <li>Convenient Accessibility: Experience a responsive and user-friendly platform across supported devices.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>Why Choose Pick&amp;Book?</h2>
              <p>
                We understand that every traveler has different needs and expectations. That's why Pick&amp;Book focuses on providing a simple and convenient booking experience.
              </p>
              <p>
                By combining multiple travel services into one platform, we help reduce the effort involved in planning trips. From exploring available transportation options to selecting accommodation, customers can organize important travel arrangements in one place.
              </p>
              <p>
                We are committed to improving convenience, maintaining transparency, and creating a smooth experience throughout the booking journey.
              </p>
            </section>

            <section className="legal-section">
              <h2>Our Mission</h2>
              <p>
                To simplify travel planning by providing an integrated platform for bus, hotel, and flight reservations. We aim to make travel services more accessible through technology, convenience, and customer-focused solutions.
              </p>
            </section>

            <section className="legal-section">
              <h2>Our Vision</h2>
              <p>
                To become a trusted and preferred travel booking platform by continuously improving our services, embracing innovation, and delivering convenient travel solutions that connect people with destinations around the world.
              </p>
            </section>

            <section className="legal-section">
              <h2>Start Your Journey with Pick&amp;Book</h2>
              <p>
                Every memorable journey begins with the right plan. Whether you are travelling by road, staying at your favourite hotel, or flying to a new destination, Pick&amp;Book brings your travel arrangements together.
              </p>
              <p>
                Pick&amp;Book – One Platform. Every Journey. Endless Possibilities.
              </p>
            </section>
          </div>
        </article>
      </section>
    </main>
  );
}

