import { NavLink, useLocation } from "react-router"
import {
  BookOpen,
  CheckCircle,
  Disc3,
  Download,
  LayoutGrid,
  Palette,
  Upload,
} from "lucide-react"

import { exportData } from "~/lib/export-import"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "~/components/ui/sidebar"

interface NavItem {
  title: string
  path: string
  icon: React.ComponentType<{ className?: string }>
}

const queueItems: NavItem[] = [
  { title: "Color View", path: "/", icon: Palette },
  { title: "Figure View", path: "/figures", icon: LayoutGrid },
]

const libraryItems: NavItem[] = [
  { title: "Figure Catalog", path: "/catalog", icon: BookOpen },
  { title: "Filament Spools", path: "/spools", icon: Disc3 },
]

const archiveItems: NavItem[] = [
  { title: "Completed", path: "/completed", icon: CheckCircle },
]

export function AppSidebar() {
  const { pathname } = useLocation()

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Queue</SidebarGroupLabel>
          <SidebarMenu>
            {queueItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.path}
                  tooltip={item.title}
                >
                  <NavLink to={item.path}>
                    <item.icon />
                    <span>{item.title}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Library</SidebarGroupLabel>
          <SidebarMenu>
            {libraryItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.path}
                  tooltip={item.title}
                >
                  <NavLink to={item.path}>
                    <item.icon />
                    <span>{item.title}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Archive</SidebarGroupLabel>
          <SidebarMenu>
            {archiveItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.path}
                  tooltip={item.title}
                >
                  <NavLink to={item.path}>
                    <item.icon />
                    <span>{item.title}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Export" onClick={exportData}>
              <Download />
              <span>Export</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton disabled tooltip="Import">
              <Upload />
              <span>Import</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
