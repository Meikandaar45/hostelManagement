import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Printer,
  ArrowLeft,
  ShieldCheck,
  Building,
  Calendar,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/Badge';
import { LoadingState } from '@/components/LoadingState';
import { useToast } from '@/hooks/useToast';
import { leaveService } from '@/services/leaveService';
import type { GatePass as GatePassType } from '@/types';

export function GatePass() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [gatePass, setGatePass] = useState<GatePassType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchGatePass = async () => {
      setLoading(true);
      try {
        const pass = await leaveService.getGatePass(parseInt(id));
        setGatePass(pass);
      } catch (err: any) {
        toast({
          title: 'Gate Pass Not Available',
          description: err.response?.data?.message || 'Could not load gate pass document',
          type: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchGatePass();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingState text="Generating official gate pass..." />
      </div>
    );
  }

  if (!gatePass) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 mx-auto flex items-center justify-center">
          <AlertCircle size={24} />
        </div>
        <h3 className="text-lg font-semibold text-slate-200">Gate Pass Not Available</h3>
        <p className="text-sm text-slate-400">
          This leave request either does not exist or has not been approved by the warden yet.
        </p>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Return Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top action toolbar - hidden when printing */}
      <div className="flex items-center justify-between print:hidden">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft size={16} />
          Back
        </Button>

        <Button onClick={handlePrint} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500">
          <Printer size={16} />
          Print Gate Pass
        </Button>
      </div>

      {/* Official Pass Printable Document Card */}
      <div className="bg-slate-950 border-2 border-slate-700/80 rounded-xl overflow-hidden shadow-2xl print:border-black print:bg-white print:text-black print:shadow-none">
        {/* Pass Header Banner */}
        <div className="bg-gradient-to-r from-indigo-900/60 via-slate-900 to-indigo-950/60 border-b border-slate-800 p-6 print:bg-none print:border-b-2 print:border-black">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-400 print:text-black">
                <Building size={20} />
                <span className="text-xs uppercase font-bold tracking-widest">
                  Hostel Administration & Security
                </span>
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-white print:text-black">
                DIGITAL GATE PASS
              </h1>
              <p className="text-xs text-slate-400 print:text-gray-600">
                Official Student Campus Leave Authorization
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block print:text-gray-600">
                Pass Number
              </span>
              <span className="font-mono text-base font-extrabold text-emerald-400 print:text-black">
                {gatePass.gate_pass_number}
              </span>
              <div className="mt-1">
                <StatusBadge status={gatePass.status} />
              </div>
            </div>
          </div>
        </div>

        {/* Pass Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Student Information Section */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2 mb-4 print:text-black print:border-black">
              Student Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 print:bg-transparent print:border-gray-300">
                <span className="text-xs text-slate-500 block">Student Name</span>
                <span className="text-sm font-semibold text-slate-100 print:text-black">
                  {gatePass.student_name}
                </span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 print:bg-transparent print:border-gray-300">
                <span className="text-xs text-slate-500 block">Student ID / Reg No.</span>
                <span className="text-sm font-mono font-semibold text-slate-100 print:text-black">
                  {gatePass.student_id || 'N/A'}
                </span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 print:bg-transparent print:border-gray-300">
                <span className="text-xs text-slate-500 block">Assigned Room</span>
                <span className="text-sm font-semibold text-slate-100 print:text-black">
                  {gatePass.room_number ? `Room ${gatePass.room_number}` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Leave & Schedule Details */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2 mb-4 print:text-black print:border-black">
              Authorized Schedule & Purpose
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800/80 print:bg-transparent print:border-gray-300">
                <div className="flex items-center gap-2 text-indigo-400 print:text-black text-xs font-medium mb-1">
                  <Calendar size={14} />
                  <span>Scheduled Departure</span>
                </div>
                <div className="text-sm font-semibold text-slate-100 print:text-black">
                  {new Date(gatePass.from_datetime).toLocaleDateString()}{' '}
                  <span className="text-indigo-300 font-normal print:text-black">
                    at {new Date(gatePass.from_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800/80 print:bg-transparent print:border-gray-300">
                <div className="flex items-center gap-2 text-indigo-400 print:text-black text-xs font-medium mb-1">
                  <Clock size={14} />
                  <span>Expected Return</span>
                </div>
                <div className="text-sm font-semibold text-slate-100 print:text-black">
                  {new Date(gatePass.to_datetime).toLocaleDateString()}{' '}
                  <span className="text-indigo-300 font-normal print:text-black">
                    at {new Date(gatePass.to_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 bg-slate-900/60 p-3.5 rounded-lg border border-slate-800/80 print:bg-transparent print:border-gray-300">
              <span className="text-xs text-slate-500 block mb-1">Purpose / Destination</span>
              <p className="text-sm text-slate-200 print:text-black">{gatePass.reason}</p>
            </div>
          </div>

          {/* Authorization & Security Verification */}
          <div className="pt-2">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2 mb-4 print:text-black print:border-black">
              Authorization & Gate Verification
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 print:text-black text-xs font-semibold">
                  <ShieldCheck size={16} />
                  <span>Authorized by Warden Office</span>
                </div>
                <div className="text-xs text-slate-300 print:text-black">
                  Approved By: <span className="font-semibold text-slate-100 print:text-black">{gatePass.approved_by || 'Hostel Warden'}</span>
                </div>
                <div className="text-xs text-slate-400 print:text-gray-600">
                  Approved On:{' '}
                  {gatePass.approved_at
                    ? new Date(gatePass.approved_at).toLocaleString()
                    : 'System Record'}
                </div>
              </div>

              {/* Security Guard Physical Verification Box */}
              <div className="border border-dashed border-slate-700 p-3 rounded-lg text-center space-y-1 print:border-black">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block print:text-gray-600">
                  Security Gate Stamp / Signature
                </span>
                <div className="h-10 flex items-center justify-center text-xs text-slate-600 italic print:text-gray-400">
                  [ Verified at Exit Gate ]
                </div>
              </div>
            </div>
          </div>

          {/* Verification Notices */}
          <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-500 space-y-1 print:text-gray-600 print:border-gray-300">
            <p>1. Present this digital gate pass or printed copy at the main hostel gate upon departure and return.</p>
            <p>2. Security personnel will cross-reference this pass with student identification.</p>
            <p>3. Failure to return by the specified expected return time may result in administrative notification.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
