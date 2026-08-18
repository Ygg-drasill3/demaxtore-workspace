import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { dashboardPathFor } from "@/lib/nav";

import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/routes/ProtectedRoute";
import { RoleRoute } from "@/components/routes/RoleRoute";

import LoginPage from "@/pages/auth/Login";
import ForgotPasswordPage from "@/pages/auth/ForgotPassword";
import ResetPasswordPage from "@/pages/auth/ResetPassword";

import BuyerDashboard from "@/pages/dashboards/BuyerDashboard";
import SupplierDashboard from "@/pages/dashboards/SupplierDashboard";
import AdminDashboard from "@/pages/dashboards/AdminDashboard";

import NotificationsPage from "@/pages/Notifications";
import WorkspacePage from "@/pages/Workspace";
import PlaceholderPage from "@/pages/Placeholder";
import UnauthorizedPage from "@/pages/Unauthorized";

function RootRedirect() {
  const { user } = useAuth();
  if (user === undefined) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={dashboardPathFor(user.role)} replace />;
}

function Shelled({ children }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="bottom-right" richColors closeButton />
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Root → role-aware */}
            <Route path="/" element={<RootRedirect />} />

            {/* Buyer */}
            <Route
              path="/buyer/dashboard"
              element={
                <Shelled>
                  <RoleRoute allow={["buyer"]}>
                    <BuyerDashboard />
                  </RoleRoute>
                </Shelled>
              }
            />
            <Route
              path="/buyer/*"
              element={
                <Shelled>
                  <RoleRoute allow={["buyer"]}>
                    <PlaceholderPage />
                  </RoleRoute>
                </Shelled>
              }
            />

            {/* Supplier */}
            <Route
              path="/supplier/dashboard"
              element={
                <Shelled>
                  <RoleRoute allow={["supplier"]}>
                    <SupplierDashboard />
                  </RoleRoute>
                </Shelled>
              }
            />
            <Route
              path="/supplier/*"
              element={
                <Shelled>
                  <RoleRoute allow={["supplier"]}>
                    <PlaceholderPage />
                  </RoleRoute>
                </Shelled>
              }
            />

            {/* Admin */}
            <Route
              path="/admin/dashboard"
              element={
                <Shelled>
                  <RoleRoute allow={["admin"]}>
                    <AdminDashboard />
                  </RoleRoute>
                </Shelled>
              }
            />
            <Route
              path="/admin/*"
              element={
                <Shelled>
                  <RoleRoute allow={["admin"]}>
                    <PlaceholderPage />
                  </RoleRoute>
                </Shelled>
              }
            />

            {/* Shared authenticated */}
            <Route
              path="/notifications"
              element={
                <Shelled>
                  <NotificationsPage />
                </Shelled>
              }
            />
            <Route
              path="/workspace/:type/:id"
              element={
                <Shelled>
                  <WorkspacePage />
                </Shelled>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
