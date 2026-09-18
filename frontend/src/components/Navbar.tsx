import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { ShieldAlert, User, LogOut } from 'lucide-react';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <ShieldAlert className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-slate-900 tracking-tight">CitizenGrievance</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/report" className="text-slate-600 hover:text-primary transition-colors font-medium">Report Issue</Link>
            <Link to="/grievances" className="text-slate-600 hover:text-primary transition-colors font-medium">My Grievances</Link>
            
            {user?.user_metadata?.role === 'officer' && (
              <Link to="/officer" className="text-slate-600 hover:text-primary transition-colors font-medium">Officer View</Link>
            )}

            {user ? (
              <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-slate-200">
                <span className="text-sm text-slate-500 flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-slate-500 hover:text-red-600 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="ml-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
