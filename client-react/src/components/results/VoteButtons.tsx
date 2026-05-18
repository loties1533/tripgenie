import { useState } from 'react'
import { saveVote } from '../../lib/api'

const VoteButtons = ({ tripId, itemId }: { tripId: string, itemId: string }) => {
  const [userVote, setUserVote] = useState<boolean | null>(null)

  const onVote = async (type: boolean) => {
    try {
      await saveVote(tripId, itemId, type, '')
      setUserVote(type)
    } catch (err) { console.error(err) }
  }

  return (
    <div className="flex gap-1.5" data-testid="vote-container">
      <button 
        onClick={() => onVote(true)}
        aria-label="Vote positif"
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border ${userVote === true ? 'bg-sage/40 border-sage' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
      >
        👍
      </button>
      <button 
        onClick={() => onVote(false)}
        aria-label="Vote négatif"
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border ${userVote === false ? 'bg-rose-500/20 border-rose-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
      >
        👎
      </button>
    </div>
  )
}

export default VoteButtons
