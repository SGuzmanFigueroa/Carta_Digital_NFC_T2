import { supabase } from '@/lib/supabase';

export interface ComplaintEntry {
  id?: string;
  claimCode: string;
  createdAt?: string;
  fullName: string;
  docType: 'DNI' | 'CE' | 'PASAPORTE' | 'RUC';
  docNumber: string;
  phone: string;
  email: string;
  address: string;
  isMinor: boolean;
  parentName?: string;
  contractedGoodType: 'PRODUCTO' | 'SERVICIO';
  claimedAmount: number;
  goodDescription?: string;
  tableNumber?: string;
  claimType: 'RECLAMO' | 'QUEJA';
  detail: string;
  consumerRequest: string;
  status?: 'PENDIENTE' | 'EN_PROCESO' | 'ATENDIDO';
}

const STORAGE_KEY_COMPLAINTS = 'gastropulse_complaint_book';

export function generateClaimCode(): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `LR-${year}-${randomSuffix}`;
}

export async function submitComplaintToDb(
  entry: Omit<ComplaintEntry, 'id' | 'claimCode' | 'createdAt' | 'status'>
): Promise<{ success: boolean; claimCode: string; error?: string }> {
  const claimCode = generateClaimCode();

  try {
    const { data, error } = await supabase
      .from('complaint_book')
      .insert({
        claim_code: claimCode,
        full_name: entry.fullName,
        doc_type: entry.docType,
        doc_number: entry.docNumber,
        phone: entry.phone,
        email: entry.email,
        address: entry.address,
        is_minor: entry.isMinor,
        parent_name: entry.parentName || null,
        contracted_good_type: entry.contractedGoodType,
        claimed_amount: entry.claimedAmount,
        good_description: entry.goodDescription || null,
        table_number: entry.tableNumber || null,
        claim_type: entry.claimType,
        detail: entry.detail,
        consumer_request: entry.consumerRequest,
        status: 'PENDIENTE',
        branch_id: 'primary'
      })
      .select('claim_code')
      .single();

    if (error) {
      console.warn('[ComplaintService] Fallback to local storage:', error.message);
      saveToLocalStorage({ ...entry, claimCode, createdAt: new Date().toISOString() });
    }

    return { success: true, claimCode };
  } catch (err: any) {
    console.warn('[ComplaintService] Network or connection error, saving locally:', err);
    saveToLocalStorage({ ...entry, claimCode, createdAt: new Date().toISOString() });
    return { success: true, claimCode };
  }
}

function saveToLocalStorage(record: any) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY_COMPLAINTS) || '[]');
    existing.unshift(record);
    localStorage.setItem(STORAGE_KEY_COMPLAINTS, JSON.stringify(existing));
  } catch (e) {
    console.error('Error saving complaint locally:', e);
  }
}

export function getLocalComplaints(): any[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_COMPLAINTS) || '[]');
  } catch {
    return [];
  }
}
