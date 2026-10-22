import { useEffect, useLayoutEffect } from 'react'

// Read visible DOM geometry before the browser paints; keep SSR side-effect free.
const useBeforePaintEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export default useBeforePaintEffect
