import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, ArrowLeft, Loader2, CheckCircle2, Mail } from 'lucide-react';
import logoWhite from '@/assets/logo-willflow-white.png';
import logoBlack from '@/assets/logo-willflow-black.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A password deve ter pelo menos 6 caracteres'),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As passwords não coincidem',
  path: ['confirmPassword'],
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'A password deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As passwords não coincidem',
  path: ['confirmPassword'],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const urlMode = searchParams.get('mode');
  
  const [mode, setMode] = useState<AuthMode>(() => {
    if (urlMode === 'reset') return 'reset';
    return 'login';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  
  const { signIn, signUp, user, resetPassword, updatePassword, signInWithGoogle } = useAuth();
  const { theme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if already logged in (but not in reset mode)
  useEffect(() => {
    if (user && mode !== 'reset') {
      navigate('/app');
    }
  }, [user, navigate, mode]);

  // Handle URL mode parameter
  useEffect(() => {
    if (urlMode === 'reset') {
      setMode('reset');
    }
  }, [urlMode]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', confirmPassword: '', fullName: '' },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const resetPasswordForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const handleLogin = async (data: LoginFormData) => {
    setLoading(true);
    const { error } = await signIn(data.email, data.password);
    setLoading(false);

    if (error) {
      toast({
        title: 'Erro ao iniciar sessão',
        description: error.message === 'Invalid login credentials'
          ? 'Email ou password incorretos'
          : error.message,
        variant: 'destructive',
      });
    } else {
      navigate('/app');
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setLoading(true);
    const { error } = await signUp(data.email, data.password, data.fullName);
    setLoading(false);

    if (error) {
      let errorMessage = error.message;
      if (error.message.includes('already registered')) {
        errorMessage = 'Este email já está registado. Tente iniciar sessão.';
      }
      toast({
        title: 'Erro ao criar conta',
        description: errorMessage,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Conta criada com sucesso!',
        description: 'Bem-vindo ao WillFlow.',
      });
      navigate('/onboarding');
    }
  };

  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    const { error } = await resetPassword(data.email);
    setLoading(false);

    if (error) {
      toast({
        title: 'Erro ao enviar email',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setEmailSent(true);
    }
  };

  const handleResetPassword = async (data: ResetPasswordFormData) => {
    setLoading(true);
    const { error } = await updatePassword(data.password);
    setLoading(false);

    if (error) {
      toast({
        title: 'Erro ao atualizar password',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setPasswordUpdated(true);
      toast({
        title: 'Password atualizada!',
        description: 'A sua password foi atualizada com sucesso.',
      });
    }
  };

  const getFormConfig = () => {
    switch (mode) {
      case 'login':
        return { form: loginForm, onSubmit: handleLogin };
      case 'signup':
        return { form: signupForm, onSubmit: handleSignup };
      case 'forgot':
        return { form: forgotPasswordForm, onSubmit: handleForgotPassword };
      case 'reset':
        return { form: resetPasswordForm, onSubmit: handleResetPassword };
    }
  };

  const { form: currentForm, onSubmit } = getFormConfig();

  const getTitle = () => {
    switch (mode) {
      case 'login':
        return 'Bem-vindo de volta';
      case 'signup':
        return 'Criar conta';
      case 'forgot':
        return 'Recuperar password';
      case 'reset':
        return 'Nova password';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'login':
        return 'Introduza os seus dados para aceder à sua conta';
      case 'signup':
        return 'Preencha os dados para começar a usar o WillFlow';
      case 'forgot':
        return 'Introduza o seu email para receber um link de recuperação';
      case 'reset':
        return 'Introduza a sua nova password';
    }
  };

  const getButtonText = () => {
    if (loading) {
      switch (mode) {
        case 'login':
          return 'A entrar...';
        case 'signup':
          return 'A criar conta...';
        case 'forgot':
          return 'A enviar...';
        case 'reset':
          return 'A atualizar...';
      }
    }
    switch (mode) {
      case 'login':
        return 'Entrar';
      case 'signup':
        return 'Criar conta';
      case 'forgot':
        return 'Enviar email';
      case 'reset':
        return 'Atualizar password';
    }
  };

  // Success state for forgot password
  if (mode === 'forgot' && emailSent) {
    return (
      <div className="min-h-screen flex">
        <div className="flex-1 flex flex-col justify-center items-center p-8 relative">
          <Link
            to="/"
            className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md text-center"
          >
            <div className="mb-8">
              <img 
                src={theme === 'dark' ? logoWhite : logoBlack} 
                alt="WillFlow" 
                className="h-10 w-auto mx-auto"
              />
            </div>

            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="h-8 w-8 text-primary" />
            </div>

            <h1 className="text-3xl font-bold mb-4">Verifique o seu email</h1>
            <p className="text-muted-foreground mb-8">
              Enviámos um link de recuperação para o seu email. 
              Clique no link para redefinir a sua password.
            </p>

            <Button
              variant="outline"
              onClick={() => {
                setMode('login');
                setEmailSent(false);
              }}
              className="w-full"
            >
              Voltar ao login
            </Button>
          </motion.div>
        </div>

        {/* Right Side - Visual */}
        <div className="hidden lg:flex flex-1 relative overflow-hidden">
          <div className="absolute inset-0 gradient-primary opacity-90" />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>
      </div>
    );
  }

  // Success state for password reset
  if (mode === 'reset' && passwordUpdated) {
    return (
      <div className="min-h-screen flex">
        <div className="flex-1 flex flex-col justify-center items-center p-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md text-center"
          >
            <div className="mb-8">
              <img 
                src={theme === 'dark' ? logoWhite : logoBlack} 
                alt="WillFlow" 
                className="h-10 w-auto mx-auto"
              />
            </div>

            <div className="w-16 h-16 bg-kanban-cyan/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-kanban-cyan" />
            </div>

            <h1 className="text-3xl font-bold mb-4">Password atualizada!</h1>
            <p className="text-muted-foreground mb-8">
              A sua password foi atualizada com sucesso. 
              Já pode iniciar sessão com a nova password.
            </p>

            <Button
              onClick={() => navigate('/auth')}
              className="w-full gradient-primary"
            >
              Ir para o login
            </Button>
          </motion.div>
        </div>

        {/* Right Side - Visual */}
        <div className="hidden lg:flex flex-1 relative overflow-hidden">
          <div className="absolute inset-0 gradient-primary opacity-90" />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 relative">
        {/* Back to Home or previous mode */}
        <Link
          to={mode === 'forgot' || mode === 'reset' ? '#' : '/'}
          onClick={(e) => {
            if (mode === 'forgot') {
              e.preventDefault();
              setMode('login');
            } else if (mode === 'reset') {
              e.preventDefault();
              navigate('/auth');
            }
          }}
          className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="mb-8">
            <img 
              src={theme === 'dark' ? logoWhite : logoBlack} 
              alt="WillFlow" 
              className="h-10 w-auto"
            />
          </div>

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{getTitle()}</h1>
            <p className="text-muted-foreground">{getSubtitle()}</p>
          </div>

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              onSubmit={currentForm.handleSubmit(onSubmit as any)}
              className="space-y-4"
            >
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input
                    id="fullName"
                    placeholder="João Silva"
                    {...signupForm.register('fullName')}
                    className={cn(
                      signupForm.formState.errors.fullName && 'border-destructive'
                    )}
                  />
                  {signupForm.formState.errors.fullName && (
                    <p className="text-sm text-destructive">
                      {signupForm.formState.errors.fullName.message}
                    </p>
                  )}
                </div>
              )}

              {(mode === 'login' || mode === 'signup' || mode === 'forgot') && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    {...(mode === 'login' 
                      ? loginForm.register('email') 
                      : mode === 'signup' 
                        ? signupForm.register('email')
                        : forgotPasswordForm.register('email')
                    )}
                    className={cn(
                      (mode === 'login' 
                        ? loginForm.formState.errors.email 
                        : mode === 'signup'
                          ? signupForm.formState.errors.email
                          : forgotPasswordForm.formState.errors.email
                      ) && 'border-destructive'
                    )}
                  />
                  {(mode === 'login' 
                    ? loginForm.formState.errors.email 
                    : mode === 'signup'
                      ? signupForm.formState.errors.email
                      : forgotPasswordForm.formState.errors.email
                  ) && (
                    <p className="text-sm text-destructive">
                      {(mode === 'login' 
                        ? loginForm.formState.errors.email 
                        : mode === 'signup'
                          ? signupForm.formState.errors.email
                          : forgotPasswordForm.formState.errors.email
                      )?.message}
                    </p>
                  )}
                </div>
              )}

              {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">
                      {mode === 'reset' ? 'Nova password' : 'Password'}
                    </Label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-sm text-primary hover:underline"
                      >
                        Esqueceu a password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...(mode === 'login' 
                        ? loginForm.register('password') 
                        : mode === 'signup'
                          ? signupForm.register('password')
                          : resetPasswordForm.register('password')
                      )}
                      className={cn(
                        'pr-10',
                        (mode === 'login' 
                          ? loginForm.formState.errors.password 
                          : mode === 'signup'
                            ? signupForm.formState.errors.password
                            : resetPasswordForm.formState.errors.password
                        ) && 'border-destructive'
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {(mode === 'login' 
                    ? loginForm.formState.errors.password 
                    : mode === 'signup'
                      ? signupForm.formState.errors.password
                      : resetPasswordForm.formState.errors.password
                  ) && (
                    <p className="text-sm text-destructive">
                      {(mode === 'login' 
                        ? loginForm.formState.errors.password 
                        : mode === 'signup'
                          ? signupForm.formState.errors.password
                          : resetPasswordForm.formState.errors.password
                      )?.message}
                    </p>
                  )}
                </div>
              )}

              {(mode === 'signup' || mode === 'reset') && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...(mode === 'signup' 
                      ? signupForm.register('confirmPassword')
                      : resetPasswordForm.register('confirmPassword')
                    )}
                    className={cn(
                      (mode === 'signup'
                        ? signupForm.formState.errors.confirmPassword
                        : resetPasswordForm.formState.errors.confirmPassword
                      ) && 'border-destructive'
                    )}
                  />
                  {(mode === 'signup'
                    ? signupForm.formState.errors.confirmPassword
                    : resetPasswordForm.formState.errors.confirmPassword
                  ) && (
                    <p className="text-sm text-destructive">
                      {(mode === 'signup'
                        ? signupForm.formState.errors.confirmPassword
                        : resetPasswordForm.formState.errors.confirmPassword
                      )?.message}
                    </p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="w-full gradient-primary"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {getButtonText()}
              </Button>

              {/* Google Sign In - only for login and signup */}
              {(mode === 'login' || mode === 'signup') && (
                <>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        ou continue com
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-accent-foreground/30 hover:border-accent-foreground/50 hover:bg-accent/10"
                    onClick={async () => {
                      setLoading(true);
                      const { error } = await signInWithGoogle();
                      if (error) {
                        toast({
                          title: 'Erro ao iniciar sessão com Google',
                          description: error.message,
                          variant: 'destructive',
                        });
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continuar com Google
                  </Button>
                </>
              )}
            </motion.form>
          </AnimatePresence>

          {/* Toggle Mode */}
          {(mode === 'login' || mode === 'signup') && (
            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem uma conta?'}
                {' '}
                <button
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="text-primary font-medium hover:underline"
                >
                  {mode === 'login' ? 'Criar conta' : 'Iniciar sessão'}
                </button>
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Right Side - Visual */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-90" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center max-w-md"
          >
            <h2 className="text-4xl font-bold mb-4">
              Gerencie os seus projetos como um profissional
            </h2>
            <p className="text-lg opacity-90 mb-8">
              O WillFlow foi criado para fotógrafos e videomakers que querem organizar 
              o seu trabalho, desde a captação até a entrega final.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="glass-card p-4 text-left">
                <div className="font-semibold mb-1">Kanban Visual</div>
                <div className="opacity-80">Acompanhe cada projeto no fluxo perfeito</div>
              </div>
              <div className="glass-card p-4 text-left">
                <div className="font-semibold mb-1">CRM Integrado</div>
                <div className="opacity-80">Todos os seus clientes num só lugar</div>
              </div>
              <div className="glass-card p-4 text-left">
                <div className="font-semibold mb-1">Finanças</div>
                <div className="opacity-80">Controle receitas e pagamentos</div>
              </div>
              <div className="glass-card p-4 text-left">
                <div className="font-semibold mb-1">Colaboração</div>
                <div className="opacity-80">Trabalhe em equipa sem complicações</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}