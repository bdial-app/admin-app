import { useState } from 'react';
import { Eye, CheckCircle2, FileText, Download, XCircle } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

type DocStatus = 'pending' | 'approved' | 'rejected';
type IjamatStatus = 'pending' | 'approved' | 'rejected' | 'not_submitted';

interface Verification {
  id: string;
  businessName: string;
  providerName: string;
  category: string;
  submittedOn: string;
  aadhaar: {
    url: string;
    status: DocStatus;
  };
  ijamat: {
    number?: string;
    expiry?: string;
    url: string | null;
    status: IjamatStatus;
  };
  admin_notes: string;
}

const PENDING_REGISTRATIONS: Verification[] = [
  {
    id: '1',
    businessName: 'Zahra Home Bakes',
    providerName: 'Zahra A.',
    category: 'Others',
    submittedOn: '2026-04-01',
    aadhaar: { url: '/files/aadhaar1.pdf', status: 'pending' },
    ijamat: { number: 'IJ-91823', expiry: '2027-12-31', url: '/files/ijamat1.pdf', status: 'pending' },
    admin_notes: ''
  },
  {
    id: '2',
    businessName: 'Hussain Handyman',
    providerName: 'Hussain H.',
    category: 'Others',
    submittedOn: '2026-04-02',
    aadhaar: { url: '/files/aadhaar2.pdf', status: 'pending' },
    ijamat: { url: null, status: 'not_submitted' },
    admin_notes: ''
  },
];

const Registrations = () => {
  const [registrations, setRegistrations] = useState<Verification[]>(PENDING_REGISTRATIONS);
  const [selectedReg, setSelectedReg] = useState<Verification | null>(null);
  const [editAadhaarStatus, setEditAadhaarStatus] = useState<DocStatus>('pending');
  const [editIjamatStatus, setEditIjamatStatus] = useState<IjamatStatus>('pending');
  const [editNotes, setEditNotes] = useState('');

  const openReviewModal = (reg: Verification) => {
    setSelectedReg(reg);
    setEditAadhaarStatus(reg.aadhaar.status);
    setEditIjamatStatus(reg.ijamat.status);
    setEditNotes(reg.admin_notes);
  };

  const handleUpdate = () => {
    if (!selectedReg) return;
    
    const updated = registrations.map(r => {
      if (r.id === selectedReg.id) {
        return {
          ...r,
          aadhaar: { ...r.aadhaar, status: editAadhaarStatus },
          ijamat: { ...r.ijamat, status: editIjamatStatus },
          admin_notes: editNotes
        };
      }
      return r;
    });
    setRegistrations(updated);
  };

  const handleApproveProvider = () => {
    if (!selectedReg) return;
    setRegistrations(registrations.filter(r => r.id !== selectedReg.id));
  };
  
  const handleRejectProvider = () => {
    if (!selectedReg) return;
    setRegistrations(registrations.filter(r => r.id !== selectedReg.id));
  };

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'not_submitted') return <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-500">Not Submitted</span>;
    if (status === 'approved') return <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-800">Approved</span>;
    if (status === 'rejected') return <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-800">Rejected</span>;
    return <span className="px-2 py-0.5 text-xs rounded bg-yellow-100 text-yellow-800">Pending</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Provider Verifications</h2>
      </div>

      <div className="bg-white shadow overflow-hidden border border-gray-200 sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business / Provider</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted On</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aadhaar Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">iJamat Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {registrations.map((reg) => (
                <tr key={reg.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{reg.businessName}</span>
                      <span className="text-sm text-gray-500">{reg.providerName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{reg.submittedOn}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={reg.aadhaar.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={reg.ijamat.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <Dialog.Root>
                        <Dialog.Trigger asChild>
                          <button onClick={() => openReviewModal(reg)} className="text-blue-600 hover:text-blue-900 flex items-center" title="Review Documents">
                            <Eye className="h-4 w-4 mr-1" /> Review
                          </button>
                        </Dialog.Trigger>
                        <Dialog.Portal>
                          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 transition-opacity" />
                          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl z-50 w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                            <Dialog.Title className="text-xl font-bold text-gray-900 mb-4">Review Verification</Dialog.Title>
                            
                            <div className="space-y-6 mb-6">
                              <div className="bg-blue-50 border border-blue-100 p-4 rounded-md flex justify-between items-center">
                                <div>
                                  <h4 className="text-sm font-medium text-blue-900">Provider Information</h4>
                                  <p className="mt-1 text-sm text-blue-800">{selectedReg?.businessName} ({selectedReg?.category})</p>
                                  <p className="text-sm text-blue-800">Authorized Person: {selectedReg?.providerName}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Aadhaar Section */}
                                <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                                      <FileText className="w-4 h-4 mr-1 text-gray-500" /> Aadhaar Document
                                    </h4>
                                    <button className="text-xs flex items-center text-blue-600 hover:underline">
                                      <Download className="w-3 h-3 mr-1" /> View
                                    </button>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Approval Status</label>
                                    <select 
                                      className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white"
                                      value={editAadhaarStatus}
                                      onChange={(e) => setEditAadhaarStatus(e.target.value as DocStatus)}
                                    >
                                      <option value="pending">Pending</option>
                                      <option value="approved">Approved</option>
                                      <option value="rejected">Rejected</option>
                                    </select>
                                  </div>
                                </div>

                                {/* iJamat Section */}
                                <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                                      <FileText className="w-4 h-4 mr-1 text-gray-500" /> iJamat Card Document
                                    </h4>
                                    {selectedReg?.ijamat.status !== 'not_submitted' && (
                                      <button className="text-xs flex items-center text-blue-600 hover:underline">
                                        <Download className="w-3 h-3 mr-1" /> View
                                      </button>
                                    )}
                                  </div>
                                  {selectedReg?.ijamat.status !== 'not_submitted' ? (
                                    <>
                                      <div className="text-xs text-gray-500 bg-white p-2 rounded border">
                                        <p>Card Number: {selectedReg?.ijamat.number}</p>
                                        <p>Expiry: {selectedReg?.ijamat.expiry}</p>
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Approval Status</label>
                                        <select 
                                          className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white"
                                          value={editIjamatStatus}
                                          onChange={(e) => setEditIjamatStatus(e.target.value as IjamatStatus)}
                                        >
                                          <option value="pending">Pending</option>
                                          <option value="approved">Approved</option>
                                          <option value="rejected">Rejected</option>
                                        </select>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-sm text-gray-500 italic mt-4">No iJamat card submitted.</div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Admin Notes */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Internal Admin Notes</label>
                                <textarea
                                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                  rows={2}
                                  placeholder="Leave a note regarding this verification..."
                                  value={editNotes}
                                  onChange={(e) => setEditNotes(e.target.value)}
                                ></textarea>
                              </div>

                            </div>

                            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                              <div className="flex items-center gap-2">
                                <Dialog.Close asChild>
                                  <button onClick={handleRejectProvider} className="px-4 py-2 text-sm font-medium text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 rounded-md flex items-center">
                                    <XCircle className="w-4 h-4 mr-2" /> Reject Provider
                                  </button>
                                </Dialog.Close>
                                <Dialog.Close asChild>
                                  <button onClick={handleApproveProvider} className="px-4 py-2 text-sm font-medium text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 rounded-md flex items-center">
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Approve Provider
                                  </button>
                                </Dialog.Close>
                              </div>
                              <div className="flex items-center gap-2">
                                <Dialog.Close asChild>
                                  <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">
                                    Cancel
                                  </button>
                                </Dialog.Close>
                                <Dialog.Close asChild>
                                  <button onClick={handleUpdate} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">
                                    Save Doc Status
                                  </button>
                                </Dialog.Close>
                              </div>
                            </div>
                          </Dialog.Content>
                        </Dialog.Portal>
                      </Dialog.Root>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {registrations.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No pending registrations at the moment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Registrations;
