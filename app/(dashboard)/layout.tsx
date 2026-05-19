/**
 * Dashboard Route Group Layout
 * 
 * This layout wraps all dashboard-related routes including:
 * - /login
 * - /dashboard/*
 */

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
