import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
    Home,
    User,
    ShieldCheck,
    Users,
    LogOut,
    ArrowLeft
} from "lucide-react";

export function Sidebar() {
    const { user, logoutMutation } = useAuth();
    const [location] = useLocation();

    if (!user) return null;

    const navItems = [
        { label: user.username, icon: <UserAvatar user={user} size="xs" />, href: `/profile/${user.id}` },
        { label: "Página Inicial", icon: <Home className="w-5 h-5 text-facebook-link" />, href: "/" },
        { label: "Delegações", icon: <Users className="w-5 h-5 text-green-500" />, href: "/delegates" }, // Exemplo, pode ser uma página ou modal
    ];

    if (user.isAdmin) {
        navItems.splice(2, 0, { label: "Administração", icon: <ShieldCheck className="w-5 h-5 text-red-500" />, href: "/admin" });
    }
    
    const externalLinks = [
         { label: "Voltar ao Site", icon: <ArrowLeft className="w-5 h-5" />, href: "https://sites.google.com/view/sitenacionalmirim/in%C3%ADcio" }
    ];

    return (
        <aside className="w-full space-y-4">
            <nav className="flex flex-col">
                {navItems.map((item) => (
                    <Link key={item.label} href={item.href}>
                        <a className={`flex items-center space-x-3 px-2 py-2 text-sm font-medium rounded-md ${location === item.href ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>
                            {item.icon}
                            <span className="text-facebook-grey-text">{item.label}</span>
                        </a>
                    </Link>
                ))}
            </nav>
            
            <div className="border-t pt-4 space-y-2">
                 <h3 className="px-2 text-xs font-semibold text-facebook-grey-text-secondary uppercase">Externo</h3>
                 {externalLinks.map((item) => (
                     <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 px-2 py-2 text-sm font-medium hover:bg-gray-100 rounded-md">
                         {item.icon}
                         <span className="text-facebook-grey-text">{item.label}</span>
                     </a>
                 ))}
                 
                 <button
                    onClick={() => logoutMutation.mutate()}
                    className="w-full flex items-center space-x-3 px-2 py-2 text-sm font-medium hover:bg-gray-100 rounded-md"
                    disabled={logoutMutation.isPending}
                 >
                     <LogOut className="w-5 h-5" />
                     <span>Sair</span>
                 </button>
            </div>
        </aside>
    );
}
