export default function TipButton({ amount, selected, onClick, children }) {
  const isSelected = selected === amount;

  return (
    <button
      onClick={() => onClick(amount)}
      className={`
        relative overflow-hidden rounded-2xl px-6 py-4 text-lg font-semibold
        transition-all duration-300 ease-out cursor-pointer
        border-2
        ${isSelected
          ? 'bg-accent text-white border-accent shadow-lg shadow-accent/30 scale-105'
          : 'bg-white text-gray-700 border-gray-200 hover:border-accent hover:text-accent hover:shadow-md'
        }
        active:scale-95
      `}
    >
      <span className="relative z-10">{children || `$${amount}`}</span>
      {isSelected && (
        <div className="absolute inset-0 bg-gradient-to-r from-accent to-accent-dark opacity-100 rounded-2xl" />
      )}
      {isSelected && (
        <span className="relative z-10 text-white">{children || `$${amount}`}</span>
      )}
    </button>
  );
}
