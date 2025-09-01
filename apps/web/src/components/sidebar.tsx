import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Users, Building2, Settings, LogOut } from "lucide-react";
import { OrganizationSwitcher, SignedIn, SignedOut, SignInButton, SignOutButton, UserButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; };

const items: Item[] = [
  { to: "/", label: "Kontakte", icon: Users },
  { to: "/companies", label: "Firmen", icon: Building2 },
  { to: "/settings", label: "Einstellungen", icon: Settings },
];

export default function Sidebar() {
  const state = useRouterState();
  const pathname = state.location.pathname;

  return (
    <aside className="hidden border-r bg-[--color-sidebar] md:flex md:w-56 md:flex-col">
      <div className="px-4 py-4 text-lg font-semibold">contactio.ch</div>
      <div className="px-3 pb-3">
        <OrganizationSwitcher
          appearance={{ elements: { organizationSwitcherTrigger: "w-full" } }}
          afterCreateOrganizationUrl="/"
          afterSelectOrganizationUrl="/"
        />
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-2 pb-4">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to !== "/" && pathname.startsWith(to));
          return (
            <Link
              key={to + label}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                active ? "bg-[--color-sidebar-accent]" : "hover:bg-[--color-sidebar-accent]"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t p-3">
        <SignedOut>
          <SignInButton mode="modal">
            <Button variant="outline" className="w-full">Anmelden</Button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <div className="mb-2 flex items-center justify-between">
            <UserButton />
          </div>
          <SignOutButton>
            <Button variant="ghost" className="w-full justify-start" aria-label="Abmelden">
              <LogOut className="mr-2 h-4 w-4" /> Abmelden
            </Button>
          </SignOutButton>
        </SignedIn>
      </div>
    </aside>
  );
}
