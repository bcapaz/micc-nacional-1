import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Camera, X } from "lucide-react";

export function ProfileEditForm({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("bio", bio || "");
      
      if (profileImage) {
        formData.append("profileImage", profileImage);
      }
      
      const response = await fetch("/api/profile/update", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao atualizar perfil");
      }
      
      return response.json();
    },
    // [CORRIGIDO] Adicionadas mais duas linhas para invalidar os feeds de tweets
    onSuccess: () => {
      setOpen(false);
      
      // Invalida os dados do usuário logado (ex: para a sidebar)
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      if (user) {
        // Invalida os dados do perfil (para o cabeçalho da página de perfil)
        queryClient.invalidateQueries({ queryKey: [`/api/profile/${user.username}`] });
        
        // [ADICIONADO] Invalida a lista de tweets do perfil
        queryClient.invalidateQueries({ queryKey: [`/api/profile/${user.username}/tweets`] });
      }

      // [ADICIONADO] Invalida a lista de tweets do feed principal
      queryClient.invalidateQueries({ queryKey: ["/api/tweets"] });

      toast({
        title: "Perfil atualizado!",
        description: "Seu perfil foi atualizado com sucesso.",
      });

      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter menos de 5MB.",
        variant: "destructive",
      });
      return;
    }
    
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Tipo de arquivo não suportado",
        description: "Apenas imagens são suportadas para foto de perfil.",
        variant: "destructive",
      });
      return;
    }
    
    setProfileImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const handleRemoveImage = () => {
    setProfileImage(null);
    setProfileImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast({
        title: "Nome de delegação obrigatório",
        description: "Por favor, informe um nome de delegação.",
        variant: "destructive",
      });
      return;
    }
    
    profileMutation.mutate();
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-accent text-accent-foreground">
          Editar Perfil
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center mb-4">
            <div className="relative">
              {profileImagePreview ? (
                <div className="relative">
                  <img 
                    src={profileImagePreview} 
                    alt="Preview" 
                    className="w-24 h-24 rounded-full object-cover"
                  />
                  <button 
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-opacity-90"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <UserAvatar user={user} size="lg" />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-accent text-accent-foreground rounded-full p-1 hover:bg-opacity-90"
                  >
                    <Camera size={16} />
                  </button>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
                id="profileImageUpload"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="username">Nome de Delegação</Label>
            <Input 
              id="username" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nome de Delegação" 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bio">Biografia</Label>
            <Textarea 
              id="bio" 
              value={bio} 
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte algo sobre sua delegação..." 
              rows={3}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={profileMutation.isPending}
              className="bg-accent text-accent-foreground"
            >
              {profileMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}