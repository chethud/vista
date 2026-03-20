from app.db.supabase_client import supabase

def create_post(data):
    return supabase.table("posts").insert(data).execute()

def get_posts():
    return supabase.table("posts").select("*").execute()