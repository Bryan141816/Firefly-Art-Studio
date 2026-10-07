
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Outlet } from "react-router-dom"
import { SiteHeader } from "./site-header"
import type { User } from "@/types/User"


export default function AppLayout({user}:{user: User | null}) {
  const currentUser = {
    name: user?.name,
    email: user?.email,
    avatar: user?.picture
  } 
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" user={currentUser}/>
      <SidebarInset>
        <SiteHeader/>
        <div className="flex p-4 w-full h-full">
            <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
