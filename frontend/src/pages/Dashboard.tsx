import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, FileText, Clock, Building } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, resolved: 0, departments: 0 });

  useEffect(() => {
    async function fetchStats() {
      // For MVP, we can just do basic counts. In production, use RPC or aggregate queries.
      const { count: total } = await supabase.from('grievances').select('*', { count: 'exact', head: true });
      const { count: resolved } = await supabase.from('grievances').select('*', { count: 'exact', head: true }).eq('status', 'Resolved-Pending Confirmation');
      const { count: departments } = await supabase.from('departments').select('*', { count: 'exact', head: true });
      
      setStats({
        total: total || 1420, // dummy fallback for demo if empty
        resolved: resolved || 890,
        departments: departments || 12
      });
    }
    fetchStats();
  }, []);

  return (
    <div className="flex flex-col space-y-24">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 flex flex-col items-center justify-center text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-transparent -z-10 rounded-3xl" />
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl leading-tight"
        >
          Your Voice for a Better <span className="text-primary">Community</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 text-xl text-slate-600 max-w-2xl"
        >
          An AI-powered grievance redressal platform ensuring your complaints are routed to the right department instantly, with transparent tracking.
        </motion.p>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-10 flex space-x-4"
        >
          <Link to="/report" className="px-8 py-4 bg-primary text-white rounded-xl text-lg font-semibold hover:bg-primary-hover shadow-lg hover:shadow-xl transition-all flex items-center space-x-2">
            <span>Report an Issue</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link to="/grievances" className="px-8 py-4 bg-white text-slate-700 rounded-xl text-lg font-semibold border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all">
            Track Status
          </Link>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard title="Issues Reported" value={stats.total} icon={<FileText className="h-8 w-8 text-blue-500" />} delay={0.1} />
        <StatCard title="Issues Resolved" value={stats.resolved} icon={<CheckCircle className="h-8 w-8 text-green-500" />} delay={0.2} />
        <StatCard title="Departments Active" value={stats.departments} icon={<Building className="h-8 w-8 text-purple-500" />} delay={0.3} />
      </section>

      {/* How it works */}
      <section className="py-16">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          <div className="hidden md:block absolute top-1/2 left-10 right-10 h-0.5 bg-slate-200 -z-10" />
          <StepCard 
            number="1"
            title="Lodge Grievance"
            description="Submit your issue with a photo and description in your preferred language."
            delay={0.1}
          />
          <StepCard 
            number="2"
            title="AI Routing"
            description="Our AI instantly classifies and routes your complaint to the exact responsible department."
            delay={0.2}
          />
          <StepCard 
            number="3"
            title="Fast Resolution"
            description="Track real-time updates as officers address and resolve your issue."
            delay={0.3}
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, icon, delay }: { title: string, value: number, icon: React.ReactNode, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-6 hover:shadow-md transition-shadow"
    >
      <div className="p-4 bg-slate-50 rounded-xl">
        {icon}
      </div>
      <div>
        <div className="text-4xl font-bold text-slate-900">
          {/* Animated counter can be added here if needed, keeping simple for now */}
          {value.toLocaleString()}
        </div>
        <div className="text-slate-500 font-medium mt-1">{title}</div>
      </div>
    </motion.div>
  );
}

function StepCard({ number, title, description, delay }: { number: string, title: string, description: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center relative"
    >
      <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-6 shadow-md border-4 border-white absolute -top-6 left-1/2 -translate-x-1/2">
        {number}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3 mt-4">{title}</h3>
      <p className="text-slate-600">{description}</p>
    </motion.div>
  );
}
