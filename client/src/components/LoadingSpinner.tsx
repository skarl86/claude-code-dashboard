interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-white" />
      {message && <p className="text-gray-400 text-sm">{message}</p>}
    </div>
  );
}
