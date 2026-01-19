import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { User } from "@shared/schema";
import { Loader2, ArrowLeft, AlertTriangle, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

  // MUTATION PARA DAR/REMOVER ADMIN
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
      toast({ title: "Senha Redefinida!", description: `A senha para ${userToReset?.username} foi alterada.` });
      setIsResetDialogOpen(false);
      setNewPassword("");
      setUserToReset(null);
    }
  });

  const handleOpenResetDialog = (u: User) => {
    setUserToReset(u);
    setIsResetDialogOpen(true);
  };

  const downloadCredentials = () => {
    if (!allUsers) return;
    const csvContent = "Nome Completo,Nome de Delegação,Senha\n" + allUsers.map(u => `"${u.name}","${u.username}","Senha definida pelo usuário"`).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'delegacoes_credenciais.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  if (!user?.isAdmin) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  
  return (
    <>
      <div className="min-h-screen flex flex-col md:flex-row">
        <Sidebar />
        <div className="flex-1 md:ml-64 bg-background">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <header className="mb-6">
              <div className="flex items-center mb-4">
                <Link href="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button></Link>
                <h1 className="text-2xl font-bold ml-2">Painel de Administração</h1>
              </div>
            </header>
            
            <Tabs defaultValue="users" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="users">Delegações</TabsTrigger>
                <TabsTrigger value="export">Exportar Dados</TabsTrigger>
              </TabsList>
              
              <TabsContent value="users">
                <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
                  {isLoadingUsers ? (
                    <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-[#3b5998]" /></div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Delegação</TableHead>
                          <TableHead>Nome Real</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allUsers?.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell><UserAvatar user={u} size="sm" /></TableCell>
                            <TableCell className="font-bold text-[#3b5998]">@{u.username}</TableCell>
                            <TableCell>{u.name}</TableCell>
                            <TableCell>
                              {u.isAdmin ? <span className="text-green-600 font-bold flex items-center"><ShieldCheck className="h-3 w-3 mr-1"/> Admin</span> : "Delegado"}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              {/* BOTÃO DE DAR ADMIN */}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => toggleAdminMutation.mutate({ id: u.id, isAdmin: !u.isAdmin })}
                              >
                                {u.isAdmin ? "Remover Admin" : "Tornar Admin"}
                              </Button>
                              
                              <Button variant="ghost" size="sm" onClick={() => handleOpenResetDialog(u)}>
                                <KeyRound className="h-4 w-4 mr-2" /> Redefinir Senha
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="export">
                 <div className="bg-card rounded-lg border border-border p-6 text-center">
                    <Button variant="outline" onClick={downloadCredentials}>Baixar Lista de Delegações (CSV)</Button>
                 </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Redefinir Senha</DialogTitle></DialogHeader>
          <div className="py-4">
            <input 
              type="text" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2 border rounded" 
              placeholder="Nova senha (mín. 6 caracteres)"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => resetPasswordMutation.mutate({ userId: userToReset!.id, newPass: newPassword })}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
