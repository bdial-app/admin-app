import { useState } from 'react';
import { Search, Trash2, AlertTriangle } from 'lucide-react';

const MOCK_REVIEWS = [
  { id: '1', provider: 'Fatema Tailors', user: 'Sakina M.', rating: 5, date: '2026-03-30', comment: 'Excellent stitching, the fits are perfect!', flagged: false },
  { id: '2', provider: 'Burhani Tuitions', user: 'Abbas S.', rating: 1, date: '2026-03-29', comment: 'Unprofessional behavior. Did not show up.', flagged: true },
  { id: '3', provider: 'Zainab Mehandi Arts', user: 'Murtaza K.', rating: 4, date: '2026-03-28', comment: 'Beautiful designs for the wedding.', flagged: false },
];

const Reviews = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [reviews, setReviews] = useState(MOCK_REVIEWS);

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      setReviews(reviews.filter(r => r.id !== id));
    }
  };

  const filteredReviews = reviews.filter(r => 
    r.provider.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.user.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Reviews & Moderation</h2>
        
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Filter by provider or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReviews.map((review) => (
          <div key={review.id} className={`bg-white rounded-lg shadow border ${review.flagged ? 'border-red-300' : 'border-gray-200'} p-5`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{review.provider}</h3>
                <p className="text-xs text-gray-500">by {review.user} on {review.date}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="flex items-center text-sm font-bold text-yellow-500">
                  {review.rating} ⭐
                </span>
                {review.flagged && (
                  <span title="Reported/Flagged Review">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </span>
                )}
              </div>
            </div>
            
            <p className="text-gray-700 text-sm italic mb-4">"{review.comment}"</p>
            
            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button 
                onClick={() => handleDelete(review.id)}
                className="flex items-center text-sm text-red-600 hover:text-red-800 font-medium"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete Review
              </button>
            </div>
          </div>
        ))}
        {filteredReviews.length === 0 && (
          <div className="col-span-full text-center py-10 text-gray-500">
            No reviews found matching that filter.
          </div>
        )}
      </div>
    </div>
  );
};

export default Reviews;
