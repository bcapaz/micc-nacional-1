import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ImageIcon, X, Loader2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '../ui/user-avatar';

interface TweetFormProps {
    parentId?: number;
    onSuccess?: () => void;
    autoFocus?: boolean;
    placeholder?: string;
    isComment?: boolean;
}

export function TweetForm({
    parentId,
    onSuccess,
    autoFocus = false,
    placeholder = "No que você está pensando?",
    isComment = false,
}: TweetFormProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [content, setContent] = useState('');
    const [media, setMedia] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({ title: 'Arquivo muito grande', description: 'O limite é de 5MB', variant: 'destructive' });
            return;
        }

        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            toast({ title: 'Formato inválido', description: 'Apenas imagens e vídeos são permitidos', variant: 'destructive' });
            return;
        }

        setMedia(file);
        const reader = new FileReader();
        reader.onload = () => setMediaPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const removeMedia = () => {
        setMedia(null);
        setMediaPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const { mutate: createPost, isLoading } = useMutation({
        mutationFn: async () => {
            const formData = new FormData();
            formData.append('content', content);
            if (media) formData.append('media', media);
            if (parentId) formData.append('parentId', parentId.toString());

            const endpoint = parentId ? `/api/tweets/${parentId}/comments` : '/api/tweets';
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Falha ao publicar');
            }
            return response.json();
        },
        onSuccess: () => {
            setContent('');
            removeMedia();
            queryClient.invalidateQueries({ queryKey: ['tweets'] });
            onSuccess?.();
        },
        onError: (error: Error) => {
            toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        }
    });

    if (!user) return null;
    
    // Se for um comentário, o layout é mais simples
    if (isComment) {
        return (
             <div className="flex items-start space-x-2">
                 <UserAvatar user={user} size="sm" />
                 <div className="flex-1">
                     <textarea
                         value={content}
                         onChange={(e) => setContent(e.target.value)}
                         placeholder={placeholder}
                         className="w-full p-2 border rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-facebook-link"
                         autoFocus={autoFocus}
                         rows={2}
                     />
                     <div className="text-right mt-1">
                          <Button onClick={() => createPost()} disabled={isLoading || !content.trim()} size="sm">
                             {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Comentar'}
                         </Button>
                     </div>
                 </div>
             </div>
        )
    }

    return (
        <div className="bg-white rounded-lg shadow p-3 border border-gray-300">
            {/* Header do Formulário */}
            <div className="font-semibold text-sm text-facebook-grey-text-secondary pb-2 border-b">
                Criar Publicação
            </div>
            {/* Corpo do Formulário */}
            <div className="flex space-x-3 mt-3">
                <UserAvatar user={user} />
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-transparent border-none focus:ring-0 resize-none text-base placeholder-gray-500"
                    rows={2}
                />
            </div>

            {mediaPreview && (
                <div className="relative mt-2 rounded-lg overflow-hidden border">
                    {media?.type.startsWith('image/') ? (
                        <img src={mediaPreview} alt="Preview" className="max-h-80 w-full object-contain" />
                    ) : (
                        <video src={mediaPreview} controls className="max-h-80 w-full" />
                    )}
                    <button onClick={removeMedia} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}
            
            {/* Footer do Formulário */}
            <div className="flex items-center justify-between mt-3 border-t pt-2">
                <div className="flex space-x-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-1 text-sm font-semibold text-facebook-grey-text-secondary hover:bg-gray-100 p-2 rounded-lg">
                        <ImageIcon className="h-5 w-5 text-green-500" />
                        <span>Foto/vídeo</span>
                    </button>
                </div>
                <Button onClick={() => createPost()} disabled={isLoading || (!content.trim() && !media)}>
                     {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Publicar'}
                </Button>
            </div>
        </div>
    );
}
