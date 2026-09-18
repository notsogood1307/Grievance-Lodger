import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Report() {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        throw new Error('You must be logged in to report an issue. Please sign in first.');
      }

      let imageUrl = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('grievances') // or 'grievance-images' as per schema
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('grievance-images')
          .getPublicUrl(filePath);
        
        imageUrl = urlData.publicUrl;
      }

      // MVP: First insert basic grievance to get ID
      const { data: grievanceData, error: dbError } = await supabase
        .from('grievances')
        .insert({
          citizen_id: user.id,
          raw_text: text,
          image_url: imageUrl,
          status: 'Filed'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Now call FastAPI backend for classification
      const fastApiUrl = import.meta.env.VITE_CLASSIFY_API_URL || 'http://localhost:8000/classify';
      
      try {
        const aiResponse = await fetch(fastApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            image_url: imageUrl
          })
        });

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json();
          // Update grievance with AI result
          await supabase
            .from('grievances')
            .update({
              category: aiResult.category,
              departments: aiResult.departments,
              urgency_score: aiResult.urgency_score,
              duplicate_of_id: aiResult.duplicate_of_id || null,
            })
            .eq('id', grievanceData.id);
        }
      } catch (aiErr) {
        console.error("AI Classification failed, proceeding with unclassified grievance", aiErr);
      }

      navigate('/grievances');

    } catch (err: any) {
      setError(err.message || 'Failed to submit grievance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200"
      >
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Report an Issue</h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-start space-x-3 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Issue Description</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <textarea
                required
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
                placeholder="Please describe the issue in detail..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Location (Optional)</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="e.g. Near Central Park entrance"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Photo Upload</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*"
              />
              <UploadCloud className="h-10 w-10 text-slate-400 mb-3" />
              <p className="text-sm font-medium text-slate-700">
                {file ? file.name : "Click to upload a photo"}
              </p>
              <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 10MB</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover transition-colors shadow-sm flex items-center justify-center space-x-2 disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <span>Submit Grievance</span>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
