import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, BellOff } from "lucide-react";
import { useState } from "react";
import { User as UserType } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TrendingTopic {
  id: number;
  name: string;
  category: string;
  count: number;
}

interface SuggestedUser {
  user: UserType;
}

export function TrendingSidebar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch trending topics
  const { data: trendingTopics } = useQuery<TrendingTopic[]>({
    queryKey: ["/api/trending"],
  });

  // Fetch suggested users
  const { data: suggestedUsers } = useQuery<SuggestedUser[]>({
    queryKey: ["/api/users/suggested"],
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Mostrar diálogo de busca
    setShowSearch(true);
  };

  return (
    <div className="w-full md:w-80 bg-sidebar-background border-l border-border p-4 hidden md:block">
      <div className="sticky top-4">
        {/* Search */}
        <div className="mb-6">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="w-4 h-4 text-muted-foreground" />
              </span>
              <Input
                type="text" 
                className="w-full pl-10 pr-4 py-2 border border-border rounded-full bg-sidebar-accent text-foreground focus:ring-2 focus:ring-accent focus:outline-none" 
                placeholder="Pesquisar"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
        </div>
        
        {/* Trending Topics */}
        <div className="bg-sidebar-accent rounded-lg p-4 mb-6 border border-border">
          <h3 className="font-bold text-lg mb-4 text-foreground">Assuntos em alta</h3>
          <div className="space-y-4">
            {trendingTopics ? (
              trendingTopics.map(topic => (
                <div key={topic.id}>
                  <div className="text-xs text-muted-foreground mb-1">{topic.category} · Assunto do momento</div>
                  <div className="font-medium text-foreground">#{topic.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{topic.count} posts</div>
                </div>
              ))
            ) : (
              <>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Política · Assunto do momento</div>
                  <div className="font-medium text-foreground">#GreveDosCaminhoneiros</div>
                  <div className="text-xs text-muted-foreground mt-1">8.245 posts</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Economia · Assunto do momento</div>
                  <div className="font-medium text-foreground">#PreçoDoDiesel</div>
                  <div className="text-xs text-muted-foreground mt-1">5.189 posts</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Transporte · Assunto do momento</div>
                  <div className="font-medium text-foreground">#DesabastecimentoNoBrasil</div>
                  <div className="text-xs text-muted-foreground mt-1">3.721 posts</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Política · Assunto do momento</div>
                  <div className="font-medium text-foreground">#NegociaçãoGoverno</div>
                  <div className="text-xs text-muted-foreground mt-1">2.834 posts</div>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Who to follow */}
        <div className="bg-sidebar-accent rounded-lg p-4 border border-border">
          <h3 className="font-bold text-lg mb-4 text-foreground">Delegados Importantes</h3>
          <div className="space-y-4">
            {suggestedUsers ? (
              suggestedUsers.map(({ user }) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full ${user.avatarColor} flex items-center justify-center`}>
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground">{user.username}</div>
                      <div className="text-xs text-muted-foreground">Delegação</div>
                    </div>
                  </div>
                  <Button size="sm" className="px-3 py-1 bg-[#ffdf00] text-[#002776] font-medium text-sm rounded-full hover:bg-[#ffdf00]/90">
                    Seguir
                  </Button>
                </div>
              ))
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-[#009c3b] flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground">Michel Temer</div>
                      <div className="text-xs text-muted-foreground">Delegação</div>
                    </div>
                  </div>
                  <Button size="sm" className="px-3 py-1 bg-[#ffdf00] text-[#002776] font-medium text-sm rounded-full hover:bg-[#ffdf00]/90">
                    Seguir
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-[#ffdf00] flex items-center justify-center">
                      <User className="w-4 h-4 text-[#002776]" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground">Luiz Trevisan</div>
                      <div className="text-xs text-muted-foreground">Delegação</div>
                    </div>
                  </div>
                  <Button size="sm" className="px-3 py-1 bg-[#ffdf00] text-[#002776] font-medium text-sm rounded-full hover:bg-[#ffdf00]/90">
                    Seguir
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-[#002776] flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground">Pedro Parente</div>
                      <div className="text-xs text-muted-foreground">Delegação</div>
                    </div>
                  </div>
                  <Button size="sm" className="px-3 py-1 bg-[#ffdf00] text-[#002776] font-medium text-sm rounded-full hover:bg-[#ffdf00]/90">
                    Seguir
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Diálogo de Busca */}
      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Resultados da Busca</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum resultado encontrado para "{searchQuery}"</p>
            <p className="text-sm mt-2">Tente com termos diferentes ou aguarde novos conteúdos.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Notificações */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Notificações</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            <BellOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Não há notificações no momento</p>
            <p className="text-sm mt-2">Notificaremos você quando houver novas interações.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
