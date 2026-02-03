'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { api } from '../../lib/api';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password too short')
});

const Login = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('access_token')) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      loginSchema.parse({ email, password });
      setLoading(true);
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('access_token', response.data.access_token);
      router.push('/dashboard');
    } catch (err) {
      setError(err.errors?.[0]?.message || err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-800">
      <div className="max-w-md w-full mx-auto p-8 bg-white dark:bg-gray-900 rounded-lg shadow-md text-black dark:text-white">
        <h2 className="text-xl font-bold mb-4">Login</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="block w-full p-2 mt-2 border-gray-400 focus:border-blue-600 dark:focus:border-blue-700 focus:ring-blue-500 dark:focus:ring-blue-700"
          />
          <div className="relative mt-2">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="block w-full p-2 pr-10 border-gray-400 focus:border-blue-600 dark:focus:border-blue-700 focus:ring-blue-500 dark:focus:ring-blue-700"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
              {showPassword ? <EyeOff size={20} /> : <Eye size= {20} />}
            </button>
          </div>
          {error && <p className="text-red-500 mt-2">{error}</p>}
          <button type="submit" disabled={loading} className="mt-4 w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">
            {loading ? 'Loading...' : 'Login'}
          </button>
        </form>
        <p className="mt-4">Don't have an account? <a href="/register" className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">Register</a></p>
      </div>
    </div>
  );
};

export default Login;
