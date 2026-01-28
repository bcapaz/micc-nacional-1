import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TweetCard } from "@/components/tweet/tweet-card";
import { Sidebar } from "@/components/layout/sidebar";
import { Loader2, ChevronDown, ImageIcon, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import { TweetWithUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface TweetsResponse {
  data: TweetWithUser[];
  nextCursor: string | null;
}

function CreateTweetBox() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createTweetMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // CORREÇÃO: Fetch nativo para garantir upload multipart correto
      const res = await fetch("/api/tweets", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Falha ao criar publicação");
      return res.json();
    },
    onSuccess: () => {
      setContent("");
      setSelectedImage(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["/api/tweets"] });
      toast({ title: "Publicado!", description: "Sua publicação foi enviada." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao publicar.", variant: "destructive" });
    }
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return;
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = () => {
    if (!content.trim() && !selectedImage) return;
    const formData = new FormData();
    formData.append("content", content);
    formData.append("isComment", "false"); 
    if (selectedImage) formData.append("media", selectedImage);
    createTweetMutation.mutate(formData);
  };

  if (!user) return null;

  return (
    <div className="bg-white border border-[#dfe3ee] rounded-sm mb-4 shadow-sm">
      <div className="bg-[#f5f6f7] border-b border-[#e5e5e5] px-3 py-2 flex gap-4 text-xs font-semibold text-[#4b4f56]">
        <div className="flex items-center gap-1 cursor-pointer text-[#3b5998]">
           <span>✎</span><span>Criar Publicação</span>
        </div>
        <div className="flex items-center gap-1 cursor-pointer hover:text-[#3b5998]" onClick={() => fileInputRef.current?.click()}>
           <ImageIcon className="w-3 h-3" /><span>Foto/Vídeo</span>
        </div>
      </div>
      <div className="p-3">
        <div className="flex gap-2">
          <div className="flex-shrink-0"><UserAvatar user={user} size="sm" /></div>
          <div className="flex-1">
             <Textarea 
               value={content}
               onChange={(e) => setContent(e.target.value)}
               placeholder={`No que você está pensando?`}
               className="border-none resize-none focus-visible:ring-0 p-0 text-sm min-h-[60px] placeholder:text-[#90949c]"
             />
             {previewUrl && (
               <div className="relative mt-2 mb-2 inline-block">
                 <img src={previewUrl} alt="Preview" className="max-h-60 rounded border border-gray-200" />
                 <button onClick={removeImage} className="absolute top-1 right-1 bg-gray-800/70 text-white rounded-full p-1 hover:bg-gray-900"><X className="w-3 h-3" /></button>
               </div>
             )}
          </div>
        </div>
        <div className="border-t border-[#e5e5e5] mt-3 pt-3 flex justify-between items-center">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
            <div className="flex-1"></div>
            <Button onClick={handleSubmit} disabled={(!content.trim() && !selectedImage) || createTweetMutation.isPending} className="bg-[#3b5998] hover:bg-[#2d4373] text-white font-bold h-7 text-xs px-4 rounded-sm">
              {createTweetMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Publicar"}
            </Button>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, refetch } = useInfiniteQuery<TweetsResponse>({
    queryKey: ["/api/tweets"],
    queryFn: async ({ pageParam }) => {
      const url = pageParam ? `/api/tweets?cursor=${pageParam}` : `/api/tweets`;
      const res = await apiRequest("GET", url);
      return res.json();
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#e9ebee] flex justify-center">
      <div className="w-full max-w-[1012px] flex flex-col md:flex-row pt-4 gap-4 px-2">
        <aside className="hidden md:block w-[180px] flex-shrink-0"><Sidebar /></aside>
        <main className="flex-1 min-w-0">
          <CreateTweetBox />
          <div className="space-y-3 mb-8">
            {status === "pending" ? (
              <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-[#3b5998]" /></div>
            ) : status === "error" ? (
              <div className="text-center p-4 text-red-500">Erro ao carregar.<Button variant="link" onClick={() => refetch()}>Tentar novamente</Button></div>
            ) : (
              <>
                {data.pages.map((page, i) => (
                  <div key={i} className="space-y-3">
                    {page.data.map((tweet) => <TweetCard key={tweet.id} tweet={tweet} />)}
                  </div>
                ))}
                <div className="py-4 text-center">
                  {isFetchingNextPage ? (
                    <Button disabled variant="ghost"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando...</Button>
                  ) : hasNextPage ? (
                    <Button onClick={() => fetchNextPage()} className="w-full bg-[#d8dfea] text-[#3b5998] hover:bg-[#caced6] font-bold shadow-sm border border-[#caced6]"><ChevronDown className="mr-2 h-4 w-4" />Mais</Button>
                  ) : (
                    <div className="text-gray-500 text-sm p-4">Fim das publicações</div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
