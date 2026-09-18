import os
from sentence_transformers import SentenceTransformer, util
from supabase import create_client, Client
import logging

# Load lightweight model for MVP
try:
    model = SentenceTransformer('all-MiniLM-L6-v2')
except Exception as e:
    logging.warning(f"Could not load SentenceTransformer model: {e}")
    model = None

# Initialize Supabase Service Client
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if url and key:
    supabase: Client = create_client(url, key)
else:
    supabase = None
    logging.warning("Supabase credentials not found in env. Deduplication will be disabled.")

def check_duplicate(text: str, category: str, threshold: float = 0.85) -> dict:
    """
    Checks for similar recent complaints in the same category.
    """
    result = {
        "is_duplicate": False,
        "duplicate_of_id": None
    }
    
    if not model or not supabase:
        return result
        
    try:
        # Fetch recent active grievances in this category
        # MVP: simple query fetching last 50 unresolved issues in the category
        response = supabase.table('grievances') \
            .select('id, raw_text') \
            .eq('category', category) \
            .in_('status', ['Filed', 'Acknowledged', 'In Progress']) \
            .order('created_at', desc=True) \
            .limit(50) \
            .execute()
            
        recent_grievances = response.data
        
        if not recent_grievances:
            return result
            
        # Encode incoming text
        incoming_embedding = model.encode(text, convert_to_tensor=True)
        
        # Compare against existing texts
        for g in recent_grievances:
            existing_text = g.get('raw_text', '')
            if not existing_text:
                continue
                
            existing_embedding = model.encode(existing_text, convert_to_tensor=True)
            similarity = util.cos_sim(incoming_embedding, existing_embedding).item()
            
            if similarity >= threshold:
                result["is_duplicate"] = True
                result["duplicate_of_id"] = g['id']
                break
                
        return result
    except Exception as e:
        logging.error(f"Error during deduplication check: {e}")
        return result
