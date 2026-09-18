import os
import json
import logging
from groq import Groq

from supabase import create_client, Client

# Mock Departments if DB fetch fails
DEPARTMENTS = [
    {"id": "00000000-0000-0000-0000-000000000001", "name": "Water & Sanitation"},
    {"id": "00000000-0000-0000-0000-000000000002", "name": "Public Works & Roads"},
    {"id": "00000000-0000-0000-0000-000000000003", "name": "Power & Electricity"},
    {"id": "00000000-0000-0000-0000-000000000004", "name": "Public Health"},
    {"id": "00000000-0000-0000-0000-000000000005", "name": "Law Enforcement"},
    {"id": "00000000-0000-0000-0000-000000000006", "name": "General Administration"}
]

# Fetch departments from Supabase to get real UUIDs
try:
    supa_url = os.environ.get("SUPABASE_URL")
    supa_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if supa_url and supa_key:
        supabase: Client = create_client(supa_url, supa_key)
        response = supabase.table('departments').select('id, name').execute()
        if response.data:
            DEPARTMENTS = response.data
    else:
        logging.warning("Supabase credentials missing, using mock UUIDs for departments.")
except Exception as e:
    logging.warning(f"Failed to fetch departments from Supabase: {e}")

DEPARTMENT_NAMES = [d["name"] for d in DEPARTMENTS]


client = None
try:
    groq_api_key = os.environ.get("GROQ_API_KEY")
    if groq_api_key:
        client = Groq(api_key=groq_api_key)
    else:
        logging.warning("GROQ_API_KEY not found in environment.")
except Exception as e:
    logging.warning(f"Failed to initialize Groq client: {e}")

def classify_grievance(text: str, image_url: str = None) -> dict:
    """
    Classifies the grievance text and determines urgency and departments using Groq LLM.
    Fallback to simple rules if Groq API key is missing or request fails.
    """
    if client:
        try:
            prompt = f"""
Analyze the following citizen grievance and classify it.
Allowed Departments: {', '.join(DEPARTMENT_NAMES)}

Grievance: "{text}"

Respond ONLY with a valid JSON object matching this schema:
{{
  "category": "String (Short summary category, e.g. 'Roads & Infrastructure')",
  "departments": ["String (Select 1 or 2 matching departments from the allowed list)"],
  "confidence": "Float (between 0.0 and 1.0)",
  "urgency_score": "Integer (1 to 10, where 10 is immediate emergency)"
}}
"""
            chat_completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that routes citizen grievances to government departments. Always output ONLY valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                model="llama-3.1-8b-instant",
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            
            result = json.loads(chat_completion.choices[0].message.content)
            
            # Map returned names back to UUIDs
            returned_names = result.get("departments", [])
            department_uuids = []
            for name in returned_names:
                for d in DEPARTMENTS:
                    if d["name"].lower() == name.lower():
                        department_uuids.append(d["id"])
                        break
                        
            if not department_uuids:
                # Fallback to general admin UUID if nothing matched
                general_admin = next((d["id"] for d in DEPARTMENTS if "general" in d["name"].lower()), DEPARTMENTS[-1]["id"])
                department_uuids.append(general_admin)

            return {
                "category": result.get("category", "General"),
                "departments": department_uuids,
                "confidence": float(result.get("confidence", 0.8)),
                "urgency_score": int(result.get("urgency_score", 1))
            }
        except Exception as e:
            logging.error(f"Groq API failed, falling back to rule-based: {e}")
            print(f"DEBUG: Groq exception: {e}") # Bug 1 temporary debug log
            
    # Fallback Rule-Based (if Groq isn't configured or fails)
    text_lower = text.lower()
    category = "General"
    department_names = []
    urgency_score = 1
    
    if any(word in text_lower for word in ["water", "leak", "pipe", "drain"]):
        category, deps = "Water Supply & Sanitation", ["Water & Sanitation"]
        department_names.extend(deps)
    if any(word in text_lower for word in ["road", "pothole", "street"]):
        category, deps = "Roads & Infrastructure", ["Public Works & Roads"]
        department_names.extend(deps)
    
    if not department_names:
        department_names.append("General Administration")
        
    if any(word in text_lower for word in ["emergency", "accident", "live wire", "gas leak"]):
        urgency_score = 9
    elif any(word in text_lower for word in ["broken", "block", "power cut"]):
        urgency_score = 5

    # Map fallback names to UUIDs
    department_uuids = []
    for name in set(department_names):
        for d in DEPARTMENTS:
            if d["name"].lower() == name.lower():
                department_uuids.append(d["id"])
                break

    return {
        "category": category,
        "departments": department_uuids,
        "confidence": 0.5,
        "urgency_score": urgency_score
    }
