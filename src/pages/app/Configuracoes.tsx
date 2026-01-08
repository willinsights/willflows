import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Users, Bell, Shield, Globe, Palette, Calendar, Video, Loader2, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SeedDemoData } from '@/components/demo/SeedDemoData';

export default function Configuracoes() {
  const { user } = useAuth();
  const { currentWorkspace, refreshWorkspaces, isAdmin } = useWorkspace();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  const [saving, setSaving] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [country, setCountry] = useState('PT');
  const [timezone, setTimezone] = useState('Europe/Lisbon');

  // Sync form with current workspace
  useEffect(() => {
    if (currentWorkspace) {
      setWorkspaceName(currentWorkspace.name);
      setCurrency(currentWorkspace.currency);
      setCountry(currentWorkspace.country);
      setTimezone(currentWorkspace.timezone);
    }
  }, [currentWorkspace]);

  const handleSaveGeneral = async () => {
    if (!currentWorkspace) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({
          name: workspaceName,
          currency,
          country: country as 'PT' | 'BR',
          timezone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentWorkspace.id);

      if (error) throw error;

      await refreshWorkspaces();
      
      toast({ 
        title: 'Configurações salvas', 
        description: 'As alterações foram aplicadas com sucesso.' 
      });
    } catch (error: any) {
      toast({ 
        title: 'Erro ao salvar', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const roles = [
    { id: 'admin', name: 'Admin', description: 'Acesso total ao sistema' },
    { id: 'editor', name: 'Editor', description: 'Edita projetos e tarefas' },
    { id: 'captacao', name: 'Captação', description: 'Apenas fase de captação' },
    { id: 'freelancer', name: 'Freelancer', description: 'Vê tarefas atribuídas e ganhos próprios' },
    { id: 'visualizador', name: 'Visualizador', description: 'Apenas visualização' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie as definições do workspace</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-1">
          <TabsTrigger value="geral" className="gap-2 text-xs md:text-sm">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Geral</span>
          </TabsTrigger>
          <TabsTrigger value="perfil" className="gap-2 text-xs md:text-sm">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="equipa" className="gap-2 text-xs md:text-sm">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Equipa</span>
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="gap-2 text-xs md:text-sm">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Integrações</span>
          </TabsTrigger>
          <TabsTrigger value="permissoes" className="gap-2 text-xs md:text-sm">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Permissões</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="dados" className="gap-2 text-xs md:text-sm">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Dados Demo</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Geral Tab */}
        <TabsContent value="geral">
          <div className="grid gap-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Informações do Workspace</CardTitle>
                <CardDescription>Configure as informações básicas do seu workspace</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="workspace-name">Nome do Workspace</Label>
                  <Input
                    id="workspace-name"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="Meu Estúdio"
                    disabled={!isAdmin}
                  />
                  {!isAdmin && (
                    <p className="text-xs text-muted-foreground">Apenas administradores podem alterar o nome</p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>País</Label>
                    <Select value={country} onValueChange={setCountry} disabled={!isAdmin}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o país" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PT">🇵🇹 Portugal</SelectItem>
                        <SelectItem value="BR">🇧🇷 Brasil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Moeda</Label>
                    <Select value={currency} onValueChange={setCurrency} disabled={!isAdmin}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a moeda" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                        <SelectItem value="BRL">Real (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Fuso Horário</Label>
                  <Select value={timezone} onValueChange={setTimezone} disabled={!isAdmin}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fuso horário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Lisbon">Lisboa (GMT+0)</SelectItem>
                      <SelectItem value="Europe/Madrid">Madrid (GMT+1)</SelectItem>
                      <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                      <SelectItem value="America/Fortaleza">Fortaleza (GMT-3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isAdmin && (
                  <Button 
                    className="gradient-primary" 
                    onClick={handleSaveGeneral}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        A salvar...
                      </>
                    ) : (
                      'Salvar Alterações'
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Aparência
                </CardTitle>
                <CardDescription>Personalize a aparência do sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Tema Escuro</p>
                    <p className="text-sm text-muted-foreground">Ativar modo escuro</p>
                  </div>
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Perfil Tab */}
        <TabsContent value="perfil">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Perfil do Utilizador</CardTitle>
              <CardDescription>Gerencie suas informações pessoais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{user?.user_metadata?.full_name || 'Utilizador'}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="grid gap-4 pt-4">
                <div className="grid gap-2">
                  <Label>Nome Completo</Label>
                  <Input defaultValue={user?.user_metadata?.full_name || ''} placeholder="Seu nome" />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ''} disabled />
                </div>
                <div className="grid gap-2">
                  <Label>Telefone</Label>
                  <Input placeholder="+351 912 345 678" />
                </div>
              </div>

              <Button className="gradient-primary">Salvar Perfil</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Equipa Tab */}
        <TabsContent value="equipa">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Gestão de Equipa</CardTitle>
              <CardDescription>Convide membros e gerencie acessos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input placeholder="email@exemplo.com" className="flex-1" />
                <Select defaultValue="editor">
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Função" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button className="gradient-primary">Convidar</Button>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Membros Atuais</h4>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-semibold text-primary">
                        {user?.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{user?.user_metadata?.full_name || user?.email}</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <Badge>Admin</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrações Tab */}
        <TabsContent value="integracoes">
          <div className="grid gap-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Google Calendar
                </CardTitle>
                <CardDescription>Sincronize eventos com o Google Calendar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Status: Não conectado</p>
                  </div>
                  <Button variant="outline">Conectar</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Google Meet
                </CardTitle>
                <CardDescription>Crie reuniões automaticamente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Status: Não conectado</p>
                  </div>
                  <Button variant="outline">Conectar</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Frame.io</CardTitle>
                <CardDescription>Integração com Frame.io para revisão de vídeos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Status: Não conectado</p>
                  </div>
                  <Button variant="outline">Conectar</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Permissões Tab */}
        <TabsContent value="permissoes">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Matriz de Permissões</CardTitle>
              <CardDescription>Configure as permissões por função</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roles.map((role, index) => (
                  <motion.div
                    key={role.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{role.name}</p>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                    <Button variant="outline" size="sm">Editar</Button>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-lg border border-info/20 bg-info/5">
                <p className="text-sm text-info">
                  <strong>Nota:</strong> Freelancers só visualizam tarefas atribuídas e seus próprios ganhos. 
                  Não têm acesso ao preço global do cliente.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dados Demo Tab */}
        {isAdmin && (
          <TabsContent value="dados">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Dados de Demonstração
                </CardTitle>
                <CardDescription>
                  Popular a base de dados com dados de exemplo para testar o sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border border-warning/20 bg-warning/5">
                  <p className="text-sm text-warning">
                    <strong>Atenção:</strong> Esta funcionalidade irá criar clientes, projetos, tarefas, pagamentos e eventos de demonstração. 
                    Os dados existentes serão limpos antes de criar os novos.
                  </p>
                </div>
                
                <SeedDemoData />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
