import { useState } from 'react';
import { Search, Trash2, AlertTriangle } from 'lucide-react';
import { Phone } from 'lucide-react';



const MOCK_REVIEWS = [
  { id: '1', provider: 'Fatema Tailors', user: 'Sakina M.', phone: '+91 9876543210', rating: 5, active: true, date: '2026-03-30', comment: 'Excellent stitching, the fits are perfect!', flagged: false },
  { id: '2', provider: 'Burhani Tuitions', user: 'Abbas S.', phone: '+91 9876543109', rating: 1, active: false, date: '2026-03-29', comment: 'Unprofessional behavior. Did not show up.', flagged: true },
  { id: '3', provider: 'Zainab Mehandi Arts', user: 'Murtaza K.', phone: '+91 9876581238', rating: 4, active: true, date: '2026-03-28', comment: 'Beautiful designs for the wedding.', flagged: false },
  { id: '4', provider: 'Zainab drawing classes', user: 'Abdan.', phone: '+91 7010609928', rating: 3, active: true, date: '2026-03-28', comment: 'Excelent teaching drawing, Professional teachers', flagged: false },
];

const Reviews = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [reviews, setReviews] = useState(MOCK_REVIEWS);

  const toggleActive = (id: string) => {
    setReviews(prev =>
      prev.map(r =>
        r.id === id ? { ...r, active: !r.active } : r
      )
    );
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      setReviews(reviews.filter(r => r.id !== id));
    }
  };

  const filteredReviews = reviews.filter(r => 
    r.provider.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.phone.includes(searchTerm)
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
            placeholder="Search by name or phone..."
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

                {/* Active Toggle */}

              <button
                onClick={() => toggleActive(review.id)}
                className={`text-xs px-3 py-1 rounded-full font-medium ${review.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}
              >
                {review.active ? 'Active' : 'De-active'}
              </button>
              </div>

             <div className="text-yellow-500 text-sm mb-3">
              {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
              <span className="text-gray-600 ml-2">|{review.rating}stars</span>
            
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
              {/* Call CTA */}
         
            <a
              href={`tel:${review.phone}`}
              className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
            >
              <span className="flex items-center gap-2 text-blue-600 font-medium">
                <Phone className="w-4 h-4" />
                Call User
              </span>
              <span className="text-gray-600">{review.phone}</span>
            </a>
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
