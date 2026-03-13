'use client';

const statusColors = {
  upcoming: 'bg-blue-500/20 text-blue-400',
  active: 'bg-green-500/20 text-green-400',
  completed: 'bg-gray-500/20 text-gray-400',
};

export default function ContestCard({ contest }) {
  const status = contest.status || 'upcoming';

  return (
    <div className="bg-crypto-dark-surface rounded-lg p-5 border border-crypto-dark-border hover:border-crypto-dark-primary/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-base font-semibold text-white">{contest.name || 'Untitled Contest'}</h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[status] || statusColors.upcoming}`}>
          {status}
        </span>
      </div>

      {contest.description && (
        <p className="text-sm text-crypto-dark-text/60 mb-3 line-clamp-2">{contest.description}</p>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs text-crypto-dark-text/60 mb-4">
        {contest.type && (
          <div>
            <span className="block text-crypto-dark-text/40">Type</span>
            <span className="text-white capitalize">{contest.type}</span>
          </div>
        )}
        {contest.max_participants != null && (
          <div>
            <span className="block text-crypto-dark-text/40">Participants</span>
            <span className="text-white">{contest.current_participants || 0} / {contest.max_participants}</span>
          </div>
        )}
        {contest.start_time && (
          <div>
            <span className="block text-crypto-dark-text/40">Starts</span>
            <span className="text-white">{new Date(contest.start_time).toLocaleDateString()}</span>
          </div>
        )}
        {contest.entry_fee != null && (
          <div>
            <span className="block text-crypto-dark-text/40">Entry Fee</span>
            <span className="text-white">{contest.entry_fee > 0 ? `$${contest.entry_fee}` : 'Free'}</span>
          </div>
        )}
      </div>

      <button
        disabled={status === 'completed'}
        className="w-full py-2 rounded-md text-sm font-medium bg-crypto-dark-primary/10 text-crypto-dark-primary hover:bg-crypto-dark-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {status === 'completed' ? 'Ended' : status === 'active' ? 'Join Now' : 'View Details'}
      </button>
    </div>
  );
}
