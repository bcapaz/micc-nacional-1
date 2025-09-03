import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@shared/schema";

interface UserAvatarProps {
  // Tornamos o 'user' opcional para evitar erros caso ele venha nulo
  user: Partial<User> | null; 
  size?: "sm" | "md" | "lg";
}

export function UserAvatar({ user, size = "md" }: UserAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-20 w-20" // Aumentado para o perfil
  };

  const getInitials = (name: string) => {
    const nameParts = name.split(" ");
    if (nameParts.length > 1) {
      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return nameParts[0].substring(0, 2).toUpperCase();
  };

  // Se não houver dados do utilizador, mostra um avatar genérico
  if (!user) {
    return (
        <Avatar className={sizeClasses[size]}>
            <AvatarFallback>?</AvatarFallback>
        </Avatar>
    );
  }

  return (
    <Avatar className={sizeClasses[size]}>
      {/* [CORRIGIDO] Adicionamos o AvatarImage. 
        Ele tentará carregar a imagem a partir de user.profileImage.
      */}
      <AvatarImage src={user.profileImage || ''} alt={user.username || 'Avatar do usuário'} />
      
      {/* O AvatarFallback agora é o "plano B". 
        Ele só será exibido se o AvatarImage acima falhar.
      */}
      <AvatarFallback style={{ backgroundColor: user.avatarColor }}>
        {getInitials(user.name || '??')}
      </AvatarFallback>
    </Avatar>
  );
}