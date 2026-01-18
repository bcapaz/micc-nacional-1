import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { TweetCard } from "@/components/tweet/tweet-card";
import { TrendingSidebar } from "@/components/trending/trending-sidebar";
import { TweetWithUser, User } from "@shared/schema";
import { Loader2, ArrowLeft, Share2 } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";

// Funções de busca explícitas para evitar erro de JSON
const fetchProfile = async (username: string): Promise<User> => {
  const res = await fetch(`/api/profile/${username}`);
  if (!res.ok) throw new Error("Perfil não encontrado");
  return res.json();
};

const fetchUserTweets = async (username: string): Promise<TweetWithUser[]> => {
  const res = await fetch(`/api/profile/${username}/tweets`);
  if (!res.ok) throw new Error("Erro ao carregar publicações");
  return res.json();
};

function ProfileNotFound() {
  return (
    <div className="flex-1">
      <header className="sticky top-0 z-10 bg-[#3b5998] border-b border-[#29487d] text-white">
        <div className="px-4 py-3 flex items-center">
          <Link href="/" className="mr-6">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <h2 className="text-xl font-bold">Página não encontrada</h2>
        </div>
      </header>
      <div className="p-6 text-center text-muted-foreground bg-white mt-4 border border-[#dfe3ee]">
        Esta linha do tempo não está disponível.
      </div>
    </div>
  );
}

function ProfileError({ message }: { message: string }) {
    return <div className="p-8 text-center text-destructive bg-white border border-red-200 mt-4">Erro ao carregar cronologia: {message}</div>
}

function ProfileLoading() {
    return (
        <div className="flex-1 flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#3b5998]" />
        </div>
    );
}

export default function ProfilePage() {
  const params = useParams();
  const identifier = params.username; 
  const { user: currentUser } = useAuth();

  const { data: profileUser, isLoading: isLoadingProfile, isError: isProfileError, error: profileError } = useQuery<User>({
    queryKey: [`/api/profile/${identifier}`],
    queryFn: () => fetchProfile(identifier!),
    enabled: !!identifier,
  });

  const { data: userTweets, isLoading: isLoadingTweets, isError: isTweetsError, error: tweetsError } = useQuery<TweetWithUser[]>({
    queryKey: [`/api/profile/${identifier}/tweets`],
    queryFn: () => fetchUserTweets(identifier!),
    enabled: !!profileUser, 
  });

  const isOwnProfile = currentUser?.id === profileUser?.id;

  const renderContent = () => {
    if (isLoadingProfile) return <ProfileLoading />;
    if (isProfileError) return <ProfileError message={profileError instanceof Error ? profileError.message : 'Erro de conexão'}/>;
    if (!profileUser) return <ProfileNotFound />;

    return (
      <div className="flex-1">
        <header className="sticky top-0 z-10 bg-white border-b border-[#dfe3ee] mb-4">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center">
                <Link href="/" className="mr-4 md:hidden"><ArrowLeft className="w-5 h-5" /></Link>
                <h2 className="text-xl font-bold text-[#3b5998]">{profileUser.name || profileUser.username}</h2>
            </div>
            {isOwnProfile && <ProfileEditForm />}
          </div>
        </header>
        
        <div className="p-6 bg-white border border-[#dfe3ee] mb-4 shadow-sm">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
            <UserAvatar user={profileUser} size="lg" className="h-32 w-32 border-4 border-white shadow-md" />
            <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-[#1d2129]">{profileUser.name}</h1>
                <p className="text-[#90949c] font-semibold">@{profileUser.username}</p>
                {profileUser.bio && (
                    <div className="mt-4 p-3 bg-[#f5f6f7] rounded border border-[#ebedf0] italic text-[#4b4f56]">
                        "{profileUser.bio}"
                    </div>
                )}
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          {isLoadingTweets ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-[#3b5998]" /></div>
          ) : isTweetsError ? (
            <ProfileError message="Erro ao carregar publicações" />
          ) : userTweets && userTweets.length > 0 ? (
            userTweets.map(item => (
              <div key={`${item.type}-${item.id}`} className="bg-white border border-[#dfe3ee] shadow-sm overflow-hidden">
                {item.type === 'repost' && (
                  <div className="flex items-center text-xs text-[#90949c] px-4 pt-3 font-bold">
                    <Share2 className="w-3 h-3 mr-2" />
                    <span>{item.repostedBy || 'Você'} compartilhou uma publicação</span>
                  </div>
                )}
                <TweetCard tweet={item} />
              </div>
            ))
          ) : (
            <div className="p-8 text-center bg-white border border-[#dfe3ee] text-[#90949c]">
                Nenhuma atividade recente na linha do tempo.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#e9ebee]">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row pt-4">
        <Sidebar />
        <main className="flex-1 md:ml-64 px-4 pb-10">
          <div className="flex flex-col lg:flex-row gap-4">
            {renderContent()}
            <TrendingSidebar />
          </div>
        </main>
      </div>
    </div>
  );
}
