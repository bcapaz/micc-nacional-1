import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import {
    Home,
    ShieldCheck,
    LogOut,
    ArrowLeft
} from "lucide-react";

// Função para buscar as delegações na API
const fetchDelegates = async (): Promise<User[]> => {
  const res = await fetch("/api/users/delegates");
  if (!res.ok) throw new Error("Erro ao buscar delegações");
  return res.json();
};

export function Sidebar() {
    const { user, logoutMutation } = useAuth();
    const [location] = useLocation();

    // Busca a lista de delegações com a função de busca (queryFn)
    const { data: delegates, isLoading } = useQuery<User[]>({
        queryKey: ["/api/users/delegates"],
        queryFn: fetchDelegates, // CORREÇÃO: Adicionada a função de busca
    });

    if (!user) return null;

    const navItems = [
        { label: user.username, icon: <UserAvatar user={user} size="xs" className="h-5 w-5" />, href: `/profile/${user.username}` },
        { label: "Página Inicial", icon: <Home className="w-5 h-5 text-[#3b5998]" />, href: "/" },
    ];

    if (user.isAdmin) {
        navItems.push({ label: "Administração", icon: <ShieldCheck className="w-5 h-5 text-red-500" />, href: "/admin" });
    }

    const externalLinks = [
        { label: "Voltar ao Site", icon: <ArrowLeft className="w-5 h-5" />, href: "https://sites.google.com/view/sitenacionalmicc/in%C3%ADcio" }
    ];

    return (
        <aside className="w-full space-y-4">
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

            <div className="pt-2">
                <h3 className="px-2 mb-2 text-xs font-bold text-[#90949c] uppercase tracking-wider">Delegações</h3>
                <div className="flex flex-col space-y-1">
                    {isLoading ? (
                        <span className="px-2 text-xs text-gray-400 italic">Carregando...</span>
                    ) : (
                        delegates
                            ?.filter(d => d.id !== user.id) // Filtra para não mostrar você mesmo
                            .slice(0, 10)
                            .map((delegate) => (
                                <Link key={delegate.id} href={`/profile/${delegate.username}`}>
                                    <a className="flex items-center space-x-3 px-2 py-1 hover:bg-[#f5f6f7] rounded-sm group transition-colors">
                                        <UserAvatar user={delegate} size="xs" className="h-6 w-6" />
                                        <span className="text-[13px] text-[#3b5998] font-bold group-hover:underline">
                                            {delegate.name || delegate.username}
                                        </span>
                                    </a>
                                </Link>
                            ))
                    )}
                </div>
            </div>

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
