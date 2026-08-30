import { useRef, useState } from "react"
import { NavLink, useLocation } from "react-router"
import {
  BookOpen,
  CheckCircle,
  Disc3,
  Download,
  LayoutDashboard,
  Upload,
} from "lucide-react"

import { exportData } from "~/lib/export-import"
import { ImportDialog } from "~/components/ImportDialog"
import { ThemeToggle } from "~/components/ThemeToggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
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
  { title: "Queue", path: "/", icon: LayoutDashboard },
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setImportDialogOpen(true)
    }
  }

  function handleImportDialogChange(open: boolean) {
    setImportDialogOpen(open)
    if (!open) {
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <NavLink
          to="/"
          aria-label="3D Print Flow home"
          className="flex items-center gap-2 rounded-md px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <img
            src="/brand/flow-spool-logo.png"
            alt=""
            width={24}
            height={24}
            className="size-6 shrink-0 object-contain dark:brightness-0 dark:invert"
          />
          <span
            aria-hidden="true"
            className="font-heading text-sm font-bold tracking-tight group-data-[collapsible=icon]:hidden"
          >
            3D Print Flow
          </span>
        </NavLink>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {queueItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={
                    item.path === "/"
                      ? pathname === "/" ||
                        pathname === "/orders" ||
                        pathname === "/figures"
                      : pathname === item.path
                  }
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
            <ThemeToggle />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Export" onClick={exportData}>
              <Download />
              <span>Export</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Import" onClick={handleImportClick}>
              <Upload />
              <span>Import</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
          data-testid="import-file-input"
        />
        <ImportDialog
          open={importDialogOpen}
          onOpenChange={handleImportDialogChange}
          file={selectedFile}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
