import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(3, "Nome de delegação deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Nome de delegação deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  name: z.string().min(2, "Nome completo deve ter pelo menos 2 caracteres"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("login");

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
    },
  });

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate({
      ...data,
      avatarColor: getRandomColor(),
    });
  };

  const getRandomColor = () => {
    const colors = ["#009c3b", "#ffdf00", "#002776", "#6B8E23", "#4682B4"];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
 return (
    // CORRIGIDO: Cor de fundo alterada para o azul claro do Facebook
    <div className="min-h-screen bg-[#3b5998] flex">
      {/* Login/Registration form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white">Facebook dos Delegados</h1>
            <p className="text-gray-200 mt-2">Site Nacional Micc</p>
          </div>

          <div className="bg-[#2a4887] rounded-lg shadow-md p-8 text-white">
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Registro</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome de Delegação</FormLabel>
                          <FormControl>
                            <Input placeholder="Seu nome de delegação" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Sua senha" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-[#009c3b] hover:bg-opacity-90"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Entrar
                    </Button>
                  </form>
                </Form>
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-300">
                    Não tem uma conta?{" "}
                    <button 
                      className="text-[#ffdf00] hover:underline"
                      onClick={() => setActiveTab("register")}
                    >
                      Registre-se
                    </button>
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome de Delegação</FormLabel>
                          <FormControl>
                            <Input placeholder="Escolha um nome de delegação" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Escolha uma senha" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input placeholder="Seu nome completo" {...field} />
                          </FormControl>
                          <FormMessage className="text-xs">
                            Este nome não será exibido publicamente, apenas seu Nome de Delegação
                          </FormMessage>
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full bg-[#009c3b] hover:bg-opacity-90"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Registrar
                    </Button>
                  </form>
                </Form>
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-300">
                    Já tem uma conta?{" "}
                    <button 
                      className="text-[#ffdf00] hover:underline"
                      onClick={() => setActiveTab("login")}
                    >
                      Faça login
                    </button>
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <p className="mt-8 text-center text-sm text-gray-300">
            <a href="https://sites.google.com/view/sitenacionalmirim/in%C3%ADcio" className="text-[#ffdf00] hover:underline">
              Voltar ao Site Nacional Micc
            </a>
          </p>
        </div>
      </div>

      {/* Hero section */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#009c3b] text-white p-8 items-center justify-center">
        <div className="max-w-md">
          <h2 className="text-4xl font-bold mb-4">Bem-vindo ao Facebook dos Delegados</h2>
          <p className="text-xl mb-8">
            Participe das discussões sobre a eleição de 2014 entre Dilma e Aécio.
          </p>
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="rounded-full bg-[#ffdf00] p-2 mr-4 text-[#002776]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p>Poste como seu personagem designado</p>
            </div>
            <div className="flex items-center">
              <div className="rounded-full bg-[#ffdf00] p-2 mr-4 text-[#002776]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p>Interaja com outros delegados</p>
            </div>
            <div className="flex items-center">
              <div className="rounded-full bg-[#ffdf00] p-2 mr-4 text-[#002776]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p>Influencie o resultado do modelo com suas publicações</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
