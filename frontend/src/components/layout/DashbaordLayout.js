/* eslint-disable */
import React from "react";
import { Outlet } from "react-router-dom";
import DashboardSidebar from "./DashboardSidebar";
import "../../STYLES/DashboardPage.css";

export default function DashboardLayout() {
  return (
    <div className="dashboard-layout">
      <DashboardSidebar />

      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}
