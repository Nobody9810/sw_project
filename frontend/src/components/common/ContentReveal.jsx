import styles from './LoadingMotion.module.css'

export default function ContentReveal({ children }) {
  return <div className={`w-full ${styles.enter}`}>{children}</div>
}
