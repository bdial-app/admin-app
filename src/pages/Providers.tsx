import { useState } from 'react';
import { Search, Eye, Filter } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

const MOCK_PROVIDERS = [
  { id: '1', businessName: 'Fatema Tailors', category: 'Tailoring', city: 'Mumbai', status: 'Live', isWomenLed: true, rating: 4.8 },
  { id: '2', businessName: 'Burhani Tuitions', category: 'Tuitions', city: 'Pune', status: 'Pending', isWomenLed: false, rating: 0 },
  { id: '3', businessName: 'Zainab Mehandi Arts', category: 'Beauty', city: 'Surat', status: 'Live', isWomenLed: true, rating: 4.9 },
];

const Providers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<typeof MOCK_PROVIDERS[0] | null>(null);

  const filteredProviders = MOCK_PROVIDERS.filter(p => 
    p.businessName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Service Providers</h2>
        
        <div className="flex items-center gap-2">
          <button className="flex items-center px-3 py-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50">
            <Filter className="h-4 w-4 mr-2 text-gray-500" />
            Filter
          </button>
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search providers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProviders.map(provider => (
          <div key={provider.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="p-5">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-gray-900 truncate">{provider.businessName}</h3>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  provider.status === 'Live' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {provider.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{provider.category} • {provider.city}</p>
              
              <div className="mt-4 flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 lowercase">rating</span>
                  <span className="text-sm font-semibold">{provider.rating > 0 ? `${provider.rating} ⭐` : 'New'}</span>
                </div>
                {provider.isWomenLed && (
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Badge</span>
                    <span className="text-sm font-semibold text-pink-600">Women-Led</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
              <Dialog.Root>
                <Dialog.Trigger asChild>
                  <button 
                    onClick={() => setSelectedProvider(provider)}
                    className="w-full flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </button>
                </Dialog.Trigger>
                
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 transition-opacity" />
                  <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl z-50 w-full max-w-md p-6 overflow-hidden">
                    <Dialog.Title className="text-xl font-bold text-gray-900 mb-2">
                      {selectedProvider?.businessName}
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-500 mb-6">
                      Detailed information about the service provider.
                    </Dialog.Description>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Category</p>
                          <p className="font-medium">{selectedProvider?.category}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Location</p>
                          <p className="font-medium">{selectedProvider?.city}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
                          <p className="font-medium">{selectedProvider?.status}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Rating</p>
                          <p className="font-medium">{selectedProvider?.rating || 'No reviews yet'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                      <Dialog.Close asChild>
                        <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                          Close
                        </button>
                      </Dialog.Close>
                    </div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Providers;
