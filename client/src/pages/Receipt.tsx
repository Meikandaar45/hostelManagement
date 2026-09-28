import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';
import { feeService } from '@/services/feeService';
import { useToast } from '@/hooks/useToast';

export function Receipt() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const data = await feeService.getReceipt(parseInt(id!));
        setReceipt(data);
      } catch (err) {
        toast({ title: 'Error', description: 'Could not load receipt', type: 'error' });
        navigate('/app/fees');
      } finally {
        setLoading(false);
      }
    };
    fetchReceipt();
  }, [id]);

  if (loading) return <LoadingState />;
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-3xl mx-auto py-8 print:py-0">
      <div className="flex justify-between items-center mb-8 print:hidden">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} className="mr-2" /> Back
        </Button>
        <Button onClick={handlePrint}>
          <Printer size={16} className="mr-2" /> Print Receipt
        </Button>
      </div>

      {/* Printable Receipt Area */}
      <div className="bg-white p-10 rounded-xl shadow-sm border border-slate-200 print:shadow-none print:border-none">
        
        <div className="text-center mb-10 border-b border-slate-200 pb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Hostel Management System</h1>
          <p className="text-slate-500">Official Payment Receipt</p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-10">
          <div>
            <p className="text-sm text-slate-500 mb-1">Receipt Number</p>
            <p className="font-semibold text-slate-900">{receipt.receipt_number}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 mb-1">Date</p>
            <p className="font-semibold text-slate-900">{new Date(receipt.paid_at).toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-6 mb-10">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Student Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">Name</p>
              <p className="font-medium text-slate-900">{receipt.student_name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Student ID</p>
              <p className="font-medium text-slate-900">{receipt.student_number}</p>
            </div>
          </div>
        </div>

        <div className="mb-10">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Payment Details</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Fee Type</span>
              <span className="font-medium text-slate-900">{receipt.fee_type} ({receipt.academic_period})</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Total Fee Amount</span>
              <span className="font-medium text-slate-900">₹{parseFloat(receipt.total_fee).toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Payment Method</span>
              <span className="font-medium text-slate-900">{receipt.payment_method.replace('_', ' ')}</span>
            </div>

            {receipt.transaction_reference && (
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">Transaction Ref</span>
                <span className="font-medium text-slate-900">{receipt.transaction_reference}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-primary-50 rounded-lg p-6 mb-10 flex justify-between items-center">
          <span className="text-lg font-semibold text-primary-900">Amount Paid</span>
          <span className="text-2xl font-bold text-primary-700">₹{parseFloat(receipt.amount).toFixed(2)}</span>
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm text-slate-500">
          <div>
            <p className="mb-8">Authorized Signatory</p>
            <p className="border-t border-slate-300 pt-2 inline-block font-medium">{receipt.recorded_by_name}</p>
          </div>
          <div className="text-right">
            <p>This is a computer generated receipt</p>
            <p>and does not require a physical signature.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
