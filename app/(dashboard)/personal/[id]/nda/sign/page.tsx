'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Employee } from '@/types';
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline';

interface SignatureCanvasProps {
  label: string;
  onChange: (dataUrl: string | null) => void;
  initialData?: string | null;
}

function SignatureCanvas({ label, onChange, initialData }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);

  useEffect(() => {
    if (initialData && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current!.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          setHasDrawing(true);
        }
      };
      img.src = initialData;
    }
  }, [initialData]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getPos(e);
    const ctx = canvasRef.current!.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current!.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setHasDrawing(true);
    const ctx = canvasRef.current!.getContext('2d');
    if (ctx) ctx.closePath();
    onChange(canvasRef.current!.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasDrawing(false);
    onChange(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#000000';
    }
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="label mb-0">{label}</label>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center px-3 py-1.5 border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white transition-colors text-xs font-medium uppercase tracking-wider"
        >
          <TrashIcon className="mr-1 h-3 w-3" />
          Clear
        </button>
      </div>
      <div
        className="relative border-2 border-dark-500 rounded-sm bg-white cursor-crosshair touch-none"
        style={{ height: '180px' }}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={360}
          className="w-full h-full"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasDrawing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-400 text-sm">Unterschreiben Sie hier</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NdaSignPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);

  const [formData, setFormData] = useState({
    signature_ort: '',
    signature_datum: new Date().toISOString().split('T')[0],
    signature_verein: null as string | null,
    signature_vertragsnehmer: null as string | null,
  });

  useEffect(() => {
    if (params.id) fetchEmployee();
  }, [params.id]);

  const fetchEmployee = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      if (!data) {
        toast.error('Employee not found');
        router.push('/personal');
        return;
      }

      const emp = data as Employee;
      setEmployee(emp);
      setFormData({
        signature_ort: emp.signature_ort || 'Pratteln',
        signature_datum: emp.signature_datum || new Date().toISOString().split('T')[0],
        signature_verein: emp.signature_verein,
        signature_vertragsnehmer: emp.signature_vertragsnehmer,
      });
    } catch (error) {
      console.error('Error fetching employee:', error);
      toast.error('Failed to load employee');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updateData: any = {
        signature_ort: formData.signature_ort || null,
        signature_datum: formData.signature_datum || null,
        signature_verein: formData.signature_verein,
        signature_vertragsnehmer: formData.signature_vertragsnehmer,
      };

      const { error } = await (supabase.from('employees') as any)
        .update(updateData)
        .eq('id', params.id);

      if (error) throw error;

      toast.success('Signatures saved successfully');
      router.push(`/personal/${params.id}`);
    } catch (error: any) {
      console.error('Error saving signatures:', error);
      toast.error(error.message || 'Failed to save signatures');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Employee not found.</p>
        <Link href="/personal" className="text-blue-400 hover:text-blue-300 mt-2 inline-block">Back to Personal</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <Link href={`/personal/${params.id}`} className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-2">
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back to Employee
          </Link>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
            NDA Unterschrift
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {employee.first_name} {employee.last_name}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Contract Preview */}
        <div className="card bg-dark-800">
          <div className="card-body space-y-4">
            <h3 className="text-lg font-medium text-white">Verschwiegenheitsvereinbarung</h3>
            <div className="text-sm text-gray-400 space-y-2 max-h-48 overflow-y-auto pr-2">
              <p>Zwischen dem "Verein Techno on the Block", vertreten durch Ben Littmann & Alina Littmann,</p>
              <p>und {employee.first_name} {employee.last_name} wird folgende Verschwiegenheitsvereinbarung vereinbart.</p>
              <p>Der Vertragsnehmer verpflichtet sich, jegliche Informationen vertraulich zu behandeln...</p>
            </div>
          </div>
        </div>

        {/* Location & Date */}
        <div className="card bg-dark-800">
          <div className="card-body">
            <h3 className="text-lg font-medium text-white mb-4">Ort & Datum</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="label">Ort</label>
                <input
                  type="text"
                  className="input"
                  value={formData.signature_ort}
                  onChange={(e) => setFormData((p) => ({ ...p, signature_ort: e.target.value }))}
                  placeholder="z.B. Pratteln"
                />
              </div>
              <div>
                <label className="label">Datum</label>
                <input
                  type="date"
                  className="input"
                  value={formData.signature_datum}
                  onChange={(e) => setFormData((p) => ({ ...p, signature_datum: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="card bg-dark-800">
          <div className="card-body space-y-8">
            <h3 className="text-lg font-medium text-white">Unterschriften</h3>
            <SignatureCanvas
              label="Unterschrift Verein (Ben Littmann & Alina Littmann)"
              onChange={(data) => setFormData((p) => ({ ...p, signature_verein: data }))}
              initialData={formData.signature_verein}
            />
            <SignatureCanvas
              label={`Unterschrift Vertragsnehmer (${employee.first_name} ${employee.last_name})`}
              onChange={(data) => setFormData((p) => ({ ...p, signature_vertragsnehmer: data }))}
              initialData={formData.signature_vertragsnehmer}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Link
            href={`/personal/${params.id}`}
            className="px-6 py-3 border border-dark-500 text-gray-300 hover:text-white hover:border-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Signatures'}
          </button>
        </div>
      </form>
    </div>
  );
}
