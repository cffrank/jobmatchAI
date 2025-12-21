import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'sonner'
import { Briefcase, Mail, Lock, User, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react'
import { getAuthErrorMessage } from '../lib/authErrors'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { validatePassword, checkPasswordRequirements, type PasswordStrength, type PasswordRequirements } from '../lib/passwordValidation'
import { PasswordStrengthIndicator } from '../components/ui/password-strength-indicator'

export default function SignupPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null)
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirements | null>(null)
  const [showPasswordStrength, setShowPasswordStrength] = useState(false)
  const { signUp, signInWithGoogle, signInWithLinkedIn } = useAuth()
  const navigate = useNavigate()

  // Validate password on change
  useEffect(() => {
    if (password.length > 0) {
      setShowPasswordStrength(true)
      const userInputs = [displayName, email].filter(Boolean)
      const strength = validatePassword(password, userInputs)
      const requirements = checkPasswordRequirements(password)
      setPasswordStrength(strength)
      setPasswordRequirements(requirements)
    } else {
      setShowPasswordStrength(false)
      setPasswordStrength(null)
      setPasswordRequirements(null)
    }
  }, [password, displayName, email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate password strength before submitting
    if (!passwordStrength || !passwordStrength.isValid) {
      toast.error('Password does not meet security requirements', {
        description: 'Please ensure your password meets all requirements listed below'
      })
      return
    }

    setLoading(true)

    try {
      await signUp(email, password, displayName)
      toast.success('Account created! Please check your email to verify your account.', {
        description: 'You must verify your email before accessing all features.'
      })
      navigate('/')
    } catch (error: unknown) {
      console.error('Signup error:', error)
      toast.error(getAuthErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
      toast.success('Welcome!')
      navigate('/')
    } catch (error: unknown) {
      console.error('Google sign in error:', error)
      toast.error(getAuthErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleLinkedInSignIn = async () => {
    setLoading(true)
    try {
      await signInWithLinkedIn()
      toast.success('Welcome!')
      navigate('/')
    } catch (error: unknown) {
      console.error('LinkedIn sign in error:', error)
      toast.error(getAuthErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-secondary via-secondary/95 to-secondary/90 dark:from-secondary/90 dark:via-secondary/80 dark:to-secondary/70 p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 shadow-lg">
              <Briefcase className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">JobMatch AI</h1>
          </div>

          <div className="max-w-md">
            <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
              Start Your Success Story Today
            </h2>
            <p className="text-lg text-white/90 leading-relaxed mb-8">
              Join thousands of professionals who've transformed their job search with AI-powered matching and automation.
            </p>

            <div className="space-y-4">
              {[
                'Smart job matching based on your profile',
                'Automated application generation',
                'Real-time application tracking',
                'AI-powered resume optimization',
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-white/90 flex-shrink-0 mt-0.5" />
                  <span className="text-white/90">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <p className="text-white/90 italic mb-3">
              "JobMatch AI helped me land my dream job in just 2 weeks. The AI matching is incredible!"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20" />
              <div>
                <div className="text-white font-medium">Sarah Johnson</div>
                <div className="text-white/70 text-sm">Software Engineer at Tech Corp</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="bg-secondary/10 dark:bg-secondary/20 rounded-xl p-3">
              <Briefcase className="h-7 w-7 text-secondary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">JobMatch AI</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Create your account</h2>
            <p className="text-muted-foreground">
              Start your journey to finding the perfect job
            </p>
          </div>

          {/* Social Sign Up */}
          <div className="space-y-3 mb-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full h-11 relative group hover:border-secondary/50 transition-all duration-200"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 absolute left-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="font-medium">Sign up with Google</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleLinkedInSignIn}
              disabled={loading}
              className="w-full h-11 relative group hover:border-secondary/50 transition-all duration-200"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 absolute left-4" viewBox="0 0 24 24" fill="#0A66C2">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span className="font-medium">Sign up with LinkedIn</span>
                </>
              )}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground font-medium">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-sm font-medium">
                Full name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="displayName"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Sarah Johnson"
                  className="pl-10 h-11"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10 h-11"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 h-11"
                  minLength={12}
                  disabled={loading}
                />
              </div>

              {/* Password Strength Indicator */}
              {showPasswordStrength && passwordStrength && passwordRequirements && (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <PasswordStrengthIndicator
                    strength={passwordStrength}
                    requirements={passwordRequirements}
                    showRequirements={true}
                  />
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 font-medium group"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          {/* Terms */}
          <p className="mt-4 text-xs text-center text-muted-foreground">
            By creating an account, you agree to our{' '}
            <a href="#" className="text-primary hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-primary hover:underline">Privacy Policy</a>
          </p>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
