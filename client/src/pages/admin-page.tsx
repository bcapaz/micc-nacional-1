import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { User } from "@shared/schema";
import { Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
    const { toast } = useToast();
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
            toast({ title: "Sucesso", description: "Privilégios atualizados." });
        }
    });

    if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-[#e9ebee] flex justify-center">
            <div className="w-full max-w-[1012px] flex pt-4 gap-4">
                <Sidebar />
                <main className="flex-1 bg-white border border-[#dfe3ee] p-6 shadow-sm">
                    <h1 className="text-2xl font-bold text-[#1d2129] mb-4">Painel de Administração</h1>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#f5f6f7] border-b border-[#dfe3ee] text-[#90949c] text-xs uppercase">
                                    <th className="p-3">Delegação</th>
                                    <th className="p-3">Nome</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#dfe3ee]">
                                {users?.map((u) => (
                                    <tr key={u.id} className="text-sm">
                                        <td className="p-3 font-bold text-[#3b5998]">@{u.username}</td>
                                        <td className="p-3">{u.name}</td>
                                        <td className="p-3">
                                            {u.isAdmin ? 
                                                <span className="text-green-600 font-bold flex items-center"><ShieldCheck className="w-4 h-4 mr-1"/> Admin</span> : 
                                                <span className="text-gray-500 italic">Delegado</span>
                                            }
                                        </td>
                                        <td className="p-3">
                                            <button 
                                                onClick={() => toggleAdminMutation.mutate({ id: u.id, isAdmin: !u.isAdmin })}
                                                className={`px-3 py-1 rounded text-xs font-bold text-white ${u.isAdmin ? 'bg-red-500' : 'bg-[#3b5998]'}`}
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
