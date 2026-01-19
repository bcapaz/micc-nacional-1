import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { User } from "@shared/schema";
import { Loader2, ShieldCheck, ShieldX } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
    const { toast } = useToast();
    
    // Busca a lista para o painel
    const { data: users, isLoading } = useQuery<User[]>({ 
        queryKey: ["/api/admin/users"] 
    });

    const toggleAdminMutation = useMutation({
        mutationFn: async ({ id, isAdmin }: { id: number, isAdmin: boolean }) => {
            const res = await apiRequest("POST", `/api/admin/users/${id}/toggle-admin`, { isAdmin });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
            toast({ title: "Sucesso", description: "Status de administrador atualizado." });
        }
    });

    if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-[#3b5998]" /></div>;

    return (
        <div className="min-h-screen bg-[#e9ebee] flex justify-center">
            <div className="w-full max-w-[1012px] flex flex-col md:flex-row pt-4 gap-4 px-2">
                
                {/* Sidebar Lateral e Pequena */}
                <aside className="w-full md:w-[180px] flex-shrink-0">
                    <Sidebar />
                </aside>

                {/* Painel Central Grande */}
                <main className="flex-1 bg-white border border-[#dfe3ee] shadow-sm overflow-hidden mb-10">
                    <div className="bg-[#f5f6f7] px-4 py-2 border-b border-[#dfe3ee]">
                        <h1 className="text-sm font-bold text-[#4b4f56]">Painel de Administração</h1>
                    </div>
                    
                    <div className="p-4">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[11px] font-bold text-[#90949c] uppercase border-b border-[#dfe3ee]">
                                    <th className="pb-2">Delegação</th>
                                    <th className="pb-2">Nome Real</th>
                                    <th className="pb-2">Privilégio</th>
                                    <th className="pb-2 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#dfe3ee]">
                                {users?.map((u) => (
                                    <tr key={u.id} className="text-sm hover:bg-[#f5f6f7]">
                                        <td className="py-3 font-bold text-[#3b5998]">@{u.username}</td>
                                        <td className="py-3 text-[#1d2129]">{u.name}</td>
                                        <td className="py-3">
                                            {u.isAdmin ? (
                                                <span className="flex items-center text-green-600 font-bold">
                                                    <ShieldCheck className="w-3 h-3 mr-1"/> Admin
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">Delegado</span>
                                            )}
                                        </td>
                                        <td className="py-3 text-right">
                                            <button 
                                                onClick={() => toggleAdminMutation.mutate({ id: u.id, isAdmin: !u.isAdmin })}
                                                className={`px-2 py-1 rounded text-[11px] font-bold text-white transition-colors ${u.isAdmin ? 'bg-gray-400 hover:bg-gray-500' : 'bg-[#3b5998] hover:bg-[#2d4373]'}`}
                                            >
                                                {u.isAdmin ? "Remover Admin" : "Tornar Admin"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </div>
    );
}
