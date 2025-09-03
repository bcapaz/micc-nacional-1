import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ImageIcon, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TweetFormProps {
  parentId?: number;
  onSuccess?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
  isComment?: boolean;
  className?: string;
}

export function TweetForm({
  parentId,
  onSuccess,
  autoFocus = false,
  placeholder = "O que está acontecendo?",
  isComment = false,
  className = ""
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

    // Validação do tamanho do arquivo (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O limite é de 5MB',
        variant: 'destructive'
      });
      return;
    }

    // Validação do tipo de arquivo
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast({
        title: 'Formato inválido',
        description: 'Apenas imagens e vídeos são permitidos',
        variant: 'destructive'
      });
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const { mutate: createPost, isLoading } = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('content', content);
      
      if (media) {
        formData.append('media', media);
      }
      
      if (parentId) {
        formData.append('parentId', parentId.toString());
      }

      const endpoint = parentId ? `/api/tweets/${parentId}/comments` : '/api/tweets';
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include'
        // Não definir Content-Type manualmente - o browser vai definir como multipart/form-data
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao publicar');
      }

      return response.json();
    },
    onSuccess: () => {
      setContent('');
      setMedia(null);
      setMediaPreview(null);
      queryClient.invalidateQueries(['/api/tweets']);
      if (parentId) {
        queryClient.invalidateQueries([`/api/tweets/${parentId}/comments`]);
      }
      toast({
        title: isComment ? 'Comentário publicado!' : 'Tweet publicado!',
        description: isComment 
          ? 'Seu comentário foi enviado com sucesso'
          : 'Sua mensagem foi publicada'
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao publicar',
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !media) {
      toast({
        title: 'Conteúdo vazio',
        description: 'Escreva algo ou adicione uma mídia',
        variant: 'destructive'
      });
      return;
    }
    createPost();
  };

  if (!user) return null;

  const charCount = content.length;
  const isOverLimit = charCount > 280;
  const isNearLimit = charCount > 250;

  return (
    <div className={`p-4 ${isComment ? '' : 'border-b border-border'} ${className}`}>
      <div className="flex space-x-3">
        <div className="flex-shrink-0">
          <div 
            className="h-10 w-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: user.avatarColor || '#009c3b' }}
          >
            <span className="text-white font-medium">
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
        
        <div className="flex-1">
          <form onSubmit={handleSubmit}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              className="w-full p-2 bg-transparent border-none focus:ring-0 resize-none min-h-[80px]"
              autoFocus={autoFocus}
              rows={isComment ? 2 : 3}
            />
            
            {mediaPreview && (
              <div className="relative mt-2 rounded-lg overflow-hidden border border-border">
                {media?.type.startsWith('image/') ? (
                  <img 
                    src={mediaPreview} 
                    alt="Preview" 
                    className="max-h-80 w-full object-contain"
                  />
                ) : (
                  <video 
                    src={mediaPreview} 
                    controls 
                    className="max-h-80 w-full"
                  />
                )}
                <button
                  type="button"
                  onClick={removeMedia}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,video/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-muted-foreground hover:text-primary p-1 rounded-full"
                  disabled={isLoading}
                >
                  <ImageIcon className="h-5 w-5" />
                </button>
                
                <span className={`text-xs ${
                  isOverLimit ? 'text-red-500' : 
                  isNearLimit ? 'text-yellow-500' : 'text-muted-foreground'
                }`}>
                  {charCount}/280
                </span>
              </div>
              
              <Button
                type="submit"
                disabled={isLoading || isOverLimit || (!content.trim() && !media)}
                className="rounded-full px-4"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Publicando...
                  </>
                ) : (
                  isComment ? 'Comentar' : 'Publicar'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}