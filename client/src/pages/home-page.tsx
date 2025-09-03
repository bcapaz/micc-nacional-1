import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { TweetCard } from "@/components/tweet/tweet-card";
import { TweetForm } from "@/components/tweet/tweet-form";
import { TrendingSidebar } from "@/components/trending/trending-sidebar";
import { type TweetWithUser } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { Fragment } from "react";

// A função que busca os dados da nossa API
// O parâmetro 'pageParam' é gerenciado pelo React Query e será o nosso cursor
async function fetchTweets({ pageParam }: { pageParam: unknown }) {
    const cursor = typeof pageParam === 'string' ? pageParam : '';
    // Usamos encodeURIComponent para garantir que a data seja enviada corretamente na URL
    const response = await fetch(`/api/tweets?cursor=${encodeURIComponent(cursor)}`);
    if (!response.ok) {
        throw new Error("Falha ao buscar os tweets.");
    }
    return response.json();
}

export default function HomePage() {
    const queryClient = useQueryClient();

    // Hook para busca infinita (paginação)
    const {
        data,
        isLoading,
        isError,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: ["tweets"], // Chave única para esta query
        queryFn: fetchTweets,
        // Informa ao React Query como obter o cursor para a próxima página
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        initialPageParam: undefined,
    });

    // Esta função será chamada pelo TweetForm após um novo tweet ser criado com sucesso
    // Ela invalida a query, fazendo o React Query buscar os dados novamente para incluir o novo tweet
    const handleSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['tweets'] });
    }

    return (
        <div className="min-h-screen flex flex-col md:flex-row">
            <Sidebar />
            
            <div className="flex-1 md:ml-64">
                <div className="max-w-4xl mx-auto md:flex">
                    {/* Coluna Principal do Feed */}
                    <div className="flex-1">
                        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 dark:bg-gray-950 dark:border-gray-800">
                            <div className="px-4 py-3">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Twitter dos Delegados</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Discuta a greve dos caminhoneiros de 2018</p>
                            </div>
                        </header>
                        
                        <TweetForm onSuccess={handleSuccess} />
                        
                        <div className="divide-y divide-gray-200 dark:divide-gray-800">
                            {isLoading && (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-[#009c3b]" />
                                </div>
                            )}

                            {isError && (
                                <div className="p-8 text-center text-red-500">
                                    Ocorreu um erro ao carregar as publicações.
                                </div>
                            )}

                            {data?.pages.map((page, i) => (
                                <Fragment key={i}>
                                    {page.data.map((tweet: TweetWithUser) => (
                                        <TweetCard key={tweet.id} tweet={tweet} />
                                    ))}
                                </Fragment>
                            ))}
                        </div>

                        {/* Seção do Botão "Carregar mais" */}
                        <div className="p-4 text-center">
                            {hasNextPage && (
                                <button
                                    onClick={() => fetchNextPage()}
                                    disabled={isFetchingNextPage}
                                    className="rounded-full bg-sky-500 px-4 py-2 font-bold text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-sky-800"
                                >
                                    {isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
                                </button>
                            )}

                            {!isLoading && !hasNextPage && (
                                <p className="text-gray-500 dark:text-gray-400">Você chegou ao fim.</p>
                            )}
                        </div>
                    </div>
                    
                    {/* A Sidebar da direita deve estar aqui, dentro do layout principal */}
                    <TrendingSidebar />
                </div>
            </div>
        </div>
    );
}
