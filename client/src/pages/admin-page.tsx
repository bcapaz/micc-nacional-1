import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { User } from "@shared/schema";
import { Loader2, ArrowLeft, AlertTriangle, KeyRound } from "lucide-react";
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
import { apiRequest } from "@/lib/queryClient";
// [CORRIGIDO] Usando apenas Dialog, que já existe no seu projeto
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
  
  const resetPasswordMutation = useMutation({
    mutationFn: (variables: { userId: number; newPass: string }) => 
      apiRequest("POST", `/api/admin/users/${variables.userId}/reset-password`, { newPassword: variables.newPass }),
    onSuccess: () => {
      toast({
        title: "Senha Redefinida!",
        description: `A senha para ${userToReset?.username} foi alterada com sucesso.`,
      });
      setIsResetDialogOpen(false);
      setNewPassword("");
      setUserToReset(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao redefinir senha",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleOpenResetDialog = (userToReset: User) => {
    setUserToReset(userToReset);
    setIsResetDialogOpen(true);
  };

  const handleConfirmReset = () => {
    if (!userToReset || !newPassword.trim() || newPassword.length < 6) {
        toast({ title: "Senha inválida", description: "A nova senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
        return;
    }
    resetPasswordMutation.mutate({ userId: userToReset.id, newPass: newPassword });
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
  
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  return (
    <>
      <div className="min-h-screen flex flex-col md:flex-row">
        <Sidebar />
        
        <div className="flex-1 md:ml-64">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <header className="mb-6">
              <div className="flex items-center mb-4">
                <Link href="/" className="mr-4">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                </Link>
                <h1 className="text-2xl font-bold text-foreground">Painel de Administração</h1>
              </div>
              <p className="text-muted-foreground">
                Gerencie usuários, tweets e configurações da plataforma.
              </p>
            </header>
            
            <Tabs defaultValue="users" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="users">Delegações</TabsTrigger>
                <TabsTrigger value="export">Exportar Dados</TabsTrigger>
              </TabsList>
              
              <TabsContent value="users">
                <div className="bg-card rounded-lg shadow-sm border border-border">
                  <div className="p-4 border-b border-border">
                    <h2 className="text-lg font-medium">Delegações Registradas</h2>
                    <p className="text-sm text-muted-foreground">
                      Lista de todas as delegações registradas na plataforma.
                    </p>
                  </div>
                  
                  {isLoadingUsers ? (
                    <div className="flex justify-center items-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-accent" />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Nome de Delegação</TableHead>
                            <TableHead>Nome Completo</TableHead>
                            <TableHead>Administrador</TableHead>
                            <TableHead>Data de Registro</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allUsers?.map((tableUser) => (
                            <TableRow key={tableUser.id}>
                              <TableCell>
                                <UserAvatar user={tableUser} size="sm" />
                              </TableCell>
                              <TableCell className="font-medium">{tableUser.username}</TableCell>
                              <TableCell>{tableUser.name}</TableCell>
                              <TableCell>
                                {tableUser.isAdmin ? (
                                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                    Admin
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                    Usuário
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {new Date(tableUser.createdAt).toLocaleDateString('pt-BR')}
                              </TableCell>
                              <TableCell className="text-right space-x-2">
                                <Button variant="ghost" size="sm" asChild>
                                  <Link href={`/profile/${tableUser.id}`}>Ver Perfil</Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenResetDialog(tableUser)}
                                  disabled={resetPasswordMutation.isPending && userToReset?.id === tableUser.id}
                                >
                                  <KeyRound className="h-4 w-4 mr-2" />
                                  Redefinir Senha
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="export">
                 <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                    <h2 className="text-lg font-medium mb-4">Exportar Dados</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Baixe um arquivo CSV com as credenciais de todas as delegações para referência.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={downloadCredentials}
                      disabled={!allUsers || allUsers.length === 0}
                    >
                      Baixar Lista de Delegações
                    </Button>
                    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <h3 className="text-amber-800 font-medium mb-2 flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Aviso de Privacidade
                      </h3>
                      <p className="text-sm text-amber-700">
                        Todos os dados exportados são confidenciais. Não compartilhe as credenciais com pessoas não autorizadas.
                        As senhas dos usuários são armazenadas de forma segura e não podem ser visualizadas mesmo por administradores.
                      </p>
                    </div>
                  </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
            <DialogDescription>
              Digite a nova senha para o utilizador <strong>{userToReset?.username}</strong>. A ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              {/* [CORRIGIDO] Usando <label> e <input> HTML padrão */}
              <label htmlFor="newPassword" className="text-right">
                Nova Senha
              </label>
              <input
                id="newPassword"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="col-span-3 p-2 border rounded-md bg-background text-foreground"
                placeholder="Mínimo de 6 caracteres"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmReset} disabled={resetPasswordMutation.isPending}>
              {resetPasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Redefinição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}