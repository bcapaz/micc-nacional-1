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
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", password: "", name: "" },
  });

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const onLoginSubmit = (data: LoginFormValues) => loginMutation.mutate(data);

  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate({ ...data, avatarColor: getRandomColor() });
  };

  const getRandomColor = () => {
    const colors = ["#009c3b", "#ffdf00", "#002776", "#6B8E23", "#4682B4"];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <div className="min-h-screen bg-[#3b5998] flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white">Facebook dos Delegados</h1>
            <p className="text-gray-200 mt-2 font-semibold">SITE NACIONAL MICC</p>
          </div>

          <div className="bg-[#f0f2f5] rounded-lg shadow-xl p-8 border border-white/20">
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 mb-6 bg-gray-200">
                <TabsTrigger value="login" className="data-[state=active]:bg-[#3b5998] data-[state=active]:text-white">Login</TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-[#009c3b] data-[state=active]:text-white">Registro</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#1c1e21] font-bold">Nome de Delegação</FormLabel>
                          <FormControl>
                            <Input placeholder="Seu nome de delegação" className="bg-white text-black" {...field} />
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
                          <FormLabel className="text-[#1c1e21] font-bold">Senha</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Sua senha" className="bg-white text-black" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full bg-[#3b5998] hover:bg-[#2d4373] text-white font-bold h-12 text-lg"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Entrar
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                {/* Mesma lógica aplicada ao formulário de registro */}
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#1c1e21] font-bold">Nome de Delegação</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: @DelegadoBR" className="bg-white text-black" {...field} />
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
                          <FormLabel className="text-[#1c1e21] font-bold">Senha</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Mínimo 6 caracteres" className="bg-white text-black" {...field} />
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
                          <FormLabel className="text-[#1c1e21] font-bold">Nome Completo</FormLabel>
                          <FormControl>
                            <Input placeholder="Seu nome real" className="bg-white text-black" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full bg-[#009c3b] hover:bg-[#007b2e] text-white font-bold h-12 text-lg"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Criar Conta
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-[#009c3b] text-white p-8 items-center justify-center">
        <div className="max-w-md">
          <h2 className="text-5xl font-extrabold mb-6 leading-tight">Brasil Unido em 2014</h2>
          <p className="text-2xl mb-8 opacity-90">
            Acompanhe a disputa eleitoral entre Dilma e Aécio como um verdadeiro diplomata.
          </p>
          <ul className="space-y-6">
            <li className="flex items-center text-lg">
              <div className="bg-[#ffdf00] rounded-full p-2 mr-4"><Loader2 className="w-5 h-5 text-[#002776]"/></div>
              Poste como sua delegação designada
            </li>
            <li className="flex items-center text-lg">
              <div className="bg-[#ffdf00] rounded-full p-2 mr-4"><Loader2 className="w-5 h-5 text-[#002776]"/></div>
              Debata o futuro do país no modelo
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
