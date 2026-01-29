import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@shared/schema";
import { cn } from "@/lib/utils"; // Importante para permitir classes extras se necessário

interface UserAvatarProps {
  // Tornamos o 'user' opcional para evitar erros caso ele venha nulo
  user: Partial<User> | null; 
  // Adicionei 'xs' e 'xl' para cobrir comentários pequenos e a capa do perfil
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function UserAvatar({ user, size = "md", className }: UserAvatarProps) {
  const sizeClasses = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-20 w-20 text-lg",
    xl: "h-32 w-32 text-4xl" // Tamanho para a página de perfil
  };

  const getInitials = (name: string) => {
    const nameParts = name.trim().split(" ");
    if (nameParts.length > 1) {
      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return nameParts[0].substring(0, 2).toUpperCase();
  };

  // Se não houver dados do utilizador, mostra um avatar genérico
  if (!user) {
    return (
        <Avatar className={cn(sizeClasses[size], className)}>
            <AvatarFallback>?</AvatarFallback>
        </Avatar>
    );
  }

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {/* [OTIMIZAÇÃO] Adicionamos loading="lazy" e decoding="async"
         Isso faz com que o navegador só baixe a imagem quando ela aparecer na tela,
         economizando muita internet e memória.
      */}
      <AvatarImage 
        src={user.profileImage || ''} 
        alt={user.username || 'Avatar do usuário'}
        className="object-cover"
        loading="lazy"   // <--- Otimização aqui
        decoding="async" // <--- e aqui
      />
      
      {/* O AvatarFallback agora é o "plano B". 
        Ele só será exibido se o AvatarImage acima falhar.
      */}
      <AvatarFallback style={{ backgroundColor: user.avatarColor || undefined }}>
        {getInitials(user.name || user.username || '??')}
      </AvatarFallback>
    </Avatar>
  );
}
