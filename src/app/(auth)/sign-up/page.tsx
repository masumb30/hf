'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      // Check against your uniform API response structure: { success, message, data }
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create account');
      }

      // Automatically route back to sign-in upon successful creation
      router.push('/sign-in');
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const admin = {
    email: 'admin@gmail.com',
    password: '12345678',
  }
  const hr = [
    { email: 'hr1@gmail.com', password: '12345678' },
    { email: 'hr2@gmail.com', password: '12345678' },
    { email: 'hr3@gmail.com', password: '12345678' },
  ]
  const employee = [
    { email: 'employee1@gmail.com', password: '12345678' },
    { email: 'employee2@gmail.com', password: '12345678' },
    { email: 'employee3@gmail.com', password: '12345678' },
    { email: 'employee4@gmail.com', password: '12345678' },
    { email: 'employee5@gmail.com', password: '12345678' },
    { email: 'employee6@gmail.com', password: '12345678' },
    { email: 'employee7@gmail.com', password: '12345678' },
    { email: 'employee8@gmail.com', password: '12345678' },
  ]

  const handleClickAdmin = () => {
    setEmail(admin.email);
    setPassword(admin.password);
  }
  const handleClickHR = () => {
    // randomly choose an HR employee
    const index = Math.floor(Math.random() * hr.length);
    setEmail(hr[index].email);
    setPassword(hr[index].password);
  }
  const handleClickEmployee = () => {
    // randomly choose an employee
    const index = Math.floor(Math.random() * employee.length);
    setEmail(employee[index].email);
    setPassword(employee[index].password);
  }


  return (
    <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-800/80 rounded-xl shadow-2xl transition-all duration-200 ease-in-out">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Create Account</h1>
        <p className="text-sm text-slate-400 mt-1">Register your enterprise workspace profile</p>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3.5 text-sm bg-rose-500/20 text-rose-400 border border-rose-800/60 rounded-lg">
          {errorMessage}
        </div>
      )}
      <div className="flex justify-center text-white">
        <button onClick={handleClickAdmin} className="w-full mt-2 py-2.5 px-4 bg-indigo-500 hover:bg-indigo-600 text-slate-100 font-medium rounded-lg text-sm transition-all duration-200 ease-in-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2">Admin</button>
        <button onClick={handleClickHR} className="w-full mt-2 py-2.5 px-4 bg-indigo-500 hover:bg-indigo-600 text-slate-100 font-medium rounded-lg text-sm transition-all duration-200 ease-in-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2">Hr</button>
        <button onClick={handleClickEmployee} className="w-full mt-2 py-2.5 px-4 bg-indigo-500 hover:bg-indigo-600 text-slate-100 font-medium rounded-lg text-sm transition-all duration-200 ease-in-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2">Employee</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
            Full Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800/80 text-slate-100 rounded-lg text-sm transition-all duration-200 ease-in-out hover:border-slate-300 dark:hover:border-slate-700 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800/80 text-slate-100 rounded-lg text-sm transition-all duration-200 ease-in-out hover:border-slate-300 dark:hover:border-slate-700 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800/80 text-slate-100 rounded-lg text-sm transition-all duration-200 ease-in-out hover:border-slate-300 dark:hover:border-slate-700 outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-2.5 px-4 bg-indigo-500 hover:bg-indigo-600 text-slate-100 font-medium rounded-lg text-sm transition-all duration-200 ease-in-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-slate-100 border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <span>Sign Up</span>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-6">
        Already have an account?{' '}
        <Link href="/sign-in" className="text-indigo-400 hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}