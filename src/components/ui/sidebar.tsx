
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const Sidebar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex h-full flex-col bg-primary text-white shadow-lg", className)} {...props} />
))
Sidebar.displayName = "Sidebar"

const SidebarHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex h-16 items-center border-b border-primary-foreground/20 px-6", className)} {...props} />
))
SidebarHeader.displayName = "SidebarHeader"

const SidebarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex-1 overflow-y-auto", className)} {...props} />
))
SidebarContent.displayName = "SidebarContent"

const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("border-t border-primary-foreground/20 p-6", className)} {...props} />
))
SidebarFooter.displayName = "SidebarFooter"

const SidebarNav = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => (
    <nav ref={ref} className={cn("grid gap-2 text-sm font-medium px-4", className)} {...props} />
))
SidebarNav.displayName = "SidebarNav"

const sidebarNavItemVariants = cva(
    "flex items-center gap-3 rounded-lg px-3 py-2 transition-all text-white hover:bg-accent hover:text-accent-foreground",
    {
        variants: {
            active: {
                true: "bg-accent text-accent-foreground font-bold shadow-md",
            },
        },
    }
)

interface SidebarNavItemProps extends React.AnchorHTMLAttributes<HTMLAnchorElement>, VariantProps<typeof sidebarNavItemVariants> {
    href: string;
    active?: boolean;
}

const SidebarNavItem = React.forwardRef<HTMLAnchorElement, SidebarNavItemProps>(({ className, href, active, children, ...props }, ref) => (
    <a ref={ref} href={href} className={cn(sidebarNavItemVariants({ active }), className)} {...props}>
        {children}
    </a>
));
SidebarNavItem.displayName = "SidebarNavItem"


export {
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
    SidebarNav,
    SidebarNavItem
}
