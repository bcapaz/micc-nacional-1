import { Link } from "wouter";
import { UserAvatar } from "@/components/ui/user-avatar";
import { TweetWithUser } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Heart, MessageSquare, Repeat2, Trash2, MoreHorizontal, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
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

// Interface para explicar pro TypeScript o que o servidor devolve
interface CommentsResponse {
  success: boolean;
  count: number;
  comments: TweetWithUser[];
}

export function TweetCard({ tweet }: TweetCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isCommenting, setIsCommenting] = useState(false);
  const [commentText, setCommentText] = useState("");

  // 1. BUSCA CORRIGIDA: Agora tipamos o retorno como CommentsResponse
  const { data: responseData, isLoading: isLoadingComments } = useQuery<CommentsResponse>({
    queryKey: [`/api/tweets/${tweet.id}/comments`],
    // Importante: Passamos a função de fetch explícita para garantir
    queryFn: async () => {
        const res = await apiRequest("GET", `/api/tweets/${tweet.id}/comments`);
        return res.json();
    },
    enabled: isCommenting, 
  });

  // O segredo: extraímos a lista de dentro do objeto de resposta
  const commentsList = responseData?.comments || [];

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/tweets/${tweet.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tweets"] }); 
      queryClient.invalidateQueries({ queryKey: [`/api/profile/${user?.username}/tweets`] });
      toast({ title: "Sucesso", description: "Publicação excluída." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao excluir.", variant: "destructive" });
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
          queryClient.invalidateQueries({ queryKey: [`/api/tweets/${tweet.id}/comments`] });
          setCommentText("");
          toast({ title: "Comentário enviado" });
      }
  });

  const canDelete = user?.isAdmin || user?.id === tweet.userId;

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
              {tweet.user.isAdmin && <ShieldCheck className="w-3 h-3 text-green-600" title="Administrador" />}
            </div>
            <div className="flex items-center space-x-2">
                <span className="text-xs text-[#90949c]">
                {formatDistanceToNow(new Date(tweet.createdAt), { addSuffix: true, locale: ptBR })}
                </span>
                
                {canDelete && (
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
              <img 
                 src={tweet.mediaData} 
                 alt="Conteúdo da publicação" 
                 className="w-full h-auto block" 
                 loading="lazy" // <--- A MÁGICA ESTÁ AQUI
                 decoding="async" // <--- E AQUI (ajuda na performance de renderização)
              />
            </div>
          )}

          <div className="flex items-center justify-between mt-3 max-w-md border-t border-[#f0f2f5] pt-1">
            <Button 
                variant="ghost" 
                size="sm" 
                className={`text-xs gap-1 h-8 px-2 ${tweet.isLiked ? "text-[#3b5998] font-bold" : "text-[#7f7f7f]"}`}
                onClick={() => likeMutation.mutate()}
            >
              <Heart className={`w-4 h-4 ${tweet.isLiked ? "fill-current" : ""}`} />
              {tweet.likeCount > 0 ? `${tweet.likeCount} Curtidas` : "Curtir"}
            </Button>

            <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs gap-1 h-8 px-2 text-[#7f7f7f]"
                onClick={() => setIsCommenting(!isCommenting)}
            >
              <MessageSquare className="w-4 h-4" />
              {tweet.commentCount > 0 ? `${tweet.commentCount} Comentários` : "Comentar"}
            </Button>

            <Button 
                variant="ghost" 
                size="sm" 
                className={`text-xs gap-1 h-8 px-2 ${tweet.isReposted ? "text-[#3b5998] font-bold" : "text-[#7f7f7f]"}`}
                onClick={() => repostMutation.mutate()}
            >
              <Repeat2 className="w-4 h-4" />
              {tweet.repostCount > 0 ? `${tweet.repostCount} Reposts` : "Compartilhar"}
            </Button>
          </div>

          {/* SÓ MOSTRA SE O USUÁRIO CLICAR EM COMENTAR */}
          {isCommenting && (
              <div className="mt-3 bg-[#f5f6f7] p-3 rounded-md">
                  <div className="space-y-3 mb-4">
                    {isLoadingComments ? (
                      <div className="flex justify-center py-2"><Loader2 className="animate-spin h-4 w-4 text-[#3b5998]" /></div>
                    ) : commentsList.length > 0 ? (
                      // AQUI ESTAVA O ERRO: Agora usamos commentsList ao invés de comments direto
                      commentsList.map((comment) => (
                        <div key={comment.id} className="flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                           <Link href={`/profile/${comment.user.username}`}>
                              <a className="flex-shrink-0">
                                <UserAvatar user={comment.user} size="xs" className="h-8 w-8" />
                              </a>
                           </Link>
                           <div className="bg-white p-2 rounded-[18px] px-3 border border-[#e5e5e5] shadow-sm flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <Link href={`/profile/${comment.user.username}`}>
                                  <a className="text-xs font-bold text-[#3b5998] hover:underline">
                                    {comment.user.name}
                                  </a>
                                </Link>
                              </div>
                              <p className="text-[13px] text-[#1d2129] leading-tight">{comment.content}</p>
                              <div className="mt-1">
                                <span className="text-[10px] text-gray-500">
                                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ptBR })}
                                </span>
                              </div>
                           </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500 text-center italic py-2">Seja o primeiro a comentar.</p>
                    )}
                  </div>

                  <div className="flex gap-2 items-start">
                      <UserAvatar user={user!} size="xs" className="h-8 w-8 mt-0.5" />
                      <div className="flex-1 relative">
                        <Textarea 
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Escreva um comentário..."
                            className="min-h-[36px] text-sm bg-white border border-[#ccd0d5] focus-visible:ring-0 focus-visible:border-[#3b5998] rounded-[18px] py-2 px-3 resize-none pr-16 overflow-hidden"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (commentText.trim()) commentMutation.mutate();
                                }
                            }}
                        />
                        <div className="absolute right-2 top-1.5">
                          {commentMutation.isPending ? (
                             <Loader2 className="h-5 w-5 animate-spin text-[#3b5998]" /> 
                          ) : (
                             <Button 
                                size="sm" 
                                className="h-6 text-[11px] px-2 bg-transparent text-[#3b5998] hover:bg-gray-100 font-bold"
                                onClick={() => commentMutation.mutate()}
                                disabled={!commentText.trim()}
                             >
                                Enviar
                             </Button>
                          )}
                        </div>
                      </div>
                  </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
}
