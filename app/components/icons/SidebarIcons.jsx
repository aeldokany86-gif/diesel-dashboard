"use client";

import SidebarSvgIcon from "./SidebarSvgIcon";

export function LayoutDashboard({ size = 18, className = "" }) {
  return (
    <SidebarSvgIcon size={size} className={className}>
      <rect x="3" y="3" width="7" height="8" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="15" width="7" height="6" rx="1.5" />
    </SidebarSvgIcon>
  );
}

export function Truck({ size = 18, className = "" }) {
  return (
    <SidebarSvgIcon size={size} className={className}>
      <path d="M3 7h11v9H3z" />
      <path d="M14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </SidebarSvgIcon>
  );
}

export function Fuel({ size = 18, className = "" }) {
  return (
    <SidebarSvgIcon size={size} className={className}>
      <path d="M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16" />
      <path d="M7 9h7" />
      <path d="M16 8h2l2 2v8a2 2 0 0 1-2 2h-1" />
      <path d="M9 21h4" />
    </SidebarSvgIcon>
  );
}

export function Users({ size = 18, className = "" }) {
  return (
    <SidebarSvgIcon size={size} className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c.8-3.2 3-5 6-5s5.2 1.8 6 5" />
      <path d="M16 11a2.5 2.5 0 0 0 0-5" />
      <path d="M18 20c-.3-1.8-1.2-3.1-2.6-4" />
    </SidebarSvgIcon>
  );
}

export function Building2({ size = 18, className = "" }) {
  return (
    <SidebarSvgIcon size={size} className={className}>
      <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
      <path d="M16 8h2a2 2 0 0 1 2 2v11" />
      <path d="M8 7h4" />
      <path d="M8 11h4" />
      <path d="M8 15h4" />
      <path d="M3 21h18" />
    </SidebarSvgIcon>
  );
}

export function FileBarChart2({ size = 18, className = "" }) {
  return (
    <SidebarSvgIcon size={size} className={className}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v5h5" />
      <path d="M9 17v-4" />
      <path d="M12 17v-7" />
      <path d="M15 17v-2" />
    </SidebarSvgIcon>
  );
}

export function Bell({ size = 18, className = "" }) {
  return (
    <SidebarSvgIcon size={size} className={className}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </SidebarSvgIcon>
  );
}