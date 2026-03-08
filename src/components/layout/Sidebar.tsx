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
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

const navGroups = [
  {
    label: 'Time Tracking',
    items: [
      { label: 'Time Entries', icon: Clock, to: '/time-entries' },
      { label: 'Invoicing', icon: Receipt, to: '/invoicing' },
    ],
  },
  {
    label: 'Organization',
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

export function AppSidebar({ companyName, floating }: { companyName?: string | null; floating?: boolean }) {
  const workspaceName = companyName || 'MyTimeTracker'
  const { user, signOut } = useAuth()

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined
  const fullName = (user?.user_metadata?.full_name as string) ?? user?.email ?? 'User'
  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Sidebar variant="inset" data-floating={floating || undefined}>
      <SidebarHeader className="pl-4 py-5">
        <div className="flex items-center gap-2.5">
          <span className="font-serif text-xl font-bold tracking-tight">{workspaceName}</span>
          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground uppercase tracking-wider">
            Free
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="pt-2">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground/60 mb-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <NavLink to={item.to}>
                    {({ isActive }) => (
                      <SidebarMenuButton isActive={isActive} className="h-9 rounded-lg">
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
        <div className="flex items-center justify-between gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring" />
              }
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={avatarUrl} alt={fullName} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 text-left">
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
                onClick={() => void signOut()}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <SidebarTrigger className="shrink-0 mr-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
