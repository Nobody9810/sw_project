export default function RequestError({ message = '加载失败，请稍后重试', onRetry }) {
  return (
    <div role="alert" className="my-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      <p>{message}</p>
      {onRetry && <button type="button" onClick={onRetry} className="mt-2 underline">重新加载</button>}
    </div>
  )
}
