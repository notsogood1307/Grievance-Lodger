import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, AlertTriangle, AlertCircle, MessageSquareX, RotateCcw } from 'lucide-react';
import ExternalPortalAssist from '../components/ExternalPortalAssist';

export default function Grievances() {
  const [grievances, setGrievances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrievances();

    // Subscribe to realtime updates on the grievances table
    const subscription = supabase
      .channel('public:grievances')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grievances' }, payload => {
        console.log('Realtime update:', payload);
        fetchGrievances(); // Refresh the list
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchGrievances = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      setLoading(false);
      return;
    }
    
    // RLS ensures they only see their own
    const { data, error } = await supabase
      .from('grievances')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setGrievances(data);
    }
    setLoading(false);
  };

  const handleWithdraw = async (id: string) => {
    await supabase.from('grievances').update({ withdrawn: true }).eq('id', id);
    fetchGrievances();
  };

  const handleReopen = async (id: string, count: number) => {
    await supabase.from('grievances').update({ status: 'Reopened', reopened_count: count + 1 }).eq('id', id);
    fetchGrievances();
  };

  if (loading) {
    return <div className="flex justify-center mt-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      <h2 className="text-3xl font-bold text-slate-900 mb-8">My Grievances</h2>
      
      {grievances.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-200">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No grievances filed yet</h3>
          <p className="text-slate-500 mt-1">When you report an issue, it will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grievances.map((g, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={g.id}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6"
            >
              {g.image_url && (
                <div className="shrink-0 w-full md:w-48 h-32 rounded-xl overflow-hidden bg-slate-100">
                  <img src={g.image_url} alt="Grievance" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-2">
                      {g.category || 'Pending Classification'}
                    </span>
                    <p className="text-slate-900 font-medium line-clamp-2">{g.raw_text}</p>
                  </div>
                  <StatusBadge status={g.status} withdrawn={g.withdrawn} />
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-slate-500">
                  <span className="flex items-center"><Clock className="h-4 w-4 mr-1" /> {new Date(g.created_at).toLocaleDateString()}</span>
                  {g.duplicate_of_id && (
                    <span className="flex items-center text-orange-600 bg-orange-50 px-2 py-0.5 rounded"><AlertTriangle className="h-4 w-4 mr-1" /> Linked to existing issue</span>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                  {!g.withdrawn && g.status !== 'Closed' && (
                    <button 
                      onClick={() => handleWithdraw(g.id)}
                      className="flex items-center text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
                    >
                      <MessageSquareX className="h-4 w-4 mr-1" /> Withdraw
                    </button>
                  )}
                  {g.status === 'Resolved-Pending Confirmation' && !g.withdrawn && (
                    <button 
                      onClick={() => handleReopen(g.id, g.reopened_count || 0)}
                      className="flex items-center px-4 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" /> Reopen Issue
                    </button>
                  )}
                </div>
                
                {/* Variant B: External Portal Assist */}
                {g.category && !g.withdrawn && (
                  <ExternalPortalAssist 
                    grievanceId={g.id} 
                    category={g.category} 
                    text={g.raw_text} 
                  />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, withdrawn }: { status: string, withdrawn: boolean }) {
  if (withdrawn) {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Withdrawn</span>;
  }
  
  switch(status) {
    case 'Filed':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">Filed</span>;
    case 'Acknowledged':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">Acknowledged</span>;
    case 'In Progress':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">In Progress</span>;
    case 'Resolved-Pending Confirmation':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200"><CheckCircle className="w-3 h-3 mr-1" /> Resolved</span>;
    case 'Reopened':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">Reopened</span>;
    case 'Closed':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">Closed</span>;
    default:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">{status}</span>;
  }
}
