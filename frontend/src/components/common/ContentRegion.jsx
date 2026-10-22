import LoadingState from './LoadingState'
import RequestError from './RequestError'
import ContentReveal from './ContentReveal'

export default function ContentRegion({ loading, error, onRetry, kind = 'list', count, children }) {
  return <div aria-busy={loading} className="relative">
    {loading ? <LoadingState kind={kind} count={count} />
      : error ? <RequestError message={error} onRetry={onRetry} /> : <ContentReveal>{children}</ContentReveal>}
  </div>
}
