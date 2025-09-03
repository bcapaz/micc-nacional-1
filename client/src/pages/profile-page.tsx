import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { TweetCard } from "@/components/tweet/tweet-card";
import { TrendingSidebar } from "@/components/trending/trending-sidebar";
import { TweetWithUser, User } from "@shared/schema";
import { Loader2, ArrowLeft, Repeat2 } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";

// Componente para o estado de "Não Encontrado"
function ProfileNotFound() {
  return (
    <div className="flex-1">
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="px-4 py-3 flex items-center">
          <Link href="/" className="mr-6">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-foreground">Perfil não encontrado</h2>
          </div>
        </div>
      </header>
      <div className="p-6 text-center text-muted-foreground">
        Este usuário não existe.
      </div>
    </div>
  );
}

// Componente para o estado de "Erro"
function ProfileError({ message }: { message: string }) {
    return <div className="p-8 text-center text-destructive">Ocorreu um erro ao carregar o feed: {message}</div>
}

// Componente para o estado de "Carregando"
function ProfileLoading() {
    return (
        <div className="flex-1">
            <header className="sticky top-0 z-10 bg-card border-b border-border">
                <div className="px-4 py-3 flex items-center">
                    <Link href="/" className="mr-6"><ArrowLeft className="w-5 h-5 text-foreground" /></Link>
                    <div className="flex flex-col animate-pulse">
                        <div className="h-6 w-40 bg-muted rounded"></div>
                        <div className="h-4 w-24 bg-muted rounded mt-1"></div>
                    </div>
                </div>
            </header>
            <div className="p-6 bg-card border-b border-border">
                <div className="flex items-center space-x-4 animate-pulse">
                    <div className="h-20 w-20 rounded-full bg-muted"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-6 w-48 bg-muted rounded"></div>
                        <div className="h-4 w-32 bg-muted rounded"></div>
                        <div className="h-4 w-64 bg-muted rounded"></div>
                    </div>
                </div>
            </div>
            <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        </div>
    );
}

export default function ProfilePage() {
  const params = useParams();
  const identifier = params.username;
  
  const { user: currentUser } = useAuth();

  const { data: profileUser, isLoading: isLoadingProfile, isError: isProfileError, error: profileError } = useQuery<User>({
    queryKey: [`/api/profile/${identifier}`],
    enabled: !!identifier,
  });

  const { data: userTweets, isLoading: isLoadingTweets, isError: isTweetsError, error: tweetsError } = useQuery<TweetWithUser[]>({
    queryKey: [`/api/profile/${identifier}/tweets`],
    enabled: !!profileUser, // Só busca os tweets depois que o perfil for encontrado
  });

  const isOwnProfile = currentUser?.id === profileUser?.id;

  const renderContent = () => {
    if (isLoadingProfile) {
      return <ProfileLoading />;
    }
    
    if (isProfileError) {
      return <ProfileError message={profileError instanceof Error ? profileError.message : 'Erro desconhecido'}/>;
    }

    if (!profileUser) {
      return <ProfileNotFound />;
    }

    // Se tudo estiver certo, renderiza o perfil completo
    return (
      <div className="flex-1">
        <header className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="px-4 py-3 flex items-center">
            <Link href="/" className="mr-6">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </Link>
            <div>
              <h2 className="text-xl font-bold text-foreground">{profileUser.username}</h2>
              <p className="text-sm text-muted-foreground">Delegação</p>
            </div>
          </div>
        </header>
        
        <div className="p-6 bg-card border-b border-border">
          <div className="flex items-center space-x-4">
            <UserAvatar user={profileUser} size="lg" />
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{profileUser.username}</h1>
                  {profileUser.name && !isOwnProfile && (
                    <p className="text-muted-foreground text-sm">
                      Delegação de {profileUser.name}
                    </p>
                  )}
                </div>
                {isOwnProfile && <ProfileEditForm />}
              </div>
              {profileUser.bio && (
                <p className="text-foreground mt-2">{profileUser.bio}</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-border">
          {isLoadingTweets ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
          ) : isTweetsError ? (
            <div className="p-8 text-center text-destructive">Ocorreu um erro ao carregar o feed: {tweetsError instanceof Error ? tweetsError.message : 'Erro desconhecido'}</div>
          ) : userTweets && userTweets.length > 0 ? (
            userTweets.map(item => (
              <div key={`${item.type}-${item.id}`}>
                {item.type === 'repost' && (
                  <div className="flex items-center text-sm text-muted-foreground pl-12 pt-3 -mb-3">
                    <Repeat2 className="w-4 h-4 mr-2" />
                    <span>{item.repostedBy || 'Você'} repostou</span>
                  </div>
                )}
                <TweetCard tweet={item} />
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground">Nenhuma publicação encontrada.</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <div className="max-w-4xl mx-auto md:flex">
          {renderContent()}
          <TrendingSidebar />
        </div>
      </div>
    </div>
  );
}