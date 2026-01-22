import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { User } from "@shared/schema";
import { Loader2, ArrowLeft, KeyRound, ShieldCheck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [userToReset, setUserToReset] = useState<User | null>(null);

  useEffect(() => {
    if (user === null) navigate("/auth");
    else if (user && !user.isAdmin) navigate("/");
  }, [user, navigate]);

  const { data: allUsers, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user?.isAdmin,
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ id, isAdmin }: { id: number, isAdmin: boolean }) => {
        const res = await apiRequest("POST", `/api/admin/users/${id}/toggle-admin`, { isAdmin });
        return res.json();
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
        toast({ title: "Sucesso!", description: "Privilégios atualizados." });
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (variables: { userId: number; newPass: string }) => 
      apiRequest("POST", `/api/admin/users/${variables.userId}/reset-password`, { newPassword: variables.newPass }),
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Senha alterada." });
      setIsResetDialogOpen(false);
      setNewPassword("");
    }
  });

  if (!user?.isAdmin) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#e9ebee] flex justify-center">
      <div className="w-full max-w-[1012px] flex flex-col md:flex-row pt-4 gap-4 px-2">
        
        {/* SIDEBAR: Lateral e estreita */}
        <aside className="w-full md:w-[180px] flex-shrink-0">
          <Sidebar />
        </aside>

        {/* PAINEL: Central e Largo */}
        <main className="flex-1 bg-white border border-[#dfe3ee] shadow-sm mb-10 overflow-hidden">
          <div className="p-4 border-b border-[#dfe3ee] bg-[#f5f6f7] flex justify-between items-center">
            <h1 className="text-sm font-bold text-[#4b4f56] uppercase">Painel de Administração</h1>
            <Link href="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1"/> Sair do Painel</Button></Link>
          </div>

          <Tabs defaultValue="users" className="w-full">
            <div className="px-4 pt-2 border-b border-[#dfe3ee]">
              <TabsList className="bg-transparent gap-4">
                <TabsTrigger value="users" className="data-[state=active]:border-b-2 data-[state=active]:border-[#3b5998] rounded-none px-0 pb-2">Delegações</TabsTrigger>
                <TabsTrigger value="export" className="data-[state=active]:border-b-2 data-[state=active]:border-[#3b5998] rounded-none px-0 pb-2">Exportar</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="users" className="p-0">
              {isLoadingUsers ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#3b5998]" /></div>
              ) : (
                <Table>
                  <TableHeader className="bg-[#f5f6f7]">
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="text-[11px] font-bold">DELEGAÇÃO</TableHead>
                      <TableHead className="text-[11px] font-bold">NOME REAL</TableHead>
                      <TableHead className="text-[11px] font-bold">STATUS</TableHead>
                      <TableHead className="text-right text-[11px] font-bold">AÇÕES</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers?.map((u) => (
                      <TableRow key={u.id} className="hover:bg-[#f5f6f7] transition-colors">
                        <TableCell><UserAvatar user={u} size="xs" /></TableCell>
                        <TableCell className="font-bold text-[#3b5998]">@{u.username}</TableCell>
                        <TableCell className="text-[#1d2129]">{u.name}</TableCell>
                        <TableCell>
                          {u.isAdmin ? <span className="text-green-600 font-bold flex items-center text-[11px]"><ShieldCheck className="w-3 h-3 mr-1"/> ADMIN</span> : <span className="text-gray-400 text-[11px]">DELEGADO</span>}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="xs" className="h-7 text-[10px]" onClick={() => toggleAdminMutation.mutate({ id: u.id, isAdmin: !u.isAdmin })}>
                            {u.isAdmin ? "Remover Admin" : "Tornar Admin"}
                          </Button>
                          <Button variant="ghost" size="xs" className="h-7 text-[10px]" onClick={() => {setUserToReset(u); setIsResetDialogOpen(true);}}>
                            <KeyRound className="w-3 h-3 mr-1"/> Senha
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="export" className="p-8 text-center">
              <Button variant="outline" onClick={() => {/* função csv */}}>
                <Download className="w-4 h-4 mr-2"/> Baixar Credenciais (CSV)
              </Button>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Redefinir Senha</DialogTitle></DialogHeader>
          <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-2 border rounded" placeholder="Nova senha (min. 6 chars)"/>
          <DialogFooter>
            <Button onClick={() => resetPasswordMutation.mutate({ userId: userToReset!.id, newPass: newPassword })}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
