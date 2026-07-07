import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Generate member ID helper
export async function generateMemberId(): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('generate_member_id');
    if (error) throw error;
    return data;
  } catch {
    // Fallback: generate locally
    const { data } = await supabase
      .from('loan_members')
      .select('member_id')
      .like('member_id', 'RR%')
      .order('member_id', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastId = data[0].member_id;
      const num = parseInt(lastId.replace('RR', '')) + 1;
      return 'RR' + num.toString().padStart(5, '0');
    }
    return 'RR00001';
  }
}

// Generate invoice number helper
export async function generateInvoiceNumber(): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('generate_invoice_number');
    if (error) throw error;
    return data;
  } catch {
    // Fallback: generate locally
    const date = new Date();
    const prefix = 'INV-' + date.getFullYear().toString() + (date.getMonth() + 1).toString().padStart(2, '0') + '-';
    const { data } = await supabase
      .from('loan_transactions')
      .select('invoice_number')
      .like('invoice_number', `${prefix}%`)
      .order('invoice_number', { ascending: false })
      .limit(1);

    if (data && data.length > 0 && data[0].invoice_number) {
      const lastNum = parseInt(data[0].invoice_number.split('-')[2]) + 1;
      return prefix + lastNum.toString().padStart(5, '0');
    }
    return prefix + '00001';
  }
}
