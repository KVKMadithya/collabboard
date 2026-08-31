import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';

export default function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // 👇 Updated state to include the new registration fields
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'Software Engineering', // Default dropdown value
    university: ''
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- UI/UX: Rotating Text State ---
  const texts = [
    "Supercharge your team's productivity with real-time task management.",
    "Streamline workflows and conquer your hackathon milestones.",
    "The ultimate workspace for Odyssey's next big breakthrough.",
    "Turn your late-night coding sessions into shipped products."
  ];
  const [textIndex, setTextIndex] = useState(0);
  const [fade, setFade] = useState(true);

  // --- UI/UX: Liquid Mouse Tracking State ---
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false); 
      setTimeout(() => {
        setTextIndex((prev) => (prev + 1) % texts.length);
        setFade(true); 
      }, 500); 
    }, 4000); 
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSuccessfulAuth = async (token) => {
    localStorage.setItem('collab_token', token);
    
    if (onLoginSuccess) {
      await onLoginSuccess();
      navigate('/');
    } else {
      window.location.href = '/'; 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const response = await fetch(`http://127.0.0.1:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error('Server did not return JSON. Check your backend terminal for crashes.');
      }

      if (response.ok) {
        await handleSuccessfulAuth(data.token);
      } else {
        setError(data.message || 'Authentication failed. Please check your credentials.');
      }
    } catch (err) {
      console.error("Auth Error:", err);
      setError(err.message === 'Failed to fetch' 
        ? 'Cannot connect to the server at 127.0.0.1:5000. Is the backend running?' 
        : err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      setError('');
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: tokenResponse.access_token }),
        });
        
        let data;
        try {
          data = await res.json();
        } catch (parseError) {
          throw new Error('Server did not return JSON. Check your backend terminal for crashes.');
        }
        
        if (res.ok) {
          await handleSuccessfulAuth(data.token);
        } else {
          setError(data.message || 'Google authentication failed on server');
        }
      } catch (err) {
        console.error("Google Auth Error:", err);
        setError(err.message === 'Failed to fetch' 
          ? 'Cannot connect to the server at 127.0.0.1:5000. Is the backend running?' 
          : err.message);
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => setError('Google Sign-In popup failed or was closed.'),
  });

  return (
    <div 
      className="flex h-screen w-full bg-[#05060A] text-white font-sans relative overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      
      {/* --- Global Background Effects --- */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#FF2D88]/20 rounded-full blur-[140px] pointer-events-none mix-blend-screen z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#FF7A00]/15 rounded-full blur-[150px] pointer-events-none mix-blend-screen z-0"></div>
      
      <div 
        className="absolute w-[400px] h-[400px] bg-[#3B28CC]/40 rounded-full blur-[120px] pointer-events-none mix-blend-screen transition-all duration-700 ease-out z-0"
        style={{ 
          left: `calc(${mousePos.x}% - 200px)`, 
          top: `calc(${mousePos.y}% - 200px)` 
        }}
      ></div>

      {/* --- Left Side: Transparent & Popping Typography --- */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-center items-center z-10 pointer-events-none">
        <div className="text-center space-y-6 p-12 mx-12">
          
          <h1 className="text-6xl font-extrabold tracking-tight drop-shadow-[0_10px_25px_rgba(255,45,136,0.3)]">
            <span className="text-[#FF2D88]">📌</span> CollabBoard
          </h1>
          
          <div className="h-20 flex items-center justify-center mt-6">
            <p className={`text-gray-100 text-xl font-medium max-w-md mx-auto drop-shadow-lg transition-opacity duration-500 ease-in-out ${fade ? 'opacity-100' : 'opacity-0'}`}>
              {texts[textIndex]}
            </p>
          </div>
          
        </div>
      </div>

      {/* --- Right Side: Glassmorphism Auth Form --- */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 sm:p-12 relative overflow-y-auto custom-scrollbar z-10 bg-white/[0.02] backdrop-blur-2xl border-l border-white/5 shadow-[-20px_0_40px_-10px_rgba(0,0,0,0.5)]">
        <div className="w-full max-w-md space-y-8 z-20">
          
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {isLogin ? 'Sign in to your account' : 'Create an account'}
            </h2>
            <p className="text-gray-400 mt-2 text-sm">
              {isLogin ? 'Welcome back! Please enter your details.' : 'Enter your personal data to create your account.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg backdrop-blur-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {!isLogin && (
              <>
                <div className="flex gap-4">
                  <div className="space-y-1.5 flex-1">
                    <label className="text-sm font-medium text-gray-300">First Name</label>
                    <input 
                      type="text" 
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="e.g. John" 
                      required={!isLogin} 
                      className="w-full bg-[#121629]/80 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#FF2D88] transition-colors" 
                    />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <label className="text-sm font-medium text-gray-300">Last Name</label>
                    <input 
                      type="text" 
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="e.g. Doe" 
                      required={!isLogin} 
                      className="w-full bg-[#121629]/80 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#FF2D88] transition-colors" 
                    />
                  </div>
                </div>

                {/* 👇 NEW: Specialization and University Row */}
                <div className="flex gap-4">
                  <div className="space-y-1.5 flex-1">
                    <label className="text-sm font-medium text-gray-300">Specialization</label>
                    <select 
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="w-full bg-[#121629]/80 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#FF2D88] transition-colors text-gray-300"
                    >
                      <option value="Computer Science">Computer Science</option>
                      <option value="Software Engineering">Software Engineering</option>
                      <option value="Data Science">Data Science</option>
                      <option value="AI Engineering">AI Engineering</option>
                      <option value="UI/UX Design">UI/UX Design</option>
                      <option value="Product Management">Product Management</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <label className="text-sm font-medium text-gray-300">University / Org</label>
                    <input 
                      type="text" 
                      name="university"
                      value={formData.university}
                      onChange={handleChange}
                      placeholder="e.g. NSBM Green University" 
                      required={!isLogin} 
                      className="w-full bg-[#121629]/80 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#FF2D88] transition-colors" 
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Your email</label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@company.com" 
                required 
                className="w-full bg-[#121629]/80 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#FF2D88] transition-colors" 
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-300">Password</label>
                {isLogin && <a href="#" className="text-xs text-[#FF2D88] hover:underline">Forget password?</a>}
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••" 
                  required 
                  className="w-full bg-[#121629]/80 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#FF2D88] transition-colors pr-10" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {!isLogin && <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters.</p>}
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#FF2D88] to-[#FF7A00] text-white rounded-lg px-4 py-3 font-medium text-sm hover:opacity-90 transition-opacity mt-4 disabled:opacity-50 shadow-lg shadow-[#FF2D88]/25"
            >
              {isLoading ? 'Processing...' : (isLogin ? 'Sign in' : 'Sign Up')}
            </button>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/10"></div>
              <span className="text-xs text-gray-500 uppercase font-medium">Or continue with</span>
              <div className="flex-1 h-px bg-white/10"></div>
            </div>

            <button 
              type="button" 
              onClick={handleGoogleLogin} 
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-[#121629]/80 border border-white/10 hover:bg-white/5 text-white rounded-lg px-4 py-3 font-medium text-sm transition-colors disabled:opacity-50 backdrop-blur-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
              </svg>
              Google
            </button>
          </form>

          <p className="text-center text-sm text-gray-400">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }} 
              className="text-[#FF2D88] font-medium hover:underline transition-colors"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}