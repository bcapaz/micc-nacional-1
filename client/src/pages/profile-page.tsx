import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { TweetCard } from "@/components/tweet/tweet-card";
import { Sidebar } from "@/components/layout/sidebar";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarDays, MapPin, Link as LinkIcon, Edit3, Camera } from "lucide-react";
import { TweetWithUser, User } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/compress"; // <--- Importamos o compressor

function EditProfileDialog({ user }: { user: User }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || "");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(user.profileImage || null);
  const [isCompressing, setIsCompressing] = useState(false); // Estado de carregamento da compressão

  const updateMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Usamos fetch nativo para garantir o envio correto de arquivos (Multipart)
      const res = await fetch("/api/profile/update", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) throw new Error("Falha ao atualizar perfil");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profile/${user.username}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] }); // Atualiza a sessão
      setIsOpen(false);
      toast({ title: "Perfil atualizado!" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao salvar alterações.", variant: "destructive" });
    }
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Preview imediato
      setPreviewUrl(URL.createObjectURL(file));
      
      try {
        setIsCompressing(true);
        // Comprime a imagem antes de preparar para envio
        const compressed = await compressImage(file);
        setSelectedImage(compressed);
      } catch (err) {
        console.error("Erro na compressão, usando original", err);
        setSelectedImage(file);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("username", username);
    formData.append("bio", bio);
    if (selectedImage) {
      formData.append("profileImage", selectedImage);
    }
    updateMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="font-bold">Editar perfil</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="flex justify-center mb-4">
            <div className="relative group cursor-pointer">
               <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-gray-200">
                 {previewUrl ? (
                   <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                 ) : (
                   <div className="h-full w-full bg-gray-200 flex items-center justify-center text-gray-400">Sem foto</div>
                 )}
               </div>
               <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <Camera className="text-white w-6 h-6" />
               </div>
               <input 
                 type="file" 
                 accept="image/*" 
                 className="absolute inset-0 opacity-0 cursor-pointer" 
                 onChange={handleImageChange}
               />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="username">Nome de usuário</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bio">Biografia</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Fale sobre você..." />
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={updateMutation.isPending || isCompressing} className="bg-[#3b5998] hover:bg-[#2d4373]">
              {updateMutation.isPending || isCompressing ? <Loader2 className="animate-spin h-4 w-4" /> : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ProfilePage() {
  const params = useParams();
  const { user: currentUser } = useAuth();
  
  // Se não tem params.username, usa o do usuário logado (fallback)
  const identifier = params.identifier || currentUser?.username;

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: [`/api/profile/${identifier}`],
  });

  const { data: tweets, isLoading: tweetsLoading } = useQuery<TweetWithUser[]>({
    queryKey: [`/api/profile/${identifier}/tweets`],
    enabled: !!user,
  });

  if (userLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-[#3b5998]" /></div>;
  }

  if (!user) {
    return <div className="text-center p-8">Usuário não encontrado</div>;
  }

  const isOwnProfile = currentUser?.id === user.id;

  return (
    <div className="min-h-screen bg-[#e9ebee] flex justify-center">
      <div className="w-full max-w-[1012px] flex flex-col md:flex-row pt-4 gap-4 px-2">
        <aside className="hidden md:block w-[180px] flex-shrink-0">
          <Sidebar />
        </aside>

        <main className="flex-1 min-w-0">
          {/* Capa e Info do Perfil */}
          <div className="bg-white border border-[#dfe3ee] rounded-sm mb-4 overflow-hidden">
             <div className="h-32 bg-[#3b5998] relative"></div>
             <div className="px-4 pb-4">
                <div className="flex justify-between items-end -mt-12 mb-4">
                   <div className="relative">
                      <div className="p-1 bg-white rounded-full">
                        <UserAvatar user={user} className="h-32 w-32 text-4xl border border-[#dfe3ee]" />
                      </div>
                   </div>
                   {isOwnProfile && <EditProfileDialog user={user} />}
                </div>

                <div>
                   <h1 className="text-2xl font-bold text-[#1d2129]">{user.name}</h1>
                   <p className="text-gray-500 text-sm">@{user.username}</p>
                   {user.bio && <p className="mt-2 text-[#1d2129]">{user.bio}</p>}
                   
                   <div className="flex gap-4 mt-3 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                         <CalendarDays className="w-4 h-4" />
                         <span>Ingressou em {format(new Date(user.createdAt || new Date()), "MMMM yyyy", { locale: ptBR })}</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="space-y-3 mb-8">
            <h3 className="font-bold text-[#4b4f56] px-1">Publicações</h3>
            {tweetsLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-[#3b5998]" /></div>
            ) : tweets && tweets.length > 0 ? (
              tweets.map((tweet) => (
                <TweetCard key={tweet.id} tweet={tweet} />
              ))
            ) : (
              <div className="text-center p-8 bg-white border border-[#dfe3ee] rounded-sm text-gray-500">
                Nenhuma publicação ainda.
              </div>
            )}
          </div>
        </main>

        <aside className="hidden lg:block w-[280px] flex-shrink-0">
           <div className="bg-white border border-[#dfe3ee] p-3 rounded-sm shadow-sm text-xs text-gray-500">
              <p className="font-bold text-[#3b5998] mb-2">Sugestões</p>
              <p>Conecte-se com mais pessoas.</p>
           </div>
        </aside>
      </div>
    </div>
  );
}
