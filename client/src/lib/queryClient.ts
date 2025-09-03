import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Função auxiliar para determinar o prefixo correto do URL (/auth ou /api)
function getUrl(path: string): string {
  const authRoutes = ['/login', '/register', '/logout', '/user'];
  
  // Verifica se o caminho corresponde a uma das rotas de autenticação
  if (authRoutes.some(r => path.startsWith(r))) {
    return `/auth${path}`;
  }
  
  // Para todas as outras rotas, usa o prefixo /api
  return `/api${path}`;
}


async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = getUrl(url); // Constrói o URL completo
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // A função throwIfResNotOk não precisa de ser chamada aqui se já é chamada no onSuccess/onError
  // mas vamos mantê-la para consistência em chamadas diretas.
  // await throwIfResNotOk(res); 
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const fullUrl = getUrl(queryKey[0] as string); // Constrói o URL completo
    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
