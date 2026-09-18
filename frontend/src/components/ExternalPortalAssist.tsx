import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ExternalLink, CheckCircle, Clock } from 'lucide-react';

export default function ExternalPortalAssist({ grievanceId, category, text }: { grievanceId: string, category: string, text: string }) {
  const [department, setDepartment] = useState<any>(null);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [isFiledExternally, setIsFiledExternally] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    // Find matching department with portal url for this category
    const fetchDept = async () => {
      // In MVP, we map category to a specific mock department, for example:
      const { data } = await supabase.from('departments').select('*').not('portal_url', 'is', null).limit(1);
      if (data && data.length > 0) {
        setDepartment(data[0]);
      }
      
      // Check if already filed externally
      const { data: grievance } = await supabase.from('grievances').select('official_registration_number').eq('id', grievanceId).single();
      if (grievance?.official_registration_number) {
        setRegistrationNumber(grievance.official_registration_number);
        setIsFiledExternally(true);
      }
    };
    fetchDept();
  }, [category, grievanceId]);

  const handleMarkFiled = async () => {
    if (!registrationNumber.trim()) return;
    setLoading(true);
    await supabase.from('grievances').update({ 
      official_registration_number: registrationNumber,
      status: 'Acknowledged' // Sync initial status
    }).eq('id', grievanceId);
    
    setIsFiledExternally(true);
    setLoading(false);
  };

  const simulateSync = () => {
    setSyncStatus('Syncing with external portal...');
    setTimeout(() => {
      setSyncStatus('Status updated from external portal: In Progress');
      supabase.from('grievances').update({ status: 'In Progress' }).eq('id', grievanceId);
    }, 2000);
  };

  if (!department) return null;

  return (
    <div className="mt-6 p-6 bg-blue-50 rounded-2xl border border-blue-100">
      <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
        <ExternalLink className="h-5 w-5 mr-2" />
        Official Portal Tracking Available
      </h3>
      
      {!isFiledExternally ? (
        <div className="space-y-4">
          <p className="text-sm text-blue-800">
            This issue falls under <strong>{department.name}</strong>. They have their own official portal. 
            We've pre-filled the details below. Please copy them and file it directly on their portal for faster resolution.
          </p>
          
          <div className="bg-white p-4 rounded-xl border border-blue-200 text-sm">
            <p className="text-slate-500 mb-1">Pre-written complaint:</p>
            <p className="text-slate-800 font-medium">{text}</p>
          </div>

          <a 
            href={department.portal_url} 
            target="_blank" 
            rel="noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Open Official Portal <ExternalLink className="ml-2 h-4 w-4" />
          </a>

          <div className="pt-4 border-t border-blue-200">
            <label className="block text-sm font-medium text-blue-900 mb-2">Once filed, enter the registration number here to track it in this app:</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="e.g. REF-2026-892"
                className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <button
                onClick={handleMarkFiled}
                disabled={loading || !registrationNumber.trim()}
                className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Track Externally'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Linked to external reference: {registrationNumber}</span>
          </div>
          
          <button 
            onClick={simulateSync}
            className="flex items-center text-sm text-blue-700 hover:text-blue-900 font-medium transition-colors"
          >
            <Clock className="h-4 w-4 mr-1" /> Force Sync Status
          </button>
          
          {syncStatus && <p className="text-sm text-slate-600 italic mt-2">{syncStatus}</p>}
        </div>
      )}
    </div>
  );
}
