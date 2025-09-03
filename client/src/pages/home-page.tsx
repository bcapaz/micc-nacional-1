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
        <div className="w-full max-w-6xl mx-auto grid grid-cols-12 gap-x-4 pt-4">
            {/* Coluna Esquerda */}
            <div className="col-span-3 hidden md:block">
                 <Sidebar />
            </div>

            {/* Coluna Central (Feed) */}
            <div className="col-span-12 md:col-span-6">
                <TweetForm onSuccess={handleSuccess} />
                
                <div className="mt-4 space-y-4">
                    {isLoading && (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-facebook-blue" />
                        </div>
                    )}

                    {isError && (
                        <div className="p-8 text-center text-red-500 bg-white rounded-lg shadow">
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
                <div className="py-4 text-center">
                    {hasNextPage && (
                        <button
                            onClick={() => fetchNextPage()}
                            disabled={isFetchingNextPage}
                            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
                        >
                            {isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
                        </button>
                    )}

                    {!isLoading && !hasNextPage && (
                        <p className="text-gray-500">Você chegou ao fim.</p>
                    )}
                </div>
            </div>

            {/* Coluna Direita */}
            <div className="col-span-3 hidden md:block">
                <TrendingSidebar />
            </div>
        </div>
    );
}
