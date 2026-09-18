import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Clock, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function OfficerDashboard() {
  const [grievances, setGrievances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQueue();
    // Realtime subscription could be added here similar to Grievances.tsx
  }, []);

  const fetchQueue = async () => {
    // Basic fetch for MVP - RLS ensures officers only see their dept's grievances
    const { data, error } = await supabase
      .from('grievances')
      .select('*, citizens(name, contact)')
      .order('urgency_score', { ascending: false })
      .order('created_at', { ascending: true });
      
    if (!error && data) {
      setGrievances(data);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    await supabase.from('grievances').update({ status: newStatus }).eq('id', id);
    fetchQueue();
  };

  if (loading) return <div className="text-center mt-20">Loading queue...</div>;

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Officer Dashboard</h2>
          <p className="text-slate-600 mt-2">Manage and resolve grievances assigned to your department</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center space-x-2">
          <ShieldCheck className="text-primary h-5 w-5" />
          <span className="font-medium text-slate-700">Authenticated Officer</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {grievances.map((g) => (
          <motion.div
            key={g.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col"
          >
            {g.image_url && (
              <div className="h-40 w-full bg-slate-100">
                <img src={g.image_url} alt="Issue" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-800">
                  {g.category || 'Uncategorized'}
                </span>
                {g.urgency_score > 5 && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700">
                    <AlertTriangle className="h-3 w-3 mr-1" /> High Urgency
                  </span>
                )}
              </div>
              <p className="text-slate-900 font-medium line-clamp-3 mb-4 flex-1">{g.raw_text}</p>
              
              <div className="text-xs text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p><span className="font-medium text-slate-700">Citizen:</span> {g.citizens?.name || 'Anonymous'}</p>
                <p><span className="font-medium text-slate-700">Filed:</span> {new Date(g.created_at).toLocaleString()}</p>
                <p><span className="font-medium text-slate-700">Status:</span> {g.status}</p>
              </div>

              <div className="space-y-2 mt-auto">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => updateStatus(g.id, 'Acknowledged')} className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 transition-colors">Acknowledge</button>
                  <button onClick={() => updateStatus(g.id, 'In Progress')} className="px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 rounded border border-purple-200 transition-colors">In Progress</button>
                  <button onClick={() => updateStatus(g.id, 'Resolved-Pending Confirmation')} className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 rounded border border-green-200 transition-colors">Resolve</button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
