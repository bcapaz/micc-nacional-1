import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import {
    Home,
    ShieldCheck,
    LogOut,
    ArrowLeft,
    User as UserIcon
} from "lucide-react";

export function Sidebar() {
    const { user, logoutMutation } = useAuth();
    const [location] = useLocation();

    // Busca a lista de delegações (usuários não-admin)
    const { data: delegates, isLoading } = useQuery<User[]>({
        queryKey: ["/api/users/delegates"],
    });

    if (!user) return null;

    // Itens de navegação principal (Removido o link fixo para a página de Delegações)
    const navItems = [
        { label: user.username, icon: <UserAvatar user={user} size="xs" className="h-5 w-5" />, href: `/profile/${user.username}` },
        { label: "Página Inicial", icon: <Home className="w-5 h-5 text-[#3b5998]" />, href: "/" },
    ];

    if (user.isAdmin) {
        navItems.push({ label: "Administração", icon: <ShieldCheck className="w-5 h-5 text-red-500" />, href: "/admin" });
    }

    const externalLinks = [
        { label: "Voltar ao Site", icon: <ArrowLeft className="w-5 h-5" />, href: "https://sites.google.com/view/sitenacionalmirim/in%C3%ADcio" }
    ];

    return (
        <aside className="w-full space-y-4">
            {/* Atalhos principais */}
            <nav className="flex flex-col">
                {navItems.map((item) => (
                    <Link key={item.label} href={item.href}>
                        <a className={`flex items-center space-x-3 px-2 py-1.5 text-sm font-medium rounded-sm ${location === item.href ? 'bg-[#f5f6f7]' : 'hover:bg-[#f5f6f7] group'}`}>
                            {item.icon}
                            <span className={`${location === item.href ? 'font-bold' : 'text-[#1d2129]'} group-hover:text-[#1d2129]`}>{item.label}</span>
                        </a>
                    </Link>
                ))}
            </nav>

            {/* LISTA DE DELEGAÇÕES (Parecido com o "Quem seguir" do Twitter ou Grupos do FB 2014) */}
            <div className="pt-2">
                <h3 className="px-2 mb-2 text-xs font-bold text-[#90949c] uppercase">Delegações</h3>
                <div className="flex flex-col space-y-1">
                    {isLoading ? (
                        <span className="px-2 text-xs text-gray-400">Carregando...</span>
                    ) : (
                        delegates?.slice(0, 10).map((delegate) => (
                            <Link key={delegate.id} href={`/profile/${delegate.username}`}>
                                <a className="flex items-center space-x-3 px-2 py-1 hover:bg-[#f5f6f7] rounded-sm group">
                                    <UserAvatar user={delegate} size="xs" className="h-6 w-6" />
                                    <span className="text-sm text-[#3b5998] font-semibold group-hover:underline">
                                        {delegate.name || delegate.username}
                                    </span>
                                </a>
                            </Link>
                        ))
                    )}
                </div>
            </div>

            {/* Links Externos e Sair */}
            <div className="border-t border-[#dddfe2] pt-4 space-y-1">
                <h3 className="px-2 text-xs font-semibold text-[#90949c] uppercase">Externo</h3>
                {externalLinks.map((item) => (
                    <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 px-2 py-1.5 text-sm font-medium hover:bg-[#f5f6f7] rounded-sm group">
                        {item.icon}
                        <span className="text-[#1d2129]">{item.label}</span>
                    </a>
                ))}

                <button
                    onClick={() => logoutMutation.mutate()}
                    className="w-full flex items-center space-x-3 px-2 py-1.5 text-sm font-medium hover:bg-[#f5f6f7] rounded-sm group"
                    disabled={logoutMutation.isPending}
                >
                    <LogOut className="w-5 h-5 text-gray-500" />
                    <span className="text-[#1d2129]">Sair</span>
                </button>
            </div>
        </aside>
    );
}
