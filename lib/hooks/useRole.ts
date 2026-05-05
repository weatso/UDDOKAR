import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useRole() {
  const [role, setRole] = useState<'owner' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setRole(data.role as 'owner' | 'admin');
        }
      }
      setLoading(false);
    }
    fetchRole();
  }, []);

  return { role, loading };
}
