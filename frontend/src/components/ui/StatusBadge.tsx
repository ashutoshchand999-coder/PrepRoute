import React from "react";
import { Badge } from "./Badge";

interface StatusBadgeProps {
  status: "live" | "draft" | string | null;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const tone = status === "live" ? "green" : "yellow";
  const label = status === "live" ? "Live" : "Draft";
  return <Badge tone={tone}>{label}</Badge>;
};
