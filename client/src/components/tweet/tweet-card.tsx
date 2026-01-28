import { Link } from "wouter";
import { UserAvatar } from "@/components/ui/user-avatar";
import { TweetWithUser } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Heart, MessageSquare, Repeat2, Trash2, MoreHorizontal, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

interface TweetCardProps {
  tweet: TweetWithUser;
}

export function TweetCard({ tweet }: TweetCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCommenting, setIsCommenting] = useState(false);
  const [commentText, setCommentText] = useState("");

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Chama a rota de admin para deletar
      await apiRequest("delete", `/api/admin/tweets/${tweet.id}`);
    },
    onSuccess: () => {
      // CORREÇÃO: As chaves agora incluem "/api" para bater com o useQuery do Home e Profile
      queryClient.invalidateQueries({ queryKey: ["/api/tweets"] }); 
      queryClient.invalidateQueries({ queryKey: [`/api/profile/${user?.username}/tweets`] });
      queryClient.invalidateQueries({ queryKey: [`/api/profile/${tweet.user.username}/tweets`] });
      
      toast({ title: "Sucesso", description: "Publicação excluída com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível excluir a publicação.", variant: "destructive" });
    }
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (tweet.isLiked) {
        await apiRequest("DELETE", `/api/tweets/${tweet.id}/like`);
      } else {
        await apiRequest("POST", `/api/tweets/${tweet.id}/like`);
      }
    },
    onSuccess: () => {
      // Atualiza o feed e o perfil para mostrar o like novo
      queryClient.invalidateQueries({ queryKey: ["/api/tweets"] });
      queryClient.invalidateQueries({ queryKey: [`/api/profile/${tweet.user.username}/tweets`] });
    }
  });

  const repostMutation = useMutation({
      mutationFn: async () => {
          if (tweet.isReposted) {
              await apiRequest("DELETE", `/api/tweets/${tweet.id}/repost`);
          } else {
              await apiRequest("POST", `/api/tweets/${tweet.id}/repost`);
          }
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/tweets"] });
          queryClient.invalidateQueries({ queryKey: [`/api/profile/${user?.username}/tweets`] });
          toast({ title: "Sucesso", description: tweet.isReposted ? "Compartilhamento removido" : "Publicação compartilhada" });
      }
  });

  const commentMutation = useMutation({
      mutationFn: async () => {
          await apiRequest("POST", `/api/tweets/${tweet.id}/comments`, { content: commentText });
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/tweets"] });
          setIsCommenting(false);
          setCommentText("");
          toast({ title: "Comentário enviado" });
      }
  });

  return (
    <div className="p-4 border-b border-[#dfe3ee] bg-white hover:bg-[#fafafa] transition-colors">
      <div className="flex space-x-3">
        <Link href={`/profile/${tweet.user.username}`}>
          <a className="cursor-pointer">
            <UserAvatar user={tweet.user} />
          </a>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Link href={`/profile/${tweet.user.username}`}>
                <a className="font-bold text-[#3b5998] hover:underline text-[14px]">
                  {tweet.user.name}
                </a>
              </Link>
              {tweet.user.isAdmin && <ShieldAlert className="w-3 h-3 text-green-600" title="Administrador" />}
            </div>
            <div className="flex items-center space-x-2">
                <span className="text-xs text-[#90949c]">
                {formatDistanceToNow(new Date(tweet.createdAt), { addSuffix: true, locale: ptBR })}
                </span>
                
                {/* BOTÃO DE DELETAR (Apenas Admin vê isso) */}
                {user?.isAdmin && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-6 w-6 p-0 text-gray-400 hover:bg-gray-100 rounded-full">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                                className="text-red-600 focus:text-red-600 cursor-pointer"
                                onClick={() => deleteMutation.mutate()}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir Publicação
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
          </div>
          
          <p className="mt-1 text-[14px] text-[#1d2129] whitespace-pre-wrap leading-snug break-words">
            {tweet.content}
          </p>
          
          {tweet.mediaData && (
            <div className="mt-3 rounded-sm border border-[#dfe3ee] overflow-hidden">
              <img src={tweet.mediaData} alt="Conteúdo da publicação" className="w-full h-auto block" />
            </div>
          )}

          <div className="flex items-center justify-between mt-3 max-w-md">
            <Button 
                variant="ghost" 
                size="sm" 
                className={`text-xs gap-1 h-6 px-2 ${tweet.isLiked ? "text-[#3b5998] font-bold" : "text-[#7f7f7f]"}`}
                onClick={() => likeMutation.mutate()}
            >
              <Heart className={`w-4 h-4 ${tweet.isLiked ? "fill-current" : ""}`} />
              {tweet.likeCount > 0 && tweet.likeCount} {tweet.likeCount === 1 ? "Curtida" : "Curtir"}
            </Button>

            <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs gap-1 h-6 px-2 text-[#7f7f7f]"
                onClick={() => setIsCommenting(!isCommenting)}
            >
              <MessageSquare className="w-4 h-4" />
              {tweet.commentCount > 0 && tweet.commentCount} Comentar
            </Button>

            <Button 
                variant="ghost" 
                size="sm" 
                className={`text-xs gap-1 h-6 px-2 ${tweet.isReposted ? "text-[#3b5998] font-bold" : "text-[#7f7f7f]"}`}
                onClick={() => repostMutation.mutate()}
            >
              <Repeat2 className="w-4 h-4" />
              {tweet.repostCount > 0 && tweet.repostCount} Compartilhar
            </Button>
          </div>

          {isCommenting && (
              <div className="mt-3 flex gap-2">
                  <Textarea 
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Escreva um comentário..."
                      className="min-h-[32px] text-sm bg-[#f0f2f5] border-none focus-visible:ring-1 resize-none py-2"
                  />
                  <Button 
                    size="sm" 
                    className="bg-[#3b5998] h-auto py-2"
                    onClick={() => commentMutation.mutate()}
                    disabled={!commentText.trim() || commentMutation.isPending}
                  >
                      Enviar
                  </Button>
              </div>
          )}
        </div>
      </div>
    </div>
  );
}
