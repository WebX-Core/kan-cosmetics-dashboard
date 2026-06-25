import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../providers/AuthContext";

export const ProtectedRoute: React.FC = () => {
  const { state } = useAuth();
  const location = useLocation();

  if (state.sessionStatus === "checking") {
    return null;
  }

  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};
