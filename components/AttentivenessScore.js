export default function AttentivenessScore({ isAttentive, score }) {
    return (
      <div className="mt-8 text-center">
        <h2 className="text-2xl font-semibold mb-4">Attentiveness Score: {score}</h2>
        <div className={`text-xl font-bold ${isAttentive ? 'text-green-500' : 'text-red-500'}`}>
          {isAttentive ? 'Attentive' : 'Not Attentive'}
        </div>
      </div>
    );
  }