import { useState } from 'react';
import { UserCheck, UserX, Search, Eye } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

interface AppUser {
  id: string;
  name: string;
  gender: string;
  mobile: string;
  city: string;
  area: string;
  pincode: string;
  status: 'Active' | 'Suspended';
  joined: string;
}

const MOCK_USERS: AppUser[] = [
  { id: '1', name: 'Zahra Bohra', gender: 'female', mobile: '+91 9876543210', city: 'Mumbai', area: 'Bhendi Bazaar', pincode: '400003', status: 'Active', joined: '12 Jan 2026' },
  { id: '2', name: 'Fatema Hussain', gender: 'female', mobile: '+91 8765432109', city: 'Mumbai', area: 'Dadar', pincode: '400014', status: 'Active', joined: '15 Feb 2026' },
  { id: '3', name: 'Ali Asghar', gender: 'male', mobile: '+91 7654321098', city: 'Pune', area: 'Camp', pincode: '411001', status: 'Suspended', joined: '28 Feb 2026' }
];

const Users = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<AppUser[]>(MOCK_USERS);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.mobile.includes(searchTerm)
  );

  const toggleStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUsers(users.map(u => {
      if (u.id === id) {
        return { ...u, status: u.status === 'Active' ? 'Suspended' : 'Active' };
      }
      return u;
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Platform Users</h2>
        
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden border border-gray-200 sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{user.name}</span>
                      <span className="text-sm text-gray-500">{user.mobile}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-900">{user.city}</span>
                      <span className="text-xs text-gray-500">{user.area}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-4 items-center">
                      <Dialog.Root>
                        <Dialog.Trigger asChild>
                          <button onClick={() => setSelectedUser(user)} className="text-blue-600 hover:text-blue-900 flex items-center" title="View details">
                            <Eye className="h-4 w-4 mr-1" /> View
                          </button>
                        </Dialog.Trigger>
                        <Dialog.Portal>
                          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 transition-opacity" />
                          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl z-50 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                            <Dialog.Title className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">User Details</Dialog.Title>
                            
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 uppercase">Name</label>
                                  <p className="mt-1 text-sm text-gray-900 font-medium">{selectedUser?.name}</p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 uppercase">Gender</label>
                                  <p className="mt-1 text-sm text-gray-900 capitalize">{selectedUser?.gender}</p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 uppercase">Mobile</label>
                                  <p className="mt-1 text-sm text-gray-900">{selectedUser?.mobile}</p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 uppercase">Joined Date</label>
                                  <p className="mt-1 text-sm text-gray-900">{selectedUser?.joined}</p>
                                </div>
                              </div>
                              
                              <div className="pt-4 border-t border-gray-100">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Location Information</h4>
                                <div className="bg-gray-50 rounded-md p-3 grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs text-gray-500">City</label>
                                    <p className="text-sm font-medium">{selectedUser?.city}</p>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500">Area</label>
                                    <p className="text-sm font-medium">{selectedUser?.area}</p>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500">Pincode</label>
                                    <p className="text-sm font-medium">{selectedUser?.pincode}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-6 flex justify-end">
                              <Dialog.Close asChild>
                                <button className="px-4 py-2 bg-gray-100 text-gray-800 hover:bg-gray-200 rounded-md text-sm font-medium">
                                  Close
                                </button>
                              </Dialog.Close>
                            </div>
                          </Dialog.Content>
                        </Dialog.Portal>
                      </Dialog.Root>

                      {user.status === 'Active' ? (
                        <button onClick={(e) => toggleStatus(user.id, e)} className="text-red-600 hover:text-red-900 flex items-center" title="Suspend User">
                          <UserX className="h-4 w-4 mr-1" /> Suspend
                        </button>
                      ) : (
                        <button onClick={(e) => toggleStatus(user.id, e)} className="text-green-600 hover:text-green-900 flex items-center" title="Activate User">
                          <UserCheck className="h-4 w-4 mr-1" /> Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No users found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Users;
