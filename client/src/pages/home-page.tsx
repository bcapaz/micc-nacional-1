import { useAuth } from "@/hooks/use-auth";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { TweetCard } from "@/components/tweet/tweet-card";
import { CreateTweet } from "@/components/tweet/create-tweet";
import { Sidebar } from "@/components/layout/sidebar";
import { Loader2, RefreshCw, ChevronDown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { TweetWithUser } from "@shared/schema";

// Interface para explicar o retorno da API paginada
interface TweetsResponse {
  data: TweetWithUser[];
  nextCursor: string | null;
}

export default function HomePage() {
  const { user } = useAuth();

  // BUSCA INFINITA (PAGINAÇÃO)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    refetch
  } = useInfiniteQuery<TweetsResponse>({
    queryKey: ["/api/tweets"],
    queryFn: async ({ pageParam }) => {
      // Se tiver um cursor (página seguinte), manda na URL
      const url = pageParam 
        ? `/api/tweets?cursor=${pageParam}` 
        : `/api/tweets`;
      
      const res = await apiRequest("GET", url);
      return res.json();
    },
    initialPageParam: null, // Começa do zero (topo)
    getNextPageParam: (lastPage) => lastPage.nextCursor, // O backend diz qual o próximo
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#e9ebee] flex justify-center">
      <div className="w-full max-w-[1012px] flex flex-col md:flex-row pt-4 gap-4 px-2">
        
        {/* SIDEBAR */}
        <aside className="hidden md:block w-[180px] flex-shrink-0">
          <Sidebar />
        </aside>

        {/* FEED PRINCIPAL */}
        <main className="flex-1 min-w-0">
          <CreateTweet />

          <div className="space-y-3 mb-8">
            {status === "pending" ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#3b5998]" />
              </div>
            ) : status === "error" ? (
              <div className="text-center p-4 bg-white rounded shadow text-red-500">
                Erro ao carregar publicações.
                <Button variant="link" onClick={() => refetch()}>Tentar novamente</Button>
              </div>
            ) : (
              <>
                {/* Renderiza todas as páginas carregadas */}
                {data.pages.map((page, i) => (
                  <div key={i} className="space-y-3">
                    {page.data.map((tweet) => (
                      <TweetCard key={tweet.id} tweet={tweet} />
                    ))}
                  </div>
                ))}

                {/* BOTÃO CARREGAR MAIS / PUBLICAÇÕES ANTIGAS */}
                <div className="py-4 text-center">
                  {isFetchingNextPage ? (
                    <Button disabled variant="ghost" className="bg-white border shadow-sm">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Carregando...
                    </Button>
                  ) : hasNextPage ? (
                    <Button 
                      onClick={() => fetchNextPage()} 
                      className="w-full bg-[#d8dfea] text-[#3b5998] hover:bg-[#caced6] font-bold shadow-sm border border-[#caced6]"
                    >
                      <ChevronDown className="mr-2 h-4 w-4" />
                      Carregar publicações antigas
                    </Button>
                  ) : (
                    <div className="text-gray-500 text-sm flex items-center justify-center gap-2">
                      <div className="h-[1px] bg-gray-300 w-10"></div>
                      <span>Não há mais publicações</span>
                      <div className="h-[1px] bg-gray-300 w-10"></div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>

        {/* COLUNA DIREITA (Opcional, se você tiver) */}
        <aside className="hidden lg:block w-[280px] flex-shrink-0">
           {/* Espaço para publicidade, aniversários, etc */}
           <div className="bg-white border border-[#dfe3ee] p-3 rounded-sm shadow-sm text-xs text-gray-500">
              <p className="font-bold text-[#3b5998] mb-2">Patrocinado</p>
              <div className="h-20 bg-gray-100 flex items-center justify-center mb-2">
                 Anúncio aqui
              </div>
              <p>Participe do debate presidencial 2014 com respeito e diplomacia.</p>
           </div>
        </aside>

      </div>
    </div>
  );
}
