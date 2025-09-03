import { TweetWithUser } from "@shared/schema";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
    MessageSquare,
    ThumbsUp, // Ícone de "Curtir"
    Share2, // Ícone de "Compartilhar"
    Trash2
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { TweetForm } from "./tweet-form"; // Importar o formulário de tweet para comentários

interface TweetCardProps {
    tweet: TweetWithUser;
}

export function TweetCard({ tweet }: TweetCardProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [mediaOpen, setMediaOpen] = useState(false);
    const [showCommentBox, setShowCommentBox] = useState(false);

    const timeAgo = formatDistanceToNow(new Date(tweet.createdAt), {
        addSuffix: true,
        locale: ptBR
    });

    const isImage = (dataUrl: string) => dataUrl?.startsWith("data:image/");
    const isVideo = (dataUrl: string) => dataUrl?.startsWith("data:video/");

    // Mutação para curtir/descurtir
    const likeMutation = useMutation({
        mutationFn: async () => {
            const method = tweet.isLiked ? "DELETE" : "POST";
            await apiRequest(method, `/api/tweets/${tweet.id}/like`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tweets"] });
        }
    });

    // Mutação para deletar (apenas admin)
    const deleteTweetMutation = useMutation({
        mutationFn: async () => {
            await apiRequest("DELETE", `/api/admin/tweets/${tweet.id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tweets"] });
            toast({ title: "Publicação excluída com sucesso" });
        },
        onError: (error: Error) => {
             toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    });

    const handleLikeClick = () => user && likeMutation.mutate();
    const handleDeleteClick = () => user?.isAdmin && deleteTweetMutation.mutate();

    return (
        <>
            <div className="bg-white rounded-lg shadow border border-gray-300">
                <div className="p-3">
                    <div className="flex items-start space-x-3">
                        <Link href={`/profile/${tweet.user.username}`}>
                            <a><UserAvatar user={tweet.user} size="md" /></a>
                        </Link>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Link href={`/profile/${tweet.user.username}`}>
                                        <a className="font-semibold text-facebook-grey-text hover:underline">
                                            {tweet.user.username}
                                        </a>
                                    </Link>
                                    <p className="text-xs text-facebook-grey-text-secondary">{timeAgo}</p>
                                </div>
                                {user?.isAdmin && (
                                    <button onClick={handleDeleteClick} className="text-facebook-grey-text-secondary hover:text-red-600">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {tweet.content && <p className="mt-3 text-sm text-facebook-grey-text break-words">{tweet.content}</p>}
                </div>

                {tweet.mediaData && (
                    <div className="mt-2 bg-gray-100 cursor-pointer" onClick={() => setMediaOpen(true)}>
                         {isImage(tweet.mediaData) ? (
                            <img src={tweet.mediaData} alt="Imagem da publicação" className="w-full h-auto object-cover" />
                        ) : isVideo(tweet.mediaData) ? (
                            <video src={tweet.mediaData} controls className="w-full h-auto" />
                        ) : null}
                    </div>
                )}

                {/* Seção de Contadores (Curtidas, Comentários) */}
                <div className="px-3 pt-2 text-xs text-facebook-grey-text-secondary flex justify-between">
                    <span>{tweet.likeCount ?? 0} Curtidas</span>
                    <span>{tweet.commentCount ?? 0} Comentários</span>
                </div>

                {/* Seção de Ações (Curtir, Comentar, Compartilhar) */}
                <div className="flex border-t mx-3 mt-1">
                    <button
                        onClick={handleLikeClick}
                        className={`flex-1 flex items-center justify-center p-2 rounded-b-lg space-x-1 text-sm font-semibold transition-colors ${tweet.isLiked ? 'text-facebook-link' : 'text-facebook-grey-text-secondary hover:bg-gray-100'}`}
                    >
                        <ThumbsUp className="h-4 w-4" />
                        <span>Curtir</span>
                    </button>
                    <button
                        onClick={() => setShowCommentBox(!showCommentBox)}
                        className="flex-1 flex items-center justify-center p-2 rounded-b-lg space-x-1 text-sm font-semibold text-facebook-grey-text-secondary hover:bg-gray-100 transition-colors"
                    >
                        <MessageSquare className="h-4 w-4" />
                        <span>Comentar</span>
                    </button>
                    <button className="flex-1 flex items-center justify-center p-2 rounded-b-lg space-x-1 text-sm font-semibold text-facebook-grey-text-secondary hover:bg-gray-100 transition-colors">
                        <Share2 className="h-4 w-4" />
                        <span>Compartilhar</span>
                    </button>
                </div>
                
                {/* Formulário de Comentário */}
                {showCommentBox && (
                    <div className="p-3 border-t">
                        <TweetForm
                            parentId={tweet.id}
                            onSuccess={() => {
                               setShowCommentBox(false);
                               queryClient.invalidateQueries({ queryKey: ["tweets"] });
                            }}
                            autoFocus
                            isComment
                            placeholder="Escreva um comentário..."
                        />
                    </div>
                )}
            </div>

            {/* Modal para Mídia */}
            {tweet.mediaData && isImage(tweet.mediaData) && (
                <Dialog open={mediaOpen} onOpenChange={setMediaOpen}>
                    <DialogContent className="max-w-4xl bg-transparent border-none shadow-none">
                        <img src={tweet.mediaData} alt="Imagem da publicação em tela cheia" className="max-h-[80vh] max-w-full object-contain mx-auto" />
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
