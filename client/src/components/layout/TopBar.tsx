import { Search, Users, MessageSquare, Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Link } from "wouter";

export function TopBar() {
    const { user } = useAuth();

    return (
        <header className="fixed top-0 left-0 w-full bg-facebook-blue h-11 shadow-md z-50 flex items-center justify-center px-4">
            <div className="w-full max-w-6xl flex items-center justify-between">
                {/* Lado Esquerdo: Logo e Busca */}
                <div className="flex items-center">
                    <Link href="/" className="text-white text-2xl font-bold pr-4 cursor-pointer" style={{ fontFamily: "'Klavika', sans-serif" }}>
                        facebook
                    </Link>
                    <div className="relative hidden md:block">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Pesquisar no Facebook"
                            className="bg-white rounded-md pl-8 pr-2 py-1 text-sm focus:outline-none"
                        />
                    </div>
                </div>

                {/* Lado Direito: Perfil e Ícones */}
                {user && (
                    <div className="flex items-center space-x-2">
                         <Link href={`/profile/${user.id}`} className="flex items-center space-x-2 p-1 pr-2 rounded hover:bg-facebook-blue-dark cursor-pointer">
                            <UserAvatar user={user} size="xs" />
                            <span className="text-white font-semibold text-sm hidden sm:block">{user.username.split(' ')[0]}</span>
                        </Link>

                        <div className="h-6 w-px bg-facebook-blue-separator hidden sm:block"></div>

                        {/* Ícones */}
                        <div className="flex items-center space-x-1">
                             <button className="h-8 w-8 rounded hover:bg-facebook-blue-dark flex items-center justify-center">
                                <Users className="h-5 w-5 text-white" />
                            </button>
                             <button className="h-8 w-8 rounded hover:bg-facebook-blue-dark flex items-center justify-center">
                                <MessageSquare className="h-5 w-5 text-white" />
                            </button>
                             <button className="h-8 w-8 rounded hover:bg-facebook-blue-dark flex items-center justify-center">
                                <Bell className="h-5 w-5 text-white" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}

