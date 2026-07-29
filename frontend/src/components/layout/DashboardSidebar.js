/* eslint-disable */
import React from "react";
import { NavLink } from "react-router-dom";
import {
  BedDouble,
  BusFront,
  KeyRound,
  LayoutDashboard,
  PlaneTakeoff,
  UserRound,
  Users,
  Ticket,
} from "lucide-react";

const MAIN_LINKS = [
  {
    id: "nav-2",
    to: "/dashboard/traveler-list",
    label: "Travel Buddies",
    description: "Saved passenger details",
    icon: Users,
  },
  {
    id: "nav-3",
    to: "/dashboard/flight-bookings",
    label: "Flight Trips",
    description: "All flight tickets",
    icon: PlaneTakeoff,
  },
  {
    id: "nav-4",
    to: "/dashboard/bus-bookings",
    label: "Bus Trips",
    description: "All booking tickets",
    icon: BusFront,
  },
  {
    id: "nav-5",
    to: "/dashboard/hotel-bookings",
    label: "Hotel Trips",
    description: "All hotel stays",
    icon: BedDouble,
  },
  {
    id: "nav-6",
    to: "/web-checkin",
    label: "Web Check-in",
    description: "Check-in online",
    icon: Ticket,
  },
  {
    id: "nav-7",
    to: "/fetch-ticket",
    label: "Print Ticket",
    description: "Retrieve travel ticket",
    icon: Ticket,
  },
];


const PROFILE_LINKS = [
  {
    id: "profile-2",
    to: "/change-password",
    label: "Change Password",
    description: "Update login security",
    icon: KeyRound,
  },
];

function navItemClassName({ isActive }) {
  return `sidebar-item ${isActive ? "active" : ""}`;
}

export default function DashboardSidebar() {
  return (
    <aside className="dashboard-sidebar">
      <nav className="sidebar-nav" aria-label="Dashboard navigation">
        <NavLink to="/dashboard" end className={navItemClassName} title="Dashboard">
          <LayoutDashboard size={16} />
          <span className="sidebar-copy">
            <strong>Dashboard</strong>
            <small>See your travel story</small>
          </span>
        </NavLink>

        {MAIN_LINKS.map((item) => (
          <NavLink key={item.id} to={item.to} className={navItemClassName} title={item.label}>
            <item.icon size={16} />
            <span className="sidebar-copy">
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
          </NavLink>
        ))}

        <div className="sidebar-divider" />

        {PROFILE_LINKS.map((item) => (
          <NavLink key={item.id} to={item.to} className={navItemClassName} title={item.label}>
            <item.icon size={16} />
            <span className="sidebar-copy">
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
          </NavLink>
        ))}

        <NavLink to="/dashboard/my-account" className={navItemClassName} title="My Account">
          <UserRound size={16} />
          <span className="sidebar-copy">
            <strong>My Account</strong>
            <small>Profile and wallet</small>
          </span>
        </NavLink>
      </nav>
    </aside >
  );
}
