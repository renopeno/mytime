import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { NavLink, Link } from 'react-router'
import {
  Clock,
  FolderKanban,
  Users,
  Receipt,
  FileText,
  LogOut,
  Settings2,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const getNavGroups = (companyName?: string | null) => [
  {
    label: 'Time Tracking',
    items: [
      { label: 'Time Entries', icon: Clock, to: '/time-entries' },
      { label: 'Invoicing', icon: Receipt, to: '/invoicing' },
    ],
  },
  {
    label: companyName || 'Organization',
    items: [
      { label: 'Projects', icon: FolderKanban, to: '/projects' },
      { label: 'Clients', icon: Users, to: '/clients' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { label: 'Reports', icon: FileText, to: '/reports' },
    ],
  },
]

const DEV_MODE = import.meta.env.DEV;

export function AppSidebar({ companyName }: { companyName?: string | null }) {
  const { user, signOut, setDevShowLogin } = useAuth()
  const { isMobile, setOpenMobile } = useSidebar()

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined
  const fullName = (user?.user_metadata?.full_name as string) ?? user?.email ?? 'User'
  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="py-5 group-data-[collapsible=icon]:!py-2">
        <div className="flex items-center justify-between gap-2 pl-2 group-data-[collapsible=icon]:pl-0">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <span className="font-serif text-2xl font-normal tracking-tight leading-none">MyTime</span>
            <Badge variant="secondary" className="text-[10px] tracking-wider">
              Free
            </Badge>
          </div>
          <SidebarTrigger className="shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8" />
        </div>
      </SidebarHeader>

      <SidebarContent className="pt-2">
        {getNavGroups(companyName).map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground/60 mb-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <NavLink to={item.to} onClick={() => { if (isMobile) setOpenMobile(false) }}>
                    {({ isActive }) => (
                      <SidebarMenuButton isActive={isActive} tooltip={item.label} className="h-9 rounded-lg">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-2 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center" />
            }
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={avatarUrl} alt={fullName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 text-left group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-medium">{fullName}</span>
              <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-48">
            <DropdownMenuItem render={<Link to="/settings" className="flex items-center gap-2" />}>
              <Settings2 className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => { DEV_MODE ? setDevShowLogin(true) : void signOut() }}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
